import React, { useState, useRef } from 'react';
import { Search, RotateCcw, X, Plus, ChevronRight, ArrowLeft } from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';

export default function TaskBoard({ 
  user, 
  tasks = [], 
  employees = [], 
  onAddTask, 
  onUpdateTaskStatus, 
  onShowToast,
  onRefresh 
}) {
  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'DETAIL'
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // New Task Slide Drawer State
  const [showNewDrawer, setShowNewDrawer] = useState(false);
  const [isNewDrawerClosing, setIsNewDrawerClosing] = useState(false);

  // Filters (List View)
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  // New Task Form
  const [newForm, setNewForm] = useState({
    title: '',
    description: '',
    assigneeId: user.id,
    assigneeName: user.name,
    dept: user.dept || '개발1팀',
    priority: 'HIGH',
    status: 'TODO',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10)
  });

  // Edit Task Form
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    assigneeName: '',
    dept: '',
    priority: 'HIGH',
    status: 'TODO',
    startDate: '',
    dueDate: ''
  });

  // Drawer Handlers
  const handleOpenNewDrawer = () => {
    setNewForm({
      title: '',
      description: '',
      assigneeId: user.id,
      assigneeName: user.name,
      dept: user.dept || '개발1팀',
      priority: 'HIGH',
      status: 'TODO',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10)
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

  // Detail View Navigation Handlers
  const handleOpenDetail = (task) => {
    setSelectedTaskId(task.id);
    setIsEditing(false);
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      assigneeId: task.assigneeId || user.id,
      assigneeName: task.assigneeName || user.name,
      dept: task.dept || user.dept || '',
      priority: task.priority || 'HIGH',
      status: task.status || 'TODO',
      startDate: task.startDate || '',
      dueDate: task.dueDate || ''
    });
    setViewMode('DETAIL');
  };

  const handleBackToList = () => {
    setViewMode('LIST');
    setSelectedTaskId(null);
    setIsEditing(false);
  };

  // Helper Labels & Colors (Strictly Pure Typography, Zero Badges, Zero Brackets)
  const getPriorityText = (p) => {
    switch (p) {
      case 'URGENT': return <span style={{ color: '#ef4444', fontWeight: 400 }}>긴급</span>;
      case 'HIGH': return <span style={{ color: '#f59e0b', fontWeight: 400 }}>높음</span>;
      case 'MEDIUM': return <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>보통</span>;
      case 'LOW': return <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>낮음</span>;
      default: return <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>보통</span>;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'TODO': return '할 일';
      case 'IN_PROGRESS': return '진행 중';
      case 'DONE': return '작업 완료';
      default: return status || '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'TODO': return 'var(--text-secondary)';
      case 'IN_PROGRESS': return '#3b82f6';
      case 'DONE': return 'var(--text-muted)';
      default: return 'var(--text-primary)';
    }
  };

  // Handle New Task Submit
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newForm.title.trim()) {
      alert('프로젝트 또는 업무명을 입력하세요.');
      return;
    }

    const assignedEmp = employees.find(emp => emp.id === newForm.assigneeId);
    const taskPayload = {
      ...newForm,
      assigneeName: assignedEmp ? assignedEmp.name : newForm.assigneeName,
      dept: assignedEmp ? assignedEmp.dept : newForm.dept
    };

    if (onAddTask) {
      await onAddTask(taskPayload);
    }
    if (onShowToast) {
      onShowToast('프로젝트 등록 완료', '프로젝트가 성공적으로 등록되었습니다.', 'success');
    }
    handleCloseNewDrawer();
    if (onRefresh) onRefresh();
  };

  // Handle Edit Task Submit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const currentTask = tasks.find(t => t.id === selectedTaskId);
    if (!currentTask || !editForm.title.trim()) {
      alert('업무명을 입력하세요.');
      return;
    }

    const assignedEmp = employees.find(emp => emp.id === editForm.assigneeId);
    const updatedPayload = {
      ...editForm,
      assigneeName: assignedEmp ? assignedEmp.name : editForm.assigneeName,
      dept: assignedEmp ? assignedEmp.dept : editForm.dept
    };

    try {
      const res = await fetch(`/api/tasks/${currentTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        if (onShowToast) onShowToast('프로젝트 수정 완료', '성공적으로 수정되었습니다.', 'success');
        if (onRefresh) onRefresh();
      } else {
        alert(data.message || '수정에 실패했습니다.');
      }
    } catch (err) {
      alert('통신 오류가 발생했습니다.');
    }
  };

  // Handle Delete Task
  const handleDeleteTask = async () => {
    const currentTask = tasks.find(t => t.id === selectedTaskId);
    if (!currentTask) return;
    if (!window.confirm(`'${currentTask.title}' 프로젝트를 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/tasks/${currentTask.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        handleBackToList();
        if (onShowToast) onShowToast('프로젝트 삭제 완료', '삭제되었습니다.', 'info');
        if (onRefresh) onRefresh();
      } else {
        alert('삭제 실패');
      }
    } catch (err) {
      alert('삭제 중 통신 오류가 발생했습니다.');
    }
  };

  // Quick Status Change from Detail View
  const handleStatusChange = async (newStatus) => {
    const currentTask = tasks.find(t => t.id === selectedTaskId);
    if (!currentTask) return;
    if (onUpdateTaskStatus) {
      await onUpdateTaskStatus(currentTask.id, newStatus);
    }
    setEditForm(prev => ({ ...prev, status: newStatus }));
    if (onShowToast) onShowToast('상태 변경', `상태가 '${getStatusText(newStatus)}' 상태로 변경되었습니다.`);
    if (onRefresh) onRefresh();
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(t => {
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchSearch = !searchTerm.trim() ||
      (t.title && t.title.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
      (t.assigneeName && t.assigneeName.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
      (t.dept && t.dept.toLowerCase().includes(searchTerm.toLowerCase().trim()));
    const matchDate = !selectedDate || (t.dueDate === selectedDate || t.startDate === selectedDate);
    return matchStatus && matchSearch && matchDate;
  });

  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const currentTaskDates = tasks.map(t => t.dueDate || t.startDate).filter(Boolean);
  const hasActiveFilter = Boolean(searchTerm || selectedDate);

  // =========================================================================
  // VIEW 1: LIST VIEW (전사 통일된 서브탭, 아이콘 툴바, 심플 리스트 + 신규 등록 드로어)
  // =========================================================================
  if (viewMode === 'LIST') {
    return (
      <div>
        {/* Full-width Standard Toolbar: Sub-tabs (Left) + Search, Date, Reset & Plus Icon (Right) */}
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
          {/* Sub-tabs: 4단계 (전체 | 할 일 | 진행 중 | 작업 완료) - 전사 규칙: 괄호 및 숫자 일체 배제 */}
          <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', marginBottom: '-1px' }}>
            <button 
              type="button"
              className={`tab-btn tab-btn-lg ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('ALL'); setSearchTerm(''); setSelectedDate(''); }}
            >
              전체
            </button>
            <button 
              type="button"
              className={`tab-btn tab-btn-lg ${statusFilter === 'TODO' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('TODO'); setSearchTerm(''); setSelectedDate(''); }}
            >
              할 일
            </button>
            <button 
              type="button"
              className={`tab-btn tab-btn-lg ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('IN_PROGRESS'); setSearchTerm(''); setSelectedDate(''); }}
            >
              진행 중
            </button>
            <button 
              type="button"
              className={`tab-btn tab-btn-lg ${statusFilter === 'DONE' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('DONE'); setSearchTerm(''); setSelectedDate(''); }}
            >
              작업 완료
            </button>
          </div>

          {/* Right: Unified Minimal Icon Toolbar (Search + Date Picker + Reset + Plus) */}
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

            {/* 2. 마감일/시작일 선택 달력 아이콘 */}
            <CustomDatePicker 
              value={selectedDate}
              onChange={(val) => setSelectedDate(val)}
              requestDates={currentTaskDates}
              placeholder="일정 선택"
              iconOnly={true}
              align="right"
            />

            {/* 3. 필터 초기화 아이콘 */}
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedDate('');
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

            {/* 4. 신규 프로젝트 등록 (+) 아이콘 버튼 - 우측 슬라이드 드로어 오픈 */}
            <button 
              type="button"
              onClick={handleOpenNewDrawer}
              title="신규 프로젝트 등록"
              aria-label="신규 프로젝트 등록"
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

        {/* Full-Width Search Ribbon Bar (전사 통일된 하드웨어 가속 슬라이드) */}
        <div
          style={{
            height: isSearchOpen ? '84px' : '0px',
            opacity: isSearchOpen ? 1 : 0,
            overflow: 'hidden',
            transition: 'height 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease',
            marginBottom: isSearchOpen ? '1.5rem' : '0',
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
                placeholder="검색어 입력"
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
                  {filteredTasks.length}건
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
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  outline: 'none',
                  borderRadius: '4px',
                  transition: 'color 0.15s ease',
                  flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {/* Clean Project Simple List (답답한 다단 테이블 배제, 시원한 클릭 이동형 리스트) */}
        {filteredTasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '5rem 1.5rem',
            color: 'var(--text-muted)'
          }}>
            <p style={{ fontSize: '16px', fontWeight: 400 }}>
              {searchTerm || selectedDate ? '검색 조건과 일치하는 프로젝트가 없습니다.' : '등록된 프로젝트가 없습니다.'}
            </p>
            {(searchTerm || selectedDate) && (
              <button 
                type="button"
                className="btn btn-secondary btn-sm" 
                onClick={() => { setSearchTerm(''); setSelectedDate(''); }}
                style={{ marginTop: '0.85rem', borderRadius: 0 }}
              >
                필터 초기화
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredTasks.map((task, idx) => {
              const isLast = idx === filteredTasks.length - 1;
              return (
                <div
                  key={task.id}
                  onClick={() => handleOpenDetail(task)}
                  style={{
                    padding: '1.25rem 1rem',
                    borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '2rem',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Left: Status, Title, Priority, Description preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: 400, color: getStatusColor(task.status) }}>
                        {getStatusText(task.status)}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: 400,
                        color: task.status === 'DONE' ? 'var(--text-muted)' : 'var(--text-primary)',
                        letterSpacing: '-0.015em'
                      }}>
                        {task.title}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span style={{ fontSize: '15px', fontWeight: 400 }}>{getPriorityText(task.priority)}</span>
                    </div>

                    {task.description && (
                      <div style={{
                        fontSize: '14.5px',
                        color: 'var(--text-muted)',
                        fontWeight: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '850px'
                      }}>
                        {task.description}
                      </div>
                    )}
                  </div>

                  {/* Right: Assignee & Dept, Due Date & Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexShrink: 0 }}>
                    {/* Assignee & Dept */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '15px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                      <span>{task.assigneeName}</span>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span>{task.dept || '부서'}</span>
                    </div>

                    {/* Date */}
                    <div style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 400, minWidth: '110px', textAlign: 'right' }}>
                      {task.dueDate ? `~ ${task.dueDate}` : '-'}
                    </div>

                    {/* Chevron Right */}
                    <ChevronRight size={20} strokeWidth={1.8} color="var(--text-muted)" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DRAWER: NEW PROJECT REGISTRATION (전사 표준 우측 슬라이드 드로어) */}
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
                  신규 프로젝트 등록
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
                      프로젝트 / 업무명 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newForm.title}
                      onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                      placeholder="프로젝트 또는 업무명을 입력하세요"
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
                        <select
                          className="form-control"
                          value={newForm.assigneeId}
                          onChange={(e) => {
                            const emp = employees.find(m => m.id === e.target.value);
                            setNewForm({
                              ...newForm,
                              assigneeId: e.target.value,
                              assigneeName: emp ? emp.name : user.name,
                              dept: emp ? emp.dept : (user.dept || '개발1팀')
                            });
                          }}
                          style={{
                            flex: 1,
                            minWidth: '180px',
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
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} · {emp.dept}
                            </option>
                          ))}
                        </select>
                        <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 400 }}>
                          소속: <span style={{ color: 'var(--text-primary)' }}>{newForm.dept}</span>
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
                          <option value="MEDIUM">보통</option>
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
                        마감일
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
                        placeholder="프로젝트 목표, 진행 방식, 주요 마일스톤 등을 상세히 작성하세요"
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
                      style={{
                        width: '100%',
                        height: '46px',
                        fontSize: '16px',
                        fontWeight: 400,
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      프로젝트 등록
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCloseNewDrawer}
                      style={{
                        width: '100%',
                        height: '46px',
                        fontSize: '16px',
                        fontWeight: 400,
                        borderRadius: '4px',
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
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: PROJECT DETAIL PAGE (전용 상세 페이지 & 수정 화면)
  // =========================================================================
  if (viewMode === 'DETAIL') {
    if (!selectedTask) {
      return (
        <div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleBackToList}
            style={{ borderRadius: 0, height: '42px', fontSize: '15px', fontWeight: 400 }}
          >
            ← 프로젝트 목록
          </button>
        </div>
      );
    }

    return (
      <div style={{ paddingBottom: '4rem' }}>
        {/* Top Navigation & Action Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '2rem'
        }}>
          <button
            type="button"
            onClick={handleBackToList}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '15px',
              fontWeight: 400,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '6px 0',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ArrowLeft size={18} strokeWidth={2} />
            프로젝트 목록
          </button>

          {!isEditing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditing(true)}
                style={{ height: '42px', padding: '0 1.25rem', fontSize: '15px', fontWeight: 400, borderRadius: 0 }}
              >
                수정
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDeleteTask}
                style={{ height: '42px', padding: '0 1.25rem', fontSize: '15px', fontWeight: 400, borderRadius: 0, color: '#ef4444' }}
              >
                삭제
              </button>
            </div>
          )}
        </div>

        {/* View Mode vs Edit Mode */}
        {!isEditing ? (
          <div>
            {/* Meta Line & Quick Status Changer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '15px', fontWeight: 400 }}>
                <span style={{ color: getStatusColor(selectedTask.status) }}>
                  {getStatusText(selectedTask.status)}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span style={{ color: 'var(--text-secondary)' }}>{selectedTask.dept || '부서'}</span>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span style={{ color: 'var(--text-secondary)' }}>{selectedTask.assigneeName}</span>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span>{getPriorityText(selectedTask.priority)}</span>
              </div>

              {/* Quick Status Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginRight: '0.25rem' }}>상태 변경:</span>
                {['TODO', 'IN_PROGRESS', 'DONE'].map(st => {
                  const isCurrent = selectedTask.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleStatusChange(st)}
                      style={{
                        height: '34px',
                        padding: '0 0.85rem',
                        fontSize: '14px',
                        fontWeight: 400,
                        borderRadius: 0
                      }}
                    >
                      {getStatusText(st)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Big Project Title */}
            <h1 style={{
              fontSize: '24px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: '0 0 2rem 0',
              letterSpacing: '-0.02em',
              lineHeight: 1.4
            }}>
              {selectedTask.title}
            </h1>

            {/* Key Information Grid (Pure Typography, Zero Box, Zero Parentheses) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.5rem 2rem',
              padding: '1.75rem 0',
              borderTop: '1px solid var(--border-color)',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '2.5rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>담당자</span>
                <span style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 400 }}>
                  {selectedTask.assigneeName} · {selectedTask.dept || '부서'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>우선순위</span>
                <span style={{ fontSize: '16px', fontWeight: 400 }}>
                  {getPriorityText(selectedTask.priority)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>시작일</span>
                <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                  {selectedTask.startDate || '-'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>마감일</span>
                <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                  {selectedTask.dueDate || '-'}
                </span>
              </div>
            </div>

            {/* Description Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                상세 내용
              </div>
              <div style={{
                fontSize: '15.5px',
                lineHeight: 1.8,
                color: 'var(--text-primary)',
                fontWeight: 400,
                whiteSpace: 'pre-wrap',
                padding: '1.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: 0,
                minHeight: '160px'
              }}>
                {selectedTask.description || '등록된 상세 설명이 없습니다.'}
              </div>
            </div>
          </div>
        ) : (
          /* Inline Edit Mode */
          <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ fontSize: '20px', fontWeight: 400, color: 'var(--text-primary)' }}>
              프로젝트 정보 수정
            </div>

            {/* Title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text-primary)' }}>
                프로젝트 / 업무명 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                required
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                style={{ height: '48px', fontSize: '16px', fontWeight: 400, borderRadius: 0, padding: '0 1rem' }}
              />
            </div>

            {/* Assignee & Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text-primary)' }}>
                  담당자
                </label>
                <select
                  className="form-control"
                  value={editForm.assigneeId}
                  onChange={(e) => {
                    const emp = employees.find(m => m.id === e.target.value);
                    setEditForm({
                      ...editForm,
                      assigneeId: e.target.value,
                      assigneeName: emp ? emp.name : selectedTask.assigneeName,
                      dept: emp ? emp.dept : selectedTask.dept
                    });
                  }}
                  style={{ height: '48px', fontSize: '15.5px', fontWeight: 400, borderRadius: 0, padding: '0 1rem' }}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} · {emp.dept}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text-primary)' }}>
                  우선순위
                </label>
                <select
                  className="form-control"
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  style={{ height: '48px', fontSize: '15.5px', fontWeight: 400, borderRadius: 0, padding: '0 1rem' }}
                >
                  <option value="URGENT">긴급</option>
                  <option value="HIGH">높음</option>
                  <option value="MEDIUM">보통</option>
                  <option value="LOW">낮음</option>
                </select>
              </div>
            </div>

            {/* Start Date & Due Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text-primary)' }}>
                  시작일
                </label>
                <CustomDatePicker
                  value={editForm.startDate}
                  onChange={(d) => setEditForm({ ...editForm, startDate: d })}
                  placeholder="시작일 선택"
                  width="100%"
                  height="48px"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text-primary)' }}>
                  마감일
                </label>
                <CustomDatePicker
                  value={editForm.dueDate}
                  onChange={(d) => setEditForm({ ...editForm, dueDate: d })}
                  placeholder="마감일 선택"
                  width="100%"
                  height="48px"
                  align="right"
                />
              </div>
            </div>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text-primary)' }}>
                상세 내용
              </label>
              <textarea
                className="form-control"
                rows={7}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                style={{ fontSize: '15px', fontWeight: 400, borderRadius: 0, padding: '1rem', lineHeight: 1.6 }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ height: '48px', padding: '0 2rem', fontSize: '15px', fontWeight: 400, borderRadius: 0 }}
              >
                수정사항 저장
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditing(false)}
                style={{ height: '48px', padding: '0 1.5rem', fontSize: '15px', fontWeight: 400, borderRadius: 0 }}
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return null;
}
