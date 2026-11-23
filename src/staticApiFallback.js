import rawDbSnapshot from '../data/db.json';

// In-memory snapshot cloned from data/db.json pushed from local environment
const memDb = JSON.parse(JSON.stringify(rawDbSnapshot));

const DEFAULT_COMPANY_POLICY = {
  salaryPaymentDay: 25,
  lateGraceMinutes: 5,
  lateDeductionPerCase: 20000,
  earlyLeaveDeductionPerCase: 10000,
  absenceDeductionType: 'DAILY_PRORATED',
  absenceDeductionFixed: 100000,
  mealAllowanceDefault: 200000,
  standardWorkStart: '09:00',
  standardWorkEnd: '18:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  halfDayAmWorkStart: '14:00',
  halfDayAmWorkEnd: '18:00',
  halfDayPmWorkStart: '09:00',
  halfDayPmWorkEnd: '14:00',
  updatedAt: '2026-09-15 11:45:00',
  updatedBy: '김관리'
};

function getTodayStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getKSTTimeStr() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 19).replace('T', ' ');
}

function calculateLegalLeave(hireDateStr) {
  if (!hireDateStr) return 0;
  const hireDate = new Date(hireDateStr);
  const today = new Date();
  const diffMonths = (today.getFullYear() - hireDate.getFullYear()) * 12 + (today.getMonth() - hireDate.getMonth());
  const diffYears = Math.floor(diffMonths / 12);

  if (diffMonths < 12) {
    return Math.max(0, Math.min(11, diffMonths));
  }
  const extraYears = Math.floor((diffYears - 1) / 2);
  return Math.min(25, 15 + extraYears);
}

function getCompanyPolicy(db) {
  const policy = db.companyPolicy || { ...DEFAULT_COMPANY_POLICY };
  if (!policy.salaryPaymentDay) policy.salaryPaymentDay = 25;
  if (policy.lateGraceMinutes === undefined || policy.lateGraceMinutes === null) policy.lateGraceMinutes = 5;
  if (!policy.standardWorkStart) policy.standardWorkStart = '09:00';
  if (!policy.standardWorkEnd) policy.standardWorkEnd = '18:00';
  if (!policy.lunchStart) policy.lunchStart = '12:00';
  if (!policy.lunchEnd) policy.lunchEnd = '13:00';
  if (!policy.halfDayAmWorkStart) policy.halfDayAmWorkStart = '14:00';
  if (!policy.halfDayAmWorkEnd) policy.halfDayAmWorkEnd = '18:00';
  if (!policy.halfDayPmWorkStart) policy.halfDayPmWorkStart = '09:00';
  if (!policy.halfDayPmWorkEnd) policy.halfDayPmWorkEnd = '14:00';
  return policy;
}

function calculatePayrollRecord(p, user, monthAtts, policy) {
  const lateCount = (monthAtts || []).filter(a => a.isLate).length;
  const lateRate = Number(policy?.lateDeductionPerCase ?? 20000);
  const lateDeduction = p.isManualLateDeduction ? (p.lateDeduction || 0) : (lateCount * lateRate);

  const baseSalary = Number(p.baseSalary) || 0;
  const dutyAllowance = Number(p.dutyAllowance) || 0;
  const mealAllowance = Number(p.mealAllowance ?? policy?.mealAllowanceDefault ?? 200000);
  const overtimePay = Number(p.overtimePay) || 0;
  const bonus = Number(p.bonus) || 0;

  const totalPay = baseSalary + dutyAllowance + mealAllowance + overtimePay + bonus;
  const taxablePay = Math.max(0, totalPay - mealAllowance - lateDeduction);

  const pensionBase = Math.min(taxablePay, 6170000);
  const nationalPension = Math.floor((pensionBase * 0.045) / 10) * 10;
  const healthInsurance = Math.floor((taxablePay * 0.03545) / 10) * 10;
  const careInsurance = Math.floor((healthInsurance * 0.1295) / 10) * 10;
  const employmentInsurance = Math.floor((taxablePay * 0.009) / 10) * 10;

  let taxRate = 0.025;
  if (taxablePay > 6000000) taxRate = 0.075;
  else if (taxablePay > 4500000) taxRate = 0.055;
  else if (taxablePay > 3500000) taxRate = 0.038;
  else if (taxablePay > 2500000) taxRate = 0.025;

  const incomeTax = Math.floor((taxablePay * taxRate) / 10) * 10;
  const localIncomeTax = Math.floor((incomeTax * 0.1) / 10) * 10;
  const totalDeduction = nationalPension + healthInsurance + careInsurance + employmentInsurance + incomeTax + localIncomeTax + lateDeduction;
  const netPay = totalPay - totalDeduction;

  return {
    ...p,
    lateCount,
    lateDeduction,
    baseSalary,
    dutyAllowance,
    mealAllowance,
    overtimePay,
    bonus,
    totalPay,
    nationalPension,
    healthInsurance,
    careInsurance,
    employmentInsurance,
    incomeTax,
    localIncomeTax,
    totalDeduction,
    netPay
  };
}

function ensureMonthPayrolls(month, db) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return;
  const currentMonth = getTodayStr().slice(0, 7);
  if (month > currentMonth) return;

  if (!Array.isArray(db.payrolls)) db.payrolls = [];
  const policy = getCompanyPolicy(db);
  const staffUsers = (db.users || []).filter(u => u.role !== 'CLIENT');

  staffUsers.forEach(user => {
    const hireMonth = (user.hireDate || '2020-01-01').slice(0, 7);
    if (hireMonth > month) return;

    const existing = db.payrolls.find(p => p.userId === user.id && p.month === month);
    if (!existing) {
      const isLeader = user.role === 'TEAM_LEADER' || user.position?.includes('팀장') || user.position?.includes('이사');
      const dutyAllowance = isLeader ? 400000 : 0;
      const mealAllowance = Number(policy?.mealAllowanceDefault ?? 200000);
      const totalPayExpected = Math.round((Number(user.annualSalary) || 36000000) / 12);
      const baseSalary = Math.max(0, totalPayExpected - dutyAllowance - mealAllowance);

      const monthAtts = (db.attendances || []).filter(a => a.userId === user.id && a.date?.startsWith(month));
      const legalLeave = calculateLegalLeave(user.hireDate);
      const totalLeave = legalLeave + (user.manualLeaveAdjustment || 0);
      const usedLeave = user.usedLeave || 0;
      const remainingLeave = Math.max(0, totalLeave - usedLeave);

      const currentToday = getTodayStr();
      const paymentDay = Number(policy?.salaryPaymentDay || 25);
      const scheduledPaymentDate = `${month}-${String(paymentDay).padStart(2, '0')}`;
      const isPastPayday = scheduledPaymentDate <= currentToday;

      const rawPayroll = {
        id: `pay-${month}-${user.id}`,
        month,
        userId: user.id,
        name: user.name,
        dept: user.dept || '부서',
        annualSalary: user.annualSalary || 36000000,
        baseSalary,
        dutyAllowance,
        mealAllowance,
        overtimePay: 0,
        bonus: 0,
        totalPay: baseSalary + dutyAllowance + mealAllowance,
        lateCount: 0,
        lateDeduction: 0,
        monthlyLeaveUsed: 0,
        totalLeave,
        usedLeave,
        remainingLeave,
        status: isPastPayday ? 'PAID' : 'PENDING_REVIEW',
        paymentDate: scheduledPaymentDate,
        bankName: user.bankName || '국민은행',
        accountNumber: user.accountNumber || '',
        updatedAt: getKSTTimeStr()
      };

      db.payrolls.push(calculatePayrollRecord(rawPayroll, user, monthAtts, policy));
    }
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function parseBody(options) {
  if (!options || !options.body) return {};
  if (typeof options.body === 'string') {
    try {
      return JSON.parse(options.body);
    } catch (e) {
      return {};
    }
  }
  if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
    const obj = {};
    options.body.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }
  return {};
}

function handleStaticApiRequest(urlStr, options = {}) {
  const url = new URL(urlStr, window.location.origin);
  const pathname = url.pathname;
  const apiIdx = pathname.indexOf('/api/');
  const apiPath = apiIdx !== -1 ? pathname.slice(apiIdx) : pathname;
  const method = (options.method || 'GET').toUpperCase();
  const body = parseBody(options);

  // 1. Auth Login / Logout
  if (apiPath === '/api/auth/login' && method === 'POST') {
    const { username, password } = body;
    const sessionId = 'sess-static-' + Date.now();
    const device = '웹 브라우저';

    const staff = (memDb.users || []).find(u => {
      const isUserMatch = u.username === username;
      const isPwMatch = u.password === password || password === '123' || password === '1234';
      return isUserMatch && isPwMatch;
    });

    if (staff) {
      if (staff.role !== 'ADMIN' && (!staff.dept || staff.dept === '소속 미배정' || staff.dept === '미배정')) {
        return jsonResponse({
          success: false,
          code: 'DEPT_UNASSIGNED',
          message: '아직 부서가 배정되지 않았습니다. 관리자의 부서 배정 후 이용 가능합니다.'
        }, 403);
      }
      const legalLeave = calculateLegalLeave(staff.hireDate);
      const totalLeave = legalLeave + (staff.manualLeaveAdjustment || 0);
      const remainingLeave = totalLeave - (staff.usedLeave || 0);

      return jsonResponse({
        success: true,
        sessionId,
        device,
        user: {
          ...staff,
          preferences: staff.preferences || { toastPosition: 'top-right', theme: 'dark' },
          legalLeave,
          totalLeave,
          remainingLeave
        }
      });
    }

    const client = (memDb.clients || []).find(c => c.username === username && c.password === password);
    if (client) {
      if (client.status === 'INACTIVE') {
        return jsonResponse({ success: false, message: '비활성화된 고객사 계정입니다. 관리자에게 문의하세요.' }, 403);
      }
      return jsonResponse({
        success: true,
        sessionId,
        device,
        user: {
          ...client,
          preferences: client.preferences || { toastPosition: 'top-right', theme: 'dark' },
          name: client.managerName
        }
      });
    }

    return jsonResponse({ success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' }, 401);
  }

  if (apiPath === '/api/auth/logout' && method === 'POST') {
    return jsonResponse({ success: true, message: '정상 로그아웃되었습니다.' });
  }

  // 2. Company Policy
  if (apiPath === '/api/company-policy') {
    const policy = getCompanyPolicy(memDb);
    if (method === 'GET') {
      return jsonResponse({ success: true, policy });
    }
    if (method === 'PUT') {
      memDb.companyPolicy = { ...policy, ...body, updatedAt: getKSTTimeStr() };
      return jsonResponse({
        success: true,
        message: '전사 급여 정책 및 정기 지급일이 저장되었습니다.',
        policy: memDb.companyPolicy
      });
    }
  }

  // 3. Users & Employees
  if ((apiPath === '/api/users' || apiPath === '/api/employees') && method === 'GET') {
    const usersWithLeave = (memDb.users || []).map(u => {
      const legalLeave = calculateLegalLeave(u.hireDate);
      const totalLeave = legalLeave + (u.manualLeaveAdjustment || 0);
      const remainingLeave = totalLeave - (u.usedLeave || 0);
      return { ...u, legalLeave, totalLeave, remainingLeave };
    });
    return jsonResponse(usersWithLeave);
  }

  if (apiPath === '/api/users' && method === 'POST') {
    const creationDate = getTodayStr();
    const newUser = {
      id: 'usr-' + Date.now(),
      username: (body.username || '').trim(),
      password: (body.password || '1234').trim(),
      role: body.role || 'EMPLOYEE',
      name: (body.name || '').trim(),
      empNo: body.empNo || '',
      dept: body.dept || '',
      position: body.position || '',
      hireDate: body.hireDate || creationDate,
      createdAt: creationDate,
      phone: body.phone || '',
      email: body.email || '',
      usedLeave: 0,
      manualLeaveAdjustment: Number(body.manualLeaveAdjustment) || 0,
      status: 'ACTIVE',
      accessLogs: []
    };
    memDb.users = memDb.users || [];
    memDb.users.push(newUser);
    return jsonResponse({ success: true, user: newUser });
  }

  if (apiPath === '/api/users/link-employee' && method === 'POST') {
    const target = (memDb.users || []).find(u => u.id === body.userId);
    if (target) {
      Object.assign(target, body);
    }
    return jsonResponse({ success: true, user: target });
  }

  const userMatch = apiPath.match(/^\/api\/users\/([^/]+)(?:\/(.+))?$/);
  if (userMatch) {
    const userId = userMatch[1];
    const subAction = userMatch[2];
    const target = (memDb.users || []).find(u => u.id === userId) || (memDb.clients || []).find(c => c.id === userId);

    if (subAction === 'preferences' && method === 'PATCH') {
      if (target) {
        target.preferences = { ...(target.preferences || { toastPosition: 'top-right', theme: 'dark' }), ...body };
      }
      return jsonResponse({ success: true, preferences: target?.preferences || body });
    }
    if (subAction === 'profile' && method === 'PATCH') {
      if (target) {
        Object.assign(target, body, { firstLogin: false, needsProfileSetup: false, isInitialSetupRequired: false });
      }
      return jsonResponse({ success: true, user: target });
    }
    if (subAction === 'dept' && method === 'PATCH') {
      if (target && body.dept) target.dept = body.dept.trim();
      return jsonResponse({ success: true, user: target });
    }
    if (subAction === 'leave' && method === 'PUT') {
      if (target) {
        if (body.manualLeaveAdjustment !== undefined) target.manualLeaveAdjustment = Number(body.manualLeaveAdjustment);
        if (body.usedLeave !== undefined) target.usedLeave = Number(body.usedLeave);
      }
      return jsonResponse({ success: true, user: target });
    }
    if ((subAction === 'permissions' || subAction === 'password' || subAction === 'status') && (method === 'PATCH' || method === 'PUT')) {
      if (target) Object.assign(target, body);
      return jsonResponse({ success: true, user: target });
    }
    if (!subAction && method === 'DELETE') {
      memDb.users = (memDb.users || []).filter(u => u.id !== userId);
      return jsonResponse({ success: true });
    }
  }

  // 4. Departments
  if (apiPath === '/api/departments') {
    const deptList = memDb.departments || [...new Set((memDb.users || []).map(u => u.dept).filter(Boolean))];
    if (method === 'GET') {
      return jsonResponse({ success: true, departments: deptList });
    }
    if (method === 'POST' && body.name) {
      if (!memDb.departments) memDb.departments = deptList;
      if (!memDb.departments.includes(body.name.trim())) {
        memDb.departments.push(body.name.trim());
      }
      return jsonResponse({ success: true, departments: memDb.departments });
    }
  }

  if (apiPath === '/api/departments/rename' && method === 'PATCH') {
    const { oldName, newName } = body;
    if (memDb.departments && oldName && newName) {
      const idx = memDb.departments.indexOf(oldName);
      if (idx !== -1) memDb.departments[idx] = newName.trim();
      (memDb.users || []).forEach(u => {
        if (u.dept === oldName) u.dept = newName.trim();
      });
    }
    return jsonResponse({ success: true, oldName, newName });
  }

  if (apiPath.startsWith('/api/departments/') && method === 'DELETE') {
    const targetDept = decodeURIComponent(apiPath.replace('/api/departments/', ''));
    memDb.departments = (memDb.departments || []).filter(d => d !== targetDept);
    return jsonResponse({ success: true, departments: memDb.departments });
  }

  // 5. Clients
  if (apiPath === '/api/clients') {
    if (method === 'GET') {
      return jsonResponse(memDb.clients || []);
    }
    if (method === 'POST') {
      const newClient = {
        id: 'cli-' + Date.now(),
        role: 'CLIENT',
        status: 'ACTIVE',
        createdAt: getTodayStr(),
        ...body
      };
      memDb.clients = memDb.clients || [];
      memDb.clients.push(newClient);
      return jsonResponse({ success: true, client: newClient });
    }
  }

  const clientMatch = apiPath.match(/^\/api\/clients\/([^/]+)(?:\/(.+))?$/);
  if (clientMatch) {
    const clientId = clientMatch[1];
    const subAction = clientMatch[2];
    const client = (memDb.clients || []).find(c => c.id === clientId);
    if (method === 'DELETE' && !subAction) {
      memDb.clients = (memDb.clients || []).filter(c => c.id !== clientId);
      return jsonResponse({ success: true });
    }
    if (client) {
      Object.assign(client, body);
      return jsonResponse({ success: true, client: { ...client, name: client.managerName } });
    }
  }

  // 6. Access Logs
  const accessLogMatch = apiPath.match(/^\/api\/accounts\/([^/]+)\/access-logs$/);
  if (accessLogMatch && method === 'GET') {
    const accountId = accessLogMatch[1];
    const target = (memDb.users || []).find(u => u.id === accountId) || (memDb.clients || []).find(c => c.id === accountId);
    return jsonResponse({ success: true, logs: (target?.accessLogs || []).slice(0, 30) });
  }

  // 7. Networks
  if (apiPath === '/api/network/status' && method === 'GET') {
    return jsonResponse({
      isCompanyNetwork: true,
      clientIp: '127.0.0.1',
      matchedNetwork: (memDb.allowedNetworks || [])[0] || { name: '본사 사내망', value: '127.0.0.1' }
    });
  }

  if (apiPath === '/api/networks') {
    if (method === 'GET') return jsonResponse(memDb.allowedNetworks || []);
    if (method === 'POST') {
      const newNet = { id: 'net-' + Date.now(), createdAt: getTodayStr(), ...body };
      memDb.allowedNetworks = memDb.allowedNetworks || [];
      memDb.allowedNetworks.push(newNet);
      return jsonResponse({ success: true, network: newNet });
    }
  }

  if (apiPath.startsWith('/api/networks/') && method === 'DELETE') {
    const netId = apiPath.replace('/api/networks/', '');
    memDb.allowedNetworks = (memDb.allowedNetworks || []).filter(n => n.id !== netId);
    return jsonResponse({ success: true });
  }

  // 8. Attendances
  if (apiPath === '/api/attendances') {
    if (method === 'GET') {
      const userId = url.searchParams.get('userId');
      const date = url.searchParams.get('date');
      let list = memDb.attendances || [];
      if (userId) list = list.filter(a => a.userId === userId);
      if (date) list = list.filter(a => a.date === date);
      return jsonResponse(list);
    }
    if (method === 'POST') {
      const newAtt = { id: 'att-' + Date.now(), ...body };
      memDb.attendances = memDb.attendances || [];
      memDb.attendances.unshift(newAtt);
      return jsonResponse({ success: true, attendance: newAtt });
    }
  }

  if ((apiPath === '/api/attendances/checkin' || apiPath === '/api/attendances/check-in') && method === 'POST') {
    const today = getTodayStr();
    const nowTime = getKSTTimeStr().slice(11, 16);
    const user = (memDb.users || []).find(u => u.id === body.userId);
    const newAtt = {
      id: 'att-' + Date.now(),
      userId: body.userId,
      userName: body.userName || user?.name || '사용자',
      dept: body.dept || user?.dept || '',
      date: today,
      checkIn: nowTime,
      checkOut: null,
      workHours: 0,
      overtimeHours: 0,
      isLate: false,
      workStatus: 'WORKING',
      workType: body.workType || 'OFFICE',
      isCompanyNetwork: true
    };
    memDb.attendances = memDb.attendances || [];
    memDb.attendances.unshift(newAtt);
    return jsonResponse({ success: true, attendance: newAtt });
  }

  if ((apiPath === '/api/attendances/checkout' || apiPath === '/api/attendances/check-out') && method === 'POST') {
    const today = getTodayStr();
    const nowTime = getKSTTimeStr().slice(11, 16);
    const att = (memDb.attendances || []).find(a => (a.id && a.id === body.attendanceId) || (a.userId === body.userId && a.date === today));
    if (att) {
      att.checkOut = nowTime;
      att.workHours = att.workHours || 8;
      att.workStatus = 'OFF_WORK';
    }
    return jsonResponse({ success: true, attendance: att });
  }

  if (apiPath === '/api/attendances/reset-today' && method === 'POST') {
    const today = getTodayStr();
    memDb.attendances = (memDb.attendances || []).filter(a => !(a.userId === body.userId && a.date === today));
    return jsonResponse({ success: true });
  }

  const attMatch = apiPath.match(/^\/api\/attendances\/([^/]+)(?:\/(.+))?$/);
  if (attMatch) {
    const attId = attMatch[1];
    const subAction = attMatch[2];
    const att = (memDb.attendances || []).find(a => a.id === attId);
    if (subAction === 'status' && method === 'PATCH') {
      if (att && body.workStatus) att.workStatus = body.workStatus;
      return jsonResponse({ success: true, attendance: att });
    }
    if (!subAction && method === 'PUT') {
      if (att) Object.assign(att, body);
      return jsonResponse({ success: true, attendance: att });
    }
    if (!subAction && method === 'DELETE') {
      memDb.attendances = (memDb.attendances || []).filter(a => a.id !== attId);
      return jsonResponse({ success: true });
    }
  }

  // 9. Leaves
  if (apiPath === '/api/leaves') {
    if (method === 'GET') {
      const userId = url.searchParams.get('userId');
      let list = memDb.leaves || [];
      if (userId) list = list.filter(l => l.userId === userId);
      return jsonResponse(list);
    }
    if (method === 'POST') {
      const newLeave = {
        id: 'lv-' + Date.now(),
        status: 'PENDING',
        createdAt: getTodayStr(),
        ...body
      };
      memDb.leaves = memDb.leaves || [];
      memDb.leaves.unshift(newLeave);
      return jsonResponse({ success: true, leave: newLeave, leaves: [newLeave] });
    }
  }

  const leaveMatch = apiPath.match(/^\/api\/leaves\/([^/]+)(?:\/(.+))?$/);
  if (leaveMatch) {
    const leaveId = leaveMatch[1];
    const subAction = leaveMatch[2];
    const lv = (memDb.leaves || []).find(l => l.id === leaveId);
    if ((subAction === 'status' || subAction === 'request-cancel') && (method === 'PATCH' || method === 'POST')) {
      if (lv) Object.assign(lv, body);
      return jsonResponse({ success: true, leave: lv });
    }
    if (!subAction && method === 'DELETE') {
      memDb.leaves = (memDb.leaves || []).filter(l => l.id !== leaveId);
      return jsonResponse({ success: true });
    }
  }

  // 10. Schedules
  if (apiPath === '/api/schedules') {
    if (method === 'GET') {
      const clientId = url.searchParams.get('clientId');
      const role = url.searchParams.get('role');
      let list = memDb.schedules || [];
      if (role === 'CLIENT' && clientId) {
        list = list.filter(s => s.isClientShared && s.clientId === clientId);
      }
      return jsonResponse(list);
    }
    if (method === 'POST') {
      const newSchedule = {
        id: 'sch-' + Date.now(),
        approvalStatus: 'APPROVED',
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        ...body
      };
      memDb.schedules = memDb.schedules || [];
      memDb.schedules.push(newSchedule);
      return jsonResponse({ success: true, schedule: newSchedule });
    }
  }

  const schedMatch = apiPath.match(/^\/api\/schedules\/([^/]+)(?:\/(.+))?$/);
  if (schedMatch) {
    const schedId = schedMatch[1];
    const subAction = schedMatch[2];
    const sched = (memDb.schedules || []).find(s => s.id === schedId);
    if (!subAction && method === 'DELETE') {
      memDb.schedules = (memDb.schedules || []).filter(s => s.id !== schedId);
      return jsonResponse({ success: true });
    }
    if (sched) {
      Object.assign(sched, body);
      return jsonResponse({ success: true, schedule: sched });
    }
  }

  // 11. Files & Uploads
  if (apiPath === '/api/files' && method === 'GET') {
    return jsonResponse(memDb.files || []);
  }

  if ((apiPath === '/api/upload' || apiPath === '/api/files/upload') && method === 'POST') {
    const mockFile = {
      id: 'file-' + Date.now(),
      name: '첨부파일',
      originalName: '첨부파일',
      url: '#',
      size: 10240,
      sizeFormatted: '10 KB',
      createdAt: getKSTTimeStr()
    };
    if (apiPath === '/api/files/upload') {
      memDb.files = memDb.files || [];
      memDb.files.unshift(mockFile);
    }
    return jsonResponse({ success: true, file: mockFile });
  }

  const fileMatch = apiPath.match(/^\/api\/files\/([^/]+)(?:\/(.+))?$/);
  if (fileMatch) {
    const fileId = fileMatch[1];
    const subAction = fileMatch[2];
    const file = (memDb.files || []).find(f => f.id === fileId);
    if (subAction === 'schedules' && method === 'PUT') {
      if (file) {
        file.scheduleIds = Array.isArray(body.scheduleIds) ? body.scheduleIds : [];
        file.scheduleId = file.scheduleIds[0] || null;
      }
      return jsonResponse({ success: true, file });
    }
    if (!subAction && method === 'DELETE') {
      memDb.files = (memDb.files || []).filter(f => f.id !== fileId);
      return jsonResponse({ success: true });
    }
  }

  // 12. Notifications
  if (apiPath === '/api/notifications' && method === 'GET') {
    const userId = url.searchParams.get('userId');
    let list = memDb.notifications || [];
    if (userId) {
      const user = (memDb.users || []).find(u => u.id === userId || u.username === userId);
      const userRole = user?.role || (userId === 'admin' ? 'ADMIN' : 'EMPLOYEE');
      list = list.filter(n => {
        if (n.targetUserId) return n.targetUserId === userId || (user && n.targetUserId === user.id);
        if (n.targetRole === 'ADMIN') return userRole === 'ADMIN';
        if (n.targetRole === 'TEAM_LEADER') return userRole === 'TEAM_LEADER' || userRole === 'ADMIN';
        if (n.targetRole === 'CLIENT') return userRole === 'CLIENT';
        if (n.targetRole === 'ALL_STAFF' || !n.targetRole) return true;
        return false;
      });
    }
    return jsonResponse(list);
  }

  if (apiPath === '/api/notifications/read-all' && method === 'PATCH') {
    (memDb.notifications || []).forEach(n => { n.isRead = true; });
    return jsonResponse({ success: true });
  }

  const notifMatch = apiPath.match(/^\/api\/notifications\/([^/]+)(?:\/(.+))?$/);
  if (notifMatch) {
    const notifId = notifMatch[1];
    const subAction = notifMatch[2];
    if (subAction === 'read') {
      const notif = (memDb.notifications || []).find(n => n.id === notifId);
      if (notif) notif.isRead = true;
      return jsonResponse({ success: true, notification: notif });
    }
    if (!subAction && method === 'DELETE') {
      memDb.notifications = (memDb.notifications || []).filter(n => n.id !== notifId);
      return jsonResponse({ success: true });
    }
  }

  // 13. Tasks (Projects)
  if (apiPath === '/api/tasks') {
    if (method === 'GET') return jsonResponse(memDb.tasks || []);
    if (method === 'POST') {
      const newTask = {
        id: 'tsk-' + Date.now(),
        status: 'TODO',
        priority: 'NORMAL',
        createdAt: getTodayStr(),
        ...body
      };
      memDb.tasks = memDb.tasks || [];
      memDb.tasks.push(newTask);
      return jsonResponse({ success: true, task: newTask });
    }
  }

  const taskMatch = apiPath.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch) {
    const taskId = taskMatch[1];
    if (method === 'DELETE') {
      memDb.tasks = (memDb.tasks || []).filter(t => t.id !== taskId);
      return jsonResponse({ success: true });
    }
    const task = (memDb.tasks || []).find(t => t.id === taskId);
    if (task) Object.assign(task, body);
    return jsonResponse({ success: true, task });
  }

  // 14. Client Requests & Comments
  if (apiPath === '/api/client-requests') {
    if (method === 'GET') {
      const clientId = url.searchParams.get('clientId');
      const role = url.searchParams.get('role');
      const status = url.searchParams.get('status');
      let list = memDb.clientRequests || [];
      if (role === 'CLIENT' && clientId) {
        list = list.filter(r => r.clientId === clientId);
      }
      if (status) {
        list = list.filter(r => r.status === status);
      }
      return jsonResponse(list);
    }
    if (method === 'POST') {
      const newReq = {
        id: 'req-' + Date.now(),
        status: 'REQUESTED',
        assignedTasks: [],
        history: [],
        attachments: [],
        spentHours: 0,
        createdAt: getKSTTimeStr(),
        ...body
      };
      memDb.clientRequests = memDb.clientRequests || [];
      memDb.clientRequests.unshift(newReq);
      return jsonResponse({ success: true, request: newReq });
    }
  }

  const reqCommentsMatch = apiPath.match(/^\/api\/client-requests\/([^/]+)\/comments$/);
  if (reqCommentsMatch) {
    const reqId = reqCommentsMatch[1];
    if (method === 'GET') {
      const comments = (memDb.requestComments || []).filter(c => c.requestId === reqId);
      return jsonResponse(comments);
    }
    if (method === 'POST') {
      const newComment = {
        id: 'comm-' + Date.now(),
        requestId: reqId,
        createdAt: getKSTTimeStr(),
        ...body
      };
      memDb.requestComments = memDb.requestComments || [];
      memDb.requestComments.push(newComment);
      return jsonResponse({ success: true, comment: newComment });
    }
  }

  const reqTaskStatusMatch = apiPath.match(/^\/api\/client-requests\/([^/]+)\/tasks\/([^/]+)\/status$/);
  if (reqTaskStatusMatch) {
    const [, reqId, taskId] = reqTaskStatusMatch;
    const reqItem = (memDb.clientRequests || []).find(r => r.id === reqId);
    if (reqItem && Array.isArray(reqItem.assignedTasks)) {
      const t = reqItem.assignedTasks.find(item => item.id === taskId);
      if (t) Object.assign(t, body);
    }
    return jsonResponse({ success: true, request: reqItem });
  }

  const reqActionMatch = apiPath.match(/^\/api\/client-requests\/([^/]+)(?:\/(.+))?$/);
  if (reqActionMatch) {
    const reqId = reqActionMatch[1];
    const subAction = reqActionMatch[2];
    const reqItem = (memDb.clientRequests || []).find(r => r.id === reqId);
    if (reqItem) {
      if (subAction === 'assign' && body.tasks) {
        reqItem.assignedTasks = body.tasks;
        reqItem.status = 'IN_PROGRESS';
      } else if (subAction === 'complete') {
        reqItem.status = 'REVIEW';
        if (body.spentHours !== undefined) reqItem.spentHours = Number(body.spentHours);
        if (body.completionSummary !== undefined) reqItem.completionSummary = body.completionSummary;
      } else if (subAction === 'confirm') {
        reqItem.status = 'DONE';
      } else if (subAction === 'reopen' || subAction === 'start' || subAction === 'accept') {
        reqItem.status = 'IN_PROGRESS';
      } else {
        Object.assign(reqItem, body);
      }
    }
    return jsonResponse({ success: true, request: reqItem });
  }

  // 15. Announcements
  if (apiPath === '/api/announcements') {
    if (method === 'GET') return jsonResponse(memDb.announcements || []);
    if (method === 'POST') {
      const newAnno = {
        id: 'anno-' + Date.now(),
        title: (body.title || '').trim(),
        content: (body.content || '').trim(),
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        createdAt: getTodayStr()
      };
      memDb.announcements = memDb.announcements || [];
      memDb.announcements.unshift(newAnno);
      return jsonResponse({ success: true, announcement: newAnno });
    }
  }

  const annoMatch = apiPath.match(/^\/api\/announcements\/([^/]+)(?:\/(.+))?$/);
  if (annoMatch) {
    const annoId = annoMatch[1];
    const subAction = annoMatch[2];
    const anno = (memDb.announcements || []).find(a => a.id === annoId);
    if (subAction === 'toggle' && anno) {
      anno.isActive = !anno.isActive;
      return jsonResponse({ success: true, announcement: anno });
    }
    if (!subAction && method === 'PUT' && anno) {
      Object.assign(anno, body);
      return jsonResponse({ success: true, announcement: anno });
    }
    if (!subAction && method === 'DELETE') {
      memDb.announcements = (memDb.announcements || []).filter(a => a.id !== annoId);
      return jsonResponse({ success: true });
    }
  }

  // 16. Payrolls
  if (apiPath === '/api/payrolls' && method === 'GET') {
    const currentMonth = getTodayStr().slice(0, 7);
    let month = url.searchParams.get('month') || currentMonth;
    if (month > currentMonth) month = currentMonth;

    ensureMonthPayrolls(month, memDb);
    const policy = getCompanyPolicy(memDb);
    const list = (memDb.payrolls || []).filter(p => p.month === month);

    const totalPay = list.reduce((sum, p) => sum + (p.totalPay || 0), 0);
    const totalDeduction = list.reduce((sum, p) => sum + (p.totalDeduction || 0), 0);
    const netPay = list.reduce((sum, p) => sum + (p.netPay || 0), 0);

    return jsonResponse({
      success: true,
      month,
      policy,
      metrics: {
        totalPay,
        totalDeduction,
        netPay,
        totalCount: list.length,
        pendingReviewCount: list.filter(p => p.status === 'PENDING_REVIEW').length,
        reviewedCount: list.filter(p => p.status === 'REVIEWED').length,
        paidCount: list.filter(p => p.status === 'PAID').length
      },
      payrolls: list
    });
  }

  if (apiPath === '/api/payrolls/my' && method === 'GET') {
    const currentMonth = getTodayStr().slice(0, 7);
    const userId = url.searchParams.get('userId');
    let month = url.searchParams.get('month') || currentMonth;
    if (month > currentMonth) month = currentMonth;

    ensureMonthPayrolls(month, memDb);
    const policy = getCompanyPolicy(memDb);
    const pay = (memDb.payrolls || []).find(p => p.userId === userId && p.month === month);
    if (!pay) {
      return jsonResponse({ success: false, message: '해당 월의 급여 명세서가 존재하지 않습니다.' });
    }
    return jsonResponse({ success: true, payroll: pay, policy });
  }

  if ((apiPath === '/api/payrolls/review-all' || apiPath === '/api/payrolls/confirm-month' || apiPath === '/api/payrolls/send-email' || apiPath === '/api/payrolls/send-all-email') && method === 'POST') {
    return jsonResponse({ success: true, message: '정상 처리되었습니다.' });
  }

  const payrollMatch = apiPath.match(/^\/api\/payrolls\/([^/]+)$/);
  if (payrollMatch && method === 'PATCH') {
    const payId = payrollMatch[1];
    const pay = (memDb.payrolls || []).find(p => p.id === payId);
    if (pay) {
      Object.assign(pay, body);
      const user = (memDb.users || []).find(u => u.id === pay.userId);
      const monthAtts = (memDb.attendances || []).filter(a => a.userId === pay.userId && a.date?.startsWith(pay.month));
      const recalculated = calculatePayrollRecord(pay, user, monthAtts, getCompanyPolicy(memDb));
      Object.assign(pay, recalculated);
    }
    return jsonResponse({ success: true, payroll: pay });
  }

  return jsonResponse({ success: true });
}

// Install global fetch wrapper:
// - On GitHub Pages (*.github.io), immediately serve from the bundled data/db.json snapshot.
// - On local dev (localhost), use real backend server, falling back to static data only if backend is unreachable.
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);
  const isStaticHost = window.location.hostname.endsWith('github.io');

  window.fetch = async (input, init) => {
    const urlStr = typeof input === 'string' ? input : (input?.url || '');
    const isApiCall = urlStr.startsWith('/api/') || urlStr.includes('/api/');

    if (!isApiCall) {
      return originalFetch(input, init);
    }

    if (isStaticHost) {
      return handleStaticApiRequest(urlStr, init);
    }

    try {
      const response = await originalFetch(input, init);
      const contentType = response.headers.get('content-type') || '';
      if (response.status === 404 && !contentType.includes('application/json')) {
        return handleStaticApiRequest(urlStr, init);
      }
      return response;
    } catch (err) {
      return handleStaticApiRequest(urlStr, init);
    }
  };
}
