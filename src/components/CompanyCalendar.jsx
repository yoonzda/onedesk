import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Clock } from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';
import CustomCheckbox from './CustomCheckbox';
import { getHoliday } from '../utils/holidays';

const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function CompanyCalendar({ 
  user, 
  schedules = [], 
  clients = [], 
  files = [],
  leaves = [],
  employees = [],
  initialScheduleId = null,
  onCloseDetail = null,
  onAddSchedule, 
  onUpdateSchedule,
  onDeleteSchedule, 
  onShowToast,
  onRefresh,
  onUploadFile,
  onLinkFilesToSchedule,
  theme = 'dark'
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [isAddClosing, setIsAddClosing] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);

  // Selected Schedule Detail Drawer State
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const handledScheduleIdRef = useRef(null);

  // Auto-open schedule drawer when initialScheduleId is provided (e.g. from notification click)
  useEffect(() => {
    if (initialScheduleId && Array.isArray(schedules) && schedules.length > 0) {
      if (handledScheduleIdRef.current === initialScheduleId) return;
      const target = schedules.find(s => s.id === initialScheduleId);
      if (target) {
        handledScheduleIdRef.current = initialScheduleId;
        setSelectedSchedule(target);
        if (onCloseDetail) {
          onCloseDetail();
        }
      }
    } else if (!initialScheduleId) {
      handledScheduleIdRef.current = null;
    }
  }, [initialScheduleId, schedules]);

  const [isDetailClosing, setIsDetailClosing] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [isTimelineClosing, setIsTimelineClosing] = useState(false);
  const [showAddFilePicker, setShowAddFilePicker] = useState(false);
  const [pickerFileId, setPickerFileId] = useState('');
  const [hoveredTab, setHoveredTab] = useState(null);
  const [onlyMySchedules, setOnlyMySchedules] = useState(false);
  const detailFileInputRef = useRef(null);
  const timelinePanelRef = useRef(null);
  const timelineToggleBtnRef = useRef(null);

  // Quick Year/Month Smartphone Roller State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempYear, setTempYear] = useState(() => currentDate.getFullYear());
  const [tempMonth, setTempMonth] = useState(() => currentDate.getMonth() + 1);
  const pickerRef = useRef(null);
  const selectedYearRef = useRef(null);
  const selectedMonthRef = useRef(null);
  const yearColRef = useRef(null);
  const monthColRef = useRef(null);

  const yearsList = [2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
  const monthsList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Category Configuration & Colors (Rule 1: Pure text typography, Dot indicator colors)
  const CATEGORY_CONFIG = {
    INTERNAL_MEETING: { label: '사내회의', color: '#8b5cf6' }, // 보라
    LEAVE: { label: '휴가', color: '#f59e0b' },            // 골드/앰버 (휴가 본래의 편안하고 자연스러운 표준 색상 복원)
    REMOTE: { label: '재택', color: '#10b981' },           // 에메랄드 그린
    FIELD: { label: '외근', color: '#be123c' },            // 딥 와인/버건디 (골드·초록·파랑·보라와 완벽히 대비되는 중후한 톤)
    EXTERNAL_MEETING: { label: '외부미팅', color: '#3b82f6' }, // 블루
    ETC: { label: '기타', color: '#94a3b8' }               // 슬레이트 그레이
  };

  const CALENDAR_CATEGORIES = [
    { id: 'ALL', label: '전체' },
    { id: 'INTERNAL_MEETING', label: '사내회의', color: '#8b5cf6' },
    { id: 'LEAVE', label: '휴가', color: '#f59e0b' },
    { id: 'REMOTE', label: '재택', color: '#10b981' },
    { id: 'FIELD', label: '외근', color: '#be123c' },
    { id: 'EXTERNAL_MEETING', label: '외부미팅', color: '#3b82f6' },
    { id: 'ETC', label: '기타', color: '#94a3b8' }
  ];

  const getScheduleCategoryKey = (sch) => {
    if (!sch) return 'ETC';
    const cat = sch.category;
    if (cat === 'INTERNAL_MEETING' || cat === 'DEPT' || cat === 'COMPANY') return 'INTERNAL_MEETING';
    if (cat === 'EXTERNAL_MEETING' || cat === 'CLIENT') return 'EXTERNAL_MEETING';
    if (cat === 'REMOTE' || (sch.title && sch.title.includes('재택'))) return 'REMOTE';
    if (cat === 'FIELD' || (sch.title && sch.title.includes('외근'))) return 'FIELD';
    if (cat === 'ETC') return 'ETC';
    if (cat === 'LEAVE' || sch.leaveId || (sch.title && (
      sch.title.includes('연차') || 
      sch.title.includes('반차') || 
      sch.title.includes('휴가') || 
      sch.title.includes('병가') || 
      sch.title.includes('공가')
    ))) return 'LEAVE';
    // Title-based heuristics for meetings/events if category is missing
    if (sch.title && (sch.title.includes('회의') || sch.title.includes('미팅') || sch.title.includes('킥오프') || sch.title.includes('스프린트') || sch.title.includes('발표회') || sch.title.includes('해커톤') || sch.title.includes('워크샵'))) {
      if (sch.isClientShared || sch.clientId || sch.title.includes('외부') || sch.title.includes('고객사')) {
        return 'EXTERNAL_MEETING';
      }
      return 'INTERNAL_MEETING';
    }
    return 'ETC';
  };

  const getScheduleDotColor = (sch) => {
    const key = getScheduleCategoryKey(sch);
    return CATEGORY_CONFIG[key]?.color || '#94a3b8';
  };

  const getScheduleCategoryLabel = (sch) => {
    const key = getScheduleCategoryKey(sch);
    return CATEGORY_CONFIG[key]?.label || '기타';
  };

  const getScheduleFiles = (sch) => {
    if (!sch) return [];
    const schFileIds = Array.isArray(sch.fileIds) ? sch.fileIds : [];
    return (files || []).filter(f => {
      const fSchedIds = Array.isArray(f.scheduleIds) ? f.scheduleIds : (f.scheduleId ? [f.scheduleId] : []);
      return fSchedIds.includes(sch.id) || schFileIds.includes(f.id);
    });
  };

  const handleCloseAddDrawer = () => {
    if (isAddClosing) return;
    setIsAddClosing(true);
    setTimeout(() => {
      setShowAddDrawer(false);
      setIsAddClosing(false);
      setEditingScheduleId(null);
      setAddUploadedFiles([]);
    }, 220);
  };

  const handleCloseTimeline = () => {
    if (isTimelineClosing || !showHistoryPanel) return;
    setIsTimelineClosing(true);
    setTimeout(() => {
      setShowHistoryPanel(false);
      setIsTimelineClosing(false);
    }, 200);
  };

  const handleToggleTimeline = () => {
    if (showHistoryPanel) {
      handleCloseTimeline();
    } else {
      setShowHistoryPanel(true);
    }
  };

  const handleCloseDetailDrawer = () => {
    if (isDetailClosing) return;
    setIsDetailClosing(true);
    handledScheduleIdRef.current = initialScheduleId;
    if (onCloseDetail) {
      onCloseDetail();
    }
    if (showHistoryPanel) {
      setIsTimelineClosing(true);
    }
    setTimeout(() => {
      setSelectedSchedule(null);
      setIsDetailClosing(false);
      setShowAddFilePicker(false);
      setShowHistoryPanel(false);
      setIsTimelineClosing(false);
      setPickerFileId('');
    }, 220);
  };

  // Close history panel on outside click with smooth exit animation
  useEffect(() => {
    if (!showHistoryPanel || isTimelineClosing) return;
    const handleOutsideClick = (e) => {
      if (
        timelinePanelRef.current && 
        !timelinePanelRef.current.contains(e.target) &&
        timelineToggleBtnRef.current &&
        !timelineToggleBtnRef.current.contains(e.target)
      ) {
        handleCloseTimeline();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showHistoryPanel, isTimelineClosing]);

  const formatHistoryTime = (ts) => {
    if (!ts) return '';
    const str = String(ts).trim();
    if (str.length <= 10) return str;
    try {
      if (str.includes('T') && !str.endsWith('Z')) {
        return str.replace('T', ' ').slice(0, 16);
      }
      const d = new Date(str);
      if (isNaN(d.getTime())) return str.replace('T', ' ').slice(0, 16);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${hh}:${mm}`;
    } catch (e) {
      return str.replace('T', ' ').slice(0, 16);
    }
  };

  // Add Form State (Unified with Minimal Typography Detail Layout)
  const [form, setForm] = useState(() => {
    const today = getTodayStr();
    return {
      title: '',
      category: 'INTERNAL_MEETING',
      startDate: today,
      startTime: '09:00',
      endDate: today,
      endTime: '10:00',
      allDay: false,
      dept: user?.dept || '개발1팀',
      isClientShared: false,
      clientId: clients[0]?.id || '',
      location: '',
      description: '',
      attendeeIds: user ? [user.id] : []
    };
  });
  const [addUploadedFiles, setAddUploadedFiles] = useState([]);
  const addFileInputRef = useRef(null);

  const getEmpTitle = (u) => {
    if (!u) return '';
    if (u.position) {
      if (u.position.includes('팀장')) return '팀장';
      if (u.position.includes('이사')) return '이사';
      if (u.position.includes('선임')) return '선임';
      if (u.position.includes('주임')) return '주임';
      if (u.position.includes('책임')) return '책임';
      return u.position;
    }
    return '';
  };

  const internalEmployees = useMemo(() => {
    return (employees || []).filter(emp => emp.role !== 'CLIENT');
  }, [employees]);

  // Unique departments list for team-level bulk addition
  const departmentsList = useMemo(() => {
    const set = new Set();
    internalEmployees.forEach(u => {
      if (u.dept && u.dept !== '전사' && u.dept !== '기타') {
        set.add(u.dept);
      }
    });
    return Array.from(set);
  }, [internalEmployees]);

  // Group employees by department for select optgroup tree
  const usersByDept = useMemo(() => {
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

  const handleAddAttendeeSelect = (e) => {
    const val = e.target.value;
    if (!val) return;

    if (val === 'TEAM_ALL') {
      const allIds = internalEmployees.map(u => u.id);
      setForm(prev => ({
        ...prev,
        attendeeIds: Array.from(new Set([...(prev.attendeeIds || []), ...allIds]))
      }));
    } else if (val.startsWith('TEAM_')) {
      const targetDept = val.replace('TEAM_', '');
      const deptIds = internalEmployees.filter(u => u.dept === targetDept).map(u => u.id);
      setForm(prev => ({
        ...prev,
        attendeeIds: Array.from(new Set([...(prev.attendeeIds || []), ...deptIds]))
      }));
    } else {
      setForm(prev => ({
        ...prev,
        attendeeIds: Array.from(new Set([...(prev.attendeeIds || []), val]))
      }));
    }
  };

  const handleRemoveAttendee = (empId) => {
    setForm(prev => ({
      ...prev,
      attendeeIds: (prev.attendeeIds || []).filter(id => id !== empId)
    }));
  };

  const handleOpenAddDrawer = (targetDate = null) => {
    const today = getTodayStr();
    const d = targetDate || today;
    setForm({
      title: '',
      category: 'INTERNAL_MEETING',
      startDate: d,
      startTime: '09:00',
      endDate: d,
      endTime: '10:00',
      allDay: false,
      dept: user?.dept || '개발1팀',
      isClientShared: false,
      clientId: clients[0]?.id || '',
      location: '',
      description: '',
      attendeeIds: user ? [user.id] : []
    });
    setAddUploadedFiles([]);
    setShowAddDrawer(true);
  };

  // Format Date and Time for Schedule View: e.g. "2026-09-03 10:00 ~ 12:00" or multi-day "2026-09-16 09:00 ~ 2026-09-18 18:00 (3일간)"
  const formatScheduleDateTime = (sch) => {
    if (!sch || !sch.startDate) return '-';
    const sDate = sch.startDate.slice(0, 10);
    const sTime = sch.startDate.includes('T') ? sch.startDate.slice(11, 16) : '';
    const eDate = sch.endDate ? sch.endDate.slice(0, 10) : sDate;
    const eTime = sch.endDate && sch.endDate.includes('T') ? sch.endDate.slice(11, 16) : '';

    const isAllDay = sch.allDay || (!sTime && !eTime);

    if (sDate === eDate) {
      if (isAllDay) return `${sDate} 종일`;
      return `${sDate} ${sTime} ~ ${eTime || sTime}`;
    } else {
      const daysCount = Math.round((new Date(eDate) - new Date(sDate)) / (1000 * 60 * 60 * 24)) + 1;
      if (isAllDay) {
        return `${sDate} ~ ${eDate} (${daysCount}일간 종일)`;
      }
      return `${sDate} ${sTime} ~ ${eDate} ${eTime} (${daysCount}일간)`;
    }
  };

  // Clean Author format: exclude "(전사)" entirely
  const getAuthorDisplayText = (sch) => {
    if (!sch) return '-';
    const name = sch.authorName || '-';
    const dept = sch.dept;
    if (!dept || dept === '전사' || dept === 'COMPANY') {
      return name;
    }
    return `${name} (${dept})`;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Sync tempYear, tempMonth and auto-scroll within columns ONLY
  useEffect(() => {
    if (showDatePicker) {
      setTempYear(year);
      setTempMonth(month + 1);
      setTimeout(() => {
        if (yearColRef.current && selectedYearRef.current) {
          const container = yearColRef.current;
          const target = selectedYearRef.current;
          container.scrollTop = target.offsetTop - (container.clientHeight / 2) + (target.clientHeight / 2);
        }
        if (monthColRef.current && selectedMonthRef.current) {
          const container = monthColRef.current;
          const target = selectedMonthRef.current;
          container.scrollTop = target.offsetTop - (container.clientHeight / 2) + (target.clientHeight / 2);
        }
      }, 20);
    }
  }, [showDatePicker, year, month]);

  // Click outside to close picker popover
  useEffect(() => {
    if (!showDatePicker) return;
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);


  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  // Generate Calendar Days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();

  const days = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevMonthNum = month === 0 ? 12 : month;
    const prevYearNum = month === 0 ? year - 1 : year;
    days.push({
      day: prevLastDate - i,
      dayOfWeek: (firstDayIndex - 1 - i) % 7,
      isCurrentMonth: false,
      dateStr: `${prevYearNum}-${String(prevMonthNum).padStart(2, '0')}-${String(prevLastDate - i).padStart(2, '0')}`
    });
  }
  for (let i = 1; i <= lastDate; i++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayOfWeek = (firstDayIndex + i - 1) % 7;
    days.push({ day: i, dayOfWeek, isCurrentMonth: true, dateStr: dStr });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const nextMonthNum = month === 11 ? 1 : month + 2;
    const nextYearNum = month === 11 ? year + 1 : year;
    const dayOfWeek = (days.length) % 7;
    days.push({
      day: i,
      dayOfWeek,
      isCurrentMonth: false,
      dateStr: `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }

  // Check if a schedule belongs to or involves currentUser (author, attendee, or user's leave)
  const isScheduleInvolvingUser = (s, currentUser) => {
    if (!currentUser) return false;
    // 1. Author
    if (s.authorId === currentUser.id || s.authorName === currentUser.name) return true;
    // 2. Direct user or title match (e.g. "김관리 (연차)")
    if (s.userId === currentUser.id) return true;
    if (s.title && currentUser.name && s.title.includes(currentUser.name)) return true;
    // 3. Attendee in meeting / schedule
    if (Array.isArray(s.attendeeIds) && s.attendeeIds.includes(currentUser.id)) return true;
    if (Array.isArray(s.attendees) && s.attendees.some(a => a.id === currentUser.id || a.name === currentUser.name)) return true;
    return false;
  };

  // Linked leave helper for any schedule (strictly isolated to prevent cross-schedule contamination)
  const getLinkedLeaveForSchedule = (sch) => {
    if (!sch) return null;
    // REMOTE and FIELD do NOT link to leave approval
    if (sch.category === 'REMOTE' || sch.category === 'FIELD') {
      return null;
    }
    // 1. Explicit 1:1 leaveId match (Highest precision and safest)
    if (sch.leaveId) {
      return (leaves || []).find(l => l.id === sch.leaveId) || null;
    }
    // 2. Strict fallback ONLY for category === 'LEAVE' schedules (Never match work/field/meeting schedules!)
    if (sch.category === 'LEAVE' || getScheduleCategoryKey(sch) === 'LEAVE') {
      const schDate = sch.startDate ? sch.startDate.slice(0, 10) : '';
      return (leaves || []).find(l => 
        (l.userId === sch.authorId || l.userName === sch.authorName) &&
        schDate && l.startDate === schDate
      ) || null;
    }
    return null;
  };

  // Source-of-truth helper: If schedule is linked to a leave, use linkedLeave.status
  const getScheduleEffectiveStatus = (sch) => {
    if (!sch) return 'APPROVED';
    if (sch.category === 'REMOTE' || sch.category === 'FIELD') {
      return 'APPROVED';
    }
    const linkedLeave = getLinkedLeaveForSchedule(sch);
    if (linkedLeave && linkedLeave.status) {
      return linkedLeave.status;
    }
    return sch.approvalStatus || sch.status || 'APPROVED';
  };

  // Filter schedules
  const filteredSchedules = (schedules || []).filter(s => {
    const effStatus = getScheduleEffectiveStatus(s);
    if (effStatus === 'REJECTED' || effStatus === 'CANCELLED') return false;
    if (s.approvalStatus === 'REJECTED' || s.approvalStatus === 'CANCELLED') return false;
    if (s.status === 'REJECTED' || s.status === 'CANCELLED') return false;
    // Checkbox: 내 일정만 보기 (내가 참여한 회의 및 내 일정만 표시)
    if (onlyMySchedules && !isScheduleInvolvingUser(s, user)) {
      return false;
    }
    if (categoryFilter === 'ALL') return true;
    return getScheduleCategoryKey(s) === categoryFilter;
  });

  // Helper to convert hex color to rgba
  const hexToRgba = (hex, alpha = 0.18) => {
    if (!hex || !hex.startsWith('#')) return `rgba(148, 163, 184, ${alpha})`;
    let c = hex.substring(1);
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Group 42 calendar days into 6 weeks of 7 days each
  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const getScheduleDates = (s) => {
    const startD = s.startDate ? s.startDate.slice(0, 10) : '';
    const endD = s.endDate ? s.endDate.slice(0, 10) : startD;
    return { startD, endD };
  };

  const isScheduleMultiDay = (s) => {
    const { startD, endD } = getScheduleDates(s);
    return !!(startD && endD && startD !== endD);
  };

  // Calculate multi-day spanning tracks for a 7-day week
  const getWeekMultiDayTracks = (weekDays) => {
    if (!weekDays || weekDays.length === 0) return [];
    const weekStart = weekDays[0].dateStr;
    const weekEnd = weekDays[6].dateStr;

    // Filter multi-day schedules intersecting this week
    const weekMultiSchedules = filteredSchedules.filter(s => {
      if (s.approvalStatus === 'CANCELLED' || s.approvalStatus === 'REJECTED') return false;
      if (s.status === 'CANCELLED' || s.status === 'REJECTED') return false;
      if (!isScheduleMultiDay(s)) return false;
      const { startD, endD } = getScheduleDates(s);
      return startD <= weekEnd && endD >= weekStart;
    });

    const spans = weekMultiSchedules.map(s => {
      const { startD, endD } = getScheduleDates(s);
      let startCol = weekDays.findIndex(d => d.dateStr === startD);
      let isContinuationFromPrev = false;
      if (startCol === -1) {
        startCol = 0;
        isContinuationFromPrev = true;
      }

      let endCol = weekDays.findIndex(d => d.dateStr === endD);
      let isContinuationToNext = false;
      if (endCol === -1) {
        endCol = 6;
        isContinuationToNext = true;
      }

      const dotColor = getScheduleDotColor(s);
      const isLeave = s.category === 'LEAVE' || getScheduleCategoryKey(s) === 'LEAVE' || s.isLeave || s.leaveType;
      const isPending = getScheduleEffectiveStatus(s) === 'PENDING';
      const isLeaveOrPending = isLeave || isPending;
      const cleanTitle = (s.title || '').replace(/^(\[[^\]]+\]\s*)+/, '').trim();

      return {
        sch: s,
        startCol,
        endCol,
        startD,
        endD,
        isContinuationFromPrev,
        isContinuationToNext,
        dotColor,
        isLeave,
        isPending,
        isLeaveOrPending,
        cleanTitle
      };
    });

    // Sort by startCol ascending, then by longer duration first
    spans.sort((a, b) => {
      if (a.startCol !== b.startCol) return a.startCol - b.startCol;
      return (b.endCol - b.startCol) - (a.endCol - a.startCol);
    });

    // Assign tracks (slots) so non-overlapping spans can share rows
    const tracks = [];
    spans.forEach(span => {
      let placed = false;
      for (let t = 0; t < tracks.length; t++) {
        const collision = tracks[t].some(existing => 
          !(span.endCol < existing.startCol || span.startCol > existing.endCol)
        );
        if (!collision) {
          tracks[t].push(span);
          span.trackIdx = t;
          placed = true;
          break;
        }
      }
      if (!placed) {
        span.trackIdx = tracks.length;
        tracks.push([span]);
      }
    });

    return tracks;
  };

  // Single-day schedules for a specific day
  const getSingleSchedulesForDay = (dateStr) => {
    return filteredSchedules.filter(s => {
      if (s.approvalStatus === 'CANCELLED' || s.approvalStatus === 'REJECTED') return false;
      if (s.status === 'CANCELLED' || s.status === 'REJECTED') return false;
      if (!s.startDate) return false;
      const { startD, endD } = getScheduleDates(s);
      return startD === endD && startD === dateStr;
    });
  };

  // Multi-day schedule support: match any date between startDate and endDate (fallback helper)
  const getSchedulesForDay = (dateStr) => {
    return filteredSchedules.filter(s => {
      if (s.approvalStatus === 'CANCELLED' || s.approvalStatus === 'REJECTED') return false;
      if (s.status === 'CANCELLED' || s.status === 'REJECTED') return false;
      if (!s.startDate) return false;
      const startD = s.startDate.slice(0, 10);
      const endD = s.endDate ? s.endDate.slice(0, 10) : startD;
      return dateStr >= startD && dateStr <= endD;
    });
  };

  // Direct file upload in Add Drawer
  const handleDirectAddFileSelect = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploaderId', user?.id || 'usr-admin');
    formData.append('uploaderName', user?.name || '김관리');
    try {
      const uploadRes = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (uploadData.success && uploadData.file) {
        setAddUploadedFiles(prev => [...prev, uploadData.file]);
        if (onUploadFile) onUploadFile(uploadData.file);
        onShowToast?.('파일 업로드 완료', `${uploadData.file.name} 파일이 첨부되었습니다.`);
      }
    } catch (err) {
      console.error('File direct upload error:', err);
    }
  };

  // Start editing existing schedule
  const handleStartEditSchedule = () => {
    if (!selectedSchedule) return;
    setEditingScheduleId(selectedSchedule.id);
    const sDate = selectedSchedule.startDate ? selectedSchedule.startDate.slice(0, 10) : getTodayStr();
    const sTime = selectedSchedule.startDate?.includes('T') ? selectedSchedule.startDate.slice(11, 16) : '09:00';
    const eDate = selectedSchedule.endDate ? selectedSchedule.endDate.slice(0, 10) : sDate;
    const eTime = selectedSchedule.endDate?.includes('T') ? selectedSchedule.endDate.slice(11, 16) : '10:00';

    setForm({
      title: selectedSchedule.title || '',
      category: selectedSchedule.category || 'INTERNAL_MEETING',
      startDate: sDate,
      startTime: sTime,
      endDate: eDate,
      endTime: eTime,
      allDay: Boolean(selectedSchedule.allDay),
      dept: selectedSchedule.dept || user?.dept || '전사',
      isClientShared: Boolean(selectedSchedule.isClientShared),
      clientId: selectedSchedule.clientId || clients[0]?.id || '',
      location: selectedSchedule.location || '',
      description: selectedSchedule.description || '',
      attendeeIds: selectedSchedule.attendeeIds || []
    });

    const currentFiles = getScheduleFiles(selectedSchedule);
    setAddUploadedFiles(currentFiles);

    handleCloseDetailDrawer();
    setShowAddDrawer(true);
  };

  // Submit schedule (Add or Edit)
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.title.trim()) {
      alert('일정 제목을 입력하세요.');
      return;
    }

    const startDateTime = form.allDay ? `${form.startDate}T00:00` : `${form.startDate}T${form.startTime || '09:00'}`;
    const endDateTime = form.allDay ? `${form.endDate}T23:59` : `${form.endDate}T${form.endTime || '10:00'}`;
    const attendeeIds = form.attendeeIds || [];
    const attendees = (employees || []).filter(e => attendeeIds.includes(e.id)).map(e => ({
      id: e.id,
      name: e.name,
      dept: e.dept
    }));
    const fileIdsToAttach = addUploadedFiles.map(f => f.id);

    if (editingScheduleId) {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        startDate: startDateTime,
        endDate: endDateTime,
        allDay: form.allDay,
        dept: form.dept || user?.dept || '개발1팀',
        isClientShared: form.isClientShared,
        clientId: form.clientId,
        location: form.location.trim(),
        description: form.description.trim(),
        fileIds: fileIdsToAttach,
        attendeeIds,
        attendees,
        updatedById: user?.id,
        updatedByName: user?.name || user?.managerName
      };

      if (onUpdateSchedule) {
        await onUpdateSchedule(editingScheduleId, payload);
      } else {
        try {
          const res = await fetch(`/api/schedules/${editingScheduleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            onShowToast?.('일정 수정', `'${payload.title}' 일정이 수정되었습니다.`, 'success');
            if (onRefresh) onRefresh();
          }
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      if (onAddSchedule) {
        onAddSchedule({
          title: form.title.trim(),
          category: form.category,
          startDate: startDateTime,
          endDate: endDateTime,
          allDay: form.allDay,
          dept: form.dept || user?.dept || '개발1팀',
          isClientShared: form.isClientShared,
          clientId: form.clientId,
          location: form.location.trim(),
          description: form.description.trim(),
          authorId: user?.id,
          authorName: user?.name || user?.managerName,
          fileIds: fileIdsToAttach,
          attendeeIds,
          attendees
        });
      }
    }

    handleCloseAddDrawer();
    setEditingScheduleId(null);
    setForm({
      title: '',
      category: 'INTERNAL_MEETING',
      startDate: '2026-09-08',
      startTime: '09:00',
      endDate: '2026-09-08',
      endTime: '10:00',
      allDay: false,
      dept: user?.dept || '개발1팀',
      isClientShared: false,
      clientId: clients[0]?.id || '',
      location: '',
      description: '',
      attendeeIds: user ? [user.id] : []
    });
    setAddUploadedFiles([]);
  };

  // Link file to existing schedule
  const handleLinkExistingFile = async (fileId) => {
    if (!selectedSchedule || !fileId) return;
    const currentIds = Array.isArray(selectedSchedule.fileIds) ? selectedSchedule.fileIds : [];
    if (currentIds.includes(fileId)) return;

    const newIds = [...currentIds, fileId];
    try {
      const res = await fetch(`/api/schedules/${selectedSchedule.id}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: newIds })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('파일 연결 완료', '선택한 파일이 회의에 연결되었습니다.');
        setSelectedSchedule(data.schedule);
        if (onLinkFilesToSchedule) onLinkFilesToSchedule(selectedSchedule.id, newIds);
        onRefresh?.();
        setShowAddFilePicker(false);
        setPickerFileId('');
      }
    } catch (err) {
      alert('파일 연결 중 오류가 발생했습니다.');
    }
  };

  // Unlink file from schedule
  const handleUnlinkFile = async (fileId) => {
    if (!selectedSchedule) return;
    const currentIds = Array.isArray(selectedSchedule.fileIds) ? selectedSchedule.fileIds : [];
    const newIds = currentIds.filter(id => id !== fileId);

    try {
      const res = await fetch(`/api/schedules/${selectedSchedule.id}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: newIds })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('연결 해제 완료', '해당 파일의 연결이 해제되었습니다.');
        setSelectedSchedule(data.schedule);
        if (onLinkFilesToSchedule) onLinkFilesToSchedule(selectedSchedule.id, newIds);
        onRefresh?.();
      }
    } catch (err) {
      alert('파일 연결 해제 중 오류가 발생했습니다.');
    }
  };

  // Direct upload from schedule detail
  const handleDirectUploadToDetail = async (e) => {
    if (!selectedSchedule || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scheduleId', selectedSchedule.id);
    formData.append('uploaderId', user?.id || 'usr-admin');
    formData.append('uploaderName', user?.name || '김관리');

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('파일 첨부 완료', `${data.file.name} 파일이 회의에 첨부되었습니다.`);
        if (onUploadFile) onUploadFile(data.file);
        const currentIds = Array.isArray(selectedSchedule.fileIds) ? selectedSchedule.fileIds : [];
        setSelectedSchedule({
          ...selectedSchedule,
          fileIds: [...currentIds, data.file.id]
        });
        onRefresh?.();
      }
    } catch (err) {
      alert('파일 업로드 중 오류가 발생했습니다.');
    }
  };

  // Date and Time separation helpers for regular schedules/meetings
  const getScheduleDateText = (sch) => {
    if (!sch || !sch.startDate) return '-';
    const sDate = sch.startDate.slice(0, 10);
    const eDate = sch.endDate ? sch.endDate.slice(0, 10) : sDate;
    if (sDate === eDate) return sDate;
    const daysCount = Math.round((new Date(eDate) - new Date(sDate)) / (1000 * 60 * 60 * 24)) + 1;
    return `${sDate} ~ ${eDate} (${daysCount}일간)`;
  };

  const getScheduleTimeText = (sch) => {
    if (!sch || !sch.startDate) return '-';
    const sTime = sch.startDate.includes('T') ? sch.startDate.slice(11, 16) : '';
    const eTime = sch.endDate && sch.endDate.includes('T') ? sch.endDate.slice(11, 16) : '';
    const isAllDay = sch.allDay || (!sTime && !eTime);
    if (isAllDay) return '종일';
    return `${sTime} ~ ${eTime || sTime}`;
  };

  const getLeaveTypeDisplayText = (sch, linkedLeave) => {
    const linked = linkedLeave || (sch ? getLinkedLeaveForSchedule(sch) : null);
    if (linked) {
      let batchLeaves = [];
      if (linked.batchId) {
        batchLeaves = (leaves || []).filter(l => l.batchId === linked.batchId && l.status !== 'REJECTED' && l.status !== 'CANCELLED');
      }
      if (batchLeaves.length > 1) {
        const typesSet = new Set();
        batchLeaves.forEach(l => {
          if (l.timeSlot === 'AM') typesSet.add('오전반차');
          else if (l.timeSlot === 'PM') typesSet.add('오후반차');
          else if (l.leaveType === 'MONTHLY') typesSet.add('월차');
          else if (l.leaveType === 'SICK') typesSet.add('병가');
          else if (l.leaveType === 'SPECIAL') typesSet.add('경조사');
          else if (l.leaveType === 'OFFICIAL') typesSet.add('공가');
          else if (l.leaveType === 'REMOTE') typesSet.add('재택근무');
          else if (l.leaveType === 'FIELD') typesSet.add('외근');
          else typesSet.add('연차');
        });
        if (typesSet.size > 0) {
          return Array.from(typesSet).join(' · ');
        }
      }
    }

    const rawTitle = sch?.title || '';
    const match = rawTitle.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].replace(/취소대기|취소|반려/g, '').trim() || match[1].trim();
    }
    if (linked) {
      if (linked.timeSlot === 'AM') return '오전반차';
      if (linked.timeSlot === 'PM') return '오후반차';
      if (linked.leaveType === 'MONTHLY') return '월차';
      if (linked.leaveType === 'SICK') return '병가';
      if (linked.leaveType === 'SPECIAL') return '경조사';
      if (linked.leaveType === 'OFFICIAL') return '공가';
      if (linked.leaveType === 'REMOTE') return '재택근무';
      if (linked.leaveType === 'FIELD') return '외근';
      return '연차';
    }
    if (rawTitle.includes('월차')) return '월차';
    if (rawTitle.includes('반차')) return '반차';
    if (sch?.category === 'REMOTE' || rawTitle.includes('재택')) return '재택근무';
    if (sch?.category === 'FIELD' || rawTitle.includes('외근')) return '외근';
    return '휴가';
  };

  const handleRequestCancelLeave = async (leaveId) => {
    if (!window.confirm('연차(근태) 취소를 요청하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/leaves/${leaveId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCEL_REQUESTED' })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('취소 요청 접수', '연차 취소 요청이 정상 접수되었습니다. 관리자 승인 대기 상태로 전환됩니다.');
        if (selectedSchedule) {
          setSelectedSchedule(prev => ({
            ...prev,
            approvalStatus: 'CANCEL_REQUESTED',
            title: prev.title.replace(/\(([^)]+)\)/, '($1 취소대기)')
          }));
        }
        if (onRefresh) onRefresh();
      } else {
        alert(data.message || '취소 요청 처리에 실패했습니다.');
      }
    } catch (err) {
      alert('취소 요청 중 오류가 발생했습니다.');
    }
  };

  const handleDirectCancelLeave = async (leaveId) => {
    if (!window.confirm('신청을 취소하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/leaves/${leaveId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('신청 취소 완료', '신청이 정상적으로 취소되었습니다.');
        handleCloseDetailDrawer();
        if (onRefresh) onRefresh();
      } else {
        alert(data.message || '신청 취소에 실패했습니다.');
      }
    } catch (err) {
      alert('신청 취소 중 오류가 발생했습니다.');
    }
  };

  // Handle schedule delete
  const handleDeleteCurrentSchedule = () => {
    if (!selectedSchedule) return;
    if (!window.confirm(`'${selectedSchedule.title}' 일정을 삭제하시겠습니까?`)) return;
    if (onDeleteSchedule) {
      onDeleteSchedule(selectedSchedule.id);
    }
    handleCloseDetailDrawer();
  };

  const handleApproveLeave = async () => {
    if (!selectedSchedule) return;
    try {
      const linkedLeave = getLinkedLeaveForSchedule(selectedSchedule);
      let success = false;
      if (linkedLeave) {
        const res = await fetch(`/api/leaves/${linkedLeave.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'APPROVED',
            approverId: user?.id,
            approverName: user?.name
          })
        });
        const data = await res.json();
        if (data.success) success = true;
        else if (data.message) {
          alert(data.message);
          return;
        }
      }
      if (selectedSchedule.id) {
        const res2 = await fetch(`/api/schedules/${selectedSchedule.id}/approval`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'APPROVED',
            approverId: user?.id,
            approverName: user?.name
          })
        });
        const data2 = await res2.json();
        if (data2.success) success = true;
      }
      if (success) {
        onShowToast?.('승인 완료', '결재가 정상적으로 승인 처리되었습니다.', 'success');
        handleCloseDetailDrawer();
        if (onRefresh) onRefresh();
      } else {
        alert('승인 처리에 실패했습니다.');
      }
    } catch (err) {
      alert('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleRejectLeave = async () => {
    if (!selectedSchedule) return;
    const reason = prompt('반려 사유를 입력하세요 (선택):', '') || '관리자 반려';
    try {
      const linkedLeave = getLinkedLeaveForSchedule(selectedSchedule);
      let success = false;
      if (linkedLeave) {
        const res = await fetch(`/api/leaves/${linkedLeave.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'REJECTED', 
            rejectReason: reason,
            approverId: user?.id,
            approverName: user?.name
          })
        });
        const data = await res.json();
        if (data.success) success = true;
        else if (data.message) {
          alert(data.message);
          return;
        }
      }
      if (selectedSchedule.id) {
        const res2 = await fetch(`/api/schedules/${selectedSchedule.id}/approval`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'REJECTED', 
            rejectReason: reason,
            approverId: user?.id,
            approverName: user?.name
          })
        });
        const data2 = await res2.json();
        if (data2.success) success = true;
      }
      if (success) {
        onShowToast?.('반려 완료', '신청이 반려 처리되었습니다.', 'danger');
        handleCloseDetailDrawer();
        if (onRefresh) onRefresh();
      } else {
        alert('반려 처리에 실패했습니다.');
      }
    } catch (err) {
      alert('반려 처리 중 오류가 발생했습니다.');
    }
  };

  const formatLeaveDate = (sch) => {
    if (!sch || !sch.startDate) return '-';

    const linked = (selectedSchedule && selectedSchedule.id === sch.id && selectedScheduleLinkedLeave)
      ? selectedScheduleLinkedLeave
      : getLinkedLeaveForSchedule(sch);

    if (linked) {
      let batchLeaves = [];
      if (linked.batchId) {
        batchLeaves = (leaves || []).filter(l => l.batchId === linked.batchId && l.status !== 'REJECTED' && l.status !== 'CANCELLED');
      } else {
        const cTime = (linked.createdAt || '').slice(0, 19);
        if (cTime) {
          batchLeaves = (leaves || []).filter(l => 
            l.userId === linked.userId && 
            (l.createdAt || '').slice(0, 19) === cTime && 
            l.reason === linked.reason &&
            l.status !== 'REJECTED' &&
            l.status !== 'CANCELLED'
          );
        }
      }

      if (batchLeaves.length > 1) {
        const dates = Array.from(new Set(batchLeaves.map(l => l.startDate).filter(Boolean))).sort();
        if (dates.length > 1) {
          // 연속 일정 클러스터링: 1일 차이이거나 금요일~월요일 주말 연속인 경우 하나의 기간(~)으로 묶기
          const ranges = [];
          let currentStart = dates[0];
          let currentEnd = dates[0];

          for (let i = 1; i < dates.length; i++) {
            const prevDate = new Date(currentEnd);
            const currDate = new Date(dates[i]);
            const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            const isFridayToMonday = prevDate.getDay() === 5 && currDate.getDay() === 1 && diffDays === 3;
            const isConsecutive = diffDays === 1 || isFridayToMonday;

            if (isConsecutive) {
              currentEnd = dates[i];
            } else {
              ranges.push({ start: currentStart, end: currentEnd });
              currentStart = dates[i];
              currentEnd = dates[i];
            }
          }
          ranges.push({ start: currentStart, end: currentEnd });

          const dateLines = ranges.map(r => {
            if (r.start === r.end) return r.start;
            return `${r.start} ~ ${r.end}`;
          });

          let totalDays = 0;
          batchLeaves.forEach(l => {
            if (l.daysCount !== undefined && l.daysCount !== null) {
              totalDays += Number(l.daysCount);
            } else if (l.timeSlot === 'AM' || l.timeSlot === 'PM') {
              totalDays += 0.5;
            } else {
              totalDays += 1.0;
            }
          });

          const totalDaysStr = Number.isInteger(totalDays) ? `${totalDays}일` : `${totalDays.toFixed(1)}일`;
          return `${dateLines.join(' · ')} (총 ${totalDaysStr})`;
        }
      }
    }

    const sDate = sch.startDate.slice(0, 10);
    const eDate = sch.endDate ? sch.endDate.slice(0, 10) : sDate;
    if (sDate === eDate) return sDate;
    return `${sDate} ~ ${eDate}`;
  };

  const selectedScheduleLinkedLeave = selectedSchedule ? getLinkedLeaveForSchedule(selectedSchedule) : null;
  const isSelectedScheduleLeave = Boolean(
    selectedSchedule &&
    selectedSchedule.category !== 'INTERNAL_MEETING' &&
    selectedSchedule.category !== 'EXTERNAL_MEETING' &&
    selectedSchedule.category !== 'FIELD' &&
    selectedSchedule.category !== 'REMOTE' && (
      Boolean(selectedScheduleLinkedLeave) ||
      Boolean(selectedSchedule.leaveId) ||
      selectedSchedule.category === 'LEAVE' ||
      getScheduleCategoryKey(selectedSchedule) === 'LEAVE' ||
      (selectedSchedule.title && (
        selectedSchedule.title.includes('연차') ||
        selectedSchedule.title.includes('월차') ||
        selectedSchedule.title.includes('반차') ||
        selectedSchedule.title.includes('휴가') ||
        selectedSchedule.title.includes('병가') ||
        selectedSchedule.title.includes('공가') ||
        selectedSchedule.title.includes('경조사')
      ))
    )
  );

  const timelineItems = useMemo(() => {
    if (!selectedSchedule) return [];

    // 1. If this is a Leave / Attendance schedule, extract application and approval history
    const linkedLeave = selectedScheduleLinkedLeave || getLinkedLeaveForSchedule(selectedSchedule);
    if (isSelectedScheduleLeave || linkedLeave) {
      const items = [];

      // Applicant name (소속 부서 없이 순수 성명만 표기)
      const rawApplicant = linkedLeave?.userName || selectedSchedule.authorName || '신청자';
      const cleanApplicant = rawApplicant.replace(/\s*\([^)]*\)/, '').trim();

      // 최고관리자 본인 연차/근태 여부 확인 (최고관리자는 별도 결재 상신/승인 단계 없이 즉시 본인 전결 등록)
      const isSuperAdminLeave = (linkedLeave?.userId === 'usr-admin' || selectedSchedule.authorId === 'usr-admin');
      const reqTime = linkedLeave?.createdAt || selectedSchedule.createdAt || selectedSchedule.startDate;
      const status = linkedLeave?.status || selectedSchedule.approvalStatus || 'APPROVED';
      const isMultiApproverLeave = Array.isArray(linkedLeave?.approvers) && linkedLeave.approvers.length > 0;
      const procTime = linkedLeave?.processedAt || selectedSchedule.updatedAt || reqTime;
      const reasonText = linkedLeave?.reason || (selectedSchedule.description && !selectedSchedule.description.includes('승인된') ? selectedSchedule.description : '');

      if (isSuperAdminLeave) {
        // 최고관리자는 결재 상신-승인 2단계를 거치지 않으므로 단일 "전결 등록" 항목으로 깔끔하게 표시
        items.push({
          action: '전결 등록',
          userName: cleanApplicant,
          timestamp: reqTime,
          reason: reasonText
        });

        if (status === 'CANCELLED') {
          items.push({
            action: '취소',
            userName: cleanApplicant,
            timestamp: procTime,
            reason: ''
          });
        }
      } else {
        // 일반 임직원: 1-1. Application / Request (요청)
        items.push({
          action: '요청',
          userName: cleanApplicant,
          timestamp: reqTime,
          reason: reasonText
        });

        // 1-2. Processing / Approval / Rejection (승인 / 반려 / 취소대기 / 3인 다중결재)
        if (isMultiApproverLeave) {
          // Multi-approver breakdown (3-person approval for team leader)
          linkedLeave.approvers.forEach(appr => {
            if (appr.status === 'APPROVED') {
              items.push({
                action: '승인',
                userName: appr.name.replace(/\s*\([^)]*\)/, '').trim(),
                timestamp: appr.approvedAt || procTime,
                reason: ''
              });
            } else {
              items.push({
                action: '승인 대기',
                userName: appr.name.replace(/\s*\([^)]*\)/, '').trim(),
                timestamp: '',
                reason: ''
              });
            }
          });
        } else {
          // Single approver flow
          const rawApprover = linkedLeave?.approverName || '최고관리자';
          const cleanApprover = rawApprover.replace(/\s*\([^)]*\)/, '').trim();

          if (status === 'APPROVED') {
            items.push({
              action: '승인',
              userName: cleanApprover,
              timestamp: procTime,
              reason: ''
            });
          } else if (status === 'REJECTED') {
            items.push({
              action: '반려',
              userName: cleanApprover,
              timestamp: procTime,
              reason: linkedLeave?.rejectReason || selectedSchedule.rejectReason || ''
            });
          } else if (status === 'CANCEL_REQUESTED') {
            items.push({
              action: '취소 요청',
              userName: cleanApplicant,
              timestamp: procTime,
              reason: ''
            });
          } else if (status === 'PENDING') {
            items.push({
              action: '승인 대기',
              userName: cleanApprover,
              timestamp: '',
              reason: ''
            });
          }
        }
      }

      // Add any additional history if present on schedule
      if (Array.isArray(selectedSchedule.history)) {
        selectedSchedule.history.forEach(h => {
          if (!items.some(it => it.timestamp === h.timestamp && it.action === (h.action === 'CREATE' ? (isSuperAdminLeave ? '전결 등록' : '요청') : h.action))) {
            const rawUser = h.userName || '사용자';
            items.push({
              action: h.action === 'CREATE' ? (isSuperAdminLeave ? '전결 등록' : '등록') : h.action === 'UPDATE' ? '수정' : h.action,
              userName: rawUser.replace(/\s*\([^)]*\)/, '').trim(),
              timestamp: h.timestamp,
              reason: h.reason || ''
            });
          }
        });
      }

      return items;
    }

    // 2. Regular non-leave schedule (일반 일정 / 회의 등)
    if (Array.isArray(selectedSchedule.history) && selectedSchedule.history.length > 0) {
      return [...selectedSchedule.history].map(h => ({
        action: h.action === 'CREATE' ? '등록' : h.action === 'UPDATE' ? '수정' : h.action,
        userName: (h.userName || selectedSchedule.authorName || '사용자').replace(/\s*\([^)]*\)/, '').trim(),
        timestamp: h.timestamp,
        reason: h.reason || ''
      })).sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeA - timeB;
      });
    }

    const fallback = [];
    if (selectedSchedule.createdAt || selectedSchedule.authorName || selectedSchedule.startDate) {
      fallback.push({
        action: '등록',
        userName: (selectedSchedule.authorName || '등록자').replace(/\s*\([^)]*\)/, '').trim(),
        timestamp: selectedSchedule.createdAt || selectedSchedule.startDate,
        reason: ''
      });
    }
    if (selectedSchedule.updatedAt) {
      fallback.push({
        action: '수정',
        userName: (selectedSchedule.updatedByName || selectedSchedule.authorName || '사용자').replace(/\s*\([^)]*\)/, '').trim(),
        timestamp: selectedSchedule.updatedAt,
        reason: ''
      });
    }
    return fallback;
  }, [selectedSchedule, selectedScheduleLinkedLeave, isSelectedScheduleLeave, leaves]);

  return (
    <div style={{ width: '100%' }}>
      {/* Calendar Top Controls: ‹ 2026년 9월 › Navigation (Left) + Category Filters (Right) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* Left: ‹ 2026년 9월 › with Roller Popover */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
          <button
            type="button"
            onClick={prevMonth}
            title="이전 달"
            aria-label="이전 달"
            style={{
              background: 'none',
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
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div style={{ position: 'relative' }} ref={pickerRef}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowDatePicker(prev => !prev);
              }}
              title="연도 및 월 선택"
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                transition: 'opacity 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.75'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <span style={{
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1
              }}>
                {year}년 {month + 1}월
              </span>
            </button>

            {/* Smartphone Roller / Scroll Picker Popover (Unified with UserWorkCalendar) */}
            {showDatePicker && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                zIndex: 100,
                width: '320px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                animation: 'fadeIn 0.18s ease-out'
              }}>
                {/* Dual Scroll Columns (Smartphone Roller Style - No headers, no footers, no scrollbars) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  height: '260px',
                  position: 'relative'
                }}>
                  {/* Year Scroll Column */}
                  <div
                    ref={yearColRef}
                    className="no-scrollbar"
                    style={{
                      overflowY: 'auto',
                      borderRight: '1px solid var(--border-color)',
                      padding: '0.5rem 0',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                  >
                    {yearsList.map(y => {
                      const isSelected = y === tempYear;
                      return (
                        <div
                          key={y}
                          ref={isSelected ? selectedYearRef : null}
                          onClick={() => {
                            setTempYear(y);
                            setCurrentDate(new Date(y, tempMonth - 1, 1));
                          }}
                          style={{
                            height: '52px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#3b82f6' : 'var(--text-primary)',
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.12s ease',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.05))';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {y}년
                        </div>
                      );
                    })}
                  </div>

                  {/* Month Scroll Column */}
                  <div
                    ref={monthColRef}
                    className="no-scrollbar"
                    style={{
                      overflowY: 'auto',
                      padding: '0.5rem 0',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                  >
                    {monthsList.map(m => {
                      const isSelected = m === tempMonth;
                      return (
                        <div
                          key={m}
                          ref={isSelected ? selectedMonthRef : null}
                          onClick={() => {
                            setTempMonth(m);
                            setCurrentDate(new Date(tempYear, m - 1, 1));
                            setShowDatePicker(false);
                          }}
                          style={{
                            height: '52px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#3b82f6' : 'var(--text-primary)',
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.12s ease',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.05))';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {m}월
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={nextMonth}
            title="다음 달"
            aria-label="다음 달"
            style={{
              background: 'none',
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
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Right: Category filters (Font size enlarged to 22px, matching header proportion) + Add Schedule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {CALENDAR_CATEGORIES.map(cat => {
            const isSelected = categoryFilter === cat.id;
            const isHovered = hoveredTab === cat.id;
            const showDot = cat.id !== 'ALL' && isHovered;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                onMouseEnter={() => setHoveredTab(cat.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  padding: '6px 0',
                  fontSize: '22px',
                  fontWeight: isSelected ? 700 : (isHovered ? 600 : 500),
                  color: isSelected ? 'var(--text-primary)' : (isHovered ? (cat.color || 'var(--text-primary)') : 'var(--text-muted)'),
                  borderBottom: isSelected ? '2px solid var(--text-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  letterSpacing: '-0.02em',
                  transition: 'all 0.18s ease'
                }}
              >
                {cat.id !== 'ALL' && (
                  <span
                    style={{
                      width: showDot ? '10px' : '0px',
                      height: showDot ? '10px' : '0px',
                      borderRadius: '50%',
                      backgroundColor: cat.color,
                      display: 'inline-block',
                      flexShrink: 0,
                      opacity: showDot ? 1 : 0,
                      marginRight: showDot ? '8px' : '0px',
                      transform: showDot ? 'scale(1)' : 'scale(0)',
                      transition: 'all 0.18s ease',
                      overflow: 'hidden'
                    }}
                  />
                )}
                {cat.label}
              </button>
            );
          })}

          {/* 구분선: 카테고리 탭과 개인일정/등록 버튼 영역 분리 */}
          <div style={{
            width: '1px',
            height: '20px',
            backgroundColor: 'var(--border-color)',
            margin: '0 0.5rem',
            opacity: 0.6
          }} />

          {/* 개인일정 Checkbox (Strict Rule 5: CustomCheckbox) */}
          <CustomCheckbox
            checked={onlyMySchedules}
            onChange={(checked) => setOnlyMySchedules(checked)}
            label="개인일정"
            size={20}
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              padding: '6px'
            }}
            labelStyle={{
              fontSize: '16px',
              fontWeight: onlyMySchedules ? 600 : 400
            }}
          />

          {/* 일정 등록 (+) Icon Button - Completely identical to Navbar header buttons */}
          {user?.role !== 'CLIENT' && (
            <button 
              type="button" 
              onClick={() => handleOpenAddDrawer()} 
              title="일정 등록"
              aria-label="일정 등록"
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none'
              }}
            >
              <Plus size={22} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Calendar Grid Container (Unified 7-Column Grid, Identical to UserWorkCalendar) */}
      <div style={{
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        overflow: 'hidden',
        width: '100%'
      }}>
        {/* Calendar Grid Week Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-input)'
        }}>
          {['일', '월', '화', '수', '목', '금', '토'].map((head, idx) => (
            <div
              key={head}
              style={{
                padding: '0.85rem 0.5rem',
                textAlign: 'center',
                fontSize: '16px',
                fontWeight: 600,
                color: idx === 0 ? '#ef4444' : (idx === 6 ? '#3b82f6' : 'var(--text-secondary)')
              }}
            >
              {head}
            </div>
          ))}
        </div>

        {/* Calendar Grid Weeks (Natural Expansion without Scrollbars & Multi-day Continuous Spans at the Top) */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {weeks.map((weekDays, weekIdx) => {
            const weekTracks = getWeekMultiDayTracks(weekDays);

            return (
              <div
                key={weekIdx}
                style={{
                  position: 'relative',
                  minHeight: '165px',
                  borderBottom: weekIdx === weeks.length - 1 ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Background Layer: 7 Columns for Grid Lines & Today Highlight */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  pointerEvents: 'none'
                }}>
                  {weekDays.map((item, colIdx) => {
                    const isToday = item.dateStr === getTodayStr();
                    return (
                      <div
                        key={colIdx}
                        style={{
                          borderRight: colIdx === 6 ? 'none' : '1px solid var(--border-color)',
                          backgroundColor: isToday
                            ? 'rgba(255, 255, 255, 0.05)'
                            : (!item.isCurrentMonth ? 'rgba(0,0,0,0.015)' : 'transparent'),
                          outline: isToday ? '2px solid var(--text-primary, #ffffff)' : 'none',
                          outlineOffset: '-2px',
                          position: isToday ? 'relative' : 'static',
                          zIndex: isToday ? 5 : 0,
                          opacity: item.isCurrentMonth ? 1 : 0.35
                        }}
                      />
                    );
                  })}
                </div>

                {/* Layer 2: Day Number Header Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  zIndex: 1
                }}>
                  {weekDays.map((item, colIdx) => {
                    const isToday = item.dateStr === getTodayStr();
                    const isSunday = colIdx === 0;
                    const isSaturday = colIdx === 6;
                    const holidayName = getHoliday(item.dateStr);
                    const isHoliday = !!holidayName;

                    return (
                      <div 
                        key={item.dateStr} 
                        style={{ 
                          padding: '0.75rem 14px 0.45rem 14px',
                          minWidth: 0, 
                          opacity: item.isCurrentMonth ? 1 : 0.35,
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: '6px'
                        }}
                      >
                        <span style={{
                          fontSize: '16px',
                          lineHeight: 1,
                          fontWeight: isToday ? 700 : 500,
                          color: isToday 
                            ? 'var(--text-primary)' 
                            : ((isSunday || isHoliday) ? '#ef4444' : (isSaturday ? '#3b82f6' : 'var(--text-primary)'))
                        }}>
                          {item.day}
                        </span>
                        {holidayName && (
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#ef4444',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1
                          }}>
                            {holidayName}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Layer 3: Multi-day Continuous Schedules Spanning Row(s) at the TOP */}
                {weekTracks.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    rowGap: '6px',
                    padding: '0 0 8px 0',
                    zIndex: 2
                  }}>
                    {weekTracks.map((track, trackIdx) =>
                      track.map(span => {
                        const isPending = span.isPending;
                        const dotColor = span.dotColor;
                        const bg = dotColor;
                        const border = 'none';

                        return (
                          <div
                            key={`${span.sch.id}-${weekIdx}`}
                            onClick={() => setSelectedSchedule(span.sch)}
                            style={{
                              gridColumn: `${span.startCol + 1} / ${span.endCol + 2}`,
                              gridRow: span.trackIdx + 1,
                              display: 'flex',
                              alignItems: 'center',
                              height: '32px',
                              padding: '0 0.75rem',
                              marginLeft: '14px',
                              marginRight: '14px',
                              backgroundColor: bg,
                              border: border,
                              borderRadius: `${span.isContinuationFromPrev ? 0 : 4}px ${span.isContinuationToNext ? 0 : 4}px ${span.isContinuationToNext ? 0 : 4}px ${span.isContinuationFromPrev ? 0 : 4}px`,
                              color: '#ffffff',
                              fontSize: '16px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              minWidth: 0,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)'
                            }}
                            title={span.cleanTitle}
                            onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                          >
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '16px',
                              fontWeight: 600,
                              color: '#ffffff'
                            }}>
                              {span.cleanTitle}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Layer 4: Single-day Schedules Row (Natural Growth, No Scrollbars) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  alignItems: 'start',
                  flex: 1,
                  zIndex: 2,
                  paddingBottom: '1rem'
                }}>
                  {weekDays.map((item, colIdx) => {
                    const singleSchedules = getSingleSchedulesForDay(item.dateStr);

                    return (
                      <div
                        key={item.dateStr}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                          padding: '0 14px',
                          minWidth: 0,
                          opacity: item.isCurrentMonth ? 1 : 0.4
                        }}
                      >
                        {singleSchedules.map(sch => {
                          const dotColor = getScheduleDotColor(sch);
                          // ONLY schedules that need approval get the filled rectangular background!
                          const isPending = getScheduleEffectiveStatus(sch) === 'PENDING';
                          const cleanTitle = (sch.title || '').replace(/^(\[[^\]]+\]\s*)+/, '').trim();

                          if (isPending) {
                            const bg = dotColor;
                            const border = 'none';

                            return (
                              <div
                                key={`${sch.id}-${item.dateStr}`}
                                onClick={() => setSelectedSchedule(sch)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  height: '32px',
                                  padding: '0 0.75rem',
                                  backgroundColor: bg,
                                  border: border,
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '16px',
                                  fontWeight: 600,
                                  lineHeight: 1.35,
                                  cursor: 'pointer',
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  textOverflow: 'ellipsis',
                                  transition: 'all 0.15s ease',
                                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)'
                                }}
                                title={cleanTitle}
                                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                              >
                                <span style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: '16px',
                                  fontWeight: 600,
                                  color: '#ffffff'
                                }}>
                                  {cleanTitle}
                                </span>
                              </div>
                            );
                          }

                          // Regular confirmed/approved schedule (including approved leaves):
                          return (
                            <div
                              key={`${sch.id}-${item.dateStr}`}
                              onClick={() => setSelectedSchedule(sch)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.55rem',
                                padding: '0.35rem 0',
                                fontSize: '16px',
                                color: 'var(--text-primary)',
                                minWidth: 0,
                                lineHeight: 1.4,
                                cursor: 'pointer',
                                borderRadius: '4px',
                                transition: 'all 0.15s ease'
                              }}
                              title={cleanTitle}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.75';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                            >
                              <span style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: dotColor,
                                flexShrink: 0
                              }} />
                              <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontWeight: 500,
                                fontSize: '16px',
                                color: 'var(--text-primary)'
                              }}>
                                {cleanTitle}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DRAWER 1: ADD SCHEDULE (우측 슬라이드 드로어 - Minimal Typography UI matching Detail View) */}
      {showAddDrawer && (
        <div
          className={`detail-backdrop ${isAddClosing ? 'closing' : ''}`}
          onClick={handleCloseAddDrawer}
        >
          <div
            className={`detail-slide-drawer drawer-md ${isAddClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
          >
            {/* Header: Close button only */}
            <div style={{
              padding: '1.75rem 2.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              backgroundColor: 'var(--bg-card)',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={handleCloseAddDrawer}
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

            {/* Body */}
            <div style={{ flex: 1, padding: '0 2.25rem 1.5rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto', minHeight: 0 }}>
              {/* Title Input */}
              <div>
                <input
                  type="text"
                  required
                  placeholder="일정을 입력해주세요"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{
                    width: '100%',
                    fontSize: '28px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.35,
                    color: 'var(--text-primary)',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: '0'
                  }}
                />
              </div>

              {/* Rows List */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                borderTop: '1px solid var(--border-color)'
              }}>
                {/* 1. 분류 (제목 바로 아래에 먼저 노출, 하단 라인 강조 제거) */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'INTERNAL_MEETING', label: '사내회의', color: '#8b5cf6' },
                      { id: 'EXTERNAL_MEETING', label: '외부미팅', color: '#3b82f6' },
                      { id: 'FIELD', label: '외근', color: '#be123c' },
                      { id: 'ETC', label: '기타', color: '#94a3b8' }
                    ].map(c => {
                      const isSel = form.category === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setForm({ ...form, category: c.id })}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'none',
                            border: 'none',
                            fontSize: '17px',
                            fontWeight: isSel ? 700 : 500,
                            color: isSel ? 'var(--text-primary)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px 0',
                            transition: 'color 0.15s ease'
                          }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color }} />
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. 일시 (Clean 2-row layout with 종일 CustomCheckbox) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '1.25rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1.5rem'
                }}>
                  <div style={{ width: '100px', flexShrink: 0, paddingTop: '4px' }}>
                    <span style={{ fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      일시
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                    {/* 시작 일시 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ width: '32px', fontSize: '15px', color: 'var(--text-secondary)', flexShrink: 0 }}>시작</span>
                      <CustomDatePicker
                        value={form.startDate}
                        onChange={(val) => {
                          const nextEndDate = (!form.endDate || form.endDate < val) ? val : form.endDate;
                          setForm({ ...form, startDate: val, endDate: nextEndDate });
                        }}
                        placeholder=""
                        clearable={false}
                        width="160px"
                      />
                      <input
                        type="time"
                        value={form.startTime}
                        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                        style={{
                          background: 'var(--bg-input, transparent)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          padding: '8px 10px',
                          fontSize: '15px',
                          borderRadius: '6px',
                          outline: 'none',
                          colorScheme: 'dark'
                        }}
                      />
                    </div>

                    {/* 종료 일시 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ width: '32px', fontSize: '15px', color: 'var(--text-secondary)', flexShrink: 0 }}>종료</span>
                      <CustomDatePicker
                        value={form.endDate}
                        onChange={(val) => setForm({ ...form, endDate: val })}
                        placeholder=""
                        clearable={false}
                        width="160px"
                      />
                      <input
                        type="time"
                        value={form.endTime}
                        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                        style={{
                          background: 'var(--bg-input, transparent)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          padding: '8px 10px',
                          fontSize: '15px',
                            borderRadius: '6px',
                            outline: 'none',
                            colorScheme: 'dark'
                          }}
                        />
                      </div>
                  </div>
                </div>

                {/* 3. 장소 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1.25rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1.5rem'
                }}>
                  <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                    장소
                  </span>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    style={{
                      flex: 1,
                      fontSize: '18px',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                      padding: 0
                    }}
                  />
                </div>

                {/* 4. 담당 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  padding: '1.25rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1.5rem'
                }}>
                  <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                    담당
                  </span>
                  <span style={{ fontSize: '18px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {user?.name || '김관리'}{user?.dept && user?.dept !== '전사' ? ` (${user.dept})` : ''}
                  </span>
                </div>

                {/* 5. 참석자 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '1.25rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1.5rem'
                }}>
                  <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0, paddingTop: '6px' }}>
                    참석자
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                    {/* 셀렉트 드롭다운 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <select
                        className="form-control"
                        value=""
                        onChange={handleAddAttendeeSelect}
                        style={{
                          minWidth: '240px',
                          width: 'auto',
                          height: '38px',
                          fontSize: '15px',
                          backgroundColor: 'var(--bg-input, var(--bg-card))',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="" disabled>+ 참석자 또는 팀 추가</option>

                        <optgroup label="── 팀 / 부서 단위 전체 추가 ──">
                          <option value="TEAM_ALL">전체 직원 추가</option>
                          {departmentsList.map(dept => (
                            <option key={dept} value={`TEAM_${dept}`}>{dept} 전체 추가</option>
                          ))}
                        </optgroup>

                        {usersByDept.map(([deptName, deptUsers]) => (
                          <optgroup key={deptName} label={`── ${deptName} ──`}>
                            {deptUsers.map(u => {
                              const title = getEmpTitle(u);
                              const isAdded = (form.attendeeIds || []).includes(u.id);
                              return (
                                <option key={u.id} value={u.id} disabled={isAdded}>
                                  {isAdded ? '✓ ' : ''}{u.name}{title ? ` (${title})` : ''}
                                </option>
                              );
                            })}
                          </optgroup>
                        ))}
                      </select>

                      {(form.attendeeIds || []).length > 0 && (
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, attendeeIds: [] }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            textDecoration: 'underline'
                          }}
                        >
                          전체 비우기
                        </button>
                      )}
                    </div>

                    {/* 등록된 참석자 리스트 */}
                    {(form.attendeeIds || []).length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        alignItems: 'center',
                        marginTop: '0.25rem'
                      }}>
                        {internalEmployees
                          .filter(e => (form.attendeeIds || []).includes(e.id))
                          .map(emp => {
                            const title = getEmpTitle(emp);
                            const label = `${emp.name} ${title ? `${title} ` : ''}(${emp.dept || '기타'})`;
                            return (
                              <div
                                key={emp.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  fontSize: '15px',
                                  color: 'var(--text-primary)',
                                  fontWeight: 500
                                }}
                              >
                                <span>{label}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttendee(emp.id)}
                                  title="참석자 삭제"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '0 2px',
                                    lineHeight: 1,
                                    fontSize: '12px'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. 내용 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  padding: '1.25rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1.5rem'
                }}>
                  <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                    내용
                  </span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
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

                {/* 7. 파일 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '1.25rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1.5rem'
                }}>
                  <span style={{
                    width: '100px',
                    fontSize: '17px',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    flexShrink: 0,
                    lineHeight: '26px',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}>
                    파일
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
                    {addUploadedFiles.map(file => (
                      <div key={file.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minHeight: '26px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: '26px' }}>
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAddUploadedFile(file.id)}
                          title="파일 삭제"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '0 4px',
                            lineHeight: 1
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* + 버튼: 파일 목록 아래 줄에 독립적으로 배치 (수직 중앙 정렬) */}
                    <div style={{ height: '26px', display: 'flex', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => addFileInputRef.current?.click()}
                        title="파일 추가"
                        aria-label="파일 추가"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: 'var(--text-primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          outline: 'none',
                          borderRadius: '4px',
                          height: '24px',
                          width: '24px',
                          transition: 'opacity 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <Plus size={20} strokeWidth={2} />
                      </button>
                    </div>
                    <input
                      ref={addFileInputRef}
                      type="file"
                      style={{ display: 'none' }}
                      onChange={handleDirectAddFileSelect}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions: Fixed at the very bottom of the drawer */}
            <div style={{
              padding: '1.5rem 2.25rem 2.25rem 2.25rem',
              backgroundColor: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              width: '100%',
              flexShrink: 0,
              marginTop: 'auto'
            }}>
              <button
                type="button"
                onClick={handleSubmit}
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
                {editingScheduleId ? '일정 수정 완료' : '일정 등록 완료'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseAddDrawer}
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
          </div>
        </div>
      )}

      {/* DRAWER 2: SCHEDULE DETAIL & LINKED FILES (일정 상세 및 파일 연동 드로어) */}
      {selectedSchedule && (
        <div
          className={`detail-backdrop ${isDetailClosing ? 'closing' : ''}`}
          onClick={handleCloseDetailDrawer}
        >
          {/* TIMELINE SIDE PANEL (패널 왼쪽 옆에 길게 배치, 옆에서 슬라이드 인/아웃) */}
          {(showHistoryPanel || isTimelineClosing) && (
            <div
              ref={timelinePanelRef}
              className={`timeline-slide-panel ${isTimelineClosing ? 'closing' : ''}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                animation: isTimelineClosing
                  ? 'slideOutTimeline 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                  : 'slideInTimeline 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              {/* Timeline Body (Header eliminated for ultra-clean layout) */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '3rem 2rem 2.5rem 2rem',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {timelineItems.length > 0 ? (
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2.5rem',
                    marginLeft: '0.5rem'
                  }}>
                    {timelineItems.map((item, idx) => {
                      const isLast = idx === timelineItems.length - 1;
                      return (
                        <div key={idx} style={{ position: 'relative', paddingLeft: '1.5rem' }}>
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

                          {/* 1. Action (요청 / 승인 / 반려 / 등록 / 수정) */}
                          <div style={{
                            fontSize: '17px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            lineHeight: 1.3,
                            letterSpacing: '-0.01em'
                          }}>
                            {item.action}
                          </div>

                          {/* 2. User Name (요청 아랫줄에 이름 노출, 승인 대기는 단독 표시) */}
                          {item.userName ? (
                            <div style={{
                              fontSize: '16px',
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                              marginTop: '0.35rem',
                              lineHeight: 1.4
                            }}>
                              {item.userName}
                            </div>
                          ) : null}

                          {/* 3. Timestamp */}
                          {item.timestamp && (
                            <div style={{
                              fontSize: '16px',
                              color: 'var(--text-muted)',
                              marginTop: '0.25rem',
                              letterSpacing: '-0.01em',
                              lineHeight: 1.4
                            }}>
                              {formatHistoryTime(item.timestamp)}
                            </div>
                          )}

                          {/* 4. Reason (사유가 있는 경우 노출) */}
                          {item.reason && (
                            <div style={{
                              fontSize: '15px',
                              color: 'var(--text-secondary)',
                              marginTop: '0.35rem',
                              lineHeight: 1.4,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              {item.reason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                    기록 없음
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            className={`detail-slide-drawer drawer-md ${isDetailClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
          >
            {/* Detail Drawer Header (Timeline icon & close button) */}
            <div style={{
              padding: '2.5rem 2.25rem 1.5rem 2.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              backgroundColor: 'var(--bg-card)',
              gap: '0.6rem',
              position: 'relative',
              flexShrink: 0
            }}>
              {/* Timeline Toggle Button (Pure icon with no background on active) */}
              <button
                ref={timelineToggleBtnRef}
                type="button"
                onClick={handleToggleTimeline}
                title="이력 타임라인"
                aria-label="이력 타임라인"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  color: showHistoryPanel ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  borderRadius: '4px',
                  transition: 'color 0.15s ease, opacity 0.15s ease',
                  opacity: showHistoryPanel ? 1 : 0.8
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = showHistoryPanel ? '1' : '0.8'}
              >
                <Clock size={20} strokeWidth={2} />
              </button>

              <button
                type="button"
                onClick={handleCloseDetailDrawer}
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

            {/* Detail Drawer Body (Strictly NO Box Style, Unified Typography) */}
            <div style={{ flex: 1, padding: '0 2.25rem 1.5rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto', minHeight: 0 }}>
              {/* Title */}
              <div style={{ paddingTop: '0.65rem' }}>
                <h3 style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.35
                }}>
                  {isSelectedScheduleLeave 
                    ? (selectedSchedule.title || '').replace(/^(\[[^\]]+\]\s*)+/, '').replace(/\s*\([^)]*\)/g, '').trim()
                    : (selectedSchedule.title || '').replace(/^(\[[^\]]+\]\s*)+/, '').trim()
                  }
                </h3>
              </div>

              {/* Meta Info List - Clean typography, unified 일시 · 날짜 · 시간 · 장소 · 담당 · 내용 · 파일 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                borderTop: '1px solid var(--border-color)'
              }}>
                {/* 1. 유형 (모든 일정에 대해 순수 텍스트 타이포그래피로 유형 노출) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  padding: '1.25rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1.5rem'
                }}>
                  <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                    유형
                  </span>
                  <span style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>
                    {isSelectedScheduleLeave 
                      ? getLeaveTypeDisplayText(selectedSchedule, selectedScheduleLinkedLeave)
                      : getScheduleCategoryLabel(selectedSchedule)
                    }
                  </span>
                </div>
                {/* 1. 날짜 및 시간 (휴가는 날짜만 단일 행, 회의/일반 일정은 날짜와 시간 분리 노출) */}
                {isSelectedScheduleLeave ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      날짜
                    </span>
                    <span style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>
                      {formatLeaveDate(selectedSchedule)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      padding: '1.25rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                        날짜
                      </span>
                      <span style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>
                        {getScheduleDateText(selectedSchedule)}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      padding: '1.25rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                        시간
                      </span>
                      <span style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>
                        {getScheduleTimeText(selectedSchedule)}
                      </span>
                    </div>
                  </>
                )}

                {/* 2. 장소 (휴가/근태 일정 제외 & 실제 장소 정보가 있을 때만 노출) */}
                {!isSelectedScheduleLeave && selectedSchedule.location && selectedSchedule.location.trim() && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      장소
                    </span>
                    <span style={{ fontSize: '18px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {selectedSchedule.location.trim()}
                    </span>
                  </div>
                )}

                {/* 3. 담당 (휴가/근태 일정 제외) */}
                {!isSelectedScheduleLeave && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      담당
                    </span>
                    <span style={{ fontSize: '18px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {getAuthorDisplayText(selectedSchedule)}
                    </span>
                  </div>
                )}

                {/* 참석자 (참여 인원 표시) */}
                {((selectedSchedule.attendees && selectedSchedule.attendees.length > 0) || (selectedSchedule.attendeeIds && selectedSchedule.attendeeIds.length > 0)) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      참석자
                    </span>
                    <span style={{ fontSize: '18px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {selectedSchedule.attendees && selectedSchedule.attendees.length > 0
                        ? selectedSchedule.attendees.map(a => a.name).join(' · ')
                        : (employees || []).filter(e => selectedSchedule.attendeeIds?.includes(e.id)).map(e => e.name).join(' · ')}
                    </span>
                  </div>
                )}

                {/* 4. 내용 (가로 행 배치) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  padding: '1.25rem 0',
                  borderBottom: isSelectedScheduleLeave ? 'none' : '1px solid var(--border-color)',
                  gap: '1.5rem'
                }}>
                  <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                    내용
                  </span>
                  <span style={{ flex: 1, fontSize: '18px', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {selectedSchedule.description || '-'}
                  </span>
                </div>

                {/* 반려 사유 (휴가/근태 반려 건일 때 눈에 띄게 표시) */}
                {isSelectedScheduleLeave && Boolean(selectedSchedule.rejectReason || selectedScheduleLinkedLeave?.rejectReason) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    padding: '1.25rem 0',
                    borderTop: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: '#ef4444', fontWeight: 600, flexShrink: 0 }}>
                      반려 사유
                    </span>
                    <span style={{ flex: 1, fontSize: '18px', color: '#ef4444', lineHeight: 1.5, fontWeight: 500 }}>
                      {selectedSchedule.rejectReason || selectedScheduleLinkedLeave?.rejectReason}
                    </span>
                  </div>
                )}

                {/* 5. 파일 (휴가/연차 일정이 아닐 때만 노출) */}
                {!isSelectedScheduleLeave && (() => {
                  const isScheduleOwner = Boolean(
                    (selectedSchedule.authorId && user?.id && selectedSchedule.authorId === user.id) ||
                    (user?.name && selectedSchedule.authorName === user.name) ||
                    (user?.name && selectedSchedule.author === user.name)
                  );
                  const filesList = getScheduleFiles(selectedSchedule);

                  return (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '1.25rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '1.5rem'
                    }}>
                      <span style={{
                        width: '100px',
                        fontSize: '17px',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        flexShrink: 0,
                        lineHeight: '26px',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}>
                        파일
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
                        {filesList.map(file => (
                          <div key={file.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minHeight: '26px' }}>
                            <a
                              href={file.url}
                              download={file.name}
                              title="클릭 시 다운로드"
                              style={{
                                fontSize: '18px',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                lineHeight: '26px',
                                wordBreak: 'break-all',
                                transition: 'color 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                            >
                              {file.name}
                            </a>
                            {isScheduleOwner && (
                              <button
                                type="button"
                                onClick={() => handleUnlinkFile(file.id)}
                                title="파일 연결 해제"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  padding: '0 4px',
                                  lineHeight: 1
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}

                        {/* + 버튼: 작성자 본인일 때만 노출, 수직 중앙 정렬 일치 */}
                        {isScheduleOwner ? (
                          <div style={{ height: '26px', display: 'flex', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => detailFileInputRef.current?.click()}
                              title="파일 추가"
                              aria-label="파일 추가"
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                outline: 'none',
                                borderRadius: '4px',
                                height: '24px',
                                width: '24px',
                                transition: 'opacity 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <Plus size={20} strokeWidth={2} />
                            </button>
                          </div>
                        ) : (
                          filesList.length === 0 && (
                            <div style={{ height: '26px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '18px' }}>
                              -
                            </div>
                          )
                        )}
                        <input
                          ref={detailFileInputRef}
                          type="file"
                          style={{ display: 'none' }}
                          onChange={handleDirectUploadToDetail}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer Action Buttons Section (Fixed at bottom of drawer) */}
            {(() => {
              const isApplicant = Boolean(
                (selectedSchedule.authorId && user?.id && selectedSchedule.authorId === user.id) ||
                (user?.name && selectedSchedule.authorName === user.name) ||
                (user?.name && selectedSchedule.author === user.name)
              );
              const isAdmin = user?.role === 'ADMIN';
              const isLeave = isSelectedScheduleLeave;
              const isFieldWork = selectedSchedule.category === 'FIELD' || selectedSchedule.leaveType === 'FIELD' || selectedSchedule.typeLabel === '외근';
              const isPersonal = selectedSchedule.category === 'PERSONAL';
              const linkedLeave = selectedScheduleLinkedLeave;
              const effStatus = linkedLeave?.status || selectedSchedule.approvalStatus || 'APPROVED';
              const isPending = effStatus === 'PENDING';
              const schedDate = selectedSchedule.startDate ? selectedSchedule.startDate.slice(0, 10) : '';
              const isTodayOrFuture = schedDate >= getTodayStr();

              const isMultiApproverLeave = Array.isArray(linkedLeave?.approvers) && linkedLeave.approvers.length > 0;
              const isTargetApproverInMulti = isMultiApproverLeave && linkedLeave.approvers.some(a => a.id === user?.id || (user?.role === 'ADMIN' && a.role === 'ADMIN'));
              const hasAlreadyApprovedInMulti = isMultiApproverLeave && linkedLeave.approvers.some(a => (a.id === user?.id || (user?.role === 'ADMIN' && a.role === 'ADMIN')) && a.status === 'APPROVED');

              let canUserApprove = false;
              if (!isApplicant && isPending) {
                if (isMultiApproverLeave) {
                  canUserApprove = isTargetApproverInMulti && !hasAlreadyApprovedInMulti;
                } else if (isAdmin) {
                  canUserApprove = true;
                } else if (user?.role === 'TEAM_LEADER') {
                  const scope = user?.permissions?.leaveApprovalScope || 'OWN_TEAM';
                  if (scope === 'ALL') {
                    canUserApprove = true;
                  } else if (scope === 'OWN_TEAM') {
                    const applicantDept = linkedLeave?.dept || selectedSchedule.dept;
                    canUserApprove = applicantDept === user?.dept;
                  }
                } else if (user?.role === 'EMPLOYEE') {
                  canUserApprove = isTargetApproverInMulti && !hasAlreadyApprovedInMulti;
                }
              }

              const hasStatusText = (
                effStatus === 'CANCEL_REQUESTED' ||
                effStatus === 'CANCELLED' ||
                effStatus === 'REJECTED' ||
                (isPending && !canUserApprove)
              );

              const canApproveReject = isLeave && canUserApprove;

              // 외근 및 개인 일정은 본인 일정이지만 사내 공유용이므로, 타인은 수정/삭제 불가 (오직 본인만 수정/삭제)
              // 일반 회의/전사 일정은 등록자 또는 관리자 가능
              const canEditOrDelete = !isLeave && (
                (isFieldWork || isPersonal) ? isApplicant : (isApplicant || isAdmin)
              );

              // If nothing to display (e.g. approved leave with no pending actions, or viewing someone else's field schedule), do NOT render any container
              if (!hasStatusText && !canApproveReject && !canEditOrDelete) {
                return null;
              }

              return (
                <div style={{
                  padding: '1.5rem 2.25rem 2.25rem 2.25rem',
                  backgroundColor: 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  width: '100%',
                  flexShrink: 0,
                  marginTop: 'auto'
                }}>
                  {/* Status info text */}
                  {hasStatusText && (
                    <div>
                      {isPending && !canUserApprove && (
                        <div style={{ fontSize: '14.5px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          {isApplicant 
                            ? '[결재 진행 중 · 본인 신청 건은 직접 승인할 수 없습니다]' 
                            : (hasAlreadyApprovedInMulti 
                                ? '[본인 승인 완료 · 타 결재자 승인 대기 중]' 
                                : '[결재 권한이 없는 일정입니다]')}
                        </div>
                      )}
                      {(linkedLeave?.status === 'CANCEL_REQUESTED' || selectedSchedule.approvalStatus === 'CANCEL_REQUESTED') && (
                        <div style={{ fontSize: '14.5px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          [취소 요청 대기 중]
                        </div>
                      )}
                      {(linkedLeave?.status === 'CANCELLED' || selectedSchedule.approvalStatus === 'CANCELLED') && (
                        <div style={{ fontSize: '14.5px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          [취소 완료]
                        </div>
                      )}
                      {(linkedLeave?.status === 'REJECTED' || selectedSchedule.approvalStatus === 'REJECTED') && (
                        <div style={{ fontSize: '14.5px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          [반려됨]{(linkedLeave?.rejectReason || selectedSchedule?.rejectReason) ? ` · 반려 사유: ${linkedLeave?.rejectReason || selectedSchedule?.rejectReason}` : ''}
                        </div>
                      )}
                    </div>
                  )}

                  {isLeave ? (
                    canUserApprove ? (
                      // Authorized Approver: Full-width stacked buttons (Top: 승인, Bottom: 반려)
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleApproveLeave}
                          style={{
                            width: '100%',
                            height: '46px',
                            fontSize: '15.5px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleRejectLeave}
                          style={{
                            width: '100%',
                            height: '46px',
                            fontSize: '15.5px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            borderColor: 'var(--border-color)'
                          }}
                        >
                          반려
                        </button>
                      </div>
                    ) : null
                  ) : canEditOrDelete ? (
                    // Regular non-leave schedule: Stacked Edit and Delete buttons
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleStartEditSchedule}
                        style={{
                          width: '100%',
                          height: '44px',
                          fontSize: '15px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleDeleteCurrentSchedule}
                        style={{
                          width: '100%',
                          height: '44px',
                          fontSize: '15px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </div>
        </div>
      )}
  </div>
);
}
