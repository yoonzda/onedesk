import React, { useState, useEffect, useMemo } from 'react';
import { HelpCircle } from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';
import CustomCheckbox from './CustomCheckbox';
import CustomTimePicker from './CustomTimePicker';
import { getHoliday } from '../utils/holidays';
import PayrollManager from './PayrollManager';

function TooltipHelp({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '6px',
        cursor: 'pointer',
        verticalAlign: 'middle'
      }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(prev => !prev)}
      tabIndex={0}
      role="tooltip"
      aria-label={text}
    >
      <HelpCircle
        size={18}
        style={{
          color: show ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'color 0.15s ease'
        }}
      />
      {show && (
        <span
          style={{
            position: 'absolute',
            left: 'calc(100% + 8px)',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            padding: '7px 12px',
            fontSize: '14px',
            fontWeight: 400,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            zIndex: 9999,
            borderRadius: 0,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
            pointerEvents: 'none'
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

export default function AdminAttendanceSection({ user, employees = [], onShowToast, onRefresh, hideHeader = false }) {
  const [attendances, setAttendances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: 'CALENDAR' (사원별 근태 달력 - Default) | 'DAILY' (일자별 전체 현황) | 'PAYROLL' (급여 관리)
  const [viewMode, setViewMode] = useState('CALENDAR');

  // Calendar View Specific States
  const [selectedCalendarUserId, setSelectedCalendarUserId] = useState('');
  const [calCurrentDate, setCalCurrentDate] = useState(new Date());

  // Daily View Filter States
  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayStr = () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayStr()); // 'YYYY-MM-DD' or '' for ALL
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Slide Drawer for Details and Admin Correction
  const [selectedAtt, setSelectedAtt] = useState(null);
  const [isAttDetailClosing, setIsAttDetailClosing] = useState(false);
  const [editForm, setEditForm] = useState({
    checkIn: '',
    checkOut: '',
    workType: 'OFFICE',
    isCompanyNetwork: true,
    reason: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Company-wide Payroll & Attendance Policy (Admin)
  const [companyPolicy, setCompanyPolicy] = useState({
    salaryPaymentDay: 25,
    lateGraceMinutes: 5,
    mealAllowanceDefault: 200000,
    lateDeductionPerCase: 30000,
    earlyLeaveDeductionPerCase: 10000,
    absenceDeductionType: 'DAILY_PRORATED',
    absenceDeductionFixed: 100000,
    standardWorkStart: '09:00',
    standardWorkEnd: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    halfDayAmWorkStart: '14:00',
    halfDayAmWorkEnd: '18:00',
    halfDayPmWorkStart: '09:00',
    halfDayPmWorkEnd: '14:00'
  });
  const [savingPolicy, setSavingPolicy] = useState(false);

  const loadCompanyPolicy = async () => {
    try {
      const res = await fetch('/api/company-policy');
      const data = await res.json();
      if (data.success && data.policy) {
        setCompanyPolicy(data.policy);
      }
    } catch (err) {
      console.error('Failed to load company policy in AdminAttendanceSection:', err);
    }
  };

  const handleSaveCompanyPolicy = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingPolicy(true);
    try {
      const res = await fetch('/api/company-policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...companyPolicy,
          salaryPaymentDay: Math.min(31, Math.max(1, Number(companyPolicy.salaryPaymentDay) || 25)),
          lateGraceMinutes: Math.max(0, Number(companyPolicy.lateGraceMinutes) || 0),
          standardWorkStart: companyPolicy.standardWorkStart || '09:00',
          standardWorkEnd: companyPolicy.standardWorkEnd || '18:00',
          lunchStart: companyPolicy.lunchStart || '12:00',
          lunchEnd: companyPolicy.lunchEnd || '13:00',
          halfDayAmWorkStart: companyPolicy.halfDayAmWorkStart || '14:00',
          halfDayAmWorkEnd: companyPolicy.halfDayAmWorkEnd || '18:00',
          halfDayPmWorkStart: companyPolicy.halfDayPmWorkStart || '09:00',
          halfDayPmWorkEnd: companyPolicy.halfDayPmWorkEnd || '14:00',
          updatedBy: user?.name || '최고관리자'
        })
      });
      const data = await res.json();
      if (data.success) {
        setCompanyPolicy(data.policy);
        onShowToast?.(
          '전사 정책 저장 완료',
          '정규 출퇴근 시간, 지각 유예시간 및 급여 기준 정책이 저장되었습니다.',
          'success'
        );
        onRefresh?.();
      } else {
        onShowToast?.('저장 실패', data.message || '전사 정책 저장 중 오류가 발생했습니다.', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast?.('오류', '서버와의 통신에 실패했습니다.', 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  // Fetch Attendance, Leaves, Users
  const loadAdminAttendanceData = async () => {
    setIsLoading(true);
    try {
      loadCompanyPolicy();
      const [attRes, lvRes, usrRes] = await Promise.all([
        fetch('/api/attendances').then(r => r.json()),
        fetch('/api/leaves').then(r => r.json()),
        fetch('/api/users').then(r => r.json())
      ]);

      const attList = Array.isArray(attRes) ? attRes : [];
      const lvList = Array.isArray(lvRes) ? lvRes : [];
      let uList = Array.isArray(usrRes) ? usrRes : (employees || []);
      if (user?.role === 'TEAM_LEADER') {
        uList = uList.filter(u => u.dept === user.dept);
      }

      setAttendances(attList);
      setLeaves(lvList);
      setUsersList(uList);

      setSelectedCalendarUserId(prev => {
        if (prev && uList.some(u => u.id === prev)) return prev;
        return uList.length > 0 ? uList[0].id : '';
      });
    } catch (err) {
      console.error('Failed to load admin attendance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminAttendanceData();
  }, []);

  // Extract distinct departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set();
    usersList.forEach(u => {
      if (u.dept) set.add(u.dept);
    });
    attendances.forEach(a => {
      if (a.dept) set.add(a.dept);
    });
    return Array.from(set);
  }, [usersList, attendances]);

  // Real-time Summary Metrics Calculation for the selected date (or today)
  const metricTargetDate = selectedDate || getTodayStr();

  const summaryMetrics = useMemo(() => {
    const totalStaff = usersList.length;
    const dateAtts = attendances.filter(a => a.date === metricTargetDate);
    const dateLeaves = leaves.filter(l => 
      l.status === 'APPROVED' && 
      metricTargetDate >= l.startDate && 
      metricTargetDate <= l.endDate
    );

    // Working (출근 후 아직 퇴근 안 함, 사내)
    const workingCount = dateAtts.filter(a => a.checkIn && !a.checkOut && (a.workType === 'OFFICE' || !a.workType)).length;
    // Completed (퇴근 완료)
    const completedCount = dateAtts.filter(a => a.checkOut).length;
    // Remote / Field (재택 or 외근: 출근 기록 또는 사전 승인 건)
    const remoteFieldAttUserIds = new Set(dateAtts.filter(a => a.workType === 'REMOTE' || a.workType === 'FIELD').map(a => a.userId));
    const remoteFieldLeaveUserIds = new Set(dateLeaves.filter(l => l.leaveType === 'REMOTE' || l.leaveType === 'FIELD').map(l => l.userId));
    const remoteFieldCount = new Set([...remoteFieldAttUserIds, ...remoteFieldLeaveUserIds]).size;

    // Leave count (휴가: 연차, 반차 등 순수 휴가만 집계)
    const actualLeaves = dateLeaves.filter(l => l.leaveType !== 'REMOTE' && l.leaveType !== 'FIELD');
    const leaveCount = actualLeaves.length;

    // Late count (지각: isLate 플래그 또는 기준시각 + 유예시간 초과 출근)
    const lateCount = dateAtts.filter(a => {
      if (a.isLate) return true;
      if (a.checkIn) {
        const [h, m] = a.checkIn.slice(0, 5).split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          const stdStart = companyPolicy.standardWorkStart || '09:00';
          const [stdH, stdM] = stdStart.split(':').map(Number);
          const grace = Number(companyPolicy.lateGraceMinutes ?? 5);
          return (h * 60 + m) > (stdH * 60 + stdM + grace);
        }
      }
      return false;
    }).length;

    // Unrecorded (출퇴근 기록도 없고 휴가/재택/외근도 아닌 사원 수)
    const attendedUserIds = new Set(dateAtts.map(a => a.userId));
    const allApprovedUserIds = new Set(dateLeaves.map(l => l.userId));
    const unrecordedCount = Math.max(0, usersList.filter(u => !attendedUserIds.has(u.id) && !allApprovedUserIds.has(u.id)).length);

    // Attended count (근무중 + 퇴근완료 + 외근/재택)
    const attendedCount = workingCount + completedCount + remoteFieldCount;
    // Attendance rate (%)
    const attendanceRate = totalStaff > 0 ? Math.round((attendedCount / totalStaff) * 100) : 0;

    return {
      totalStaff,
      attendedCount,
      attendanceRate,
      workingCount,
      completedCount,
      remoteFieldCount,
      leaveCount,
      lateCount,
      unrecordedCount
    };
  }, [usersList, attendances, leaves, metricTargetDate]);

  // Detailed Statistical Insights (Department breakdown, check-in arrival analysis, 5-day trend)
  const detailedStats = useMemo(() => {
    const totalStaff = usersList.length;
    const dateAtts = attendances.filter(a => a.date === metricTargetDate);
    const dateLeaves = leaves.filter(l => 
      l.status === 'APPROVED' && 
      metricTargetDate >= l.startDate && 
      metricTargetDate <= (l.endDate || l.startDate)
    );

    // 1. Department Attendance Breakdown
    const deptStats = departments.map(deptName => {
      const deptUsers = usersList.filter(u => u.dept === deptName);
      const deptTotal = deptUsers.length;
      if (deptTotal === 0) return null;

      const deptUserIds = new Set(deptUsers.map(u => u.id));
      const deptAttList = dateAtts.filter(a => deptUserIds.has(a.userId) || a.dept === deptName);
      const deptLeaveList = dateLeaves.filter(l => deptUserIds.has(l.userId) || l.dept === deptName);

      const working = deptAttList.filter(a => a.checkIn && !a.checkOut && (a.workType === 'OFFICE' || !a.workType)).length;
      const completed = deptAttList.filter(a => a.checkOut).length;
      const remoteField = new Set([
        ...deptAttList.filter(a => a.workType === 'REMOTE' || a.workType === 'FIELD').map(a => a.userId),
        ...deptLeaveList.filter(l => l.leaveType === 'REMOTE' || l.leaveType === 'FIELD').map(l => l.userId)
      ]).size;
      const leave = deptLeaveList.filter(l => l.leaveType !== 'REMOTE' && l.leaveType !== 'FIELD').length;

      const attended = working + completed + remoteField;
      const rate = deptTotal > 0 ? Math.round((attended / deptTotal) * 100) : 0;
      const unrecorded = Math.max(0, deptTotal - attended - leave);

      return {
        deptName,
        total: deptTotal,
        attended,
        rate,
        working,
        completed,
        remoteField,
        leave,
        unrecorded
      };
    }).filter(Boolean);

    deptStats.sort((a, b) => b.total - a.total);

    // 2. Arrival Highlights
    const checkInTimes = dateAtts
      .filter(a => a.checkIn)
      .map(a => a.checkIn.slice(0, 5));

    let avgCheckIn = '-';
    let onTimeCount = 0;
    let lateCount = 0;
    let before830 = 0;
    let between830and9 = 0;

    if (checkInTimes.length > 0) {
      let totalMinutes = 0;
      checkInTimes.forEach(t => {
        const [h, m] = t.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          const mins = h * 60 + m;
          totalMinutes += mins;
          if (mins <= 9 * 60) {
            onTimeCount++;
          } else {
            lateCount++;
          }
          if (mins <= 8 * 60 + 30) {
            before830++;
          } else if (mins <= 9 * 60) {
            between830and9++;
          }
        }
      });
      const avgMins = Math.round(totalMinutes / checkInTimes.length);
      const avgH = String(Math.floor(avgMins / 60)).padStart(2, '0');
      const avgM = String(avgMins % 60).padStart(2, '0');
      avgCheckIn = `${avgH}:${avgM}`;
    }

    const onTimeRate = checkInTimes.length > 0 ? Math.round((onTimeCount / checkInTimes.length) * 100) : 0;
    const networkVerifiedCount = dateAtts.filter(a => a.isCompanyNetwork).length;
    const networkRate = dateAtts.length > 0 ? Math.round((networkVerifiedCount / dateAtts.length) * 100) : 0;

    // 2-2. Arrival Time Distribution Buckets (5 time slots)
    const timeBuckets = [
      { label: '~08:30', count: 0 },
      { label: '08:30~45', count: 0 },
      { label: '08:45~09:00', count: 0 },
      { label: '09:00~30', count: 0 },
      { label: '09:30~', count: 0 }
    ];
    checkInTimes.forEach(t => {
      const [h, m] = t.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const mins = h * 60 + m;
        if (mins <= 8 * 60 + 30) timeBuckets[0].count++;
        else if (mins <= 8 * 60 + 45) timeBuckets[1].count++;
        else if (mins <= 9 * 60) timeBuckets[2].count++;
        else if (mins <= 9 * 60 + 30) timeBuckets[3].count++;
        else timeBuckets[4].count++;
      }
    });
    const maxTimeBucketCount = Math.max(1, ...timeBuckets.map(b => b.count));

    // 3. Last 5 Weekdays Trend
    const trendDays = [];
    const baseDate = new Date(metricTargetDate);
    if (!isNaN(baseDate.getTime())) {
      let d = new Date(baseDate);
      let count = 0;
      while (count < 5) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${day}`;

          const dAtts = attendances.filter(a => a.date === dateStr);
          const dLeaves = leaves.filter(l => l.status === 'APPROVED' && dateStr >= l.startDate && dateStr <= (l.endDate || l.startDate));
          const w = dAtts.filter(a => a.checkIn && !a.checkOut && (a.workType === 'OFFICE' || !a.workType)).length;
          const c = dAtts.filter(a => a.checkOut).length;
          const r = new Set([
            ...dAtts.filter(a => a.workType === 'REMOTE' || a.workType === 'FIELD').map(a => a.userId),
            ...dLeaves.filter(l => l.leaveType === 'REMOTE' || l.leaveType === 'FIELD').map(l => l.userId)
          ]).size;
          const attCount = w + c + r;
          const attRate = totalStaff > 0 ? Math.round((attCount / totalStaff) * 100) : 0;

          const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
          trendDays.unshift({
            dateStr,
            displayDate: `${m}.${day}`,
            dayName: dayNames[dayOfWeek],
            attRate,
            attCount,
            totalStaff,
            isTargetDate: dateStr === metricTargetDate
          });
          count++;
        }
        d.setDate(d.getDate() - 1);
      }
    }

    return {
      deptStats,
      avgCheckIn,
      onTimeRate,
      onTimeCount,
      lateCount,
      before830,
      between830and9,
      networkRate,
      networkVerifiedCount,
      trendDays,
      timeBuckets,
      maxTimeBucketCount
    };
  }, [usersList, attendances, leaves, departments, metricTargetDate]);

  // ===================== CALENDAR VIEW LOGIC =====================
  const calYear = calCurrentDate.getFullYear();
  const calMonth = calCurrentDate.getMonth(); // 0-indexed

  const handlePrevMonth = () => {
    setCalCurrentDate(new Date(calYear, calMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalCurrentDate(new Date(calYear, calMonth + 1, 1));
  };

  const handleTodayMonth = () => {
    setCalCurrentDate(new Date());
  };

  const handleJumpDate = (dateStr) => {
    if (!dateStr) return;
    const [y, m, d] = dateStr.split('-').map(Number);
    setCalCurrentDate(new Date(y, m - 1, d || 1));
  };

  // Selected employee object
  const currentCalendarUser = useMemo(() => {
    return usersList.find(u => u.id === selectedCalendarUserId) || usersList[0] || null;
  }, [usersList, selectedCalendarUserId]);

  // Group employees by department for calendar selector optgroup tree
  const usersByDept = useMemo(() => {
    const map = new Map();
    usersList.forEach(u => {
      const dept = u.dept || '기타';
      if (!map.has(dept)) {
        map.set(dept, []);
      }
      map.get(dept).push(u);
    });
    return Array.from(map.entries());
  }, [usersList]);

  // Selected employee monthly attendance summary
  const selectedUserMonthSummary = useMemo(() => {
    if (!currentCalendarUser) {
      return { workDaysCount: 0, totalWorkHours: 0, avgWorkHours: '0.0', leaveDaysCount: 0, lateCount: 0 };
    }

    const monthStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
    const userAtts = attendances.filter(a => a.userId === currentCalendarUser.id && a.date && a.date.startsWith(monthStr));
    const userLeaves = leaves.filter(l => 
      l.userId === currentCalendarUser.id && 
      l.status === 'APPROVED' && 
      ((l.startDate && l.startDate.startsWith(monthStr)) || (l.endDate && l.endDate.startsWith(monthStr)))
    );

    const workDaysCount = userAtts.filter(a => a.checkIn).length;
    const totalWorkHours = userAtts.reduce((acc, cur) => acc + (cur.workHours || 0), 0);
    const avgWorkHours = workDaysCount > 0 ? (totalWorkHours / workDaysCount).toFixed(1) : '0.0';
    const leaveDaysCount = userLeaves.reduce((acc, cur) => acc + (cur.leaveDays || 1), 0);
    const lateCount = userAtts.filter(a => a.isLate).length;

    return {
      workDaysCount,
      totalWorkHours: Math.round(totalWorkHours * 10) / 10,
      avgWorkHours,
      leaveDaysCount,
      lateCount
    };
  }, [currentCalendarUser, attendances, leaves, calYear, calMonth]);

  // Calendar 35-42 days grid generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
    const lastDate = new Date(calYear, calMonth + 1, 0).getDate(); // Days in this month
    const prevLastDate = new Date(calYear, calMonth, 0).getDate(); // Days in prev month

    const days = [];
    const todayStr = getTodayStr();

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevLastDate - i;
      const prevM = calMonth === 0 ? 12 : calMonth;
      const prevY = calMonth === 0 ? calYear - 1 : calYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateNumber: d,
        dateStr,
        isCurrentMonth: false,
        dayOfWeek: new Date(prevY, prevM - 1, d).getDay()
      });
    }

    // 2. Current month days
    for (let d = 1; d <= lastDate; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateNumber: d,
        dateStr,
        isCurrentMonth: true,
        dayOfWeek: new Date(calYear, calMonth, d).getDay()
      });
    }

    // 3. Next month leading days (fill up to 35 or 42 slots)
    const remaining = (7 - (days.length % 7)) % 7;
    const totalSlots = days.length + remaining < 35 ? 35 : (days.length + remaining);
    const nextSlots = totalSlots - days.length;
    for (let d = 1; d <= nextSlots; d++) {
      const nextM = calMonth === 11 ? 1 : calMonth + 2;
      const nextY = calMonth === 11 ? calYear + 1 : calYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateNumber: d,
        dateStr,
        isCurrentMonth: false,
        dayOfWeek: new Date(nextY, nextM - 1, d).getDay()
      });
    }

    // Enrich with selected employee's attendance and leaves
    const targetUserId = currentCalendarUser?.id;

    return days.map(day => {
      const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
      const isToday = day.dateStr === todayStr;

      let att = null;
      let leave = null;

      if (targetUserId) {
        att = attendances.find(a => a.userId === targetUserId && a.date === day.dateStr);
        leave = leaves.find(l => 
          l.userId === targetUserId && 
          l.status === 'APPROVED' && 
          day.dateStr >= l.startDate && 
          day.dateStr <= l.endDate
        );
      }

      const holidayName = getHoliday(day.dateStr);
      const isHoliday = !!holidayName;
      const isPastWeekday = day.dateStr < todayStr && !isWeekend && !isHoliday && !att && !leave && day.isCurrentMonth;

      return {
        ...day,
        isWeekend,
        isToday,
        att,
        leave,
        isPastWeekday
      };
    });
  }, [calYear, calMonth, currentCalendarUser, attendances, leaves]);

  // Click handler for a calendar date cell
  const handleCalendarCellClick = (day) => {
    if (!currentCalendarUser) return;

    if (day.att) {
      handleOpenDetail({
        ...day.att,
        userEmpNo: currentCalendarUser.empNo,
        userPosition: currentCalendarUser.position,
        sourceType: 'RECORDED'
      });
    } else if (day.leave) {
      handleOpenDetail({
        id: `leave-${day.leave.id}-${currentCalendarUser.id}`,
        userId: currentCalendarUser.id,
        userName: currentCalendarUser.name,
        dept: currentCalendarUser.dept,
        userEmpNo: currentCalendarUser.empNo,
        userPosition: currentCalendarUser.position,
        date: day.dateStr,
        checkIn: null,
        checkOut: null,
        workHours: 0,
        status: 'LEAVE',
        workType: 'LEAVE',
        isCompanyNetwork: false,
        reason: `${day.leave.leaveType === 'ANNUAL' ? '연차' : '휴가'}: ${day.leave.reason || '승인 완료'}`,
        sourceType: 'LEAVE'
      });
    } else {
      // Direct registration for empty date
      handleOpenDetail({
        id: `new-${currentCalendarUser.id}-${day.dateStr}`,
        userId: currentCalendarUser.id,
        userName: currentCalendarUser.name,
        dept: currentCalendarUser.dept,
        userEmpNo: currentCalendarUser.empNo,
        userPosition: currentCalendarUser.position,
        date: day.dateStr,
        checkIn: null,
        checkOut: null,
        workHours: 0,
        status: 'UNRECORDED',
        workType: 'OFFICE',
        isCompanyNetwork: true,
        reason: '',
        sourceType: 'UNRECORDED'
      });
    }
  };

  // ===================== DAILY TABLE VIEW LOGIC =====================
  const displayRows = useMemo(() => {
    let rows = [];

    if (selectedDate) {
      const dateAtts = attendances.filter(a => a.date === selectedDate);
      const dateLeaves = leaves.filter(l => 
        l.status === 'APPROVED' && 
        selectedDate >= l.startDate && 
        selectedDate <= l.endDate
      );

      const attMap = new Map();
      dateAtts.forEach(a => attMap.set(a.userId, a));

      const leaveMap = new Map();
      dateLeaves.forEach(l => leaveMap.set(l.userId, l));

      rows = usersList.map(u => {
        const att = attMap.get(u.id);
        const leave = leaveMap.get(u.id);

        const isAm = leave && (leave.timeSlot === 'AM' || leave.leaveType === 'HALF_AM');
        const isPm = leave && (leave.timeSlot === 'PM' || leave.leaveType === 'HALF_PM');

        if (att) {
          const halfDayLabel = isAm ? '오전반차' : (isPm ? '오후반차' : (att.halfDaySlot === 'AM' ? '오전반차' : (att.halfDaySlot === 'PM' ? '오후반차' : null)));

          return {
            ...att,
            userEmpNo: u.empNo,
            userPosition: u.position,
            sourceType: 'RECORDED',
            leaveTypeName: halfDayLabel,
            isHalfDay: Boolean(att.isHalfDay || isAm || isPm)
          };
        } else if (leave) {
          const isRemote = leave.leaveType === 'REMOTE';
          const isField = leave.leaveType === 'FIELD';
          const typeName = isRemote ? '재택근무' : (isField ? '외근/출장' : (isAm ? '오전반차' : (isPm ? '오후반차' : (leave.leaveType === 'ANNUAL' ? '연차' : (leave.leaveType === 'SICK' ? '병가' : (leave.leaveType === 'SPECIAL' ? '경조사' : '휴가'))))));

          return {
            id: `leave-${leave.id}-${u.id}`,
            userId: u.id,
            userName: u.name,
            dept: u.dept,
            userEmpNo: u.empNo,
            userPosition: u.position,
            date: selectedDate,
            checkIn: null,
            checkOut: null,
            workHours: 0,
            status: isRemote ? 'REMOTE' : (isField ? 'FIELD' : 'LEAVE'),
            workType: isRemote ? 'REMOTE' : (isField ? 'FIELD' : 'LEAVE'),
            isCompanyNetwork: false,
            reason: leave.reason || '',
            leaveType: leave.leaveType,
            leaveTypeName: typeName,
            sourceType: 'LEAVE',
            isHalfDay: Boolean(isAm || isPm),
            halfDaySlot: isAm ? 'AM' : (isPm ? 'PM' : null)
          };
        } else {
          return {
            id: `unrec-${u.id}-${selectedDate}`,
            userId: u.id,
            userName: u.name,
            dept: u.dept,
            userEmpNo: u.empNo,
            userPosition: u.position,
            date: selectedDate,
            checkIn: null,
            checkOut: null,
            workHours: 0,
            status: 'UNRECORDED',
            workType: 'NONE',
            isCompanyNetwork: false,
            reason: '미출근 (출퇴근 미등록)',
            sourceType: 'UNRECORDED'
          };
        }
      });
    } else {
      const userMap = new Map();
      usersList.forEach(u => userMap.set(u.id, u));

      rows = attendances.map(a => {
        const u = userMap.get(a.userId);
        return {
          ...a,
          userEmpNo: u?.empNo || a.empNo,
          userPosition: u?.position || a.position || '사원',
          sourceType: 'RECORDED'
        };
      });
    }

    // Apply Department filter
    if (selectedDept) {
      rows = rows.filter(r => r.dept === selectedDept);
    }

    // Apply Status filter
    if (selectedStatus) {
      if (selectedStatus === 'WORKING') {
        rows = rows.filter(r => r.checkIn && !r.checkOut && (r.workType === 'OFFICE' || !r.workType));
      } else if (selectedStatus === 'COMPLETED') {
        rows = rows.filter(r => r.checkOut);
      } else if (selectedStatus === 'REMOTE_FIELD') {
        rows = rows.filter(r => r.workType === 'REMOTE' || r.workType === 'FIELD');
      } else if (selectedStatus === 'LEAVE') {
        rows = rows.filter(r => r.workType === 'LEAVE' || r.status === 'LEAVE');
      } else if (selectedStatus === 'UNRECORDED') {
        rows = rows.filter(r => r.status === 'UNRECORDED');
      }
    }

    // Apply Search Term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      rows = rows.filter(r => 
        (r.userName && r.userName.toLowerCase().includes(term)) ||
        (r.dept && r.dept.toLowerCase().includes(term)) ||
        (r.userEmpNo && r.userEmpNo.toLowerCase().includes(term)) ||
        (r.userPosition && r.userPosition.toLowerCase().includes(term))
      );
    }

    return rows;
  }, [selectedDate, attendances, leaves, usersList, selectedDept, selectedStatus, searchTerm]);

  // Open Drawer for Detail & Correction
  const handleOpenDetail = (record) => {
    setSelectedAtt(record);
    setIsAttDetailClosing(false);
    setEditForm({
      checkIn: record.checkIn ? record.checkIn.slice(0, 5) : '',
      checkOut: record.checkOut ? record.checkOut.slice(0, 5) : '',
      workType: record.workType && record.workType !== 'NONE' && record.workType !== 'LEAVE' ? record.workType : 'OFFICE',
      isCompanyNetwork: record.isCompanyNetwork !== undefined ? record.isCompanyNetwork : true,
      reason: record.reason || ''
    });
  };

  const handleCloseDetail = () => {
    if (isAttDetailClosing) return;
    setIsAttDetailClosing(true);
    setTimeout(() => {
      setSelectedAtt(null);
      setIsAttDetailClosing(false);
    }, 220);
  };

  // Save Admin Correction
  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!selectedAtt) return;

    setIsSaving(true);
    try {
      if (selectedAtt.sourceType === 'RECORDED') {
        // Update existing attendance record
        const res = await fetch(`/api/attendances/${selectedAtt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkIn: editForm.checkIn ? `${editForm.checkIn}:00` : null,
            checkOut: editForm.checkOut ? `${editForm.checkOut}:00` : null,
            workType: editForm.workType,
            isCompanyNetwork: editForm.isCompanyNetwork,
            reason: editForm.reason
          })
        });
        const data = await res.json();
        if (data.success) {
          if (onShowToast) onShowToast('근태 보정 완료', `${selectedAtt.userName} 사원의 근태 기록이 수정되었습니다.`, 'success');
          await loadAdminAttendanceData();
          if (onRefresh) onRefresh();
          handleCloseDetail();
        } else {
          if (onShowToast) onShowToast('오류', data.message || '수정에 실패했습니다.', 'danger');
        }
      } else {
        // Register brand new attendance for unrecorded / calendar date
        const dateToUse = selectedAtt.date || selectedDate || getTodayStr();
        const res = await fetch('/api/attendances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: selectedAtt.userId,
            userName: selectedAtt.userName,
            dept: selectedAtt.dept,
            date: dateToUse,
            checkIn: editForm.checkIn ? `${editForm.checkIn}:00` : null,
            checkOut: editForm.checkOut ? `${editForm.checkOut}:00` : null,
            workType: editForm.workType,
            isCompanyNetwork: editForm.isCompanyNetwork,
            reason: editForm.reason || '관리자 수동 근태 등록'
          })
        });
        const data = await res.json();
        if (data.success) {
          if (onShowToast) onShowToast('등록 완료', `${selectedAtt.userName} 사원의 근태 기록이 등록되었습니다.`, 'success');
          await loadAdminAttendanceData();
          if (onRefresh) onRefresh();
          handleCloseDetail();
        } else {
          if (onShowToast) onShowToast('오류', data.message || '등록에 실패했습니다.', 'danger');
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast('네트워크 오류', '근태 보정 처리 중 오류가 발생했습니다.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset / Delete Attendance Record
  const handleDeleteAttendance = async () => {
    if (!selectedAtt || selectedAtt.sourceType !== 'RECORDED') return;
    if (!window.confirm(`${selectedAtt.userName} 사원의 ${selectedAtt.date} 출퇴근 기록을 삭제/초기화하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/attendances/${selectedAtt.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (onShowToast) onShowToast('초기화 완료', '근태 기록이 정상적으로 삭제되었습니다.', 'success');
        await loadAdminAttendanceData();
        if (onRefresh) onRefresh();
        handleCloseDetail();
      }
    } catch (err) {
      if (onShowToast) onShowToast('오류', '삭제 중 오류가 발생했습니다.', 'danger');
    }
  };



  return (
    <div style={{ paddingTop: 0 }}>
      
      {/* 1. SECTION HEADER (Shown only when hideHeader is false) */}
      {!hideHeader && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <h2 style={{
            fontSize: '22px',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            사내 근태 현황
          </h2>

          {/* Action Button: Excel Download */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { window.location.href = '/api/export/excel'; }}
              style={{
                padding: '0.75rem 1.4rem',
                fontSize: '15px',
                borderRadius: 0
              }}
            >
              전체 근태 엑셀 다운로드 (.xlsx)
            </button>
          </div>
        </div>
      )}

      {/* 2. REAL-TIME SUMMARY METRICS (4x2 완전 대칭 그리드, 강조된 대형 숫자 타이포그래피) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        columnGap: '2.5rem',
        rowGap: '2.25rem',
        marginBottom: '2.5rem',
        padding: '0 0 2rem 0',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {/* Metric 0: 오늘 출근율 */}
        <div>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            오늘 출근율
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
            <span style={{ fontSize: '36px', color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {summaryMetrics.attendanceRate}
            </span>
            <span style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>%</span>
          </div>
        </div>

        {/* Metric 1: 전체 */}
        <div>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            전체
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <span style={{ fontSize: '36px', color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {summaryMetrics.totalStaff}
            </span>
            <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>명</span>
          </div>
        </div>

        {/* Metric 2: 근무 중 */}
        <div>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            근무 중
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <span style={{ fontSize: '36px', color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {summaryMetrics.workingCount}
            </span>
            <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>명</span>
          </div>
        </div>

        {/* Metric 3: 미출근 */}
        <div>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            미출근
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <span style={{ fontSize: '36px', color: summaryMetrics.unrecordedCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {summaryMetrics.unrecordedCount}
            </span>
            <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>명</span>
          </div>
        </div>

        {/* Metric 4: 외근 · 재택 */}
        <div>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            외근 · 재택
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <span style={{ fontSize: '36px', color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {summaryMetrics.remoteFieldCount}
            </span>
            <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>명</span>
          </div>
        </div>

        {/* Metric 5: 휴가 */}
        <div>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            휴가
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <span style={{ fontSize: '36px', color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {summaryMetrics.leaveCount}
            </span>
            <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>명</span>
          </div>
        </div>

        {/* Metric 6: 지각 */}
        <div>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            지각
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <span style={{ fontSize: '36px', color: summaryMetrics.lateCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {summaryMetrics.lateCount}
            </span>
            <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>명</span>
          </div>
        </div>

        {/* Metric 7: 퇴근 */}
        <div>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            퇴근
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <span style={{ fontSize: '36px', color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {summaryMetrics.completedCount}
            </span>
            <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>명</span>
          </div>
        </div>
      </div>

      {/* 3. VIEW MODE SUB-TABS (사원별 근태 달력 vs 일자별 전체 현황 vs 급여 관리) */}
      <div style={{
        display: 'flex',
        gap: '2rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '1.75rem'
      }}>
        <button
          type="button"
          onClick={() => setViewMode('CALENDAR')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 0.25rem',
            fontSize: '18px',
            color: viewMode === 'CALENDAR' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: viewMode === 'CALENDAR' ? '2px solid var(--text-primary)' : '2px solid transparent',
            cursor: 'pointer',
            marginBottom: '-1px',
            transition: 'all 0.15s ease'
          }}
        >
          사원별 근태 달력
        </button>
        <button
          type="button"
          onClick={() => setViewMode('DAILY')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 0.25rem',
            fontSize: '18px',
            color: viewMode === 'DAILY' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: viewMode === 'DAILY' ? '2px solid var(--text-primary)' : '2px solid transparent',
            cursor: 'pointer',
            marginBottom: '-1px',
            transition: 'all 0.15s ease'
          }}
        >
          일자별 전체 현황
        </button>
        <button
          type="button"
          onClick={() => setViewMode('PAYROLL')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 0.25rem',
            fontSize: '18px',
            color: viewMode === 'PAYROLL' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: viewMode === 'PAYROLL' ? '2px solid var(--text-primary)' : '2px solid transparent',
            cursor: 'pointer',
            marginBottom: '-1px',
            transition: 'all 0.15s ease'
          }}
        >
          급여 관리
        </button>
        <button
          type="button"
          onClick={() => setViewMode('POLICY')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 0.25rem',
            fontSize: '18px',
            color: viewMode === 'POLICY' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: viewMode === 'POLICY' ? '2px solid var(--text-primary)' : '2px solid transparent',
            cursor: 'pointer',
            marginBottom: '-1px',
            transition: 'all 0.15s ease'
          }}
        >
          근태 및 급여 기준
        </button>
      </div>

      {/* ===================== VIEW 1: 사원별 근태 달력 ===================== */}
      {viewMode === 'CALENDAR' && (
        <div style={{
          border: '1px solid var(--border-color)',
          background: 'var(--bg-card)'
        }}>
          {/* Calendar Integrated Header: Left (Select), Center (Large Month & Arrow Icons), Right (Today & DatePicker) */}
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '1rem',
            backgroundColor: 'var(--bg-card)'
          }}>
            {/* Left: Department Tree Select (사원 선택 라벨 없이 셀렉트 직접 노출) */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <select
                className="form-control"
                value={selectedCalendarUserId}
                onChange={(e) => setSelectedCalendarUserId(e.target.value)}
                style={{ minWidth: '180px', width: 'auto', height: '38px', fontSize: '15px', paddingRight: '2.2rem', borderRadius: 0 }}
              >
                {usersByDept.map(([deptName, deptUsers]) => (
                  <optgroup key={deptName} label={deptName}>
                    {deptUsers.map(u => {
                      const title = u.position
                        ? (u.position.includes('팀장') ? '팀장' : (u.position.includes('이사') ? '이사' : (u.position.includes('선임') ? '선임' : (u.position.includes('주임') ? '주임' : (u.position.includes('책임') ? '책임' : u.position)))))
                        : '';
                      return (
                        <option key={u.id} value={u.id}>
                          {u.name}{title ? ` ${title}` : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Center: Month Navigation (가운데 정렬, 24px 대형 폰트, 화살표 아이콘) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePrevMonth}
                title="이전달"
                aria-label="이전달"
                style={{
                  width: '38px',
                  height: '38px',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 0
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', minWidth: '140px', textAlign: 'center' }}>
                {calYear}년 {calMonth + 1}월
              </span>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleNextMonth}
                title="다음달"
                aria-label="다음달"
                style={{
                  width: '38px',
                  height: '38px',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 0
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Right: 이번달 & CustomDatePicker (align="right"로 팝업 잘림 원천 방지) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleTodayMonth}
                style={{ borderRadius: 0, height: '38px', padding: '0 0.85rem', fontSize: '14px' }}
              >
                이번달
              </button>
              <CustomDatePicker
                value={`${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`}
                onChange={(d) => handleJumpDate(d)}
                placeholder="월/일 이동"
                width="140px"
                height="38px"
                align="right"
              />
            </div>
          </div>
            {/* Day Names Header (Monochrome, No Red/Blue) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '2px solid var(--border-color)',
              background: 'var(--bg-card-hover)',
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: 600,
              padding: '0.85rem 0',
              color: 'var(--text-secondary)'
            }}>
              <div>일</div>
              <div>월</div>
              <div>화</div>
              <div>수</div>
              <div>목</div>
              <div>금</div>
              <div>토</div>
            </div>

            {/* Calendar Cells Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)'
            }}>
              {calendarDays.map((day, idx) => {
                const isRightEdge = (idx + 1) % 7 === 0;
                const isBottomRow = idx >= calendarDays.length - 7;
                const holidayName = getHoliday(day.dateStr);
                const isHoliday = !!holidayName;
                const isSun = day.dayOfWeek === 0;
                const isSat = day.dayOfWeek === 6;

                return (
                  <div
                    key={`${day.dateStr}-${idx}`}
                    onClick={() => handleCalendarCellClick(day)}
                    style={{
                      minHeight: '135px',
                      padding: '0.75rem 0.85rem',
                      borderRight: isRightEdge ? 'none' : '1px solid var(--border-color)',
                      borderBottom: isBottomRow ? 'none' : '1px solid var(--border-color)',
                      backgroundColor: day.isToday 
                        ? 'var(--bg-card-hover)' 
                        : (day.isCurrentMonth ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)'),
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.backgroundColor = day.isToday ? 'var(--bg-card-hover)' : (day.isCurrentMonth ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)'); 
                    }}
                  >
                    {/* Top Bar: Date Number, Public Holiday and Today indicator */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.35rem',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {day.isToday ? (
                          <span style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'var(--text-primary)',
                            color: 'var(--bg-card)'
                          }}>
                            {day.dateNumber}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '16px',
                            fontWeight: day.isCurrentMonth ? 600 : 400,
                            color: !day.isCurrentMonth 
                              ? 'var(--text-muted)' 
                              : ((isSun || isHoliday) ? '#ef4444' : (isSat ? '#3b82f6' : 'var(--text-primary)'))
                          }}>
                            {day.dateNumber}
                          </span>
                        )}

                        {holidayName && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#ef4444',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {holidayName}
                          </span>
                        )}
                      </div>

                      {day.isToday && (
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          오늘
                        </span>
                      )}
                    </div>

                    {/* Cell Content: Clear, Readable Commute & Leave (Strictly NO Badges) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                      {day.att ? (
                        <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <div>출근 {day.att.checkIn ? day.att.checkIn.slice(0, 5) : '-'}</div>
                            <div>퇴근 {day.att.checkOut ? day.att.checkOut.slice(0, 5) : (day.att.checkIn ? '근무중' : '-')}</div>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            {day.att.workHours > 0 ? `${day.att.workHours}h · ` : ''}
                            {day.att.workType === 'REMOTE' ? '재택' : (day.att.workType === 'FIELD' ? '외근' : '사내')}
                            {day.att.isLate ? ' · 지각' : ''}
                          </div>
                        </div>
                      ) : day.leave ? (
                        <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {day.leave.leaveType === 'REMOTE' ? '재택근무' : (day.leave.leaveType === 'FIELD' ? '외근/출장' : (day.leave.leaveType === 'ANNUAL' ? '연차 휴가' : (day.leave.leaveType === 'HALF_AM' ? '오전반차' : (day.leave.leaveType === 'HALF_PM' ? '오후반차' : '휴가'))))}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            {day.leave.reason || '승인 완료'}
                          </div>
                        </div>
                      ) : day.isPastWeekday ? (
                        <div style={{ marginTop: '0.4rem', fontSize: '14px', color: 'var(--text-muted)' }}>
                          미출근
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      )}

      {/* ===================== VIEW 2: 일자별 전체 현황 ===================== */}
      {viewMode === 'DAILY' && (
        <div>
          {/* CONTROL & FILTER TOOLBAR (Clean Borderless) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.75rem'
          }}>
            {/* Left: Quick Date Buttons & Date Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.2rem' }}>
                조회 일자:
              </span>

              <button
                type="button"
                className={`btn btn-sm ${selectedDate === getTodayStr() ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedDate(getTodayStr())}
                style={{ borderRadius: 0, height: '40px', padding: '0 0.95rem', fontSize: '14px', display: 'inline-flex', alignItems: 'center' }}
              >
                오늘
              </button>

              <button
                type="button"
                className={`btn btn-sm ${selectedDate === getYesterdayStr() ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedDate(getYesterdayStr())}
                style={{ borderRadius: 0, height: '40px', padding: '0 0.95rem', fontSize: '14px', display: 'inline-flex', alignItems: 'center' }}
              >
                어제
              </button>

              <CustomDatePicker
                value={selectedDate}
                onChange={(d) => setSelectedDate(d)}
                placeholder="날짜 선택"
                width="160px"
                height="40px"
              />

              <button
                type="button"
                className={`btn btn-sm ${selectedDate === '' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedDate('')}
                title="전체 기간 누적 출퇴근 기록 조회"
                style={{ borderRadius: 0, height: '40px', padding: '0 0.95rem', fontSize: '14px', display: 'inline-flex', alignItems: 'center' }}
              >
                전체 누적 기록
              </button>
            </div>

            {/* Right: Department / Status Dropdowns & Search Box */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* Department Filter */}
              <select
                className="form-control"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{ width: '145px', height: '40px', fontSize: '15px', borderRadius: 0 }}
              >
                <option value="">전체 부서</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                className="form-control"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ width: '145px', height: '40px', fontSize: '15px', borderRadius: 0 }}
              >
                <option value="">전체 상태</option>
                <option value="WORKING">근무 중</option>
                <option value="COMPLETED">퇴근 완료</option>
                <option value="REMOTE_FIELD">외근 · 재택</option>
                <option value="LEAVE">휴가 중</option>
                {selectedDate && <option value="UNRECORDED">미출근</option>}
              </select>

              {/* Search Input */}
              <input
                type="text"
                className="form-control"
                placeholder="사원명, 직급, 사번 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '200px', height: '40px', padding: '0 0.85rem', fontSize: '15px', borderRadius: 0 }}
              />

              {(searchTerm || selectedDept || selectedStatus || selectedDate !== getTodayStr()) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDept('');
                    setSelectedStatus('');
                    setSelectedDate(getTodayStr());
                  }}
                  style={{ height: '40px', borderRadius: 0, padding: '0 0.85rem', fontSize: '14px', display: 'inline-flex', alignItems: 'center' }}
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          {/* COMPACT ATTENDANCE CARDS (깡똥한 카드 형식, 이름·출퇴근시간 중심, Strictly NO Badges) */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '16px' }}>근태 데이터를 불러오는 중입니다...</p>
            </div>
          ) : displayRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4.5rem 1.5rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '16px', margin: 0 }}>검색 및 필터 조건과 일치하는 근태 기록이 없습니다.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem'
            }}>
              {displayRows.map((row) => {
                const isWorking = row.checkIn && !row.checkOut && row.workType !== 'LEAVE';
                const isLeave = row.sourceType === 'LEAVE' || row.workType === 'LEAVE';
                const isUnrecorded = row.sourceType === 'UNRECORDED';
                const isCompleted = Boolean(row.checkOut);

                let statusText = isLeave 
                  ? (row.leaveTypeName || '연차') 
                  : (isWorking ? '근무 중' : (isCompleted ? '퇴근 완료' : (isUnrecorded ? '미출근' : '사내정상')));
                if (row.leaveTypeName && !isLeave) {
                  statusText = `${row.leaveTypeName} · ${statusText}`;
                }

                return (
                  <div
                    key={row.id}
                    onClick={() => handleOpenDetail(row)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      padding: '1.1rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease',
                      borderRadius: 0,
                      opacity: isUnrecorded ? 0.75 : 1
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    {/* Top Line: 이름, 직급 · 부서 (좌) / 상태 (우) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {row.userName}
                        </span>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row.userPosition || '사원'} · {row.dept}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        {selectedDate === '' && row.date && (
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            {row.date.slice(5)}
                          </span>
                        )}
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: isWorking || isLeave ? 'var(--text-primary)' : 'var(--text-muted)'
                        }}>
                          {statusText}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Line: 출근 시간 · 퇴근 시간 · 실근무 (깡똥하게 1줄로 한눈에 확인) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '15px',
                      paddingTop: '0.65rem',
                      borderTop: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>출근</span>
                        <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {row.checkIn ? row.checkIn.slice(0, 5) : '-'}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>퇴근</span>
                        <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {row.checkOut ? row.checkOut.slice(0, 5) : (isWorking ? '근무 중' : '-')}
                        </strong>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        {row.workHours > 0 ? (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
                            {row.workHours}h
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>-</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== VIEW 3: 급여 관리 ===================== */}
      {viewMode === 'PAYROLL' && (
        <div style={{ marginTop: '0.5rem', width: '100%' }}>
          <PayrollManager
            user={user}
            onShowToast={onShowToast}
          />
        </div>
      )}

      {/* ===================== VIEW 4: 근태 및 급여 기준 설정 ===================== */}
      {viewMode === 'POLICY' && (
        <div style={{ marginTop: '0.5rem', width: '100%', maxWidth: '960px' }}>
          <div style={{
            paddingBottom: '0.85rem',
            borderBottom: '2px solid var(--border-color)',
            marginBottom: '1rem'
          }}>
            <h3 style={{ fontSize: '20px', margin: 0, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              전사 급여 및 근태 기준 설정
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* 1. 정기 급여 지급일 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '220px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 400,
                flexShrink: 0
              }}>
                정기 급여 지급일
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>매월</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={companyPolicy.salaryPaymentDay || 25}
                  onChange={(e) => setCompanyPolicy({
                    ...companyPolicy,
                    salaryPaymentDay: Math.min(31, Math.max(1, Number(e.target.value)))
                  })}
                  style={{
                    width: '100px',
                    height: '44px',
                    padding: '0 0.85rem',
                    fontSize: '16px',
                    fontWeight: 400,
                    borderRadius: 0,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>일</span>
                <TooltipHelp text="지급일 도래 전: '지급 예정' / 지급일 도래 후: '지급 완료'로 자동 전환됩니다." />
              </div>
            </div>

            {/* 2. 정규 근무 시간 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '220px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 400,
                flexShrink: 0
              }}>
                정규 근무 시간
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>출근</span>
                <CustomTimePicker
                  value={companyPolicy.standardWorkStart || '09:00'}
                  onChange={(val) => setCompanyPolicy({
                    ...companyPolicy,
                    standardWorkStart: val
                  })}
                  width="125px"
                  height="44px"
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400, margin: '0 0.25rem' }}>~</span>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>퇴근</span>
                <CustomTimePicker
                  value={companyPolicy.standardWorkEnd || '18:00'}
                  onChange={(val) => setCompanyPolicy({
                    ...companyPolicy,
                    standardWorkEnd: val
                  })}
                  width="125px"
                  height="44px"
                />
                <TooltipHelp text="사내 표준 정규 출퇴근 기준 시각입니다. 출근 기준 시각 이후 유예시간 초과 시 지각 처리되며, 사전 승인된 야근 신청 시 퇴근 기준 시각 이후 근무가 연장근로로 인정됩니다." />
              </div>
            </div>

            {/* 3. 지각 인정 유예시간 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '220px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 400,
                flexShrink: 0
              }}>
                지각 인정 유예시간
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={companyPolicy.lateGraceMinutes ?? 5}
                  onChange={(e) => setCompanyPolicy({
                    ...companyPolicy,
                    lateGraceMinutes: Math.max(0, Number(e.target.value))
                  })}
                  style={{
                    width: '100px',
                    height: '44px',
                    padding: '0 0.85rem',
                    fontSize: '16px',
                    fontWeight: 400,
                    borderRadius: 0,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>분</span>
                <TooltipHelp text="출근 기준 시각 이후 해당 유예시간 이내 출근 시 정상 출근으로 인정되며, 유예시간 초과 시 지각으로 처리됩니다. (0분 입력 시 정각 초과 즉시 지각)" />
              </div>
            </div>

            {/* 4. 점심 휴게 시간 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '220px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 400,
                flexShrink: 0
              }}>
                점심 휴게 시간
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>시작</span>
                <CustomTimePicker
                  value={companyPolicy.lunchStart || '12:00'}
                  onChange={(val) => setCompanyPolicy({
                    ...companyPolicy,
                    lunchStart: val
                  })}
                  width="125px"
                  height="44px"
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400, margin: '0 0.25rem' }}>~</span>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>종료</span>
                <CustomTimePicker
                  value={companyPolicy.lunchEnd || '13:00'}
                  onChange={(val) => setCompanyPolicy({
                    ...companyPolicy,
                    lunchEnd: val
                  })}
                  width="125px"
                  height="44px"
                />
                <TooltipHelp text="법정 의무 휴게시간으로 일간 정규 근무 시간 산정 시 자동 공제됩니다." />
              </div>
            </div>

            {/* 5. 오전 반차 근무 기준 시간 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '220px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 400,
                flexShrink: 0
              }}>
                오전 반차 근무 시간
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>출근</span>
                <CustomTimePicker
                  value={companyPolicy.halfDayAmWorkStart || '14:00'}
                  onChange={(val) => setCompanyPolicy({
                    ...companyPolicy,
                    halfDayAmWorkStart: val
                  })}
                  width="125px"
                  height="44px"
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400, margin: '0 0.25rem' }}>~</span>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>퇴근</span>
                <CustomTimePicker
                  value={companyPolicy.halfDayAmWorkEnd || '18:00'}
                  onChange={(val) => setCompanyPolicy({
                    ...companyPolicy,
                    halfDayAmWorkEnd: val
                  })}
                  width="125px"
                  height="44px"
                />
                <TooltipHelp text="오전 휴무 후 오후 출근 기준 시각 및 정규 퇴근 시각입니다. 출근 기준 1시간 전부터 출근 체크가 허용되며, 유예시간 초과 시 지각 처리됩니다." />
              </div>
            </div>

            {/* 6. 오후 반차 근무 기준 시간 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '220px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 400,
                flexShrink: 0
              }}>
                오후 반차 근무 시간
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>출근</span>
                <CustomTimePicker
                  value={companyPolicy.halfDayPmWorkStart || '09:00'}
                  onChange={(val) => setCompanyPolicy({
                    ...companyPolicy,
                    halfDayPmWorkStart: val
                  })}
                  width="125px"
                  height="44px"
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400, margin: '0 0.25rem' }}>~</span>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>퇴근</span>
                <CustomTimePicker
                  value={companyPolicy.halfDayPmWorkEnd || '14:00'}
                  onChange={(val) => setCompanyPolicy({
                    ...companyPolicy,
                    halfDayPmWorkEnd: val
                  })}
                  width="125px"
                  height="44px"
                />
                <TooltipHelp text="오전 정상 출근 후 오후 퇴근 기준 시각입니다. 퇴근 기준 시각 이전 퇴근 시 조퇴 처리됩니다." />
              </div>
            </div>

            {/* 7. 비과세 식대 기본액 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '220px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 400,
                flexShrink: 0
              }}>
                비과세 식대 기본액
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={companyPolicy.mealAllowanceDefault ?? 200000}
                  onChange={(e) => setCompanyPolicy({
                    ...companyPolicy,
                    mealAllowanceDefault: Math.max(0, Number(e.target.value))
                  })}
                  style={{
                    width: '220px',
                    height: '44px',
                    padding: '0 1rem',
                    fontSize: '16px',
                    fontWeight: 400,
                    borderRadius: 0,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>원</span>
                <TooltipHelp text="소득세법상 법정 비과세 한도는 월 200,000원입니다." />
              </div>
            </div>

            {/* 8. 지각 1회당 근태 차감액 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '220px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 400,
                flexShrink: 0
              }}>
                지각 1회당 차감액
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={companyPolicy.lateDeductionPerCase ?? 30000}
                  onChange={(e) => setCompanyPolicy({
                    ...companyPolicy,
                    lateDeductionPerCase: Math.max(0, Number(e.target.value))
                  })}
                  style={{
                    width: '220px',
                    height: '44px',
                    padding: '0 1rem',
                    fontSize: '16px',
                    fontWeight: 400,
                    borderRadius: 0,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>원</span>
                <TooltipHelp text="월간 지각 횟수에 비례하여 급여에서 일괄 공제됩니다." />
              </div>
            </div>

            {/* 9. 조퇴 1회당 근태 차감액 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '220px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 400,
                flexShrink: 0
              }}>
                조퇴 1회당 차감액
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={companyPolicy.earlyLeaveDeductionPerCase ?? 10000}
                  onChange={(e) => setCompanyPolicy({
                    ...companyPolicy,
                    earlyLeaveDeductionPerCase: Math.max(0, Number(e.target.value))
                  })}
                  style={{
                    width: '220px',
                    height: '44px',
                    padding: '0 1rem',
                    fontSize: '16px',
                    fontWeight: 400,
                    borderRadius: 0,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>원</span>
                <TooltipHelp text="월간 조퇴 횟수에 비례하여 급여에서 일괄 공제됩니다." />
              </div>
            </div>

            {/* 10. 정책 저장 버튼 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1.25rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{ width: '220px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <button
                  type="button"
                  onClick={handleSaveCompanyPolicy}
                  disabled={savingPolicy}
                  className="btn btn-primary"
                  style={{
                    minWidth: '260px',
                    height: '44px',
                    fontSize: '15px',
                    fontWeight: 400,
                    borderRadius: 0,
                    cursor: savingPolicy ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingPolicy ? '전사 정책 저장 중...' : '전사 급여 및 근태 기준 저장'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. DETAIL & ADMIN CORRECTION SLIDE DRAWER */}
      {selectedAtt && (
        <div
          className={`detail-backdrop ${isAttDetailClosing ? 'closing' : ''}`}
          onClick={handleCloseDetail}
        >
          <div
            className={`detail-slide-drawer drawer-md ${isAttDetailClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {/* Drawer Header (Strictly NO descriptive helper text) */}
            <div style={{
              padding: '1.75rem 2rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <div>
                <h3 style={{ fontSize: '21px', fontWeight: 400, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  사원 근태 상세 정보 및 시각 보정
                </h3>
                <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontWeight: 400 }}>
                  {selectedAtt.userName} {selectedAtt.userPosition ? `(${selectedAtt.userPosition})` : ''} · {selectedAtt.dept}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseDetail}
                title="닫기"
                aria-label="닫기"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  borderRadius: '4px',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2.25rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* 사원 기본 프로필 (Zero Box, Pure Minimal Typography) */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                paddingBottom: '2rem',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  사원 기본 프로필
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1.25rem 1.75rem'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>성명</span>
                    <span style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 400 }}>{selectedAtt.userName}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>사번</span>
                    <span style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 400 }}>{selectedAtt.userEmpNo || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>소속</span>
                    <span style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 400 }}>{selectedAtt.dept}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>직급</span>
                    <span style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 400 }}>{selectedAtt.userPosition || '사원'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>기준일자</span>
                    <span style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 400 }}>{selectedAtt.date || selectedDate}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>상태</span>
                    <span style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 400 }}>
                      {selectedAtt.checkOut ? '퇴근 완료' : (selectedAtt.checkIn ? '근무 중' : (selectedAtt.sourceType === 'LEAVE' ? '휴가 중' : '미출근'))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Correction Form (Zero Box, Pure Minimal Form) */}
              <form onSubmit={handleSaveCorrection} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  출퇴근 시각 및 근무 설정 보정
                </div>

                {/* Time Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 400, margin: 0 }}>
                        출근 시각
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, checkIn: '09:00' }))}
                        title="출근 시각을 09:00으로 즉시 설정"
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          fontSize: '14px',
                          fontWeight: 400,
                          padding: '3px 10px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--text-primary)';
                          e.currentTarget.style.borderColor = 'var(--text-muted)';
                          e.currentTarget.style.backgroundColor = 'var(--bg-input)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        09:00 정시
                      </button>
                    </div>
                    <input
                      type="time"
                      className="form-control"
                      value={editForm.checkIn}
                      onChange={(e) => setEditForm(prev => ({ ...prev, checkIn: e.target.value }))}
                      style={{ height: '48px', fontSize: '15.5px', fontWeight: 400, padding: '0 1rem', borderRadius: 0 }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 400, margin: 0 }}>
                        퇴근 시각
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, checkOut: '18:00' }))}
                        title="퇴근 시각을 18:00으로 즉시 설정"
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          fontSize: '14px',
                          fontWeight: 400,
                          padding: '3px 10px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--text-primary)';
                          e.currentTarget.style.borderColor = 'var(--text-muted)';
                          e.currentTarget.style.backgroundColor = 'var(--bg-input)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        18:00 정시
                      </button>
                    </div>
                    <input
                      type="time"
                      className="form-control"
                      value={editForm.checkOut}
                      onChange={(e) => setEditForm(prev => ({ ...prev, checkOut: e.target.value }))}
                      style={{ height: '48px', fontSize: '15.5px', fontWeight: 400, padding: '0 1rem', borderRadius: 0 }}
                    />
                  </div>
                </div>

                {/* Work Type Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 400, margin: 0 }}>
                    근무 형태
                  </label>
                  <select
                    className="form-control"
                    value={editForm.workType}
                    onChange={(e) => setEditForm(prev => ({ ...prev, workType: e.target.value }))}
                    style={{ height: '48px', fontSize: '15.5px', fontWeight: 400, padding: '0 1rem', borderRadius: 0 }}
                  >
                    <option value="OFFICE">사내정상 근무</option>
                    <option value="REMOTE">재택근무</option>
                    <option value="FIELD">외근 / 현장출장</option>
                  </select>
                </div>

                {/* Network Verification Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.15rem 0',
                  borderTop: '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text-primary)' }}>
                    사내망 인증 일치 여부
                  </span>
                  <CustomCheckbox
                    checked={editForm.isCompanyNetwork}
                    onChange={(checked) => setEditForm(prev => ({ ...prev, isCompanyNetwork: checked }))}
                    label={editForm.isCompanyNetwork ? '사내망 일치' : '사외 접속'}
                    size={18}
                    labelStyle={{ fontSize: '15px', fontWeight: 400 }}
                  />
                </div>

                {/* Correction Reason */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 400, margin: 0 }}>
                    보정 사유 / 관리자 메모
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="예: 미처 퇴근 미입력으로 인한 관리자 수동 보정"
                    value={editForm.reason}
                    onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                    style={{ height: '48px', fontSize: '15px', fontWeight: 400, padding: '0 1rem', borderRadius: 0 }}
                  />
                </div>

                {/* Drawer Footer Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1.5rem',
                  marginTop: '0.5rem'
                }}>
                  {selectedAtt.sourceType === 'RECORDED' ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleDeleteAttendance}
                      style={{
                        height: '46px',
                        fontSize: '15px',
                        fontWeight: 400,
                        padding: '0 1.25rem',
                        borderRadius: 0,
                        color: 'var(--text-secondary)'
                      }}
                    >
                      기록 삭제/초기화
                    </button>
                  ) : <div />}

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCloseDetail}
                      style={{
                        height: '46px',
                        fontSize: '15px',
                        fontWeight: 400,
                        padding: '0 1.5rem',
                        borderRadius: 0
                      }}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSaving}
                      style={{
                        height: '46px',
                        fontSize: '15px',
                        fontWeight: 400,
                        padding: '0 1.75rem',
                        borderRadius: 0
                      }}
                    >
                      {isSaving ? '저장 중...' : (selectedAtt.sourceType === 'RECORDED' ? '보정 내용 저장' : '신규 근태 등록')}
                    </button>
                  </div>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
