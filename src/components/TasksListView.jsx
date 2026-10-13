import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, RotateCcw, Plus, X, Trash2, ArrowUpDown, Filter, Check, ChevronRight, GripVertical, ArrowUpRight } from 'lucide-react';
import CustomCheckbox from './CustomCheckbox';
import CustomDatePicker from './CustomDatePicker';

export default function TasksListView({
  user,
  tasks = [],
  clientRequests = [],
  employees = [],
  onAddTask,
  onUpdateTaskStatus,
  onRefresh,
  onShowToast,
  onNavigateItem
}) {
  // Status Sub-tabs: 'IN_PROGRESS' (진행 중 - default) | 'DONE' (완료) | 'ALL' (전체)
  const [activeTab, setActiveTab] = useState('IN_PROGRESS');

  // Type Filter: 'ALL' (전체) | 'PROJECT' (프로젝트) | 'CLIENT' (고객사 요청) | 'DIRECT' (직접 등록)
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // Sort Order: 'CUSTOM' (사용자 지정 드래그 순서 - default) | 'DATE_DESC' (최신순) | 'DATE_ASC' (오래된순) | 'DUE_ASC' (마감 임박순)
  const [sortBy, setSortBy] = useState('CUSTOM');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef(null);

  // Custom drag-and-drop order state (localStorage-persisted)
  const [customOrder, setCustomOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(`onedesk_tasks_order_${user?.id || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);

  // Search & Date Filter State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const searchInputRef = useRef(null);

  // New Task Registration Drawer State (전사 표준 우측 슬라이드 드로어)
  const [showNewDrawer, setShowNewDrawer] = useState(false);
  const [isNewDrawerClosing, setIsNewDrawerClosing] = useState(false);
  const [newForm, setNewForm] = useState({
    title: '',
    description: '',
    priority: 'NORMAL',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10)
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail View Drawer State (전사 표준 우측 슬라이드 드로어)
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailClosing, setIsDetailClosing] = useState(false);

  // Local overrides for instant optimistic UI toggle feedback
  const [statusOverrides, setStatusOverrides] = useState({});

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Normalize and aggregate pure work items (프로젝트 업무 + 고객사 요청 + 직접 등록 업무만 포함, 캘린더 일정 완전 배제)
  const aggregatedItems = useMemo(() => {
    if (!user) return [];
    const items = [];

    // (A) Tasks from task board & direct tasks (프로젝트 업무 / 직접 등록 업무)
    (tasks || []).forEach(t => {
      const isAssigned = t.assigneeId === user.id || (!t.assigneeId && t.dept === user.dept);
      const isAuthor = t.authorId === user.id;
      const isAdmin = user.role === 'ADMIN';

      if (isAssigned || isAuthor || isAdmin) {
        const override = statusOverrides[`task-${t.id}`];
        const isDone = override !== undefined ? override : (t.status === 'DONE');
        const isDirect = Boolean(t.isDirectTask || (isAuthor && t.assigneeId === user.id && !t.projectId));
        
        items.push({
          id: `task-${t.id}`,
          rawId: t.id,
          sourceType: 'TASK',
          categoryType: isDirect ? 'DIRECT' : 'PROJECT',
          title: t.title || '무제 업무',
          typeLabel: isDirect ? '직접 등록' : '프로젝트',
          createdAt: t.createdAt || t.startDate || '',
          date: t.dueDate || t.startDate || t.createdAt || '',
          dateLabel: t.dueDate ? `~ ${t.dueDate}` : (t.startDate ? `${t.startDate}` : ''),
          priority: t.priority || 'NORMAL',
          priorityLabel: t.priority === 'URGENT' ? '긴급' : t.priority === 'HIGH' ? '높음' : t.priority === 'LOW' ? '낮음' : '보통',
          description: t.description || '',
          isDone,
          canDelete: isAuthor || isAdmin,
          rawItem: t
        });
      }
    });

    // (B) Client Requests (고객사 요청 - 중복 제거 및 담당 배정 업무 통합)
    (clientRequests || []).forEach(cr => {
      const myAssignedTasks = (cr.assignedTasks || []).filter(at => at.assigneeId === user.id || at.staffId === user.id);
      const isDirectAssignee = cr.assigneeId === user.id;
      const isAdmin = user.role === 'ADMIN';

      if (myAssignedTasks.length > 0 || isDirectAssignee || (isAdmin && cr.status !== 'DELETED')) {
        const override = statusOverrides[`cr-${cr.id}`];
        
        // 완료 여부 판별: 본인 배정 하위 작업이 모두 완료되었거나 요청 전체가 DONE인 경우
        const myTasksCompleted = myAssignedTasks.length > 0
          ? myAssignedTasks.every(at => at.status === 'COMPLETED')
          : cr.status === 'DONE';
        const isDone = override !== undefined ? override : myTasksCompleted;

        // 본인 담당 분야 레이블 추출 (예: '개발', '디자인')
        const myCategories = Array.from(new Set(
          myAssignedTasks.map(at => at.categoryLabel || at.category).filter(Boolean)
        ));
        const subLabel = myCategories.length > 0 ? `고객사 요청 · ${myCategories.join(', ')}` : '고객사 요청';

        items.push({
          id: `cr-${cr.id}`,
          rawId: cr.id,
          sourceType: 'CLIENT_REQUEST',
          categoryType: 'CLIENT',
          title: cr.title || '고객사 요청',
          typeLabel: subLabel,
          clientName: cr.clientName || '',
          createdAt: cr.createdAt || cr.requestDate || '',
          date: cr.desiredDate || cr.requestDate || (cr.createdAt ? cr.createdAt.slice(0, 10) : ''),
          dateLabel: cr.desiredDate ? `~ ${cr.desiredDate}` : (cr.requestDate ? `요청 ${cr.requestDate}` : ''),
          priority: cr.priority || 'NORMAL',
          priorityLabel: cr.priority === 'URGENT' ? '긴급' : cr.priority === 'HIGH' ? '높음' : '보통',
          description: cr.content || '',
          assignedTaskIds: myAssignedTasks.map(at => at.id),
          isDone,
          canDelete: false,
          rawItem: cr
        });
      }
    });

    // 2. 시간순 / 마감순 / 사용자 지정 드래그 순서 정렬
    items.sort((a, b) => {
      // 전체 탭인 경우 미완료 항목을 상단에 우선 배치
      if (activeTab === 'ALL' && a.isDone !== b.isDone) {
        return a.isDone ? 1 : -1;
      }

      if (sortBy === 'CUSTOM') {
        const idxA = customOrder.indexOf(a.id);
        const idxB = customOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        const timeA = a.createdAt || a.date || '';
        const timeB = b.createdAt || b.date || '';
        if (timeA && timeB && timeA !== timeB) return timeB.localeCompare(timeA);
      } else if (sortBy === 'DATE_DESC') {
        // 최신 등록순 (시간순)
        const timeA = a.createdAt || a.date || '';
        const timeB = b.createdAt || b.date || '';
        if (timeA && timeB && timeA !== timeB) return timeB.localeCompare(timeA);
      } else if (sortBy === 'DATE_ASC') {
        // 오래된순 (시간순)
        const timeA = a.createdAt || a.date || '';
        const timeB = b.createdAt || b.date || '';
        if (timeA && timeB && timeA !== timeB) return timeA.localeCompare(timeB);
      } else if (sortBy === 'DUE_ASC') {
        // 마감 임박순
        const dueA = a.date || '9999-99-99';
        const dueB = b.date || '9999-99-99';
        if (dueA !== dueB) return dueA.localeCompare(dueB);
      }

      return a.title.localeCompare(b.title);
    });

    return items;
  }, [user, tasks, clientRequests, statusOverrides, activeTab, sortBy, customOrder]);

  // 진행 중 / 완료 실시간 건수
  const inProgressCount = useMemo(() => aggregatedItems.filter(item => !item.isDone).length, [aggregatedItems]);
  const doneCount = useMemo(() => aggregatedItems.filter(item => item.isDone).length, [aggregatedItems]);

  // 날짜 단순 포맷팅 (순수 날짜 표기, "얼마 남음" 등 상대 시간 일체 배제)
  const formatSimpleDate = (dateStr) => {
    if (!dateStr) return '';
    const clean = dateStr.slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
    }
    return clean;
  };

  // 달력 불릿 표시용 날짜 목록
  const currentTaskDates = useMemo(() => {
    return aggregatedItems
      .map(item => (item.date || '').slice(0, 10))
      .filter(Boolean);
  }, [aggregatedItems]);

  // 3. 상태 탭, 구분 필터, 검색어 및 날짜 필터링
  const filteredItems = useMemo(() => {
    let list = aggregatedItems;

    // (1) 상태 탭 필터: 진행 중 / 완료 / 전체
    if (activeTab === 'IN_PROGRESS') {
      list = list.filter(item => !item.isDone);
    } else if (activeTab === 'DONE') {
      list = list.filter(item => item.isDone);
    }

    // (2) 구분 필터: 전체 / 프로젝트 / 고객사 요청 / 직접 등록
    if (typeFilter !== 'ALL') {
      list = list.filter(item => item.categoryType === typeFilter);
    }

    // (3) 일자 필터
    if (selectedDate) {
      list = list.filter(item => (item.date || item.createdAt || '').slice(0, 10) === selectedDate);
    }

    // (4) 검색어 필터
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      list = list.filter(item => {
        return (
          (item.title && item.title.toLowerCase().includes(query)) ||
          (item.typeLabel && item.typeLabel.toLowerCase().includes(query)) ||
          (item.clientName && item.clientName.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          (item.date && item.date.toLowerCase().includes(query))
        );
      });
    }

    return list;
  }, [aggregatedItems, activeTab, typeFilter, selectedDate, searchTerm]);

  const hasActiveFilter = Boolean(searchTerm || selectedDate || typeFilter !== 'ALL' || sortBy !== 'DATE_DESC');

  // Handle status toggle (checkbox click)
  const handleToggleItem = async (item) => {
    const nextStatus = !item.isDone;
    // Optimistic UI update
    setStatusOverrides(prev => ({ ...prev, [item.id]: nextStatus }));

    try {
      if (item.sourceType === 'TASK') {
        const res = await fetch(`/api/tasks/${item.rawId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus ? 'DONE' : 'IN_PROGRESS' })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || '상태 변경 실패');
      } else if (item.sourceType === 'CLIENT_REQUEST') {
        if (Array.isArray(item.assignedTaskIds) && item.assignedTaskIds.length > 0) {
          await Promise.all(
            item.assignedTaskIds.map(taskId =>
              fetch(`/api/client-requests/${item.rawId}/tasks/${taskId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: nextStatus ? 'COMPLETED' : 'IN_PROGRESS',
                  actorId: user.id,
                  actorName: user.name
                })
              })
            )
          );
        }
        await fetch(`/api/client-requests/${item.rawId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: nextStatus ? 'DONE' : 'IN_PROGRESS',
            actorId: user.id,
            actorName: user.name
          })
        });
      }

      if (onShowToast) {
        onShowToast(
          nextStatus ? '업무 완료 처리' : '업무 진행 재개',
          `'${item.title}' 상태가 변경되었습니다.`,
          'success'
        );
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      // Revert optimistic update on failure
      setStatusOverrides(prev => ({ ...prev, [item.id]: !nextStatus }));
      if (onShowToast) {
        onShowToast('오류', '업무 상태 변경에 실패했습니다.', 'danger');
      }
    }
  };

  // Open & Close Handlers for Registration Drawer
  const handleOpenNewDrawer = () => {
    setNewForm({
      title: '',
      description: '',
      priority: 'NORMAL',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10)
    });
    setShowNewDrawer(true);
  };

  const handleCloseNewDrawer = () => {
    if (isNewDrawerClosing) return;
    setIsNewDrawerClosing(true);
    setTimeout(() => {
      setShowNewDrawer(false);
      setIsNewDrawerClosing(false);
    }, 220);
  };

  // Open & Close Handlers for Detail Drawer
  const handleOpenDetail = (item) => {
    setSelectedItem(item);
  };

  // Handle direct navigation to source (고객사 요청 / 프로젝트 / 직접 등록 상세 드로어)
  const handleItemNavigation = (item, e) => {
    if (e) e.stopPropagation();
    if (item.sourceType === 'CLIENT_REQUEST' && onNavigateItem) {
      onNavigateItem(item);
    } else if (item.sourceType === 'TASK' && !item.isDirectTask && onNavigateItem) {
      onNavigateItem(item);
    } else {
      handleOpenDetail(item);
    }
  };

  const handleCloseDetail = () => {
    if (isDetailClosing) return;
    setIsDetailClosing(true);
    setTimeout(() => {
      setSelectedItem(null);
      setIsDetailClosing(false);
    }, 220);
  };

  // Handle direct task creation
  const handleCreateTask = async (e) => {
    if (e) e.preventDefault();
    if (!newForm.title.trim()) {
      alert('업무명을 입력해주세요.');
      return;
    }
    if (!newForm.dueDate) {
      alert('마감일을 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: newForm.title.trim(),
        description: newForm.description.trim(),
        assigneeId: user.id,
        assigneeName: user.name,
        dept: user.dept || '일반',
        priority: newForm.priority,
        status: 'TODO',
        startDate: newForm.startDate || newForm.dueDate,
        dueDate: newForm.dueDate,
        authorId: user.id,
        isDirectTask: true,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      if (onAddTask) {
        const success = await onAddTask(payload);
        if (success) {
          handleCloseNewDrawer();
          if (onRefresh) onRefresh();
        }
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          handleCloseNewDrawer();
          if (onShowToast) onShowToast('업무 등록 완료', `'${payload.title}' 업무가 등록되었습니다.`, 'success');
          if (onRefresh) onRefresh();
        } else {
          alert(data.message || '업무 등록에 실패했습니다.');
        }
      }
    } catch (err) {
      alert('업무 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle direct task deletion
  const handleDeleteTask = async (item, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`'${item.title}' 업무를 삭제하시겠습니까?`)) return;

    try {
      if (item.sourceType === 'TASK') {
        const res = await fetch(`/api/tasks/${item.rawId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          if (selectedItem && selectedItem.id === item.id) {
            handleCloseDetail();
          }
          if (onShowToast) onShowToast('삭제 완료', '업무가 삭제되었습니다.', 'info');
          if (onRefresh) onRefresh();
        } else {
          alert('삭제에 실패했습니다.');
        }
      }
    } catch (err) {
      alert('삭제 중 통신 오류가 발생했습니다.');
    }
  };

  // Quick inline task creation (투두 리스트 간편 등록)
  const handleQuickAdd = async (e) => {
    if (e && e.key && e.key !== 'Enter') return;
    if (e && e.preventDefault) e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;

    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      title,
      description: '',
      assigneeId: user.id,
      assigneeName: user.name,
      dept: user.dept || '일반',
      priority: 'NORMAL',
      status: 'TODO',
      startDate: today,
      dueDate: today,
      authorId: user.id,
      isDirectTask: true,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    try {
      if (onAddTask) {
        await onAddTask(payload);
      } else {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setQuickTitle('');
      if (onRefresh) onRefresh();
      if (onShowToast) onShowToast('업무 추가 완료', `'${title}' 업무가 등록되었습니다.`, 'success');
    } catch (err) {
      alert('업무 등록 중 오류가 발생했습니다.');
    }
  };

  // Drag and Drop Handlers for Reordering
  const handleDragStart = (e, item) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    setDraggedItemId(item.id);
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedItemId && draggedItemId !== item.id && dragOverItemId !== item.id) {
      setDragOverItemId(item.id);
    }
  };

  const handleDragLeave = (e, item) => {
    if (dragOverItemId === item.id) {
      setDragOverItemId(null);
    }
  };

  const handleDrop = (e, targetItem) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetItem.id) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    const currentListIds = filteredItems.map(it => it.id);
    const fromIdx = currentListIds.indexOf(draggedItemId);
    const toIdx = currentListIds.indexOf(targetItem.id);

    if (fromIdx !== -1 && toIdx !== -1) {
      const newVisibleList = [...currentListIds];
      const [moved] = newVisibleList.splice(fromIdx, 1);
      newVisibleList.splice(toIdx, 0, moved);

      const allKnownIds = aggregatedItems.map(it => it.id);
      const remainingIds = allKnownIds.filter(id => !newVisibleList.includes(id));
      const fullOrder = [...newVisibleList, ...remainingIds];

      setCustomOrder(fullOrder);
      try {
        localStorage.setItem(`onedesk_tasks_order_${user?.id || 'default'}`, JSON.stringify(fullOrder));
      } catch (err) {
        console.error(err);
      }
      setSortBy('CUSTOM');
    }

    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  return (
    <div style={{ width: '100%', paddingBottom: '3.5rem' }}>
      {/* Title Header - Rule 3: Strictly NO Descriptive Subtitles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 400, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          업무 목록
        </h2>
      </div>

      {/* Toolbar: Status Sub-tabs (Left) + Unified Minimal Icon Toolbar (Right) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '0',
        position: 'relative',
        zIndex: 20
      }}>
        {/* Left Status Sub-tabs: 진행 중 (기본) | 완료 | 전체 - Rule: 탭에 숫자 표기 일체 배제 */}
        <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', marginBottom: '-1px' }}>
          <button
            type="button"
            className={`tab-btn tab-btn-lg ${activeTab === 'IN_PROGRESS' ? 'active' : ''}`}
            onClick={() => setActiveTab('IN_PROGRESS')}
          >
            진행 중
          </button>
          <button
            type="button"
            className={`tab-btn tab-btn-lg ${activeTab === 'DONE' ? 'active' : ''}`}
            onClick={() => setActiveTab('DONE')}
          >
            완료
          </button>
          <button
            type="button"
            className={`tab-btn tab-btn-lg ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            전체
          </button>
        </div>

        {/* Right: Unified Minimal Icon Toolbar (Search + Filter Popover + Sort Popover + Date Picker + Reset + Plus) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.4rem' }}>
          {/* 1. 검색 아이콘 버튼 (전폭 리본 바 토글) */}
          <button
            type="button"
            onClick={() => {
              const nextOpen = !isSearchOpen;
              setIsSearchOpen(nextOpen);
              if (nextOpen) {
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }
            }}
            title="검색 (전폭 검색 바 토글)"
            aria-label="검색"
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: (isSearchOpen || searchTerm) ? 'var(--text-primary)' : 'var(--text-muted)',
              opacity: (isSearchOpen || searchTerm) ? 1 : 0.45,
              outline: 'none',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = (isSearchOpen || searchTerm) ? 'var(--text-primary)' : 'var(--text-muted)';
              e.currentTarget.style.opacity = (isSearchOpen || searchTerm) ? 1 : 0.45;
            }}
          >
            <Search size={22} strokeWidth={2} />
          </button>

          {/* 2. 구분 필터 아이콘 버튼 (Filter + Popover Menu) */}
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              title={`구분 필터: ${
                typeFilter === 'ALL' ? '전체' :
                typeFilter === 'PROJECT' ? '프로젝트' :
                typeFilter === 'CLIENT' ? '고객사 요청' : '직접 등록'
              }`}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (typeFilter !== 'ALL' || isFilterOpen) ? 'var(--text-primary)' : 'var(--text-muted)',
                opacity: (typeFilter !== 'ALL' || isFilterOpen) ? 1 : 0.45,
                outline: 'none',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = (typeFilter !== 'ALL' || isFilterOpen) ? 'var(--text-primary)' : 'var(--text-muted)';
                e.currentTarget.style.opacity = (typeFilter !== 'ALL' || isFilterOpen) ? 1 : 0.45;
              }}
            >
              <Filter size={22} strokeWidth={2} />
            </button>

            {isFilterOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                minWidth: '150px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                {[
                  { id: 'ALL', label: '전체' },
                  { id: 'PROJECT', label: '프로젝트' },
                  { id: 'CLIENT', label: '고객사 요청' },
                  { id: 'DIRECT', label: '직접 등록' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTypeFilter(opt.id);
                      setIsFilterOpen(false);
                    }}
                    style={{
                      width: '100%',
                      background: typeFilter === opt.id ? 'var(--bg-hover)' : 'transparent',
                      border: 'none',
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '14.5px',
                      fontWeight: 400,
                      color: typeFilter === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      if (typeFilter !== opt.id) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={e => {
                      if (typeFilter !== opt.id) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{opt.label}</span>
                    {typeFilter === opt.id && <Check size={16} strokeWidth={2} color="var(--text-primary)" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. 정렬/시간순 아이콘 버튼 (ArrowUpDown + Popover Menu) */}
          <div ref={sortRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              title={`정렬: ${
                sortBy === 'CUSTOM' ? '사용자 지정 (드래그 순)' :
                sortBy === 'DATE_DESC' ? '최신순' :
                sortBy === 'DATE_ASC' ? '오래된순' : '마감 임박순'
              }`}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (sortBy !== 'CUSTOM' || isSortOpen) ? 'var(--text-primary)' : 'var(--text-muted)',
                opacity: (sortBy !== 'CUSTOM' || isSortOpen) ? 1 : 0.45,
                outline: 'none',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = (sortBy !== 'CUSTOM' || isSortOpen) ? 'var(--text-primary)' : 'var(--text-muted)';
                e.currentTarget.style.opacity = (sortBy !== 'CUSTOM' || isSortOpen) ? 1 : 0.45;
              }}
            >
              <ArrowUpDown size={22} strokeWidth={2} />
            </button>

            {isSortOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                minWidth: '180px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                {[
                  { id: 'CUSTOM', label: '사용자 지정 (드래그 순)' },
                  { id: 'DATE_DESC', label: '최신순' },
                  { id: 'DATE_ASC', label: '오래된순' },
                  { id: 'DUE_ASC', label: '마감 임박순' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.id);
                      setIsSortOpen(false);
                    }}
                    style={{
                      width: '100%',
                      background: sortBy === opt.id ? 'var(--bg-hover)' : 'transparent',
                      border: 'none',
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '14.5px',
                      fontWeight: 400,
                      color: sortBy === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      if (sortBy !== opt.id) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={e => {
                      if (sortBy !== opt.id) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.id && <Check size={16} strokeWidth={2} color="var(--text-primary)" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. 마감일 선택 달력 아이콘 */}
          <CustomDatePicker
            value={selectedDate}
            onChange={(val) => setSelectedDate(val)}
            requestDates={currentTaskDates}
            placeholder="일정 선택"
            iconOnly={true}
            align="right"
          />

          {/* 5. 필터 초기화 아이콘 */}
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedDate('');
              setTypeFilter('ALL');
              setSortBy('DATE_DESC');
            }}
            title="검색 및 필터 초기화"
            aria-label="초기화"
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: hasActiveFilter ? 'var(--text-primary)' : 'var(--text-muted)',
              opacity: hasActiveFilter ? 1 : 0.3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = hasActiveFilter ? 'var(--text-primary)' : 'var(--text-muted)';
              e.currentTarget.style.opacity = hasActiveFilter ? 1 : 0.3;
            }}
          >
            <RotateCcw size={22} strokeWidth={2} />
          </button>

          {/* 6. 신규 업무 등록 (+) 아이콘 버튼 - 우측 슬라이드 드로어 오픈 */}
          <button
            type="button"
            onClick={handleOpenNewDrawer}
            title="신규 업무 등록"
            aria-label="신규 업무 등록"
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
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            <Plus size={22} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Full-Width Search Ribbon Bar */}
      <div
        style={{
          height: isSearchOpen ? '84px' : '0px',
          opacity: isSearchOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'height 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease',
          marginBottom: isSearchOpen ? '1rem' : '0',
          pointerEvents: isSearchOpen ? 'auto' : 'none',
          willChange: 'height, opacity'
        }}
      >
        <div
          style={{
            height: '84px',
            padding: '0 2rem',
            backgroundColor: 'var(--bg-card, #141417)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1 }}>
            <Search size={22} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="업무명 또는 내용 검색"
              tabIndex={isSearchOpen ? 0 : -1}
              style={{
                width: '100%',
                height: '48px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '16px',
                color: 'var(--text-primary)',
                padding: '0 4px',
                fontWeight: 400
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsSearchOpen(false);
                  setSearchTerm('');
                }
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {searchTerm.trim() && (
              <span style={{ fontSize: '15px', color: 'var(--text-muted)', whiteSpace: 'nowrap', userSelect: 'none', fontWeight: 400 }}>
                {filteredItems.length}건
              </span>
            )}
            <button
              type="button"
              tabIndex={isSearchOpen ? 0 : -1}
              onClick={() => {
                setIsSearchOpen(false);
                setSearchTerm('');
              }}
              title="닫기"
              aria-label="닫기"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                outline: 'none',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Bar (투두 리스트 간편 등록) */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '0.85rem 1.25rem',
        marginTop: isSearchOpen ? '0' : '1.25rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        transition: 'border-color 0.2s ease'
      }}>
        <Plus size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={handleQuickAdd}
          placeholder="새로운 업무를 입력하고 Enter를 누르세요..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '16.5px',
            color: 'var(--text-primary)',
            fontWeight: 400
          }}
        />
        {quickTitle.trim() && (
          <button
            type="button"
            onClick={handleQuickAdd}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px 8px',
              fontWeight: 400
            }}
          >
            등록
          </button>
        )}
      </div>

      {/* Unified Structured Task List Table (명확한 컬럼 헤더 및 칼각 수직 정렬) */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
        marginTop: '0.5rem'
      }}>
        {/* Column Header Row (뭐하는 페이지인지와 각 열의 의미를 직관적으로 전달) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.9rem 1.4rem',
          backgroundColor: 'var(--bg-hover)',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '14.5px',
          color: 'var(--text-secondary)',
          fontWeight: 400
        }}>
          {/* Grip spacer */}
          <div style={{ width: '28px', flexShrink: 0 }}></div>
          {/* Content Header */}
          <div style={{ flex: 1, minWidth: 0, paddingLeft: '0.5rem' }}>
            고객사 / 업무 내용
          </div>
          {/* Due date header */}
          <div style={{ width: '110px', textAlign: 'center', flexShrink: 0 }}>
            마감일
          </div>
          {/* Navigation link header */}
          <div style={{ width: '130px', textAlign: 'center', flexShrink: 0 }}>
            화면 이동
          </div>
          {/* Completed checkbox header */}
          <div style={{ width: '70px', textAlign: 'center', flexShrink: 0 }}>
            완료
          </div>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 ? (
          <div style={{
            padding: '4.5rem 1.5rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '15.5px',
            fontWeight: 400
          }}>
            {searchTerm
              ? '검색 결과가 없습니다.'
              : selectedDate
              ? `${selectedDate}에 해당하는 업무가 없습니다.`
              : typeFilter !== 'ALL'
              ? '선택된 구분에 해당하는 업무가 없습니다.'
              : activeTab === 'IN_PROGRESS'
              ? '진행 중인 업무가 없습니다.'
              : activeTab === 'DONE'
              ? '완료된 업무가 없습니다.'
              : '등록된 업무가 없습니다.'}
          </div>
        ) : (
          <div>
            {filteredItems.map((item, idx) => {
              const companyName = item.clientName || '사내 업무';
              const dateDisplay = formatSimpleDate(item.date);
              const isDragging = draggedItemId === item.id;
              const isOver = dragOverItemId === item.id;
              const isLast = idx === filteredItems.length - 1;

              return (
                <div
                  key={item.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={(e) => handleDragOver(e, item)}
                  onDragLeave={(e) => handleDragLeave(e, item)}
                  onDrop={(e) => handleDrop(e, item)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.15rem 1.4rem',
                    borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    cursor: isDragging ? 'grabbing' : 'default',
                    opacity: isDragging ? 0.35 : (item.isDone ? 0.55 : 1),
                    boxShadow: isOver ? 'inset 0 2px 0 0 var(--text-primary)' : 'none',
                    transition: 'background-color 0.15s ease, opacity 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (dragOverItemId !== item.id) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card-hover, var(--bg-hover))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (dragOverItemId !== item.id) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                    }
                  }}
                >
                  {/* Reordering Grip Handle */}
                  <div
                    style={{
                      width: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      cursor: 'grab',
                      flexShrink: 0,
                      opacity: 0.5,
                      transition: 'opacity 0.15s ease'
                    }}
                    title="드래그하여 순서 변경"
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
                  >
                    <GripVertical size={18} strokeWidth={1.8} />
                  </div>

                  {/* Left: Two Lines (Line 1: 고객사명 · 구분, Line 2: 업무 내용) */}
                  <div style={{
                    flex: 1,
                    minWidth: 0,
                    paddingLeft: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px'
                  }}>
                    {/* Line 1: 고객사명 (17px) · 업무 구분 (14px) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{
                        fontSize: '17px',
                        color: item.isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                        fontWeight: 400,
                        letterSpacing: '-0.01em'
                      }}>
                        {companyName}
                      </span>
                      <span style={{ color: 'var(--border-color)', opacity: 0.6, fontSize: '13px' }}>·</span>
                      <span style={{
                        fontSize: '14px',
                        color: 'var(--text-muted)',
                        fontWeight: 400
                      }}>
                        {item.typeLabel}
                      </span>
                    </div>

                    {/* Line 2: 업무 내용 (16px) */}
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 400,
                      color: item.isDone ? 'var(--text-muted)' : 'var(--text-secondary)',
                      textDecoration: item.isDone ? 'line-through' : 'none',
                      lineHeight: 1.45,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.title}
                    </div>
                  </div>

                  {/* Column 3: 마감일 (110px 칼각 중앙 정렬) */}
                  <div style={{
                    width: '110px',
                    textAlign: 'center',
                    flexShrink: 0,
                    fontSize: '15.5px',
                    color: item.isDone ? 'var(--text-muted)' : 'var(--text-secondary)',
                    fontWeight: 400,
                    whiteSpace: 'nowrap'
                  }}>
                    {dateDisplay || '-'}
                  </div>

                  {/* Column 4: 화면 바로가기 (130px 칼각 중앙 정렬) */}
                  <div style={{
                    width: '130px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <button
                      type="button"
                      onClick={(e) => handleItemNavigation(item, e)}
                      title={
                        item.sourceType === 'CLIENT_REQUEST'
                          ? '해당 고객사 요청 화면으로 이동'
                          : item.sourceType === 'TASK' && !item.isDirectTask
                          ? '해당 프로젝트 관리 화면으로 이동'
                          : '업무 상세 정보 보기'
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '15px',
                        fontWeight: 400,
                        color: 'var(--text-secondary)',
                        outline: 'none',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <span>
                        {item.sourceType === 'CLIENT_REQUEST'
                          ? '요청 바로가기'
                          : item.sourceType === 'TASK' && !item.isDirectTask
                          ? '프로젝트 바로가기'
                          : '상세보기'}
                      </span>
                      <ArrowUpRight size={16} strokeWidth={1.8} />
                    </button>
                  </div>

                  {/* Column 5: 완료 체크박스 + 삭제 (70px 칼각 중앙 정렬) */}
                  <div style={{
                    width: '70px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    flexShrink: 0
                  }}>
                    <CustomCheckbox
                      checked={item.isDone}
                      onChange={() => handleToggleItem(item)}
                      size={21}
                    />
                    {item.canDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(item, e);
                        }}
                        title="삭제"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          outline: 'none',
                          transition: 'color 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger, #ef4444)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <Trash2 size={16} strokeWidth={1.8} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DRAWER: NEW TASK REGISTRATION (전사 표준 우측 슬라이드 드로어) */}
      {showNewDrawer && (
        <div
          className={`detail-backdrop ${isNewDrawerClosing ? 'closing' : ''}`}
          onClick={handleCloseNewDrawer}
        >
          <div
            className={`detail-slide-drawer drawer-md ${isNewDrawerClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
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
              <h3 style={{ fontSize: '20px', fontWeight: 400, margin: 0, color: 'var(--text-primary)' }}>
                신규 업무 등록
              </h3>
              <button
                type="button"
                onClick={handleCloseNewDrawer}
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
                  outline: 'none',
                  borderRadius: '4px'
                }}
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Drawer Form Body */}
            <div style={{ flex: 1, padding: '1.75rem 2.25rem 2.25rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>
              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1.75rem' }}>
                {/* Hero Title Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 400 }}>
                    업무명 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newForm.title}
                    onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                    placeholder="업무명을 입력하세요"
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '16px',
                      fontWeight: 400,
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--bg-input, var(--bg-card))',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '0 1rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Rows List */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  {/* 1. 담당자 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.15rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0 }}>
                      담당자
                    </span>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 400 }}>
                        {user.name}
                      </span>
                      <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 400 }}>
                        소속: <span style={{ color: 'var(--text-primary)' }}>{user.dept || '일반'}</span>
                      </span>
                    </div>
                  </div>

                  {/* 2. 우선순위 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.15rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0 }}>
                      우선순위
                    </span>
                    <div style={{ flex: 1 }}>
                      <select
                        className="form-control"
                        value={newForm.priority}
                        onChange={(e) => setNewForm({ ...newForm, priority: e.target.value })}
                        style={{
                          width: '100%',
                          height: '42px',
                          fontSize: '15px',
                          fontWeight: 400,
                          backgroundColor: 'var(--bg-input, var(--bg-card))',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="URGENT">긴급</option>
                        <option value="HIGH">높음</option>
                        <option value="NORMAL">보통</option>
                        <option value="LOW">낮음</option>
                      </select>
                    </div>
                  </div>

                  {/* 3. 시작일 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.15rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0 }}>
                      시작일
                    </span>
                    <div style={{ flex: 1 }}>
                      <CustomDatePicker
                        value={newForm.startDate}
                        onChange={(d) => setNewForm({ ...newForm, startDate: d })}
                        placeholder="시작일 선택"
                        width="100%"
                        height="42px"
                      />
                    </div>
                  </div>

                  {/* 4. 마감일 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.15rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0 }}>
                      마감일 <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                    <div style={{ flex: 1 }}>
                      <CustomDatePicker
                        value={newForm.dueDate}
                        onChange={(d) => setNewForm({ ...newForm, dueDate: d })}
                        placeholder="마감일 선택"
                        width="100%"
                        height="42px"
                        align="right"
                      />
                    </div>
                  </div>

                  {/* 5. 상세 내용 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1.25rem 0',
                    gap: '0.65rem'
                  }}>
                    <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                      상세 내용
                    </span>
                    <textarea
                      className="form-control"
                      rows={6}
                      value={newForm.description}
                      onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                      placeholder="업무 목표, 진행 방식 및 상세 내용을 작성하세요"
                      style={{
                        fontSize: '15px',
                        fontWeight: 400,
                        backgroundColor: 'var(--bg-input, var(--bg-card))',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: '4px',
                        padding: '0.85rem 1rem',
                        lineHeight: 1.6,
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>

                {/* Bottom Actions: Full-width stacked buttons matching standard drawers */}
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
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '16px',
                      fontWeight: 400,
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {isSubmitting ? '등록 중...' : '업무 등록'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseNewDrawer}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '16px',
                      fontWeight: 400,
                      borderRadius: '4px',
                      cursor: 'pointer'
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

      {/* DRAWER: DETAIL VIEW (전사 표준 우측 슬라이드 드로어) */}
      {selectedItem && (
        <div
          className={`detail-backdrop ${isDetailClosing ? 'closing' : ''}`}
          onClick={handleCloseDetail}
        >
          <div
            className={`detail-slide-drawer drawer-md ${isDetailClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {/* Detail Drawer Header */}
            <div style={{
              padding: '1.75rem 2.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <div style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                {selectedItem.typeLabel}
              </div>
              <button
                type="button"
                onClick={handleCloseDetail}
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
                  outline: 'none',
                  borderRadius: '4px'
                }}
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Detail Drawer Body */}
            <div style={{ flex: 1, padding: '2rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
              {/* Title & Checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ marginTop: '4px' }}>
                  <CustomCheckbox
                    checked={selectedItem.isDone}
                    onChange={() => {
                      handleToggleItem(selectedItem);
                      setSelectedItem(prev => ({ ...prev, isDone: !prev.isDone }));
                    }}
                  />
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 400,
                  color: selectedItem.isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: selectedItem.isDone ? 'line-through' : 'none',
                  lineHeight: '1.4'
                }}>
                  {selectedItem.title}
                </div>
              </div>

              {/* Rows List */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                borderTop: '1px solid var(--border-color)'
              }}>
                {selectedItem.clientName && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.15rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>고객사</span>
                    <span style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 400 }}>{selectedItem.clientName}</span>
                  </div>
                )}

                {selectedItem.dateLabel && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.15rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>마감일</span>
                    <span style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 400 }}>{selectedItem.dateLabel}</span>
                  </div>
                )}

                {selectedItem.createdAt && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.15rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>등록일</span>
                    <span style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 400 }}>{selectedItem.createdAt}</span>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1.15rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1.5rem'
                }}>
                  <span style={{ width: '100px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>상태</span>
                  <span style={{ fontSize: '15px', color: selectedItem.isDone ? 'var(--text-muted)' : 'var(--primary)', fontWeight: 400 }}>
                    {selectedItem.isDone ? '완료' : '진행 중'}
                  </span>
                </div>

                {selectedItem.priorityLabel && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.15rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 400 }}>우선순위</span>
                    <span style={{ fontSize: '15px', color: selectedItem.priority === 'URGENT' ? 'var(--danger, #ef4444)' : 'var(--text-primary)', fontWeight: 400 }}>
                      {selectedItem.priorityLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Description Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                  상세 내용
                </div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap',
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  minHeight: '120px',
                  backgroundColor: 'var(--bg-input, var(--bg-card))'
                }}>
                  {selectedItem.description || '등록된 상세 설명이 없습니다.'}
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                marginTop: 'auto',
                paddingTop: '1.5rem',
                width: '100%'
              }}>
                {(selectedItem.sourceType === 'CLIENT_REQUEST' || (selectedItem.sourceType === 'TASK' && !selectedItem.isDirectTask)) && onNavigateItem && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const item = selectedItem;
                      handleCloseDetail();
                      onNavigateItem(item);
                    }}
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '15.5px',
                      fontWeight: 400,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>
                      {selectedItem.sourceType === 'CLIENT_REQUEST'
                        ? '고객사 요청 화면으로 이동'
                        : '프로젝트 관리 화면으로 이동'}
                    </span>
                    <ChevronRight size={16} strokeWidth={1.8} />
                  </button>
                )}
                <button
                  type="button"
                  className={selectedItem.isDone ? "btn btn-secondary" : "btn btn-primary"}
                  onClick={() => {
                    handleToggleItem(selectedItem);
                    setSelectedItem(prev => ({ ...prev, isDone: !prev.isDone }));
                  }}
                  style={{
                    width: '100%',
                    height: '46px',
                    fontSize: '16px',
                    fontWeight: 400,
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {selectedItem.isDone ? '진행 중으로 변경' : '업무 완료 처리'}
                </button>

                {selectedItem.canDelete && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={(e) => handleDeleteTask(selectedItem, e)}
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '16px',
                      fontWeight: 400,
                      borderRadius: '4px',
                      color: 'var(--danger, #ef4444)',
                      borderColor: 'var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    업무 삭제
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseDetail}
                  style={{
                    width: '100%',
                    height: '46px',
                    fontSize: '16px',
                    fontWeight: 400,
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
