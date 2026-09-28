import React, { useState, useEffect, useMemo, useRef } from 'react';
import CompanyCalendar from './CompanyCalendar';
import TaskBoard from './TaskBoard';
import CompleteModal from './CompleteModal';
import FlipClock from './FlipClock';
import AdminPortal from './AdminPortal';
import ApplicationCalendar from './ApplicationCalendar';
import CustomDatePicker from './CustomDatePicker';
import CustomCheckbox from './CustomCheckbox';
import CustomTimePicker from './CustomTimePicker';
import UserWorkCalendar from './UserWorkCalendar';
import FileManager from './FileManager';
import SettingsView from './SettingsView';
import PayrollManager from './PayrollManager';
import { isWeekendOrHoliday } from '../utils/holidays';
import { Clock, Plus, X } from 'lucide-react';

const TIME_OPTIONS = [];
for (let h = 6; h <= 24; h++) {
  const hh = String(h).padStart(2, '0');
  TIME_OPTIONS.push(`${hh}:00`);
  if (h < 24) {
    TIME_OPTIONS.push(`${hh}:30`);
  }
}

const calculateDuration = (start, end) => {
  if (!start || !end) return { hours: 0, text: '' };
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const diff = endMin - startMin;
  if (diff <= 0) return { hours: 0, text: '0시간' };
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  let text = '';
  if (hours > 0 && mins > 0) {
    text = `${hours}시간 ${mins}분`;
  } else if (hours > 0) {
    text = `${hours}시간`;
  } else {
    text = `${mins}분`;
  }
  return { hours: Number((diff / 60).toFixed(1)), text };
};

const formatHtmlContent = (content) => {
  if (!content) return '';
  if (/<(p|div|h[1-6]|ul|ol|li|blockquote|strong|b|em|i|u|s|hr|span)[^>]*>/i.test(content)) {
    return content;
  }
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return escaped.replace(/\n/g, '<br/>');
};

const getMatchingEmployeesForCategory = (empList, category) => {
  if (!empList || empList.length === 0) return [];
  if (!category || category === 'ETC') return empList;

  let matched = [];
  if (category === 'DEV') {
    matched = empList.filter(e => 
      e.dept?.includes('개발') || 
      e.position?.includes('연구') || 
      e.position?.includes('개발')
    );
  } else if (category === 'DESIGN') {
    matched = empList.filter(e => 
      e.position?.includes('디자이너') || 
      e.position?.includes('디자인') ||
      (e.dept?.includes('디자인') && !e.position?.includes('기획'))
    );
  } else if (category === 'PUBLISH') {
    matched = empList.filter(e => 
      e.position?.includes('퍼블') || 
      e.position?.includes('웹') ||
      e.dept?.includes('개발') ||
      e.position?.includes('디자이너')
    );
  } else if (category === 'PLAN') {
    matched = empList.filter(e => 
      e.position?.includes('기획') || 
      e.dept?.includes('기획')
    );
  }

  return matched.length > 0 ? matched : empList;
};

export default function EmployeePortal({ 
  user, 
  attendance, 
  onCheckIn, 
  onCheckOut, 
  onStatusToggle, 
  schedules, 
  tasks, 
  employees, 
  clients, 
  announcements,
  files = [],
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onAddTask,
  onUpdateTaskStatus,
  onShowToast,
  onRefresh,
  onUploadFile,
  onDeleteFile,
  onLinkFilesToSchedule,
  initialTab = 'commute',
  targetScheduleId = null,
  onClearTargetScheduleId = null,
  targetRequestId = null,
  onClearTargetRequestId = null,
  openLeaveHistory = false,
  targetLeaveId = null,
  onCloseLeaveHistory = null,
  targetAdminSubtab = 'approvals',
  onGoHome,
  approvedWorkType,
  toastPosition,
  onToastPositionChange,
  theme,
  onToggleTheme,
  todayLeave,
  isTodayFullDayLeave,
  isAmHalfLeave,
  isPmHalfLeave,
  onUpdateUser
}) {
  const [activeTab, setActiveTab] = useState(
    openLeaveHistory 
      ? 'attendance'
      : (targetScheduleId 
          ? 'calendar' 
          : (targetRequestId 
              ? 'client_requests' 
              : (initialTab === 'admin_attendance' ? 'admin' : initialTab)))
  ); // commute, calendar, tasks, client_requests, files, settings, admin
  
  useEffect(() => {
    if (openLeaveHistory) {
      setActiveTab('commute');
      loadLeaves();
      setCommuteAccordionState(prev => ({ ...prev, history: true }));
      setTimeout(() => {
        document.getElementById('leave-history-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (targetScheduleId) {
      setActiveTab('calendar');
    } else if (targetRequestId) {
      setActiveTab('client_requests');
    } else if (initialTab === 'admin_attendance' || initialTab === 'admin') {
      setActiveTab('admin');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, targetScheduleId, targetRequestId, openLeaveHistory, targetLeaveId]);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isAmHalfLocked = isAmHalfLeave && !attendance?.checkIn && nowMinutes < (13 * 60);

  const [clientReqTab, setClientReqTab] = useState('REQUESTED'); // REQUESTED (작업 요청), IN_PROGRESS (진행 중), REVIEW (확인 요청), DONE (작업 완료)
  const [clientRequests, setClientRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [selectedReqDate, setSelectedReqDate] = useState('');
  const [reqSearchTerm, setReqSearchTerm] = useState('');
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const [comments, setComments] = useState([]);
  const [completingReq, setCompletingReq] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskCategory, setNewTaskCategory] = useState('DEV');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [inlineCompletingTaskId, setInlineCompletingTaskId] = useState(null);
  const [inlineCompleteHours, setInlineCompleteHours] = useState('');
  const [inlineCompleteNote, setInlineCompleteNote] = useState('');
  const [activeStatusMenuTaskId, setActiveStatusMenuTaskId] = useState(null);

  const [showReqHistoryPanel, setShowReqHistoryPanel] = useState(false);
  const [isReqTimelineClosing, setIsReqTimelineClosing] = useState(false);
  const reqTimelinePanelRef = useRef(null);
  const reqTimelineToggleBtnRef = useRef(null);

  const handleCloseReqTimeline = () => {
    if (isReqTimelineClosing) return;
    setIsReqTimelineClosing(true);
    setTimeout(() => {
      setShowReqHistoryPanel(false);
      setIsReqTimelineClosing(false);
    }, 200);
  };

  const handleToggleReqTimeline = () => {
    if (showReqHistoryPanel) {
      handleCloseReqTimeline();
    } else {
      setShowReqHistoryPanel(true);
    }
  };

  // Close request timeline panel on outside click with smooth exit animation
  useEffect(() => {
    if (!showReqHistoryPanel || isReqTimelineClosing) return;
    const handleOutsideClick = (e) => {
      if (
        reqTimelinePanelRef.current &&
        !reqTimelinePanelRef.current.contains(e.target) &&
        reqTimelineToggleBtnRef.current &&
        !reqTimelineToggleBtnRef.current.contains(e.target)
      ) {
        handleCloseReqTimeline();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showReqHistoryPanel, isReqTimelineClosing]);

  useEffect(() => {
    const handleCloseStatusMenu = (e) => {
      if (activeStatusMenuTaskId && !e.target.closest('.status-dropdown-wrapper')) {
        setActiveStatusMenuTaskId(null);
      }
    };
    document.addEventListener('mousedown', handleCloseStatusMenu);
    return () => document.removeEventListener('mousedown', handleCloseStatusMenu);
  }, [activeStatusMenuTaskId]);

  const handledTargetRequestIdRef = useRef(null);

  const handleOpenDrawer = (req) => {
    setIsDrawerClosing(false);
    setShowReqHistoryPanel(false);
    setIsReqTimelineClosing(false);
    setIsAddingTask(false);
    setInlineCompletingTaskId(null);
    setActiveStatusMenuTaskId(null);
    setSelectedReq(req);
    loadComments(req.id);
  };

  const handleCloseDrawer = () => {
    if (isDrawerClosing) return;
    setIsDrawerClosing(true);
    setIsAddingTask(false);
    setInlineCompletingTaskId(null);
    setActiveStatusMenuTaskId(null);
    handledTargetRequestIdRef.current = targetRequestId;
    if (onClearTargetRequestId) {
      onClearTargetRequestId();
    }
    if (showReqHistoryPanel) {
      setIsReqTimelineClosing(true);
    }
    setTimeout(() => {
      setSelectedReq(null);
      setIsDrawerClosing(false);
      setShowReqHistoryPanel(false);
      setIsReqTimelineClosing(false);
      setActiveStatusMenuTaskId(null);
    }, 220);
  };

  // Leave Form Drawer
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaveClosing, setIsLeaveClosing] = useState(false);

  const handleCloseLeaveDrawer = () => {
    if (isLeaveClosing) return;
    setIsLeaveClosing(true);
    setTimeout(() => {
      setShowLeaveModal(false);
      setIsLeaveClosing(false);
    }, 220);
  };

  // Leave History Drawer
  const [showLeaveHistoryDrawer, setShowLeaveHistoryDrawer] = useState(false);
  const [isHistoryClosing, setIsHistoryClosing] = useState(false);
  const [historyDate, setHistoryDate] = useState(() => new Date());
  const [historyViewMode, setHistoryViewMode] = useState('MONTH'); // 'MONTH' | 'ALL'

  const handlePrevHistoryMonth = () => {
    setHistoryDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextHistoryMonth = () => {
    setHistoryDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleCloseHistoryDrawer = () => {
    if (isHistoryClosing) return;
    setIsHistoryClosing(true);
    setTimeout(() => {
      setShowLeaveHistoryDrawer(false);
      setIsHistoryClosing(false);
      if (onCloseLeaveHistory) onCloseLeaveHistory();
    }, 220);
  };

  const getFormattedToday = () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = days[now.getDay()];
    return `${year}년 ${month}월 ${date}일 (${day})`;
  };
  const [applyCategory, setApplyCategory] = useState('LEAVE'); // 'LEAVE' | 'WORK'
  const [applyType, setApplyType] = useState('ANNUAL'); // 'ANNUAL' | 'SPECIAL' | 'SICK' | 'ETC' | 'REMOTE' | 'FIELD' | 'TRIP' | 'HOLIDAY_WORK' | 'OVERTIME'
  const [workStartTime, setWorkStartTime] = useState('18:00');
  const [workEndTime, setWorkEndTime] = useState('19:00');

  const handleStartTimeChange = (newStart) => {
    setWorkStartTime(newStart);
    const [sh, sm] = newStart.split(':').map(Number);
    const [eh, em] = workEndTime.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      const nextH = Math.min(24, sh + 1);
      setWorkEndTime(`${String(nextH).padStart(2, '0')}:${String(sm).padStart(2, '0')}`);
    }
  };
  const [approverId, setApproverId] = useState('');
  const [selectedTeamApproverIds, setSelectedTeamApproverIds] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState({}); // { '2026-09-10': 'ALL' | 'AM' | 'PM' }
  const [applyReason, setApplyReason] = useState('');

  // Commute Tab 4-Part Accordion State (달력보기, 연차 현황, 근태 신청, 근태 내역)
  const [commuteAccordionState, setCommuteAccordionState] = useState({
    calendar: false,
    leaveStatus: false,
    apply: false,
    history: false
  });

  const toggleCommuteSection = (key) => {
    setCommuteAccordionState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const [isApplyAccordionOpen, setIsApplyAccordionOpen] = useState(false);
  const [showApplyConfirmModal, setShowApplyConfirmModal] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '안내',
    message: '',
    details: null
  });

  const showAlert = (message, title = '안내', details = null) => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      details
    });
  };

  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [expandedGroupKey, setExpandedGroupKey] = useState(null);

  // 결재 권한 보유자 목록 (팀장, 최고 관리자, HR과장 포함)
  const approverGroups = useMemo(() => {
    const groups = {};
    (employees || []).forEach(emp => {
      if (!user || emp.id === user.id) return;
      // 결재 권한이 있는 직책(팀장, 최고관리자, HR과장)만 결재 대상자로 노출
      if (emp.role !== 'TEAM_LEADER' && emp.role !== 'ADMIN' && emp.role !== 'HR') return;
      const dept = emp.dept || '기타부서';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
    });
    return groups;
  }, [employees, user]);

  // 팀장 및 최고관리자 목록 (팀장 결재선 선택용)
  const teamLeaderApprovers = useMemo(() => {
    return (employees || []).filter(e => user && (e.role === 'ADMIN' || (e.role === 'TEAM_LEADER' && e.id !== user.id)));
  }, [employees, user]);

  // 팀원일 때 직속 결재권자 (소속 부서 팀장/HR과장, 부서에 팀장이 없으면 최고 관리자)
  const myDirectApprover = useMemo(() => {
    if (!user) return null;
    const deptLeader = (employees || []).find(e => e.dept === user.dept && (e.role === 'TEAM_LEADER' || e.role === 'HR') && e.id !== user.id);
    if (deptLeader) return deptLeader;
    return (employees || []).find(e => e.role === 'ADMIN');
  }, [employees, user]);

  // 사내 전체 직원 (고객사 계정 제외) 및 부서별 그룹핑 (요청관리 최종 승인자 선택용)
  const internalEmployees = useMemo(() => {
    return (employees || []).filter(emp => emp.role !== 'CLIENT');
  }, [employees]);

  const approverUsersByDept = useMemo(() => {
    const map = new Map();
    internalEmployees.forEach(u => {
      const dept = u.dept || '기타';
      if (!map.has(dept)) {
        map.set(dept, []);
      }
      map.get(dept).push(u);
    });
    return Array.from(map.entries());
  }, [internalEmployees]);

  // 일반 사원/팀원 또는 팀장일 경우 기본 결재자 자동 지정
  useEffect(() => {
    if (user?.role !== 'ADMIN' && myDirectApprover && !approverId) {
      setApproverId(myDirectApprover.id);
    }
  }, [user, myDirectApprover, approverId]);

  // 선택한 일정 텍스트 요약 (Strictly NO Parentheses around hours/times)
  const selectedScheduleSummary = useMemo(() => {
    const dates = Object.keys(selectedSlots).sort();
    if (dates.length === 0) {
      return { text: '달력에서 신청할 날짜를 선택해주세요.', hasSelection: false };
    }

    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const formatDate = (str) => {
      const parts = str.split('-');
      const y = parts[0];
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const dt = new Date(parseInt(y, 10), m - 1, d);
      const w = weekdays[dt.getDay()];
      return `${y}년 ${m}월 ${d}일 ${w}요일`;
    };

    if (dates.length === 1) {
      const dStr = dates[0];
      const slot = selectedSlots[dStr];

      // 휴일근무 또는 야근일 경우 시간 표기
      if (applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME') {
        const dur = calculateDuration(workStartTime, workEndTime);
        const typeName = applyType === 'HOLIDAY_WORK' ? '휴일근무' : '야근';
        return {
          text: `${formatDate(dStr)} · ${typeName} · ${workStartTime} ~ ${workEndTime} · ${dur.text}`,
          hasSelection: true
        };
      }

      let slotText = '종일 · 1일';
      if (slot === 'AM') slotText = '오전 반차 · 0.5일';
      else if (slot === 'PM') slotText = '오후 반차 · 0.5일';
      return {
        text: `${formatDate(dStr)} · ${slotText}`,
        hasSelection: true
      };
    }

    // Check consecutive
    let isConsecutive = true;
    for (let i = 0; i < dates.length - 1; i++) {
      const dt1 = new Date(dates[i] + 'T00:00:00');
      const dt2 = new Date(dates[i + 1] + 'T00:00:00');
      const diff = Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24));
      if (diff !== 1) {
        isConsecutive = false;
        break;
      }
    }

    if (isConsecutive) {
      return {
        text: `${formatDate(dates[0])} ~ ${formatDate(dates[dates.length - 1])} · 총 ${dates.length}일`,
        hasSelection: true
      };
    }

    const formattedList = dates.map(d => {
      const parts = d.split('-');
      const m = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const dt = new Date(parseInt(parts[0], 10), m - 1, day);
      return `${m}/${day}(${weekdays[dt.getDay()]})`;
    }).join(', ');

    return {
      text: `${formattedList} · 총 ${dates.length}일`,
      hasSelection: true
    };
  }, [selectedSlots]);

  // 1년 미만 사원의 연차 발생일 계산
  const nextLeaveGrantInfo = useMemo(() => {
    if (!user?.hireDate) return null;
    const hireDate = new Date(user.hireDate);
    if (isNaN(hireDate.getTime())) return null;

    const today = new Date();
    const hireYear = hireDate.getFullYear();
    const hireMonth = hireDate.getMonth();
    const hireDay = hireDate.getDate();

    // 1년 만근일: 입사일 + 1년
    const oneYearAnniversary = new Date(hireYear + 1, hireMonth, hireDay);
    
    // 이미 1년 이상인 경우 null
    if (today >= oneYearAnniversary) return null;

    return {
      hireDay,
      monthlyGrantText: `매월 ${hireDay}일`
    };
  }, [user?.hireDate]);

  const handleToggleSlot = (dateStr, newSlot) => {
    setSelectedSlots(prev => {
      if (!newSlot) {
        const next = { ...prev };
        delete next[dateStr];
        return next;
      }
      if (applyType === 'HALF_AM' || applyType === 'HALF_PM' || applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME') {
        return { [dateStr]: newSlot };
      }
      return { ...prev, [dateStr]: newSlot };
    });
  };

  const handleRemoveSlot = (dateStr) => {
    setSelectedSlots(prev => {
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
  };

  // Leaves & Approval Process State
  const [leavesList, setLeavesList] = useState([]);

  const loadLeaves = async () => {
    try {
      const res = await fetch('/api/leaves');
      const data = await res.json();
      setLeavesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load leaves:', err);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  // Filter current user's submitted applications
  const myRecentLeaves = useMemo(() => {
    return (leavesList || []).filter(l => l.userId === user.id);
  }, [leavesList, user]);

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const sortedMyLeaves = useMemo(() => {
    return [...myRecentLeaves].sort((a, b) => {
      const dateA = a.startDate || a.createdAt || '';
      const dateB = b.startDate || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  }, [myRecentLeaves]);

  const historyYear = historyDate.getFullYear();
  const historyMonth = String(historyDate.getMonth() + 1).padStart(2, '0');
  const historyYearMonthStr = `${historyYear}-${historyMonth}`;

  const filteredMyLeaves = useMemo(() => {
    if (historyViewMode === 'ALL') {
      return sortedMyLeaves;
    }
    return sortedMyLeaves.filter(item => {
      const targetDate = item.startDate || item.createdAt || '';
      return targetDate.startsWith(historyYearMonthStr);
    });
  }, [sortedMyLeaves, historyViewMode, historyYearMonthStr]);

  const formatLeaveDateWithWeekday = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = days[d.getDay()];
        return `${dateStr} (${dayName})`;
      }
    } catch (e) {}
    return dateStr;
  };

  const getLeaveTypeLabel = (item) => {
    if (item.leaveType === 'REMOTE') return '재택근무';
    if (item.leaveType === 'FIELD') return '외근';
    if (item.leaveType === 'TRIP') return '출장';
    if (item.leaveType === 'OVERTIME') return '야근';
    if (item.leaveType === 'HOLIDAY_WORK') return '휴일근무';
    if (item.leaveType === 'SPECIAL') return '경조사';
    if (item.leaveType === 'SICK') return '병가';
    if (item.leaveType === 'ETC') return '기타휴가';
    if (item.timeSlot === 'AM') return '오전반차';
    if (item.timeSlot === 'PM') return '오후반차';
    return '연차';
  };

  const getLeaveStatusInfo = (status) => {
    switch (status) {
      case 'PENDING':
        return { label: '승인 대기', color: '#3b82f6' };
      case 'APPROVED':
        return { label: '승인 완료', color: '#10b981' };
      case 'REJECTED':
        return { label: '반려됨', color: '#ef4444' };
      case 'CANCEL_REQUESTED':
        return { label: '취소 요청 중', color: '#f59e0b' };
      case 'CANCELLED':
        return { label: '취소 완료', color: 'var(--text-muted)' };
      default:
        return { label: status, color: 'var(--text-muted)' };
    }
  };

  const handleRequestCancelMyLeave = async (leaveId) => {
    if (!window.confirm('승인된 휴가/근태의 취소를 요청하시겠습니까?\n관리자 승인 후 최종 취소 처리됩니다.')) return;
    try {
      const res = await fetch(`/api/leaves/${leaveId}/request-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('취소 요청 접수', '취소 요청이 접수되었습니다. 관리자 확인 후 반영됩니다.', 'info');
        loadLeaves();
        if (onRefresh) onRefresh();
      } else {
        alert(data.message || '취소 요청에 실패했습니다.');
      }
    } catch (err) {
      alert('취소 요청 중 오류가 발생했습니다.');
    }
  };

  const handleCancelMyLeave = async (leaveId) => {
    if (!window.confirm('신청을 취소하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/leaves/${leaveId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onShowToast('신청 취소', '신청이 정상적으로 취소되었습니다.');
        loadLeaves();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert('신청 취소 중 오류가 발생했습니다.');
    }
  };

  const handleCancelGroupLeaves = async (leaveIds) => {
    if (!window.confirm('신청을 취소하시겠습니까?')) return;
    try {
      await Promise.all(
        leaveIds.map(id => fetch(`/api/leaves/${id}`, { method: 'DELETE' }))
      );
      onShowToast('신청 취소', '신청이 정상적으로 취소되었습니다.');
      loadLeaves();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('신청 취소 중 오류가 발생했습니다.');
    }
  };

  const groupedMyLeaves = useMemo(() => {
    const groupsMap = new Map();

    sortedMyLeaves.forEach(item => {
      const timeKey = (item.createdAt || '').slice(0, 19);
      const groupKey = item.batchId 
        ? `${item.batchId}__${item.status || ''}`
        : `${timeKey}__${item.reason || ''}__${item.status || ''}__${item.leaveType || ''}`;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          groupKey,
          batchId: item.batchId,
          createdAt: item.createdAt,
          reason: item.reason,
          status: item.status,
          approverName: item.approverName,
          approverId: item.approverId,
          rejectReason: item.rejectReason,
          items: []
        });
      }

      const group = groupsMap.get(groupKey);
      group.items.push(item);
      if (item.rejectReason && !group.rejectReason) {
        group.rejectReason = item.rejectReason;
      }
    });

    const groups = Array.from(groupsMap.values());

    return groups.map(group => {
      group.items.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
      
      const dates = group.items.map(i => i.startDate).filter(Boolean);
      const firstDate = dates[0] || '';
      const lastDate = dates[dates.length - 1] || '';

      let totalDays = 0;
      let hasHalfDay = false;
      const typesSet = new Set();

      group.items.forEach(i => {
        const tLabel = getLeaveTypeLabel(i);
        typesSet.add(tLabel);
        if (i.daysCount !== undefined && i.daysCount !== null) {
          totalDays += Number(i.daysCount);
        } else if (i.timeSlot === 'AM' || i.timeSlot === 'PM') {
          totalDays += 0.5;
          hasHalfDay = true;
        } else if (i.leaveType === 'REMOTE' || i.leaveType === 'FIELD' || i.leaveType === 'TRIP' || i.leaveType === 'OVERTIME' || i.leaveType === 'HOLIDAY_WORK') {
          // work type
        } else {
          totalDays += 1.0;
        }
      });

      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      const getWk = (dStr) => {
        if (!dStr) return '';
        try {
          const p = dStr.split('-');
          return weekdays[new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)).getDay()];
        } catch (e) {
          return '';
        }
      };

      const currentYearStr = new Date().getFullYear().toString();
      const formatPart = (dStr) => {
        if (!dStr) return '';
        const parts = dStr.split('-');
        if (parts.length < 3) return dStr;
        const y = parts[0];
        const m = parts[1];
        const d = parts[2];
        const wk = getWk(dStr);
        const md = `${m}.${d}`;
        const prefix = y !== currentYearStr ? `${y}.` : '';
        return wk ? `${prefix}${md} ${wk}` : `${prefix}${md}`;
      };

      // 연속된 일정 클러스터링: 1일 차이이거나 금요일~월요일 주말 연속인 경우 하나의 기간(~)으로 묶고, 비연속 일정은 분리
      const getDateRanges = (dateList) => {
        if (!dateList || dateList.length === 0) return [];
        const sorted = Array.from(new Set(dateList)).sort();
        if (sorted.length === 1) return [{ start: sorted[0], end: sorted[0] }];

        const ranges = [];
        let currentStart = sorted[0];
        let currentEnd = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
          const prevDate = new Date(currentEnd);
          const currDate = new Date(sorted[i]);
          const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          const isFridayToMonday = prevDate.getDay() === 5 && currDate.getDay() === 1 && diffDays === 3;
          const isConsecutive = diffDays === 1 || isFridayToMonday;

          if (isConsecutive) {
            currentEnd = sorted[i];
          } else {
            ranges.push({ start: currentStart, end: currentEnd });
            currentStart = sorted[i];
            currentEnd = sorted[i];
          }
        }
        ranges.push({ start: currentStart, end: currentEnd });
        return ranges;
      };

      const dateRanges = getDateRanges(dates);
      const dateLines = dateRanges.map(r => {
        if (r.start === r.end) return formatPart(r.start);
        return `${formatPart(r.start)} ~ ${formatPart(r.end)}`;
      });
      const dateDisplay = dateLines.length === 0 ? '-' : dateLines.join(' · ');

      let daysDisplay = '';
      const isWorkOnly = Array.from(typesSet).every(t => t === '재택근무' || t === '외근' || t === '출장' || t === '야근' || t === '휴일근무');
      if (isWorkOnly) {
        daysDisplay = dates.length > 1 ? `${dates.length}일` : '';
      } else if (totalDays > 0) {
        const daysNumStr = Number.isInteger(totalDays) ? `${totalDays}일` : `${totalDays.toFixed(1)}일`;
        if (hasHalfDay && dates.length > 1) {
          daysDisplay = `${daysNumStr} (${dates.length}건)`;
        } else {
          daysDisplay = daysNumStr;
        }
      }

      const typesDisplay = Array.from(typesSet).join(' · ');
      const isSuperAdminLeave = user?.role === 'ADMIN' || group.items.some(i => i.userId === 'usr-admin' || i.userId === 'admin');
      const cleanApprover = isSuperAdminLeave ? '본인 전결' : (group.approverName || '최고관리자').split('(')[0].trim();
      const itemIds = group.items.map(i => i.id);

      return {
        ...group,
        firstDate,
        lastDate,
        dateRanges,
        dateLines,
        dateDisplay,
        daysDisplay,
        typesDisplay,
        cleanApprover,
        isSuperAdminLeave,
        itemIds
      };
    }).sort((a, b) => {
      const dateA = a.firstDate || a.createdAt || '';
      const dateB = b.firstDate || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  }, [sortedMyLeaves]);

  // Comment Form
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const loadClientRequests = async () => {
    try {
      const res = await fetch('/api/client-requests');
      const data = await res.json();
      setClientRequests(data);
      setSelectedReq(prev => prev ? (data.find(r => r.id === prev.id) || prev) : null);
    } catch (err) {
      console.error(err);
    }
  };

  const loadComments = async (reqId) => {
    try {
      const res = await fetch(`/api/client-requests/${reqId}/comments`);
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadClientRequests();
    const timer = setInterval(loadClientRequests, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedReq) {
      loadComments(selectedReq.id);
    }
  }, [selectedReq]);

  useEffect(() => {
    if (targetRequestId && clientRequests.length > 0) {
      if (handledTargetRequestIdRef.current === targetRequestId) {
        return;
      }
      const found = clientRequests.find(r => r.id === targetRequestId);
      if (found) {
        handledTargetRequestIdRef.current = targetRequestId;
        setSelectedReq(found);
        setActiveTab('client_requests');
        if (found.status === 'REQUESTED') setClientReqTab('REQUESTED');
        else if (found.status === 'RECEIVED' || found.status === 'IN_PROGRESS' || found.status === 'REOPENED') setClientReqTab('IN_PROGRESS');
        else if (found.status === 'DONE' && !found.clientConfirmed) setClientReqTab('REVIEW');
        else if (found.status === 'DONE' && found.clientConfirmed) setClientReqTab('DONE');
        if (onClearTargetRequestId) {
          onClearTargetRequestId();
        }
      }
    } else if (!targetRequestId) {
      handledTargetRequestIdRef.current = null;
    }
  }, [targetRequestId, clientRequests]);

  // Helper: Display names for confirmation modal
  const getApplyTypeName = (type) => {
    switch (type) {
      case 'ANNUAL': return '연차';
      case 'HALF_AM': return '오전 반차';
      case 'HALF_PM': return '오후 반차';
      case 'HOLIDAY_WORK': return '휴일근무';
      case 'OVERTIME': return '야근';
      case 'REMOTE': return '재택근무';
      case 'SICK': return '병가';
      case 'SPECIAL': return '경조사';
      case 'OFFICIAL': return '공가';
      case 'ETC': return '기타';
      default: return type || '연차';
    }
  };

  const getApproverDisplayName = () => {
    if (user?.role === 'ADMIN') return '본인 전결';
    if (user?.role === 'TEAM_LEADER') {
      const selectedLeaders = otherTeamLeaders.filter(m => selectedTeamApproverIds.includes(m.id));
      const leaderNames = selectedLeaders.map(l => l.name).join(', ');
      return leaderNames ? `김관리, ${leaderNames}` : '김관리';
    }
    const approver = employees.find(e => e.id === approverId) || employees.find(e => e.role === 'ADMIN');
    return approver ? approver.name : '최고 관리자';
  };

  const getFormattedDatesList = () => {
    const keys = Object.keys(selectedSlots).sort();
    if (keys.length === 0) return [];
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return keys.map(dStr => {
      const slot = selectedSlots[dStr];
      const parts = dStr.split('-');
      const y = parts[0];
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const dt = new Date(parseInt(y, 10), m - 1, d);
      const w = weekdays[dt.getDay()];
      let slotText = '';
      if (applyType === 'HALF_AM' || slot === 'AM') slotText = ' · 오전 반차';
      else if (applyType === 'HALF_PM' || slot === 'PM') slotText = ' · 오후 반차';
      return `${y}년 ${m}월 ${d}일 (${w})${slotText}`;
    });
  };

  // 1. Validate Form & Open Confirmation Modal
  const handleOpenApplyConfirm = (e) => {
    if (e) e.preventDefault();
    const dateKeys = Object.keys(selectedSlots).sort();
    if (dateKeys.length === 0) {
      showAlert('달력에서 최소 1개 이상의 일정을 선택해 주세요.', '일정 미선택');
      return;
    }

    // 연차 / 반차 신청 시 잔여 연차 일수 초과 여부 검증
    if (applyType === 'ANNUAL' || applyType === 'HALF_AM' || applyType === 'HALF_PM') {
      let requestedDays = 0;
      dateKeys.forEach(dateStr => {
        const slot = selectedSlots[dateStr] || 'ALL';
        if (applyType === 'HALF_AM' || applyType === 'HALF_PM' || slot === 'AM' || slot === 'PM') {
          requestedDays += 0.5;
        } else {
          requestedDays += 1.0;
        }
      });

      const currentRemaining = Number(
        user?.remainingLeave !== undefined 
          ? user.remainingLeave 
          : ((user?.totalLeave || 15) - (user?.usedLeave || 0))
      );

      if (requestedDays > currentRemaining) {
        showAlert(
          '잔여 연차 일수가 부족하여 신청할 수 없습니다.',
          '연차 부족 안내',
          [
            { label: '신청 일수', value: `${requestedDays}일` },
            { label: '잔여 연차', value: `${currentRemaining}일` }
          ]
        );
        return;
      }
    }

    if (user?.role !== 'ADMIN' && !approverId && user?.role !== 'TEAM_LEADER') {
      showAlert('결재선을 선택해 주세요.', '결재선 미선택');
      return;
    }
    if (user?.role === 'TEAM_LEADER') {
      const selectedLeaders = otherTeamLeaders.filter(m => selectedTeamApproverIds.includes(m.id));
      if (selectedLeaders.length < 2) {
        showAlert('최고 관리자 외에 타 부서 팀장 2명을 결재선으로 선택해야 합니다. (총 3인 결재)', '결재선 안내');
        return;
      }
    }
    if (applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME') {
      const [sh, sm] = workStartTime.split(':').map(Number);
      const [eh, em] = workEndTime.split(':').map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        showAlert('근무 종료 시간은 시작 시간보다 이후여야 합니다.', '시간 설정 오류');
        return;
      }
    }
    if (!applyReason.trim()) {
      showAlert('신청 사유를 입력해 주세요.', '사유 미입력');
      return;
    }

    setShowApplyConfirmModal(true);
  };

  // 2. Final Execution upon user confirming in modal
  const handleExecuteApplyLeave = async () => {
    if (isSubmittingLeave) return;

    const dateKeys = Object.keys(selectedSlots).sort();

    // 연차 / 반차 잔여 일수 최종 방어 검증
    if (applyType === 'ANNUAL' || applyType === 'HALF_AM' || applyType === 'HALF_PM') {
      let requestedDays = 0;
      dateKeys.forEach(dateStr => {
        const slot = selectedSlots[dateStr] || 'ALL';
        if (applyType === 'HALF_AM' || applyType === 'HALF_PM' || slot === 'AM' || slot === 'PM') {
          requestedDays += 0.5;
        } else {
          requestedDays += 1.0;
        }
      });

      const currentRemaining = Number(
        user?.remainingLeave !== undefined 
          ? user.remainingLeave 
          : ((user?.totalLeave || 15) - (user?.usedLeave || 0))
      );

      if (requestedDays > currentRemaining) {
        showAlert(
          '잔여 연차 일수가 부족하여 신청할 수 없습니다.',
          '연차 부족 안내',
          [
            { label: '신청 일수', value: `${requestedDays}일` },
            { label: '잔여 연차', value: `${currentRemaining}일` }
          ]
        );
        setShowApplyConfirmModal(false);
        return;
      }
    }

    setIsSubmittingLeave(true);

    let finalApproverId = approverId;
    let finalApproverName = '';
    let finalApprovers = null;

    if (user?.role === 'ADMIN') {
      finalApproverId = 'usr-admin';
      finalApproverName = '본인 전결';
    } else if (user?.role === 'TEAM_LEADER') {
      const selectedLeaders = otherTeamLeaders.filter(m => selectedTeamApproverIds.includes(m.id));
      finalApproverId = 'MULTI';
      finalApproverName = `최고관리자 외 타 팀장 ${selectedLeaders.length}인`;
      finalApprovers = [
        { id: 'admin', name: '김관리', role: 'ADMIN', status: 'PENDING' },
        ...selectedLeaders.map(m => ({
          id: m.id,
          name: m.name,
          role: 'TEAM_LEADER',
          status: 'PENDING'
        }))
      ];
    } else {
      const approver = employees.find(e => e.id === approverId) || employees.find(e => e.role === 'ADMIN');
      finalApproverName = approver ? `${approver.name} (${approver.position || approver.dept})` : '최고관리자 (승인)';
    }

    // Build items payload
    const dur = (applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME') ? calculateDuration(workStartTime, workEndTime) : null;
    const items = dateKeys.map(dateStr => {
      let slot = selectedSlots[dateStr] || 'ALL';
      if (applyType === 'HALF_AM') slot = 'AM';
      else if (applyType === 'HALF_PM') slot = 'PM';

      const isWork = applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME' || applyType === 'REMOTE';
      const realType = (applyType === 'HALF_AM' || applyType === 'HALF_PM') ? 'ANNUAL' : applyType;
      return {
        dateStr,
        timeSlot: slot,
        leaveType: realType,
        daysCount: isWork ? 0 : ((slot === 'AM' || slot === 'PM') ? 0.5 : 1.0),
        workStartTime: (applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME') ? workStartTime : null,
        workEndTime: (applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME') ? workEndTime : null,
        workHours: dur ? dur.hours : null
      };
    });

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          dept: user.dept,
          leaveType: (applyType === 'HALF_AM' || applyType === 'HALF_PM') ? 'ANNUAL' : applyType,
          approverId: finalApproverId,
          approverName: finalApproverName,
          approvers: finalApprovers,
          reason: applyReason,
          workStartTime: (applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME') ? workStartTime : null,
          workEndTime: (applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME') ? workEndTime : null,
          workHours: dur ? dur.hours : null,
          items
        })
      });
      const data = await res.json();
      if (data.success) {
        const typeLabel = getApplyTypeName(applyType);
        
        if (user?.role === 'ADMIN') {
          onShowToast('등록 완료', `${dateKeys.length}건의 ${typeLabel} 일정이 전결 등록되었습니다.`, 'success');
        } else if (user?.role === 'TEAM_LEADER') {
          onShowToast('승인 요청 완료', `${dateKeys.length}건의 ${typeLabel} 승인 요청이 최고 관리자 및 타 부서 팀장 3인 결재선에 상신되었습니다.`, 'info');
        } else {
          onShowToast('승인 요청 완료', `${dateKeys.length}건의 ${typeLabel} 승인 요청이 ${finalApproverName}님께 전달되었습니다.`, 'info');
        }

        setShowApplyConfirmModal(false);
        handleCloseLeaveDrawer();
        setIsApplyAccordionOpen(false);
        setCommuteAccordionState(prev => ({ ...prev, apply: false, history: true }));
        setSelectedSlots({});
        setApplyReason('');
        loadLeaves();
        onRefresh();
      } else {
        showAlert(data.message || '신청 처리에 실패했습니다.', '오류');
      }
    } catch (err) {
      showAlert('신청 처리 중 오류가 발생했습니다.', '오류');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Submit Comment on Client Request
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() && commentAttachments.length === 0) return;

    try {
      const res = await fetch(`/api/client-requests/${selectedReq.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: user.id,
          authorName: `${user.name} (${user.dept})`,
          authorRole: 'EMPLOYEE',
          content: commentText,
          attachments: commentAttachments
        })
      });
      const data = await res.json();
      if (data.success) {
        setCommentText('');
        setCommentAttachments([]);
        loadComments(selectedReq.id);
        onShowToast('댓글 등록', '고객사에게 답변이 등록되었습니다.');
      }
    } catch (err) {
      alert('댓글 작성 실패');
    }
  };

  // File Upload on Comment
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setCommentAttachments(prev => [...prev, data.file]);
        onShowToast('파일 업로드 완료', `${data.file.name} 파일이 첨부되었습니다.`);
      }
    } catch (err) {
      alert('파일 업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  // Complete Request & Record Man-Hours (분야별 공수 지원)
  const handleCompleteRequest = async (reqId, spentHours, summary, spentHoursBreakdown) => {
    try {
      const res = await fetch(`/api/client-requests/${reqId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spentHours,
          completionSummary: summary,
          spentHoursBreakdown,
          assigneeId: user.id,
          assigneeName: user.name
        })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('작업 완료 및 공수 기록', `투입 공수 ${spentHours}시간 등록 후 완료 히스토리 탭으로 이동되었습니다.`);
        setCompletingReq(null);
        setSelectedReq(null);
        loadClientRequests();
      }
    } catch (err) {
      alert('작업 완료 처리 오류');
    }
  };

  const handleAcceptRequest = async (reqId) => {
    try {
      const res = await fetch(`/api/client-requests/${reqId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptedBy: user?.name || '담당자',
          assigneeId: user?.id,
          assigneeName: user?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('접수 처리 완료', '요청이 접수되었으며 고객사에게 접수 완료 알림이 발송되었습니다.');
        loadClientRequests();
        if (selectedReq && selectedReq.id === reqId) {
          setSelectedReq(data.request);
        }
      } else {
        alert(data.message || '접수 실패');
      }
    } catch (err) {
      alert('접수 처리 중 통신 오류가 발생했습니다.');
    }
  };

  const handleStartRequest = async (reqId) => {
    try {
      const res = await fetch(`/api/client-requests/${reqId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigneeId: user?.id,
          assigneeName: user?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('작업 착수 완료', '작업 진행 상태로 전환되었으며 고객사에게 알림이 발송되었습니다.');
        loadClientRequests();
        if (selectedReq && selectedReq.id === reqId) {
          setSelectedReq(data.request);
        }
      } else {
        alert(data.message || '착수 실패');
      }
    } catch (err) {
      alert('작업 착수 처리 중 통신 오류가 발생했습니다.');
    }
  };

  const handleProxyConfirm = async (reqId) => {
    if (!window.confirm('고객사 미확인 건을 담당자 권한으로 [확인 완료] 처리하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/client-requests/${reqId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmed: true,
          confirmedBy: `${user?.name || '담당자'} (대리 확인)`
        })
      });
      const data = await res.json();
      if (data.success) {
        loadClientRequests();
        if (selectedReq && selectedReq.id === reqId) {
          setSelectedReq(data.request);
        }
      } else {
        alert(data.message || '확인 처리 실패');
      }
    } catch (err) {
      alert('확인 처리 중 통신 오류가 발생했습니다.');
    }
  };

  const updateRequestTasks = async (reqId, tasks, newApproverId, meta = {}) => {
    const approverIdToUse = newApproverId !== undefined ? newApproverId : (selectedReq?.approverId || null);
    const approverObj = (employees || []).find(emp => emp.id === approverIdToUse);
    try {
      const res = await fetch(`/api/client-requests/${reqId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTasks: tasks,
          approverId: approverIdToUse || null,
          approverName: approverObj ? approverObj.name : null,
          actorName: user?.name || '관리자',
          addedTask: meta.addedTask,
          removedTask: meta.removedTask,
          approverChanged: meta.approverChanged
        })
      });
      const data = await res.json();
      if (data.success) {
        if (!meta.approverChanged) {
          onShowToast('배정 업데이트', '업무 및 담당자 정보가 저장되었습니다.');
        }
        await loadClientRequests();
        if (selectedReq && selectedReq.id === reqId) {
          setSelectedReq(data.request);
        }
      } else {
        alert(data.message || '배정 처리 실패');
      }
    } catch (err) {
      alert('업무 배정 중 통신 오류가 발생했습니다.');
    }
  };

  const handleCategoryChange = (newCat) => {
    setNewTaskCategory(newCat);
    const assignedEmpIds = (selectedReq?.assignedTasks || []).map(t => t.assigneeId);
    const unassigned = (employees || []).filter(emp => !assignedEmpIds.includes(emp.id));
    const matched = getMatchingEmployeesForCategory(unassigned, newCat);
    setNewTaskAssigneeId(matched[0]?.id || unassigned[0]?.id || '');
  };

  const handleAddInlineTask = () => {
    if (!selectedReq) return;
    const assignedEmpIds = (selectedReq.assignedTasks || []).map(t => t.assigneeId);
    const unassigned = (employees || []).filter(emp => !assignedEmpIds.includes(emp.id));
    const matched = getMatchingEmployeesForCategory(unassigned, newTaskCategory);
    const empId = newTaskAssigneeId || matched[0]?.id || unassigned[0]?.id;
    if (!empId) {
      alert('추가할 수 있는 직원이 없습니다.');
      return;
    }
    const emp = (employees || []).find(e => e.id === empId);
    if (!emp) return;
    
    const categoryLabels = { DEV: '개발', DESIGN: '디자인', PUBLISH: '퍼블', PLAN: '기획', ETC: '기타' };
    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.round(Math.random() * 1000),
      category: newTaskCategory,
      categoryLabel: categoryLabels[newTaskCategory] || '기타',
      assigneeId: emp.id,
      assigneeName: emp.name,
      status: 'PENDING',
      spentHours: 0,
      note: ''
    };
    const currentTasks = selectedReq.assignedTasks || [];
    const updated = [...currentTasks, newTask];
    updateRequestTasks(selectedReq.id, updated, undefined, { addedTask: newTask });
    setIsAddingTask(false);
  };

  const handleRemoveInlineTask = (taskId) => {
    if (!selectedReq) return;
    const currentTasks = selectedReq.assignedTasks || [];
    const targetTask = currentTasks.find(t => t.id === taskId);
    if (!targetTask) return;
    const ok = window.confirm(`[${targetTask.categoryLabel}] ${targetTask.assigneeName}님의 배정 업무를 삭제하시겠습니까?`);
    if (!ok) return;
    const updated = currentTasks.filter(t => t.id !== taskId);
    updateRequestTasks(selectedReq.id, updated, undefined, { removedTask: targetTask });
  };

  const handleChangeInlineApprover = (newApproverId) => {
    if (!selectedReq) return;
    const approverObj = (employees || []).find(e => e.id === newApproverId);
    updateRequestTasks(selectedReq.id, selectedReq.assignedTasks || [], newApproverId, {
      approverChanged: true,
      approverName: approverObj ? approverObj.name : null
    });
    if (approverObj) {
      onShowToast('승인자 지정', `${approverObj.name}님이 최종 승인자로 지정되어 승인 요청 알림이 전송되었습니다.`);
    } else {
      onShowToast('승인자 변경', '최종 승인자가 미지정으로 변경되었습니다.');
    }
  };

  const handleUpdateTaskStatus = async (reqId, taskId, newStatus) => {
    setActiveStatusMenuTaskId(null);
    if (newStatus === 'COMPLETED') {
      const targetTask = (selectedReq?.assignedTasks || []).find(t => t.id === taskId);
      setInlineCompletingTaskId(taskId);
      setInlineCompleteHours(targetTask?.spentHours ? String(targetTask.spentHours) : '');
      setInlineCompleteNote(targetTask?.note || '');
      return;
    }

    try {
      const res = await fetch(`/api/client-requests/${reqId}/tasks/${taskId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          actorId: user?.id,
          actorName: user?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        const label = newStatus === 'IN_PROGRESS' ? '진행 중' : '대기';
        onShowToast('상태 변경', `업무 상태가 [${label}]으로 변경되었습니다.`);
        await loadClientRequests();
        if (selectedReq && selectedReq.id === reqId) {
          setSelectedReq(data.request);
        }
      }
    } catch (err) {
      alert('상태 변경 처리 실패');
    }
  };

  const handleStartTaskInline = async (reqId, taskId) => {
    try {
      const res = await fetch(`/api/client-requests/${reqId}/tasks/${taskId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          actorId: user?.id,
          actorName: user?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('작업 착수', '해당 업무 작업 진행이 시작되었습니다.');
        await loadClientRequests();
        if (selectedReq && selectedReq.id === reqId) {
          setSelectedReq(data.request);
        }
      }
    } catch (err) {
      alert('작업 착수 처리 실패');
    }
  };

  const handleSaveInlineTaskCompletion = async (reqId, taskId) => {
    const hoursNum = parseFloat(inlineCompleteHours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      alert('실제 투입된 공수(시간)를 0보다 큰 숫자로 입력해주세요.');
      return;
    }

    // Check if unassigned approver AND this is the last unfinished task
    const remainingTasks = (selectedReq?.assignedTasks || []).filter(t => t.id !== taskId && t.status !== 'COMPLETED');
    const isLastTask = remainingTasks.length === 0;

    if (!selectedReq?.approverId && isLastTask) {
      const confirmed = window.confirm(
        '최종 승인자가 미지정된 요청입니다.\n본 업무 완료 시 모든 업무가 완료되어 요청 건이 최종 완료(DONE) 상태로 전환되고 고객사에 통보됩니다.\n\n계속 진행하시겠습니까?'
      );
      if (!confirmed) return;
    }

    try {
      const res = await fetch(`/api/client-requests/${reqId}/tasks/${taskId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          spentHours: hoursNum,
          note: (inlineCompleteNote || '').trim(),
          actorId: user?.id,
          actorName: user?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.allCompleted) {
          if (!selectedReq.approverId) {
            onShowToast('요청 최종 완료', '모든 업무가 완료되어 요청 건이 최종 완료 처리되었습니다.');
          } else {
            onShowToast('업무 완료 (승인 대기)', `모든 업무가 완료되어 최종 승인자(${selectedReq.approverName}) 승인을 대기합니다.`);
          }
        } else {
          onShowToast('업무 완료 기록', `업무 완료 및 공수(${hoursNum}h)가 기록되었습니다.`);
        }
        setInlineCompletingTaskId(null);
        setInlineCompleteHours('');
        setInlineCompleteNote('');
        await loadClientRequests();
        if (selectedReq && selectedReq.id === reqId) {
          setSelectedReq(data.request);
        }
      } else {
        alert(data.message || '완료 처리 실패');
      }
    } catch (err) {
      alert('완료 처리 중 오류가 발생했습니다.');
    }
  };

  const handleFinalApprove = async (req) => {
    if (!window.confirm(`[${req.title}] 요청의 작업을 최종 승인하고 고객사로 완료 전달하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/client-requests/${req.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approverId: user?.id,
          approverName: user?.name,
          completionSummary: req.completionSummary || '최종 검토 및 완료 승인되었습니다.'
        })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('최종 승인 완료', '작업이 최종 완료 처리되었으며 고객사에게 알림이 전달되었습니다.');
        await loadClientRequests();
        if (selectedReq && selectedReq.id === req.id) {
          setSelectedReq(data.request);
        }
      } else {
        alert(data.message || '승인 실패');
      }
    } catch (err) {
      alert('최종 승인 처리 오류');
    }
  };

  const requestedClientRequests = clientRequests.filter(r => r.status === 'REQUESTED');
  const inProgressClientRequests = clientRequests.filter(r => r.status === 'RECEIVED' || r.status === 'IN_PROGRESS' || r.status === 'REOPENED');
  const reviewClientRequests = clientRequests.filter(r => r.status === 'DONE' && !r.clientConfirmed);
  const doneClientRequests = clientRequests.filter(r => r.status === 'DONE' && r.clientConfirmed);

  const getStatusLabel = (req) => {
    if (!req) return '';
    const status = typeof req === 'string' ? req : req.status;
    const isConfirmed = typeof req === 'object' ? req.clientConfirmed : false;

    // Check if all assigned tasks are completed and awaiting final approval
    if (typeof req === 'object' && req.assignedTasks && req.assignedTasks.length > 0) {
      const allDone = req.assignedTasks.every(t => t.status === 'COMPLETED');
      if (allDone && req.approverId && req.status !== 'DONE') {
        return '최종 승인 대기';
      }
    }

    switch (status) {
      case 'REQUESTED': return '요청';
      case 'RECEIVED': return '접수 완료';
      case 'IN_PROGRESS': return '진행 중';
      case 'DONE': return isConfirmed ? '작업 완료' : '확인 요청';
      default: return status || '';
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'DEV': return '개발';
      case 'DESIGN': return '디자인';
      case 'PUBLISH': return '퍼블';
      case 'PLAN': return '기획';
      case 'ETC': return '기타';
      default: return category || '기타';
    }
  };

  return (
    <div style={{ paddingBottom: '3.5rem' }}>
      {/* Main Employee Navigation Tabs */}
      <div className="tabs-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto' }}>
          <button 
            className={`tab-btn tab-btn-lg ${activeTab === 'commute' ? 'active' : ''}`}
            onClick={() => setActiveTab('commute')}
          >
            근태 관리
          </button>
          <button 
            className={`tab-btn tab-btn-lg ${activeTab === 'client_requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('client_requests')}
            style={{ position: 'relative' }}
          >
            요청관리
            {requestedClientRequests.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '8px',
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  display: 'block'
                }}
              />
            )}
          </button>
          <button 
            className={`tab-btn tab-btn-lg ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            프로젝트 관리
          </button>
          <button 
            className={`tab-btn tab-btn-lg ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            일정 관리
          </button>
          <button 
            className={`tab-btn tab-btn-lg ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            파일
          </button>
          <button 
            className={`tab-btn tab-btn-lg ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            환경설정
          </button>
          {(user.role === 'ADMIN' || user.role === 'HR' || user.username === 'insa') && (
            <button 
              className={`tab-btn tab-btn-lg ${activeTab === 'payroll' ? 'active' : ''}`}
              onClick={() => setActiveTab('payroll')}
            >
              급여 관리
            </button>
          )}
          {user.role === 'ADMIN' && (
            <button 
              className={`tab-btn tab-btn-lg ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              관리자
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: COMMUTE & LEAVE (근태 관리: 좌우 마진 제거 & 아래로 떨어지는 1열 스택 레이아웃) */}
      {activeTab === 'commute' && (
        <div style={{ paddingTop: '2.5rem', width: '100%' }}>
          
          {/* 1. 당일 근태 섹션: 날짜 -> 근무 상태 -> 플립 시계 -> 메인 허브와 동일한 출퇴근 슬롯 */}
          <div style={{ marginBottom: '3.5rem' }}>
            {/* 날짜 (오늘의 근태 텍스트 배제) */}
            <div style={{
              fontSize: '18px',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              marginBottom: '0.85rem'
            }}>
              {getFormattedToday()}
            </div>

            {/* 상태 (대형 타이포그래피) */}
            <div style={{
              fontSize: '40px',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '1.25rem',
              lineHeight: 1.1
            }}>
              {attendance && attendance.checkIn ? (
                attendance.status === 'COMPLETED' ? '퇴근 완료' : (attendance.status === 'OUT' ? '외출 중' : (attendance.workType === 'REMOTE' ? '재택근무 중' : (attendance.workType === 'FIELD' ? '외근 중' : '근무 중')))
              ) : (
                isTodayFullDayLeave && todayLeave?.status === 'APPROVED' ? (todayLeave.leaveType === 'SICK' ? '병가' : (todayLeave.leaveType === 'SPECIAL' ? '경조사' : (todayLeave.leaveType === 'ETC' ? '휴가' : '연차'))) :
                '출근 전'
              )}
            </div>

            {/* 실시간 콤팩트 플립 시계 */}
            <div style={{ marginBottom: '1.75rem' }}>
              <FlipClock size="compact" />
            </div>

            {/* 출근 / 퇴근 / 연차 슬롯 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              {isTodayFullDayLeave && todayLeave?.status === 'APPROVED' && !attendance?.checkIn ? (
                <>
                  <div
                    style={{
                      minWidth: '96px',
                      height: '42px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'default',
                      userSelect: 'none'
                    }}
                  >
                    {todayLeave?.leaveType === 'SICK' ? '병가' : (todayLeave?.leaveType === 'SPECIAL' ? '경조사' : (todayLeave?.leaveType === 'ETC' ? '휴가' : '연차'))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveTab('calendar')}
                    style={{
                      minWidth: '96px',
                      height: '42px',
                      fontSize: '15px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    관리
                  </button>
                </>
              ) : (
                <>
                  {/* 1. 출근 / 재택 / 외근 버튼 또는 시간 박스 */}
                  {!attendance?.checkIn ? (
                    isAmHalfLocked ? (
                      <div
                        style={{
                          minWidth: '96px',
                          height: '42px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'default',
                          userSelect: 'none'
                        }}
                        title="오전 반차 휴무 중 (출근은 13:00부터 가능합니다)"
                      >
                        반차
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          if (approvedWorkType === 'REMOTE') {
                            onCheckIn('REMOTE', '사전 승인 재택근무');
                          } else if (approvedWorkType === 'FIELD') {
                            onCheckIn('FIELD', '사전 승인 외근');
                          } else {
                            onCheckIn('OFFICE', isAmHalfLeave ? '오전 반차 출근' : '');
                          }
                        }}
                        title={
                          isAmHalfLeave ? '오전 반차 출근' :
                          (approvedWorkType === 'REMOTE' ? '사전 승인된 재택근무 출근' :
                          (approvedWorkType === 'FIELD' ? '사전 승인된 외근/출장 출근' : '사내정상 출근'))
                        }
                        style={{
                          minWidth: '96px',
                          height: '42px',
                          fontSize: '15px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        {approvedWorkType === 'REMOTE' ? '재택' : (approvedWorkType === 'FIELD' ? '외근' : '출근')}
                      </button>
                    )
                  ) : (
                    <div
                      title={`출근 시간: ${attendance.checkIn}`}
                      style={{
                        minWidth: '96px',
                        height: '42px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        letterSpacing: '0.02em'
                      }}
                    >
                      {attendance.checkIn.slice(0, 5)}
                    </div>
                  )}

                  {/* 2. 퇴근 버튼 / 시간 박스 */}
                  {attendance?.checkOut ? (
                    <div
                      title={`퇴근 시간: ${attendance.checkOut}`}
                      style={{
                        minWidth: '96px',
                        height: '42px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        letterSpacing: '0.02em'
                      }}
                    >
                      {attendance.checkOut.slice(0, 5)}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onCheckOut}
                      style={{
                        minWidth: '96px',
                        height: '42px',
                        fontSize: '15px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        cursor: attendance?.checkIn ? 'pointer' : 'default',
                        opacity: attendance?.checkIn ? 1 : 0.45
                      }}
                    >
                      퇴근
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 4단 대형 아코디언 메뉴: 달력보기 / 연차 현황 / 근태 신청 / 근태 내역 */}
          <div style={{ marginTop: '3.5rem', display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-color)' }}>

            {/* 1. 달력보기 */}
            <div style={{ borderBottom: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => toggleCommuteSection('calendar')}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '1.75rem 0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  outline: 'none'
                }}
              >
                <span style={{ fontSize: '26px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  달력보기
                </span>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    color: 'var(--text-secondary)',
                    transform: commuteAccordionState.calendar ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: commuteAccordionState.calendar ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                  overflow: 'hidden'
                }}
              >
                <div style={{ minHeight: 0 }}>
                  <div style={{ padding: '0.5rem 0 3rem 0' }}>
                    <UserWorkCalendar
                      user={user}
                      attendance={attendance}
                      onShowToast={onShowToast}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 연차 현황 */}
            <div style={{ borderBottom: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => toggleCommuteSection('leaveStatus')}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '1.75rem 0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  outline: 'none'
                }}
              >
                <span style={{ fontSize: '26px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  연차 현황
                </span>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    color: 'var(--text-secondary)',
                    transform: commuteAccordionState.leaveStatus ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: commuteAccordionState.leaveStatus ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                  overflow: 'hidden'
                }}
              >
                <div style={{ minHeight: 0 }}>
                  <div style={{ padding: '2rem 0.25rem 3rem 0.25rem' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: nextLeaveGrantInfo ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                      gap: '2rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          잔여 연차
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                          <span style={{ fontSize: '28px', color: 'var(--text-primary)', lineHeight: 1 }}>
                            {user.remainingLeave !== undefined ? user.remainingLeave : ((user.totalLeave || 15) - (user.usedLeave || 0))}
                          </span>
                          <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>일</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          사용 연차
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                          <span style={{ fontSize: '28px', color: 'var(--text-secondary)', lineHeight: 1 }}>
                            {user.usedLeave || 0}
                          </span>
                          <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>일</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          총 부여 연차
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                          <span style={{ fontSize: '28px', color: 'var(--text-muted)', lineHeight: 1 }}>
                            {user.totalLeave || 15}
                          </span>
                          <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>일</span>
                        </div>
                      </div>

                      {nextLeaveGrantInfo && (
                        <div>
                          <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                            연차 발생일
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                            <span style={{ fontSize: '28px', color: 'var(--text-primary)', lineHeight: 1 }}>
                              {nextLeaveGrantInfo.monthlyGrantText}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. 근태 신청 */}
            <div style={{ borderBottom: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => toggleCommuteSection('apply')}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '1.75rem 0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  outline: 'none'
                }}
              >
                <span style={{ fontSize: '26px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  근태 신청
                </span>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    color: 'var(--text-secondary)',
                    transform: commuteAccordionState.apply ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: commuteAccordionState.apply ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                  overflow: 'hidden'
                }}
              >
                <div style={{ minHeight: 0 }}>
                  <div style={{ padding: '2rem 0.25rem 3rem 0.25rem' }}>
                    <form onSubmit={handleOpenApplyConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* 1. 휴가 및 근무 유형 (알약 / 칩 스타일 버튼 선택기) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      paddingBottom: '1.5rem',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, flexShrink: 0, paddingTop: '6px' }}>
                        유형
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center', flex: 1 }}>
                        {[
                          { value: 'ANNUAL', label: '연차' },
                          { value: 'HALF_AM', label: '오전 반차' },
                          { value: 'HALF_PM', label: '오후 반차' },
                          { value: 'HOLIDAY_WORK', label: '휴일근무' },
                          { value: 'OVERTIME', label: '야근' },
                          { value: 'REMOTE', label: '재택근무' },
                          { value: 'SICK', label: '병가' },
                          { value: 'SPECIAL', label: '경조사' },
                          { value: 'OFFICIAL', label: '공가' },
                          { value: 'ETC', label: '기타' }
                        ].map(t => {
                          const isSelected = applyType === t.value;
                          return (
                            <button
                              key={t.value}
                              type="button"
                              onClick={() => {
                                const nextVal = t.value;
                                setApplyType(nextVal);
                                if (nextVal === 'OVERTIME') {
                                  setWorkStartTime('18:00');
                                  setWorkEndTime('19:00');
                                } else if (nextVal === 'HOLIDAY_WORK') {
                                  setWorkStartTime('10:00');
                                  setWorkEndTime('11:00');
                                }
                                setSelectedSlots({});
                              }}
                              style={{
                                padding: '0.55rem 1.2rem',
                                borderRadius: '9999px',
                                border: isSelected ? '1px solid var(--text-primary)' : '1px solid var(--border-color)',
                                backgroundColor: isSelected ? 'var(--text-primary)' : 'transparent',
                                color: isSelected ? 'var(--bg-main)' : 'var(--text-primary)',
                                fontSize: '15px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                outline: 'none'
                              }}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. 결재선 지정 (팀장/관리자: 이름만 노출) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      paddingBottom: '1.5rem',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, flexShrink: 0 }}>
                        결재선
                      </span>
                      <div style={{ flex: 1, maxWidth: '320px' }}>
                        {user?.role === 'ADMIN' ? (
                          <div style={{
                            padding: '0.65rem 1rem',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            fontSize: '15px'
                          }}>
                            최고 관리자 본인 결재 (즉시 전결 처리)
                          </div>
                        ) : user?.role === 'TEAM_LEADER' ? (
                          <select
                            required
                            value={approverId}
                            onChange={(e) => setApproverId(e.target.value)}
                            style={{
                              width: '100%',
                              height: '42px',
                              padding: '0 1rem',
                              fontSize: '15px',
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 0,
                              color: 'var(--text-primary)',
                              outline: 'none',
                              cursor: 'pointer',
                              colorScheme: 'dark'
                            }}
                          >
                            <option value="">결재자 선택</option>
                            {teamLeaderApprovers.map(leader => (
                              <option key={leader.id} value={leader.id}>
                                {leader.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            required
                            value={approverId}
                            onChange={(e) => setApproverId(e.target.value)}
                            style={{
                              width: '100%',
                              height: '42px',
                              padding: '0 1rem',
                              fontSize: '15px',
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 0,
                              color: 'var(--text-primary)',
                              outline: 'none',
                              cursor: 'pointer',
                              colorScheme: 'dark'
                            }}
                          >
                            <option value="">결재자 선택</option>
                            {Object.entries(approverGroups).map(([dept, emps]) => (
                              <optgroup key={dept} label={dept}>
                                {emps.map(approver => (
                                  <option key={approver.id} value={approver.id}>
                                    {approver.name}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* 3. 신청 일정 달력 (ApplicationCalendar) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      paddingBottom: '1.5rem',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, flexShrink: 0, paddingTop: '6px' }}>
                        일정
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                        <ApplicationCalendar
                          category={applyCategory}
                          applyType={applyType}
                          selectedSlots={selectedSlots}
                          onToggleSlot={handleToggleSlot}
                          existingLeaves={myRecentLeaves}
                        />
                      </div>
                    </div>

                    {/* 4. 근무 시간 선택기 (휴일근무 및 야근 선택 시 일정 바로 아래에 노출) */}
                    {(applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME') && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        paddingBottom: '1.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        gap: '1.5rem'
                      }}>
                        <span style={{ width: '100px', fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, flexShrink: 0 }}>
                          근무 시간
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <CustomTimePicker
                            value={workStartTime}
                            onChange={handleStartTimeChange}
                            filter={(t) => t !== '24:00'}
                            width="110px"
                            height="42px"
                          />
                          <span style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>~</span>
                          <CustomTimePicker
                            value={workEndTime}
                            onChange={setWorkEndTime}
                            minTime={workStartTime}
                            width="110px"
                            height="42px"
                          />
                          <span style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color)', margin: '0 0.35rem' }} />
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                            {calculateDuration(workStartTime, workEndTime).text}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 4. 사유 (높이 적당히 높이고 고정: resize none) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      paddingBottom: '1.25rem',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <label style={{ width: '100px', fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, flexShrink: 0, paddingTop: '8px' }}>
                        사유
                      </label>
                      <textarea
                        required
                        value={applyReason}
                        onChange={(e) => setApplyReason(e.target.value)}
                        placeholder="업무 사유 또는 특이사항을 입력하세요"
                        style={{
                          flex: 1,
                          height: '110px',
                          fontSize: '16px',
                          backgroundColor: 'var(--bg-input, var(--bg-hover))',
                          border: '1px solid var(--border-color)',
                          borderRadius: 0,
                          color: 'var(--text-primary)',
                          resize: 'none',
                          lineHeight: 1.6,
                          padding: '0.85rem 1rem',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* 5. 액션 버튼 */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: '1.25rem'
                    }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{
                          height: '44px',
                          padding: '0 2rem',
                          fontSize: '15px',
                          fontWeight: 600,
                          borderRadius: 0,
                          cursor: 'pointer'
                        }}
                      >
                        신청하기
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* 4. 근태 내역 */}
            <div style={{ borderBottom: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => toggleCommuteSection('history')}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '1.75rem 0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  outline: 'none'
                }}
              >
                <span style={{ fontSize: '26px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  근태 내역
                </span>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    color: 'var(--text-secondary)',
                    transform: commuteAccordionState.history ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: commuteAccordionState.history ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                  overflow: 'hidden'
                }}
              >
                <div style={{ minHeight: 0 }}>
                  <div id="leave-history-section" style={{ padding: '2rem 0.25rem 3.5rem 0.25rem' }}>
                    {/* 표준 목록 테이블 (card, borderRadius: 0, padding: 0) */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 0, border: '1px solid var(--border-color)' }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap', width: '28%' }}>대상 일정</th>
                      <th style={{ whiteSpace: 'nowrap', width: '14%' }}>유형</th>
                      <th style={{ minWidth: '220px' }}>신청 사유</th>
                      <th style={{ whiteSpace: 'nowrap', width: '14%' }}>결재자</th>
                      <th style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '18%' }}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedMyLeaves.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '4.5rem 1rem', color: 'var(--text-muted)' }}>
                          신청 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      groupedMyLeaves.map((group) => {
                        const statusInfo = getLeaveStatusInfo(group.status);
                        const isPending = group.status === 'PENDING';
                        const isRejected = group.status === 'REJECTED';
                        const isExpanded = expandedGroupKey === group.groupKey;
                        const hasExpandableContent = isRejected && Boolean(group.rejectReason);

                        return (
                          <React.Fragment key={group.groupKey}>
                            <tr
                              className={isRejected ? `rejected-row ${isExpanded ? 'is-expanded' : ''}` : ''}
                              onClick={() => {
                                if (hasExpandableContent) {
                                  setExpandedGroupKey(prev => prev === group.groupKey ? null : group.groupKey);
                                }
                              }}
                              style={{
                                cursor: hasExpandableContent ? 'pointer' : 'default',
                                backgroundColor: isRejected ? 'var(--bg-main)' : 'transparent',
                                transition: 'background-color 0.2s ease'
                              }}
                            >
                              <td style={{
                                color: isRejected ? 'var(--text-muted)' : 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)',
                                verticalAlign: (group.dateLines?.length || 0) > 1 ? 'top' : 'middle'
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {group.dateLines?.map((line, lIdx) => (
                                    <div key={lIdx}>{line}</div>
                                  )) || group.dateDisplay}
                                </div>
                              </td>
                              <td style={{
                                color: isRejected ? 'var(--text-muted)' : 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)',
                                verticalAlign: (group.dateLines?.length || 0) > 1 ? 'top' : 'middle'
                              }}>
                                {group.typesDisplay}
                              </td>
                              <td style={{
                                color: isRejected ? 'var(--text-muted)' : 'var(--text-primary)',
                                wordBreak: 'keep-all',
                                overflowWrap: 'break-word',
                                borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)',
                                verticalAlign: (group.dateLines?.length || 0) > 1 ? 'top' : 'middle'
                              }}>
                                <div>{group.reason || '-'}</div>
                              </td>
                              <td style={{
                                color: isRejected ? 'var(--text-muted)' : 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)',
                                verticalAlign: (group.dateLines?.length || 0) > 1 ? 'top' : 'middle'
                              }}>
                                {group.cleanApprover}
                              </td>
                              <td style={{ textAlign: 'center', whiteSpace: 'nowrap', borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)', verticalAlign: (group.dateLines?.length || 0) > 1 ? 'top' : 'middle' }}>
                                {isPending ? (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '15px' }}>
                                    <span style={{ color: 'var(--text-primary)' }}>
                                      승인 대기
                                    </span>
                                    <span style={{ color: 'var(--border-color)' }}>·</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelGroupLeaves(group.itemIds);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        fontSize: '15px',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        textUnderlineOffset: '3px',
                                        outline: 'none',
                                        transition: 'color 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                    >
                                      신청 취소
                                    </button>
                                  </div>
                                ) : isRejected ? (
                                  <div 
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '0.4rem', 
                                      color: 'var(--text-muted)', 
                                      fontSize: '15px',
                                      cursor: hasExpandableContent ? 'pointer' : 'default'
                                    }}
                                  >
                                    <span>반려됨</span>
                                    {hasExpandableContent && (
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', transition: 'transform 0.25s ease', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                        ▼
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                                    {(group.isSuperAdminLeave && group.status === 'APPROVED') ? '등록 완료' : statusInfo.label}
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* 인라인 아코디언 (Row Expand): 스르륵 부드러운 그리드 슬라이드 & 반려 사유 단독 표기 */}
                            {isRejected && (
                              <tr 
                                className="rejected-accordion-row"
                                style={{
                                  backgroundColor: 'var(--bg-main)',
                                  transition: 'background-color 0.2s ease'
                                }}
                              >
                                <td colSpan={5} style={{ padding: 0, borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none', transition: 'border-bottom 0.2s ease' }}>
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateRows: isExpanded ? '1fr' : '0fr',
                                      transition: isExpanded
                                        ? 'grid-template-rows 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
                                        : 'grid-template-rows 0.28s cubic-bezier(0.25, 1, 0.35, 1)',
                                      overflow: 'hidden'
                                    }}
                                  >
                                    <div style={{ minHeight: 0 }}>
                                      <div
                                        style={{
                                          padding: '0.35rem 1.25rem 1.25rem 1.25rem',
                                          display: 'flex',
                                          alignItems: 'baseline',
                                          gap: '0.85rem',
                                          fontSize: '15px',
                                          opacity: isExpanded ? 1 : 0,
                                          transform: isExpanded ? 'translateY(0)' : 'translateY(-6px)',
                                          transition: isExpanded
                                            ? 'opacity 0.28s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
                                            : 'opacity 0.2s ease, transform 0.25s ease'
                                        }}
                                      >
                                        <span style={{ fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0, fontSize: '15px' }}>
                                          반려 사유
                                        </span>
                                        <span style={{ color: 'var(--text-primary)', lineHeight: 1.6, wordBreak: 'keep-all', overflowWrap: 'break-word', fontSize: '15px' }}>
                                          {group.rejectReason || '사유가 입력되지 않았습니다.'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
)}

      {/* TAB 2: CALENDAR (일정 관리) */}
      {activeTab === 'calendar' && (
        <div style={{ paddingTop: '1.5rem', paddingBottom: '5.5rem', width: '100%' }}>
          {/* 전사 및 고객사 협업 일정 달력 */}
          <CompanyCalendar
            user={user}
            schedules={schedules}
            clients={clients}
            files={files}
            leaves={leavesList}
            employees={employees}
            initialScheduleId={targetScheduleId}
            onCloseDetail={onClearTargetScheduleId}
            onAddSchedule={onAddSchedule}
            onUpdateSchedule={onUpdateSchedule}
            onDeleteSchedule={onDeleteSchedule}
            onShowToast={onShowToast}
            onRefresh={() => {
              loadLeaves();
              if (onRefresh) onRefresh();
            }}
            onUploadFile={onUploadFile}
            onLinkFilesToSchedule={onLinkFilesToSchedule}
            theme={theme}
          />
        </div>
      )}

      {/* TAB 3: TASKS */}
      {activeTab === 'tasks' && (
        <TaskBoard
          user={user}
          tasks={tasks}
          employees={employees}
          onAddTask={onAddTask}
          onUpdateTaskStatus={onUpdateTaskStatus}
          onShowToast={onShowToast}
          onRefresh={onRefresh}
        />
      )}

      {/* TAB 4: CLIENT REQUESTS & MAN-HOURS (고객사와 동일한 탭 & 목록 테이블 스타일) */}
      {activeTab === 'client_requests' && (
        <div>
          {/* Toolbar: Sub-tabs (Left) + Search & Custom Date Filter (Right) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}>
            {/* Sub-tabs for Worker Workflow: 4단계 (작업 요청 | 진행 중 | 확인 요청 | 작업 완료) */}
            <div className="tabs-nav" style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', margin: 0 }}>
              <button 
                className={`tab-btn tab-btn-lg ${clientReqTab === 'REQUESTED' ? 'active' : ''}`}
                onClick={() => { setClientReqTab('REQUESTED'); setSelectedReq(null); setSelectedReqDate(''); setReqSearchTerm(''); }}
              >
                작업 요청 ({requestedClientRequests.length})
              </button>
              <button 
                className={`tab-btn tab-btn-lg ${clientReqTab === 'IN_PROGRESS' ? 'active' : ''}`}
                onClick={() => { setClientReqTab('IN_PROGRESS'); setSelectedReq(null); setSelectedReqDate(''); setReqSearchTerm(''); }}
              >
                진행 중 ({inProgressClientRequests.length})
              </button>
              <button 
                className={`tab-btn tab-btn-lg ${clientReqTab === 'REVIEW' ? 'active' : ''}`}
                onClick={() => { setClientReqTab('REVIEW'); setSelectedReq(null); setSelectedReqDate(''); setReqSearchTerm(''); }}
              >
                확인 요청 ({reviewClientRequests.length})
              </button>
              <button 
                className={`tab-btn tab-btn-lg ${clientReqTab === 'DONE' ? 'active' : ''}`}
                onClick={() => { setClientReqTab('DONE'); setSelectedReq(null); setSelectedReqDate(''); setReqSearchTerm(''); }}
              >
                작업 완료 ({doneClientRequests.length})
              </button>
            </div>

            {/* Right: Search Input + Custom Date Filter (고객사 포털 등록일 검색 UI와 100% 동일한 셋팅) */}
            {(() => {
              const baseList = clientReqTab === 'REQUESTED' ? requestedClientRequests
                : clientReqTab === 'IN_PROGRESS' ? inProgressClientRequests
                : clientReqTab === 'REVIEW' ? reviewClientRequests
                : doneClientRequests;
              const currentRequestDates = baseList.map(r => (clientReqTab === 'DONE' && r.completedAt) ? r.completedAt.slice(0, 10) : (r.requestDate || r.createdAt || '').slice(0, 10)).filter(Boolean);

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <CustomDatePicker 
                    value={selectedReqDate}
                    onChange={(val) => setSelectedReqDate(val)}
                    requestDates={currentRequestDates}
                    placeholder={clientReqTab === 'DONE' ? '완료일 검색' : '등록일 검색'}
                  />

                  <input 
                    type="text"
                    placeholder="제목, 내용 또는 고객사 검색..."
                    value={reqSearchTerm}
                    onChange={(e) => setReqSearchTerm(e.target.value)}
                    className="form-control"
                    style={{ width: '240px', height: '42px', padding: '0 0.85rem' }}
                  />

                  {(reqSearchTerm || selectedReqDate) && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setReqSearchTerm(''); setSelectedReqDate(''); }}
                      style={{ height: '42px' }}
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Full-width List Table (고객사 포털과 동일한 목록 스타일) */}
          {(() => {
            const baseList = clientReqTab === 'REQUESTED' ? requestedClientRequests
              : clientReqTab === 'IN_PROGRESS' ? inProgressClientRequests
              : clientReqTab === 'REVIEW' ? reviewClientRequests
              : doneClientRequests;

            const currentList = baseList.filter(req => {
              if (selectedReqDate) {
                const targetDate = (clientReqTab === 'DONE' && req.completedAt) ? req.completedAt.slice(0, 10) : (req.requestDate || req.createdAt || '').slice(0, 10);
                if (targetDate !== selectedReqDate) return false;
              }
              if (reqSearchTerm) {
                const q = reqSearchTerm.toLowerCase();
                const matchTitle = (req.title || '').toLowerCase().includes(q);
                const matchDesc = (req.description || '').toLowerCase().includes(q);
                const matchCompany = (req.clientCompanyName || req.companyName || '').toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchCompany) return false;
              }
              return true;
            });

            return (
              <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 0 }}>
                {/* Header Row (양끝 간격 최적화: 좌우 0 패딩으로 컨테이너 경계와 정렬) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1.05rem 0',
                  background: 'var(--bg-card-hover)',
                  borderBottom: '2px solid var(--border-color)',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em'
                }}>
                  <span style={{ width: '88px', flexShrink: 0, textAlign: 'center' }}>번호</span>
                  <span style={{ width: '150px', flexShrink: 0, textAlign: 'center' }}>고객사</span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>제목</span>
                  <span style={{ width: '130px', flexShrink: 0, textAlign: 'center' }}>희망완료일</span>
                  <span style={{ width: '130px', flexShrink: 0, textAlign: 'center' }}>등록일</span>
                  {clientReqTab === 'IN_PROGRESS' && (
                    <span style={{ width: '120px', flexShrink: 0, textAlign: 'center' }}>상태</span>
                  )}
                </div>

                {currentList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '16px' }}>
                      {clientReqTab === 'REQUESTED' ? '접수 대기 중인 신규 요청이 없습니다.'
                        : clientReqTab === 'IN_PROGRESS' ? '현재 진행 중인 작업이 없습니다.'
                        : clientReqTab === 'REVIEW' ? '고객사 확인 대기 중인 요청이 없습니다.'
                        : '완료된 요청 히스토리가 없습니다.'}
                    </p>
                  </div>
                ) : (
                  <div>
                    {currentList.map((req, idx) => {
                      const isSelected = selectedReq && selectedReq.id === req.id;
                      const isLast = idx === currentList.length - 1;
                      return (
                        <div
                          key={req.id}
                          className="client-req-item"
                          onClick={() => handleOpenDrawer(req)}
                          style={{
                            padding: '1.1rem 0',
                            cursor: 'pointer',
                            borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                            backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'var(--transition)'
                          }}
                        >
                          {/* 1. 번호 */}
                          <span style={{ width: '88px', flexShrink: 0, textAlign: 'center', fontSize: '15px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {currentList.length - idx}
                          </span>

                          {/* 2. 고객사 */}
                          <span style={{ width: '150px', flexShrink: 0, padding: '0 1rem', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {req.clientName}
                          </span>

                          <div style={{ flex: 1, minWidth: 0, padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {req.priority === 'HIGH' && (
                              req.status === 'DONE' ? (
                                <span className="urgent-dot-done" title="긴급 (작업 완료)" />
                              ) : (
                                <span className="urgent-dot" title="긴급" />
                              )
                            )}
                            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {req.title}
                            </span>
                          </div>

                          {/* 4. 희망완료일 */}
                          <span style={{ width: '130px', flexShrink: 0, textAlign: 'center', fontSize: '15px', color: req.desiredDate ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                            {req.desiredDate || '-'}
                          </span>

                          {/* 5. 등록일 */}
                          <span style={{ width: '130px', flexShrink: 0, textAlign: 'center', fontSize: '15px', color: 'var(--text-secondary)' }}>
                            {req.createdAt?.slice(0, 10)}
                          </span>

                          {/* 6. 상태 (진행 중 탭 전용) */}
                          {clientReqTab === 'IN_PROGRESS' && (
                            <span style={{
                              width: '120px',
                              flexShrink: 0,
                              textAlign: 'center',
                              fontSize: '15px',
                              fontWeight: 500,
                              color: req.status === 'IN_PROGRESS' ? '#3b82f6' : 'var(--text-primary)'
                            }}>
                              {getStatusLabel(req)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* DRAWER: SELECTED REQUEST DETAIL & ACTIONS */}
          {selectedReq && (
            <div
              className={`detail-backdrop ${isDrawerClosing ? 'closing' : ''}`}
              onClick={handleCloseDrawer}
            >
              {/* TIMELINE SIDE PANEL (드로어 좌측 도킹, 닫기 버튼 옆 시계 아이콘으로 토글) */}
              {(showReqHistoryPanel || isReqTimelineClosing) && (
                <div
                  ref={reqTimelinePanelRef}
                  className={`timeline-slide-panel ${isReqTimelineClosing ? 'closing' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    animation: isReqTimelineClosing
                      ? 'slideOutTimeline 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                      : 'slideInTimeline 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                  }}
                >
                  {/* Timeline Body (일정관리 CompanyCalendar와 100% 동일한 정통 타임라인 스타일 복원) */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '3rem 2rem 2.5rem 2rem',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {(!selectedReq.history || selectedReq.history.length === 0) ? (
                      <div style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                        기록 없음
                      </div>
                    ) : (
                      <div style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2.5rem',
                        marginLeft: '0.5rem'
                      }}>
                        {(selectedReq.history || []).map((item, idx, arr) => {
                          const isLast = idx === arr.length - 1;
                          return (
                            <div key={item.id || idx} style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                              {/* Dot indicator on vertical track */}
                              <div style={{
                                position: 'absolute',
                                left: '0px',
                                top: '6px',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--text-primary)',
                                zIndex: 2
                              }} />

                              {/* Connecting vertical line (마지막 아이템은 선 없이 점으로 종료) */}
                              {!isLast && (
                                <div style={{
                                  position: 'absolute',
                                  left: '3.5px',
                                  top: '14px',
                                  bottom: '-2.5rem',
                                  width: '1px',
                                  backgroundColor: 'var(--border-color)',
                                  zIndex: 1
                                }} />
                              )}

                              {/* 1. Action */}
                              <div style={{
                                fontSize: '17px',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                lineHeight: 1.3,
                                letterSpacing: '-0.01em'
                              }}>
                                {item.action}
                              </div>

                              {/* 2. Target Name / Actor */}
                              {(item.detail || item.actorName) && (
                                <div style={{
                                  fontSize: '16px',
                                  fontWeight: 500,
                                  color: 'var(--text-primary)',
                                  marginTop: '0.35rem',
                                  lineHeight: 1.4
                                }}>
                                  {item.detail || item.actorName}
                                </div>
                              )}

                              {/* 3. Timestamp */}
                              {item.timestamp && (
                                <div style={{
                                  fontSize: '16px',
                                  color: 'var(--text-muted)',
                                  marginTop: '0.25rem',
                                  letterSpacing: '-0.01em',
                                  lineHeight: 1.4
                                }}>
                                  {String(item.timestamp).replace('T', ' ').slice(0, 16)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main Detail Drawer */}
              <div
                className={`detail-slide-drawer drawer-md ${isDrawerClosing ? 'closing' : ''}`}
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
              >
                {/* Header: Timeline Toggle & Close button (우측 상단 정렬) */}
                <div style={{
                  padding: '2.5rem 2.25rem 1.5rem 2.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  backgroundColor: 'var(--bg-card)',
                  gap: '0.6rem',
                  flexShrink: 0
                }}>
                  {/* Timeline Toggle Button (Pure icon with no background) */}
                  <button
                    ref={reqTimelineToggleBtnRef}
                    type="button"
                    onClick={handleToggleReqTimeline}
                    title="진행 이력"
                    aria-label="진행 이력"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '6px',
                      cursor: 'pointer',
                      color: showReqHistoryPanel ? 'var(--text-primary)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none',
                      borderRadius: '4px',
                      transition: 'color 0.15s ease, opacity 0.15s ease',
                      opacity: showReqHistoryPanel ? 1 : 0.8
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = showReqHistoryPanel ? '1' : '0.8'}
                  >
                    <Clock size={20} strokeWidth={2} />
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseDrawer}
                    title="닫기"
                    aria-label="닫기"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '6px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none',
                      borderRadius: '4px'
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                {/* Detail Drawer Body */}
                <div style={{ flex: 1, padding: '0 2.25rem 2.5rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto', minHeight: 0 }}>
                  {/* Hero Title: 고객사 명만 깔끔하게 */}
                  <div style={{ paddingTop: '0.65rem' }}>
                    <h3 style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      margin: 0,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.35
                    }}>
                      {selectedReq.clientName}
                    </h3>
                  </div>

                  {/* Standardized Meta Info List (우리가 사용하던 스타일) */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: '1px solid var(--border-color)'
                  }}>
                    {/* 1. 등록일 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      padding: '1.25rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                        등록일
                      </span>
                      <span style={{ fontSize: '18px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {selectedReq.createdAt ? selectedReq.createdAt.slice(0, 16) : '-'}
                      </span>
                    </div>

                    {/* 2. 희망완료일 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      padding: '1.25rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                        희망완료일
                      </span>
                      <span style={{ fontSize: '18px', color: selectedReq.desiredDate ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.5 }}>
                        {selectedReq.desiredDate || '-'}
                      </span>
                    </div>

                    {/* 3. 제목 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      padding: '1.25rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0 }}>
                        제목
                      </span>
                      <div style={{ flex: 1, fontSize: '18px', color: 'var(--text-primary)', fontWeight: 400, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {selectedReq.priority === 'HIGH' && (
                          selectedReq.status === 'DONE' ? (
                            <span className="urgent-dot-done" title="긴급 (작업 완료)" />
                          ) : (
                            <span className="urgent-dot" title="긴급" />
                          )
                        )}
                        <span>{selectedReq.title}</span>
                      </div>
                    </div>

                    {/* 4. 내용 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      padding: '1.25rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0 }}>
                        내용
                      </span>
                      <div 
                        style={{ 
                          flex: 1, 
                          fontSize: '16px', 
                          color: 'var(--text-primary)', 
                          lineHeight: 1.7, 
                          wordBreak: 'break-word',
                          letterSpacing: '-0.01em'
                        }}
                        dangerouslySetInnerHTML={{ __html: formatHtmlContent(selectedReq.content) }}
                      />
                    </div>

                    {/* 5. 상태 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      padding: '1.25rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0 }}>
                        상태
                      </span>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '18px',
                          color: selectedReq.status === 'IN_PROGRESS' ? '#3b82f6' : 'var(--text-primary)',
                          fontWeight: 400,
                          lineHeight: 1.5
                        }}>
                          {getStatusLabel(selectedReq)}
                        </span>
                      </div>
                    </div>

                    {/* 6. 배정 업무 (인원 목록 및 즉시 추가) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      padding: '1.25rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0 }}>
                        배정 업무
                      </span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Tasks List */}
                        {selectedReq.assignedTasks && selectedReq.assignedTasks.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                            {selectedReq.assignedTasks.map(task => {
                              const isCompletingThis = inlineCompletingTaskId === task.id;
                              const isMyTask = user?.id === task.assigneeId;
                              const canOperate = isMyTask || user?.role === 'ADMIN';

                              return (
                                <div
                                  key={task.id}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.35rem',
                                    paddingBottom: '0.35rem'
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap'
                                  }}>
                                    {/* 분야 및 담당자명 */}
                                    <span style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                      [{task.categoryName || getCategoryLabel(task.category)}] {task.assigneeName}
                                    </span>
                                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>·</span>

                                    {/* 인터랙티브 상태 드롭다운: 호버 시 피드백 + 클릭 시 상태 선택 메뉴 팝오버 */}
                                    <div className="status-dropdown-wrapper" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (canOperate) {
                                            setActiveStatusMenuTaskId(activeStatusMenuTaskId === task.id ? null : task.id);
                                          }
                                        }}
                                        title={canOperate ? '클릭하여 상태 선택' : undefined}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          padding: '0 2px',
                                          fontSize: '15px',
                                          fontWeight: task.status === 'COMPLETED' || task.status === 'IN_PROGRESS' ? 600 : 400,
                                          color: task.status === 'COMPLETED' ? 'var(--text-primary)' : task.status === 'IN_PROGRESS' ? '#3b82f6' : 'var(--text-muted)',
                                          cursor: canOperate ? 'pointer' : 'default',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          borderRadius: '3px',
                                          transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={e => {
                                          if (canOperate) {
                                            e.currentTarget.style.color = task.status === 'IN_PROGRESS' ? '#60a5fa' : 'var(--text-primary)';
                                            e.currentTarget.style.textDecoration = 'underline';
                                          }
                                        }}
                                        onMouseLeave={e => {
                                          if (canOperate) {
                                            e.currentTarget.style.color = task.status === 'COMPLETED' ? 'var(--text-primary)' : task.status === 'IN_PROGRESS' ? '#3b82f6' : 'var(--text-muted)';
                                            e.currentTarget.style.textDecoration = 'none';
                                          }
                                        }}
                                      >
                                        <span>
                                          {task.status === 'COMPLETED' ? `완료 (${task.spentHours || 0}h)` : task.status === 'IN_PROGRESS' ? '진행 중' : '대기'}
                                        </span>
                                        {canOperate && (
                                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>▾</span>
                                        )}
                                      </button>

                                      {/* 상태 선택 미니 팝오버 메뉴 (토글이 아닌 직접 선택 UX) */}
                                      {activeStatusMenuTaskId === task.id && (
                                        <div
                                          style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 4px)',
                                            left: 0,
                                            zIndex: 60,
                                            backgroundColor: 'var(--bg-primary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                                            padding: '4px',
                                            minWidth: '120px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2px'
                                          }}
                                          onClick={e => e.stopPropagation()}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateTaskStatus(selectedReq.id, task.id, 'PENDING')}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              padding: '6px 10px',
                                              fontSize: '13px',
                                              textAlign: 'left',
                                              color: task.status === 'PENDING' ? '#3b82f6' : 'var(--text-primary)',
                                              fontWeight: task.status === 'PENDING' ? 600 : 400,
                                              cursor: 'pointer',
                                              borderRadius: '4px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              transition: 'background-color 0.12s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                          >
                                            <span>대기</span>
                                            {task.status === 'PENDING' && <span style={{ fontSize: '12px' }}>✓</span>}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateTaskStatus(selectedReq.id, task.id, 'IN_PROGRESS')}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              padding: '6px 10px',
                                              fontSize: '13px',
                                              textAlign: 'left',
                                              color: task.status === 'IN_PROGRESS' ? '#3b82f6' : 'var(--text-primary)',
                                              fontWeight: task.status === 'IN_PROGRESS' ? 600 : 400,
                                              cursor: 'pointer',
                                              borderRadius: '4px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              transition: 'background-color 0.12s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                          >
                                            <span>진행 중</span>
                                            {task.status === 'IN_PROGRESS' && <span style={{ fontSize: '12px' }}>✓</span>}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateTaskStatus(selectedReq.id, task.id, 'COMPLETED')}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              padding: '6px 10px',
                                              fontSize: '13px',
                                              textAlign: 'left',
                                              color: task.status === 'COMPLETED' ? '#3b82f6' : 'var(--text-primary)',
                                              fontWeight: task.status === 'COMPLETED' ? 600 : 400,
                                              cursor: 'pointer',
                                              borderRadius: '4px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              transition: 'background-color 0.12s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                          >
                                            <span>완료 처리...</span>
                                            {task.status === 'COMPLETED' && <span style={{ fontSize: '12px' }}>✓</span>}
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                      {task.note && (
                                        <>
                                          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>·</span>
                                          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                            {task.note}
                                          </span>
                                        </>
                                      )}

                                      {/* 배정 업무 삭제 버튼 (호버 시 부드러운 피드백, 클릭 시 확인창) */}
                                      {selectedReq.status !== 'DONE' && (user?.role === 'ADMIN' || isMyTask) && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveInlineTask(task.id)}
                                          title="배정 업무 삭제"
                                          style={{
                                            height: '20px',
                                            width: '20px',
                                            padding: 0,
                                            marginLeft: '0.15rem',
                                            color: 'var(--text-muted)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '3px',
                                            transition: 'color 0.15s ease'
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                        >
                                          <X size={14} />
                                        </button>
                                      )}
                                    </div>

                                  {/* Inline completion input form (박스 없이 순수 인라인) */}
                                  {isCompletingThis && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      flexWrap: 'wrap',
                                      marginTop: '0.35rem'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>공수:</span>
                                        <input
                                          type="number"
                                          step="0.5"
                                          min="0.5"
                                          placeholder="1.0"
                                          value={inlineCompleteHours}
                                          onChange={e => setInlineCompleteHours(e.target.value)}
                                          className="form-control"
                                          style={{ width: '70px', height: '32px', fontSize: '13px', padding: '0.2rem 0.4rem' }}
                                          autoFocus
                                        />
                                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>시간</span>
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="완료 메모 (선택)"
                                        value={inlineCompleteNote}
                                        onChange={e => setInlineCompleteNote(e.target.value)}
                                        className="form-control"
                                        style={{ flex: 1, minWidth: '130px', height: '32px', fontSize: '13px', padding: '0.2rem 0.5rem' }}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        style={{ height: '32px', padding: '0 0.65rem', fontSize: '13px' }}
                                        onClick={() => handleSaveInlineTaskCompletion(selectedReq.id, task.id)}
                                      >
                                        저장
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        style={{ height: '32px', padding: '0 0.5rem', fontSize: '13px' }}
                                        onClick={() => setInlineCompletingTaskId(null)}
                                      >
                                        취소
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

                        {/* Inline Task Add Form / Button (박스 없이 인라인, 이미 추가된 인원 제외) */}
                        {(() => {
                          if (selectedReq.status === 'DONE') return null;
                          const assignedEmpIds = (selectedReq.assignedTasks || []).map(t => t.assigneeId);
                          const availableEmployees = (employees || []).filter(emp => !assignedEmpIds.includes(emp.id));

                          if (isAddingTask) {
                            const candidateEmployees = getMatchingEmployeesForCategory(availableEmployees, newTaskCategory);
                            return (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                flexWrap: 'wrap',
                                marginTop: '0.35rem'
                              }}>
                                <select
                                  value={newTaskCategory}
                                  onChange={e => handleCategoryChange(e.target.value)}
                                  className="form-control"
                                  style={{ width: '95px', height: '36px', fontSize: '14px', padding: '0.2rem 0.4rem' }}
                                >
                                  <option value="DEV">개발</option>
                                  <option value="DESIGN">디자인</option>
                                  <option value="PUBLISH">퍼블</option>
                                  <option value="PLAN">기획</option>
                                  <option value="ETC">기타</option>
                                </select>

                                <select
                                  value={newTaskAssigneeId}
                                  onChange={e => setNewTaskAssigneeId(e.target.value)}
                                  className="form-control"
                                  style={{ width: '170px', height: '36px', fontSize: '14px', padding: '0.2rem 0.4rem' }}
                                >
                                  {candidateEmployees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.name} ({emp.position || emp.dept || '담당'})
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  style={{ height: '36px', padding: '0 0.75rem', fontSize: '14px' }}
                                  onClick={handleAddInlineTask}
                                >
                                  추가
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ height: '36px', padding: '0 0.6rem', fontSize: '14px' }}
                                  onClick={() => setIsAddingTask(false)}
                                >
                                  취소
                                </button>
                              </div>
                            );
                          }

                          if (availableEmployees.length === 0) {
                            return (
                              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                모든 직원이 배정되었습니다.
                              </div>
                            );
                          }

                          return (
                            <div>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  fontSize: '14px',
                                  padding: '0.3rem 0.75rem'
                                }}
                                onClick={() => {
                                  setIsAddingTask(true);
                                  setNewTaskCategory('DEV');
                                  const matched = getMatchingEmployeesForCategory(availableEmployees, 'DEV');
                                  setNewTaskAssigneeId(matched[0]?.id || availableEmployees[0]?.id || '');
                                }}
                              >
                                <Plus size={14} />
                                <span>추가</span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* 7. 최종 승인자 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1.25rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0 }}>
                        최종 승인자
                      </span>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {selectedReq.status === 'DONE' ? (
                          <span style={{ fontSize: '17px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                            {selectedReq.approverName || '미지정'}
                          </span>
                        ) : (
                          <>
                            <select
                              value={selectedReq.approverId || ''}
                              onChange={e => handleChangeInlineApprover(e.target.value)}
                              style={{
                                minWidth: '220px',
                                height: '38px',
                                fontSize: '15px',
                                backgroundColor: 'var(--bg-input, var(--bg-card))',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                padding: '0 0.75rem',
                                outline: 'none'
                              }}
                            >
                              <option value="">미지정</option>
                              {approverUsersByDept.map(([deptName, deptUsers]) => (
                                <optgroup key={deptName} label={`── ${deptName} ──`}>
                                  {deptUsers.map(u => {
                                    const title = u.position ? u.position : (u.role === 'ADMIN' ? '최고관리자' : u.role === 'TEAM_LEADER' ? '팀장' : '');
                                    return (
                                      <option key={u.id} value={u.id}>
                                        {u.name}{title ? ` (${title})` : ''}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              ))}
                            </select>

                            {/* Final Approve Action Button if all tasks done */}
                            {(() => {
                              const hasTasks = selectedReq.assignedTasks && selectedReq.assignedTasks.length > 0;
                              const allDone = hasTasks && selectedReq.assignedTasks.every(t => t.status === 'COMPLETED');
                              const canApprove = (user?.id === selectedReq.approverId || user?.role === 'ADMIN');
                              if (allDone && selectedReq.approverId && canApprove) {
                                return (
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    style={{ fontSize: '14px', padding: '0.35rem 0.85rem' }}
                                    onClick={() => handleFinalApprove(selectedReq)}
                                  >
                                    최종 완료 승인 및 고객사 전달
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </>
                        )}
                      </div>
                    </div>

                    {/* 8. 첨부파일 */}
                    {selectedReq.attachments && selectedReq.attachments.length > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        padding: '1.25rem 0',
                        borderBottom: '1px solid var(--border-color)',
                        gap: '1.5rem'
                      }}>
                        <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                          첨부파일
                        </span>
                        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {selectedReq.attachments.map(att => (
                            <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                              <span>{att.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 9. 작업 완료 정보 (DONE 상태 전용) */}
                    {selectedReq.status === 'DONE' && (
                      <>
                        <div style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          padding: '1.25rem 0',
                          borderBottom: '1px solid var(--border-color)',
                          gap: '1.5rem'
                        }}>
                          <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                            투입 공수
                          </span>
                          <div style={{ flex: 1, fontSize: '18px', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>
                            {selectedReq.spentHours}시간
                            {selectedReq.spentHoursBreakdown && (
                              <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.75rem' }}>
                                ({[
                                  selectedReq.spentHoursBreakdown.design > 0 ? `디자인 ${selectedReq.spentHoursBreakdown.design}h` : null,
                                  selectedReq.spentHoursBreakdown.publish > 0 ? `퍼블 ${selectedReq.spentHoursBreakdown.publish}h` : null,
                                  selectedReq.spentHoursBreakdown.dev > 0 ? `개발 ${selectedReq.spentHoursBreakdown.dev}h` : null,
                                  selectedReq.spentHoursBreakdown.etc > 0 ? `기타 ${selectedReq.spentHoursBreakdown.etc}h` : null
                                ].filter(Boolean).join(' · ') || '개발 100%'})
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          padding: '1.25rem 0',
                          borderBottom: '1px solid var(--border-color)',
                          gap: '1.5rem'
                        }}>
                          <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                            완료 내용
                          </span>
                          <div style={{ flex: 1, fontSize: '17px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                            <div>{selectedReq.completionSummary || '작업 완료 처리되었습니다.'}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                              담당: {selectedReq.assigneeName} · 완료일시: {selectedReq.completedAt}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '1.25rem 0',
                          borderBottom: '1px solid var(--border-color)',
                          gap: '1.5rem'
                        }}>
                          <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                            고객사 확인
                          </span>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{
                              fontSize: '17px',
                              color: selectedReq.clientConfirmed ? 'var(--text-muted)' : '#3b82f6',
                              fontWeight: selectedReq.clientConfirmed ? 400 : 600
                            }}>
                              {selectedReq.clientConfirmed ? `확인 완료 (${selectedReq.clientConfirmedAt?.slice(0, 16)})` : '확인 대기'}
                            </span>
                            {!selectedReq.clientConfirmed && (
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '13px', padding: '0.25rem 0.65rem' }}
                                onClick={() => handleProxyConfirm(selectedReq.id)}
                              >
                                대리 확인 완료 처리
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: FILE MANAGER (파일 보관함) */}
      {activeTab === 'files' && (
        <FileManager
          files={files}
          schedules={schedules}
          user={user}
          onUploadFile={onUploadFile}
          onDeleteFile={onDeleteFile}
          onLinkFileToSchedule={onLinkFilesToSchedule}
          onShowToast={onShowToast}
        />
      )}

      {/* TAB: SETTINGS (환경 설정 - 내 정보, 수신 이메일, 급여 계좌) */}
      {activeTab === 'settings' && (
        <div style={{ paddingTop: '2.5rem', width: '100%' }}>
          <SettingsView
            user={user}
            onUpdateUser={onUpdateUser}
            toastPosition={toastPosition}
            onToastPositionChange={onToastPositionChange}
            onShowToast={onShowToast}
            theme={theme}
            onToggleTheme={onToggleTheme}
            isEmbedded={true}
          />
        </div>
      )}

      {/* TAB 5: ADMIN PORTAL (최고 관리자 및 팀장 제어 센터 통합) */}
      {activeTab === 'admin' && (user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER') && (
        <div style={{ paddingTop: '1.5rem', width: '100%' }}>
          <AdminPortal
            user={user}
            onShowToast={onShowToast}
            onRefresh={onRefresh}
            initialTab={targetAdminSubtab || (user?.role === 'ADMIN' ? 'accounts' : 'approvals')}
          />
        </div>
      )}

      {/* TAB 6: PAYROLL (급여 관리 - 관리자/인사 전용) */}
      {activeTab === 'payroll' && (user.role === 'ADMIN' || user.role === 'HR' || user.username === 'insa') && (
        <div style={{ paddingTop: '1.5rem', width: '100%' }}>
          <PayrollManager
            user={user}
            onShowToast={onShowToast}
          />
        </div>
      )}

      {/* DRAWER: ADVANCED WORK & LEAVE APPLICATION */}
      {showLeaveModal && (
        <div
          className={`detail-backdrop ${isLeaveClosing ? 'closing' : ''}`}
          onClick={handleCloseLeaveDrawer}
        >
          <div
            className={`detail-slide-drawer drawer-lg ${isLeaveClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 'min(780px, 100vw)'
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: '1.75rem 2.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                연차 및 휴가 신청
              </h3>
              <button
                type="button"
                onClick={handleCloseLeaveDrawer}
                title="닫기"
                aria-label="닫기"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  borderRadius: '4px'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Drawer Form Body */}
            <div style={{ flex: 1, padding: '1.75rem 2.25rem 2.25rem 2.25rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <form onSubmit={handleOpenApplyConfirm} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1.5rem' }}>
                
                {/* Rows List (Matching CompanyCalendar Schedule Add Drawer) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  {/* 1. 휴가 유형 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      유형
                    </span>
                    <div style={{ flex: 1 }}>
                      <select
                        className="form-control"
                        value={applyType}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setApplyType(nextVal);
                          if (nextVal === 'OVERTIME') {
                            setWorkStartTime('18:00');
                            setWorkEndTime('19:00');
                          } else if (nextVal === 'HOLIDAY_WORK') {
                            setWorkStartTime('10:00');
                            setWorkEndTime('11:00');
                          }
                          setSelectedSlots({});
                        }}
                        style={{
                          width: 'auto',
                          minWidth: '240px',
                          height: '40px',
                          fontSize: '15px',
                          backgroundColor: 'var(--bg-input, var(--bg-card))',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="ANNUAL">연차</option>
                        <option value="HALF_AM">오전 반차</option>
                        <option value="HALF_PM">오후 반차</option>
                        <option value="HOLIDAY_WORK">휴일근무</option>
                        <option value="OVERTIME">야근</option>
                        <option value="REMOTE">재택근무</option>
                        <option value="SICK">병가</option>
                        <option value="SPECIAL">경조사</option>
                        <option value="OFFICIAL">공가</option>
                        <option value="ETC">기타</option>
                      </select>
                    </div>
                  </div>

                  {/* 3. 승인 대상 / 결재선 */}
                  {user?.role !== 'ADMIN' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '1.25rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0, paddingTop: '4px' }}>
                        결재선
                      </span>
                      <div style={{ flex: 1 }}>
                        {user?.role === 'TEAM_LEADER' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <CustomCheckbox checked={true} disabled={true} />
                              <span style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                김관리 본부장
                              </span>
                              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                (경영지원본부 · 최고 관리자 · 필수)
                              </span>
                            </div>

                            {otherTeamLeaders.map(leader => {
                              const isChecked = selectedTeamApproverIds.includes(leader.id);
                              return (
                                <div
                                  key={leader.id}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
                                  onClick={() => {
                                    setSelectedTeamApproverIds(prev => 
                                      isChecked 
                                        ? prev.filter(id => id !== leader.id)
                                        : [...prev, leader.id]
                                    );
                                  }}
                                >
                                  <CustomCheckbox
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedTeamApproverIds(prev => 
                                        isChecked 
                                          ? prev.filter(id => id !== leader.id)
                                          : [...prev, leader.id]
                                      );
                                    }}
                                  />
                                  <span style={{ fontSize: '15.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {leader.name} 팀장
                                  </span>
                                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    ({leader.dept} · 팀장)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <select
                            className="form-control"
                            value={approverId}
                            onChange={(e) => setApproverId(e.target.value)}
                            style={{
                              width: 'auto',
                              minWidth: '280px',
                              height: '40px',
                              fontSize: '15px',
                              backgroundColor: 'var(--bg-input, var(--bg-card))',
                              borderColor: 'var(--border-color)',
                              color: 'var(--text-primary)',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">승인 요청 대상을 선택하세요</option>
                            {Object.keys(approverGroups).map(dept => (
                              <optgroup key={dept} label={dept}>
                                {approverGroups[dept].map(emp => {
                                  const isMyLeader = myDirectApprover && emp.id === myDirectApprover.id;
                                  const roleText = emp.role === 'ADMIN' ? '최고 관리자' : (emp.position ? `${emp.position} / 팀장` : '팀장');
                                  return (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.name} ({roleText}){isMyLeader ? ' · 소속 팀장' : ''}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. 일정 선택 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0, paddingTop: '6px' }}>
                      일정
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minWidth: 0 }}>
                      <ApplicationCalendar
                        category={applyCategory}
                        applyType={applyType}
                        selectedSlots={selectedSlots}
                        onToggleSlot={handleToggleSlot}
                        existingLeaves={myRecentLeaves}
                      />
                    </div>
                  </div>

                  {/* 근무 시간 (휴일근무 및 야근 시 노출) */}
                  {(applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME') && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1.25rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                        근무 시간
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <CustomTimePicker
                          value={workStartTime}
                          onChange={handleStartTimeChange}
                          filter={(t) => t !== '24:00'}
                          width="110px"
                          height="40px"
                        />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>~</span>
                        <CustomTimePicker
                          value={workEndTime}
                          onChange={setWorkEndTime}
                          minTime={workStartTime}
                          width="110px"
                          height="40px"
                        />
                        <span style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color)', margin: '0 0.35rem' }} />
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                          {calculateDuration(workStartTime, workEndTime).text}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 5. 신청 사유 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      사유
                    </span>
                    <textarea
                      rows={3}
                      required
                      value={applyReason}
                      onChange={(e) => setApplyReason(e.target.value)}
                      placeholder="업무 사유 또는 특이사항을 입력하세요"
                      style={{
                        flex: 1,
                        fontSize: '18px',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        resize: 'vertical',
                        lineHeight: 1.6,
                        padding: 0
                      }}
                    />
                  </div>
                </div>

                {/* Bottom Actions: Full-width stacked buttons matching CompanyCalendar */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  marginTop: 'auto',
                  paddingTop: '1.5rem',
                  width: '100%'
                }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '16px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    신청하기
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseLeaveDrawer}
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '16px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: 신청 확인 */}
      {showApplyConfirmModal && (
        <div 
          className="modal-overlay" 
          onClick={() => !isSubmittingLeave && setShowApplyConfirmModal(false)}
          style={{ zIndex: 1100 }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '500px', 
              padding: '2rem 2.25rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div className="modal-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                신청 확인
              </h3>
              <button
                type="button"
                onClick={() => !isSubmittingLeave && setShowApplyConfirmModal(false)}
                title="닫기"
                aria-label="닫기"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', fontSize: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.25rem' }}>
                <span style={{ width: '80px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                  신청 구분
                </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '16px' }}>
                  {getApplyTypeName(applyType)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.25rem' }}>
                <span style={{ width: '80px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                  결재선
                </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {getApproverDisplayName()}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.25rem' }}>
                <span style={{ width: '80px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                  신청 일정
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-primary)' }}>
                  {getFormattedDatesList().map((d, i) => (
                    <span key={i} style={{ fontWeight: 600 }}>{d}</span>
                  ))}
                </div>
              </div>

              {(applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME') && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.25rem' }}>
                  <span style={{ width: '80px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                    근무 시간
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {workStartTime} ~ {workEndTime} · {calculateDuration(workStartTime, workEndTime).text}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                <span style={{ width: '80px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0, paddingTop: '2px' }}>
                  사유
                </span>
                <span style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'break-word', flex: 1, lineHeight: 1.5 }}>
                  {applyReason}
                </span>
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={isSubmittingLeave}
                onClick={handleExecuteApplyLeave}
                className="btn btn-primary"
                style={{ height: '42px', padding: '0 2rem', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
              >
                {isSubmittingLeave ? '신청 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM IN-APP ALERT MODAL (브라우저 기본 alert 대체) */}
      {alertModal.isOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
          style={{ zIndex: 1200 }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '440px', 
              width: '90%',
              padding: '2rem 2.25rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div className="modal-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '22px', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {alertModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                title="닫기"
                aria-label="닫기"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ color: 'var(--text-primary)', fontSize: '17px', lineHeight: 1.55 }}>
                {alertModal.message}
              </div>

              {alertModal.details && Array.isArray(alertModal.details) && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  padding: '0.25rem 0'
                }}>
                  {alertModal.details.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>{item.label}</span>
                      <span style={{ color: 'var(--text-primary)', fontSize: '20px', letterSpacing: '-0.01em' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* MODAL: COMPLETE REQUEST & MAN-HOURS (LEGACY FALLBACK) */}
      {completingReq && (
        <CompleteModal
          request={completingReq}
          user={user}
          onClose={() => setCompletingReq(null)}
          onComplete={handleCompleteRequest}
        />
      )}



      {/* Bottom Rolling Announcement Bar (가장 하단 가로 롤링 티커: 큼직한 글씨와 넓은 간격) */}
      {announcements && announcements.some(a => a.isActive) && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '56px',
          backgroundColor: 'var(--bg-card)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          zIndex: 100,
          fontSize: '18px',
          padding: '0 2rem',
          boxSizing: 'border-box'
        }}>
          {/* Label (Fixed on left) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            fontWeight: 700,
            fontSize: '18px',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            paddingRight: '2rem',
            marginRight: '2rem',
            borderRight: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            zIndex: 2,
            height: '100%'
          }}>
            사내 공지
          </div>

          {/* Rolling Track */}
          <div style={{
            flex: 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            position: 'relative',
            display: 'flex'
          }}>
            <div className="announcement-ticker-track">
              {(() => {
                const activeList = announcements.filter(a => a.isActive);
                const repeatList = activeList.length > 0
                  ? [...activeList, ...activeList, ...activeList, ...activeList]
                  : [];
                return repeatList.map((a, idx) => (
                  <span key={idx} style={{ marginRight: '12rem', color: 'var(--text-secondary)', fontSize: '18px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{a.title}</span>
                    {a.content && <span style={{ marginLeft: '0.75rem' }}>· {a.content}</span>}
                  </span>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
