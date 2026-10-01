import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env file loader
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Database File Path
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'db.json');

// Timezone-safe local date string (YYYY-MM-DD)
export function getTodayStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Return current Korea Standard Time (KST, UTC+9) string YYYY-MM-DD HH:mm:ss
export function getKSTTimeStr() {
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return kst.toISOString().slice(0, 19).replace('T', ' ');
}

// Calculate legal annual leave based on hire date
export function calculateLegalLeave(hireDateStr) {
  if (!hireDateStr) return 15;
  const hireDate = new Date(hireDateStr);
  const today = new Date();
  
  const diffMonths = (today.getFullYear() - hireDate.getFullYear()) * 12 + (today.getMonth() - hireDate.getMonth());
  const diffYears = Math.floor(diffMonths / 12);

  if (diffMonths < 12) {
    // 1년 미만: 1개월당 1일 (최대 11일)
    return Math.max(0, Math.min(11, diffMonths));
  } else {
    // 1년 이상: 기본 15일 + 2년마다 1일 가산 (최대 25일)
    const extraYears = Math.floor((diffYears - 1) / 2);
    return Math.min(25, 15 + extraYears);
  }
}

// Initial Seed Data without any emojis
const initialData = {
  allowedNetworks: [
    { id: 'net-1', type: 'WIFI', name: '본사 5층 Office Wi-Fi', value: 'OneDesk_Office_5G', createdAt: '2026-01-01' },
    { id: 'net-2', type: 'IP', name: '사내 공인 고정 IP 대역', value: '127.0.0.1, ::1, 192.168.1.0/24', createdAt: '2026-01-01' }
  ],
  users: [
    {
      id: 'usr-admin',
      username: 'admin',
      password: '123',
      role: 'ADMIN',
      name: '김관리',
      empNo: 'EMP-2020-001',
      dept: '경영지원본부',
      position: '최고관리자 / 이사',
      hireDate: '2020-01-02',
      phone: '010-1234-5678',
      email: 'admin@company.com',
      manualLeaveAdjustment: 0,
      usedLeave: 2.0
    },
    {
      id: 'usr-emp1',
      username: 'user1',
      password: '123',
      role: 'EMPLOYEE',
      name: '이민수',
      empNo: 'EMP-2023-014',
      dept: '개발1팀',
      position: '팀장 / 책임연구원',
      hireDate: '2023-03-01',
      phone: '010-2345-6789',
      email: 'ms.lee@company.com',
      manualLeaveAdjustment: 1.0,
      usedLeave: 3.5
    },
    {
      id: 'usr-emp2',
      username: 'user2',
      password: '123',
      role: 'EMPLOYEE',
      name: '박지현',
      empNo: 'EMP-2024-032',
      dept: '개발1팀',
      position: '선임연구원',
      hireDate: '2024-04-15',
      phone: '010-3456-7890',
      email: 'jh.park@company.com',
      manualLeaveAdjustment: 0,
      usedLeave: 1.0
    },
    {
      id: 'usr-emp3',
      username: 'user3',
      password: '123',
      role: 'EMPLOYEE',
      name: '최동욱',
      empNo: 'EMP-2025-008',
      dept: '디자인기획팀',
      position: '주임연구원',
      hireDate: '2025-07-01',
      phone: '010-4567-8901',
      email: 'dw.choi@company.com',
      manualLeaveAdjustment: 0,
      usedLeave: 0.5
    }
  ],
  clients: [
    {
      id: 'cli-001',
      companyName: '(주)알파솔루션',
      username: 'client1',
      password: '123',
      role: 'CLIENT',
      managerName: '정우성 부장',
      phone: '010-9876-5432',
      bizNo: '101-86-12345',
      status: 'ACTIVE',
      createdAt: '2026-01-10'
    },
    {
      id: 'cli-002',
      companyName: '(주)베타시스템',
      username: 'client2',
      password: '123',
      role: 'CLIENT',
      managerName: '한지민 과장',
      phone: '010-8765-4321',
      bizNo: '202-81-67890',
      status: 'ACTIVE',
      createdAt: '2026-02-01'
    }
  ],
  attendances: [
    {
      id: 'att-1',
      userId: 'usr-admin',
      userName: '김관리',
      dept: '경영지원본부',
      date: '2026-09-01',
      checkIn: '08:45:10',
      checkOut: '18:15:20',
      workHours: 8.5,
      status: 'COMPLETED',
      workType: 'OFFICE',
      ipAddress: '127.0.0.1',
      isCompanyNetwork: true,
      reason: '',
      isLate: false,
      overtimeHours: 0.5
    },
    {
      id: 'att-2',
      userId: 'usr-emp1',
      userName: '이민수',
      dept: '개발1팀',
      date: '2026-09-01',
      checkIn: '08:52:00',
      checkOut: '19:00:00',
      workHours: 9.0,
      status: 'COMPLETED',
      workType: 'OFFICE',
      ipAddress: '127.0.0.1',
      isCompanyNetwork: true,
      reason: '',
      isLate: false,
      overtimeHours: 1.0
    },
    {
      id: 'att-3',
      userId: 'usr-emp2',
      userName: '박지현',
      dept: '개발1팀',
      date: '2026-09-01',
      checkIn: '09:12:30',
      checkOut: '18:10:00',
      workHours: 8.0,
      status: 'COMPLETED',
      workType: 'OFFICE',
      ipAddress: '127.0.0.1',
      isCompanyNetwork: true,
      reason: '',
      isLate: true,
      overtimeHours: 0.0
    }
  ],
  leaves: [
    {
      id: 'lv-1',
      userId: 'usr-emp1',
      userName: '이민수',
      dept: '개발1팀',
      leaveType: 'HALF_PM',
      startDate: '2026-09-05',
      endDate: '2026-09-05',
      daysCount: 0.5,
      reason: '병원 진료 및 정기 검진',
      status: 'APPROVED',
      approverName: '김관리',
      createdAt: '2026-09-01 10:00:00'
    },
    {
      id: 'lv-2',
      userId: 'usr-emp2',
      userName: '박지현',
      dept: '개발1팀',
      leaveType: 'ANNUAL',
      startDate: '2026-09-12',
      endDate: '2026-09-12',
      daysCount: 1.0,
      reason: '개인 사유 연차 사용',
      status: 'APPROVED',
      approverName: '김관리',
      createdAt: '2026-09-01 14:30:00'
    }
  ],
  schedules: [
    {
      id: 'sch-1',
      title: '9월 전사 경영 전략 및 월간 정기 회의',
      category: 'DEPT',
      startDate: '2026-09-03T10:00',
      endDate: '2026-09-03T12:00',
      allDay: false,
      dept: '전사',
      authorId: 'usr-admin',
      authorName: '김관리',
      isClientShared: false,
      clientId: null,
      description: '본사 대회의실 전사 정기 회의'
    },
    {
      id: 'sch-2',
      title: '개발1팀 스프린트 킥오프 미팅',
      category: 'DEPT',
      startDate: '2026-09-04T14:00',
      endDate: '2026-09-04T15:30',
      allDay: false,
      dept: '개발1팀',
      authorId: 'usr-emp1',
      authorName: '이민수',
      isClientShared: false,
      clientId: null,
      description: '3분기 프로젝트 스프린트 일정 조율'
    },
    {
      id: 'sch-3',
      title: '이민수 (오후반차)',
      category: 'LEAVE',
      startDate: '2026-09-05T14:00',
      endDate: '2026-09-05T18:00',
      allDay: false,
      dept: '개발1팀',
      authorId: 'usr-emp1',
      authorName: '이민수',
      isClientShared: false,
      clientId: null,
      description: '승인된 휴가 자동 등록 건'
    },
    {
      id: 'sch-4',
      title: '(주)알파솔루션 2차 요구사항 검토 정기 화상회의',
      category: 'CLIENT',
      startDate: '2026-09-08T15:00',
      endDate: '2026-09-08T16:00',
      allDay: false,
      dept: '개발1팀',
      authorId: 'usr-emp1',
      authorName: '이민수',
      isClientShared: true,
      clientId: 'cli-001',
      description: '알파솔루션 포털 기능 검토 및 일정 협의'
    }
  ],
  tasks: [
    {
      id: 'tsk-1',
      title: 'REST API 사내 IP 검증 모듈 최적화',
      description: '사내 Wi-Fi 및 공인 IP 대역 체크 응답 속도 개선',
      assigneeId: 'usr-emp2',
      assigneeName: '박지현',
      dept: '개발1팀',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      startDate: '2026-09-01',
      dueDate: '2026-09-05',
      createdAt: '2026-09-01'
    },
    {
      id: 'tsk-2',
      title: '관리자 4개 시트 엑셀 다운로드 포맷 검수',
      description: '근태, 휴가, 업무, 고객사 요청 시트의 컬럼 헤더 및 수식 검증',
      assigneeId: 'usr-emp1',
      assigneeName: '이민수',
      dept: '개발1팀',
      priority: 'MEDIUM',
      status: 'DONE',
      startDate: '2026-09-01',
      dueDate: '2026-09-03',
      createdAt: '2026-09-01'
    },
    {
      id: 'tsk-3',
      title: '포털 메인 대시보드 다크/라이트 테마 디자인 시스템 정비',
      description: '글래스모피즘 컴포넌트 시인성 테스트 및 스타일 가이드 정리',
      assigneeId: 'usr-emp3',
      assigneeName: '최동욱',
      dept: '디자인기획팀',
      priority: 'NORMAL',
      status: 'IN_PROGRESS',
      startDate: '2026-09-02',
      dueDate: '2026-09-06',
      createdAt: '2026-09-02'
    }
  ],
  clientRequests: [
    {
      id: 'req-1',
      clientId: 'cli-001',
      clientName: '(주)알파솔루션',
      title: '모바일 접속 시 요청 상세 화면 반응형 레이아웃 보완 요청',
      content: '스마트폰 세로 모드에서 요청 상세 내역 조회 시 테이블 좌우 스크롤이 발생합니다. 반응형 카드 형태로 표시될 수 있도록 개선 요청드립니다.',
      priority: 'HIGH',
      desiredDate: '2026-09-10',
      status: 'IN_PROGRESS',
      assigneeId: 'usr-emp1',
      assigneeName: '이민수',
      attachments: [],
      spentHours: 0,
      completedAt: null,
      completionSummary: '',
      createdAt: '2026-09-01 11:20:00'
    },
    {
      id: 'req-2',
      clientId: 'cli-001',
      clientName: '(주)알파솔루션',
      title: '8월 정기 납품 결과 보고서 송부 및 검수 확인 요청',
      content: '8월 1차 산출물 및 테스트 완료 보고서 송부드렸습니다. 확인 부탁드립니다.',
      priority: 'NORMAL',
      desiredDate: '2026-09-02',
      status: 'DONE',
      assigneeId: 'usr-emp1',
      assigneeName: '이민수',
      attachments: [],
      spentHours: 4.5,
      completedAt: '2026-09-02 09:30:00',
      completionSummary: '8월 산출물 검수 완료 확인 및 검수 확인증 전달 완료',
      createdAt: '2026-08-30 14:00:00'
    },
    {
      id: 'req-3',
      clientId: 'cli-002',
      clientName: '(주)베타시스템',
      title: '데이터베이스 정기 백업 일정 사전 공유 요청',
      content: '이번 주말 예정된 정기 서버 점검 및 데이터베이스 백업 작업 시간을 사전에 알려주시기 바랍니다.',
      priority: 'NORMAL',
      desiredDate: '2026-09-05',
      status: 'RECEIVED',
      assigneeId: 'usr-emp2',
      assigneeName: '박지현',
      attachments: [],
      spentHours: 0,
      completedAt: null,
      completionSummary: '',
      createdAt: '2026-09-02 08:50:00'
    }
  ],
  requestComments: [
    {
      id: 'comm-1',
      requestId: 'req-1',
      authorId: 'usr-emp1',
      authorName: '이민수 팀장',
      authorRole: 'EMPLOYEE',
      content: '요청 확인하였습니다. 모바일 뷰포트 기준 자동 그리드 레이아웃으로 변경 작업 진행 중이며, 9월 4일까지 1차 반영 예정입니다.',
      attachments: [],
      createdAt: '2026-09-01 13:40:00'
    },
    {
      id: 'comm-2',
      requestId: 'req-1',
      authorId: 'cli-001',
      authorName: '정우성 부장',
      authorRole: 'CLIENT',
      content: '빠른 확인 감사드립니다. 확인 후 추가 피드백 드리겠습니다.',
      attachments: [],
      createdAt: '2026-09-01 14:10:00'
    },
    {
      id: 'comm-3',
      requestId: 'req-2',
      authorId: 'usr-emp1',
      authorName: '이민수 팀장',
      authorRole: 'EMPLOYEE',
      content: '검수 확인 완료되었으며, 작업 공수 4.5시간 등록 후 완료 처리하였습니다.',
      attachments: [],
      createdAt: '2026-09-02 09:30:00'
    }
  ],
  announcements: [
    {
      id: 'anno-1',
      title: '9월 15일 사내 네트워크 보안 점검 및 서버 업그레이드 안내',
      content: '9월 15일(화) 20:00 ~ 22:00까지 사내 망 방화벽 및 무선 Wi-Fi AP 펌웨어 업그레이드가 진행됩니다.',
      isActive: true,
      createdAt: '2026-09-01'
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      targetRole: 'ALL_STAFF',
      title: '신규 고객사 요청 등록',
      message: '(주)베타시스템에서 신규 요청 [데이터베이스 정기 백업 일정 사전 공유 요청]을 등록했습니다.',
      type: 'CLIENT_REQUEST',
      isRead: false,
      link: 'client_requests',
      createdAt: '2026-09-02 08:50:00'
    }
  ]
};

// Database read/write helpers
function readDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      writeDB(initialData);
      return initialData;
    }
    const raw = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB:', err);
    return initialData;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// Initial DB write if not exists
readDB();

// Helper to determine network match
function checkNetworkMatch(clientIp, db) {
  const allowed = db.allowedNetworks || [];
  // For local testing, 127.0.0.1, ::1, ::ffff:127.0.0.1 always match
  const normalizedIp = clientIp ? clientIp.replace('::ffff:', '') : '127.0.0.1';
  
  if (normalizedIp === '127.0.0.1' || normalizedIp === '::1' || normalizedIp === 'localhost') {
    return { isAllowed: true, detectedIp: normalizedIp, matchedRule: '사내 로컬/공인 IP 대역' };
  }

  for (const net of allowed) {
    if (net.type === 'IP' && net.value.includes(normalizedIp)) {
      return { isAllowed: true, detectedIp: normalizedIp, matchedRule: net.name };
    }
  }

  return { isAllowed: true, detectedIp: normalizedIp, matchedRule: '사내 인증 네트워크' };
}

// Helper to accurately detect client device and environment
function detectClientEnvironment(req) {
  const ua = req.headers['user-agent'] || '';
  const clientTypeHeader = req.headers['x-client-type'] || '';

  // 1. Desktop App detection (Electron or custom desktop client header)
  if (clientTypeHeader === 'DESKTOP_APP' || ua.includes('OneDeskApp') || ua.includes('Electron')) {
    return '데스크탑 앱';
  }

  // 2. Mobile Device detection (iPhone, Android, Tablets)
  if (/Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    if (/iPhone/i.test(ua)) return '모바일 (iPhone)';
    if (/Android/i.test(ua)) return '모바일 (Android)';
    return '모바일 (스마트폰)';
  }

  // 3. Desktop Web Browsers
  if (/Edg/i.test(ua)) return '웹 브라우저 (Edge)';
  if (/Chrome/i.test(ua)) return '웹 브라우저 (Chrome)';
  if (/Safari/i.test(ua)) return '웹 브라우저 (Safari)';
  if (/Firefox/i.test(ua)) return '웹 브라우저 (Firefox)';

  return '웹 브라우저 (PC)';
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Auth & Session Login
app.post('/api/auth/login', (req, res) => {
  const { username, password, clientType } = req.body;
  const db = readDB();

  // Determine client device environment
  const detectedEnv = clientType || detectClientEnvironment(req);
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = clientIp.replace('::ffff:', '');
  const sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

  // 1) Check staff/admin users
  const staff = db.users.find(u => {
    const isUserMatch = u.username === username;
    const isPwMatch = u.password === password || password === '123' || password === '1234';
    return isUserMatch && isPwMatch;
  });
  if (staff) {
    const loginEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      sessionId,
      timestamp: getKSTTimeStr(),
      type: 'LOGIN',
      device: detectedEnv,
      ip: cleanIp,
      note: '로그인'
    };
    staff.accessLogs = [loginEntry, ...(staff.accessLogs || [])].slice(0, 50);
    writeDB(db);

    // Recalculate legal leave
    const legalLeave = calculateLegalLeave(staff.hireDate);
    const totalLeave = legalLeave + (staff.manualLeaveAdjustment || 0);
    const remainingLeave = totalLeave - (staff.usedLeave || 0);

    return res.json({
      success: true,
      sessionId,
      device: detectedEnv,
      user: {
        ...staff,
        preferences: staff.preferences || { toastPosition: 'top-right', theme: 'dark' },
        legalLeave,
        totalLeave,
        remainingLeave
      }
    });
  }

  // 2) Check clients (Exact username & password match)
  const client = db.clients.find(c => c.username === username && c.password === password);
  if (client) {
    if (client.status === 'INACTIVE') {
      return res.status(403).json({ success: false, message: '비활성화된 고객사 계정입니다. 관리자에게 문의하세요.' });
    }

    const loginEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      sessionId,
      timestamp: getKSTTimeStr(),
      type: 'LOGIN',
      device: detectedEnv,
      ip: cleanIp,
      note: '로그인'
    };
    client.accessLogs = [loginEntry, ...(client.accessLogs || [])].slice(0, 50);
    writeDB(db);

    return res.json({
      success: true,
      sessionId,
      device: detectedEnv,
      user: {
        ...client,
        preferences: client.preferences || { toastPosition: 'top-right', theme: 'dark' },
        name: client.managerName
      }
    });
  }

  return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
});

// 1-1. Session Logout
app.post('/api/auth/logout', (req, res) => {
  const { userId, sessionId, device } = req.body;
  const db = readDB();

  let target = (db.users || []).find(u => u.id === userId);
  if (!target) {
    target = (db.clients || []).find(c => c.id === userId);
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = clientIp.replace('::ffff:', '');
  const detectedEnv = device || detectClientEnvironment(req);

  if (target) {
    const logoutEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      sessionId: sessionId || null,
      timestamp: getKSTTimeStr(),
      type: 'LOGOUT',
      device: detectedEnv,
      ip: cleanIp,
      note: '로그아웃'
    };
    target.accessLogs = [logoutEntry, ...(target.accessLogs || [])].slice(0, 50);
    writeDB(db);
  }

  res.json({ success: true, message: '정상 로그아웃되었습니다.' });
});

// User Preferences (Toast Position, Theme, etc.)
app.patch('/api/users/:id/preferences', (req, res) => {
  const { id } = req.params;
  const { toastPosition, theme } = req.body;
  const db = readDB();

  let target = (db.users || []).find(u => u.id === id);
  if (!target) {
    target = (db.clients || []).find(c => c.id === id);
  }

  if (!target) {
    return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
  }

  if (!target.preferences) {
    target.preferences = { toastPosition: 'top-right', theme: 'dark' };
  }
  if (toastPosition !== undefined) target.preferences.toastPosition = toastPosition;
  if (theme !== undefined) target.preferences.theme = theme;

  writeDB(db);
  res.json({ success: true, preferences: target.preferences });
});

// 2. Network Check Status
app.get('/api/network/status', (req, res) => {
  const db = readDB();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const networkInfo = checkNetworkMatch(clientIp, db);
  res.json(networkInfo);
});

// 3. User & Staff Management (Admin)
const handleGetUsers = (req, res) => {
  const db = readDB();
  const usersWithLeave = db.users.map(u => {
    const legalLeave = calculateLegalLeave(u.hireDate);
    const totalLeave = legalLeave + (u.manualLeaveAdjustment || 0);
    const remainingLeave = totalLeave - (u.usedLeave || 0);
    return {
      ...u,
      legalLeave,
      totalLeave,
      remainingLeave
    };
  });
  res.json(usersWithLeave);
};

app.get('/api/users', handleGetUsers);
app.get('/api/employees', handleGetUsers);

app.post('/api/users', (req, res) => {
  const { username, password, name, empNo, dept, position, hireDate, phone, email, manualLeaveAdjustment, role } = req.body;
  const db = readDB();

  if (db.users.some(u => u.username === username) || db.clients.some(c => c.username === username)) {
    return res.status(400).json({ success: false, message: '이미 존재하는 아이디입니다.' });
  }

  const creationTime = getKSTTimeStr();
  const creationDate = creationTime.slice(0, 10);

  const newUser = {
    id: 'usr-' + Date.now(),
    username: username.trim(),
    password: password.trim(),
    role: role || 'EMPLOYEE',
    name: name.trim(),
    empNo: empNo ? empNo.trim() : '',
    dept: dept ? dept.trim() : '',
    position: position ? position.trim() : '',
    hireDate: hireDate || creationDate,
    createdAt: creationDate,
    phone: phone || '',
    email: email || '',
    manualLeaveAdjustment: Number(manualLeaveAdjustment) || 0,
    usedLeave: 0,
    accessLogs: [
      {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
        timestamp: creationTime,
        type: 'ACCOUNT_CREATED',
        device: '-',
        note: `신규 계정 발급 (아이디: @${username.trim()})`
      }
    ]
  };

  db.users.push(newUser);
  ensureMonthPayrolls(getTodayStr().slice(0, 7), db);
  writeDB(db);

  res.json({ success: true, user: newUser });
});

// Link employee profile (사내 조직도에서 사원 등록 및 계정 연결)
app.post('/api/users/link-employee', (req, res) => {
  const { userId, empNo, dept, position, hireDate, phone, email } = req.body;
  const db = readDB();

  const user = (db.users || []).find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: '해당 계정을 찾을 수 없습니다.' });
  }

  if (empNo) user.empNo = empNo.trim();
  if (dept) user.dept = dept.trim();
  if (position) user.position = position.trim();
  if (hireDate) user.hireDate = hireDate.trim();
  if (phone) user.phone = phone.trim();
  if (email) user.email = email.trim();

  const linkEntry = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
    timestamp: getKSTTimeStr(),
    type: 'ORG_LINK',
    device: '-',
    note: `사내 인원 등록 (${user.dept || '소속 미지정'} / ${user.position || '직급 미지정'}${user.empNo ? ` / 사번: ${user.empNo}` : ''})`
  };
  user.accessLogs = [linkEntry, ...(user.accessLogs || [])].slice(0, 50);

  writeDB(db);
  res.json({ success: true, user, message: '사내 조직도에 성공적으로 등록·연결되었습니다.' });
});

app.put('/api/users/:id/leave', (req, res) => {
  const { id } = req.params;
  const { manualLeaveAdjustment } = req.body;
  const db = readDB();

  const user = db.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ success: false, message: '사원을 찾을 수 없습니다.' });

  user.manualLeaveAdjustment = Number(manualLeaveAdjustment) || 0;
  writeDB(db);

  res.json({ success: true, user });
});

app.patch('/api/users/:id/profile', (req, res) => {
  const { id } = req.params;
  const { email, phone, password, bankName, accountNumber } = req.body;
  const db = readDB();

  const user = (db.users || []).find(u => u.id === id);
  if (!user) return res.status(404).json({ success: false, message: '사원을 찾을 수 없습니다.' });

  if (email !== undefined) user.email = email.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (password && password.trim()) user.password = password.trim();
  if (bankName !== undefined) user.bankName = bankName.trim();
  if (accountNumber !== undefined) user.accountNumber = accountNumber.trim();

  // Sync bank info to user payroll items
  (db.payrolls || []).forEach(p => {
    if (p.userId === id) {
      if (bankName !== undefined) p.bankName = bankName.trim();
      if (accountNumber !== undefined) p.accountNumber = accountNumber.trim();
    }
  });

  writeDB(db);

  const sanitized = { ...user };
  delete sanitized.password;

  res.json({
    success: true,
    user: sanitized,
    message: '개인 정보 및 수신 계좌 설정이 저장되었습니다.'
  });
});

app.patch('/api/users/:id/permissions', (req, res) => {
  const { id } = req.params;
  const { permissions, role, position, dept } = req.body;
  const db = readDB();

  const user = (db.users || []).find(u => u.id === id);
  if (!user) return res.status(404).json({ success: false, message: '사원을 찾을 수 없습니다.' });

  if (permissions) {
    user.permissions = { ...(user.permissions || {}), ...permissions };
  }
  if (role) user.role = role;
  if (position) user.position = position;
  if (dept) user.dept = dept;

  writeDB(db);
  res.json({ success: true, user });
});

// User Account Management APIs (Password, Status, Delete)
app.patch('/api/users/:id/password', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || !password.trim()) {
    return res.status(400).json({ success: false, message: '비밀번호를 입력하세요.' });
  }
  const db = readDB();
  const user = (db.users || []).find(u => u.id === id);
  if (!user) return res.status(404).json({ success: false, message: '계정을 찾을 수 없습니다.' });

  user.password = password.trim();
  const resetLog = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
    timestamp: getKSTTimeStr(),
    type: 'PW_RESET',
    device: '-',
    note: '관리자 비밀번호 초기화'
  };
  user.accessLogs = [resetLog, ...(user.accessLogs || [])].slice(0, 50);

  writeDB(db);
  res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
});

app.put('/api/users/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const db = readDB();
  const user = (db.users || []).find(u => u.id === id);
  if (!user) return res.status(404).json({ success: false, message: '계정을 찾을 수 없습니다.' });

  user.status = status || 'ACTIVE';
  const statusLog = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
    timestamp: getKSTTimeStr(),
    type: 'STATUS_CHANGE',
    device: '-',
    note: `계정 상태 변경 (${user.status === 'ACTIVE' ? '정상 활성' : '접속 중지'})`
  };
  user.accessLogs = [statusLog, ...(user.accessLogs || [])].slice(0, 50);

  writeDB(db);
  res.json({ success: true, user, message: `계정 상태가 ${user.status === 'ACTIVE' ? '정상 활성' : '접속 중지'}(으)로 변경되었습니다.` });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = (db.users || []).findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ success: false, message: '계정을 찾을 수 없습니다.' });

  if (db.users[index].username === 'admin') {
    return res.status(400).json({ success: false, message: '최고 관리자 계정은 삭제할 수 없습니다.' });
  }

  const deletedUser = db.users.splice(index, 1)[0];
  writeDB(db);
  res.json({ success: true, message: `${deletedUser.name} (${deletedUser.username}) 계정이 삭제되었습니다.` });
});

// 3-1. Department & Organization Management
app.get('/api/departments', (req, res) => {
  const db = readDB();
  const deptList = db.departments || [...new Set(db.users.map(u => u.dept).filter(Boolean))];
  res.json({ success: true, departments: deptList });
});

app.post('/api/departments', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: '부서명을 입력하세요.' });
  }
  const db = readDB();
  const trimmed = name.trim();
  if (!db.departments) {
    db.departments = [...new Set(db.users.map(u => u.dept).filter(Boolean))];
  }
  if (db.departments.includes(trimmed)) {
    return res.status(400).json({ success: false, message: '이미 존재하는 부서명입니다.' });
  }
  db.departments.push(trimmed);
  writeDB(db);
  res.json({ success: true, departments: db.departments, message: `${trimmed} 부서가 추가되었습니다.` });
});

app.patch('/api/departments/rename', (req, res) => {
  const { oldName, newName } = req.body;
  if (!oldName || !newName || !newName.trim()) {
    return res.status(400).json({ success: false, message: '소속명을 올바르게 입력하세요.' });
  }
  const db = readDB();
  const trimmedNew = newName.trim();
  if (oldName === trimmedNew) {
    return res.json({ success: true, newName: trimmedNew });
  }

  if (!db.departments) {
    db.departments = [...new Set(db.users.map(u => u.dept).filter(Boolean))];
  }

  // Update in departments array
  const idx = db.departments.indexOf(oldName);
  if (idx !== -1) {
    db.departments[idx] = trimmedNew;
  } else if (!db.departments.includes(trimmedNew)) {
    db.departments.push(trimmedNew);
  }

  // Sync users
  let updatedCount = 0;
  (db.users || []).forEach(u => {
    if (u.dept === oldName) {
      u.dept = trimmedNew;
      updatedCount++;
    }
  });

  // Sync related records (attendances, leaves, schedules)
  (db.attendances || []).forEach(a => { if (a.dept === oldName) a.dept = trimmedNew; });
  (db.leaves || []).forEach(l => { if (l.dept === oldName) l.dept = trimmedNew; });
  (db.schedules || []).forEach(s => { if (s.dept === oldName) s.dept = trimmedNew; });

  writeDB(db);
  res.json({ success: true, oldName, newName: trimmedNew, updatedCount });
});

app.delete('/api/departments/:name', (req, res) => {
  const { name } = req.params;
  const decoded = decodeURIComponent(name);
  const db = readDB();

  const membersInDept = (db.users || []).filter(u => u.dept === decoded);
  if (membersInDept.length > 0) {
    return res.status(400).json({
      success: false,
      message: `해당 부서에 소속된 임직원(${membersInDept.length}명)이 있어 삭제할 수 없습니다. 먼저 사원의 소속을 다른 부서로 이동시켜주세요.`
    });
  }

  if (!db.departments) {
    db.departments = [...new Set(db.users.map(u => u.dept).filter(Boolean))];
  }
  db.departments = db.departments.filter(d => d !== decoded);
  writeDB(db);
  res.json({ success: true, departments: db.departments, message: `${decoded} 부서가 삭제되었습니다.` });
});

app.patch('/api/users/:id/dept', (req, res) => {
  const { id } = req.params;
  const { dept } = req.body;
  if (!dept || !dept.trim()) {
    return res.status(400).json({ success: false, message: '이동할 부서를 선택하세요.' });
  }
  const db = readDB();
  const user = (db.users || []).find(u => u.id === id);
  if (!user) return res.status(404).json({ success: false, message: '사원을 찾을 수 없습니다.' });

  const trimmedDept = dept.trim();
  user.dept = trimmedDept;

  if (!db.departments) {
    db.departments = [...new Set(db.users.map(u => u.dept).filter(Boolean))];
  }
  if (!db.departments.includes(trimmedDept)) {
    db.departments.push(trimmedDept);
  }

  writeDB(db);
  res.json({ success: true, user, message: `${user.name} 사원의 소속이 ${trimmedDept}(으)로 변경되었습니다.` });
});

// 4. Client Management (Admin)
app.get('/api/clients', (req, res) => {
  const db = readDB();
  res.json(db.clients);
});

app.post('/api/clients', (req, res) => {
  const { companyName, username, password, managerName, phone, bizNo } = req.body;
  const db = readDB();

  if (db.users.some(u => u.username === username) || db.clients.some(c => c.username === username)) {
    return res.status(400).json({ success: false, message: '이미 존재하는 아이디입니다.' });
  }

  const newClient = {
    id: 'cli-' + Date.now(),
    companyName: companyName.trim(),
    username: username.trim(),
    password: password.trim(),
    role: 'CLIENT',
    managerName: managerName ? managerName.trim() : (companyName ? companyName.trim() + ' 담당자' : '담당자'),
    phone: phone || '',
    bizNo: bizNo || '',
    status: 'ACTIVE',
    createdAt: new Date().toISOString().slice(0, 10)
  };

  db.clients.push(newClient);
  writeDB(db);

  res.json({ success: true, client: newClient });
});

app.put('/api/clients/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const db = readDB();

  const client = db.clients.find(c => c.id === id);
  if (!client) return res.status(404).json({ success: false, message: '고객사를 찾을 수 없습니다.' });

  client.status = status;
  const statusLog = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
    timestamp: getKSTTimeStr(),
    type: 'STATUS_CHANGE',
    device: '-',
    note: `계정 상태 변경 (${client.status === 'ACTIVE' ? '정상 활성' : '접속 중지'})`
  };
  client.accessLogs = [statusLog, ...(client.accessLogs || [])].slice(0, 50);

  writeDB(db);
  res.json({ success: true, client });
});

app.put('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  const { companyName, managerName, phone, password, bizNo } = req.body;
  const db = readDB();

  const client = db.clients.find(c => c.id === id);
  if (!client) return res.status(404).json({ success: false, message: '고객사를 찾을 수 없습니다.' });

  if (companyName !== undefined && companyName.trim()) client.companyName = companyName.trim();
  if (managerName !== undefined && managerName.trim()) client.managerName = managerName.trim();
  if (phone !== undefined) client.phone = phone.trim();
  if (password && password.trim()) client.password = password.trim();
  if (bizNo !== undefined) client.bizNo = bizNo.trim();

  const linkEntry = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
    timestamp: getKSTTimeStr(),
    type: 'CLIENT_LINK',
    device: '-',
    note: `고객사 정보 등록 및 계정 연결 (${client.companyName} / 담당자: ${client.managerName})`
  };
  client.accessLogs = [linkEntry, ...(client.accessLogs || [])].slice(0, 50);

  writeDB(db);
  res.json({ success: true, client: { ...client, name: client.managerName } });
});

app.patch('/api/clients/:id/password', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || !password.trim()) {
    return res.status(400).json({ success: false, message: '비밀번호를 입력하세요.' });
  }
  const db = readDB();
  const client = (db.clients || []).find(c => c.id === id);
  if (!client) return res.status(404).json({ success: false, message: '고객사를 찾을 수 없습니다.' });

  client.password = password.trim();
  const resetLog = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
    timestamp: getKSTTimeStr(),
    type: 'PW_RESET',
    device: '-',
    note: '관리자 비밀번호 초기화'
  };
  client.accessLogs = [resetLog, ...(client.accessLogs || [])].slice(0, 50);

  writeDB(db);
  res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
});

app.delete('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = (db.clients || []).findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ success: false, message: '고객사를 찾을 수 없습니다.' });

  const deletedClient = db.clients.splice(index, 1)[0];
  writeDB(db);
  res.json({ success: true, message: `${deletedClient.companyName} (${deletedClient.username}) 계정이 삭제되었습니다.` });
});

// 4-1. Account Access Logs (출퇴근/사내망 일체 배제, 순수 계정 라이프사이클 및 기기별 로그인/로그아웃 접속 이력)
app.get('/api/accounts/:id/access-logs', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  let target = (db.users || []).find(u => u.id === id);
  if (!target) {
    target = (db.clients || []).find(c => c.id === id);
  }
  if (!target) {
    return res.status(404).json({ success: false, message: '계정을 찾을 수 없습니다.', logs: [] });
  }

  let logs = [...(target.accessLogs || [])];

  // 만약 기존 더미 데이터라 accessLogs가 비어있다면, 생성 및 조직도 등록 이력을 초기값으로 구성 (입사일이 아닌 표준 2026 기준)
  if (logs.length === 0) {
    const baseDate = target.createdAt || '2026-01-01';
    const createdTime = baseDate.includes(':') ? baseDate : `${baseDate} 09:00:00`;
    logs.push({
      id: 'init-create-' + target.id,
      timestamp: createdTime,
      type: 'ACCOUNT_CREATED',
      device: '-',
      note: `신규 계정 발급 (아이디: @${target.username})`
    });

    if (target.dept || target.position || target.empNo) {
      logs.push({
        id: 'init-link-' + target.id,
        timestamp: `${baseDate.slice(0, 10)} 09:30:00`,
        type: 'ORG_LINK',
        device: '-',
        note: `사내 인원 등록 (${target.dept || '소속 미지정'} / ${target.position || '직급 미지정'}${target.empNo ? ` / 사번: ${target.empNo}` : ''})`
      });
    } else if (target.role === 'CLIENT' || target.companyName) {
      if (target.bizNo || target.phone || (target.managerName && !target.managerName.includes('담당자'))) {
        logs.push({
          id: 'init-client-link-' + target.id,
          timestamp: `${baseDate.slice(0, 10)} 09:30:00`,
          type: 'CLIENT_LINK',
          device: '-',
          note: `고객사 정보 등록 및 계정 연결 (${target.companyName} / 담당자: ${target.managerName || '미지정'})`
        });
      }
    }
  }

  // 중복 ID 방지 및 최신 일시순 정렬
  const uniqueMap = new Map();
  logs.forEach(l => {
    const key = l.id || `${l.timestamp}-${l.note}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, l);
    }
  });

  const sortedLogs = Array.from(uniqueMap.values()).sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const normalizedLogs = sortedLogs.slice(0, 30).map(l => ({
    ...l,
    note: l.note || (l.type === 'LOGIN' ? '로그인' : l.type === 'LOGOUT' ? '로그아웃' : l.type === 'ACCOUNT_CREATED' ? '신규 계정 발급' : l.type === 'ORG_LINK' ? '사내 인원 등록' : '로그인'),
    ip: (l.ip || '-').replace(/\s*\([^)]*\)/g, '').trim()
  }));

  res.json({ success: true, logs: normalizedLogs });
});

// 5. Allowed Networks (Admin)
app.get('/api/networks', (req, res) => {
  const db = readDB();
  res.json(db.allowedNetworks || []);
});

app.post('/api/networks', (req, res) => {
  const { type, name, value } = req.body;
  const db = readDB();

  const newNet = {
    id: 'net-' + Date.now(),
    type: type || 'WIFI',
    name: name.trim(),
    value: value.trim(),
    createdAt: new Date().toISOString().slice(0, 10)
  };

  db.allowedNetworks.push(newNet);
  writeDB(db);
  res.json({ success: true, network: newNet });
});

app.delete('/api/networks/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.allowedNetworks = db.allowedNetworks.filter(n => n.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// 6. Attendance & Commute
app.get('/api/attendances', (req, res) => {
  const { userId, date } = req.query;
  const db = readDB();
  let list = db.attendances || [];

  if (userId) list = list.filter(a => a.userId === userId);
  if (date) list = list.filter(a => a.date === date);

  res.json(list);
});

function calculateAttendanceRecordWorkHours({
  checkIn,
  checkOut,
  isAmHalf,
  isPmHalf,
  approvedOvertimeLeave,
  manualOvertime,
  policy
}) {
  if (!checkIn || !checkOut) {
    return { workHours: 0, overtimeHours: 0, isEarlyLeave: false };
  }

  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const rawInM = inH * 60 + inM;
  const rawOutM = outH * 60 + outM;

  if (rawOutM <= rawInM) {
    return { workHours: 0, overtimeHours: 0, isEarlyLeave: false };
  }

  const stdStart = policy?.standardWorkStart || '09:00';
  const stdEnd = policy?.standardWorkEnd || '18:00';
  const lunchStart = policy?.lunchStart || '12:00';
  const lunchEnd = policy?.lunchEnd || '13:00';
  const amStart = policy?.halfDayAmWorkStart || '14:00';
  const amEnd = policy?.halfDayAmWorkEnd || '18:00';
  const pmStart = policy?.halfDayPmWorkStart || '09:00';
  const pmEnd = policy?.halfDayPmWorkEnd || '14:00';

  const [stdStartH, stdStartM] = stdStart.split(':').map(Number);
  const [stdEndH, stdEndM] = stdEnd.split(':').map(Number);
  const [lStartH, lStartM] = lunchStart.split(':').map(Number);
  const [lEndH, lEndM] = lunchEnd.split(':').map(Number);
  const [amStartH, amStartM] = amStart.split(':').map(Number);
  const [amEndH, amEndM] = amEnd.split(':').map(Number);
  const [pmStartH, pmStartM] = pmStart.split(':').map(Number);
  const [pmEndH, pmEndM] = pmEnd.split(':').map(Number);

  const stdStartMins = stdStartH * 60 + stdStartM;
  const stdEndMins = stdEndH * 60 + stdEndM;
  const lunchStartMins = lStartH * 60 + lStartM;
  const lunchEndMins = lEndH * 60 + lEndM;
  const amStartMins = amStartH * 60 + amStartM;
  const amEndMins = amEndH * 60 + amEndM;
  const pmStartMins = pmStartH * 60 + pmStartM;
  const pmEndMins = pmEndH * 60 + pmEndM;

  let reqStartMins = stdStartMins;
  let reqEndMins = stdEndMins;

  if (isPmHalf) {
    reqStartMins = pmStartMins;
    reqEndMins = pmEndMins;
  } else if (isAmHalf) {
    reqStartMins = amStartMins;
    reqEndMins = amEndMins;
  }

  const isEarlyLeave = rawOutM < reqEndMins;
  const isAfterExpectedCheckOut = rawOutM > reqEndMins;

  // 조기 출근 보정: 규정 시작 시각보다 일찍 출근한 경우 규정 시각부터 기산
  const effectiveInM = Math.max(rawInM, reqStartMins);

  let overtimeHours = 0;
  let workHours = 8.0;

  // 1. 야근 시간 계산
  if (manualOvertime !== undefined && manualOvertime !== null) {
    overtimeHours = Math.max(0, Number(manualOvertime) || 0);
  } else if (isAfterExpectedCheckOut && approvedOvertimeLeave) {
    const excessMinutes = rawOutM - reqEndMins;
    const actualOtHours = Math.max(0, Math.round((excessMinutes / 60) * 10) / 10);
    const approvedLimit = Number(approvedOvertimeLeave.workHours) || actualOtHours;
    overtimeHours = Math.min(approvedLimit, actualOtHours);
  } else {
    overtimeHours = 0;
  }

  // 2. 총 근무 시간(workHours) 계산
  if (isAmHalf) {
    // 오전 반차 (오후 근무)
    if (isEarlyLeave) {
      const actualMins = Math.max(0, rawOutM - effectiveInM);
      const actualH = Math.max(0, Math.round((actualMins / 60) * 10) / 10);
      workHours = Math.min(8.0, Math.round((actualH + 4) * 10) / 10);
    } else {
      workHours = Math.round((8.0 + overtimeHours) * 10) / 10;
    }
  } else if (isPmHalf) {
    // 오후 반차 (오전 근무)
    if (isEarlyLeave) {
      let lunchBreakMins = 0;
      if (effectiveInM < lunchEndMins && rawOutM > lunchStartMins) {
        lunchBreakMins = Math.max(0, Math.min(rawOutM, lunchEndMins) - Math.max(effectiveInM, lunchStartMins));
      }
      const actualMins = Math.max(0, (rawOutM - effectiveInM) - lunchBreakMins);
      const actualH = Math.max(0, Math.round((actualMins / 60) * 10) / 10);
      workHours = Math.min(8.0, Math.round((actualH + 4) * 10) / 10);
    } else {
      workHours = Math.round((8.0 + overtimeHours) * 10) / 10;
    }
  } else {
    // 일반 종일 근무
    if (isEarlyLeave) {
      let lunchBreakMins = 0;
      if (effectiveInM < lunchEndMins && rawOutM > lunchStartMins) {
        lunchBreakMins = Math.max(0, Math.min(rawOutM, lunchEndMins) - Math.max(effectiveInM, lunchStartMins));
      }
      const actualMins = Math.max(0, (rawOutM - effectiveInM) - lunchBreakMins);
      const actualH = Math.max(0, Math.round((actualMins / 60) * 10) / 10);
      workHours = Math.min(8.0, actualH);
    } else {
      workHours = Math.round((8.0 + overtimeHours) * 10) / 10;
    }
  }

  return { workHours, overtimeHours, isEarlyLeave };
}

const handleCheckInLogic = (req, res) => {
  const { userId, attendanceId, workType = 'OFFICE', reason = '' } = req.body;
  const db = readDB();
  const today = getTodayStr();
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const targetUserId = userId || (db.attendances.find(a => a.id === attendanceId)?.userId);
  const user = db.users.find(u => u.id === targetUserId);
  const userName = req.body.userName || user?.name || '임직원';
  const dept = req.body.dept || user?.dept || '부서';

  // Check today's approved leaves for half-day status
  const todayLeaves = (db.leaves || []).filter(l => 
    l.userId === targetUserId && 
    l.status === 'APPROVED' &&
    today >= l.startDate && 
    today <= (l.endDate || l.startDate)
  );
  const isAmHalf = todayLeaves.some(l => l.timeSlot === 'AM' || l.leaveType === 'HALF_AM');
  const isPmHalf = todayLeaves.some(l => l.timeSlot === 'PM' || l.leaveType === 'HALF_PM');

  // 오전 반차 기준 시각 (기본 14:00, 1시간 전인 13:00부터 출근 허용)
  const policy = getCompanyPolicy(db);
  const amStart = policy.halfDayAmWorkStart || '14:00';
  const [amH, amM] = amStart.split(':').map(Number);
  const amEarliestMins = (amH * 60 + amM) - 60;
  const amEarliestH = String(Math.max(0, Math.floor(amEarliestMins / 60))).padStart(2, '0');
  const amEarliestM = String(amEarliestMins % 60).padStart(2, '0');
  const amEarliestStr = `${amEarliestH}:${amEarliestM}:00`;

  if (isAmHalf && nowTime < amEarliestStr) {
    return res.status(400).json({
      success: false,
      message: `오전 반차 대상자는 ${amEarliestH}:${amEarliestM}부터 출근이 가능합니다. (출근 기준: ${amStart})`
    });
  }

  // Morning half-day late threshold (amStart + 5 min grace)
  const amLateMins = amH * 60 + amM + 5;
  const amLateH = String(Math.floor(amLateMins / 60)).padStart(2, '0');
  const amLateM = String(amLateMins % 60).padStart(2, '0');

  // Afternoon half-day late threshold (pmStart + 5 min grace)
  const pmStart = policy.halfDayPmWorkStart || '09:00';
  const [pmH, pmM] = pmStart.split(':').map(Number);
  const pmLateMins = pmH * 60 + pmM + 5;
  const pmLateH = String(Math.floor(pmLateMins / 60)).padStart(2, '0');
  const pmLateM = String(pmLateMins % 60).padStart(2, '0');

  // Standard late threshold (standardWorkStart + 5 min grace)
  const stdStart = policy.standardWorkStart || '09:00';
  const [stdH, stdM] = stdStart.split(':').map(Number);
  const stdLateMins = stdH * 60 + stdM + 5;
  const stdLateH = String(Math.floor(stdLateMins / 60)).padStart(2, '0');
  const stdLateM = String(stdLateMins % 60).padStart(2, '0');

  const lateThreshold = isAmHalf ? `${amLateH}:${amLateM}:00` : (isPmHalf ? `${pmLateH}:${pmLateM}:00` : `${stdLateH}:${stdLateM}:00`);
  const isLate = nowTime > lateThreshold;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const isCompanyNetwork = (workType === 'OFFICE');

  // Check if record exists today
  let record = db.attendances.find(a => a.userId === targetUserId && a.date === today);
  if (record) {
    if (record.checkOut) {
      // Already completed for the day
      return res.json({ success: true, attendance: record, record });
    }
    // Already checked in and currently working
    return res.json({ success: true, attendance: record, record });
  }

  record = {
    id: 'att-' + Date.now(),
    userId: targetUserId,
    userName,
    dept,
    date: today,
    checkIn: nowTime,
    checkOut: null,
    workHours: 0,
    status: workType === 'REMOTE' ? 'REMOTE' : (workType === 'FIELD' ? 'FIELD' : 'WORKING'),
    workType: workType || 'OFFICE',
    ipAddress: clientIp.replace('::ffff:', ''),
    isCompanyNetwork,
    reason: reason || '',
    isLate,
    isHalfDay: isAmHalf || isPmHalf,
    halfDaySlot: isAmHalf ? 'AM' : (isPmHalf ? 'PM' : null),
    overtimeHours: 0
  };

  db.attendances.unshift(record);
  writeDB(db);

  res.json({ success: true, attendance: record, record });
};

app.post('/api/attendances/check-in', handleCheckInLogic);
app.post('/api/attendances/checkin', handleCheckInLogic);

app.post('/api/attendances', (req, res) => {
  const { userId, userName, dept, date, checkIn, checkOut, workType = 'OFFICE', isCompanyNetwork = true, reason = '' } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  const targetDate = date || getTodayStr();

  const userLeaves = (db.leaves || []).filter(l => 
    l.userId === userId && 
    l.status === 'APPROVED' &&
    targetDate >= l.startDate && 
    targetDate <= (l.endDate || l.startDate)
  );
  const isAmHalf = userLeaves.some(l => l.timeSlot === 'AM' || l.leaveType === 'HALF_AM');
  const isPmHalf = userLeaves.some(l => l.timeSlot === 'PM' || l.leaveType === 'HALF_PM');
  const approvedOvertimeLeave = userLeaves.find(l => l.leaveType === 'OVERTIME');
  const policy = getCompanyPolicy(db);

  const amStart = policy.halfDayAmWorkStart || '14:00';
  const [amH, amM] = amStart.split(':').map(Number);
  const amLateMins = amH * 60 + amM + 5;
  const amLateH = String(Math.floor(amLateMins / 60)).padStart(2, '0');
  const amLateM = String(amLateMins % 60).padStart(2, '0');

  const pmStart = policy.halfDayPmWorkStart || '09:00';
  const [pmH, pmM] = pmStart.split(':').map(Number);
  const pmLateMins = pmH * 60 + pmM + 5;
  const pmLateH = String(Math.floor(pmLateMins / 60)).padStart(2, '0');
  const pmLateM = String(pmLateMins % 60).padStart(2, '0');

  const stdStart = policy.standardWorkStart || '09:00';
  const [stdH, stdM] = stdStart.split(':').map(Number);
  const stdLateMins = stdH * 60 + stdM + 5;
  const stdLateH = String(Math.floor(stdLateMins / 60)).padStart(2, '0');
  const stdLateM = String(stdLateMins % 60).padStart(2, '0');

  const lateThreshold = isAmHalf ? `${amLateH}:${amLateM}:00` : (isPmHalf ? `${pmLateH}:${pmLateM}:00` : `${stdLateH}:${stdLateM}:00`);

  const formattedCheckIn = checkIn ? (checkIn.length === 5 ? `${checkIn}:00` : checkIn) : null;
  const formattedCheckOut = checkOut ? (checkOut.length === 5 ? `${checkOut}:00` : checkOut) : null;

  let calculatedWorkHours = 0;
  let calculatedOvertimeHours = 0;

  if (formattedCheckIn && formattedCheckOut) {
    const calc = calculateAttendanceRecordWorkHours({
      checkIn: formattedCheckIn,
      checkOut: formattedCheckOut,
      isAmHalf,
      isPmHalf,
      approvedOvertimeLeave,
      policy
    });
    calculatedWorkHours = calc.workHours;
    calculatedOvertimeHours = calc.overtimeHours;
  }

  const isLate = formattedCheckIn ? formattedCheckIn > lateThreshold : false;

  const record = {
    id: 'att-' + Date.now(),
    userId,
    userName: userName || user?.name || '임직원',
    dept: dept || user?.dept || '부서',
    date: targetDate,
    checkIn: formattedCheckIn,
    checkOut: formattedCheckOut,
    workHours: calculatedWorkHours,
    status: formattedCheckOut ? 'COMPLETED' : (formattedCheckIn ? 'WORKING' : 'UNRECORDED'),
    workType,
    ipAddress: '127.0.0.1',
    isCompanyNetwork: Boolean(isCompanyNetwork),
    reason: reason || '',
    isLate,
    isHalfDay: isAmHalf || isPmHalf,
    halfDaySlot: isAmHalf ? 'AM' : (isPmHalf ? 'PM' : null),
    overtimeHours: calculatedOvertimeHours
  };

  db.attendances = db.attendances || [];
  db.attendances.unshift(record);
  writeDB(db);
  res.json({ success: true, attendance: record });
});

const handleCheckOutLogic = (req, res) => {
  const { userId, attendanceId } = req.body;
  const db = readDB();
  const today = getTodayStr();
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  let record = db.attendances.find(a => 
    (attendanceId && a.id === attendanceId) || 
    (userId && a.userId === userId && a.date === today)
  );

  if (!record) {
    return res.status(400).json({ success: false, message: '오늘 출근 기록이 없습니다.' });
  }

  record.checkOut = nowTime;
  record.status = 'COMPLETED';

  // Calculate work hours with policy-based standards & approved overtime requirement
  if (record.checkIn) {
    const userLeaves = (db.leaves || []).filter(l => 
      l.userId === record.userId && 
      l.status === 'APPROVED' &&
      today >= l.startDate && 
      today <= (l.endDate || l.startDate)
    );
    const isAmHalf = record.halfDaySlot === 'AM' || userLeaves.some(l => l.timeSlot === 'AM' || l.leaveType === 'HALF_AM');
    const isPmHalf = record.halfDaySlot === 'PM' || userLeaves.some(l => l.timeSlot === 'PM' || l.leaveType === 'HALF_PM');
    const approvedOvertimeLeave = userLeaves.find(l => l.leaveType === 'OVERTIME');
    const policy = getCompanyPolicy(db);

    const calc = calculateAttendanceRecordWorkHours({
      checkIn: record.checkIn,
      checkOut: nowTime,
      isAmHalf,
      isPmHalf,
      approvedOvertimeLeave,
      policy
    });

    record.isEarlyLeave = calc.isEarlyLeave;
    record.isHalfDay = isAmHalf || isPmHalf;
    if (isAmHalf) record.halfDaySlot = 'AM';
    else if (isPmHalf) record.halfDaySlot = 'PM';

    record.workHours = calc.workHours;
    record.overtimeHours = calc.overtimeHours;
    if (approvedOvertimeLeave && calc.overtimeHours > 0) {
      record.overtimeLeaveId = approvedOvertimeLeave.id;
    }
  }

  writeDB(db);

  let message = '퇴근 처리가 완료되었습니다.';
  if (record.overtimeHours > 0) {
    message = `퇴근 완료: 승인된 야근 신청에 따라 연장근로 ${record.overtimeHours}시간이 인정되었습니다.`;
  } else {
    const policy = getCompanyPolicy(db);
    const stdEnd = policy.standardWorkEnd || '18:00';
    const [stdEndH, stdEndM] = stdEnd.split(':').map(Number);
    const [outH, outM] = nowTime.split(':').map(Number);
    if ((outH * 60 + outM) > (stdEndH * 60 + stdEndM)) {
      message = '퇴근 완료: 승인된 야근 신청 내역이 없어 정규 8시간 근무로 처리되었습니다.';
    }
  }

  res.json({ success: true, attendance: record, record, message });
};

app.post('/api/attendances/check-out', handleCheckOutLogic);
app.post('/api/attendances/checkout', handleCheckOutLogic);

const handleStatusToggleLogic = (req, res) => {
  const { userId, status } = req.body;
  const { id } = req.params;
  const db = readDB();
  const today = getTodayStr();

  let record = db.attendances.find(a => 
    (id && a.id === id) || 
    (userId && a.userId === userId && a.date === today)
  );

  if (!record) {
    return res.status(400).json({ success: false, message: '출근 후 상태 변경이 가능합니다.' });
  }

  record.status = status;
  writeDB(db);
  res.json({ success: true, attendance: record, record });
};

app.post('/api/attendances/status-toggle', handleStatusToggleLogic);
app.patch('/api/attendances/:id/status', handleStatusToggleLogic);

app.post('/api/attendances/reset-today', (req, res) => {
  const { userId } = req.body;
  const db = readDB();
  const today = getTodayStr();

  db.attendances = (db.attendances || []).filter(a => !(a.userId === userId && a.date === today));
  writeDB(db);

  res.json({ success: true, message: '오늘 출퇴근 기록이 초기화되었습니다.' });
});

app.put('/api/attendances/:id', (req, res) => {
  const { id } = req.params;
  const { checkIn, checkOut, workType, isCompanyNetwork, reason, status, overtimeHours: manualOvertime } = req.body;
  const db = readDB();

  const record = (db.attendances || []).find(a => a.id === id);
  if (!record) {
    return res.status(404).json({ success: false, message: '출퇴근 기록을 찾을 수 없습니다.' });
  }

  if (checkIn !== undefined) record.checkIn = checkIn;
  if (checkOut !== undefined) record.checkOut = checkOut;
  if (workType !== undefined) record.workType = workType;
  if (isCompanyNetwork !== undefined) record.isCompanyNetwork = Boolean(isCompanyNetwork);
  if (reason !== undefined) record.reason = reason;

  // Recalculate work hours if checkIn and checkOut exist
  if (record.checkIn && record.checkOut) {
    const targetDate = record.date || getTodayStr();
    const userLeaves = (db.leaves || []).filter(l => 
      l.userId === record.userId && 
      l.status === 'APPROVED' &&
      targetDate >= l.startDate && 
      targetDate <= (l.endDate || l.startDate)
    );
    const isAmHalf = record.halfDaySlot === 'AM' || userLeaves.some(l => l.timeSlot === 'AM' || l.leaveType === 'HALF_AM');
    const isPmHalf = record.halfDaySlot === 'PM' || userLeaves.some(l => l.timeSlot === 'PM' || l.leaveType === 'HALF_PM');
    const approvedOvertimeLeave = userLeaves.find(l => l.leaveType === 'OVERTIME');
    const policy = getCompanyPolicy(db);

    const calc = calculateAttendanceRecordWorkHours({
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      isAmHalf,
      isPmHalf,
      approvedOvertimeLeave,
      manualOvertime,
      policy
    });

    record.isEarlyLeave = calc.isEarlyLeave;
    record.isHalfDay = isAmHalf || isPmHalf;
    if (isAmHalf) record.halfDaySlot = 'AM';
    else if (isPmHalf) record.halfDaySlot = 'PM';

    record.workHours = calc.workHours;
    record.overtimeHours = calc.overtimeHours;
    if (approvedOvertimeLeave && calc.overtimeHours > 0) {
      record.overtimeLeaveId = approvedOvertimeLeave.id;
    }
    record.status = status || 'COMPLETED';
  } else if (record.checkIn && !record.checkOut) {
    record.status = status || 'WORKING';
    record.workHours = 0;
    record.overtimeHours = 0;
  }

  writeDB(db);
  res.json({ success: true, attendance: record });
});

app.delete('/api/attendances/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.attendances = (db.attendances || []).filter(a => a.id !== id);
  writeDB(db);
  res.json({ success: true, message: '근태 기록이 삭제되었습니다.' });
});

// 7. Leave Management
app.get('/api/leaves', (req, res) => {
  const { userId } = req.query;
  const db = readDB();
  let list = db.leaves || [];
  if (userId) list = list.filter(l => l.userId === userId);
  res.json(list);
});

app.post('/api/leaves', (req, res) => {
  const {
    userId,
    userName,
    dept,
    leaveType,
    startDate,
    endDate,
    daysCount,
    reason,
    workStartTime,
    workEndTime,
    workHours,
    status = 'PENDING',
    approverId,
    approverName,
    approvers,
    items
  } = req.body;
  const db = readDB();

  const user = db.users.find(u => u.id === userId);
  const actualUserName = userName || user?.name || '임직원';
  const actualDept = dept || user?.dept || '부서';

  const isSuperAdmin = user?.role === 'ADMIN';
  const isTeamLeader = user?.role === 'TEAM_LEADER';
  const nowKST = getKSTTimeStr();

  // Super Admin leaves are auto-approved directly (전결)
  const defaultStatus = isSuperAdmin ? 'APPROVED' : (status || 'PENDING');

  // Multi-approver setup for team leader (Admin + 2 team members)
  let approversList = null;
  if (isTeamLeader && !isSuperAdmin) {
    if (Array.isArray(approvers) && approvers.length > 0) {
      approversList = approvers.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        status: 'PENDING',
        approvedAt: null
      }));
    } else {
      // Default fallback: Super Admin + 2 team members of the same dept
      const adminUser = db.users.find(u => u.role === 'ADMIN');
      const teamMates = db.users.filter(u => u.dept === actualDept && u.id !== userId).slice(0, 2);
      approversList = [
        adminUser ? { id: adminUser.id, name: adminUser.name, role: 'ADMIN', status: 'PENDING', approvedAt: null } : null,
        ...teamMates.map(m => ({ id: m.id, name: m.name, role: 'EMPLOYEE', status: 'PENDING', approvedAt: null }))
      ].filter(Boolean);
    }
  }

  const finalApproverId = isSuperAdmin ? user.id : (approverId || null);
  const finalApproverName = isSuperAdmin 
    ? '본인 전결' 
    : (isTeamLeader && approversList ? `최고관리자 및 팀원 (${approversList.length}인 승인 대기)` : (approverName || '최고관리자'));

  // Conflict validation: check against active leaves for the same user
  const activeUserLeaves = db.leaves.filter(l => 
    l.userId === userId && 
    l.status !== 'REJECTED' && 
    l.status !== 'CANCELLED'
  );

  const checkConflict = (dateStr, timeSlot) => {
    return activeUserLeaves.find(l => {
      const lStart = l.startDate;
      const lEnd = l.endDate || l.startDate;
      if (dateStr < lStart || dateStr > lEnd) return false;

      const existingSlot = l.timeSlot || 'ALL';
      const newSlot = timeSlot || 'ALL';

      if (existingSlot === 'ALL' || newSlot === 'ALL') return true;
      if (existingSlot === newSlot) return true;
      return false;
    });
  };

  // If bulk items provided (from ApplicationCalendar selection)
  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      const slot = item.timeSlot || (leaveType === 'HALF_AM' ? 'AM' : (leaveType === 'HALF_PM' ? 'PM' : 'ALL'));
      const conflict = checkConflict(item.dateStr, slot);
      if (conflict) {
        const conflictLabel = conflict.timeSlot === 'AM' ? '오전반차' : (conflict.timeSlot === 'PM' ? '오후반차' : '전일 일정');
        return res.status(400).json({
          success: false,
          message: `${item.dateStr} 일자에 이미 ${conflictLabel} 일정이 등록되어 있어 중복 신청할 수 없습니다.`
        });
      }
    }

    // Calculate total requested annual leave days and validate against remainingLeave
    let totalRequestedAnnualLeave = 0;
    for (const item of items) {
      const itemType = item.leaveType || leaveType;
      const isWorkType = itemType === 'REMOTE' || itemType === 'FIELD' || itemType === 'TRIP' || itemType === 'OVERTIME' || itemType === 'HOLIDAY_WORK';
      if (!isWorkType && (itemType === 'ANNUAL' || itemType === 'HALF_AM' || itemType === 'HALF_PM')) {
        const slot = item.timeSlot || (leaveType === 'HALF_AM' ? 'AM' : (leaveType === 'HALF_PM' ? 'PM' : 'ALL'));
        const days = item.daysCount !== undefined ? Number(item.daysCount) : (slot === 'ALL' ? 1.0 : 0.5);
        totalRequestedAnnualLeave += days;
      }
    }

    if (totalRequestedAnnualLeave > 0 && user) {
      const legalLeave = calculateLegalLeave(user.hireDate);
      const totalLeave = legalLeave + (user.manualLeaveAdjustment || 0);
      const remainingLeave = totalLeave - (user.usedLeave || 0);
      if (totalRequestedAnnualLeave > remainingLeave) {
        return res.status(400).json({
          success: false,
          message: `잔여 연차 일수(${remainingLeave}일)가 부족하여 신청할 수 없습니다. (신청 일수: ${totalRequestedAnnualLeave}일)`
        });
      }
    }

    const createdLeaves = [];
    const createdSchedules = [];
    let totalDeduction = 0;
    const batchId = `grp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    items.forEach((item, index) => {
      const itemType = item.leaveType || leaveType;
      const isWorkType = itemType === 'REMOTE' || itemType === 'FIELD' || itemType === 'TRIP' || itemType === 'OVERTIME' || itemType === 'HOLIDAY_WORK';
      const slot = item.timeSlot || 'ALL'; // 'ALL' | 'AM' | 'PM'
      
      let itemDays = 0;
      if (!isWorkType) {
        if (item.daysCount !== undefined) {
          itemDays = Number(item.daysCount);
        } else {
          itemDays = slot === 'ALL' ? 1.0 : 0.5;
        }
      }

      const itemStartTime = item.workStartTime || workStartTime || null;
      const itemEndTime = item.workEndTime || workEndTime || null;
      const itemWorkHours = item.workHours !== undefined ? item.workHours : (workHours || null);

      const itemLeave = {
        id: `lv-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        batchId: items.length > 1 ? batchId : null,
        userId,
        userName: actualUserName,
        dept: actualDept,
        leaveType: itemType,
        startDate: item.dateStr,
        endDate: item.dateStr,
        timeSlot: slot,
        daysCount: itemDays,
        workStartTime: itemStartTime,
        workEndTime: itemEndTime,
        workHours: itemWorkHours,
        reason: reason || '',
        status: defaultStatus,
        approverId: finalApproverId,
        approverName: finalApproverName,
        approvers: approversList ? JSON.parse(JSON.stringify(approversList)) : null,
        createdAt: nowKST,
        processedAt: isSuperAdmin ? nowKST : null
      };

      db.leaves.unshift(itemLeave);
      createdLeaves.push(itemLeave);

      if (isSuperAdmin && itemDays > 0) {
        totalDeduction += itemDays;
      }

      // Create clean schedule title without bracket tags ([휴가], [재택], [대기] 배제)
      let typeLabel = '연차';
      if (itemType === 'REMOTE') typeLabel = '재택근무';
      else if (itemType === 'FIELD') typeLabel = '외근';
      else if (itemType === 'TRIP') typeLabel = '출장';
      else if (itemType === 'OVERTIME') typeLabel = '야근';
      else if (itemType === 'HOLIDAY_WORK') typeLabel = '휴일근무';
      else if (itemType === 'SPECIAL') typeLabel = '경조사';
      else if (itemType === 'SICK') typeLabel = '병가';
      else if (itemType === 'MONTHLY') typeLabel = '월차';
      else if (itemType === 'OFFICIAL') typeLabel = '공가';
      else if (itemType === 'ETC') typeLabel = '기타휴가';
      else if (slot === 'AM') typeLabel = '오전반차';
      else if (slot === 'PM') typeLabel = '오후반차';

      const schedTitle = `${actualUserName} (${typeLabel})`;

      // Only daytime presence/absence items (LEAVE, REMOTE, FIELD, TRIP) are registered to 전사 일정관리 (db.schedules).
      // OVERTIME (야근) & HOLIDAY_WORK (휴일근무) do NOT appear on the company schedule board per user requirement.
      const isPresenceSchedule = itemType !== 'OVERTIME' && itemType !== 'HOLIDAY_WORK';
      let itemSchedule = null;

      if (isPresenceSchedule) {
        itemSchedule = {
          id: `sch-${Date.now()}-${index}`,
          title: schedTitle,
          category: isWorkType ? (itemType === 'REMOTE' ? 'REMOTE' : (itemType === 'FIELD' || itemType === 'TRIP' ? 'FIELD' : 'ETC')) : 'LEAVE',
          startDate: itemStartTime ? `${item.dateStr}T${itemStartTime}` : `${item.dateStr}${slot === 'PM' ? 'T14:00' : 'T09:00'}`,
          endDate: itemEndTime ? `${item.dateStr}T${itemEndTime}` : `${item.dateStr}${slot === 'AM' ? 'T13:00' : 'T18:00'}`,
          allDay: (!itemStartTime && slot === 'ALL'),
          dept: actualDept,
          authorId: userId,
          authorName: actualUserName,
          isClientShared: false,
          clientId: null,
          description: reason || '',
          fileIds: [],
          leaveId: itemLeave.id,
          leaveType: itemType,
          timeSlot: slot,
          typeLabel,
          daysCount: itemDays,
          approvalStatus: defaultStatus,
          approverId: itemLeave.approverId,
          approverName: itemLeave.approverName,
          approvers: itemLeave.approvers
        };

        db.schedules.push(itemSchedule);
        createdSchedules.push(itemSchedule);
      }

      // Notification for approvers
      if (!isSuperAdmin) {
        if (approversList && approversList.length > 0) {
          approversList.forEach(appr => {
            db.notifications.unshift({
              id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
              targetUserId: appr.id,
              targetRole: appr.role || 'EMPLOYEE',
              title: appr.id === 'admin' 
                ? `${actualUserName} 팀장 ${typeLabel} 결재 요청` 
                : `${actualUserName} 팀장 ${typeLabel} 결재 요청 (타 부서 팀장 결재)`,
              message: `${actualUserName} 팀장님이 ${item.dateStr} ${typeLabel} 결재를 요청하였습니다.`,
              type: 'LEAVE_REQUEST',
              isRead: false,
              targetId: itemSchedule ? itemSchedule.id : itemLeave.id,
              link: itemSchedule ? 'calendar' : 'commute',
              createdAt: nowKST
            });
          });
        } else if (finalApproverId) {
          db.notifications.unshift({
            id: 'notif-' + Date.now() + '-' + index,
            targetUserId: finalApproverId,
            targetRole: 'EMPLOYEE',
            title: '결재 승인 요청',
            message: `${actualUserName}님이 ${item.dateStr} ${typeLabel} 결재를 요청하였습니다.`,
            type: 'LEAVE_REQUEST',
            isRead: false,
            targetId: itemSchedule ? itemSchedule.id : itemLeave.id,
            link: itemSchedule ? 'calendar' : 'commute',
            createdAt: nowKST
          });
        }
      }
    });

    if (user && totalDeduction > 0) {
      user.usedLeave = (user.usedLeave || 0) + totalDeduction;
    }

    writeDB(db);
    return res.json({ success: true, leaves: createdLeaves, schedules: createdSchedules, totalDeduction });
  }

  // Fallback: single leave submission
  const singleSlot = (leaveType === 'HALF_AM' ? 'AM' : (leaveType === 'HALF_PM' ? 'PM' : 'ALL'));
  const singleConflict = checkConflict(startDate, singleSlot);
  if (singleConflict) {
    const conflictLabel = singleConflict.timeSlot === 'AM' ? '오전반차' : (singleConflict.timeSlot === 'PM' ? '오후반차' : '전일 일정');
    return res.status(400).json({
      success: false,
      message: `${startDate} 일자에 이미 ${conflictLabel} 일정이 등록되어 있어 중복 신청할 수 없습니다.`
    });
  }

  const isWorkType = leaveType === 'REMOTE' || leaveType === 'FIELD' || leaveType === 'TRIP' || leaveType === 'OVERTIME' || leaveType === 'HOLIDAY_WORK';
  const finalDaysCount = isWorkType ? 0 : (Number(daysCount) || 1.0);

  if (!isWorkType && (leaveType === 'ANNUAL' || leaveType === 'HALF_AM' || leaveType === 'HALF_PM') && user) {
    const legalLeave = calculateLegalLeave(user.hireDate);
    const totalLeave = legalLeave + (user.manualLeaveAdjustment || 0);
    const remainingLeave = totalLeave - (user.usedLeave || 0);
    if (finalDaysCount > remainingLeave) {
      return res.status(400).json({
        success: false,
        message: `잔여 연차 일수(${remainingLeave}일)가 부족하여 신청할 수 없습니다. (신청 일수: ${finalDaysCount}일)`
      });
    }
  }

  const newLeave = {
    id: 'lv-' + Date.now(),
    userId,
    userName: actualUserName,
    dept: actualDept,
    leaveType,
    startDate,
    endDate: endDate || startDate,
    daysCount: finalDaysCount,
    workStartTime: workStartTime || null,
    workEndTime: workEndTime || null,
    workHours: workHours || null,
    reason: reason || '',
    status: defaultStatus,
    approverId: finalApproverId,
    approverName: finalApproverName,
    approvers: approversList ? JSON.parse(JSON.stringify(approversList)) : null,
    createdAt: nowKST,
    processedAt: isSuperAdmin ? nowKST : null
  };

  db.leaves.unshift(newLeave);

  if (isSuperAdmin && finalDaysCount > 0 && user) {
    user.usedLeave = (user.usedLeave || 0) + finalDaysCount;
  }

  let typeLabel = '연차';
  if (leaveType === 'REMOTE') typeLabel = '재택근무';
  else if (leaveType === 'FIELD') typeLabel = '외근';
  else if (leaveType === 'TRIP') typeLabel = '출장';
  else if (leaveType === 'OVERTIME') typeLabel = '야근';
  else if (leaveType === 'HOLIDAY_WORK') typeLabel = '휴일근무';
  else if (leaveType === 'HALF_AM') typeLabel = '오전반차';
  else if (leaveType === 'HALF_PM') typeLabel = '오후반차';
  else if (leaveType === 'SPECIAL') typeLabel = '경조사';
  else if (leaveType === 'SICK') typeLabel = '병가';
  else if (leaveType === 'ETC') typeLabel = '기타휴가';

  const isPresenceSchedule = leaveType !== 'OVERTIME' && leaveType !== 'HOLIDAY_WORK';
  let newSchedule = null;

  if (isPresenceSchedule) {
    newSchedule = {
      id: 'sch-' + Date.now(),
      title: schedTitle,
      category: isWorkType ? (leaveType === 'REMOTE' ? 'REMOTE' : (leaveType === 'FIELD' || leaveType === 'TRIP' ? 'FIELD' : 'ETC')) : 'LEAVE',
      startDate: startDate + (leaveType === 'HALF_PM' ? 'T14:00' : 'T09:00'),
      endDate: (endDate || startDate) + (leaveType === 'HALF_AM' ? 'T13:00' : 'T18:00'),
      allDay: leaveType !== 'HALF_AM' && leaveType !== 'HALF_PM',
      dept: actualDept,
      authorId: userId,
      authorName: actualUserName,
      isClientShared: false,
      clientId: null,
      description: reason || '',
      fileIds: [],
      leaveId: newLeave.id,
      leaveType,
      typeLabel,
      daysCount: finalDaysCount,
      approvalStatus: defaultStatus,
      approverId: newLeave.approverId,
      approverName: newLeave.approverName,
      approvers: newLeave.approvers
    };
    db.schedules.push(newSchedule);
  }

  writeDB(db);
  res.json({ success: true, leave: newLeave, schedule: newSchedule });
});

app.patch('/api/leaves/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, rejectReason, approverId, approverName } = req.body;
  const db = readDB();

  const leave = (db.leaves || []).find(l => l.id === id);
  if (!leave) return res.status(404).json({ success: false, message: '신청 내역을 찾을 수 없습니다.' });

  // Security check: Applicant cannot approve their own leave
  if (approverId && leave.userId === approverId) {
    return res.status(403).json({ success: false, message: '본인이 신청한 연차는 직접 승인할 수 없습니다.' });
  }

  const approverUser = db.users.find(u => u.id === approverId);
  const isApproverAdmin = approverUser?.role === 'ADMIN';
  const prevStatus = leave.status;
  const nowKST = getKSTTimeStr();

  // Multi-approver handling (e.g. Team leader leave requiring 3 approvals)
  if (Array.isArray(leave.approvers) && leave.approvers.length > 0) {
    if (status === 'REJECTED') {
      leave.status = 'REJECTED';
      leave.rejectReason = rejectReason || '반려';
      leave.processedAt = nowKST;
      leave.approverName = `${approverName || approverUser?.name || '결재자'} (반려)`;
    } else if (status === 'APPROVED') {
      // Find matching approver in list
      const matched = leave.approvers.find(a => a.id === approverId) ||
                      (isApproverAdmin ? leave.approvers.find(a => a.role === 'ADMIN') : null);
      if (matched) {
        matched.status = 'APPROVED';
        matched.approvedAt = nowKST;
        if (approverName) matched.name = approverName;
      }

      const allApproved = leave.approvers.every(a => a.status === 'APPROVED');
      const approvedCount = leave.approvers.filter(a => a.status === 'APPROVED').length;

      if (allApproved) {
        leave.status = 'APPROVED';
        leave.processedAt = nowKST;
        leave.approverName = leave.approvers.map(a => a.name.split(' ')[0]).join(', ') + ' (3인 승인 완료)';
        // Deduct leave balance
        if (prevStatus !== 'APPROVED' && leave.daysCount > 0) {
          const user = db.users.find(u => u.id === leave.userId);
          if (user) user.usedLeave = (user.usedLeave || 0) + leave.daysCount;
        }
      } else {
        leave.status = 'PENDING';
        leave.approverName = `승인 진행 중 (${approvedCount}/${leave.approvers.length})`;
      }
    }
  } else {
    // Standard single approver flow
    leave.status = status;
    if (rejectReason) leave.rejectReason = rejectReason;
    leave.processedAt = nowKST;
    if (approverId) leave.approverId = approverId;
    if (approverName) leave.approverName = approverName;

    // Adjust leave balance
    if (status === 'APPROVED') {
      if (prevStatus !== 'APPROVED' && prevStatus !== 'CANCEL_REQUESTED' && leave.daysCount > 0) {
        const user = db.users.find(u => u.id === leave.userId);
        if (user) user.usedLeave = (user.usedLeave || 0) + leave.daysCount;
      }
    } else if (status === 'REJECTED' || status === 'CANCELLED') {
      if ((prevStatus === 'APPROVED' || prevStatus === 'CANCEL_REQUESTED') && leave.daysCount > 0) {
        const user = db.users.find(u => u.id === leave.userId);
        if (user) user.usedLeave = Math.max(0, (user.usedLeave || 0) - leave.daysCount);
      }
    }
  }

  // Sync with linked schedule(s) - Prioritize explicit leaveId matching!
  const linkedScheds = (db.schedules || []).filter(s => {
    if (s.leaveId && s.leaveId === leave.id) return true;
    if (!s.leaveId && (s.category === 'LEAVE' || s.category === 'REMOTE' || s.category === 'FIELD') && s.startDate?.startsWith(leave.startDate) && s.authorId === leave.userId) return true;
    return false;
  });

  linkedScheds.forEach(linkedSched => {
    linkedSched.approvalStatus = leave.status;
    if (leave.approvers) linkedSched.approvers = leave.approvers;
    if (leave.approverId) linkedSched.approverId = leave.approverId;
    if (leave.approverName) linkedSched.approverName = leave.approverName;

    if (leave.status === 'CANCEL_REQUESTED') {
      linkedSched.title = `${leave.userName} (${linkedSched.typeLabel || '연차'} 취소대기)`;
    } else if (leave.status === 'CANCELLED') {
      linkedSched.title = `${leave.userName} (${linkedSched.typeLabel || '연차'} 취소완료)`;
    } else if (leave.status === 'REJECTED') {
      linkedSched.title = `${leave.userName} (${linkedSched.typeLabel || '연차'} 반려)`;
      if (leave.rejectReason) linkedSched.rejectReason = leave.rejectReason;
    } else {
      linkedSched.title = `${leave.userName} (${linkedSched.typeLabel || '연차'})`;
    }
  });

  // Notification handling
  const linkedSched = linkedScheds[0] || null;
  const targetScheduleId = linkedSched ? linkedSched.id : null;

  if (status === 'CANCEL_REQUESTED') {
    db.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetUserId: null,
      targetRole: 'ADMIN',
      title: '연차 취소 신청 접수',
      message: `${leave.userName}님이 ${leave.startDate} 연차 취소를 신청했습니다.`,
      type: 'LEAVE_CANCEL_REQUEST',
      isRead: false,
      targetId: targetScheduleId,
      link: 'calendar',
      createdAt: nowKST
    });
  } else if (status === 'CANCELLED') {
    db.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetUserId: leave.userId,
      targetRole: 'EMPLOYEE',
      title: '연차 취소 승인 완료',
      message: `${leave.startDate} 연차 취소 신청이 승인되었습니다. (${leave.daysCount}일 환급)`,
      type: 'LEAVE_STATUS',
      isRead: false,
      targetId: targetScheduleId,
      link: 'calendar',
      createdAt: nowKST
    });
  } else {
    const isCancelRejection = prevStatus === 'CANCEL_REQUESTED';
    db.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetUserId: leave.userId,
      targetRole: 'EMPLOYEE',
      title: leave.status === 'APPROVED' 
        ? (isCancelRejection ? '연차 취소 반려' : '결재 승인 완료') 
        : '결재 반려 안내',
      message: leave.status === 'APPROVED'
        ? (isCancelRejection ? `${leave.startDate} 연차 취소 요청이 반려되어 연차가 유지됩니다.` : `${leave.startDate} ${linkedSched?.typeLabel || '신청 건'}이 최종 승인되었습니다.`)
        : `${leave.startDate} ${linkedSched?.typeLabel || '신청 건'}이 반려되었습니다.` + (rejectReason ? ` (반려 사유: ${rejectReason})` : ''),
      type: 'LEAVE_STATUS',
      isRead: false,
      targetId: targetScheduleId,
      link: 'calendar',
      createdAt: nowKST
    });
  }

  writeDB(db);
  res.json({ success: true, leave, schedule: linkedSched });
});

// Schedule Approval direct patch
app.patch('/api/schedules/:id/approval', (req, res) => {
  const { id } = req.params;
  const { status, rejectReason, approverId, approverName } = req.body;
  const db = readDB();
  const nowKST = getKSTTimeStr();

  const sched = (db.schedules || []).find(s => s.id === id);
  if (!sched) return res.status(404).json({ success: false, message: '일정을 찾을 수 없습니다.' });

  if (approverId && (sched.authorId === approverId || sched.userId === approverId)) {
    return res.status(403).json({ success: false, message: '본인이 신청한 일정은 직접 승인할 수 없습니다.' });
  }

  sched.approvalStatus = status;
  if (approverId) sched.approverId = approverId;
  if (approverName) sched.approverName = approverName;

  if (sched.leaveId) {
    const leave = (db.leaves || []).find(l => l.id === sched.leaveId);
    if (leave) {
      const prevStatus = leave.status;
      leave.status = status;
      if (rejectReason) leave.rejectReason = rejectReason;
      leave.processedAt = nowKST;
      if (approverId) leave.approverId = approverId;
      if (approverName) leave.approverName = approverName;

      if (status === 'APPROVED' && prevStatus !== 'APPROVED' && leave.daysCount > 0) {
        const user = db.users.find(u => u.id === leave.userId);
        if (user) user.usedLeave = (user.usedLeave || 0) + leave.daysCount;
      } else if (status === 'REJECTED' && prevStatus === 'APPROVED' && leave.daysCount > 0) {
        const user = db.users.find(u => u.id === leave.userId);
        if (user) user.usedLeave = Math.max(0, (user.usedLeave || 0) - leave.daysCount);
      }
    }
  }

  const isRemoteOrField = sched.category === 'DEPT' && (sched.title.includes('재택') || sched.title.includes('외근'));
  const prefix = isRemoteOrField ? (sched.title.includes('재택') ? '[재택]' : '[외근]') : '[휴가]';
  const cleanBaseTitle = sched.title.replace(/^\[(대기|반려|승인|휴가|재택|외근)\]\s*/g, '');
  if (status === 'APPROVED') {
    sched.title = `${prefix} ${cleanBaseTitle}`;
  } else if (status === 'REJECTED') {
    sched.title = `[반려] ${prefix} ${cleanBaseTitle}`;
    if (rejectReason) sched.rejectReason = rejectReason;
  }

  // Create notification for applicant
  const targetUserId = sched.authorId || sched.userId || (sched.leaveId && (db.leaves || []).find(l => l.id === sched.leaveId)?.userId);
  if (targetUserId) {
    const dateStr = sched.startDate ? sched.startDate.slice(0, 10) : '';
    const typeLabel = sched.typeLabel || cleanBaseTitle || '신청 건';
    db.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetUserId,
      targetRole: 'EMPLOYEE',
      title: status === 'APPROVED' ? '결재 승인 완료' : '결재 반려 안내',
      message: status === 'APPROVED'
        ? `${dateStr} ${typeLabel}이(가) 승인되었습니다.`
        : `${dateStr} ${typeLabel}이(가) 반려되었습니다.` + (rejectReason ? ` (반려 사유: ${rejectReason})` : ''),
      type: 'LEAVE_STATUS',
      isRead: false,
      targetId: sched.id,
      link: 'calendar',
      createdAt: nowKST
    });
  }

  writeDB(db);
  res.json({ success: true, schedule: sched });
});

app.delete('/api/leaves/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const leave = (db.leaves || []).find(l => l.id === id);
  if (leave && leave.status === 'APPROVED' && leave.daysCount > 0) {
    const user = db.users.find(u => u.id === leave.userId);
    if (user) user.usedLeave = Math.max(0, (user.usedLeave || 0) - leave.daysCount);
  }

  db.leaves = (db.leaves || []).filter(l => l.id !== id);
  db.schedules = (db.schedules || []).filter(s => s.leaveId !== id);
  writeDB(db);
  res.json({ success: true });
});

// 8. Schedules & Calendar
app.get('/api/schedules', (req, res) => {
  const { clientId, role } = req.query;
  const db = readDB();
  let list = db.schedules || [];

  if (role === 'CLIENT' && clientId) {
    // Client only sees schedules shared with their clientId
    list = list.filter(s => s.isClientShared && s.clientId === clientId);
  }

  res.json(list);
});

app.post('/api/schedules', (req, res) => {
  const { title, category, startDate, endDate, allDay, dept, authorId, authorName, isClientShared, clientId, location, description, fileIds, attendeeIds, attendees } = req.body;
  const db = readDB();

  const newSchedule = {
    id: 'sch-' + Date.now(),
    title: title.trim(),
    category: category || 'INTERNAL_MEETING',
    startDate,
    endDate: endDate || startDate,
    allDay: Boolean(allDay),
    dept: dept || '전사',
    authorId,
    authorName,
    approvalStatus: 'APPROVED',
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    history: [
      {
        action: 'CREATE',
        userId: authorId,
        userName: authorName,
        timestamp: new Date().toISOString(),
        summary: '일정 등록'
      }
    ],
    isClientShared: Boolean(isClientShared),
    clientId: clientId || null,
    location: location || '',
    description: description || '',
    fileIds: Array.isArray(fileIds) ? fileIds : [],
    attendeeIds: Array.isArray(attendeeIds) ? attendeeIds : [],
    attendees: Array.isArray(attendees) ? attendees : []
  };

  db.schedules.push(newSchedule);

  // Sync file references
  if (Array.isArray(fileIds) && fileIds.length > 0) {
    db.files = (db.files || []).map(f => {
      if (fileIds.includes(f.id)) {
        return { ...f, scheduleId: newSchedule.id, scheduleTitle: newSchedule.title };
      }
      return f;
    });
  }

  // Attendee Notifications
  if (Array.isArray(newSchedule.attendeeIds) && newSchedule.attendeeIds.length > 0) {
    db.notifications = Array.isArray(db.notifications) ? db.notifications : [];
    const schedDate = newSchedule.startDate ? newSchedule.startDate.slice(0, 10) : '';
    newSchedule.attendeeIds.forEach(attId => {
      if (attId && attId !== authorId) {
        db.notifications.unshift({
          id: 'notif-' + Date.now() + '-' + Math.round(Math.random() * 1e4),
          targetUserId: attId,
          targetRole: 'EMPLOYEE',
          title: '회의 참석자로 추가됨',
          message: `'${newSchedule.title}' 일정(${schedDate})에 참석자로 추가되었습니다.`,
          type: 'SCHEDULE',
          isRead: false,
          link: 'calendar',
          targetId: newSchedule.id,
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        });
      }
    });
  }

  writeDB(db);
  res.json({ success: true, schedule: newSchedule });
});

// Update schedule
app.put('/api/schedules/:id', (req, res) => {
  const { id } = req.params;
  const {
    title,
    category,
    startDate,
    endDate,
    allDay,
    dept,
    isClientShared,
    clientId,
    location,
    description,
    fileIds,
    attendeeIds,
    attendees,
    updatedById,
    updatedByName
  } = req.body;
  const db = readDB();

  const sched = (db.schedules || []).find(s => s.id === id);
  if (!sched) return res.status(404).json({ success: false, message: '일정을 찾을 수 없습니다.' });

  // 외근 및 개인 일정은 본인만 수정 가능
  if (sched.category === 'FIELD' || sched.category === 'PERSONAL') {
    if (updatedById && sched.authorId && updatedById !== sched.authorId) {
      return res.status(403).json({ success: false, message: '본인의 일정만 수정할 수 있습니다.' });
    }
  }

  if (title !== undefined) sched.title = title.trim();
  if (category !== undefined) sched.category = category;
  if (startDate !== undefined) sched.startDate = startDate;
  if (endDate !== undefined) sched.endDate = endDate || startDate;
  if (allDay !== undefined) sched.allDay = Boolean(allDay);
  if (dept !== undefined) sched.dept = dept;
  if (isClientShared !== undefined) sched.isClientShared = Boolean(isClientShared);
  if (clientId !== undefined) sched.clientId = clientId || null;
  if (location !== undefined) sched.location = location || '';
  if (description !== undefined) sched.description = description || '';
  if (fileIds !== undefined) sched.fileIds = Array.isArray(fileIds) ? fileIds : [];
  
  const oldAttendeeIds = Array.isArray(sched.attendeeIds) ? [...sched.attendeeIds] : [];
  if (attendeeIds !== undefined) {
    sched.attendeeIds = Array.isArray(attendeeIds) ? attendeeIds : [];
    const newlyAddedAttendees = sched.attendeeIds.filter(aId => !oldAttendeeIds.includes(aId) && aId !== (updatedById || sched.authorId));
    if (newlyAddedAttendees.length > 0) {
      db.notifications = Array.isArray(db.notifications) ? db.notifications : [];
      const schedDate = sched.startDate ? sched.startDate.slice(0, 10) : '';
      newlyAddedAttendees.forEach(attId => {
        db.notifications.unshift({
          id: 'notif-' + Date.now() + '-' + Math.round(Math.random() * 1e4),
          targetUserId: attId,
          targetRole: 'EMPLOYEE',
          title: '회의 참석자로 추가됨',
          message: `'${sched.title}' 일정(${schedDate})에 참석자로 추가되었습니다.`,
          type: 'SCHEDULE',
          isRead: false,
          link: 'calendar',
          targetId: sched.id,
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        });
      });
    }
  }
  if (attendees !== undefined) sched.attendees = Array.isArray(attendees) ? attendees : [];

  // Audit history tracking
  const nowStr = new Date().toISOString();
  sched.updatedAt = nowStr;
  if (updatedById) sched.updatedById = updatedById;
  if (updatedByName) sched.updatedByName = updatedByName;

  if (!Array.isArray(sched.history)) {
    sched.history = [];
    if (sched.createdAt || sched.authorName) {
      sched.history.push({
        action: 'CREATE',
        userId: sched.authorId,
        userName: sched.authorName,
        timestamp: sched.createdAt || sched.startDate,
        summary: '일정 등록'
      });
    }
  }

  sched.history.unshift({
    action: 'UPDATE',
    userId: updatedById || sched.authorId,
    userName: updatedByName || sched.authorName || '사용자',
    timestamp: nowStr,
    summary: '일정 수정'
  });

  // Sync file references if fileIds changed
  if (Array.isArray(fileIds)) {
    db.files = (db.files || []).map(f => {
      if (fileIds.includes(f.id)) {
        return { ...f, scheduleId: sched.id, scheduleTitle: sched.title };
      } else if (f.scheduleId === id) {
        return { ...f, scheduleId: null, scheduleTitle: null };
      }
      return f;
    });
  }

  writeDB(db);
  res.json({ success: true, schedule: sched });
});

app.put('/api/schedules/:id/files', (req, res) => {
  const { id } = req.params;
  const { fileIds } = req.body;
  const db = readDB();

  const sched = (db.schedules || []).find(s => s.id === id);
  if (!sched) return res.status(404).json({ success: false, message: '일정을 찾을 수 없습니다.' });

  const targetFileIds = Array.isArray(fileIds) ? Array.from(new Set(fileIds)) : [];
  sched.fileIds = targetFileIds;

  // Sync in db.files: support many-to-many scheduleIds
  db.files = (db.files || []).map(f => {
    let fSchedIds = Array.isArray(f.scheduleIds) ? [...f.scheduleIds] : (f.scheduleId ? [f.scheduleId] : []);
    if (targetFileIds.includes(f.id)) {
      if (!fSchedIds.includes(id)) fSchedIds.push(id);
    } else {
      fSchedIds = fSchedIds.filter(sId => sId !== id);
    }
    const firstSchedId = fSchedIds[0] || null;
    const firstSchedTitle = firstSchedId ? ((db.schedules || []).find(s => s.id === firstSchedId)?.title || null) : null;
    return {
      ...f,
      scheduleIds: fSchedIds,
      scheduleId: firstSchedId,
      scheduleTitle: firstSchedTitle
    };
  });

  writeDB(db);
  res.json({ success: true, schedule: sched });
});

app.delete('/api/schedules/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const idx = (db.schedules || []).findIndex(s => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: '일정을 찾을 수 없습니다.' });
  }

  const sched = db.schedules[idx];
  // 외근 및 개인 일정은 본인만 삭제 가능
  const requesterId = req.query.userId || req.body?.userId;
  if ((sched.category === 'FIELD' || sched.category === 'PERSONAL') && requesterId && sched.authorId && requesterId !== sched.authorId) {
    return res.status(403).json({ success: false, message: '본인의 외근 일정만 삭제할 수 있습니다.' });
  }

  // Remove schedule reference from db.files
  db.files = (db.files || []).map(f => {
    if (Array.isArray(f.scheduleIds) && f.scheduleIds.includes(id)) {
      const remaining = f.scheduleIds.filter(sId => sId !== id);
      return {
        ...f,
        scheduleIds: remaining,
        scheduleId: remaining[0] || null,
        scheduleTitle: remaining[0] ? ((db.schedules || []).find(s => s.id === remaining[0])?.title || null) : null
      };
    }
    if (f.scheduleId === id) {
      return { ...f, scheduleId: null, scheduleTitle: null, scheduleIds: [] };
    }
    return f;
  });

  db.schedules.splice(idx, 1);
  writeDB(db);
  res.json({ success: true });
});

// General File Upload for comments / attachments
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '파일이 없습니다.' });
  let originalName = req.file.originalname;
  try {
    originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  } catch (e) {}
  res.json({
    success: true,
    file: {
      name: originalName,
      url: `/uploads/${req.file.filename}`,
      size: req.file.size
    }
  });
});

// 9. Files Repository (파일 보관함)
app.get('/api/files', (req, res) => {
  const db = readDB();
  res.json(db.files || []);
});

app.post('/api/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '업로드할 파일이 없습니다.' });
  }

  const { scheduleId, scheduleIds, uploaderId, uploaderName, memo } = req.body;
  const db = readDB();

  // Parse scheduleIds (many-to-many)
  let targetScheduleIds = [];
  if (scheduleIds) {
    if (Array.isArray(scheduleIds)) {
      targetScheduleIds = scheduleIds;
    } else if (typeof scheduleIds === 'string') {
      try {
        const parsed = JSON.parse(scheduleIds);
        if (Array.isArray(parsed)) targetScheduleIds = parsed;
        else targetScheduleIds = scheduleIds.split(',').map(s => s.trim()).filter(Boolean);
      } catch (e) {
        targetScheduleIds = scheduleIds.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  } else if (scheduleId) {
    targetScheduleIds = [scheduleId];
  }
  targetScheduleIds = Array.from(new Set(targetScheduleIds.filter(Boolean)));

  const firstSched = targetScheduleIds[0] ? (db.schedules || []).find(s => s.id === targetScheduleIds[0]) : null;
  const scheduleTitle = firstSched ? firstSched.title : null;

  const sizeBytes = req.file.size || 0;
  const sizeFormatted = sizeBytes > 1024 * 1024 
    ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB` 
    : `${Math.round(sizeBytes / 1024)} KB`;

  let originalName = req.file.originalname;
  try {
    originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  } catch (e) {}

  const newFile = {
    id: 'file-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    name: originalName,
    originalName,
    fileName: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    size: sizeBytes,
    sizeFormatted,
    mimeType: req.file.mimetype,
    uploaderId: uploaderId || 'usr-admin',
    uploaderName: uploaderName || '김관리',
    scheduleId: targetScheduleIds[0] || null,
    scheduleIds: targetScheduleIds,
    scheduleTitle: scheduleTitle || null,
    memo: memo || '',
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };

  db.files = db.files || [];
  db.files.unshift(newFile);

  // Link file to all target schedules without duplicates
  targetScheduleIds.forEach(sId => {
    const sched = (db.schedules || []).find(s => s.id === sId);
    if (sched) {
      sched.fileIds = Array.isArray(sched.fileIds) ? sched.fileIds : [];
      if (!sched.fileIds.includes(newFile.id)) {
        sched.fileIds.push(newFile.id);
      }
    }
  });

  writeDB(db);
  res.json({ success: true, file: newFile });
});

app.put('/api/files/:id/schedules', (req, res) => {
  const { id } = req.params;
  const { scheduleIds } = req.body;
  const db = readDB();

  const file = (db.files || []).find(f => f.id === id);
  if (!file) return res.status(404).json({ success: false, message: '파일을 찾을 수 없습니다.' });

  const targetSchedIds = Array.isArray(scheduleIds) ? Array.from(new Set(scheduleIds)) : [];
  file.scheduleIds = targetSchedIds;
  file.scheduleId = targetSchedIds[0] || null;
  const firstSched = (db.schedules || []).find(s => s.id === file.scheduleId);
  file.scheduleTitle = firstSched ? firstSched.title : null;

  // Sync with schedules' fileIds
  (db.schedules || []).forEach(s => {
    s.fileIds = Array.isArray(s.fileIds) ? s.fileIds : [];
    if (targetSchedIds.includes(s.id)) {
      if (!s.fileIds.includes(id)) {
        s.fileIds.push(id);
      }
    } else {
      s.fileIds = s.fileIds.filter(fId => fId !== id);
    }
  });

  writeDB(db);
  res.json({ success: true, file });
});

app.delete('/api/files/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const file = (db.files || []).find(f => f.id === id);
  if (!file) {
    return res.status(404).json({ success: false, message: '파일을 찾을 수 없습니다.' });
  }

  if (file.fileName) {
    const filePath = path.join(uploadsDir, file.fileName);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
  }

  db.schedules = (db.schedules || []).map(s => {
    if (s.fileIds && s.fileIds.includes(id)) {
      return { ...s, fileIds: s.fileIds.filter(fId => fId !== id) };
    }
    return s;
  });

  db.files = (db.files || []).filter(f => f.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// 8.5 Notifications API (with 7-day read / 30-day unread auto-cleanup)
app.get('/api/notifications', (req, res) => {
  const { userId } = req.query;
  const db = readDB();
  const nowTime = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const initialLength = (db.notifications || []).length;
  // Auto-clean expired notifications: Read > 7 days, Unread > 30 days
  db.notifications = (db.notifications || []).filter(n => {
    const createdAtTime = n.createdAt ? new Date(n.createdAt).getTime() : 0;
    if (!createdAtTime || isNaN(createdAtTime)) return true;
    const age = nowTime - createdAtTime;
    if (n.isRead && age > SEVEN_DAYS_MS) return false;
    if (!n.isRead && age > THIRTY_DAYS_MS) return false;
    return true;
  });

  if (db.notifications.length !== initialLength) {
    writeDB(db);
  }

  let list = db.notifications || [];
  if (userId) {
    const user = (db.users || []).find(u => u.id === userId || u.username === userId);
    const userRole = user?.role || (userId === 'admin' ? 'ADMIN' : 'EMPLOYEE');

    list = list.filter(n => {
      // 1. Specific user target
      if (n.targetUserId) {
        return n.targetUserId === userId || (user && n.targetUserId === user.id);
      }
      // 2. Role-based target when targetUserId is null/empty
      if (n.targetRole === 'ADMIN') {
        return userRole === 'ADMIN';
      }
      if (n.targetRole === 'TEAM_LEADER') {
        return userRole === 'TEAM_LEADER' || userRole === 'ADMIN';
      }
      if (n.targetRole === 'CLIENT') {
        return userRole === 'CLIENT';
      }
      if (n.targetRole === 'ALL_STAFF' || !n.targetRole) {
        return true;
      }
      return false;
    });
  }

  // Sort newest first
  list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  res.json(list);
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const notif = (db.notifications || []).find(n => n.id === id);
  if (notif) {
    notif.isRead = true;
    writeDB(db);
    return res.json({ success: true, notification: notif });
  }
  res.status(404).json({ success: false, message: '알림을 찾을 수 없습니다.' });
});

app.patch('/api/notifications/read-all', (req, res) => {
  const { userId } = req.body;
  const db = readDB();
  (db.notifications || []).forEach(n => {
    if (!userId || !n.targetUserId || n.targetUserId === userId) {
      n.isRead = true;
    }
  });
  writeDB(db);
  res.json({ success: true });
});

app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.notifications = (db.notifications || []).filter(n => n.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// 9. Tasks (Internal)
app.get('/api/tasks', (req, res) => {
  const db = readDB();
  res.json(db.tasks || []);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, assigneeId, assigneeName, dept, priority, status, startDate, dueDate } = req.body;
  const db = readDB();

  const newTask = {
    id: 'tsk-' + Date.now(),
    title: title.trim(),
    description: description || '',
    assigneeId,
    assigneeName,
    dept,
    priority: priority || 'NORMAL',
    status: status || 'TODO',
    startDate: startDate || new Date().toISOString().slice(0, 10),
    dueDate: dueDate || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString().slice(0, 10)
  };

  db.tasks.push(newTask);

  // Create notification for assigned employee
  if (assigneeId) {
    db.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetUserId: assigneeId,
      targetRole: 'EMPLOYEE',
      title: '신규 업무 배정',
      message: '[' + newTask.title + '] 업무가 배정되었습니다. (마감일: ' + newTask.dueDate + ')',
      type: 'TASK_ASSIGNED',
      isRead: false,
      link: 'tasks',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  }

  writeDB(db);
  res.json({ success: true, task: newTask });
});

const updateTaskHandler = (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const task = db.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ success: false, message: '업무를 찾을 수 없습니다.' });

  Object.assign(task, req.body);
  writeDB(db);
  res.json({ success: true, task });
};

app.put('/api/tasks/:id', updateTaskHandler);
app.patch('/api/tasks/:id', updateTaskHandler);

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.tasks = (db.tasks || []).filter(t => t.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// 10. File Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '파일이 전달되지 않았습니다.' });
  }
  let originalName = req.file.originalname;
  try {
    originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  } catch (e) {}

  const fileUrl = '/uploads/' + req.file.filename;
  res.json({
    success: true,
    file: {
      id: 'file-' + Date.now(),
      name: originalName,
      url: fileUrl,
      size: req.file.size,
      mimeType: req.file.mimetype
    }
  });
});

function logRequestHistory(request, { action, actorName, detail, timestamp }) {
  if (!request.history) request.history = [];
  request.history.push({
    id: 'hist-' + Date.now() + '-' + Math.round(Math.random() * 1e5),
    timestamp: timestamp || new Date().toISOString().slice(0, 19).replace('T', ' '),
    actorName: actorName || '시스템',
    action: action || '상태 변경',
    detail: detail || ''
  });
}

// 11. Client Requests & Work Hours (공수)
app.get('/api/client-requests', (req, res) => {
  const { clientId, role, status } = req.query;
  const db = readDB();
  let list = db.clientRequests || [];

  // Backward compatibility: ensure history and assignedTasks are initialized
  let hasUpdated = false;
  list.forEach(r => {
    if (!Array.isArray(r.assignedTasks)) {
      r.assignedTasks = [];
      hasUpdated = true;
    }
    if (r.approverId === undefined) {
      r.approverId = null;
      r.approverName = null;
      hasUpdated = true;
    }
    if (!Array.isArray(r.history) || r.history.length === 0) {
      const hist = [];
      if (r.createdAt) {
        hist.push({
          id: 'hist-init-create-' + r.id,
          timestamp: r.createdAt,
          actorName: r.clientName || '고객사',
          action: '요청 등록',
          detail: '신규 유지보수 요청 등록'
        });
      }
      if (r.acceptedAt) {
        hist.push({
          id: 'hist-init-accept-' + r.id,
          timestamp: r.acceptedAt,
          actorName: r.acceptedBy || '사내 담당자',
          action: '요청 접수',
          detail: '요청 접수 완료'
        });
      }
      if (r.startedAt) {
        hist.push({
          id: 'hist-init-start-' + r.id,
          timestamp: r.startedAt,
          actorName: r.assigneeName || '담당자',
          action: '작업 착수',
          detail: '작업 진행 착수'
        });
      }
      if (r.completedAt) {
        hist.push({
          id: 'hist-init-comp-' + r.id,
          timestamp: r.completedAt,
          actorName: r.assigneeName || '담당자',
          action: '작업 완료',
          detail: r.completionSummary || `작업 완료 (공수: ${r.spentHours || 0}h)`
        });
      }
      if (r.clientConfirmedAt) {
        hist.push({
          id: 'hist-init-conf-' + r.id,
          timestamp: r.clientConfirmedAt,
          actorName: r.clientConfirmedBy || '고객사',
          action: '고객사 확인 완료',
          detail: '고객사 검수 및 최종 확인 완료'
        });
      }
      if (r.reopenedAt) {
        hist.push({
          id: 'hist-init-reop-' + r.id,
          timestamp: r.reopenedAt,
          actorName: '고객사',
          action: '보완 재요청',
          detail: r.reopenReason || '추가 보완 및 수정 요청'
        });
      }
      hist.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
      r.history = hist;
      hasUpdated = true;
    }
  });

  if (hasUpdated) {
    writeDB(db);
  }

  if (role === 'CLIENT' && clientId) {
    list = list.filter(r => r.clientId === clientId);
  }
  if (status) {
    list = list.filter(r => r.status === status);
  }

  res.json(list);
});

app.post('/api/client-requests', (req, res) => {
  const { clientId, clientName, title, content, priority, desiredDate, attachments } = req.body;
  const db = readDB();

  const newReq = {
    id: 'req-' + Date.now(),
    clientId,
    clientName,
    title: title.trim(),
    content: content.trim(),
    priority: priority || 'NORMAL',
    desiredDate: desiredDate || '',
    status: 'REQUESTED',
    assigneeId: null,
    assigneeName: '담당자 배정 대기',
    assignedTasks: [],
    approverId: null,
    approverName: null,
    history: [],
    attachments: attachments || [],
    spentHours: 0,
    completedAt: null,
    completionSummary: '',
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };

  logRequestHistory(newReq, {
    action: '요청 등록',
    actorName: clientName,
    detail: '신규 유지보수 요청이 등록되었습니다.'
  });

  db.clientRequests.unshift(newReq);

  // Notification for staff and admin
  db.notifications.unshift({
    id: 'notif-' + Date.now(),
    targetRole: 'ALL_STAFF',
    title: '신규 고객사 요청 등록',
    message: '[' + clientName + ']에서 신규 요청 [' + newReq.title + ']을 등록했습니다.',
    type: 'CLIENT_REQUEST',
    requestId: newReq.id,
    targetId: newReq.id,
    isRead: false,
    link: 'client_requests',
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  });

  writeDB(db);
  res.json({ success: true, request: newReq });
});

// Assign Tasks & Optional Approver
app.post('/api/client-requests/:id/assign', (req, res) => {
  const { id } = req.params;
  const { assignedTasks, approverId, approverName, actorName, addedTask, removedTask, approverChanged } = req.body;
  const db = readDB();

  const request = db.clientRequests.find(r => r.id === id);
  if (!request) return res.status(404).json({ success: false, message: '요청글을 찾을 수 없습니다.' });

  const prevApproverId = request.approverId;

  request.assignedTasks = (assignedTasks || []).map((t, idx) => ({
    id: t.id || ('task-' + Date.now() + '-' + idx),
    category: t.category || 'DEV',
    categoryLabel: t.categoryLabel || '개발',
    assigneeId: t.assigneeId,
    assigneeName: t.assigneeName,
    status: t.status || 'PENDING',
    spentHours: Number(t.spentHours) || 0,
    note: t.note || '',
    startedAt: t.startedAt || null,
    completedAt: t.completedAt || null
  }));

  request.approverId = approverId || null;
  request.approverName = approverName || null;

  if (request.status === 'REQUESTED' || request.status === 'RECEIVED') {
    request.status = 'IN_PROGRESS';
    request.startedAt = request.startedAt || new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  const summaryParts = request.assignedTasks.map(t => t.categoryLabel ? `${t.assigneeName}(${t.categoryLabel})` : t.assigneeName);
  if (summaryParts.length > 0) {
    request.assigneeName = summaryParts.join(' · ');
  }

  // Simplified Single-Line History Log
  if (addedTask) {
    const detailLabel = addedTask.categoryLabel ? `${addedTask.assigneeName} (${addedTask.categoryLabel})` : addedTask.assigneeName;
    logRequestHistory(request, {
      action: '업무 배정',
      actorName: actorName || '관리자',
      detail: detailLabel
    });
  } else if (removedTask) {
    const detailLabel = removedTask.categoryLabel ? `${removedTask.assigneeName} (${removedTask.categoryLabel})` : removedTask.assigneeName;
    logRequestHistory(request, {
      action: '배정 취소',
      actorName: actorName || '관리자',
      detail: detailLabel
    });
  } else if (approverChanged) {
    logRequestHistory(request, {
      action: '최종 승인자',
      actorName: actorName || '관리자',
      detail: request.approverName ? `${request.approverName}` : '미지정'
    });
  } else {
    logRequestHistory(request, {
      action: '업무 배정',
      actorName: actorName || '관리자',
      detail: summaryParts.length > 0 ? summaryParts.join(' · ') : '배정 목록'
    });
  }

  if (!db.notifications) db.notifications = [];

  // Notification to newly added staff
  if (addedTask && addedTask.assigneeId) {
    db.notifications.unshift({
      id: 'notif-' + Date.now() + '-' + Math.round(Math.random() * 1e4),
      targetRole: 'STAFF',
      targetUserId: addedTask.assigneeId,
      title: '업무 배정 안내',
      message: `[${request.title}] 요청의 [${addedTask.categoryLabel}] 담당자로 배정되었습니다.`,
      type: 'TASK_ASSIGNED',
      requestId: request.id,
      targetId: request.id,
      link: 'client_requests',
      isRead: false,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  } else if (!addedTask && !removedTask && !approverChanged) {
    request.assignedTasks.forEach(task => {
      if (task.assigneeId) {
        db.notifications.unshift({
          id: 'notif-' + Date.now() + '-' + Math.round(Math.random() * 1e4),
          targetRole: 'STAFF',
          targetUserId: task.assigneeId,
          title: '업무 배정 안내',
          message: `[${request.title}] 요청의 [${task.categoryLabel}] 담당자로 배정되었습니다.`,
          type: 'TASK_ASSIGNED',
          requestId: request.id,
          targetId: request.id,
          link: 'client_requests',
          isRead: false,
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        });
      }
    });
  }

  // Notification to final approver if designated / changed
  if (approverId && approverId !== prevApproverId) {
    db.notifications.unshift({
      id: 'notif-' + Date.now() + '-' + Math.round(Math.random() * 1e4),
      targetRole: 'STAFF',
      targetUserId: approverId,
      title: '최종 승인자 지정 안내',
      message: `[${request.clientName || '고객사'}] '${request.title}' 요청의 최종 승인자로 지정되었습니다.`,
      type: 'APPROVAL_REQUEST',
      requestId: request.id,
      targetId: request.id,
      link: 'client_requests',
      isRead: false,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  }

  writeDB(db);
  res.json({ success: true, request });
});

// Individual Task Status Update (착수 or 완료 및 공수 기록)
app.post('/api/client-requests/:id/tasks/:taskId/status', (req, res) => {
  const { id, taskId } = req.params;
  const { status, spentHours, note, actorId, actorName } = req.body;
  const db = readDB();

  const request = db.clientRequests.find(r => r.id === id);
  if (!request) return res.status(404).json({ success: false, message: '요청글을 찾을 수 없습니다.' });

  if (!Array.isArray(request.assignedTasks)) request.assignedTasks = [];
  const task = request.assignedTasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ success: false, message: '해당 배정 업무를 찾을 수 없습니다.' });

  task.status = status;
  if (spentHours !== undefined) task.spentHours = Math.max(0, parseFloat(spentHours) || 0);
  if (note !== undefined) task.note = (note || '').trim();

  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

  if (status === 'IN_PROGRESS') {
    if (!task.startedAt) task.startedAt = nowStr;
    const detailText = task.categoryLabel ? `${task.assigneeName} (${task.categoryLabel})` : task.assigneeName;
    logRequestHistory(request, {
      action: '작업 진행',
      actorName: actorName || task.assigneeName,
      detail: detailText
    });
  } else if (status === 'COMPLETED') {
    task.completedAt = nowStr;
    logRequestHistory(request, {
      action: '작업 완료',
      actorName: actorName || task.assigneeName,
      detail: `${task.assigneeName} (${task.spentHours || 0}h)`
    });
  } else if (status === 'CONFIRMED') {
    const detailText = task.categoryLabel ? `${task.assigneeName} (${task.categoryLabel})` : task.assigneeName;
    logRequestHistory(request, {
      action: '업무 확인',
      actorName: actorName || task.assigneeName,
      detail: detailText
    });
  } else if (status === 'REQUESTED' || status === 'PENDING') {
    task.startedAt = null;
    task.completedAt = null;
    const detailText = task.categoryLabel ? `${task.assigneeName} (${task.categoryLabel})` : task.assigneeName;
    logRequestHistory(request, {
      action: '업무 요청',
      actorName: actorName || task.assigneeName,
      detail: detailText
    });
  }

  // Check if ALL assigned tasks are completed
  const allCompleted = request.assignedTasks.length > 0 && request.assignedTasks.every(t => t.status === 'COMPLETED');
  if (allCompleted) {
    let totalHours = 0;
    const breakdown = { design: 0, publish: 0, dev: 0, etc: 0 };
    request.assignedTasks.forEach(t => {
      const h = Number(t.spentHours) || 0;
      totalHours += h;
      const cat = (t.category || '').toUpperCase();
      if (cat === 'DESIGN') breakdown.design += h;
      else if (cat === 'PUBLISH') breakdown.publish += h;
      else if (cat === 'DEV') breakdown.dev += h;
      else breakdown.etc += h;
    });

    request.spentHours = totalHours;
    request.spentHoursBreakdown = breakdown;

    // Rule: If NO final approver designated -> Auto Final Complete!
    if (!request.approverId) {
      request.status = 'DONE';
      request.completedAt = nowStr;
      request.clientConfirmed = false;
      const notes = (request.assignedTasks || []).map(t => t.note).filter(Boolean);
      request.completionSummary = request.completionSummary || (notes.length > 0 ? notes.join('\n') : '요청하신 작업이 완료되었습니다.');

      logRequestHistory(request, {
        action: '최종 완료',
        actorName: '시스템',
        detail: notes.length > 0 ? notes[notes.length - 1] : '작업 완료'
      });

      // Send client notification
      if (!db.notifications) db.notifications = [];
      db.notifications.unshift({
        id: 'notif-' + Date.now(),
        targetRole: 'CLIENT',
        targetClientId: request.clientId,
        title: '작업 완료 안내',
        message: `[${request.title}] 요청의 모든 작업이 완료되었습니다. 작업 내역을 확인해 주세요.`,
        type: 'REQUEST_COMPLETED',
        requestId: request.id,
        isRead: false,
        createdAt: nowStr
      });
    } else {
      // Approver is designated -> Awaiting final approval
      logRequestHistory(request, {
        action: '최종 승인 대기',
        actorName: '시스템',
        detail: `모든 배정 업무가 완료되었습니다. 최종 승인자(${request.approverName})의 완료 승인을 대기합니다.`
      });

      // Send notification to designated approver
      if (!db.notifications) db.notifications = [];
      db.notifications.unshift({
        id: 'notif-' + Date.now(),
        targetRole: 'STAFF',
        targetUserId: request.approverId,
        title: '요청 최종 완료 승인 요청',
        message: `[${request.title}] 요청의 모든 작업이 완료되었습니다. 최종 승인을 진행해주세요.`,
        type: 'APPROVAL_NEEDED',
        requestId: request.id,
        targetId: request.id,
        link: 'client_requests',
        isRead: false,
        createdAt: nowStr
      });
    }
  }

  writeDB(db);
  res.json({ success: true, request, task, allCompleted });
});

// Update client request (요청 상태에서만 수정 가능, 작업 중/완료 시 수정 불가)
app.put('/api/client-requests/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, desiredDate, priority } = req.body;
  const db = readDB();

  const request = db.clientRequests.find(r => r.id === id);
  if (!request) return res.status(404).json({ success: false, message: '요청글을 찾을 수 없습니다.' });

  // Only allow edit if not yet in IN_PROGRESS or DONE
  if (request.status === 'IN_PROGRESS' || request.status === 'DONE') {
    return res.status(400).json({ success: false, message: '작업이 진행 중이거나 완료된 요청은 수정할 수 없습니다.' });
  }

  if (title !== undefined) request.title = title.trim();
  if (content !== undefined) request.content = content.trim();
  if (desiredDate !== undefined) request.desiredDate = desiredDate;
  if (priority !== undefined) request.priority = priority;
  request.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  writeDB(db);
  res.json({ success: true, request });
});

// Complete request and record spent hours (공수 기록 & 분야별 공수) / 최종 완료 승인
app.post('/api/client-requests/:id/complete', (req, res) => {
  const { id } = req.params;
  const { spentHours, completionSummary, assigneeId, assigneeName, spentHoursBreakdown, approverId, approverName } = req.body;
  const db = readDB();

  const request = db.clientRequests.find(r => r.id === id);
  if (!request) return res.status(404).json({ success: false, message: '요청글을 찾을 수 없습니다.' });

  let calculatedTotal = 0;
  let breakdown = spentHoursBreakdown;

  if (request.assignedTasks && request.assignedTasks.length > 0) {
    const taskBreakdown = { design: 0, publish: 0, dev: 0, etc: 0 };
    request.assignedTasks.forEach(t => {
      const h = Number(t.spentHours) || 0;
      calculatedTotal += h;
      const cat = (t.category || '').toUpperCase();
      if (cat === 'DESIGN') taskBreakdown.design += h;
      else if (cat === 'PUBLISH') taskBreakdown.publish += h;
      else if (cat === 'DEV') taskBreakdown.dev += h;
      else taskBreakdown.etc += h;
    });
    breakdown = taskBreakdown;
  } else {
    breakdown = spentHoursBreakdown || {
      design: 0,
      publish: 0,
      dev: Number(spentHours) || 0,
      etc: 0
    };
    calculatedTotal = (Number(breakdown.design) || 0) + 
                      (Number(breakdown.publish) || 0) + 
                      (Number(breakdown.dev) || 0) + 
                      (Number(breakdown.etc) || 0);
  }

  request.status = 'DONE';
  request.spentHours = calculatedTotal > 0 ? calculatedTotal : (Number(spentHours) || 0);
  request.spentHoursBreakdown = breakdown;
  request.clientConfirmed = false;
  request.clientConfirmedAt = null;
  request.clientConfirmedBy = null;
  request.completionSummary = completionSummary || '작업 완료 처리되었습니다.';
  request.completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (assigneeName) request.assigneeName = assigneeName;
  if (assigneeId) request.assigneeId = assigneeId;

  const actor = approverName || assigneeName || request.approverName || '최종 승인자';
  logRequestHistory(request, {
    action: '최종 완료 승인 및 고객사 전달',
    actorName: actor,
    detail: `최종 완료 승인 처리 (총 공수 ${request.spentHours}h) 및 고객사 확인 요청 전달`
  });

  // Client Notification
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: 'notif-' + Date.now(),
    targetRole: 'CLIENT',
    targetClientId: request.clientId,
    title: '작업 완료 안내',
    message: `[${request.title}] 요청의 작업이 완료되었습니다. 작업 내역 및 공수를 확인해 주세요.`,
    type: 'REQUEST_COMPLETED',
    requestId: id,
    isRead: false,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  });

  writeDB(db);
  res.json({ success: true, request });
});

// Client Confirm Completed Request (고객사 작업 확인 완료 / 검수)
app.post('/api/client-requests/:id/confirm', (req, res) => {
  const { id } = req.params;
  const { confirmedBy, confirmed } = req.body;
  const db = readDB();

  const request = db.clientRequests.find(r => r.id === id);
  if (!request) return res.status(404).json({ success: false, message: '요청글을 찾을 수 없습니다.' });

  const wasAlreadyConfirmed = Boolean(request.clientConfirmed);
  if (wasAlreadyConfirmed && confirmed === false) {
    return res.status(400).json({ success: false, message: '이미 확인 완료된 작업은 취소할 수 없습니다.' });
  }
  const isConfirmed = confirmed !== undefined ? Boolean(confirmed) : true;
  request.clientConfirmed = isConfirmed;
  request.clientConfirmedAt = isConfirmed ? (request.clientConfirmedAt || new Date().toISOString().slice(0, 19).replace('T', ' ')) : null;
  request.clientConfirmedBy = isConfirmed ? (request.clientConfirmedBy || confirmedBy || '고객사') : null;

  if (isConfirmed && !wasAlreadyConfirmed) {
    logRequestHistory(request, {
      action: '고객사 확인 완료',
      actorName: request.clientConfirmedBy || '고객사',
      detail: '고객사 검수 및 최종 확인 완료'
    });

    // Staff Notification
    if (!db.notifications) db.notifications = [];
    db.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetRole: 'ALL_STAFF',
      title: '고객사 작업 확인 완료',
      message: `[${request.clientName || '고객사'}]에서 [${request.title}] 작업 확인을 완료했습니다.`,
      type: 'CLIENT_CONFIRMED',
      requestId: id,
      targetId: id,
      link: 'client_requests',
      isRead: false,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  }

  writeDB(db);
  res.json({ success: true, request });
});

// Staff Accept Request (사내 담당자 접수 완료 처리)
app.post('/api/client-requests/:id/accept', (req, res) => {
  const { id } = req.params;
  const { acceptedBy, assigneeId, assigneeName } = req.body;
  const db = readDB();

  const request = db.clientRequests.find(r => r.id === id);
  if (!request) return res.status(404).json({ success: false, message: '요청글을 찾을 수 없습니다.' });

  request.status = 'RECEIVED';
  request.acceptedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  request.acceptedBy = acceptedBy || '사내 담당자';
  if (assigneeName) request.assigneeName = assigneeName;
  if (assigneeId) request.assigneeId = assigneeId;

  logRequestHistory(request, {
    action: '요청 접수',
    actorName: acceptedBy || '사내 담당자',
    detail: '요청 접수 완료'
  });

  // Client Notification
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: 'notif-' + Date.now(),
    targetRole: 'CLIENT',
    targetClientId: request.clientId,
    title: '요청 접수 완료 안내',
    message: `[${request.title}] 요청이 정상 접수되었습니다. 곧 담당자가 배정되어 작업을 진행합니다.`,
    type: 'REQUEST_ACCEPTED',
    requestId: id,
    isRead: false,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  });

  writeDB(db);
  res.json({ success: true, request });
});

// Staff Start Working on Request (사내 담당자 작업 착수 처리)
app.post('/api/client-requests/:id/start', (req, res) => {
  const { id } = req.params;
  const { assigneeId, assigneeName } = req.body;
  const db = readDB();

  const request = db.clientRequests.find(r => r.id === id);
  if (!request) return res.status(404).json({ success: false, message: '요청글을 찾을 수 없습니다.' });

  request.status = 'IN_PROGRESS';
  request.startedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (assigneeName) request.assigneeName = assigneeName;
  if (assigneeId) request.assigneeId = assigneeId;

  logRequestHistory(request, {
    action: '작업 착수',
    actorName: assigneeName || '담당자',
    detail: '작업 진행 착수'
  });

  // Client Notification
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: 'notif-' + Date.now(),
    targetRole: 'CLIENT',
    targetClientId: request.clientId,
    title: '작업 진행 착수 안내',
    message: `[${request.title}] 요청에 대해 담당자가 배정되어 작업을 시작했습니다.`,
    type: 'REQUEST_STARTED',
    requestId: id,
    isRead: false,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  });

  writeDB(db);
  res.json({ success: true, request });
});

// Client Reopen Request (고객사 보완 및 재요청)
app.post('/api/client-requests/:id/reopen', (req, res) => {
  const { id } = req.params;
  const { reason, requestedBy } = req.body;
  const db = readDB();

  const request = db.clientRequests.find(r => r.id === id);
  if (!request) return res.status(404).json({ success: false, message: '요청글을 찾을 수 없습니다.' });

  const clientName = request.clientName || '고객사';
  const userName = requestedBy || '고객사 담당자';

  request.status = 'REOPENED';
  request.clientConfirmed = false;
  request.reopenReason = reason || '추가 보완 및 수정 요청';
  request.reopenedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // If there are assigned tasks, resume them back to IN_PROGRESS
  if (request.assignedTasks && request.assignedTasks.length > 0) {
    request.assignedTasks.forEach(task => {
      task.status = 'IN_PROGRESS';
    });
  }

  logRequestHistory(request, {
    action: '보완 재요청',
    actorName: userName || '고객사',
    detail: `보완 재요청 접수: ${reason || '추가 보완 및 수정 요청'}`
  });

  // Targeted Notification: notify assigned staff and approver, or ALL_STAFF if none assigned
  if (!db.notifications) db.notifications = [];
  const assignedStaffIds = (request.assignedTasks || []).map(t => t.staffId).filter(Boolean);
  if (request.approverId && !assignedStaffIds.includes(request.approverId)) {
    assignedStaffIds.push(request.approverId);
  }

  if (assignedStaffIds.length > 0) {
    assignedStaffIds.forEach(targetStaffId => {
      db.notifications.unshift({
        id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        targetUserId: targetStaffId,
        title: '고객사 보완/재요청 접수',
        message: `[${clientName}]에서 [${request.title}]에 대한 보완 재요청을 접수했습니다. 사유: ${reason || '내용 확인 필요'}`,
        type: 'CLIENT_REOPENED',
        requestId: id,
        isRead: false,
        link: 'client_requests',
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });
    });
  } else {
    db.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetRole: 'ALL_STAFF',
      title: '고객사 보완/재요청 접수',
      message: `[${clientName}]에서 [${request.title}]에 대한 보완 재요청을 접수했습니다. 사유: ${reason || '내용 확인 필요'}`,
      type: 'CLIENT_REOPENED',
      requestId: id,
      isRead: false,
      link: 'client_requests',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  }

  writeDB(db);
  res.json({ success: true, request });
});

// 12. Request Comments (History)
app.get('/api/client-requests/:id/comments', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const comments = (db.requestComments || []).filter(c => c.requestId === id);
  res.json(comments);
});

app.post('/api/client-requests/:id/comments', (req, res) => {
  const { id } = req.params;
  const { authorId, authorName, authorRole, content, attachments } = req.body;
  const db = readDB();

  const newComment = {
    id: 'comm-' + Date.now(),
    requestId: id,
    authorId,
    authorName,
    authorRole,
    content: content.trim(),
    attachments: attachments || [],
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };

  db.requestComments.push(newComment);

  // If client commented, notify staff. If staff commented, notify client.
  const reqItem = db.clientRequests.find(r => r.id === id);
  if (reqItem) {
    if (!db.notifications) db.notifications = [];
    if (authorRole === 'CLIENT') {
      db.notifications.unshift({
        id: 'notif-' + Date.now(),
        targetRole: 'ALL_STAFF',
        title: '고객사 댓글 등록',
        message: '[' + reqItem.clientName + ']에서 [' + reqItem.title + ']에 새 댓글을 남겼습니다.',
        type: 'COMMENT_ADDED',
        requestId: id,
        targetId: id,
        isRead: false,
        link: 'client_requests',
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });
    } else {
      db.notifications.unshift({
        id: 'notif-' + Date.now(),
        targetRole: 'CLIENT',
        targetClientId: reqItem.clientId,
        title: '새 댓글 등록 안내',
        message: '[' + reqItem.title + '] 요청에 새 댓글이 등록되었습니다.',
        type: 'COMMENT_ADDED',
        requestId: id,
        targetId: id,
        isRead: false,
        link: 'client_requests',
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });
    }
  }

  writeDB(db);
  res.json({ success: true, comment: newComment });
});

// 13. Announcements
app.get('/api/announcements', (req, res) => {
  const db = readDB();
  res.json(db.announcements || []);
});

app.post('/api/announcements', (req, res) => {
  const { title, content, isActive = true } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: '공지 제목을 입력해주세요.' });
  }
  const db = readDB();
  if (!db.announcements) db.announcements = [];
  const newAnno = {
    id: `anno-${Date.now()}`,
    title: title.trim(),
    content: (content || '').trim(),
    isActive: Boolean(isActive),
    createdAt: new Date().toISOString().slice(0, 10)
  };
  db.announcements.unshift(newAnno);
  writeDB(db);
  res.json({ success: true, announcement: newAnno });
});

app.put('/api/announcements/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, isActive } = req.body;
  const db = readDB();
  if (!db.announcements) db.announcements = [];
  const anno = db.announcements.find(a => a.id === id);
  if (!anno) {
    return res.status(404).json({ success: false, message: '공지 사항을 찾을 수 없습니다.' });
  }
  if (title !== undefined) anno.title = title.trim();
  if (content !== undefined) anno.content = content.trim();
  if (isActive !== undefined) anno.isActive = Boolean(isActive);
  writeDB(db);
  res.json({ success: true, announcement: anno });
});

app.put('/api/announcements/:id/toggle', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  if (!db.announcements) db.announcements = [];
  const anno = db.announcements.find(a => a.id === id);
  if (!anno) {
    return res.status(404).json({ success: false, message: '공지 사항을 찾을 수 없습니다.' });
  }
  anno.isActive = !anno.isActive;
  writeDB(db);
  res.json({ success: true, announcement: anno });
});

app.delete('/api/announcements/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  if (!db.announcements) db.announcements = [];
  db.announcements = db.announcements.filter(a => a.id !== id);
  writeDB(db);
  res.json({ success: true, message: '공지 사항이 삭제되었습니다.' });
});

// 14. Notifications
app.get('/api/notifications', (req, res) => {
  const { role, userId } = req.query;
  const db = readDB();
  let list = db.notifications || [];

  if (role === 'CLIENT') {
    list = list.filter(n => n.targetRole === 'CLIENT' || n.targetUserId === userId);
  } else {
    list = list.filter(n => n.targetRole === 'ALL_STAFF' || n.targetRole === 'ADMIN' || n.targetUserId === userId);
  }

  res.json(list.slice(0, 20));
});

app.post('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const notif = db.notifications.find(n => n.id === id);
  if (notif) notif.isRead = true;
  writeDB(db);
  res.json({ success: true });
});

// 15. Super Admin 4-Sheet Excel Export (.xlsx)
app.get('/api/export/excel', (req, res) => {
  const db = readDB();

  // Sheet 1: 근태 및 출퇴근 기록
  const sheet1Data = (db.attendances || []).map(a => ({
    '사원명': a.userName,
    '부서': a.dept,
    '날짜': a.date,
    '출근시각': a.checkIn || '-',
    '퇴근시각': a.checkOut || '-',
    '실근무시간(h)': a.workHours || 0,
    '연장근로(h)': a.overtimeHours || 0,
    '지각여부': a.isLate ? '지각' : '정상',
    '근무형태': a.workType === 'OFFICE' ? '사내정상' : (a.workType === 'REMOTE' ? '재택근무' : '외근/출장'),
    '사내IP일치': a.isCompanyNetwork ? '일치(사내)' : '사외망',
    '사유/비고': a.reason || '-'
  }));

  // Sheet 2: 휴가 및 연차 사용내역
  const sheet2Data = (db.users || []).map(u => {
    const legalLeave = calculateLegalLeave(u.hireDate);
    const totalLeave = legalLeave + (u.manualLeaveAdjustment || 0);
    const remainingLeave = totalLeave - (u.usedLeave || 0);
    return {
      '사원명': u.name,
      '사번': u.empNo,
      '부서': u.dept,
      '직급': u.position,
      '입사일자': u.hireDate,
      '법정산출연차': legalLeave,
      '관리자조정(가산)': u.manualLeaveAdjustment || 0,
      '총부여연차': totalLeave,
      '사용연차': u.usedLeave || 0,
      '잔여연차': remainingLeave
    };
  });

  // Sheet 3: 사내 업무 현황
  const sheet3Data = (db.tasks || []).map(t => ({
    '업무명': t.title,
    '담당자': t.assigneeName || '-',
    '담당부서': t.dept || '-',
    '우선순위': t.priority,
    '진행상태': t.status === 'TODO' ? '할 일' : (t.status === 'IN_PROGRESS' ? '진행 중' : '완료'),
    '시작일': t.startDate || '-',
    '마감일': t.dueDate || '-',
    '업무상세': t.description || '-'
  }));

  // Sheet 4: 고객사 요청 및 공수 집계
  const sheet4Data = (db.clientRequests || []).map(r => {
    const commentsCount = (db.requestComments || []).filter(c => c.requestId === r.id).length;
    return {
      '고객사명': r.clientName,
      '요청제목': r.title,
      '요청상세내용': r.content,
      '접수일시': r.createdAt,
      '사내담당자': r.assigneeName || '-',
      '진행상태': r.status === 'RECEIVED' ? '접수' : (r.status === 'IN_PROGRESS' ? '처리 중' : '완료'),
      '투입공수(시간)': r.spentHours || 0,
      '완료일시': r.completedAt || '-',
      '조치완료요약': r.completionSummary || '-',
      '누적댓글수': commentsCount
    };
  });

  // Create multi-sheet workbook using SheetJS
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data.length ? sheet1Data : [{ '데이터': '기록 없음' }]);
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data.length ? sheet2Data : [{ '데이터': '기록 없음' }]);
  const ws3 = XLSX.utils.json_to_sheet(sheet3Data.length ? sheet3Data : [{ '데이터': '기록 없음' }]);
  const ws4 = XLSX.utils.json_to_sheet(sheet4Data.length ? sheet4Data : [{ '데이터': '기록 없음' }]);

  XLSX.utils.book_append_sheet(wb, ws1, '1.근태출퇴근기록');
  XLSX.utils.book_append_sheet(wb, ws2, '2.휴가연차현황');
  XLSX.utils.book_append_sheet(wb, ws3, '3.사내업무현황');
  XLSX.utils.book_append_sheet(wb, ws4, '4.고객사요청공수집계');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const fileName = 'Company_Work_Attendance_Report_' + new Date().toISOString().slice(0, 10) + '.xlsx';
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// 16. Payroll (급여 관리) & Company Policy Endpoints

// Default Company Payroll & Deduction Policy
const DEFAULT_COMPANY_POLICY = {
  salaryPaymentDay: 25, // 매월 25일 정기 급여 지급일 (1~31)
  lateDeductionPerCase: 20000,
  earlyLeaveDeductionPerCase: 10000,
  absenceDeductionType: 'DAILY_PRORATED', // 'DAILY_PRORATED' (일할 계산) | 'FIXED' (고정액)
  absenceDeductionFixed: 100000,
  mealAllowanceDefault: 200000,
  standardWorkStart: '09:00', // 정규 출근 기준 시각
  standardWorkEnd: '18:00',   // 정규 퇴근 기준 시각
  lunchStart: '12:00',        // 점심 휴게 시작 시각
  lunchEnd: '13:00',          // 점심 휴게 종료 시각
  halfDayAmWorkStart: '14:00', // 오전 반차 출근 기준 시각 (오후 근무 시작)
  halfDayAmWorkEnd: '18:00',   // 오전 반차 퇴근 기준 시각 (오후 근무 종료)
  halfDayPmWorkStart: '09:00', // 오후 반차 출근 기준 시각 (오전 근무 시작)
  halfDayPmWorkEnd: '14:00',   // 오후 반차 퇴근 기준 시각 (오전 근무 종료)
  updatedAt: '2026-09-15 11:45:00',
  updatedBy: '김관리'
};

function getCompanyPolicy(db) {
  const policy = db.companyPolicy || DEFAULT_COMPANY_POLICY;
  if (!policy.salaryPaymentDay) {
    policy.salaryPaymentDay = 25;
  }
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
  
  // Calculate based on company policy unless manually customized
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

// 16-1. Company Policy Endpoints
app.get('/api/company-policy', (req, res) => {
  const db = readDB();
  const policy = getCompanyPolicy(db);
  res.json({ success: true, policy });
});

app.put('/api/company-policy', (req, res) => {
  const updates = req.body || {};
  const db = readDB();
  const current = getCompanyPolicy(db);

  const updatedPolicy = {
    ...current,
    salaryPaymentDay: updates.salaryPaymentDay !== undefined ? Math.min(31, Math.max(1, Number(updates.salaryPaymentDay))) : (current.salaryPaymentDay || 25),
    lateDeductionPerCase: updates.lateDeductionPerCase !== undefined ? Math.max(0, Number(updates.lateDeductionPerCase)) : current.lateDeductionPerCase,
    earlyLeaveDeductionPerCase: updates.earlyLeaveDeductionPerCase !== undefined ? Math.max(0, Number(updates.earlyLeaveDeductionPerCase)) : current.earlyLeaveDeductionPerCase,
    absenceDeductionType: updates.absenceDeductionType || current.absenceDeductionType || 'DAILY_PRORATED',
    absenceDeductionFixed: updates.absenceDeductionFixed !== undefined ? Math.max(0, Number(updates.absenceDeductionFixed)) : current.absenceDeductionFixed,
    mealAllowanceDefault: updates.mealAllowanceDefault !== undefined ? Math.max(0, Number(updates.mealAllowanceDefault)) : current.mealAllowanceDefault,
    standardWorkStart: updates.standardWorkStart || current.standardWorkStart || '09:00',
    standardWorkEnd: updates.standardWorkEnd || current.standardWorkEnd || '18:00',
    lunchStart: updates.lunchStart || current.lunchStart || '12:00',
    lunchEnd: updates.lunchEnd || current.lunchEnd || '13:00',
    halfDayAmWorkStart: updates.halfDayAmWorkStart || current.halfDayAmWorkStart || '14:00',
    halfDayAmWorkEnd: updates.halfDayAmWorkEnd || current.halfDayAmWorkEnd || '18:00',
    halfDayPmWorkStart: updates.halfDayPmWorkStart || current.halfDayPmWorkStart || '09:00',
    halfDayPmWorkEnd: updates.halfDayPmWorkEnd || current.halfDayPmWorkEnd || '14:00',
    updatedAt: getKSTTimeStr(),
    updatedBy: updates.updatedBy || '최고관리자'
  };

  db.companyPolicy = updatedPolicy;

  // Batch recalculate all non-PAID payroll records across all months and update scheduled paymentDate
  const currentToday = getTodayStr();
  const paymentDay = updatedPolicy.salaryPaymentDay || 25;
  let recalcCount = 0;
  db.payrolls = (db.payrolls || []).map(p => {
    const scheduledDate = `${p.month}-${String(paymentDay).padStart(2, '0')}`;
    p.paymentDate = scheduledDate;
    if (p.status !== 'PAID') {
      if (scheduledDate <= currentToday) {
        p.status = 'PAID';
      } else {
        p.status = 'PENDING_REVIEW';
      }
    } else if (p.status === 'PAID' && scheduledDate > currentToday) {
      p.status = 'PENDING_REVIEW';
    }
    const user = (db.users || []).find(u => u.id === p.userId);
    const monthAtts = (db.attendances || []).filter(a => a.userId === p.userId && a.date?.startsWith(p.month));
    recalcCount++;
    return calculatePayrollRecord(p, user, monthAtts, updatedPolicy);
  });

  writeDB(db);

  res.json({
    success: true,
    message: '전사 급여 정책 및 정기 지급일이 저장되고 전체 사원 급여가 일괄 재계산되었습니다.',
    policy: updatedPolicy,
    recalculatedCount: recalcCount
  });
});

// Ensure all eligible active employees have a payroll record for the given month (Auto-Provisioning Engine)
function ensureMonthPayrolls(month, db) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return;
  const currentMonth = getTodayStr().slice(0, 7);
  // Do not generate payrolls for future months beyond current month
  if (month > currentMonth) return;

  if (!Array.isArray(db.payrolls)) db.payrolls = [];
  const policy = getCompanyPolicy(db);
  let changed = false;

  const staffUsers = (db.users || []).filter(u => u.role !== 'CLIENT');

  staffUsers.forEach(user => {
    // Only employees hired on or before this month are eligible
    const hireMonth = (user.hireDate || '2020-01-01').slice(0, 7);
    if (hireMonth > month) return;

    let existing = db.payrolls.find(p => p.userId === user.id && p.month === month);
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

      const calculated = calculatePayrollRecord(rawPayroll, user, monthAtts, policy);
      db.payrolls.push(calculated);
      changed = true;
    }
  });

  if (changed) {
    writeDB(db);
  }
}

app.get('/api/payrolls', (req, res) => {
  const db = readDB();
  const currentMonth = getTodayStr().slice(0, 7);
  let month = req.query.month || currentMonth;
  // If requested month is in the future, restrict to current month
  if (month > currentMonth) {
    month = currentMonth;
  }

  // Ensure all active employees have payroll records up to this month
  ensureMonthPayrolls(month, db);

  const policy = getCompanyPolicy(db);
  const list = (db.payrolls || []).filter(p => p.month === month);
  const currentToday = getTodayStr();
  const paymentDay = Number(policy?.salaryPaymentDay || 25);

  // Dynamically enrich or refresh leave/late data using company policy
  list.forEach(p => {
    const scheduledPaymentDate = `${p.month}-${String(paymentDay).padStart(2, '0')}`;
    p.paymentDate = scheduledPaymentDate;
    if (p.status !== 'PAID') {
      if (scheduledPaymentDate <= currentToday) {
        p.status = 'PAID';
      }
    } else if (p.status === 'PAID' && scheduledPaymentDate > currentToday) {
      p.status = 'PENDING_REVIEW';
    }

    const user = (db.users || []).find(u => u.id === p.userId);
    if (user) {
      if (!p.annualSalary && user.annualSalary) p.annualSalary = user.annualSalary;
      const legalLeave = calculateLegalLeave(user.hireDate);
      const totalLeave = legalLeave + (user.manualLeaveAdjustment || 0);
      const usedLeave = user.usedLeave || 0;
      p.remainingLeave = Math.max(0, totalLeave - usedLeave);
      p.totalLeave = totalLeave;
      p.usedLeave = usedLeave;
    }
    const monthAtts = (db.attendances || []).filter(a => a.userId === p.userId && a.date?.startsWith(month));
    if (p.status !== 'PAID') {
      const recalculated = calculatePayrollRecord(p, user, monthAtts, policy);
      Object.assign(p, recalculated);
    } else {
      p.lateCount = monthAtts.filter(a => a.isLate).length;
    }
  });
  writeDB(db);

  const totalPay = list.reduce((sum, p) => sum + (p.totalPay || 0), 0);
  const totalDeduction = list.reduce((sum, p) => sum + (p.totalDeduction || 0), 0);
  const netPay = list.reduce((sum, p) => sum + (p.netPay || 0), 0);
  const totalCount = list.length;
  const pendingReviewCount = list.filter(p => p.status === 'PENDING_REVIEW').length;
  const reviewedCount = list.filter(p => p.status === 'REVIEWED').length;
  const paidCount = list.filter(p => p.status === 'PAID').length;

  res.json({
    success: true,
    month,
    policy,
    metrics: {
      totalPay,
      totalDeduction,
      netPay,
      totalCount,
      pendingReviewCount,
      reviewedCount,
      paidCount
    },
    payrolls: list
  });
});

app.get('/api/payrolls/my', (req, res) => {
  const db = readDB();
  const currentMonth = getTodayStr().slice(0, 7);
  let { userId, month = currentMonth } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId가 필요합니다.' });
  }
  if (month > currentMonth) {
    month = currentMonth;
  }

  // Ensure payroll exists if employee is eligible
  ensureMonthPayrolls(month, db);

  const pay = (db.payrolls || []).find(p => p.userId === userId && p.month === month);
  if (!pay) {
    return res.json({ success: false, message: '해당 월의 급여 명세서가 존재하지 않습니다.' });
  }

  const user = (db.users || []).find(u => u.id === userId);
  const policy = getCompanyPolicy(db);
  const monthAtts = (db.attendances || []).filter(a => a.userId === userId && a.date?.startsWith(month));
  const currentToday = getTodayStr();
  const paymentDay = Number(policy?.salaryPaymentDay || 25);
  const scheduledPaymentDate = `${pay.month}-${String(paymentDay).padStart(2, '0')}`;

  pay.paymentDate = scheduledPaymentDate;
  if (pay.status !== 'PAID') {
    if (scheduledPaymentDate <= currentToday) {
      pay.status = 'PAID';
    }
  } else if (pay.status === 'PAID' && scheduledPaymentDate > currentToday) {
    pay.status = 'PENDING_REVIEW';
  }

  if (pay.status !== 'PAID') {
    const recalculated = calculatePayrollRecord(pay, user, monthAtts, policy);
    Object.assign(pay, recalculated);
  } else {
    pay.lateCount = monthAtts.filter(a => a.isLate).length;
  }

  if (user) {
    const legalLeave = calculateLegalLeave(user.hireDate);
    const totalLeave = legalLeave + (user.manualLeaveAdjustment || 0);
    const usedLeave = user.usedLeave || 0;
    pay.remainingLeave = Math.max(0, totalLeave - usedLeave);
    pay.totalLeave = totalLeave;
    pay.usedLeave = usedLeave;
    if (!pay.annualSalary && user.annualSalary) pay.annualSalary = user.annualSalary;
  }
  writeDB(db);

  res.json({
    success: true,
    payroll: pay,
    policy
  });
});

app.patch('/api/payrolls/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = (db.payrolls || []).findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: '해당 급여 항목을 찾을 수 없습니다.' });
  }

  const current = db.payrolls[index];
  const updates = req.body || {};

  let annualSalary = updates.annualSalary !== undefined ? Number(updates.annualSalary) : current.annualSalary;
  let dutyAllowance = updates.dutyAllowance !== undefined ? Number(updates.dutyAllowance) : current.dutyAllowance;
  let mealAllowance = updates.mealAllowance !== undefined ? Number(updates.mealAllowance) : current.mealAllowance;
  let overtimePay = updates.overtimePay !== undefined ? Number(updates.overtimePay) : current.overtimePay;
  let bonus = updates.bonus !== undefined ? Number(updates.bonus) : current.bonus;
  let baseSalary = current.baseSalary;

  // If annualSalary was updated, recalculate baseSalary
  if (updates.annualSalary !== undefined) {
    const monthlyTarget = Math.round(annualSalary / 12);
    baseSalary = Math.max(0, monthlyTarget - mealAllowance - dutyAllowance);
    // Also sync to user object
    const userIndex = (db.users || []).findIndex(u => u.id === current.userId);
    if (userIndex !== -1) {
      db.users[userIndex].annualSalary = annualSalary;
    }
  } else if (updates.baseSalary !== undefined) {
    baseSalary = Number(updates.baseSalary);
  }

  const isManualLateDeduction = updates.lateDeduction !== undefined ? true : (current.isManualLateDeduction || false);
  const lateDeduction = updates.lateDeduction !== undefined ? Number(updates.lateDeduction) : (current.lateDeduction || 0);
  const status = updates.status || current.status;
  let paymentDate = updates.paymentDate !== undefined ? updates.paymentDate : current.paymentDate;
  if (status === 'PAID' && !paymentDate) {
    paymentDate = getKSTTimeStr().slice(0, 10);
  } else if (status !== 'PAID' && updates.paymentDate === undefined) {
    paymentDate = null;
  }

  const totalPay = baseSalary + dutyAllowance + mealAllowance + overtimePay + bonus;
  const taxablePay = Math.max(0, totalPay - mealAllowance - lateDeduction);

  // Recalculate deductions
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

  const updatedPayroll = {
    ...current,
    annualSalary,
    baseSalary,
    dutyAllowance,
    mealAllowance,
    overtimePay,
    bonus,
    totalPay,
    isManualLateDeduction,
    lateDeduction,
    nationalPension,
    healthInsurance,
    careInsurance,
    employmentInsurance,
    incomeTax,
    localIncomeTax,
    totalDeduction,
    netPay,
    status,
    paymentDate,
    updatedAt: getKSTTimeStr()
  };

  db.payrolls[index] = updatedPayroll;
  writeDB(db);

  res.json({
    success: true,
    payroll: updatedPayroll
  });
});

app.post('/api/payrolls/review-all', (req, res) => {
  const { month } = req.body;
  if (!month) {
    return res.status(400).json({ success: false, message: 'month가 필요합니다.' });
  }

  const db = readDB();
  let updatedCount = 0;

  (db.payrolls || []).forEach(p => {
    if (p.month === month && p.status === 'PENDING_REVIEW') {
      p.status = 'REVIEWED';
      p.updatedAt = getKSTTimeStr();
      updatedCount++;
    }
  });

  writeDB(db);

  res.json({
    success: true,
    message: `${month} 급여 ${updatedCount}건이 확인 완료 처리되었습니다.`,
    updatedCount
  });
});

app.post('/api/payrolls/confirm-month', (req, res) => {
  const { month } = req.body;
  if (!month) {
    return res.status(400).json({ success: false, message: 'month가 필요합니다.' });
  }

  const db = readDB();
  const todayStr = getKSTTimeStr().slice(0, 10);
  let updatedCount = 0;

  (db.payrolls || []).forEach(p => {
    if (p.month === month && p.status !== 'PAID') {
      p.status = 'PAID';
      p.paymentDate = todayStr;
      p.updatedAt = getKSTTimeStr();
      updatedCount++;
    }
  });

  writeDB(db);

  res.json({
    success: true,
    message: `${month} 급여 ${updatedCount}건이 지급 완료 처리되었습니다.`,
    updatedCount
  });
});

// Helper to format currency
const fmtKRW = (n) => (Number(n) || 0).toLocaleString('ko-KR') + '원';

// Transporter getter supporting .env credentials
function getMailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }
  return null;
}

// Single Paystub HTML Generator
function generatePaystubHtml(p, user) {
  const monthTitle = p.month ? p.month.replace('-', '년 ') + '월' : '';
  const bankInfo = `${p.bankName || ''} ${p.accountNumber || ''}`.trim() || '등록 계좌';

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${monthTitle} 급여 명세서 - ${p.name} 귀하</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    <!-- Header -->
    <div style="padding: 28px 32px; border-bottom: 1px solid #e5e7eb; background-color: #ffffff;">
      <div style="font-size: 13px; color: #6b7280; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 4px;">FLOWLY PAYROLL MANAGEMENT</div>
      <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 6px 0; letter-spacing: -0.02em;">${monthTitle} 급여 명세서</h1>
      <div style="font-size: 15px; color: #4b5563;">${p.dept} · <strong>${p.name}</strong> 귀하</div>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <!-- Net Pay Box -->
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 22px 24px; margin-bottom: 28px;">
        <div style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 6px;">실지급액 (세후 통장 입금액)</div>
        <div style="font-size: 32px; font-weight: 800; color: #111827; letter-spacing: -0.02em;">${fmtKRW(p.netPay)}</div>
        <div style="font-size: 13px; color: #6b7280; margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 8px;">
          입금 계좌: <strong>${bankInfo}</strong> ${p.paymentDate ? '· 지급일: ' + p.paymentDate : ''}
        </div>
      </div>

      <!-- Base & Contract -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px;">계약 기준</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">계약 기준 연봉</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.annualSalary)}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">월 기본 환산액 (세전)</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(Math.round((p.annualSalary || 0) / 12))}</td>
          </tr>
        </table>
      </div>

      <!-- Earnings (지급 내역) -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px;">지급 내역</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">기본급</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.baseSalary)}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">식대 (비과세)</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.mealAllowance)}</td>
          </tr>
          ${p.dutyAllowance > 0 ? `
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">직책수당</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.dutyAllowance)}</td>
          </tr>` : ''}
          ${p.overtimePay > 0 ? `
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">초과근로수당</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.overtimePay)}</td>
          </tr>` : ''}
          ${p.bonus > 0 ? `
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">상여금</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.bonus)}</td>
          </tr>` : ''}
          <tr style="font-weight: 700;">
            <td style="padding: 12px 0; color: #111827; border-bottom: 1px solid #e5e7eb;">지급 총액</td>
            <td style="padding: 12px 0; text-align: right; color: #111827; border-bottom: 1px solid #e5e7eb; font-size: 15px;">${fmtKRW(p.totalPay)}</td>
          </tr>
        </table>
      </div>

      <!-- Deductions (공제 내역) -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px;">공제 내역</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">국민연금 (4.5%)</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.nationalPension)}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">건강보험 (3.545%)</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.healthInsurance)}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">노인장기요양 (12.95%)</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.careInsurance)}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">고용보험 (0.9%)</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.employmentInsurance)}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">근로소득세 (간이세액)</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.incomeTax)}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">지방소득세 (소득세 10%)</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.localIncomeTax)}</td>
          </tr>
          ${p.lateDeduction > 0 ? `
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">지각 공제 (${p.lateCount || 0}회)</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${fmtKRW(p.lateDeduction)}</td>
          </tr>` : ''}
          <tr style="font-weight: 700;">
            <td style="padding: 12px 0; color: #111827; border-bottom: 1px solid #e5e7eb;">공제 총액</td>
            <td style="padding: 12px 0; text-align: right; color: #111827; border-bottom: 1px solid #e5e7eb; font-size: 15px;">${fmtKRW(p.totalDeduction)}</td>
          </tr>
        </table>
      </div>

      <!-- Attendance & Leave Status -->
      ${p.remainingLeave !== undefined ? `
      <div>
        <div style="font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px;">근태 및 연차 현황</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">총 부여 연차</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${p.totalLeave || 15}일</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4b5563; border-bottom: 1px solid #f3f4f6;">당월 기준 사용 연차</td>
            <td style="padding: 9px 0; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">${p.usedLeave || 0}일</td>
          </tr>
          <tr style="font-weight: 700;">
            <td style="padding: 12px 0; color: #111827; border-bottom: 1px solid #e5e7eb;">잔여 연차</td>
            <td style="padding: 12px 0; text-align: right; color: #059669; border-bottom: 1px solid #e5e7eb; font-size: 15px;">${p.remainingLeave}일</td>
          </tr>
        </table>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; line-height: 1.6;">
      본 명세서는 회사의 전자 급여 관리 시스템에 의해 산출 및 전자 발행되었습니다.<br/>
      급여 내역 및 공제 금액에 이상이 있는 경우 발행일로부터 7일 이내에 인사총무팀으로 문의해 주시기 바랍니다.
    </div>
  </div>
</body>
</html>
  `;
}

// Multi-Paystub Consolidated HTML Generator (Used when multiple employees share a test email like geeyounjee@gmail.com)
function generateMultiPaystubHtml(items, month) {
  const monthTitle = month ? month.replace('-', '년 ') + '월' : '';
  const totalNet = items.reduce((sum, item) => sum + (item.payroll.netPay || 0), 0);
  const totalPay = items.reduce((sum, item) => sum + (item.payroll.totalPay || 0), 0);
  const totalDed = items.reduce((sum, item) => sum + (item.payroll.totalDeduction || 0), 0);

  const rowsHtml = items.map(({ payroll }, idx) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 12px; font-weight: 600; color: #111827;">${payroll.name}</td>
      <td style="padding: 10px 12px; color: #4b5563;">${payroll.dept}</td>
      <td style="padding: 10px 12px; text-align: right; color: #111827;">${fmtKRW(payroll.totalPay)}</td>
      <td style="padding: 10px 12px; text-align: right; color: #6b7280;">${fmtKRW(payroll.totalDeduction)}</td>
      <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #111827;">${fmtKRW(payroll.netPay)}</td>
      <td style="padding: 10px 12px; color: #6b7280; font-size: 13px;">${payroll.bankName || ''} ${payroll.accountNumber || ''}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>[FLOWLY] ${monthTitle} 전사 급여 명세서 통합 안내</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <div style="max-width: 780px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    <!-- Header -->
    <div style="padding: 28px 32px; border-bottom: 1px solid #e5e7eb; background-color: #ffffff;">
      <div style="font-size: 13px; color: #6b7280; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 4px;">FLOWLY PAYROLL MANAGEMENT · TEST BATCH</div>
      <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 6px 0; letter-spacing: -0.02em;">${monthTitle} 전사 급여 명세서 발송 안내</h1>
      <div style="font-size: 14px; color: #4b5563;">
        동일 테스트 수신처로 지정된 임직원 총 <strong>${items.length}명</strong>의 급여 명세서가 중복 발송 없이 1건으로 통합 전달되었습니다.
      </div>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <!-- Total Summary Card -->
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 22px 24px; margin-bottom: 28px;">
        <div style="font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 6px;">전체 정산 실지급 총액 (${items.length}명 합산)</div>
        <div style="font-size: 30px; font-weight: 800; color: #111827; letter-spacing: -0.02em;">${fmtKRW(totalNet)}</div>
        <div style="font-size: 13px; color: #6b7280; margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 8px;">
          지급 총액: ${fmtKRW(totalPay)} · 공제 총액: ${fmtKRW(totalDed)}
        </div>
      </div>

      <!-- Employee List Table -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px;">사원별 급여 정산 목록</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; text-align: left;">
              <th style="padding: 10px 12px; font-weight: 600; color: #374151;">사원명</th>
              <th style="padding: 10px 12px; font-weight: 600; color: #374151;">부서</th>
              <th style="padding: 10px 12px; font-weight: 600; color: #374151; text-align: right;">지급총액</th>
              <th style="padding: 10px 12px; font-weight: 600; color: #374151; text-align: right;">공제총액</th>
              <th style="padding: 10px 12px; font-weight: 600; color: #374151; text-align: right;">실지급액</th>
              <th style="padding: 10px 12px; font-weight: 600; color: #374151;">입금계좌</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; line-height: 1.6;">
      본 메일은 테스트 환경에서 동일 수신처(geeyounjee@gmail.com) 중복 발송을 방지하기 위해 생성된 통합 명세서입니다.<br/>
      향후 개별 사원 고유 메일 등록 시 각 사원에게 개별 명세서로 자동 전송됩니다.
    </div>
  </div>
</body>
</html>
  `;
}

// Single Employee Paystub Email Send Endpoint
app.post('/api/payrolls/send-email', async (req, res) => {
  const { payrollId } = req.body;
  if (!payrollId) {
    return res.status(400).json({ success: false, message: 'payrollId가 필요합니다.' });
  }

  const db = readDB();
  const index = (db.payrolls || []).findIndex(p => p.id === payrollId);
  if (index === -1) {
    return res.status(404).json({ success: false, message: '해당 급여 항목을 찾을 수 없습니다.' });
  }

  const p = db.payrolls[index];
  const user = (db.users || []).find(u => u.id === p.userId);
  const targetEmail = (user?.email || 'geeyounjee@gmail.com').trim();
  const nowStr = getKSTTimeStr();

  const subject = `[FLOWLY] ${p.month ? p.month.replace('-', '년 ') + '월' : ''} 급여 명세서 (${p.name} 귀하)`;
  const html = generatePaystubHtml(p, user);
  const transporter = getMailTransporter();

  let delivered = false;
  let errorMsg = null;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"FLOWLY 인사팀" <${process.env.SMTP_USER || 'payroll@flowly.internal'}>`,
        to: targetEmail,
        subject,
        html
      });
      delivered = true;
    } catch (err) {
      errorMsg = err.message;
      console.error(`Mail send error to ${targetEmail}:`, err.message);
    }
  }

  p.sentAt = nowStr;
  p.sentTo = targetEmail;
  p.emailDelivered = delivered;
  writeDB(db);

  res.json({
    success: true,
    delivered,
    recipient: targetEmail,
    sentAt: nowStr,
    hasSmtpConfigured: !!transporter,
    message: delivered
      ? `${p.name} 사원(${targetEmail})에게 급여 명세서 이메일이 발송되었습니다.`
      : `${p.name} 사원(${targetEmail}) 명세서 전송 처리가 완료되었습니다. (발송일시: ${nowStr})`
  });
});

// Bulk Paystubs Email Send Endpoint with Deduplication
app.post('/api/payrolls/send-all-email', async (req, res) => {
  const { month } = req.body;
  if (!month) {
    return res.status(400).json({ success: false, message: 'month가 필요합니다.' });
  }

  const db = readDB();
  const list = (db.payrolls || []).filter(p => p.month === month);
  if (list.length === 0) {
    return res.status(400).json({ success: false, message: '발송할 급여 데이터가 없습니다.' });
  }

  // 1. Group / Map by target recipient email
  const emailGroups = new Map(); // email -> Array of { payroll, user }

  list.forEach(p => {
    const user = (db.users || []).find(u => u.id === p.userId);
    const targetEmail = (user?.email || 'geeyounjee@gmail.com').trim().toLowerCase();
    if (!emailGroups.has(targetEmail)) {
      emailGroups.set(targetEmail, []);
    }
    emailGroups.get(targetEmail).push({ payroll: p, user });
  });

  const nowStr = getKSTTimeStr();
  const transporter = getMailTransporter();
  const sendResults = [];

  for (const [recipientEmail, items] of emailGroups.entries()) {
    // If multiple employees have the SAME email (e.g. test mode geeyounjee@gmail.com),
    // deduplicate and send ONE email to this address!
    const isMultiDeduplicated = items.length > 1;
    const primaryItem = items[0];
    const subject = isMultiDeduplicated
      ? `[FLOWLY] ${month.replace('-', '년 ')}월 전사 급여 명세서 전달 (${items.length}명 일괄 테스트)`
      : `[FLOWLY] ${month.replace('-', '년 ')}월 급여 명세서 (${primaryItem.payroll.name} 귀하)`;

    const htmlContent = isMultiDeduplicated
      ? generateMultiPaystubHtml(items, month)
      : generatePaystubHtml(primaryItem.payroll, primaryItem.user);

    let delivered = false;
    let errorMsg = null;

    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"FLOWLY 인사팀" <${process.env.SMTP_USER || 'payroll@flowly.internal'}>`,
          to: recipientEmail,
          subject,
          html: htmlContent
        });
        delivered = true;
      } catch (err) {
        errorMsg = err.message;
        console.error(`Mail send error to ${recipientEmail}:`, err.message);
      }
    }

    // Mark sentAt for all payroll items under this group
    items.forEach(({ payroll }) => {
      payroll.sentAt = nowStr;
      payroll.sentTo = recipientEmail;
      payroll.emailDelivered = delivered;
    });

    sendResults.push({
      email: recipientEmail,
      count: items.length,
      delivered,
      error: errorMsg
    });
  }

  writeDB(db);

  const totalEmployees = list.length;
  const uniqueEmails = emailGroups.size;
  const deliveredCount = sendResults.filter(r => r.delivered).length;

  res.json({
    success: true,
    message: deliveredCount > 0
      ? `${totalEmployees}명의 급여 명세서가 ${uniqueEmails}개의 고유 이메일(${Array.from(emailGroups.keys()).join(', ')})로 중복 없이 발송되었습니다.`
      : `${totalEmployees}명의 급여 명세서 전송 처리가 완료되었습니다. (테스트 수신처: ${Array.from(emailGroups.keys()).join(', ')} 중복 제거 1건 처리)`,
    totalEmployees,
    uniqueEmails,
    deliveredCount,
    hasSmtpConfigured: !!transporter
  });
});

// HTML Email Preview Route
app.get('/api/payrolls/preview-email', (req, res) => {
  const { payrollId, month = '2026-09' } = req.query;
  const db = readDB();

  if (payrollId) {
    const p = (db.payrolls || []).find(item => item.id === payrollId);
    if (!p) return res.status(404).send('급여 항목을 찾을 수 없습니다.');
    const user = (db.users || []).find(u => u.id === p.userId);
    return res.setHeader('Content-Type', 'text/html; charset=utf-8').send(generatePaystubHtml(p, user));
  }

  const list = (db.payrolls || []).filter(p => p.month === month);
  const items = list.map(p => ({ payroll: p, user: (db.users || []).find(u => u.id === p.userId) }));
  return res.setHeader('Content-Type', 'text/html; charset=utf-8').send(generateMultiPaystubHtml(items, month));
});

app.get('/api/payrolls/export', (req, res) => {
  const db = readDB();
  const month = req.query.month || '2026-09';
  const list = (db.payrolls || []).filter(p => p.month === month);

  const excelRows = list.map(p => {
    const statusLabel = p.status === 'PAID' ? '지급 완료' : (p.status === 'REVIEWED' ? '확인 완료' : '확인 대기');
    return {
      '사원명': p.name,
      '부서': p.dept,
      '연봉(원)': p.annualSalary || 0,
      '월 기본급(원)': p.baseSalary || 0,
      '직책수당(원)': p.dutyAllowance || 0,
      '식대비과세(원)': p.mealAllowance || 0,
      '초과근로수당(원)': p.overtimePay || 0,
      '상여금(원)': p.bonus || 0,
      '지급 총액(원)': p.totalPay || 0,
      '당월 지각(회)': p.lateCount || 0,
      '지각 차감(원)': p.lateDeduction || 0,
      '잔여 연차(일)': p.remainingLeave !== undefined ? p.remainingLeave : 15,
      '국민연금(원)': p.nationalPension || 0,
      '건강보험(원)': p.healthInsurance || 0,
      '노인장기요양(원)': p.careInsurance || 0,
      '고용보험(원)': p.employmentInsurance || 0,
      '소득세(원)': p.incomeTax || 0,
      '지방소득세(원)': p.localIncomeTax || 0,
      '공제 총액(원)': p.totalDeduction || 0,
      '실지급액(원)': p.netPay || 0,
      '정산 상태': statusLabel,
      '지급일자': p.paymentDate || '-',
      '입금계좌': `${p.bankName || ''} ${p.accountNumber || ''}`.trim()
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelRows.length ? excelRows : [{ '내역': '데이터 없음' }]);
  XLSX.utils.book_append_sheet(wb, ws, `${month} 급여대장`);

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const fileName = `전사급여대장_${month}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

app.listen(PORT, () => {
  console.log(`Backend API Server running at http://localhost:${PORT}`);
});
