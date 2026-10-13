import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import InitialProfileSetupModal from './components/InitialProfileSetupModal';
import QuickMenuHub from './components/QuickMenuHub';
import AdminPortal from './components/AdminPortal';
import EmployeePortal from './components/EmployeePortal';
import ClientPortal from './components/ClientPortal';
import NotificationsView from './components/NotificationsView';
import TasksListView from './components/TasksListView';
import AdminContactView from './components/AdminContactView';
import SettingsView from './components/SettingsView';
import ModalStyleTestPage from './components/ModalStyleTestPage';
import { playNotificationSound } from './utils/audio';

// Session duration: 12 hours (Workday TTL Session Policy)
const SESSION_DURATION = 12 * 60 * 60 * 1000;

const getInitialUser = () => {
  try {
    const savedUserStr = localStorage.getItem('ws_user');
    const expiryStr = localStorage.getItem('ws_session_expiry');
    if (!savedUserStr || !expiryStr) return null;

    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) {
      localStorage.removeItem('ws_user');
      localStorage.removeItem('ws_session_expiry');
      localStorage.removeItem('ws_last_active');
      return null;
    }
    return JSON.parse(savedUserStr);
  } catch (err) {
    console.error('Failed to parse saved session:', err);
    return null;
  }
};

const saveUserSession = (userData) => {
  const now = Date.now();
  localStorage.setItem('ws_user', JSON.stringify(userData));
  localStorage.setItem('ws_session_expiry', String(now + SESSION_DURATION));
  localStorage.setItem('ws_last_active', String(now));
};

const clearUserSession = () => {
  localStorage.removeItem('ws_user');
  localStorage.removeItem('ws_session_expiry');
  localStorage.removeItem('ws_last_active');
};

export default function App() {
  // Authentication State with Workday Session Persistence (12h TTL)
  const [user, setUser] = useState(getInitialUser);
  
  // Navigation View State: 'HUB', 'COMMUTE', 'CLIENT_REQUESTS', 'PROJECTS', 'NOTIFICATIONS', 'CALENDAR_LEAVE', 'SETTINGS', 'ADMIN_CONTACT'
  const [currentView, setCurrentView] = useState('HUB');
  const [previousView, setPreviousView] = useState('HUB');
  const [isDirectModalTest, setIsDirectModalTest] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.search.includes('test=modal') || window.location.hash === '#modal-styles';
    }
    return false;
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#modal-styles' || window.location.search.includes('test=modal')) {
        setIsDirectModalTest(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);



  // Theme State
  const [theme, setTheme] = useState(() => {
    const initialUser = getInitialUser();
    if (initialUser?.preferences?.theme) return initialUser.preferences.theme;
    if (initialUser?.id && localStorage.getItem(`ws_theme_${initialUser.id}`)) {
      return localStorage.getItem(`ws_theme_${initialUser.id}`);
    }
    return localStorage.getItem('ws_theme') || 'dark';
  });

  // App Data States
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [files, setFiles] = useState([]);
  const [targetScheduleId, setTargetScheduleId] = useState(null);
  const [targetRequestId, setTargetRequestId] = useState(null);
  const [openLeaveHistory, setOpenLeaveHistory] = useState(false);
  const [targetLeaveId, setTargetLeaveId] = useState(null);
  const [targetAdminSubtab, setTargetAdminSubtab] = useState('accounts');

  // Toast System
  const [toasts, setToasts] = useState([]);
  const [showLeaveCancelModal, setShowLeaveCancelModal] = useState(false);
  const [toastPosition, setToastPosition] = useState(
    () => localStorage.getItem('ws_toast_position') || 'top-right'
  );

  const handleToastPositionChange = (pos) => {
    setToastPosition(pos);
    localStorage.setItem('ws_toast_position', pos);
    if (user) {
      localStorage.setItem(`ws_toast_position_${user.id}`, pos);
      setUser(prev => prev ? { ...prev, preferences: { ...prev.preferences, toastPosition: pos } } : prev);
      fetch(`/api/users/${user.id}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toastPosition: pos })
      }).catch(err => console.error('Failed to save toast position preference:', err));
    }
  };

  // Apply Theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ws_theme', theme);
  }, [theme]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('ws_theme', newTheme);
    if (user) {
      localStorage.setItem(`ws_theme_${user.id}`, newTheme);
      setUser(prev => prev ? { ...prev, preferences: { ...prev.preferences, theme: newTheme } } : prev);
      fetch(`/api/users/${user.id}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
      }).catch(err => console.error('Failed to save theme preference:', err));
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    handleThemeChange(nextTheme);
  };

  const showToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(prev => {
      const nextUser = { ...prev, ...updatedUser };
      saveUserSession(nextUser);
      return nextUser;
    });
    setEmployees(prev => prev.map(emp => emp.id === updatedUser.id ? { ...emp, ...updatedUser } : emp));
  };

  // Timezone-safe local date string (YYYY-MM-DD)
  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load User Specific Data
  const loadAppData = async (currentUser) => {
    if (!currentUser) return;

    try {
      const today = getTodayStr();
      
      const [attRes, schRes, tskRes, empRes, cliRes, annoRes, notifRes, lvRes, filesRes, reqsRes] = await Promise.all([
        currentUser.role !== 'CLIENT' ? fetch(`/api/attendances?userId=${currentUser.id}&date=${today}`).then(r => r.json()) : Promise.resolve([]),
        currentUser.role !== 'CLIENT' ? fetch('/api/schedules').then(r => r.json()) : Promise.resolve([]),
        currentUser.role !== 'CLIENT' ? fetch('/api/tasks').then(r => r.json()) : Promise.resolve([]),
        currentUser.role !== 'CLIENT' ? fetch('/api/employees').then(r => r.json()) : Promise.resolve([]),
        fetch('/api/clients').then(r => r.json()),
        fetch('/api/announcements').then(r => r.json()),
        fetch(`/api/notifications?userId=${currentUser.id}`).then(r => r.json()),
        currentUser.role !== 'CLIENT' ? fetch('/api/leaves').then(r => r.json()) : Promise.resolve([]),
        fetch('/api/files').then(r => r.json()).catch(() => []),
        fetch('/api/client-requests').then(r => r.json()).catch(() => [])
      ]);

      if (currentUser.role !== 'CLIENT') {
        const todayAtt = Array.isArray(attRes) && attRes.length > 0 ? attRes[0] : null;
        setTodayAttendance(todayAtt);
        setSchedules(Array.isArray(schRes) ? schRes : []);
        setTasks(Array.isArray(tskRes) ? tskRes : []);
        setEmployees(Array.isArray(empRes) ? empRes : []);
        setLeaves(Array.isArray(lvRes) ? lvRes : []);

        // Sync fresh user session info with latest employee profile
        if (Array.isArray(empRes)) {
          const freshUser = empRes.find(e => e.id === currentUser.id);
          if (freshUser) {
            setUser(prev => {
              if (!prev) return prev;
              const merged = { ...prev, ...freshUser };
              saveUserSession(merged);
              return merged;
            });
          }
        }
      }
      setClients(Array.isArray(cliRes) ? cliRes : []);
      setClientRequests(Array.isArray(reqsRes) ? reqsRes : []);
      setAnnouncements(Array.isArray(annoRes) ? annoRes : []);
      setNotifications(Array.isArray(notifRes) ? notifRes : []);
      setFiles(Array.isArray(filesRes) ? filesRes : []);
    } catch (err) {
      console.error('Error loading app data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadAppData(user);

      // Load user-specific preferences (priority: DB preferences -> user-specific localStorage -> default)
      const userToastPos = user.preferences?.toastPosition || 
                           localStorage.getItem(`ws_toast_position_${user.id}`) || 
                           'top-right';
      const userTheme = user.preferences?.theme || 
                        localStorage.getItem(`ws_theme_${user.id}`) || 
                        'dark';

      setToastPosition(userToastPos);
      setTheme(userTheme);
      localStorage.setItem(`ws_toast_position_${user.id}`, userToastPos);
      localStorage.setItem(`ws_theme_${user.id}`, userTheme);
      localStorage.setItem('ws_toast_position', userToastPos);
      localStorage.setItem('ws_theme', userTheme);
    }
  }, [user?.id]);

  // Real-time polling for client requests (요청관리 신규 알림 즉시 감지)
  useEffect(() => {
    if (!user) return;
    const reqPollInterval = setInterval(() => {
      fetch('/api/client-requests')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setClientRequests(data);
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(reqPollInterval);
  }, [user?.id]);

  // Session activity & expiration listener (업무 시간 기준 12시간 TTL 세션 관리)
  useEffect(() => {
    if (!user) return;

    // Check expiration periodically (every minute)
    const intervalId = setInterval(() => {
      const expiryStr = localStorage.getItem('ws_session_expiry');
      if (expiryStr) {
        const expiry = parseInt(expiryStr, 10);
        if (!isNaN(expiry) && Date.now() > expiry) {
          clearUserSession();
          setUser(null);
          setTodayAttendance(null);
          setCurrentView('HUB');
          showToast('세션 만료', '로그인 세션이 만료되었습니다. 다시 로그인해주세요.', 'info');
        }
      }
    }, 60000);

    // Activity tracking: throttle updates to once every 5 minutes on user interaction
    let lastRecordedActivity = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastRecordedActivity > 5 * 60 * 1000) {
        lastRecordedActivity = now;
        localStorage.setItem('ws_session_expiry', String(now + SESSION_DURATION));
        localStorage.setItem('ws_last_active', String(now));
      }
    };

    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [user?.id]);

  // Today & Leave Computations
  const todayStr = getTodayStr();

  // Check today's pre-approved remote/field work
  const todayApprovedRemoteField = leaves.find(l => 
    l.userId === user?.id &&
    l.status === 'APPROVED' &&
    todayStr >= l.startDate &&
    todayStr <= (l.endDate || l.startDate) &&
    (l.leaveType === 'REMOTE' || l.leaveType === 'FIELD')
  );
  const todayApprovedWorkType = todayApprovedRemoteField?.leaveType || null; // 'REMOTE' | 'FIELD' | null

  // Check today's approved leave (연차, 반차, 병가, 경조사 등)
  const todayLeave = leaves.find(l => 
    l.userId === user?.id &&
    (l.status === 'APPROVED' || l.status === 'CANCEL_REQUESTED') &&
    todayStr >= l.startDate &&
    todayStr <= (l.endDate || l.startDate) &&
    ['ANNUAL', 'HALF_AM', 'HALF_PM', 'SICK', 'SPECIAL', 'ETC'].includes(l.leaveType)
  );

  const isAmHalfLeave = !!(todayLeave && (todayLeave.timeSlot === 'AM' || todayLeave.leaveType === 'HALF_AM'));
  const isPmHalfLeave = !!(todayLeave && (todayLeave.timeSlot === 'PM' || todayLeave.leaveType === 'HALF_PM'));
  const isHalfDayLeave = isAmHalfLeave || isPmHalfLeave;

  // 종일 휴가인 경우에만 true (반차는 출근 대상이므로 제외)
  const isTodayFullDayLeave = !!(todayLeave && !isHalfDayLeave && 
    (
      todayLeave.leaveType === 'SICK' ||
      todayLeave.leaveType === 'SPECIAL' ||
      todayLeave.leaveType === 'ETC' ||
      todayLeave.timeSlot === 'ALL' ||
      (todayLeave.leaveType === 'ANNUAL' && todayLeave.timeSlot !== 'AM' && todayLeave.timeSlot !== 'PM')
    )
  );

  // Attendance Handlers
  const handleCheckIn = async (workType = 'OFFICE', reason = '') => {
    // If user has an approved full-day leave today, show confirmation modal
    // (Half-day leaves do NOT block check-in)
    if (todayLeave && todayLeave.status === 'APPROVED' && isTodayFullDayLeave) {
      setShowLeaveCancelModal(true);
      return;
    }


    try {
      const res = await fetch('/api/attendances/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, workType, reason })
      });
      const data = await res.json();

      if (data.success) {
        setTodayAttendance(data.attendance);
        if (user) await loadAppData(user);
        showToast('출근 완료', '출근 처리 되었습니다.', 'success');
      } else {
        showToast('출근 처리 실패', data.message || '출근 처리에 실패했습니다.', 'danger');
      }
    } catch (err) {
      showToast('네트워크 오류', '출근 처리 중 오류가 발생했습니다.', 'danger');
    }
  };

  const handleConfirmLeaveCancelCheckIn = async () => {
    setShowLeaveCancelModal(false);
    if (!todayLeave) return;

    try {
      // 1. Send leave cancellation request
      const cancelRes = await fetch(`/api/leaves/${todayLeave.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCEL_REQUESTED',
          rejectReason: '당일 출근으로 인한 연차 취소 신청'
        })
      });
      const cancelData = await cancelRes.json();
      if (!cancelData.success) {
        showToast('연차 취소 실패', cancelData.message || '연차 취소 요청 중 오류가 발생했습니다.', 'danger');
        return;
      }

      // 2. Perform check-in
      const res = await fetch('/api/attendances/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, workType: 'OFFICE', reason: '당일 연차 취소 출근' })
      });
      const data = await res.json();

      if (data.success) {
        setTodayAttendance(data.attendance);
        if (user) await loadAppData(user);
        showToast('연차 취소 신청 및 출근 완료', '연차 취소 신청이 접수되었으며, 정상 출근 처리되었습니다.', 'success');
      } else {
        showToast('출근 처리 실패', data.message || '출근 처리에 실패했습니다.', 'danger');
      }
    } catch (err) {
      showToast('네트워크 오류', '출근 처리 중 오류가 발생했습니다.', 'danger');
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) return;
    try {
      const res = await fetch('/api/attendances/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, attendanceId: todayAttendance.id })
      });
      const data = await res.json();

      if (data.success) {
        setTodayAttendance(data.attendance);
        if (user) await loadAppData(user);
        const msg = data.message || '퇴근 처리 되었습니다.';
        showToast('퇴근 완료', msg, 'success');
      } else {
        showToast('퇴근 처리 실패', data.message || '퇴근 처리에 실패했습니다.', 'danger');
      }
    } catch (err) {
      showToast('퇴근 처리 실패', '퇴근 처리 중 오류가 발생했습니다.', 'danger');
    }
  };

  const handleStatusToggle = async (status) => {
    if (!todayAttendance) return;
    try {
      const res = await fetch(`/api/attendances/${todayAttendance.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setTodayAttendance(data.attendance);
        showToast('상태 변경', `근무 상태가 [${status === 'AWAY' ? '자리비움' : '근무 중'}]으로 변경되었습니다.`);
      }
    } catch (err) {
      showToast('오류', '상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleLinkFilesToSchedule = (scheduleId, fileIds) => {
    setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, fileIds } : s));
    setFiles(prev => prev.map(f => {
      let fSchedIds = Array.isArray(f.scheduleIds) ? [...f.scheduleIds] : (f.scheduleId ? [f.scheduleId] : []);
      if (fileIds.includes(f.id)) {
        if (!fSchedIds.includes(scheduleId)) fSchedIds.push(scheduleId);
      } else {
        fSchedIds = fSchedIds.filter(sId => sId !== scheduleId);
      }
      return { ...f, scheduleIds: fSchedIds, scheduleId: fSchedIds[0] || null };
    }));
  };

  const handleUploadFile = (newFile) => {
    setFiles(prev => [newFile, ...prev.filter(f => f.id !== newFile.id)]);
    if (user) loadAppData(user);
  };

  const handleDeleteFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (user) loadAppData(user);
  };

  // Schedule Handlers
  const handleAddSchedule = async (scheduleData) => {
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...scheduleData, authorId: user.id, authorName: user.name || user.managerName })
      });
      const data = await res.json();
      if (data.success) {
        setSchedules(prev => [...prev, data.schedule]);
        showToast('일정 등록', `'${scheduleData.title}' 일정이 등록되었습니다.`, 'success');
        return true;
      }
    } catch (err) {
      showToast('일정 등록 실패', '오류가 발생했습니다.', 'danger');
    }
    return false;
  };

  const handleDeleteSchedule = async (id) => {
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSchedules(prev => prev.filter(s => s.id !== id));
        showToast('일정 삭제', '일정이 삭제되었습니다.');
      }
    } catch (err) {
      showToast('삭제 실패', '일정 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateSchedule = async (id, scheduleData) => {
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scheduleData,
          updatedById: user?.id,
          updatedByName: user?.name || user?.managerName
        })
      });
      const data = await res.json();
      if (data.success) {
        setSchedules(prev => prev.map(s => s.id === id ? data.schedule : s));
        showToast('일정 수정', `'${scheduleData.title}' 일정이 수정되었습니다.`, 'success');
        return true;
      }
    } catch (err) {
      showToast('일정 수정 실패', '오류가 발생했습니다.', 'danger');
    }
    return false;
  };

  // Task Handlers
  const handleAddTask = async (taskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, authorId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => [data.task, ...prev]);
        showToast('업무 생성', `'${taskData.title}' 업무가 등록되었습니다.`, 'success');
        return true;
      }
    } catch (err) {
      showToast('업무 생성 실패', '오류가 발생했습니다.', 'danger');
    }
    return false;
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? data.task : t));
      }
    } catch (err) {
      showToast('상태 변경 실패', '업무 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // Notification Handlers
  const handleReadNotification = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleReadAllNotifications = async () => {
    if (!user) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      showToast('알림 확인', '모든 알림을 읽음 처리하였습니다.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNavigateFromNotification = (notif) => {
    if (!notif) return;
    if (!notif.isRead) {
      handleReadNotification(notif.id);
    }

    const link = notif.link?.toLowerCase() || '';
    const type = notif.type?.toUpperCase() || '';
    const tId = notif.targetId || notif.requestId || null;

    // 0. Admin & Team Leader notifications (결재 대기, 고객사 관리 등 라우팅)
    if (user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER') {
      if (type === 'LEAVE_REQUEST' || type === 'LEAVE_CANCEL_REQUEST' || link === 'admin_approvals') {
        setOpenLeaveHistory(false);
        setTargetScheduleId(null);
        setTargetRequestId(null);
        setTargetAdminSubtab('approvals');
        setCurrentView('ADMIN');
        return;
      }
      if (link === 'admin_clients' || type.includes('CLIENT_REGISTER')) {
        setOpenLeaveHistory(false);
        setTargetScheduleId(null);
        setTargetRequestId(null);
        setTargetAdminSubtab('clients');
        setCurrentView('ADMIN');
        return;
      }
      if (link === 'admin_networks') {
        setOpenLeaveHistory(false);
        setTargetScheduleId(null);
        setTargetRequestId(null);
        setTargetAdminSubtab('networks');
        setCurrentView('ADMIN');
        return;
      }
      if (link === 'admin_attendances') {
        setOpenLeaveHistory(false);
        setTargetScheduleId(null);
        setTargetRequestId(null);
        setTargetAdminSubtab('attendances');
        setCurrentView('ADMIN');
        return;
      }
    }

    // 1. Leave notifications (사원 본인 휴가 신청 내역, 승인/반려 안내 -> 신청 내역 드로어 활성화)
    if (type.includes('LEAVE') || link === 'leave_history' || link === 'leaves') {
      setTargetScheduleId(null);
      setTargetRequestId(null);
      setTargetLeaveId(tId);
      setOpenLeaveHistory(true);
      setCurrentView('CALENDAR_LEAVE');
      return;
    }

    // 2. Calendar / Schedule / Meeting (회의 일정, 전사 일정 연계 -> 캘린더 드로어 활성화)
    if (link === 'calendar' || type.includes('SCHEDULE') || type.includes('MEETING')) {
      setOpenLeaveHistory(false);
      setTargetLeaveId(null);
      let resolvedScheduleId = tId;
      if (!resolvedScheduleId) {
        // Fallback for legacy notifications: match schedule by date and applicant/title
        const dateMatch = notif.message?.match(/\d{4}-\d{2}-\d{2}/);
        if (dateMatch) {
          const dateStr = dateMatch[0];
          const match = schedules.find(s => {
            const sDate = s.startDate?.slice(0, 10);
            if (sDate !== dateStr) return false;
            if (notif.targetUserId && s.authorId === notif.targetUserId && (s.category === 'LEAVE' || s.leaveId)) return true;
            if (s.title && notif.message.includes(s.title)) return true;
            if (s.authorName && notif.message.includes(s.authorName)) return true;
            if (s.category === 'LEAVE' || s.leaveId) return true;
            return false;
          });
          if (match) resolvedScheduleId = match.id;
        }
      }

      setTargetRequestId(null);
      setTargetScheduleId(resolvedScheduleId);
      setCurrentView('CALENDAR_LEAVE');
    } 
    // 3. Client Requests (고객사 요청글 연계 -> 요청관리 상세 패널 활성화)
    else if (link === 'client_requests' || type.includes('CLIENT') || type.includes('REQUEST') || type.includes('COMMENT')) {
      setOpenLeaveHistory(false);
      setTargetLeaveId(null);
      setTargetScheduleId(null);

      let resolvedRequestId = tId;
      if (!resolvedRequestId && notif.message && clientRequests.length > 0) {
        const match = clientRequests.find(r => r.title && (notif.message.includes(`[${r.title}]`) || notif.message.includes(r.title)));
        if (match) {
          resolvedRequestId = match.id;
        }
      }

      setTargetRequestId(resolvedRequestId);
      setCurrentView('CLIENT_REQUESTS');
    } 
    // 4. Tasks (업무 관리)
    else if (link === 'tasks' || type.includes('TASK') || type.includes('PROJECT')) {
      setOpenLeaveHistory(false);
      setTargetLeaveId(null);
      setTargetScheduleId(null);
      setTargetRequestId(null);
      setCurrentView('PROJECTS');
    } 
    // 5. Commute (출퇴근 단독)
    else if (link === 'commute' || type.includes('ATTEND')) {
      setOpenLeaveHistory(false);
      setTargetLeaveId(null);
      setTargetScheduleId(null);
      setTargetRequestId(null);
      setCurrentView('COMMUTE');
    } 
    // 6. Settings / Announcements
    else if (link === 'settings' || type.includes('ANNOUNCE')) {
      setOpenLeaveHistory(false);
      setTargetLeaveId(null);
      setTargetScheduleId(null);
      setTargetRequestId(null);
      setCurrentView('SETTINGS');
    } else {
      setOpenLeaveHistory(false);
      setTargetLeaveId(null);
      setTargetScheduleId(null);
      setTargetRequestId(null);
      setCurrentView('HUB');
    }
  };

  const handleResetAttendance = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/attendances/reset-today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        setTodayAttendance(null);
        showToast('초기화 완료', '당일 출근 기록이 초기화되었습니다.', 'info');
      }
    } catch (err) {
      showToast('오류', '초기화 처리 중 오류가 발생했습니다.', 'danger');
    }
  };

  const handleLogout = () => {
    if (user?.id) {
      const sessionId = sessionStorage.getItem('app_session_id');
      const device = sessionStorage.getItem('app_device_env');
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, sessionId, device })
      }).catch(err => console.error('Logout log error:', err));
    }
    sessionStorage.removeItem('app_session_id');
    sessionStorage.removeItem('app_device_env');
    clearUserSession();
    setUser(null);
    setTodayAttendance(null);
    setCurrentView('HUB');
  };

  const unreadNotifsCount = notifications.filter(n => !n.isRead).length;
  const activeTasksCount = user ? (
    (tasks || []).filter(t => (t.assigneeId === user.id || (!t.assigneeId && t.dept === user.dept)) && t.status !== 'DONE').length +
    (clientRequests || []).filter(cr => (cr.assignedTasks || []).some(at => (at.assigneeId === user.id || at.staffId === user.id) && at.status !== 'COMPLETED')).length +
    (schedules || []).filter(s => (s.authorId === user.id || (Array.isArray(s.attendeeIds) && s.attendeeIds.includes(user.id))) && !s.isDone).length
  ) : 0;


  return (
    <div className="app-container">
      
      {/* Toast Notification Stack */}
      <div className={`toast-container position-${toastPosition}`}>
        {toasts.map(toast => (
          <div key={toast.id} className="toast-card">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                {toast.title}
              </div>
              <div className="text-secondary" style={{ fontSize: '16px' }}>
                {toast.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Standalone Modal Style Test Page view (accessible via #modal-styles or ?test=modal or currentView === 'MODAL_STYLES') */}
      {(currentView === 'MODAL_STYLES' || isDirectModalTest) ? (
        <ModalStyleTestPage
          onBack={() => {
            setIsDirectModalTest(false);
            window.location.hash = '';
            if (window.location.search.includes('test=modal')) {
              window.history.replaceState(null, '', window.location.pathname);
            }
            setCurrentView(user ? 'HUB' : 'LOGIN');
          }}
        />
      ) : !user ? (
        <LoginModal 
          onLoginSuccess={(loggedInUser, sessionId, device) => {
            if (sessionId) sessionStorage.setItem('app_session_id', sessionId);
            if (device) sessionStorage.setItem('app_device_env', device);
            saveUserSession(loggedInUser);
            const userToastPos = loggedInUser.preferences?.toastPosition || 
                                 localStorage.getItem(`ws_toast_position_${loggedInUser.id}`) || 
                                 'top-right';
            const userTheme = loggedInUser.preferences?.theme || 
                              localStorage.getItem(`ws_theme_${loggedInUser.id}`) || 
                              'dark';
            setToastPosition(userToastPos);
            setTheme(userTheme);
            document.documentElement.setAttribute('data-theme', userTheme);
            setUser(loggedInUser);
            setCurrentView('HUB');
          }} 
        />
      ) : user.role !== 'CLIENT' && user.role !== 'ADMIN' && (!user.dept || user.dept === '소속 미배정' || user.dept === '미배정') ? (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: 'var(--bg-main)'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '2.75rem 2.25rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem'
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
              부서 배정 대기
            </h2>
            <div style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, fontWeight: 400 }}>
              {user.name} 사원님은 아직 소속 부서가 배정되지 않았습니다.<br />
              관리자의 부서 배정 완료 후 개인정보 등록을 거쳐 사내 시스템을 이용하실 수 있습니다.
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLogout}
              style={{ height: '42px', padding: '0 1.5rem', fontSize: '15px', fontWeight: 400, marginTop: '0.5rem' }}
            >
              로그아웃
            </button>
          </div>
        </div>
      ) : user.role !== 'CLIENT' && (user.needsProfileSetup || (user.firstLogin && (!user.phone || !user.email))) ? (
        <InitialProfileSetupModal
          user={user}
          onComplete={(updatedUser) => {
            saveUserSession(updatedUser);
            setUser(updatedUser);
            showToast('등록 완료', '정보가 등록되었습니다.', 'success');
          }}
          onLogout={handleLogout}
        />
      ) : (
        <>
          {/* Streamlined Minimal Monochrome Header */}
          <Navbar 
            user={user}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={toggleTheme}
            onGoHome={() => setCurrentView('HUB')}
            currentView={currentView}
            unreadNotifsCount={unreadNotifsCount}
            activeTasksCount={activeTasksCount}
            onOpenNotifications={() => {
              if (currentView === 'NOTIFICATIONS') {
                setCurrentView(previousView || 'HUB');
              } else {
                setPreviousView(currentView);
                setCurrentView('NOTIFICATIONS');
              }
            }}
            onOpenTasksList={() => {
              if (currentView === 'TASKS_LIST') {
                setCurrentView(previousView || 'HUB');
              } else {
                setPreviousView(currentView);
                setCurrentView('TASKS_LIST');
              }
            }}
          />

          {/* Main Content Area */}
          <main className="main-content">
            
            {/* VIEW 1: HUB (Quick Menu Cards) */}
            {currentView === 'HUB' && (
              <QuickMenuHub 
                user={user}
                attendance={todayAttendance}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onNavigate={(viewName) => {
                  if (viewName === 'ADMIN') {
                    setTargetAdminSubtab(user?.role === 'ADMIN' ? 'accounts' : 'approvals');
                  }
                  setCurrentView(viewName);
                }}
                unreadNotifsCount={unreadNotifsCount}
                pendingRequestsCount={clientRequests.filter(r => r.status === 'REQUESTED').length}
                activeRequestsCount={clients.length}
                pendingTasksCount={tasks.filter(t => t.status !== 'DONE').length}
                remainingLeave={user.remainingLeave !== undefined ? user.remainingLeave : (user.totalLeave !== undefined ? Math.max(0, user.totalLeave - (user.usedLeave || 0)) : 0)}
                approvedWorkType={todayApprovedWorkType}
                todayLeave={todayLeave}
                isTodayFullDayLeave={isTodayFullDayLeave}
                isAmHalfLeave={isAmHalfLeave}
                isPmHalfLeave={isPmHalfLeave}
              />
            )}

            {/* VIEW 2: COMMUTE & ATTENDANCE */}
            {currentView === 'COMMUTE' && (
              <EmployeePortal
                user={user}
                attendance={todayAttendance}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onStatusToggle={handleStatusToggle}
                schedules={schedules}
                tasks={tasks}
                employees={employees}
                clients={clients}
                announcements={announcements}
                files={files}
                onAddSchedule={handleAddSchedule}
                onUpdateSchedule={handleUpdateSchedule}
                onDeleteSchedule={handleDeleteSchedule}
                onAddTask={handleAddTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onUploadFile={handleUploadFile}
                onDeleteFile={handleDeleteFile}
                onLinkFilesToSchedule={handleLinkFilesToSchedule}
                onShowToast={showToast}
                onRefresh={() => loadAppData(user)}
                initialTab="commute"
                onGoHome={() => setCurrentView('HUB')}
                approvedWorkType={todayApprovedWorkType}
                todayLeave={todayLeave}
                isTodayFullDayLeave={isTodayFullDayLeave}
                isAmHalfLeave={isAmHalfLeave}
                isPmHalfLeave={isPmHalfLeave}
                toastPosition={toastPosition}
                onToastPositionChange={handleToastPositionChange}
                theme={theme}
                onToggleTheme={toggleTheme}
                onUpdateUser={handleUpdateUser}
              />
            )}

            {/* VIEW 3: CLIENT REQUESTS (요청관리) */}
            {currentView === 'CLIENT_REQUESTS' && (
              user.role === 'CLIENT' ? (
                <ClientPortal 
                  user={user} 
                  onShowToast={showToast}
                  onGoHome={() => setCurrentView('HUB')}
                  onUpdateUser={(updatedUser) => setUser(updatedUser)}
                  targetRequestId={targetRequestId}
                  onClearTargetRequestId={() => setTargetRequestId(null)}
                />
              ) : (
                <EmployeePortal
                  user={user}
                  attendance={todayAttendance}
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                  onStatusToggle={handleStatusToggle}
                  schedules={schedules}
                  tasks={tasks}
                  employees={employees}
                  clients={clients}
                  announcements={announcements}
                  files={files}
                  onAddSchedule={handleAddSchedule}
                  onUpdateSchedule={handleUpdateSchedule}
                  onDeleteSchedule={handleDeleteSchedule}
                  onAddTask={handleAddTask}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onUploadFile={handleUploadFile}
                  onDeleteFile={handleDeleteFile}
                  onLinkFilesToSchedule={handleLinkFilesToSchedule}
                  onShowToast={showToast}
                  onRefresh={() => loadAppData(user)}
                  initialTab="client_requests"
                  targetRequestId={targetRequestId}
                  onClearTargetRequestId={() => setTargetRequestId(null)}
                  initialClientRequests={clientRequests}
                  onGoHome={() => setCurrentView('HUB')}
                  approvedWorkType={todayApprovedWorkType}
                  todayLeave={todayLeave}
                  isTodayFullDayLeave={isTodayFullDayLeave}
                  isAmHalfLeave={isAmHalfLeave}
                  isPmHalfLeave={isPmHalfLeave}
                  toastPosition={toastPosition}
                  onToastPositionChange={handleToastPositionChange}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onUpdateUser={handleUpdateUser}
                />
              )
            )}

            {/* VIEW 4: PROJECTS (프로젝트 관리) */}
            {currentView === 'PROJECTS' && (
              <EmployeePortal
                user={user}
                attendance={todayAttendance}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onStatusToggle={handleStatusToggle}
                schedules={schedules}
                tasks={tasks}
                employees={employees}
                clients={clients}
                announcements={announcements}
                files={files}
                onAddSchedule={handleAddSchedule}
                onUpdateSchedule={handleUpdateSchedule}
                onDeleteSchedule={handleDeleteSchedule}
                onAddTask={handleAddTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onUploadFile={handleUploadFile}
                onDeleteFile={handleDeleteFile}
                onLinkFilesToSchedule={handleLinkFilesToSchedule}
                onShowToast={showToast}
                onRefresh={() => loadAppData(user)}
                initialTab="tasks"
                onGoHome={() => setCurrentView('HUB')}
                approvedWorkType={todayApprovedWorkType}
                todayLeave={todayLeave}
                isTodayFullDayLeave={isTodayFullDayLeave}
                isAmHalfLeave={isAmHalfLeave}
                isPmHalfLeave={isPmHalfLeave}
                toastPosition={toastPosition}
                onToastPositionChange={handleToastPositionChange}
                theme={theme}
                onToggleTheme={toggleTheme}
                onUpdateUser={handleUpdateUser}
              />
            )}

            {/* VIEW 5: NOTIFICATIONS (알림) */}
            {currentView === 'NOTIFICATIONS' && (
              <NotificationsView 
                notifications={notifications}
                onReadNotification={handleReadNotification}
                onReadAllNotifications={handleReadAllNotifications}
                onDeleteNotification={handleDeleteNotification}
                onNavigate={handleNavigateFromNotification}
                onGoHome={() => setCurrentView(previousView || 'HUB')}
              />
            )}

            {/* VIEW: TASKS_LIST (업무 목록) */}
            {currentView === 'TASKS_LIST' && (
              <TasksListView
                user={user}
                tasks={tasks}
                schedules={schedules}
                clientRequests={clientRequests}
                employees={employees}
                onAddTask={handleAddTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onRefresh={() => loadAppData(user)}
                onShowToast={showToast}
                onNavigateItem={(item) => {
                  setOpenLeaveHistory(false);
                  setTargetScheduleId(null);
                  setTargetLeaveId(null);

                  if (item.sourceType === 'CLIENT_REQUEST') {
                    setTargetRequestId(item.rawId);
                    setCurrentView('CLIENT_REQUESTS');
                  } else if (item.sourceType === 'TASK' && !item.isDirectTask) {
                    setTargetRequestId(null);
                    setCurrentView('PROJECTS');
                  }
                }}
              />
            )}


            {/* VIEW: FILES (파일 관리) */}
            {currentView === 'FILES' && (
              <EmployeePortal
                user={user}
                attendance={todayAttendance}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onStatusToggle={handleStatusToggle}
                schedules={schedules}
                tasks={tasks}
                employees={employees}
                clients={clients}
                announcements={announcements}
                files={files}
                onAddSchedule={handleAddSchedule}
                onUpdateSchedule={handleUpdateSchedule}
                onDeleteSchedule={handleDeleteSchedule}
                onAddTask={handleAddTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onUploadFile={handleUploadFile}
                onDeleteFile={handleDeleteFile}
                onLinkFilesToSchedule={handleLinkFilesToSchedule}
                onShowToast={showToast}
                onRefresh={() => loadAppData(user)}
                initialTab="files"
                onGoHome={() => setCurrentView('HUB')}
                approvedWorkType={todayApprovedWorkType}
                todayLeave={todayLeave}
                isTodayFullDayLeave={isTodayFullDayLeave}
                isAmHalfLeave={isAmHalfLeave}
                isPmHalfLeave={isPmHalfLeave}
                toastPosition={toastPosition}
                onToastPositionChange={handleToastPositionChange}
                theme={theme}
                onToggleTheme={toggleTheme}
                onUpdateUser={handleUpdateUser}
              />
            )}

            {/* VIEW 6: CALENDAR & LEAVE (일정 관리) */}
            {currentView === 'CALENDAR_LEAVE' && (
              <EmployeePortal
                user={user}
                attendance={todayAttendance}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onStatusToggle={handleStatusToggle}
                schedules={schedules}
                tasks={tasks}
                employees={employees}
                clients={clients}
                announcements={announcements}
                files={files}
                onAddSchedule={handleAddSchedule}
                onUpdateSchedule={handleUpdateSchedule}
                onDeleteSchedule={handleDeleteSchedule}
                onAddTask={handleAddTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onUploadFile={handleUploadFile}
                onDeleteFile={handleDeleteFile}
                onLinkFilesToSchedule={handleLinkFilesToSchedule}
                onShowToast={showToast}
                onRefresh={() => loadAppData(user)}
                initialTab="calendar"
                targetScheduleId={targetScheduleId}
                onClearTargetScheduleId={() => setTargetScheduleId(null)}
                openLeaveHistory={openLeaveHistory}
                targetLeaveId={targetLeaveId}
                onCloseLeaveHistory={() => {
                  setOpenLeaveHistory(false);
                  setTargetLeaveId(null);
                }}
                onGoHome={() => setCurrentView('HUB')}
                approvedWorkType={todayApprovedWorkType}
                todayLeave={todayLeave}
                isTodayFullDayLeave={isTodayFullDayLeave}
                isAmHalfLeave={isAmHalfLeave}
                isPmHalfLeave={isPmHalfLeave}
                toastPosition={toastPosition}
                onToastPositionChange={handleToastPositionChange}
                theme={theme}
                onToggleTheme={toggleTheme}
                onUpdateUser={handleUpdateUser}
              />
            )}

            {/* VIEW 7: SETTINGS / ADMIN (기타 환경설정 또는 최고 관리자 제어 센터) */}
            {(currentView === 'SETTINGS' || currentView === 'ADMIN') && (
              <EmployeePortal
                user={user}
                attendance={todayAttendance}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onStatusToggle={handleStatusToggle}
                schedules={schedules}
                tasks={tasks}
                employees={employees}
                clients={clients}
                announcements={announcements}
                files={files}
                onAddSchedule={handleAddSchedule}
                onUpdateSchedule={handleUpdateSchedule}
                onDeleteSchedule={handleDeleteSchedule}
                onAddTask={handleAddTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onUploadFile={handleUploadFile}
                onDeleteFile={handleDeleteFile}
                onLinkFilesToSchedule={handleLinkFilesToSchedule}
                onShowToast={showToast}
                onRefresh={() => loadAppData(user)}
                initialTab={currentView === 'ADMIN' ? 'admin' : 'settings'}
                targetAdminSubtab={targetAdminSubtab}
                onGoHome={() => setCurrentView('HUB')}
                approvedWorkType={todayApprovedWorkType}
                todayLeave={todayLeave}
                isTodayFullDayLeave={isTodayFullDayLeave}
                isAmHalfLeave={isAmHalfLeave}
                isPmHalfLeave={isPmHalfLeave}
                toastPosition={toastPosition}
                onToastPositionChange={handleToastPositionChange}
                theme={theme}
                onToggleTheme={toggleTheme}
                onUpdateUser={handleUpdateUser}
              />
            )}

            {/* VIEW: PAYROLL (급여 관리 / 명세서) */}
            {currentView === 'PAYROLL' && (
              <EmployeePortal
                user={user}
                attendance={todayAttendance}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onStatusToggle={handleStatusToggle}
                schedules={schedules}
                tasks={tasks}
                employees={employees}
                clients={clients}
                announcements={announcements}
                files={files}
                onAddSchedule={handleAddSchedule}
                onUpdateSchedule={handleUpdateSchedule}
                onDeleteSchedule={handleDeleteSchedule}
                onAddTask={handleAddTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onUploadFile={handleUploadFile}
                onDeleteFile={handleDeleteFile}
                onLinkFilesToSchedule={handleLinkFilesToSchedule}
                onShowToast={showToast}
                onRefresh={() => loadAppData(user)}
                initialTab="payroll"
                onGoHome={() => setCurrentView('HUB')}
                approvedWorkType={todayApprovedWorkType}
                todayLeave={todayLeave}
                isTodayFullDayLeave={isTodayFullDayLeave}
                isAmHalfLeave={isAmHalfLeave}
                isPmHalfLeave={isPmHalfLeave}
                toastPosition={toastPosition}
                onToastPositionChange={handleToastPositionChange}
                theme={theme}
                onToggleTheme={toggleTheme}
                onUpdateUser={handleUpdateUser}
              />
            )}

            {/* VIEW 8: ADMIN CONTACT (고객사용 관리자 바로가기) */}
            {currentView === 'ADMIN_CONTACT' && (
              <AdminContactView onGoHome={() => setCurrentView('HUB')} />
            )}

          </main>
        </>
      )}

      {/* 당일 연차 취소 확인 모달 (순수 모노크롬 다이얼로그) */}
      {showLeaveCancelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}
          onClick={() => setShowLeaveCancelModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, #1e293b)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
              당일 연차 출근 확인
            </h3>
            <div style={{ fontSize: '15px', lineHeight: 1.65, color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
              당일 승인된 연차 휴가가 등록되어 있습니다.<br />
              연차를 취소 신청하고 정상 출근 처리하시겠습니까?<br />
              <span style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
                (확인 시 연차 취소 신청이 등록되며, 관리자 결재 후 연차 일수가 환급됩니다.)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLeaveCancelModal(false)}
                style={{ height: '42px', padding: '0 1.25rem', fontSize: '14px', fontWeight: 600, borderRadius: '6px' }}
              >
                취소
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmLeaveCancelCheckIn}
                style={{ height: '42px', padding: '0 1.25rem', fontSize: '14px', fontWeight: 600, borderRadius: '6px' }}
              >
                연차 취소 신청 및 출근
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
