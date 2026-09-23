import React, { useState } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE'
  const [selectedDate, setSelectedDate] = useState('');

  // Drawers
  const [showNewDrawer, setShowNewDrawer] = useState(false);
  const [isNewDrawerClosing, setIsNewDrawerClosing] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailClosing, setIsDetailClosing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  // Drawer Close Handlers with smooth slide-out animation
  const handleCloseNewDrawer = () => {
    if (isNewDrawerClosing) return;
    setIsNewDrawerClosing(true);
    setTimeout(() => {
      setShowNewDrawer(false);
      setIsNewDrawerClosing(false);
    }, 220);
  };

  const handleOpenDetail = (task) => {
    setSelectedTask(task);
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
    setIsDetailClosing(false);
  };

  const handleCloseDetail = () => {
    if (isDetailClosing) return;
    setIsDetailClosing(true);
    setTimeout(() => {
      setSelectedTask(null);
      setIsEditing(false);
      setIsDetailClosing(false);
    }, 220);
  };

  // Handle New Task Submit
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newForm.title.trim()) {
      alert('프로젝트 / 업무명을 입력하세요.');
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
    handleCloseNewDrawer();
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
    if (onRefresh) onRefresh();
  };

  // Handle Edit Task Submit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedTask || !editForm.title.trim()) {
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
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTask(data.task);
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
    if (!selectedTask) return;
    if (!window.confirm(`'${selectedTask.title}' 프로젝트를 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        handleCloseDetail();
        if (onShowToast) onShowToast('프로젝트 삭제 완료', '삭제되었습니다.', 'info');
        if (onRefresh) onRefresh();
      } else {
        alert('삭제 실패');
      }
    } catch (err) {
      alert('삭제 중 통신 오류가 발생했습니다.');
    }
  };

  // Quick Status Change from detail
  const handleStatusChange = async (newStatus) => {
    if (!selectedTask) return;
    if (onUpdateTaskStatus) {
      await onUpdateTaskStatus(selectedTask.id, newStatus);
    }
    setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
    setEditForm(prev => ({ ...prev, status: newStatus }));
    if (onShowToast) onShowToast('상태 변경', `상태가 [${getStatusText(newStatus)}]로 변경되었습니다.`);
    if (onRefresh) onRefresh();
  };

  // Helper labels
  const getPriorityText = (p) => {
    switch (p) {
      case 'URGENT': return <span style={{ color: '#ef4444', fontWeight: 600 }}>[긴급]</span>;
      case 'HIGH': return <span style={{ color: '#f59e0b', fontWeight: 600 }}>[높음]</span>;
      case 'MEDIUM': return <span style={{ color: 'var(--text-secondary)' }}>[보통]</span>;
      case 'LOW': return <span style={{ color: 'var(--text-muted)' }}>[낮음]</span>;
      default: return <span style={{ color: 'var(--text-secondary)' }}>[보통]</span>;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'TODO': return '할 일';
      case 'IN_PROGRESS': return '진행 중';
      case 'DONE': return '완료';
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

  return (
    <div>
      {/* Top Action Bar: Count, Search, Filter & New Project Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        {/* Left: Title & Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            프로젝트 목록
          </h3>
          <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            총 {filteredTasks.length}건
          </span>
        </div>

        {/* Right: Search, Status Filter & Register Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '130px', height: '42px', fontSize: '15px', borderRadius: 0 }}
          >
            <option value="ALL">전체 상태</option>
            <option value="TODO">할 일</option>
            <option value="IN_PROGRESS">진행 중</option>
            <option value="DONE">완료</option>
          </select>

          {/* Date Filter (마감일/시작일 검색) */}
          <CustomDatePicker
            value={selectedDate}
            onChange={(d) => setSelectedDate(d)}
            placeholder="마감일 검색"
            width="150px"
            height="42px"
          />

          {/* Search Input */}
          <input 
            type="text"
            placeholder="업무명 또는 담당자 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{ width: '220px', height: '42px', padding: '0 0.85rem', fontSize: '15px', borderRadius: 0 }}
          />

          {(searchTerm || selectedDate) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearchTerm(''); setSelectedDate(''); }}
              style={{ height: '42px', borderRadius: 0 }}
            >
              초기화
            </button>
          )}

          {/* Register Button - Opens Slide Drawer */}
          <button 
            type="button"
            className="btn btn-primary"
            onClick={() => setShowNewDrawer(true)}
            style={{ height: '42px', padding: '0 1.25rem', fontSize: '15px', fontWeight: 600, borderRadius: 0 }}
          >
            + 신규 프로젝트 등록
          </button>
        </div>
      </div>

      {/* Project Full-width List Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 0 }}>
        {/* Table Header: th는 가운데 정렬, 번호 영역 확대(88px), 좌우 0 패딩 */}
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
          <span style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>프로젝트 / 업무명</span>
          <span style={{ width: '150px', flexShrink: 0, textAlign: 'center' }}>담당자</span>
          <span style={{ width: '130px', flexShrink: 0, textAlign: 'center' }}>시작일</span>
          <span style={{ width: '130px', flexShrink: 0, textAlign: 'center' }}>마감일</span>
          <span style={{ width: '110px', flexShrink: 0, textAlign: 'center' }}>우선순위</span>
          <span style={{ width: '110px', flexShrink: 0, textAlign: 'center' }}>상태</span>
        </div>

        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '16px' }}>
              {searchTerm ? '검색 조건과 일치하는 프로젝트가 없습니다.' : '등록된 프로젝트가 없습니다.'}
            </p>
          </div>
        ) : (
          <div>
            {filteredTasks.map((task, idx) => {
              const isSelected = selectedTask && selectedTask.id === task.id;
              const isLast = idx === filteredTasks.length - 1;
              return (
                <div
                  key={task.id}
                  className="client-req-item"
                  onClick={() => handleOpenDetail(task)}
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
                  {/* 1. 번호 (88px 가운데 정렬) */}
                  <span style={{ width: '88px', flexShrink: 0, textAlign: 'center', fontSize: '15px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {filteredTasks.length - idx}
                  </span>

                  {/* 2. 업무 / 프로젝트명 (왼쪽 정렬 여백 유지) */}
                  <div style={{ flex: 1, minWidth: 0, padding: '0 1rem' }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: task.status === 'DONE' ? 'var(--text-muted)' : 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '0.2rem'
                      }}>
                        {task.description}
                      </div>
                    )}
                  </div>

                  {/* 3. 담당자 (150px 가운데 정렬) */}
                  <span style={{ width: '150px', flexShrink: 0, textAlign: 'center', fontSize: '15px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.assigneeName} {task.dept ? `(${task.dept})` : ''}
                  </span>

                  {/* 4. 시작일 */}
                  <span style={{ width: '130px', flexShrink: 0, textAlign: 'center', fontSize: '15px', color: task.startDate ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {task.startDate || '-'}
                  </span>

                  {/* 5. 마감일 */}
                  <span style={{ width: '130px', flexShrink: 0, textAlign: 'center', fontSize: '15px', color: task.dueDate ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {task.dueDate || '-'}
                  </span>

                  {/* 6. 우선순위 (순수 타이포그래피) */}
                  <span style={{ width: '110px', flexShrink: 0, textAlign: 'center', fontSize: '15px' }}>
                    {getPriorityText(task.priority)}
                  </span>

                  {/* 7. 상태 (순수 타이포그래피) */}
                  <span style={{
                    width: '110px',
                    flexShrink: 0,
                    textAlign: 'center',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: getStatusColor(task.status)
                  }}>
                    {getStatusText(task.status)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DRAWER 1: NEW PROJECT REGISTRATION (고객사 신규 등록 패널과 100% 동일한 우측 슬라이드 패널) */}
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
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
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
            <div style={{ flex: 1, padding: '1.75rem 2.25rem 2.25rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>
              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1.75rem' }}>
                {/* Hero Title Input */}
                <div>
                  <input
                    type="text"
                    required
                    value={newForm.title}
                    onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                    placeholder="프로젝트 또는 업무명을 입력하세요"
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
                      padding: 0
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
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      담당
                    </span>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
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
                          width: 'auto',
                          minWidth: '220px',
                          height: '40px',
                          fontSize: '15px',
                          backgroundColor: 'var(--bg-input, var(--bg-card))',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.dept})
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                        부서: <strong style={{ color: 'var(--text-primary)' }}>{newForm.dept}</strong>
                      </span>
                    </div>
                  </div>

                  {/* 2. 우선순위 (순수 텍스트와 도트 인디케이터) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      우선순위
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                      {[
                        { id: 'URGENT', label: '긴급', color: '#ef4444' },
                        { id: 'HIGH', label: '높음', color: '#f59e0b' },
                        { id: 'MEDIUM', label: '보통', color: '#3b82f6' },
                        { id: 'LOW', label: '낮음', color: '#94a3b8' }
                      ].map(p => {
                        const isSel = newForm.priority === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setNewForm({ ...newForm, priority: p.id })}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: 'none',
                              border: 'none',
                              fontSize: '16px',
                              fontWeight: isSel ? 700 : 500,
                              color: isSel ? 'var(--text-primary)' : 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px 0',
                              transition: 'color 0.15s ease'
                            }}
                          >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.color }} />
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. 상태 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      상태
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      {[
                        { id: 'TODO', label: '할 일' },
                        { id: 'IN_PROGRESS', label: '진행 중' },
                        { id: 'DONE', label: '완료' }
                      ].map(st => {
                        const isSel = newForm.status === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setNewForm({ ...newForm, status: st.id })}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '16px',
                              fontWeight: isSel ? 700 : 500,
                              color: isSel ? 'var(--text-primary)' : 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px 0',
                              transition: 'color 0.15s ease'
                            }}
                          >
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. 시작일 & 마감일 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      일정
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>시작</span>
                        <CustomDatePicker
                          value={newForm.startDate}
                          onChange={(d) => setNewForm({ ...newForm, startDate: d })}
                          placeholder="시작일 선택"
                          width="160px"
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>마감</span>
                        <CustomDatePicker
                          value={newForm.dueDate}
                          onChange={(d) => setNewForm({ ...newForm, dueDate: d })}
                          placeholder="마감일 선택"
                          width="160px"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. 상세 설명 */}
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
                      rows={4}
                      value={newForm.description}
                      onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                      placeholder="목표, 진행 방식, 참고 사항 등을 자세히 작성하세요"
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
                    프로젝트 등록 완료
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseNewDrawer}
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

      {/* DRAWER 2: PROJECT DETAIL & EDIT (고객사 상세 패널과 100% 동일한 우측 슬라이드 패널) */}
      {selectedTask && (
        <div
          className={`detail-backdrop ${isDetailClosing ? 'closing' : ''}`}
          onClick={handleCloseDetail}
        >
          <div
            className={`detail-slide-drawer ${isDetailClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {/* Detail Header */}
            <div style={{
              padding: '1.75rem 2rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              backgroundColor: 'var(--bg-card)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', fontSize: '15px' }}>
                  <span style={{ fontWeight: 600, color: getStatusColor(selectedTask.status) }}>
                    {getStatusText(selectedTask.status)}
                  </span>
                  <span className="text-muted">·</span>
                  <span className="text-secondary">{selectedTask.dept || '부서'}</span>
                  <span className="text-muted">·</span>
                  <span className="text-secondary">{selectedTask.assigneeName}</span>
                  <span>{getPriorityText(selectedTask.priority)}</span>
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {selectedTask.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCloseDetail}
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Detail Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              {/* Quick Status Changers */}
              <div style={{
                marginBottom: '1.75rem',
                padding: '1.15rem 1.25rem',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  진행 상태 변경
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedTask.status === 'TODO' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleStatusChange('TODO')}
                    style={{ borderRadius: 0 }}
                  >
                    할 일
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedTask.status === 'IN_PROGRESS' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                    style={{ borderRadius: 0 }}
                  >
                    진행 중
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedTask.status === 'DONE' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleStatusChange('DONE')}
                    style={{ borderRadius: 0 }}
                  >
                    완료
                  </button>
                </div>
              </div>

              {!isEditing ? (
                <div>
                  {/* Metadata List */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1.25rem',
                    paddingBottom: '1.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '1.75rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>담당자</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {selectedTask.assigneeName} ({selectedTask.dept || '부서'})
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>우선순위</div>
                      <div style={{ fontSize: '16px' }}>{getPriorityText(selectedTask.priority)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>시작일</div>
                      <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                        {selectedTask.startDate || '-'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>마감일</div>
                      <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                        {selectedTask.dueDate || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: '2.5rem' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                      상세 설명
                    </h4>
                    <div style={{
                      fontSize: '15px',
                      lineHeight: 1.7,
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      background: 'var(--bg-card-hover)',
                      padding: '1.25rem',
                      border: '1px solid var(--border-color)'
                    }}>
                      {selectedTask.description || '등록된 상세 설명이 없습니다.'}
                    </div>
                  </div>

                  {/* Action Buttons: Edit / Delete */}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setIsEditing(true)}
                      style={{ flex: 1, height: '46px', fontSize: '15px', fontWeight: 600, borderRadius: 0 }}
                    >
                      프로젝트 정보 수정
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleDeleteTask}
                      style={{ height: '46px', padding: '0 1.25rem', fontSize: '15px', borderRadius: 0 }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit Mode Form */
                <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      업무명
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      style={{ height: '44px', fontSize: '15px', borderRadius: 0 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
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
                        style={{ height: '44px', fontSize: '15px', borderRadius: 0 }}
                      >
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.dept})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        우선순위
                      </label>
                      <select
                        className="form-control"
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                        style={{ height: '44px', fontSize: '15px', borderRadius: 0 }}
                      >
                        <option value="URGENT">긴급</option>
                        <option value="HIGH">높음</option>
                        <option value="MEDIUM">보통</option>
                        <option value="LOW">낮음</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        시작일
                      </label>
                      <CustomDatePicker
                        value={editForm.startDate}
                        onChange={(d) => setEditForm({ ...editForm, startDate: d })}
                        placeholder="시작일 선택"
                        width="100%"
                        height="44px"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        마감일
                      </label>
                      <CustomDatePicker
                        value={editForm.dueDate}
                        onChange={(d) => setEditForm({ ...editForm, dueDate: d })}
                        placeholder="마감일 선택"
                        width="100%"
                        height="44px"
                        align="right"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      상세 설명
                    </label>
                    <textarea
                      className="form-control"
                      rows={5}
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      style={{ fontSize: '15px', borderRadius: 0 }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 1, height: '46px', fontSize: '15px', fontWeight: 600, borderRadius: 0 }}
                    >
                      수정사항 저장
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsEditing(false)}
                      style={{ width: '90px', height: '46px', fontSize: '15px', borderRadius: 0 }}
                    >
                      취소
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
