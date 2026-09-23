import React, { useState, useEffect } from 'react';
import { Clock, ChevronRight, ChevronDown, User, Plus } from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';
import CustomCheckbox from './CustomCheckbox';
import AdminAttendanceSection from './AdminAttendanceSection';

// Helper for local KST date string (YYYY-MM-DD)
const getTodayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 공통 관리자 툴바 컴포넌트 (모든 관리 탭의 검색창 및 등록 버튼 크기/스타일 단일화)
function AdminSearchToolbar({
  leftContent,
  placeholder,
  searchTerm,
  onSearchChange,
  onReset,
  actionLabel,
  onAction,
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: leftContent ? 'space-between' : 'flex-end',
      paddingBottom: '0.85rem',
      borderBottom: '1px solid var(--border-color)',
      gap: '0.75rem',
      flexWrap: 'wrap'
    }}>
      {leftContent ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {leftContent}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <input 
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="form-control"
          style={{ width: '240px', height: '40px', padding: '0 0.85rem', fontSize: '14px' }}
        />
        {searchTerm && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onReset}
            style={{ height: '40px', padding: '0 0.9rem', fontSize: '14px' }}
          >
            초기화
          </button>
        )}
        {actionLabel && (
          <button 
            type="button"
            className="btn btn-primary"
            onClick={onAction}
            style={{ height: '40px', padding: '0 1.25rem', fontSize: '14px' }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminPortal({ 
  user, 
  onShowToast, 
  onGoHome,
  toastPosition,
  onToastPositionChange,
  theme,
  onToggleTheme,
  initialTab = 'accounts',
  onRefresh
}) {
  const resolveInitialTab = (tab) => {
    if (user?.role === 'ADMIN') {
      if (!tab || tab === 'approvals' || tab === 'admin') return 'accounts';
      return tab;
    }
    return tab || 'approvals';
  };

  const [activeTab, setActiveTab] = useState(() => resolveInitialTab(initialTab)); // accounts, teams, clients, announcements
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAttDate, setSelectedAttDate] = useState('');
  const [accountCategory, setAccountCategory] = useState('ALL'); // 'ALL' | 'EMPLOYEE' | 'CLIENT'
  const [hoveredAccountTab, setHoveredAccountTab] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [editingDeptName, setEditingDeptName] = useState(null);
  const [deptNameInputValue, setDeptNameInputValue] = useState('');
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDeptInput, setNewDeptInput] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [expandedDepts, setExpandedDepts] = useState({});
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  const toggleDeptExpand = (deptName) => {
    setExpandedDepts(prev => ({
      ...prev,
      [deptName]: !prev[deptName]
    }));
  };

  // Client Management State (초성 그룹 탐색기 및 고객사 상세/요청 내역)
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [expandedClientGroups, setExpandedClientGroups] = useState({});
  const [clientRequests, setClientRequests] = useState([]);
  const [isEditingClientInfo, setIsEditingClientInfo] = useState(false);
  const [clientEditForm, setClientEditForm] = useState({
    companyName: '',
    bizNo: '',
    managerName: '',
    phone: ''
  });
  const [clientRequestStatusFilter, setClientRequestStatusFilter] = useState('ALL'); // 'ALL' | 'REQUESTED' | 'IN_PROGRESS' | 'DONE'
  const [clientRequestPage, setClientRequestPage] = useState(1);

  const toggleClientGroupExpand = (groupName) => {
    setExpandedClientGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Unified Account Registration Drawer State
  const [showAccountRegDrawer, setShowAccountRegDrawer] = useState(false);
  const [isAccountRegClosing, setIsAccountRegClosing] = useState(false);
  const [accountRegType, setAccountRegType] = useState('EMPLOYEE'); // 'EMPLOYEE' | 'CLIENT'
  const [accountForm, setAccountForm] = useState({
    nameOrCompany: '',
    username: '',
    password: '123'
  });

  // Slide Drawers State (모든 등록 및 상세 내역은 우측 슬라이드 패널로 표시)
  const [showEmpDrawer, setShowEmpDrawer] = useState(false);
  const [isEmpClosing, setIsEmpClosing] = useState(false);

  const [showAnnoDrawer, setShowAnnoDrawer] = useState(false);
  const [isAnnoClosing, setIsAnnoClosing] = useState(false);
  const [editingAnno, setEditingAnno] = useState(null);
  const [annoForm, setAnnoForm] = useState({
    title: '',
    content: '',
    isActive: true
  });

  const [showClientDrawer, setShowClientDrawer] = useState(false);
  const [isClientClosing, setIsClientClosing] = useState(false);

  const [showNetDrawer, setShowNetDrawer] = useState(false);
  const [isNetClosing, setIsNetClosing] = useState(false);

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [isEmpDetailClosing, setIsEmpDetailClosing] = useState(false);

  const [selectedClient, setSelectedClient] = useState(null);
  const [isClientDetailClosing, setIsClientDetailClosing] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isAccountDetailClosing, setIsAccountDetailClosing] = useState(false);
  const [showAccountHistoryPanel, setShowAccountHistoryPanel] = useState(false);
  const [isHistoryTimelineClosing, setIsHistoryTimelineClosing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(null);
  const [accountAccessLogs, setAccountAccessLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const [selectedNet, setSelectedNet] = useState(null);
  const [isNetDetailClosing, setIsNetDetailClosing] = useState(false);

  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [isAttDetailClosing, setIsAttDetailClosing] = useState(false);

  // Employee Registration in Org Chart (사내 조직도 내 사원 등록)
  const [showEmpRegDrawer, setShowEmpRegDrawer] = useState(false);
  const [isEmpRegClosing, setIsEmpRegClosing] = useState(false);
  const [isSubmittingEmpReg, setIsSubmittingEmpReg] = useState(false);
  const [empRegForm, setEmpRegForm] = useState({
    userId: '',
    empNo: '',
    dept: '',
    position: '연구원',
    hireDate: getTodayStr(),
    phone: '',
    email: ''
  });

  const handleOpenEmpRegDrawer = () => {
    const nextEmpNo = `EMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const defaultDept = departments.length > 0 ? departments[0] : '개발1팀';
    
    // 미등록 계정이 있으면 우선 선택, 없으면 첫 번째 사원 계정
    const unlinked = employees.find(e => !e.dept || !e.empNo);
    const initialUser = unlinked || employees[0];

    setEmpRegForm({
      userId: initialUser?.id || '',
      empNo: initialUser?.empNo || nextEmpNo,
      dept: initialUser?.dept || defaultDept,
      position: initialUser?.position || '연구원',
      hireDate: initialUser?.hireDate || getTodayStr(),
      phone: initialUser?.phone || '',
      email: initialUser?.email || ''
    });
    setIsEmpRegClosing(false);
    setShowEmpRegDrawer(true);
  };

  const handleCloseEmpRegDrawer = () => {
    if (isEmpRegClosing) return;
    setIsEmpRegClosing(true);
    setTimeout(() => {
      setShowEmpRegDrawer(false);
      setIsEmpRegClosing(false);
    }, 220);
  };

  const handleSelectAccountForEmpReg = (selectedUserId) => {
    const selected = employees.find(e => e.id === selectedUserId);
    if (selected) {
      setEmpRegForm(prev => ({
        ...prev,
        userId: selected.id,
        empNo: selected.empNo || prev.empNo,
        dept: selected.dept || prev.dept || (departments[0] || '개발1팀'),
        position: selected.position || prev.position || '연구원',
        hireDate: selected.hireDate || prev.hireDate,
        phone: selected.phone || prev.phone,
        email: selected.email || prev.email
      }));
    }
  };

  const handleSubmitEmpReg = async (e) => {
    e?.preventDefault();
    if (!empRegForm.userId) {
      alert('연결할 계정을 선택하세요.');
      return;
    }
    if (!empRegForm.dept) {
      alert('소속 부서를 선택하세요.');
      return;
    }

    try {
      setIsSubmittingEmpReg(true);
      const res = await fetch('/api/users/link-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empRegForm)
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('사원 등록 완료', '사내 조직도에 정상적으로 등록·연결되었습니다.', 'success');
        loadData();
        handleCloseEmpRegDrawer();
      } else {
        alert(data.message || '사원 등록 실패');
      }
    } catch (err) {
      console.error('Emp reg error:', err);
      alert('사원 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingEmpReg(false);
    }
  };

  // Client Registration in Client Management (고객사 관리 내 전용 고객사 등록 슬라이드 드로어)
  const [showClientRegDrawer, setShowClientRegDrawer] = useState(false);
  const [isClientRegClosing, setIsClientRegClosing] = useState(false);
  const [isSubmittingClientReg, setIsSubmittingClientReg] = useState(false);
  const [clientRegForm, setClientRegForm] = useState({
    clientId: '',
    companyName: '',
    managerName: '',
    phone: '',
    bizNo: ''
  });

  const handleOpenClientRegDrawer = () => {
    // 아직 고객사 정보(연락처/사업자번호)가 등록되지 않은 미등록 고객사 계정 우선 탐색
    const unlinked = clients.find(c => !c.bizNo && !c.phone);

    setClientRegForm({
      clientId: unlinked?.id || '',
      companyName: unlinked?.companyName || '',
      managerName: '',
      phone: '',
      bizNo: ''
    });
    setIsClientRegClosing(false);
    setShowClientRegDrawer(true);
  };

  const handleCloseClientRegDrawer = () => {
    if (isClientRegClosing) return;
    setIsClientRegClosing(true);
    setTimeout(() => {
      setShowClientRegDrawer(false);
      setIsClientRegClosing(false);
    }, 220);
  };

  const handleSelectAccountForClientReg = (selectedClientId) => {
    const selected = clients.find(c => c.id === selectedClientId);
    setClientRegForm({
      clientId: selectedClientId,
      companyName: selected?.companyName || '',
      managerName: '',
      phone: '',
      bizNo: ''
    });
  };

  const handleSubmitClientReg = async (e) => {
    e?.preventDefault();
    if (!clientRegForm.clientId) {
      alert('연결할 고객사 계정을 선택하세요.');
      return;
    }
    if (!clientRegForm.companyName.trim()) {
      alert('회사명을 입력하세요.');
      return;
    }

    try {
      setIsSubmittingClientReg(true);
      const res = await fetch(`/api/clients/${clientRegForm.clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: clientRegForm.companyName.trim(),
          managerName: clientRegForm.managerName.trim(),
          phone: clientRegForm.phone.trim(),
          bizNo: clientRegForm.bizNo.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('고객사 등록 완료', `${clientRegForm.companyName} 고객사 정보가 정상적으로 등록·연결되었습니다.`, 'success');
        loadData();
        handleCloseClientRegDrawer();
      } else {
        alert(data.message || '고객사 등록 실패');
      }
    } catch (err) {
      console.error('Client reg error:', err);
      alert('고객사 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingClientReg(false);
    }
  };

  // Team Leader Permissions Drawer State
  const [selectedTeamLeader, setSelectedTeamLeader] = useState(null);
  const [isTeamPermClosing, setIsTeamPermClosing] = useState(false);
  const [permForm, setPermForm] = useState({
    leaveApprovalScope: 'OWN_TEAM',
    canViewTeamAttendance: true
  });

  const handleOpenTeamPerm = (leader) => {
    setSelectedTeamLeader(leader);
    setPermForm({
      leaveApprovalScope: leader.permissions?.leaveApprovalScope || 'OWN_TEAM',
      canViewTeamAttendance: leader.permissions?.canViewTeamAttendance !== false
    });
    setIsTeamPermClosing(false);
  };

  const handleCloseTeamPerm = () => {
    if (isTeamPermClosing) return;
    setIsTeamPermClosing(true);
    setTimeout(() => {
      setSelectedTeamLeader(null);
      setIsTeamPermClosing(false);
    }, 220);
  };

  const handleOpenAccountReg = (type = 'EMPLOYEE') => {
    setAccountRegType(type);
    setAccountForm({ nameOrCompany: '', username: '', password: '123' });
    setIsAccountRegClosing(false);
    setShowAccountRegDrawer(true);
  };

  const handleCloseAccountReg = () => {
    if (isAccountRegClosing) return;
    setIsAccountRegClosing(true);
    setTimeout(() => {
      setShowAccountRegDrawer(false);
      setIsAccountRegClosing(false);
    }, 220);
  };

  const handleCloseEmpDrawer = () => {
    if (isEmpClosing) return;
    setIsEmpClosing(true);
    setTimeout(() => {
      setShowEmpDrawer(false);
      setIsEmpClosing(false);
    }, 220);
  };

  const handleCloseClientDrawer = () => {
    if (isClientClosing) return;
    setIsClientClosing(true);
    setTimeout(() => {
      setShowClientDrawer(false);
      setIsClientClosing(false);
    }, 220);
  };

  const handleCloseNetDrawer = () => {
    if (isNetClosing) return;
    setIsNetClosing(true);
    setTimeout(() => {
      setShowNetDrawer(false);
      setIsNetClosing(false);
    }, 220);
  };

  const handleCloseEmpDetail = () => {
    if (isEmpDetailClosing) return;
    setIsEmpDetailClosing(true);
    setTimeout(() => {
      setSelectedEmp(null);
      setIsEmpDetailClosing(false);
    }, 220);
  };

  const handleCloseClientDetail = () => {
    if (isClientDetailClosing) return;
    setIsClientDetailClosing(true);
    setTimeout(() => {
      setSelectedClient(null);
      setIsClientDetailClosing(false);
    }, 220);
  };

  const handleCloseAccountDetail = () => {
    if (isAccountDetailClosing || !selectedAccount) return;
    setIsAccountDetailClosing(true);
    if (showAccountHistoryPanel) setIsHistoryTimelineClosing(true);
    setTimeout(() => {
      setSelectedAccount(null);
      setIsAccountDetailClosing(false);
      setShowAccountHistoryPanel(false);
      setIsHistoryTimelineClosing(false);
      setAccountAccessLogs([]);
    }, 220);
  };

  const handleToggleAccountHistory = () => {
    if (showAccountHistoryPanel) {
      setIsHistoryTimelineClosing(true);
      setTimeout(() => {
        setShowAccountHistoryPanel(false);
        setIsHistoryTimelineClosing(false);
      }, 200);
    } else {
      setShowAccountHistoryPanel(true);
    }
  };

  useEffect(() => {
    if (selectedAccount?.id) {
      setIsLoadingLogs(true);
      fetch(`/api/accounts/${selectedAccount.id}/access-logs`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAccountAccessLogs(data.logs || []);
          } else {
            setAccountAccessLogs([]);
          }
        })
        .catch(err => {
          console.error('Failed to load account access logs:', err);
          setAccountAccessLogs([]);
        })
        .finally(() => {
          setIsLoadingLogs(false);
        });
    } else {
      setAccountAccessLogs([]);
    }
  }, [selectedAccount?.id]);

  const handleCopyUsername = async (username) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(username);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = username;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedUsername(username);
      setTimeout(() => setCopiedUsername(null), 2000);
      onShowToast?.('아이디 복사 완료', `'${username}' 아이디가 클립보드에 복사되었습니다.`, 'success');
    } catch (err) {
      console.error('Clipboard copy error:', err);
      onShowToast?.('아이디 복사 실패', '클립보드 복사 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleResetAccountPassword = async () => {
    if (!selectedAccount) return;
    if (!window.confirm(`${selectedAccount.name} 계정의 비밀번호를 기본값(123)으로 초기화하시겠습니까?`)) {
      return;
    }
    const isClient = selectedAccount.rawType === 'CLIENT';
    const url = isClient
      ? `/api/clients/${selectedAccount.id}/password`
      : `/api/users/${selectedAccount.id}/password`;
    try {
      setIsChangingPassword(true);
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '123' })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('비밀번호 초기화 완료', `${selectedAccount.name} 계정의 비밀번호가 123으로 초기화되었습니다.`, 'success');
      } else {
        alert(data.message || '비밀번호 초기화 실패');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      alert('비밀번호 초기화 중 오류가 발생했습니다.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggleAccountStatus = async () => {
    if (!selectedAccount) return;
    const isClient = selectedAccount.rawType === 'CLIENT';
    const currentActive = selectedAccount.status === 'ACTIVE';
    const nextStatus = currentActive ? 'SUSPENDED' : 'ACTIVE';
    const url = isClient
      ? `/api/clients/${selectedAccount.id}/status`
      : `/api/users/${selectedAccount.id}/status`;
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        if (isClient) {
          setClients(prev => prev.map(c => c.id === selectedAccount.id ? { ...c, status: nextStatus } : c));
        } else {
          setEmployees(prev => prev.map(e => e.id === selectedAccount.id ? { ...e, status: nextStatus } : e));
        }
        setSelectedAccount(prev => ({
          ...prev,
          status: nextStatus,
          statusLabel: nextStatus === 'ACTIVE' ? '정상 활성' : '접속 중지'
        }));
        onShowToast?.('계정 상태 변경', `${selectedAccount.name} 계정이 ${nextStatus === 'ACTIVE' ? '정상 활성' : '접속 중지'} 상태로 전환되었습니다.`);
      } else {
        alert(data.message || '상태 변경 실패');
      }
    } catch (err) {
      console.error('Account status toggle error:', err);
      alert('계정 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;
    if (selectedAccount.username === 'admin') {
      alert('최고 관리자 계정은 삭제할 수 없습니다.');
      return;
    }
    if (!window.confirm(`${selectedAccount.name} (${selectedAccount.username}) 계정을 삭제하시겠습니까?\n삭제된 계정은 복구할 수 없습니다.`)) {
      return;
    }
    const isClient = selectedAccount.rawType === 'CLIENT';
    const url = isClient
      ? `/api/clients/${selectedAccount.id}`
      : `/api/users/${selectedAccount.id}`;
    try {
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (isClient) {
          setClients(prev => prev.filter(c => c.id !== selectedAccount.id));
        } else {
          setEmployees(prev => prev.filter(e => e.id !== selectedAccount.id));
        }
        onShowToast?.('계정 삭제 완료', `${selectedAccount.name} 계정이 삭제되었습니다.`);
        handleCloseAccountDetail();
      } else {
        alert(data.message || '계정 삭제 실패');
      }
    } catch (err) {
      console.error('Account delete error:', err);
      alert('계정 삭제 처리 중 오류가 발생했습니다.');
    }
  };

  const handleCloseNetDetail = () => {
    if (isNetDetailClosing) return;
    setIsNetDetailClosing(true);
    setTimeout(() => {
      setSelectedNet(null);
      setIsNetDetailClosing(false);
    }, 220);
  };

  const handleCloseAttDetail = () => {
    if (isAttDetailClosing) return;
    setIsAttDetailClosing(true);
    setTimeout(() => {
      setSelectedAttendance(null);
      setIsAttDetailClosing(false);
    }, 220);
  };

  // Announcement Handlers
  const handleOpenCreateAnno = () => {
    setEditingAnno(null);
    setAnnoForm({
      title: '',
      content: '',
      isActive: true
    });
    setIsAnnoClosing(false);
    setShowAnnoDrawer(true);
  };

  const handleOpenEditAnno = (anno) => {
    setEditingAnno(anno);
    setAnnoForm({
      title: anno.title,
      content: anno.content || '',
      isActive: anno.isActive !== false
    });
    setIsAnnoClosing(false);
    setShowAnnoDrawer(true);
  };

  const handleCloseAnnoDrawer = () => {
    if (isAnnoClosing) return;
    setIsAnnoClosing(true);
    setTimeout(() => {
      setShowAnnoDrawer(false);
      setIsAnnoClosing(false);
      setEditingAnno(null);
    }, 220);
  };

  const handleSaveAnnouncement = async (e) => {
    if (e) e.preventDefault();
    if (!annoForm.title.trim()) {
      if (onShowToast) onShowToast('공지 제목을 입력해주세요.');
      return;
    }

    try {
      if (editingAnno) {
        const res = await fetch(`/api/announcements/${editingAnno.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(annoForm)
        });
        const data = await res.json();
        if (data.success) {
          if (onShowToast) onShowToast('공지 배너 내용이 수정되었습니다.');
        }
      } else {
        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(annoForm)
        });
        const data = await res.json();
        if (data.success) {
          if (onShowToast) onShowToast('신규 공지 배너가 등록되었습니다.');
        }
      }
      handleCloseAnnoDrawer();
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error saving announcement:', err);
      if (onShowToast) onShowToast('공지 배너 저장 중 오류가 발생했습니다.');
    }
  };

  const handleToggleAnnouncement = async (anno, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/announcements/${anno.id}/toggle`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.success) {
        const nextState = data.announcement.isActive;
        if (onShowToast) onShowToast(nextState ? '공지가 하단 배너에 실시간 노출됩니다.' : '공지 노출이 일시 중지되었습니다.');
        await loadData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Error toggling announcement:', err);
      if (onShowToast) onShowToast('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteAnnouncement = async (anno, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`'${anno.title}' 공지를 정말 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/announcements/${anno.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        if (onShowToast) onShowToast('공지 배너가 삭제되었습니다.');
        await loadData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Error deleting announcement:', err);
      if (onShowToast) onShowToast('공지 삭제 중 오류가 발생했습니다.');
    }
  };

  // Form States
  const [empForm, setEmpForm] = useState({
    username: '',
    password: '123',
    name: '',
    empNo: '',
    dept: '개발1팀',
    position: '선임연구원',
    role: 'EMPLOYEE',
    hireDate: new Date().toISOString().slice(0, 10),
    phone: '',
    email: '',
    manualLeaveAdjustment: 0
  });

  const [clientForm, setClientForm] = useState({
    companyName: '',
    username: '',
    password: '123',
    managerName: '',
    phone: '',
    bizNo: ''
  });

  const [netForm, setNetForm] = useState({
    type: 'WIFI',
    name: '',
    value: ''
  });

  const [adjustValue, setAdjustValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Load All Admin Data
  const loadData = async () => {
    try {
      const [empRes, cliRes, netRes, attRes, lvRes, annoRes, deptRes, reqRes] = await Promise.all([
        fetch('/api/users').then(r => r.json()),
        fetch('/api/clients').then(r => r.json()),
        fetch('/api/networks').then(r => r.json()),
        fetch('/api/attendances').then(r => r.json()),
        fetch('/api/leaves').then(r => r.json()),
        fetch('/api/announcements').then(r => r.json()).catch(() => []),
        fetch('/api/departments').then(r => r.json()).catch(() => ({ departments: [] })),
        fetch('/api/client-requests').then(r => r.json()).catch(() => [])
      ]);

      setEmployees(empRes);
      setClients(cliRes);
      setNetworks(netRes);
      setAttendances(attRes);
      setLeaves(lvRes);
      setAnnouncements(Array.isArray(annoRes) ? annoRes : []);
      setClientRequests(Array.isArray(reqRes) ? reqRes : []);
      const loadedDepts = deptRes?.departments && deptRes.departments.length > 0 
        ? deptRes.departments 
        : [...new Set((empRes || []).map(e => e.dept).filter(Boolean))];
      setDepartments(loadedDepts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveInitialTab(initialTab));
    }
  }, [initialTab, user?.role]);

  // Pending Approvals Queue (Self-approval strictly forbidden, respects permissions and multi-approvers)
  const pendingApprovals = (leaves || []).filter(l => {
    if (l.status !== 'PENDING' && l.status !== 'CANCEL_REQUESTED') return false;
    if (l.userId === user?.id) return false; // 본인 신청 건은 직접 승인 불가

    const isMulti = Array.isArray(l.approvers) && l.approvers.length > 0;
    if (isMulti) {
      const myApproval = l.approvers.find(a => a.id === user?.id || (user?.role === 'ADMIN' && a.role === 'ADMIN'));
      return myApproval && myApproval.status === 'PENDING';
    }

    if (user?.role === 'ADMIN') return true;

    if (user?.role === 'TEAM_LEADER') {
      const scope = user?.permissions?.leaveApprovalScope || 'OWN_TEAM';
      if (scope === 'ALL') return true;
      if (scope === 'OWN_TEAM') return l.dept === user?.dept;
      return l.approverId === user?.id;
    }

    return l.approverId === user?.id;
  });

  // Approval handler
  const handlePortalApproval = async (leaveId, newStatus) => {
    let rejectReason = '';
    if (newStatus === 'REJECTED') {
      const reason = window.prompt('반려 사유를 입력하세요:');
      if (reason === null) return; // cancel
      rejectReason = reason.trim();
    }

    let actionLabel = '처리';
    if (newStatus === 'APPROVED') actionLabel = '승인';
    else if (newStatus === 'REJECTED') actionLabel = '반려';
    else if (newStatus === 'CANCELLED') actionLabel = '취소 승인';

    try {
      const res = await fetch(`/api/leaves/${leaveId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus, 
          rejectReason,
          approverId: user?.id,
          approverName: user?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        if (onShowToast) {
          onShowToast(`결재 ${actionLabel} 완료`, `신청 건이 정상적으로 ${actionLabel} 처리되었습니다.`, 'success');
        }
        loadData();
      } else {
        alert(data.message || '결재 처리에 실패했습니다.');
      }
    } catch (err) {
      alert(`결재 ${actionLabel} 처리 중 오류가 발생했습니다.`);
    }
  };

  // Save Team Leader Permissions
  const handleSaveTeamPermissions = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTeamLeader) return;
    try {
      const res = await fetch(`/api/users/${selectedTeamLeader.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permForm })
      });
      const data = await res.json();
      if (data.success) {
        if (onShowToast) {
          onShowToast('권한 설정 완료', `${selectedTeamLeader.name} 팀장의 결재 권한이 정상 저장되었습니다.`, 'success');
        }
        handleCloseTeamPerm();
        loadData();
      } else {
        alert(data.message || '권한 저장에 실패했습니다.');
      }
    } catch (err) {
      alert('권한 저장 중 오류가 발생했습니다.');
    }
  };

  // Calculate legal leave preview for employee form
  const getPreviewLegalLeave = (dateStr) => {
    if (!dateStr) return 15;
    const hireDate = new Date(dateStr);
    const today = new Date();
    const diffMonths = (today.getFullYear() - hireDate.getFullYear()) * 12 + (today.getMonth() - hireDate.getMonth());
    if (diffMonths < 12) return Math.max(0, Math.min(11, diffMonths));
    const diffYears = Math.floor(diffMonths / 12);
    return Math.min(25, 15 + Math.floor((diffYears - 1) / 2));
  };

  // Submit Employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!empForm.name || !empForm.username || !empForm.password) {
      alert('필수 정보를 모두 입력하세요.');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empForm)
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('사원 등록 완료', `${empForm.name} 사원이 등록되었습니다.`);
        handleCloseEmpDrawer();
        handleCloseAccountReg();
        setEmpForm({
          username: '',
          password: '123',
          name: '',
          empNo: '',
          dept: departments[0] || '개발1팀',
          position: '선임연구원',
          role: 'EMPLOYEE',
          hireDate: new Date().toISOString().slice(0, 10),
          phone: '',
          email: '',
          manualLeaveAdjustment: 0
        });
        loadData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('사원 등록 오류');
    }
  };

  // Submit Client
  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!clientForm.companyName || !clientForm.username || !clientForm.password) {
      alert('고객사 필수 정보를 모두 입력하세요.');
      return;
    }

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm)
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('고객사 등록 완료', `${clientForm.companyName} 계정이 발급되었습니다.`);
        handleCloseClientDrawer();
        handleCloseAccountReg();
        setClientForm({
          companyName: '',
          username: '',
          password: '123',
          managerName: '',
          phone: '',
          bizNo: ''
        });
        loadData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('고객사 등록 오류');
    }
  };

  // Submit Unified Account (직원 / 고객사 라디오 선택 후 이름, 아이디, 비밀번호 공통 등록)
  const handleUnifiedAccountCreate = async (e) => {
    if (e) e.preventDefault();
    const nameVal = (accountForm.nameOrCompany || '').trim();
    const userVal = (accountForm.username || '').trim();
    const pwVal = (accountForm.password || '').trim();

    if (!nameVal || !userVal || !pwVal) {
      alert('이름(회사명), 아이디, 비밀번호를 모두 입력하세요.');
      return;
    }

    try {
      if (accountRegType === 'EMPLOYEE') {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameVal,
            username: userVal,
            password: pwVal,
            dept: departments[0] || '개발1팀',
            position: '사원',
            role: 'EMPLOYEE'
          })
        });
        const data = await res.json();
        if (data.success) {
          onShowToast('직원 등록 완료', `${nameVal} 직원 계정이 등록되었습니다.`);
          handleCloseAccountReg();
          setAccountForm({ nameOrCompany: '', username: '', password: '123' });
          loadData();
        } else {
          alert(data.message || '직원 등록 오류');
        }
      } else {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: nameVal,
            username: userVal,
            password: pwVal,
            managerName: nameVal + ' 담당자'
          })
        });
        const data = await res.json();
        if (data.success) {
          onShowToast('고객사 등록 완료', `${nameVal} 고객사 계정이 등록되었습니다.`);
          handleCloseAccountReg();
          setAccountForm({ nameOrCompany: '', username: '', password: '123' });
          loadData();
        } else {
          alert(data.message || '고객사 등록 오류');
        }
      }
    } catch (err) {
      alert('계정 등록 중 오류가 발생했습니다.');
    }
  };

  // Submit Network
  const handleCreateNetwork = async (e) => {
    e.preventDefault();
    if (!netForm.name || !netForm.value) {
      alert('네트워크 이름과 설정값을 입력하세요.');
      return;
    }

    try {
      const res = await fetch('/api/networks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(netForm)
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('네트워크 등록 완료', `${netForm.name}이 허용 네트워크에 추가되었습니다.`);
        handleCloseNetDrawer();
        setNetForm({ type: 'WIFI', name: '', value: '' });
        loadData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('네트워크 등록 오류');
    }
  };

  const handleDeleteNetwork = async (id) => {
    if (!confirm('이 네트워크 설정을 삭제하시겠습니까?')) return;
    await fetch(`/api/networks/${id}`, { method: 'DELETE' });
    onShowToast('네트워크 삭제', '설정이 삭제되었습니다.');
    if (selectedNet && selectedNet.id === id) {
      handleCloseNetDetail();
    }
    loadData();
  };

  // Adjust Leave (사원 연차 수동 조정)
  const handleAdjustLeave = async () => {
    if (!selectedEmp) return;
    try {
      const res = await fetch(`/api/users/${selectedEmp.id}/leave`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualLeaveAdjustment: adjustValue })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('연차 조정 완료', `${selectedEmp.name} 사원의 연차가 조정되었습니다.`);
        handleCloseEmpDetail();
        loadData();
      }
    } catch (err) {
      alert('연차 조정 오류');
    }
  };

  // Toggle Client Status (고객사 계정 정상 활성 / 접속 중지)
  const handleToggleClientStatus = async (cli) => {
    if (!cli) return;
    const newStatus = cli.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/clients/${cli.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('상태 변경 완료', `${cli.companyName} 계정이 ${newStatus === 'ACTIVE' ? '정상 활성' : '접속 중지'} 상태로 변경되었습니다.`);
        setSelectedClient(prev => prev ? { ...prev, status: newStatus } : null);
        loadData();
      }
    } catch (err) {
      alert('상태 변경 오류');
    }
  };

  const handleDeleteClient = async (cli) => {
    if (!cli) return;
    if (!window.confirm(`'${cli.companyName}' 고객사 계정을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/clients/${cli.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onShowToast('고객사 삭제 완료', data.message || `${cli.companyName} 계정이 삭제되었습니다.`, 'info');
        if (selectedClientId === cli.id) setSelectedClientId(null);
        loadData();
      } else {
        alert(data.message || '삭제에 실패했습니다.');
      }
    } catch (err) {
      alert('고객사 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateClientInfo = async (e, customTargetId) => {
    if (e) e.preventDefault();
    const targetId = customTargetId || selectedClientId;
    if (!targetId) return;
    try {
      const res = await fetch(`/api/clients/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientEditForm)
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('정보 수정 완료', `'${clientEditForm.companyName}' 고객사 정보가 업데이트되었습니다.`, 'success');
        setIsEditingClientInfo(false);
        loadData();
      } else {
        alert(data.message || '수정에 실패했습니다.');
      }
    } catch (err) {
      alert('고객사 정보 수정 중 오류가 발생했습니다.');
    }
  };

  // Department & Organization Handlers
  const handleRenameDept = async (oldName, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed || trimmed === oldName) {
      setEditingDeptName(null);
      setDeptNameInputValue('');
      return;
    }
    try {
      const res = await fetch('/api/departments/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: trimmed })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('부서명 변경 완료', `'${oldName}' 부서명이 '${trimmed}'(으)로 변경되었습니다.`, 'success');
        if (selectedDept === oldName) setSelectedDept(trimmed);
        setEditingDeptName(null);
        setDeptNameInputValue('');
        loadData();
      } else {
        alert(data.message || '부서명 변경에 실패했습니다.');
      }
    } catch (err) {
      alert('부서명 변경 중 오류가 발생했습니다.');
    }
  };

  const getNextDefaultDeptName = () => {
    let i = 1;
    while (
      departments.includes(`새부서 ${i}`) ||
      departments.includes(`새부서${i}`) ||
      departments.includes(`새 부서 ${i}`) ||
      (i === 1 && departments.includes('새부서'))
    ) {
      i++;
    }
    return `새부서 ${i}`;
  };

  const handleDirectAddDept = async () => {
    const newName = getNextDefaultDeptName();
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('부서 추가 완료', `'${newName}' 부서가 추가되었습니다.`, 'success');
        setSelectedDept(newName);
        loadData();
      } else {
        alert(data.message || '부서 추가에 실패했습니다.');
      }
    } catch (err) {
      alert('부서 추가 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteDept = async (deptName) => {
    if (!window.confirm(`'${deptName}' 부서를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/departments/${encodeURIComponent(deptName)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('부서 삭제 완료', `'${deptName}' 부서가 삭제되었습니다.`, 'info');
        if (selectedDept === deptName) setSelectedDept('ALL');
        loadData();
      } else {
        alert(data.message || '부서 삭제에 실패했습니다.');
      }
    } catch (err) {
      alert('부서 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleMoveEmployeeDept = async (employeeId, newDept) => {
    const targetEmp = employees.find(e => e.id === employeeId);
    if (!targetEmp || targetEmp.dept === newDept) return;
    try {
      const res = await fetch(`/api/users/${employeeId}/dept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dept: newDept })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('소속 이동 완료', `${targetEmp.name} 사원의 소속이 '${newDept}'(으)로 이동되었습니다.`, 'success');
        loadData();
      } else {
        alert(data.message || '소속 변경에 실패했습니다.');
      }
    } catch (err) {
      alert('소속 변경 중 오류가 발생했습니다.');
    }
  };

  // Excel Download
  const handleDownloadExcel = () => {
    window.location.href = '/api/export/excel';
    onShowToast('엑셀 다운로드', '근태, 휴가, 업무, 고객사요청 4개 시트 엑셀 파일 생성을 시작합니다.');
  };

  return (
    <div>
      {/* Top Banner & Excel Action (Clean minimal typography, no card box) */}
      <div style={{
        marginBottom: '1.75rem',
        paddingBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {user?.role === 'ADMIN' ? '관리자' : '팀장 관리'}
        </h2>

        {user?.role === 'ADMIN' && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadExcel}
              style={{ height: '42px', padding: '0 1.4rem', fontSize: '16px', fontWeight: 600, borderRadius: 0 }}
            >
              통합 4개 시트 엑셀 다운로드 (.xlsx)
            </button>
          </div>
        )}
      </div>

      {/* Subtab Navigation + Search & Action */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '1.5rem',
        position: 'relative',
        zIndex: 20
      }}>
        {/* Left: Subtabs (4 Essential Tabs for Admin) */}
        <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto' }}>
          {user?.role === 'ADMIN' ? (
            <>
              <button 
                type="button"
                className={`tab-btn tab-btn-lg ${activeTab === 'accounts' ? 'active' : ''}`}
                onClick={() => { setActiveTab('accounts'); setSearchTerm(''); setAccountCategory('ALL'); }}
              >
                계정 관리
              </button>
              <button 
                type="button"
                className={`tab-btn tab-btn-lg ${activeTab === 'teams' ? 'active' : ''}`}
                onClick={() => { setActiveTab('teams'); setSearchTerm(''); }}
              >
                사내 조직도
              </button>
              <button 
                type="button"
                className={`tab-btn tab-btn-lg ${activeTab === 'clients' ? 'active' : ''}`}
                onClick={() => { setActiveTab('clients'); setSearchTerm(''); }}
              >
                고객사 관리
              </button>
              <button 
                type="button"
                className={`tab-btn tab-btn-lg ${activeTab === 'announcements' ? 'active' : ''}`}
                onClick={() => { setActiveTab('announcements'); setSearchTerm(''); }}
              >
                배너 관리
              </button>
            </>
          ) : (
            <button 
              type="button"
              className={`tab-btn tab-btn-lg ${activeTab === 'approvals' ? 'active' : ''}`}
              onClick={() => { setActiveTab('approvals'); setSearchTerm(''); }}
            >
              결재 및 당일 근태 {pendingApprovals.length > 0 ? `(${pendingApprovals.length})` : ''}
            </button>
          )}
        </div>

        {/* Right: Search & Action Button (Only for legacy tabs if any) */}
        {activeTab !== 'approvals' && activeTab !== 'teams' && activeTab !== 'accounts' && activeTab !== 'clients' && activeTab !== 'announcements' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', paddingBottom: '0.5rem' }}>
            {activeTab === 'attendances' && (
              <CustomDatePicker
                value={selectedAttDate}
                onChange={(d) => setSelectedAttDate(d)}
                placeholder="날짜 검색"
                width="150px"
                height="42px"
              />
            )}

            <input 
              type="text"
              placeholder={
                activeTab === 'employees' ? '사원명 또는 사번 검색...'
                : activeTab === 'teams' ? '소속명 또는 사원명 검색...'
                : activeTab === 'networks' ? '식별명 또는 IP 검색...'
                : '사원명 또는 부서 검색...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ width: '220px', height: '42px', padding: '0 0.85rem' }}
            />

            {(searchTerm || (activeTab === 'attendances' && selectedAttDate)) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setSearchTerm(''); setSelectedAttDate(''); }}
                style={{ height: '42px' }}
              >
                초기화
              </button>
            )}

            {activeTab === 'networks' && (
              <button 
                type="button"
                className="btn btn-primary"
                onClick={() => { setIsNetClosing(false); setShowNetDrawer(true); }}
                style={{ height: '42px', padding: '0 1.25rem' }}
              >
                네트워크 추가
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 0: UNIFIED ACCOUNTS (통합 계정 관리 - 사내 임직원 및 고객사 계정 전체 노출) */}
      {activeTab === 'accounts' && (() => {
        const allAccounts = [
          ...employees.map(emp => ({
            rawType: 'EMPLOYEE',
            typeLabel: '직원',
            id: emp.id,
            username: emp.username,
            name: emp.name,
            createdAt: emp.createdAt || '2026-01-01',
            status: 'ACTIVE',
            statusLabel: '정상 활성',
            original: emp
          })),
          ...clients.map(cli => ({
            rawType: 'CLIENT',
            typeLabel: '고객사',
            id: cli.id,
            username: cli.username,
            name: cli.companyName,
            createdAt: cli.createdAt || '2026-01-01',
            status: cli.status || 'ACTIVE',
            statusLabel: cli.status === 'ACTIVE' ? '정상 활성' : '접속 중지',
            original: cli
          }))
        ];

        const filteredAccounts = allAccounts.filter(acc => {
          if (accountCategory === 'EMPLOYEE' && acc.rawType !== 'EMPLOYEE') return false;
          if (accountCategory === 'CLIENT' && acc.rawType !== 'CLIENT') return false;

          if (!searchTerm.trim()) return true;
          const term = searchTerm.toLowerCase().trim();
          return (
            (acc.username && acc.username.toLowerCase().includes(term)) ||
            (acc.name && acc.name.toLowerCase().includes(term))
          );
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Account Controls Row: Category Tabs (Left) + Search & Registration (Right) */}
            <AdminSearchToolbar
              leftContent={
                [
                  { id: 'ALL', label: '전체' },
                  { id: 'EMPLOYEE', label: '직원', color: '#3b82f6' },
                  { id: 'CLIENT', label: '고객사', color: '#f59e0b' }
                ].map(cat => {
                  const isSelected = accountCategory === cat.id;
                  const isHovered = hoveredAccountTab === cat.id;
                  const showDot = cat.id !== 'ALL' && (isHovered || isSelected);

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAccountCategory(cat.id)}
                      onMouseEnter={() => setHoveredAccountTab(cat.id)}
                      onMouseLeave={() => setHoveredAccountTab(null)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        padding: '6px 0',
                        fontSize: '20px',
                        fontWeight: isSelected ? 700 : (isHovered ? 600 : 500),
                        color: isSelected ? 'var(--text-primary)' : (isHovered ? (cat.color || 'var(--text-primary)') : 'var(--text-muted)'),
                        borderBottom: isSelected ? '2px solid var(--text-primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        letterSpacing: '-0.02em',
                        transition: 'all 0.18s ease',
                        outline: 'none'
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
                })
              }
              placeholder="아이디 또는 이름/회사명 검색..."
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onReset={() => setSearchTerm('')}
              actionLabel="계정 등록"
              onAction={() => handleOpenAccountReg(accountCategory === 'CLIENT' ? 'CLIENT' : 'EMPLOYEE')}
            />

            {/* Account Grid Cards */}
            {filteredAccounts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4.5rem 1.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-muted)'
              }}>
                <p style={{ fontSize: '16px', margin: 0 }}>
                  {searchTerm ? '검색 조건과 일치하는 계정이 없습니다.' : '등록된 계정이 없습니다.'}
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.25rem'
              }}>
                {filteredAccounts.map(acc => {
                  const isActive = acc.status === 'ACTIVE';
                  const isCopied = copiedUsername === acc.username;
                  return (
                    <div
                      key={`${acc.rawType}-${acc.id}`}
                      onClick={() => {
                        setSelectedAccount(acc);
                        setIsAccountDetailClosing(false);
                      }}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '1.5rem 1.6rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '140px',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--text-primary)';
                        e.currentTarget.style.backgroundColor = 'var(--bg-card-hover, rgba(255,255,255,0.03))';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {/* Top Row: Hero @Username Area with prominent copy container */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyUsername(acc.username);
                            }}
                            title="아이디 복사"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '7px',
                              background: 'transparent',
                              border: '1px solid transparent',
                              padding: '3px 7px',
                              margin: '-3px -7px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              transition: 'all 0.15s ease',
                              minWidth: 0,
                              outline: 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (copiedUsername !== acc.username) {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (copiedUsername !== acc.username) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = 'transparent';
                              }
                            }}
                          >
                            <span style={{
                              fontSize: '22px',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              color: copiedUsername === acc.username ? '#22c55e' : 'var(--text-primary)',
                              letterSpacing: '-0.02em',
                              lineHeight: 1.2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              @{acc.username}
                            </span>
                            {copiedUsername === acc.username ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            )}
                          </button>

                          {!isActive && (
                            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', flexShrink: 0 }}>
                              [사용 중지]
                            </span>
                          )}
                        </div>

                        {/* Middle Row: Name / Company */}
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 500,
                          color: 'var(--text-secondary)',
                          letterSpacing: '-0.01em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {acc.name}
                        </div>
                      </div>

                      {/* Bottom Row: Date Only (Right Aligned, No '생성일' text) */}
                      <div style={{
                        marginTop: '1.25rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--border-color)',
                        fontSize: '12.5px',
                        color: 'var(--text-muted)',
                        fontFamily: 'monospace',
                        textAlign: 'right'
                      }}>
                        {acc.createdAt || '2026-01-01'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 1: EMPLOYEES (고객사 포털과 100% 동일한 목록 스타일, 뱃지 일체 배제) */}
      {activeTab === 'employees' && (() => {
        const filteredEmployees = employees.filter(emp => {
          if (!searchTerm.trim()) return true;
          const term = searchTerm.toLowerCase().trim();
          return (emp.name && emp.name.toLowerCase().includes(term)) ||
            (emp.empNo && emp.empNo.toLowerCase().includes(term)) ||
            (emp.username && emp.username.toLowerCase().includes(term)) ||
            (emp.dept && emp.dept.toLowerCase().includes(term));
        });

        return (
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 0 }}>
            {/* Table Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1.05rem 1.25rem',
              background: 'var(--bg-card-hover)',
              borderBottom: '2px solid var(--border-color)',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}>
              <span style={{ width: '42px', flexShrink: 0, textAlign: 'center' }}>번호</span>
              <span style={{ width: '200px', flexShrink: 0, paddingLeft: '0.5rem' }}>사원명 / 사번</span>
              <span style={{ width: '180px', flexShrink: 0 }}>부서 / 직급</span>
              <span style={{ width: '120px', flexShrink: 0, textAlign: 'center' }}>입사일자</span>
              <span style={{ width: '110px', flexShrink: 0, textAlign: 'center' }}>법정 연차</span>
              <span style={{ width: '110px', flexShrink: 0, textAlign: 'center' }}>관리자 조정</span>
              <span style={{ width: '100px', flexShrink: 0, textAlign: 'center' }}>총 부여</span>
              <span style={{ flex: 1, minWidth: 0, paddingLeft: '0.5rem', textAlign: 'center' }}>사용 / 잔여 연차</span>
              <span style={{ width: '100px', flexShrink: 0, textAlign: 'center' }}>관리</span>
            </div>

            {filteredEmployees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '16px' }}>{searchTerm ? '검색 조건과 일치하는 사원이 없습니다.' : '등록된 사원이 없습니다.'}</p>
              </div>
            ) : (
              <div>
                {filteredEmployees.map((emp, idx) => {
                  const isLast = idx === filteredEmployees.length - 1;
                  return (
                    <div
                      key={emp.id}
                      className="client-req-item"
                      onClick={() => {
                        setSelectedEmp(emp);
                        setAdjustValue(emp.manualLeaveAdjustment || 0);
                        setIsEmpDetailClosing(false);
                      }}
                      style={{
                        padding: '1.1rem 1.25rem',
                        borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'var(--transition)',
                        cursor: 'pointer'
                      }}
                    >
                      {/* 1. 번호 */}
                      <span style={{ width: '42px', flexShrink: 0, textAlign: 'center', fontSize: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {filteredEmployees.length - idx}
                      </span>

                      {/* 2. 사원명 / 사번 */}
                      <div style={{ width: '200px', flexShrink: 0, paddingLeft: '0.5rem' }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</div>
                        <div style={{ fontSize: '16px', color: 'var(--text-muted)' }}>{emp.empNo} · {emp.username}</div>
                      </div>

                      {/* 3. 부서 / 직급 */}
                      <div style={{ width: '180px', flexShrink: 0 }}>
                        <div style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{emp.dept}</div>
                        <div style={{ fontSize: '16px', color: 'var(--text-muted)' }}>{emp.position}</div>
                      </div>

                      {/* 4. 입사일자 */}
                      <span style={{ width: '120px', flexShrink: 0, textAlign: 'center', fontSize: '16px', color: 'var(--text-secondary)' }}>
                        {emp.hireDate}
                      </span>

                      {/* 5. 법정 연차 (뱃지 없이 순수 텍스트) */}
                      <span style={{ width: '110px', flexShrink: 0, textAlign: 'center', fontSize: '16px', color: 'var(--text-primary)' }}>
                        {emp.legalLeave}일
                      </span>

                      {/* 6. 관리자 조정 (뱃지 없이 순수 텍스트) */}
                      <span style={{ width: '110px', flexShrink: 0, textAlign: 'center', fontSize: '16px', color: emp.manualLeaveAdjustment !== 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {emp.manualLeaveAdjustment > 0 ? `+${emp.manualLeaveAdjustment}일` : (emp.manualLeaveAdjustment < 0 ? `${emp.manualLeaveAdjustment}일` : '0일')}
                      </span>

                      {/* 7. 총 부여 */}
                      <span style={{ width: '100px', flexShrink: 0, textAlign: 'center', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {emp.totalLeave}일
                      </span>

                      {/* 8. 사용 / 잔여 연차 (구분자 ·, 순수 텍스트) */}
                      <div style={{ flex: 1, minWidth: 0, paddingLeft: '0.5rem', textAlign: 'center', fontSize: '16px' }}>
                        <span>사용 {emp.usedLeave || 0}일</span>
                        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>·</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>잔여 {emp.remainingLeave}일</span>
                      </div>

                      {/* 9. 관리 */}
                      <div style={{ width: '100px', flexShrink: 0, textAlign: 'center' }}>
                        <button 
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmp(emp);
                            setAdjustValue(emp.manualLeaveAdjustment || 0);
                            setIsEmpDetailClosing(false);
                          }}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '16px' }}
                        >
                          연차 조정
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB: TEAMS / ORGANIZATIONS (정통 계층형 폴더 트리 및 구성원 명부 테이블 구조) */}
      {activeTab === 'teams' && (() => {
        const allDepts = Array.from(new Set([
          ...departments,
          ...employees.map(e => e.dept).filter(Boolean)
        ]));

        const filteredDepts = allDepts.filter(deptName => {
          if (!searchTerm.trim()) return true;
          const term = searchTerm.toLowerCase().trim();
          if (deptName.toLowerCase().includes(term)) return true;
          const mems = employees.filter(e => e.dept === deptName);
          return mems.some(m => 
            (m.name && m.name.toLowerCase().includes(term)) ||
            (m.username && m.username.toLowerCase().includes(term)) ||
            (m.empNo && m.empNo.toLowerCase().includes(term))
          );
        });

        // Members in selected department (or all members if 'ALL')
        const currentMembers = employees.filter(e => {
          if (selectedDept !== 'ALL' && e.dept !== selectedDept) return false;
          if (!searchTerm.trim()) return true;
          const term = searchTerm.toLowerCase().trim();
          return (
            (e.name && e.name.toLowerCase().includes(term)) ||
            (e.username && e.username.toLowerCase().includes(term)) ||
            (e.empNo && e.empNo.toLowerCase().includes(term)) ||
            (e.dept && e.dept.toLowerCase().includes(term)) ||
            (e.position && e.position.toLowerCase().includes(term))
          );
        });

        const isSelectedHq = selectedDept === '경영지원본부';
        const currentLeader = selectedDept === 'ALL'
          ? null
          : isSelectedHq
            ? employees.find(e => e.role === 'ADMIN' && e.dept === selectedDept) || employees.find(e => e.role === 'ADMIN')
            : employees.find(e => e.role === 'TEAM_LEADER' && e.dept === selectedDept);
        const otherEmployees = selectedDept === 'ALL' ? [] : employees.filter(e => e.dept !== selectedDept);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Toolbar */}
            <AdminSearchToolbar
              placeholder="소속명 또는 사원명 검색..."
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onReset={() => setSearchTerm('')}
              actionLabel="사원 등록"
              onAction={handleOpenEmpRegDrawer}
            />

            {/* Main 2-Column Split: Folder Tree Explorer + Member Directory Table */}
            <div style={{
              display: 'flex',
              gap: '1.25rem',
              alignItems: 'flex-start'
            }}>
              {/* Left Column: Folder Tree Explorer */}
              <div style={{
                width: '320px',
                flexShrink: 0,
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Tree List */}
                <div style={{
                  padding: '1.25rem 0.85rem 1.5rem 0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  {filteredDepts.map((deptName) => {
                    const deptMembers = employees.filter(e => e.dept === deptName);
                    const isExpanded = Boolean(expandedDepts[deptName]);
                    const isSelected = selectedDept === deptName;

                    return (
                      <div key={deptName} style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Department Row */}
                        <div
                          onClick={() => {
                            setSelectedDept(deptName);
                            toggleDeptExpand(deptName);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.55rem 0.65rem',
                            cursor: 'pointer',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.color = 'var(--text-primary)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.color = 'var(--text-muted)';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDeptExpand(deptName);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'inherit'
                              }}
                              title={isExpanded ? "접기" : "펼치기"}
                            >
                              <ChevronRight
                                size={16}
                                style={{
                                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                              />
                            </button>

                            <span style={{
                              fontSize: '16px',
                              fontWeight: isSelected ? 700 : 500,
                              color: 'inherit',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              transition: 'color 0.15s ease'
                            }}>
                              {deptName}
                            </span>
                          </div>
                        </div>

                        {/* Members Sub-tree with Smooth Height Transition */}
                        <div style={{
                          display: 'grid',
                          gridTemplateRows: isExpanded ? '1fr' : '0fr',
                          transition: 'grid-template-rows 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
                          overflow: 'hidden',
                          visibility: isExpanded ? 'visible' : 'hidden'
                        }}>
                          <div style={{
                            minHeight: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            marginLeft: '1.15rem',
                            paddingLeft: '0.85rem',
                            borderLeft: isExpanded ? '1px solid var(--border-color)' : 'none',
                            paddingTop: isExpanded ? '0.2rem' : '0',
                            paddingBottom: isExpanded ? '0.35rem' : '0',
                            gap: '0.15rem'
                          }}>
                            {deptMembers.length === 0 ? (
                              <div style={{ fontSize: '15.5px', fontWeight: 500, color: 'var(--text-muted)', padding: '0.45rem 0.5rem' }}>
                                소속 사원 없음
                              </div>
                            ) : (
                              deptMembers.map((m) => {
                                const isEmpActive = selectedEmpId === m.id;
                                return (
                                  <div
                                    key={m.id}
                                    onClick={() => {
                                      setSelectedDept(deptName);
                                      setSelectedEmpId(m.id);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '0.4rem 0.5rem',
                                      fontSize: '15.5px',
                                      fontWeight: isEmpActive ? 700 : 400,
                                      color: isEmpActive ? 'var(--text-primary)' : 'var(--text-muted)',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      transition: 'color 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isEmpActive) e.currentTarget.style.color = 'var(--text-primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isEmpActive) e.currentTarget.style.color = 'var(--text-muted)';
                                    }}
                                  >
                                    <span>{m.name}</span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Direct Add Department Action */}
                  <div
                    onClick={handleDirectAddDept}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.55rem 0.65rem',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      transition: 'color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'inherit',
                          flexShrink: 0
                        }}
                      >
                        <Plus size={16} />
                      </span>

                      <span style={{
                        fontSize: '16px',
                        fontWeight: 500,
                        color: 'inherit',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        신규 부서 추가
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Employee Detail (When person clicked) OR Department Member Roster */}
              <div style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {(() => {
                  const targetEmp = employees.find(e => e.id === selectedEmpId);
                  if (targetEmp) {
                    const todayAtt = (attendances || []).find(a => a.userId === targetEmp.id && a.date === getTodayStr());
                    const totalLeave = ((targetEmp.annualLeave || 15) + (targetEmp.manualLeaveAdjustment || 0)).toFixed(1);
                    const usedLeave = (targetEmp.usedLeave || 0).toFixed(1);
                    const remainingLeave = Math.max(0, (targetEmp.annualLeave || 15) + (targetEmp.manualLeaveAdjustment || 0) - (targetEmp.usedLeave || 0)).toFixed(1);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Selected Employee Top Header Section (Open seamless, name on left, action buttons on right) */}
                        <div style={{
                          paddingBottom: '1.25rem',
                          borderBottom: '1px solid var(--border-color)',
                          marginBottom: '1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1.25rem'
                        }}>
                          <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                            {targetEmp.name}
                          </h2>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setSelectedEmp(targetEmp);
                                setAdjustValue(targetEmp.manualLeaveAdjustment || 0);
                                setIsEmpDetailClosing(false);
                              }}
                              style={{ height: '40px', padding: '0 1.25rem', fontSize: '15px', fontWeight: 500 }}
                            >
                              연차 조정
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedEmpId(null)}
                              style={{ height: '40px', padding: '0 1.25rem', fontSize: '15px', fontWeight: 500 }}
                            >
                              부서 사원 목록
                            </button>
                          </div>
                        </div>

                        {/* All Employee Information Rows Flowing Down Vertically */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>성명</span>
                            <span style={{ fontSize: '16.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{targetEmp.name}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>소속 부서</span>
                            <span style={{ fontSize: '16.5px', color: 'var(--text-primary)', fontWeight: 500 }}>{targetEmp.dept || '미지정'}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>직급 / 직책</span>
                            <span style={{ fontSize: '16.5px', color: 'var(--text-primary)' }}>{targetEmp.position || '사원'}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>사번</span>
                            <span style={{ fontSize: '16.5px', color: 'var(--text-primary)' }}>{targetEmp.empNo || '-'}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>계정 아이디</span>
                            <span style={{ fontSize: '16.5px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>@{targetEmp.username}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>연락처</span>
                            <span style={{ fontSize: '16.5px', color: 'var(--text-primary)' }}>{targetEmp.phone || '-'}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>이메일</span>
                            <span style={{ fontSize: '16.5px', color: 'var(--text-primary)' }}>{targetEmp.email || '-'}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>입사일자</span>
                            <span style={{ fontSize: '16.5px', color: 'var(--text-primary)' }}>{targetEmp.hireDate || '-'}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>시스템 권한</span>
                            <span style={{ fontSize: '16.5px', color: 'var(--text-primary)', fontWeight: 500 }}>
                              {targetEmp.role === 'ADMIN' ? '최고 관리자' : (targetEmp.role === 'TEAM_LEADER' ? '부서 책임자' : '일반 임직원')}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>당일 출퇴근 상태</span>
                            {(() => {
                              if (!todayAtt) return <span style={{ fontSize: '16.5px', color: 'var(--text-muted)' }}>미출근</span>;
                              return (
                                <span style={{ fontSize: '16.5px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                  {todayAtt.checkIn ? `${todayAtt.checkIn} 출근` : ''} 
                                  {todayAtt.checkOut ? ` · ${todayAtt.checkOut} 퇴근` : (todayAtt.status === 'WORKING' ? ' · 근무중' : '')}
                                </span>
                              );
                            })()}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>총 부여 연차</span>
                            <span style={{ fontSize: '16.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {totalLeave}일
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>사용 연차</span>
                            <span style={{ fontSize: '16.5px', color: 'var(--text-secondary)' }}>{usedLeave}일</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.95rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>잔여 연차</span>
                            <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {remainingLeave}일
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default: Department Summary & Member Table
                    return (
                      <>
                        {/* Department Detail Header (Open seamless, no breadcrumb, no card box) */}
                        <div style={{
                          paddingBottom: '1.25rem',
                          borderBottom: '1px solid var(--border-color)',
                          marginBottom: '1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1.25rem'
                        }}>
                          {/* Left: Title & Count */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {selectedDept === 'ALL' ? '전체 임직원 명부' : selectedDept}
                            </span>
                            <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              총 {currentMembers.length}명
                            </span>
                          </div>

                          {/* Right: Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                            {selectedDept !== 'ALL' && (
                              <>
                                {editingDeptName === selectedDept ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <input
                                      type="text"
                                      autoFocus
                                      value={deptNameInputValue}
                                      onChange={(e) => setDeptNameInputValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameDept(selectedDept, deptNameInputValue);
                                        if (e.key === 'Escape') { setEditingDeptName(null); setDeptNameInputValue(''); }
                                      }}
                                      className="form-control"
                                      style={{ height: '32px', fontSize: '13px', width: '160px', padding: '0 0.5rem' }}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm"
                                      onClick={() => handleRenameDept(selectedDept, deptNameInputValue)}
                                      style={{ height: '32px', padding: '0 0.65rem', fontSize: '12.5px' }}
                                    >
                                      저장
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => { setEditingDeptName(null); setDeptNameInputValue(''); }}
                                      style={{ height: '32px', padding: '0 0.5rem', fontSize: '12.5px' }}
                                    >
                                      취소
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                      setEditingDeptName(selectedDept);
                                      setDeptNameInputValue(selectedDept);
                                    }}
                                    style={{ height: '36px', padding: '0 0.85rem', fontSize: '14px', fontWeight: 500 }}
                                  >
                                    부서명 수정
                                  </button>
                                )}

                                {currentMembers.length === 0 && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleDeleteDept(selectedDept)}
                                    style={{ height: '36px', padding: '0 0.85rem', fontSize: '14px', fontWeight: 500, color: '#ef4444' }}
                                  >
                                    부서 삭제
                                  </button>
                                )}
                              </>
                            )}

                            {/* Quick Assign Dropdown for other employees */}
                            {selectedDept !== 'ALL' && otherEmployees.length > 0 && (
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleMoveEmployeeDept(e.target.value, selectedDept);
                                    e.target.value = '';
                                  }
                                }}
                                style={{
                                  height: '36px',
                                  fontSize: '14px',
                                  padding: '0 0.6rem',
                                  backgroundColor: 'var(--bg-input)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="">타 부서 사원 빠른 배치...</option>
                                {otherEmployees.map(oe => (
                                  <option key={oe.id} value={oe.id}>
                                    {oe.name} ({oe.username}) · 현재 {oe.dept}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>

                        {/* Sub-info: Leader & Scope */}
                        {selectedDept !== 'ALL' && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '0.75rem',
                            borderTop: '1px dashed var(--border-color)',
                            fontSize: '15px',
                            color: 'var(--text-secondary)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{isSelectedHq ? '총괄 책임자:' : '부서 책임자(팀장):'}</span>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {currentLeader ? `${currentLeader.name} (${currentLeader.position || currentLeader.role})` : '책임자 미지정'}
                              </span>
                              {currentLeader?.username && (
                                <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '14px' }}>
                                  [@{currentLeader.username}]
                                </span>
                              )}
                            </div>

                            {!isSelectedHq && currentLeader && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenTeamPerm(currentLeader)}
                                style={{ height: '36px', padding: '0 0.85rem', fontSize: '14px', fontWeight: 500 }}
                              >
                                결재 권한 설정
                              </button>
                            )}
                          </div>
                        )}

                      {/* Member Directory Table Card */}
                      <div style={{
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          padding: '1rem 1.25rem',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: 'var(--bg-card-hover)'
                        }}>
                          <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {selectedDept === 'ALL' ? '전체 부서 사원 명부' : `${selectedDept} 소속 사원 명부`}
                          </span>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '980px' }}>
                            <thead>
                              <tr style={{
                                borderBottom: '1px solid var(--border-color)',
                                fontSize: '15px',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                backgroundColor: 'transparent'
                              }}>
                                <th style={{ width: '90px', padding: '0.85rem 1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>성명</th>
                                <th style={{ width: '110px', padding: '0.85rem 1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>아이디</th>
                                <th style={{ width: '135px', padding: '0.85rem 1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>사번</th>
                                <th style={{ width: '135px', padding: '0.85rem 1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>소속 부서</th>
                                <th style={{ width: '135px', padding: '0.85rem 1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>직급/직책</th>
                                <th style={{ minWidth: '220px', padding: '0.85rem 1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>연락처 / 이메일</th>
                                <th style={{ width: '115px', padding: '0.85rem 1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>입사일자</th>
                                <th style={{ width: '150px', padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>소속 이동</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentMembers.length === 0 ? (
                                <tr>
                                  <td colSpan={8} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                                    소속된 사원이 없습니다.
                                  </td>
                                </tr>
                              ) : (
                                currentMembers.map((m) => {
                                  return (
                                    <tr
                                      key={m.id}
                                      onClick={() => setSelectedEmpId(m.id)}
                                      style={{
                                        borderBottom: '1px solid var(--border-color)',
                                        transition: 'background-color 0.15s ease',
                                        cursor: 'pointer'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      {/* 성명 */}
                                      <td style={{ width: '90px', padding: '0.95rem 1rem', fontSize: '15.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                        {m.name}
                                      </td>

                                      {/* 아이디 */}
                                      <td style={{ width: '110px', padding: '0.95rem 1rem', fontSize: '15px', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                        @{m.username}
                                      </td>

                                      {/* 사번 */}
                                      <td style={{ width: '135px', padding: '0.95rem 1rem', fontSize: '15px', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                        {m.empNo || '-'}
                                      </td>

                                      {/* 소속 부서 */}
                                      <td style={{ width: '135px', padding: '0.95rem 1rem', fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                        {m.dept || '소속 미지정'}
                                      </td>

                                      {/* 직급/직책 */}
                                      <td style={{ width: '135px', padding: '0.95rem 1rem', fontSize: '15px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                        {m.position || (m.role === 'ADMIN' ? '관리자' : m.role === 'TEAM_LEADER' ? '팀장' : '사원')}
                                      </td>

                                      {/* 연락처 / 이메일 */}
                                      <td style={{ minWidth: '220px', padding: '0.95rem 1rem', fontSize: '15px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                        {m.phone || '-'}{m.email ? ` · ${m.email}` : ''}
                                      </td>

                                      {/* 입사일자 */}
                                      <td style={{ width: '115px', padding: '0.95rem 1rem', fontSize: '15px', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                        {m.joinDate || m.hireDate || '-'}
                                      </td>

                                      {/* 소속 이동 Dropdown */}
                                      <td style={{ width: '150px', padding: '0.75rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                        <select
                                          value={m.dept || ''}
                                          onChange={(e) => handleMoveEmployeeDept(m.id, e.target.value)}
                                          style={{
                                            height: '36px',
                                            fontSize: '14px',
                                            padding: '0 0.6rem',
                                            backgroundColor: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            width: '100%'
                                          }}
                                          title="소속 부서 재배치"
                                        >
                                          {allDepts.map(d => (
                                            <option key={d} value={d}>
                                              {d}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 2: CLIENTS (고객사 관리 - 초성 그룹 폴더 탐색기 및 고객사 상세 / 요청 내역) */}
      {activeTab === 'clients' && (() => {
        const CONSONANT_GROUPS = [
          'ㄱ - ㄷ',
          'ㄹ - ㅂ',
          'ㅅ - ㅈ',
          'ㅊ - ㅎ',
          '기타 (A-Z / 숫자)'
        ];

        const getChosungGroup = (name) => {
          if (!name) return '기타 (A-Z / 숫자)';
          const clean = name.replace(/^(\([^\)]+\)|\[[^\]]+\]|\{[^\}]+\}|주식회사)\s*/, '').trim();
          if (!clean) return '기타 (A-Z / 숫자)';
          const code = clean.charCodeAt(0);

          if (code >= 0xAC00 && code <= 0xD7A3) {
            const chosungIndex = Math.floor((code - 0xAC00) / (21 * 28));
            if (chosungIndex >= 0 && chosungIndex <= 4) return 'ㄱ - ㄷ';
            if (chosungIndex >= 5 && chosungIndex <= 8) return 'ㄹ - ㅂ';
            if (chosungIndex >= 9 && chosungIndex <= 13) return 'ㅅ - ㅈ';
            if (chosungIndex >= 14 && chosungIndex <= 18) return 'ㅊ - ㅎ';
          }

          if (code >= 0x3131 && code <= 0x3139) return 'ㄱ - ㄷ';
          if (code >= 0x313A && code <= 0x3144) return 'ㄹ - ㅂ';
          if (code >= 0x3145 && code <= 0x314A) return 'ㅅ - ㅈ';
          if (code >= 0x314B && code <= 0x314E) return 'ㅊ - ㅎ';

          return '기타 (A-Z / 숫자)';
        };

        const filteredClients = clients.filter(cli => {
          if (!searchTerm.trim()) return true;
          const term = searchTerm.toLowerCase().trim();
          return (cli.companyName && cli.companyName.toLowerCase().includes(term)) ||
            (cli.username && cli.username.toLowerCase().includes(term)) ||
            (cli.managerName && cli.managerName.toLowerCase().includes(term)) ||
            (cli.bizNo && cli.bizNo.includes(term));
        });

        // Active client selection: selectedClientId or fallback to first filtered client
        const activeClient = clients.find(c => c.id === selectedClientId) || filteredClients[0] || clients[0] || null;

        // Filter requests belonging to this client
        const activeClientRequests = activeClient 
          ? (clientRequests || []).filter(r => r.clientId === activeClient.id || (r.clientName && activeClient.companyName && r.clientName.trim() === activeClient.companyName.trim()))
          : [];

        // Filter requests by status
        const filteredClientRequests = activeClientRequests.filter(r => {
          if (clientRequestStatusFilter === 'ALL') return true;
          if (clientRequestStatusFilter === 'DONE') return r.status === 'DONE' || r.status === 'COMPLETED';
          if (clientRequestStatusFilter === 'IN_PROGRESS') return r.status === 'IN_PROGRESS';
          if (clientRequestStatusFilter === 'REQUESTED') return r.status === 'REQUESTED' || !r.status;
          return true;
        });

        // Pagination calculations (10 requests per page)
        const REQUESTS_PER_PAGE = 10;
        const totalRequestPages = Math.ceil(filteredClientRequests.length / REQUESTS_PER_PAGE) || 1;
        const safeCurrentPage = Math.min(Math.max(clientRequestPage, 1), totalRequestPages);
        const paginatedClientRequests = filteredClientRequests.slice(
          (safeCurrentPage - 1) * REQUESTS_PER_PAGE,
          safeCurrentPage * REQUESTS_PER_PAGE
        );

        const doneCount = activeClientRequests.filter(r => r.status === 'DONE' || r.status === 'COMPLETED').length;
        const inProgressCount = activeClientRequests.filter(r => r.status === 'IN_PROGRESS').length;
        const requestedCount = activeClientRequests.filter(r => r.status === 'REQUESTED' || !r.status).length;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Toolbar */}
            <AdminSearchToolbar
              placeholder="고객사명 또는 아이디 검색..."
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onReset={() => setSearchTerm('')}
              actionLabel="고객사 등록"
              onAction={handleOpenClientRegDrawer}
            />

            {/* Main 2-Column Split: Consonant Groups Tree Explorer + Client Details */}
            <div style={{
              display: 'flex',
              gap: '1.25rem',
              alignItems: 'flex-start'
            }}>
            {/* Left Column: Consonant Groups Tree Explorer */}
            <div style={{
              width: '320px',
              flexShrink: 0,
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 280px)',
              minHeight: '480px',
              maxHeight: '580px',
              overflow: 'hidden'
            }}>
              {/* Explorer Tree List */}
              <div style={{
                padding: '1.25rem 0.85rem 1.5rem 0.85rem',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                {CONSONANT_GROUPS.map((groupName) => {
                  const groupClients = filteredClients
                    .filter(c => getChosungGroup(c.companyName) === groupName)
                    .sort((a, b) => (a.companyName || '').localeCompare(b.companyName || '', 'ko'));
                  const isExpanded = Boolean(expandedClientGroups[groupName]);

                  return (
                    <div key={groupName} style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Group Header Row */}
                      <div
                        onClick={() => toggleClientGroupExpand(groupName)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.55rem 0.65rem',
                          cursor: 'pointer',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: isExpanded ? 'var(--text-primary)' : 'var(--text-muted)',
                          transition: 'color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded) e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) e.currentTarget.style.color = 'var(--text-muted)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleClientGroupExpand(groupName);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: 'inherit'
                            }}
                            title={isExpanded ? "접기" : "펼치기"}
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <span style={{
                            fontSize: '16px',
                            fontWeight: isExpanded ? 700 : 500,
                            color: 'inherit',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            transition: 'color 0.15s ease'
                          }}>
                            {groupName}
                          </span>
                        </div>
                      </div>

                      {/* Clients inside group */}
                      {isExpanded && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          marginLeft: '1.15rem',
                          paddingLeft: '0.85rem',
                          borderLeft: '1px solid var(--border-color)',
                          marginTop: '0.2rem',
                          marginBottom: '0.35rem',
                          gap: '0.15rem'
                        }}>
                          {groupClients.length === 0 ? (
                            <div style={{ padding: '0.4rem 0.75rem', fontSize: '15px', color: 'var(--text-muted)' }}>
                              해당 고객사 없음
                            </div>
                          ) : (
                            groupClients.map((cli) => {
                              const isSelected = activeClient?.id === cli.id;
                              return (
                                <div
                                  key={cli.id}
                                  onClick={() => {
                                    setSelectedClientId(cli.id);
                                    setIsEditingClientInfo(false);
                                    setClientRequestPage(1);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.4rem 0.5rem',
                                    cursor: 'pointer',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                                    transition: 'color 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.color = 'var(--text-primary)';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.color = 'var(--text-muted)';
                                  }}
                                >
                                  <span style={{
                                    fontSize: '16px',
                                    fontWeight: isSelected ? 700 : 400,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {cli.companyName}
                                  </span>
                                  {cli.status !== 'ACTIVE' && (
                                    <span style={{
                                      fontSize: '14px',
                                      color: 'var(--text-muted)',
                                      marginLeft: '4px'
                                    }}>
                                      [중지]
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Open Seamless Client Workspace (No outer wrapping box) */}
            <div style={{
              flex: 1,
              minWidth: 0,
              padding: '0.25rem 0.5rem 2rem 1rem',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {!activeClient ? (
                <div style={{
                  padding: '4rem 1.5rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)'
                }}>
                  <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>
                    {searchTerm ? '검색 조건과 일치하는 고객사가 없습니다.' : '등록된 고객사가 없습니다. 상단의 고객사 등록 버튼을 이용해 등록해 주세요.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* 1. Header Section: Title, Status, Manager & Action Buttons */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1.25rem',
                    paddingBottom: '1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '1.75rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>
                        고객사 관리 &gt; {activeClient.companyName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                          {activeClient.companyName}
                        </h2>
                        <span style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: activeClient.status === 'ACTIVE' ? 'var(--text-primary)' : 'var(--text-muted)'
                        }}>
                          [{activeClient.status === 'ACTIVE' ? '정상 활성' : '접속 중지'}]
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>·</span>
                        <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          담당: {activeClient.managerName || '-'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {!isEditingClientInfo ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setClientEditForm({
                                companyName: activeClient.companyName || '',
                                bizNo: activeClient.bizNo || '',
                                managerName: activeClient.managerName || '',
                                phone: activeClient.phone || '',
                                password: ''
                              });
                              setIsEditingClientInfo(true);
                            }}
                            style={{ height: '40px', padding: '0 1.25rem', fontSize: '15px', fontWeight: 500 }}
                          >
                            정보 수정
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleToggleClientStatus(activeClient)}
                            style={{ height: '40px', padding: '0 1.25rem', fontSize: '15px', fontWeight: 500 }}
                          >
                            {activeClient.status === 'ACTIVE' ? '접속 중지 처리' : '정상 활성 처리'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDeleteClient(activeClient)}
                            style={{ height: '40px', padding: '0 1.25rem', fontSize: '15px', fontWeight: 500, color: '#ef4444' }}
                          >
                            삭제
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setIsEditingClientInfo(false)}
                            style={{ height: '40px', padding: '0 1.25rem', fontSize: '15px', fontWeight: 500 }}
                          >
                            수정 취소
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={(e) => handleUpdateClientInfo(e, activeClient.id)}
                            style={{ height: '40px', padding: '0 1.4rem', fontSize: '15px', fontWeight: 500 }}
                          >
                            변경사항 저장
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 2. Basic Info & Account Section */}
                  <div style={{
                    paddingBottom: '1.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '1.75rem'
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '1.1rem',
                      letterSpacing: '-0.01em'
                    }}>
                      기본 정보 및 계정
                    </div>

                    {isEditingClientInfo ? (
                      <form onSubmit={(e) => handleUpdateClientInfo(e, activeClient.id)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                          gap: '1.25rem 1.75rem'
                        }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                              회사명 *
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={clientEditForm.companyName}
                              onChange={(e) => setClientEditForm(prev => ({ ...prev, companyName: e.target.value }))}
                              required
                              style={{ height: '40px', fontSize: '15px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                              사업자등록번호
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={clientEditForm.bizNo}
                              onChange={(e) => setClientEditForm(prev => ({ ...prev, bizNo: e.target.value }))}
                              placeholder="000-00-00000"
                              style={{ height: '40px', fontSize: '15px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                              담당자명 *
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={clientEditForm.managerName}
                              onChange={(e) => setClientEditForm(prev => ({ ...prev, managerName: e.target.value }))}
                              required
                              style={{ height: '40px', fontSize: '15px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                              담당자 연락처
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={clientEditForm.phone}
                              onChange={(e) => setClientEditForm(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="010-0000-0000"
                              style={{ height: '40px', fontSize: '15px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                              비밀번호 변경 (선택)
                            </label>
                            <input
                              type="password"
                              className="form-control"
                              value={clientEditForm.password || ''}
                              onChange={(e) => setClientEditForm(prev => ({ ...prev, password: e.target.value }))}
                              placeholder="변경 시에만 새 비밀번호 입력"
                              style={{ height: '40px', fontSize: '15px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                              접속 아이디 (수정 불가)
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={`@${activeClient.username}`}
                              disabled
                              style={{ height: '40px', fontSize: '15px', backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setIsEditingClientInfo(false)}
                            style={{ height: '40px', padding: '0 1.25rem', fontSize: '14px' }}
                          >
                            취소
                          </button>
                          <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            style={{ height: '40px', padding: '0 1.4rem', fontSize: '14px' }}
                          >
                            변경 내용 저장
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '1.4rem 2rem'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>회사명</span>
                          <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeClient.companyName}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>사업자등록번호</span>
                          <span style={{ fontSize: '17px', color: 'var(--text-primary)', fontWeight: 500 }}>{activeClient.bizNo || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>담당자명</span>
                          <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeClient.managerName || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>연락처</span>
                          <span style={{ fontSize: '17px', color: 'var(--text-primary)', fontWeight: 500 }}>{activeClient.phone || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>접속 계정 아이디</span>
                          <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600, fontSize: '17px' }}>@{activeClient.username}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>계정 등록일</span>
                          <span style={{ fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 500 }}>{activeClient.createdAt || '-'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Request History Section with Filters & Pager */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Title Row (No Counts) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '1rem'
                    }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        요청 내역
                      </span>
                    </div>

                    {/* Filter Bar with CustomCheckbox (Clean, Unboxed, No Counts) */}
                    {activeClientRequests.length > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2rem',
                        flexWrap: 'wrap',
                        padding: '0.5rem 0',
                        marginBottom: '1.25rem'
                      }}>
                        <CustomCheckbox
                          id="filter-all"
                          checked={clientRequestStatusFilter === 'ALL'}
                          onChange={() => {
                            setClientRequestStatusFilter('ALL');
                            setClientRequestPage(1);
                          }}
                          label="전체"
                          size={20}
                          labelStyle={{ fontSize: '16px', fontWeight: 500 }}
                        />
                        <CustomCheckbox
                          id="filter-requested"
                          checked={clientRequestStatusFilter === 'REQUESTED'}
                          onChange={() => {
                            setClientRequestStatusFilter(clientRequestStatusFilter === 'REQUESTED' ? 'ALL' : 'REQUESTED');
                            setClientRequestPage(1);
                          }}
                          label="접수 대기"
                          size={20}
                          labelStyle={{ fontSize: '16px', fontWeight: 500 }}
                        />
                        <CustomCheckbox
                          id="filter-in-progress"
                          checked={clientRequestStatusFilter === 'IN_PROGRESS'}
                          onChange={() => {
                            setClientRequestStatusFilter(clientRequestStatusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS');
                            setClientRequestPage(1);
                          }}
                          label="작업 진행"
                          size={20}
                          labelStyle={{ fontSize: '16px', fontWeight: 500 }}
                        />
                        <CustomCheckbox
                          id="filter-done"
                          checked={clientRequestStatusFilter === 'DONE'}
                          onChange={() => {
                            setClientRequestStatusFilter(clientRequestStatusFilter === 'DONE' ? 'ALL' : 'DONE');
                            setClientRequestPage(1);
                          }}
                          label="작업 완료"
                          size={20}
                          labelStyle={{ fontSize: '16px', fontWeight: 500 }}
                        />
                      </div>
                    )}

                    {/* Table */}
                    {filteredClientRequests.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '3.5rem 1.5rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--text-muted)'
                      }}>
                        <p style={{ fontSize: '16px', margin: 0 }}>
                          {activeClientRequests.length === 0 
                            ? '등록된 유지보수 및 프로젝트 요청 내역이 없습니다.' 
                            : '선택한 상태 조건과 일치하는 요청 내역이 없습니다.'}
                        </p>
                      </div>
                    ) : (
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                        {/* Table Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '1rem 1.25rem',
                          background: 'var(--bg-card-hover)',
                          borderBottom: '1px solid var(--border-color)',
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'var(--text-primary)'
                        }}>
                          <span style={{ width: '50px', flexShrink: 0, textAlign: 'center' }}>번호</span>
                          <span style={{ flex: 1, minWidth: 0, paddingLeft: '0.75rem' }}>요청 제목</span>
                          <span style={{ width: '120px', flexShrink: 0, textAlign: 'center' }}>처리 상태</span>
                          <span style={{ width: '90px', flexShrink: 0, textAlign: 'center' }}>우선순위</span>
                          <span style={{ width: '100px', flexShrink: 0, textAlign: 'center' }}>투입 공수</span>
                          <span style={{ width: '140px', flexShrink: 0, textAlign: 'center' }}>담당자</span>
                          <span style={{ width: '120px', flexShrink: 0, textAlign: 'center' }}>요청일시</span>
                        </div>

                        {/* Table Body */}
                        <div>
                          {paginatedClientRequests.map((req, idx) => {
                            const isLast = idx === paginatedClientRequests.length - 1;
                            const statusLabel = req.status === 'DONE' || req.status === 'COMPLETED' ? '[작업 완료]'
                              : req.status === 'IN_PROGRESS' ? '[작업 진행]'
                              : req.status === 'CANCELLED' ? '[취소]'
                              : '[접수 대기]';
                            const priorityLabel = req.priority === 'URGENT' ? '[긴급]'
                              : req.priority === 'HIGH' ? '[높음]'
                              : '[보통]';
                            const rowNumber = filteredClientRequests.length - ((safeCurrentPage - 1) * REQUESTS_PER_PAGE + idx);

                            return (
                              <div
                                key={req.id || idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '1.05rem 1.25rem',
                                  borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                                  fontSize: '16px',
                                  transition: 'background-color 0.15s ease'
                                }}
                              >
                                <span style={{ width: '50px', flexShrink: 0, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '15px' }}>
                                  {rowNumber}
                                </span>
                                <div style={{ flex: 1, minWidth: 0, paddingLeft: '0.75rem' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '16px' }}>
                                    {req.title}
                                  </span>
                                </div>
                                <span style={{
                                  width: '120px',
                                  flexShrink: 0,
                                  textAlign: 'center',
                                  fontWeight: 600,
                                  color: req.status === 'DONE' || req.status === 'COMPLETED' ? 'var(--text-primary)' : 'var(--text-secondary)'
                                }}>
                                  {statusLabel}
                                </span>
                                <span style={{
                                  width: '90px',
                                  flexShrink: 0,
                                  textAlign: 'center',
                                  fontWeight: req.priority === 'URGENT' ? 700 : 500,
                                  color: req.priority === 'URGENT' ? '#ef4444' : 'var(--text-secondary)'
                                }}>
                                  {priorityLabel}
                                </span>
                                <span style={{ width: '100px', flexShrink: 0, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                  {req.spentHours ? `${req.spentHours}h` : '-'}
                                </span>
                                <span style={{ width: '140px', flexShrink: 0, textAlign: 'center', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {req.assigneeName || '-'}
                                </span>
                                <span style={{ width: '120px', flexShrink: 0, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '15px' }}>
                                  {(req.createdAt || '').slice(0, 10)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Pagination (Pager) */}
                    {totalRequestPages > 1 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '1.75rem',
                        paddingTop: '0.5rem'
                      }}>
                        <button
                          type="button"
                          disabled={safeCurrentPage <= 1}
                          onClick={() => setClientRequestPage(prev => Math.max(prev - 1, 1))}
                          className="btn btn-secondary btn-sm"
                          style={{
                            height: '40px',
                            padding: '0 1.25rem',
                            fontSize: '15px',
                            fontWeight: 500,
                            opacity: safeCurrentPage <= 1 ? 0.4 : 1,
                            cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          &lt; 이전
                        </button>

                        {Array.from({ length: totalRequestPages }, (_, i) => i + 1).map(pageNum => {
                          const isActive = pageNum === safeCurrentPage;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setClientRequestPage(pageNum)}
                              style={{
                                minWidth: '40px',
                                height: '40px',
                                padding: '0 0.6rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '15px',
                                fontWeight: isActive ? 700 : 500,
                                borderRadius: '4px',
                                border: isActive ? '1px solid var(--text-primary)' : '1px solid var(--border-color)',
                                backgroundColor: isActive ? 'var(--text-primary)' : 'var(--bg-card)',
                                color: isActive ? 'var(--bg-main)' : 'var(--text-primary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          disabled={safeCurrentPage >= totalRequestPages}
                          onClick={() => setClientRequestPage(prev => Math.min(prev + 1, totalRequestPages))}
                          className="btn btn-secondary btn-sm"
                          style={{
                            height: '40px',
                            padding: '0 1.25rem',
                            fontSize: '15px',
                            fontWeight: 500,
                            opacity: safeCurrentPage >= totalRequestPages ? 0.4 : 1,
                            cursor: safeCurrentPage >= totalRequestPages ? 'not-allowed' : 'pointer'
                          }}
                        >
                          다음 &gt;
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
      })()}

      {/* TAB 3: NETWORKS (고객사 포털과 100% 동일한 목록 스타일, 뱃지 일체 배제) */}
      {activeTab === 'networks' && (() => {
        const filteredNetworks = networks.filter(net => {
          if (!searchTerm.trim()) return true;
          const term = searchTerm.toLowerCase().trim();
          return (net.name && net.name.toLowerCase().includes(term)) ||
            (net.value && net.value.toLowerCase().includes(term));
        });

        return (
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 0 }}>
            {/* Table Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1.05rem 1.25rem',
              background: 'var(--bg-card-hover)',
              borderBottom: '2px solid var(--border-color)',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}>
              <span style={{ width: '42px', flexShrink: 0, textAlign: 'center' }}>번호</span>
              <span style={{ width: '140px', flexShrink: 0, paddingLeft: '0.5rem' }}>구분</span>
              <span style={{ width: '240px', flexShrink: 0 }}>네트워크 식별명</span>
              <span style={{ flex: 1, minWidth: 0, paddingLeft: '0.5rem' }}>Wi-Fi SSID / IP 대역</span>
              <span style={{ width: '130px', flexShrink: 0, textAlign: 'center' }}>등록일자</span>
              <span style={{ width: '80px', flexShrink: 0, textAlign: 'center' }}>관리</span>
            </div>

            {filteredNetworks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '16px' }}>{searchTerm ? '검색 조건과 일치하는 네트워크가 없습니다.' : '등록된 허용 네트워크가 없습니다.'}</p>
              </div>
            ) : (
              <div>
                {filteredNetworks.map((net, idx) => {
                  const isLast = idx === filteredNetworks.length - 1;
                  return (
                    <div
                      key={net.id}
                      className="client-req-item"
                      onClick={() => {
                        setSelectedNet(net);
                        setIsNetDetailClosing(false);
                      }}
                      style={{
                        padding: '1.1rem 1.25rem',
                        borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'var(--transition)',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ width: '42px', flexShrink: 0, textAlign: 'center', fontSize: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {filteredNetworks.length - idx}
                      </span>
                      <span style={{ width: '140px', flexShrink: 0, paddingLeft: '0.5rem', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {net.type === 'WIFI' ? '사내 Wi-Fi' : '공인 IP 대역'}
                      </span>
                      <span style={{ width: '240px', flexShrink: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
                        {net.name}
                      </span>
                      <div style={{ flex: 1, minWidth: 0, paddingLeft: '0.5rem' }}>
                        <span style={{ fontSize: '16px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {net.value}
                        </span>
                      </div>
                      <span style={{ width: '130px', flexShrink: 0, textAlign: 'center', fontSize: '16px', color: 'var(--text-secondary)' }}>
                        {net.createdAt}
                      </span>
                      <div style={{ width: '80px', flexShrink: 0, textAlign: 'center' }}>
                        <button 
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNetwork(net.id);
                          }}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '16px' }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 4: ATTENDANCES (고객사 포털과 100% 동일한 목록 스타일, 뱃지 일체 배제) */}
      {activeTab === 'attendances' && (() => {
        const filteredAttendances = attendances.filter(att => {
          if (selectedAttDate && att.date !== selectedAttDate) return false;
          if (!searchTerm.trim()) return true;
          const term = searchTerm.toLowerCase().trim();
          return (att.userName && att.userName.toLowerCase().includes(term)) ||
            (att.dept && att.dept.toLowerCase().includes(term));
        });

        return (
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 0 }}>
            {/* Table Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1.05rem 1.25rem',
              background: 'var(--bg-card-hover)',
              borderBottom: '2px solid var(--border-color)',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}>
              <span style={{ width: '42px', flexShrink: 0, textAlign: 'center' }}>번호</span>
              <span style={{ width: '140px', flexShrink: 0, paddingLeft: '0.5rem' }}>사원명</span>
              <span style={{ width: '150px', flexShrink: 0 }}>부서</span>
              <span style={{ width: '120px', flexShrink: 0, textAlign: 'center' }}>날짜</span>
              <span style={{ width: '100px', flexShrink: 0, textAlign: 'center' }}>출근 시각</span>
              <span style={{ width: '100px', flexShrink: 0, textAlign: 'center' }}>퇴근 시각</span>
              <span style={{ width: '110px', flexShrink: 0, textAlign: 'center' }}>실근무시간</span>
              <span style={{ width: '120px', flexShrink: 0, textAlign: 'center' }}>근무 형태</span>
              <span style={{ width: '120px', flexShrink: 0, textAlign: 'center' }}>사내망 여부</span>
            </div>

            {filteredAttendances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '16px' }}>{searchTerm ? '검색 조건과 일치하는 근태 기록이 없습니다.' : '출퇴근 기록이 없습니다.'}</p>
              </div>
            ) : (
              <div>
                {filteredAttendances.map((att, idx) => {
                  const isLast = idx === filteredAttendances.length - 1;
                  return (
                    <div
                      key={att.id}
                      className="client-req-item"
                      onClick={() => {
                        setSelectedAttendance(att);
                        setIsAttDetailClosing(false);
                      }}
                      style={{
                        padding: '1.1rem 1.25rem',
                        borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'var(--transition)',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ width: '42px', flexShrink: 0, textAlign: 'center', fontSize: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {filteredAttendances.length - idx}
                      </span>
                      <span style={{ width: '140px', flexShrink: 0, paddingLeft: '0.5rem', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {att.userName}
                      </span>
                      <span style={{ width: '150px', flexShrink: 0, fontSize: '16px', color: 'var(--text-secondary)' }}>
                        {att.dept}
                      </span>
                      <span style={{ width: '120px', flexShrink: 0, textAlign: 'center', fontSize: '16px', color: 'var(--text-secondary)' }}>
                        {att.date}
                      </span>
                      <span style={{ width: '100px', flexShrink: 0, textAlign: 'center', fontSize: '16px', color: 'var(--text-primary)' }}>
                        {att.checkIn ? att.checkIn.slice(0, 5) : '-'}
                      </span>
                      <span style={{ width: '100px', flexShrink: 0, textAlign: 'center', fontSize: '16px', color: 'var(--text-secondary)' }}>
                        {att.checkOut ? att.checkOut.slice(0, 5) : '-'}
                      </span>
                      <span style={{ width: '110px', flexShrink: 0, textAlign: 'center', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {att.workHours}시간
                      </span>
                      <span style={{ width: '120px', flexShrink: 0, textAlign: 'center', fontSize: '16px', color: 'var(--text-secondary)' }}>
                        {att.workType === 'OFFICE' ? '사내정상' : (att.workType === 'REMOTE' ? '재택근무' : '외근/출장')}
                      </span>
                      <span style={{
                        width: '120px',
                        flexShrink: 0,
                        textAlign: 'center',
                        fontSize: '16px',
                        color: att.isCompanyNetwork ? 'var(--text-primary)' : 'var(--text-muted)'
                      }}>
                        {att.isCompanyNetwork ? '사내망 일치' : '사외 접속'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 5: ANNOUNCEMENTS (사내 공지 배너 관리, 뱃지 일체 배제, 순수 텍스트 타이포그래피) */}
      {activeTab === 'announcements' && (() => {
        const filteredAnnouncements = announcements.filter(anno => {
          if (!searchTerm.trim()) return true;
          const term = searchTerm.toLowerCase().trim();
          return (anno.title && anno.title.toLowerCase().includes(term)) ||
            (anno.content && anno.content.toLowerCase().includes(term));
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Toolbar */}
            <AdminSearchToolbar
              placeholder="공지 제목 또는 내용 검색..."
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onReset={() => setSearchTerm('')}
              actionLabel="공지 배너 등록"
              onAction={handleOpenCreateAnno}
            />

            <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 0 }}>
            {/* Table Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1.05rem 1.25rem',
              background: 'var(--bg-card-hover)',
              borderBottom: '2px solid var(--border-color)',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}>
              <span style={{ width: '48px', flexShrink: 0, textAlign: 'center' }}>번호</span>
              <span style={{ width: '130px', flexShrink: 0, textAlign: 'center' }}>노출 상태</span>
              <span style={{ flex: 1, minWidth: 0, paddingLeft: '0.75rem' }}>공지 제목 및 내용 요약</span>
              <span style={{ width: '120px', flexShrink: 0, textAlign: 'center' }}>등록일자</span>
              <span style={{ width: '170px', flexShrink: 0, textAlign: 'center' }}>관리</span>
            </div>

            {filteredAnnouncements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '16px' }}>{searchTerm ? '검색 조건과 일치하는 공지 사항이 없습니다.' : '등록된 사내 공지 배너가 없습니다.'}</p>
              </div>
            ) : (
              <div>
                {filteredAnnouncements.map((anno, idx) => {
                  const isLast = idx === filteredAnnouncements.length - 1;
                  return (
                    <div
                      key={anno.id}
                      className="client-req-item"
                      onClick={() => handleOpenEditAnno(anno)}
                      style={{
                        padding: '1.1rem 1.25rem',
                        borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'var(--transition)',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ width: '48px', flexShrink: 0, textAlign: 'center', fontSize: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {filteredAnnouncements.length - idx}
                      </span>
                      {/* 상태: 순수 텍스트 표기 (NO Badges, NO Chips) */}
                      <span style={{ 
                        width: '130px', 
                        flexShrink: 0, 
                        textAlign: 'center', 
                        fontSize: '16px', 
                        fontWeight: anno.isActive ? 700 : 400, 
                        color: anno.isActive ? 'var(--text-primary)' : 'var(--text-muted)' 
                      }}>
                        {anno.isActive ? '[실시간 노출]' : '[미노출(대기)]'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0, paddingLeft: '0.75rem' }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                          {anno.title}
                        </div>
                        {anno.content && (
                          <div style={{ fontSize: '16px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {anno.content}
                          </div>
                        )}
                      </div>
                      <span style={{ width: '120px', flexShrink: 0, textAlign: 'center', fontSize: '16px', color: 'var(--text-secondary)' }}>
                        {anno.createdAt || '-'}
                      </span>
                      <div style={{ width: '170px', flexShrink: 0, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <button 
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditAnno(anno);
                          }}
                          style={{ height: '34px', padding: '0 0.65rem', fontSize: '16px' }}
                        >
                          수정
                        </button>
                        <button 
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => handleToggleAnnouncement(anno, e)}
                          style={{ height: '34px', padding: '0 0.65rem', fontSize: '16px' }}
                        >
                          {anno.isActive ? '중지' : '노출'}
                        </button>
                        <button 
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => handleDeleteAnnouncement(anno, e)}
                          style={{ height: '34px', padding: '0 0.65rem', fontSize: '16px', color: 'var(--danger, #dc2626)' }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
      })()}

      {/* DRAWER 1: UNIFIED ACCOUNT REGISTRATION (신규 계정 등록 슬라이드 패널) */}
      {(showAccountRegDrawer || showEmpDrawer || showClientDrawer) && (
        <div 
          className={`detail-backdrop ${isAccountRegClosing || isEmpClosing || isClientClosing ? 'closing' : ''}`}
          onClick={handleCloseAccountReg}
        >
          <div 
            className={`detail-slide-drawer drawer-md ${isAccountRegClosing || isEmpClosing || isClientClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {/* Header: Title & Close button */}
            <div style={{
              padding: '1.75rem 2.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                신규 계정 등록
              </h3>
              <button
                type="button"
                onClick={handleCloseAccountReg}
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

            {/* Body: Single Identical Form with Radio Selection */}
            <div style={{ flex: 1, padding: '2rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>
              <form onSubmit={handleUnifiedAccountCreate} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1.75rem' }}>
                
                {/* 1. Account Type Radio Selector (직원 / 고객사 라디오 선택) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2.5rem',
                  paddingBottom: '1.25rem',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <span style={{ width: '90px', fontSize: '15.5px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                    계정 구분
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      cursor: 'pointer',
                      fontSize: '15.5px',
                      color: 'var(--text-primary)',
                      fontWeight: accountRegType === 'EMPLOYEE' ? 700 : 400
                    }}>
                      <input
                        type="radio"
                        name="accountRegType"
                        value="EMPLOYEE"
                        checked={accountRegType === 'EMPLOYEE'}
                        onChange={() => setAccountRegType('EMPLOYEE')}
                        style={{
                          accentColor: 'var(--text-primary)',
                          cursor: 'pointer',
                          width: '18px',
                          height: '18px'
                        }}
                      />
                      직원
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      cursor: 'pointer',
                      fontSize: '15.5px',
                      color: 'var(--text-primary)',
                      fontWeight: accountRegType === 'CLIENT' ? 700 : 400
                    }}>
                      <input
                        type="radio"
                        name="accountRegType"
                        value="CLIENT"
                        checked={accountRegType === 'CLIENT'}
                        onChange={() => setAccountRegType('CLIENT')}
                        style={{
                          accentColor: 'var(--text-primary)',
                          cursor: 'pointer',
                          width: '18px',
                          height: '18px'
                        }}
                      />
                      고객사
                    </label>
                  </div>
                </div>

                {/* 2. Common Fields (이름/회사명, 아이디, 비밀번호) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* 이름 또는 회사명 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '90px', fontSize: '15.5px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      {accountRegType === 'EMPLOYEE' ? '이름' : '회사명'}
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={accountForm.nameOrCompany}
                      onChange={(e) => setAccountForm({ ...accountForm, nameOrCompany: e.target.value })}
                      style={{
                        flex: 1,
                        height: '42px',
                        fontSize: '15px',
                        backgroundColor: 'var(--bg-input, var(--bg-card))',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  {/* 아이디 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '90px', fontSize: '15.5px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      아이디
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={accountForm.username}
                      onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                      style={{
                        flex: 1,
                        height: '42px',
                        fontSize: '15px',
                        backgroundColor: 'var(--bg-input, var(--bg-card))',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  {/* 비밀번호 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '90px', fontSize: '15.5px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      비밀번호
                    </span>
                    <input
                      type="password"
                      className="form-control"
                      required
                      value={accountForm.password}
                      onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                      style={{
                        flex: 1,
                        height: '42px',
                        fontSize: '15px',
                        backgroundColor: 'var(--bg-input, var(--bg-card))',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                {/* Bottom Actions: Pure text, NO icon symbols */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  marginTop: 'auto',
                  paddingTop: '2rem',
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
                    등록 완료
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 3: NEW NETWORK (사내 인증 네트워크 추가 슬라이드 패널) */}
      {showNetDrawer && (
        <div 
          className={`detail-backdrop ${isNetClosing ? 'closing' : ''}`}
          onClick={handleCloseNetDrawer}
        >
          <div 
            className={`detail-slide-drawer drawer-md ${isNetClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {/* Header: Title & Close button */}
            <div style={{
              padding: '1.75rem 2.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                사내 인증 네트워크 추가
              </h3>
              <button
                type="button"
                onClick={handleCloseNetDrawer}
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

            {/* Body */}
            <div style={{ flex: 1, padding: '1.75rem 2.25rem 2.25rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>
              <form onSubmit={handleCreateNetwork} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1.75rem' }}>
                {/* Hero Title: 네트워크 식별명 */}
                <div>
                  <input
                    type="text"
                    required
                    value={netForm.name}
                    onChange={(e) => setNetForm({ ...netForm, name: e.target.value })}
                    placeholder="네트워크 식별명을 입력하세요 (예: 본사 4층 개발실 Wi-Fi)"
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
                  {/* 1. 네트워크 구분 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      구분
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      {[
                        { id: 'WIFI', label: '무선 Wi-Fi (SSID)' },
                        { id: 'IP', label: '고정 IP 대역' }
                      ].map(t => {
                        const isSel = netForm.type === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setNetForm({ ...netForm, type: t.id })}
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
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. 설정값 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      설정값
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={netForm.value}
                      onChange={(e) => setNetForm({ ...netForm, value: e.target.value })}
                      placeholder={netForm.type === 'WIFI' ? "SSID 이름 (예: OneDesk_Guest_5G)" : "IP 대역 (예: 211.234.12.0/24)"}
                      style={{
                        flex: 1,
                        height: '40px',
                        fontSize: '15px',
                        backgroundColor: 'var(--bg-input, var(--bg-card))',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: '4px'
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
                    네트워크 추가 등록
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 4: EMPLOYEE DETAIL & LEAVE ADJUSTMENT (사원 상세 및 연차 관리 슬라이드 패널) */}
      {selectedEmp && (
        <div 
          className={`detail-backdrop ${isEmpDetailClosing ? 'closing' : ''}`}
          onClick={handleCloseEmpDetail}
        >
          <div 
            className={`detail-slide-drawer drawer-md ${isEmpDetailClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              padding: '1.75rem 2rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  사원 상세 및 인사·연차 관리
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseEmpDetail}
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* Profile Card */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  사원 기본 정보
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '16px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>성명:</span> {selectedEmp.name}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>사번:</span> {selectedEmp.empNo || '-'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>부서:</span> {selectedEmp.dept}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>직급:</span> {selectedEmp.position}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>아이디:</span> {selectedEmp.username}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>입사일자:</span> {selectedEmp.hireDate}</div>
                </div>
              </div>

              {/* Leave Breakdown Card */}
              <div style={{
                border: '1px solid var(--border-color)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  연차 산정 및 사용 현황
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>입사일 기준 법정 연차</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedEmp.legalLeave}일</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>관리자 가산 / 감축 일수</span>
                  <span style={{ fontWeight: 600, color: selectedEmp.manualLeaveAdjustment !== 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {selectedEmp.manualLeaveAdjustment > 0 ? `+${selectedEmp.manualLeaveAdjustment}일` : (selectedEmp.manualLeaveAdjustment < 0 ? `${selectedEmp.manualLeaveAdjustment}일` : '0일')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>총 부여 연차</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '16px' }}>{selectedEmp.totalLeave}일</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>현재까지 사용한 일수</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{selectedEmp.usedLeave || 0}일</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>최종 잔여 연차</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '17px' }}>{selectedEmp.remainingLeave}일</span>
                </div>
              </div>

              {/* Adjust Leave Section */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  관리자 연차 수동 조정
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '16px' }}>조정 일수 입력 (포상 휴가 가산: 양수 +, 패널티 감축: 음수 -)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control"
                    value={adjustValue}
                    onChange={(e) => setAdjustValue(Number(e.target.value))}
                    placeholder="예: 2 또는 -1"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseEmpDetail}
                    style={{ borderRadius: 0 }}
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAdjustLeave}
                    style={{ borderRadius: 0 }}
                  >
                    연차 조정 저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: TEAM LEADER PERMISSION SETTINGS */}
      {selectedTeamLeader && (
        <div 
          className={`detail-backdrop ${isTeamPermClosing ? 'closing' : ''}`}
          onClick={handleCloseTeamPerm}
        >
          <div 
            className={`detail-slide-drawer drawer-md ${isTeamPermClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              padding: '1.75rem 2rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  팀장 결재 및 관리 권한 설정
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseTeamPerm}
                title="닫기"
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

            <form onSubmit={handleSaveTeamPermissions} style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* Leader Profile Summary */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>대상 부서 책임자</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedTeamLeader.name} · {selectedTeamLeader.dept} ({selectedTeamLeader.position})
                </div>
                <div style={{ fontSize: '14.5px', color: 'var(--text-secondary)' }}>
                  아이디: {selectedTeamLeader.username} · 사번: {selectedTeamLeader.empNo}
                </div>
              </div>

              {/* Setting 1: Leave Approval Scope */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <label style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  연차 및 근태 승인 권한 범위
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {[
                    { key: 'OWN_TEAM', label: '소속 팀원 신청 건만 승인 (기본 표준)' },
                    { key: 'ALL', label: '전사 모든 부서 임직원 신청 건 승인' },
                    { key: 'NONE', label: '승인 권한 없음' }
                  ].map(opt => (
                    <label 
                      key={opt.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.85rem 1rem',
                        border: '1px solid var(--border-color)',
                        backgroundColor: permForm.leaveApprovalScope === opt.key ? 'var(--bg-card-hover)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <CustomCheckbox
                        checked={permForm.leaveApprovalScope === opt.key}
                        onChange={() => setPermForm(prev => ({ ...prev, leaveApprovalScope: opt.key }))}
                      />
                      <span style={{ fontSize: '15.5px', fontWeight: permForm.leaveApprovalScope === opt.key ? 600 : 400, color: 'var(--text-primary)' }}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Setting 2: View Attendance Permission */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingTop: '0.5rem' }}>
                <label style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  부서 근태 및 출퇴근 기록 열람
                </label>
                <label 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                >
                  <CustomCheckbox
                    checked={permForm.canViewTeamAttendance}
                    onChange={(checked) => setPermForm(prev => ({ ...prev, canViewTeamAttendance: checked }))}
                  />
                  <span style={{ fontSize: '15.5px', color: 'var(--text-primary)' }}>
                    소속 팀원의 당일 출퇴근 상태 및 누적 근태 기록 조회 허용
                  </span>
                </label>
              </div>

              {/* Notice (Rule 1 & 2: minimal text, no pill badges) */}
              <div style={{
                padding: '1rem',
                border: '1px dashed var(--border-color)',
                fontSize: '14.5px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6
              }}>
                팀장 본인이 신청하는 연차는 최고 관리자(admin) 및 소속 팀원 2명의 3인 승인 합의를 거치게 됩니다.
              </div>

              {/* Footer Button (No Cancel Button) */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '1.25rem',
                marginTop: 'auto'
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
                  설정 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: DEDICATED ACCOUNT DETAIL (계정 관리 전용 드로어: 기본 정보, 비밀번호 변경, 접속 제어, 계정 삭제) */}
      {selectedAccount && (
        <div 
          className={`detail-backdrop ${isAccountDetailClosing ? 'closing' : ''}`}
          onClick={handleCloseAccountDetail}
        >
          {/* TIMELINE SIDE PANEL (드로어 좌측 도킹, 우측 상단 시계 아이콘으로 열고 닫음) */}
          {(showAccountHistoryPanel || isHistoryTimelineClosing) && (
            <div 
              className={`timeline-slide-panel ${isHistoryTimelineClosing ? 'closing' : ''}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                animation: isHistoryTimelineClosing
                  ? 'slideOutTimeline 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                  : 'slideInTimeline 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '3rem 2rem 2.5rem 2rem',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2rem' }}>
                  접속 기록
                </div>

                {isLoadingLogs ? (
                  <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
                    접속 기록을 불러오는 중...
                  </div>
                ) : (!accountAccessLogs || accountAccessLogs.length === 0) ? (
                  <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
                    기록된 접속 이력이 없습니다.
                  </div>
                ) : (
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2.5rem',
                    marginLeft: '0.5rem'
                  }}>
                    {accountAccessLogs.map((item, idx) => {
                      const isLast = idx === accountAccessLogs.length - 1;
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

                          {/* Connecting vertical line */}
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

                          {/* 1. Event Note & Type */}
                          <div style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.01em',
                            lineHeight: 1.4,
                            marginBottom: '0.25rem'
                          }}>
                            {item.note || (item.type === 'LOGIN' ? '로그인' : item.type === 'LOGOUT' ? '로그아웃' : item.type === 'ACCOUNT_CREATED' ? '신규 계정 발급' : item.type === 'ORG_LINK' ? '사내 인원 등록' : '로그인')}
                          </div>

                          {/* 2. Timestamp */}
                          <div style={{
                            fontSize: '14px',
                            color: 'var(--text-secondary)',
                            fontFamily: 'monospace',
                            marginBottom: '0.2rem'
                          }}>
                            {item.timestamp}
                          </div>

                          {/* 3. Device & IP Info */}
                          {item.device && item.device !== '-' && (
                            <div style={{
                              fontSize: '13.5px',
                              color: 'var(--text-muted)',
                              lineHeight: 1.4
                            }}>
                              {item.device}{item.ip ? ` · IP ${item.ip}` : ''}
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
            className={`detail-slide-drawer drawer-md ${isAccountDetailClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
          >
            {/* Header: Timeline Toggle & Close button (우측 상단 정렬, 우리 포털 표준 헤더) */}
            <div style={{
              padding: '2.5rem 2.25rem 1.5rem 2.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              backgroundColor: 'var(--bg-card)',
              gap: '0.6rem',
              flexShrink: 0
            }}>
              {/* Timeline Toggle Button (시계 아이콘) */}
              <button
                type="button"
                onClick={handleToggleAccountHistory}
                title="접속 이력"
                aria-label="접속 이력"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  color: showAccountHistoryPanel ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  borderRadius: '4px',
                  transition: 'color 0.15s ease, opacity 0.15s ease',
                  opacity: showAccountHistoryPanel ? 1 : 0.8
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = showAccountHistoryPanel ? '1' : '0.8'}
              >
                <Clock size={20} strokeWidth={2} />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseAccountDetail}
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

            {/* Detail Drawer Body: Standardized Meta Info List (우리가 사용하던 표준 스타일) */}
            <div style={{ flex: 1, padding: '0 2.25rem 2.5rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto', minHeight: 0 }}>
              {/* Hero Title: 대형 타이틀 */}
              <div style={{ paddingTop: '0.65rem' }}>
                <h3 style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.35
                }}>
                  {selectedAccount.name}
                </h3>
              </div>

              {/* Standardized Meta Info List */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                borderTop: '1px solid var(--border-color)'
              }}>
                {/* 1. 로그인 아이디 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1.25rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1.5rem'
                }}>
                  <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                    아이디
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                      @{selectedAccount.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyUsername(selectedAccount.username)}
                      title="아이디 복사"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: copiedUsername === selectedAccount.username ? '#22c55e' : 'var(--text-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = copiedUsername === selectedAccount.username ? '#22c55e' : 'var(--text-muted)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {copiedUsername === selectedAccount.username ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. 이름 / 회사명 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  padding: '1.25rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1.5rem'
                }}>
                  <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                    {selectedAccount.rawType === 'CLIENT' ? '회사명' : '이름'}
                  </span>
                  <span style={{ fontSize: '17px', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>
                    {selectedAccount.name}
                  </span>
                </div>

                {/* 3. 비밀번호 (보조 설명 없이 초기화 버튼만 단독 배치) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1.5rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                    비밀번호
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleResetAccountPassword}
                    disabled={isChangingPassword}
                    style={{ height: '38px', padding: '0 1.2rem', fontSize: '14px', fontWeight: 600, borderRadius: 0 }}
                  >
                    {isChangingPassword ? '초기화 중...' : '비밀번호 초기화'}
                  </button>
                </div>

                {/* 5. 관리 (계정 상태 + 상태 변경 버튼 + 계정 삭제 버튼 한 줄 통합) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1.5rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem' }}>
                    <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      관리
                    </span>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}>
                      {selectedAccount.status === 'ACTIVE' ? '사용 중' : '사용 중지'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleToggleAccountStatus}
                      style={{ height: '38px', padding: '0 1.1rem', fontSize: '14px', whiteSpace: 'nowrap', borderRadius: 0 }}
                    >
                      {selectedAccount.status === 'ACTIVE' ? '사용 중지' : '사용 재개'}
                    </button>

                    {selectedAccount.username !== 'admin' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleDeleteAccount}
                        style={{
                          height: '38px',
                          padding: '0 1.1rem',
                          borderRadius: 0,
                          fontSize: '14px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        계정 삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: EMPLOYEE REGISTRATION & ORG LINK (사내 조직도 내 사원 등록 및 계정 연결) */}
      {showEmpRegDrawer && (
        <div 
          className={`detail-backdrop ${isEmpRegClosing ? 'closing' : ''}`}
          onClick={handleCloseEmpRegDrawer}
        >
          <div 
            className={`detail-slide-drawer drawer-md ${isEmpRegClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {/* Header: Title & Close button (Rule 3: NO helper text/subtitles) */}
            <div style={{
              padding: '1.75rem 2.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                사원 등록
              </h3>
              <button
                type="button"
                onClick={handleCloseEmpRegDrawer}
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

            {/* Body */}
            <div style={{ flex: 1, padding: '2rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>
              <form onSubmit={handleSubmitEmpReg} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  {/* 1. 대상 계정 선택 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      연결 계정
                    </span>
                    <select
                      className="form-control"
                      value={empRegForm.userId}
                      onChange={(e) => handleSelectAccountForEmpReg(e.target.value)}
                      required
                      style={{ height: '42px', flex: 1, fontSize: '15px' }}
                    >
                      <option value="" disabled>계정을 선택하세요</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          @{emp.username} · {emp.name} {emp.dept ? `(${emp.dept} / ${emp.position || '직급미지정'})` : '(소속 미배정)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. 사번 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      사번
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      value={empRegForm.empNo}
                      onChange={(e) => setEmpRegForm({ ...empRegForm, empNo: e.target.value })}
                      placeholder="사번을 입력하세요 (예: EMP-2026-001)"
                      required
                      style={{ height: '42px', flex: 1, fontSize: '15px' }}
                    />
                  </div>

                  {/* 3. 소속 부서 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      소속 부서
                    </span>
                    <select
                      className="form-control"
                      value={empRegForm.dept}
                      onChange={(e) => setEmpRegForm({ ...empRegForm, dept: e.target.value })}
                      required
                      style={{ height: '42px', flex: 1, fontSize: '15px' }}
                    >
                      <option value="" disabled>부서를 선택하세요</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  {/* 4. 직급 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      직급
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      value={empRegForm.position}
                      onChange={(e) => setEmpRegForm({ ...empRegForm, position: e.target.value })}
                      placeholder="직급을 입력하세요 (예: 팀장 / 책임연구원)"
                      required
                      style={{ height: '42px', flex: 1, fontSize: '15px' }}
                    />
                  </div>

                  {/* 5. 입사일자 (Rule 4: Universal CustomDatePicker 필수 사용) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      입사일자
                    </span>
                    <div style={{ flex: 1 }}>
                      <CustomDatePicker
                        value={empRegForm.hireDate}
                        onChange={(d) => setEmpRegForm({ ...empRegForm, hireDate: d })}
                        placeholder="입사일자 선택"
                        width="100%"
                        height="42px"
                      />
                    </div>
                  </div>

                  {/* 6. 연락처 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      연락처
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      value={empRegForm.phone}
                      onChange={(e) => setEmpRegForm({ ...empRegForm, phone: e.target.value })}
                      placeholder="연락처를 입력하세요 (예: 010-1234-5678)"
                      style={{ height: '42px', flex: 1, fontSize: '15px' }}
                    />
                  </div>

                  {/* 7. 이메일 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      이메일
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      value={empRegForm.email}
                      onChange={(e) => setEmpRegForm({ ...empRegForm, email: e.target.value })}
                      placeholder="이메일을 입력하세요 (예: user@company.com)"
                      style={{ height: '42px', flex: 1, fontSize: '15px' }}
                    />
                  </div>
                </div>

                {/* Footer Submit Button (Designated Drawer Button Style, No Cancel Button) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  marginTop: 'auto',
                  paddingTop: '2rem'
                }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmittingEmpReg}
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '16px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {isSubmittingEmpReg ? '등록 중...' : '사원 등록 완료'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: CLIENT REGISTRATION (고객사 관리 내 전용 고객사 등록 슬라이드 패널) */}
      {showClientRegDrawer && (
        <div 
          className={`detail-backdrop ${isClientRegClosing ? 'closing' : ''}`}
          onClick={handleCloseClientRegDrawer}
        >
          <div 
            className={`detail-slide-drawer drawer-md ${isClientRegClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div style={{
              padding: '1.75rem 2.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 600,
                margin: 0,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em'
              }}>
                고객사 등록
              </h2>
              <button
                type="button"
                onClick={handleCloseClientRegDrawer}
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

            {/* Body */}
            <div style={{ flex: 1, padding: '2rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>
              <form onSubmit={handleSubmitClientReg} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  {/* 1. 연결 계정 선택 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '110px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      연결 계정
                    </span>
                    <select
                      className="form-control"
                      value={clientRegForm.clientId}
                      onChange={(e) => handleSelectAccountForClientReg(e.target.value)}
                      required
                      style={{ height: '42px', flex: 1, fontSize: '15px' }}
                    >
                      <option value="" disabled>고객사 계정을 선택하세요</option>
                      {clients.map(cli => (
                        <option key={cli.id} value={cli.id}>
                          @{cli.username} · {cli.companyName} {cli.bizNo ? `(${cli.bizNo})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. 회사명 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '110px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      회사명
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      value={clientRegForm.companyName}
                      onChange={(e) => setClientRegForm({ ...clientRegForm, companyName: e.target.value })}
                      placeholder="회사명을 입력하세요"
                      required
                      style={{ height: '42px', flex: 1, fontSize: '15px' }}
                    />
                  </div>

                  {/* 3. 전담 담당자 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '110px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      전담 담당자
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      value={clientRegForm.managerName}
                      onChange={(e) => setClientRegForm({ ...clientRegForm, managerName: e.target.value })}
                      placeholder="담당자명을 입력하세요 (예: 홍길동 부장)"
                      style={{ height: '42px', flex: 1, fontSize: '15px' }}
                    />
                  </div>

                  {/* 4. 담당자 연락처 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '110px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      연락처
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      value={clientRegForm.phone}
                      onChange={(e) => setClientRegForm({ ...clientRegForm, phone: e.target.value })}
                      placeholder="연락처를 입력하세요 (예: 010-1234-5678)"
                      style={{ height: '42px', flex: 1, fontSize: '15px' }}
                    />
                  </div>

                  {/* 5. 사업자등록번호 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '110px', fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      사업자번호
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      value={clientRegForm.bizNo}
                      onChange={(e) => setClientRegForm({ ...clientRegForm, bizNo: e.target.value })}
                      placeholder="사업자등록번호 (예: 123-45-67890)"
                      style={{ height: '42px', flex: 1, fontSize: '15px' }}
                    />
                  </div>
                </div>

                {/* Footer Submit Button (Designated Drawer Button Style, No Cancel Button) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  marginTop: 'auto',
                  paddingTop: '2rem'
                }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmittingClientReg}
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '16px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {isSubmittingClientReg ? '등록 중...' : '고객사 등록 완료'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 5: CLIENT DETAIL (고객사 상세 정보 슬라이드 패널) */}
      {selectedClient && (
        <div 
          className={`detail-backdrop ${isClientDetailClosing ? 'closing' : ''}`}
          onClick={handleCloseClientDetail}
        >
          <div 
            className={`detail-slide-drawer drawer-md ${isClientDetailClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              padding: '1.75rem 2rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  고객사 상세 정보
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseClientDetail}
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  고객사 계정 프로필
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>회사명</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedClient.companyName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>접속 로그인 아이디</span>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedClient.username}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>전담 담당자</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{selectedClient.managerName || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>담당자 연락처</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{selectedClient.phone || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>사업자등록번호</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{selectedClient.bizNo || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>등록일자</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{selectedClient.createdAt}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>계정 접속 상태</span>
                    <span style={{ fontWeight: 600, color: selectedClient.status === 'ACTIVE' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {selectedClient.status === 'ACTIVE' ? '정상 활성' : '접속 중지'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Action Card */}
              <div style={{
                border: '1px solid var(--border-color)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  계정 접근 제어
                </div>
                <p className="text-secondary" style={{ fontSize: '16px', margin: 0, lineHeight: 1.6 }}>
                  {selectedClient.status === 'ACTIVE' 
                    ? '현재 고객사는 포털에 로그인하여 업무 요청 및 협업을 진행할 수 있습니다.' 
                    : '현재 고객사의 포털 로그인이 차단되어 있습니다.'}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseClientDetail}
                    style={{ borderRadius: 0 }}
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedClient.status === 'ACTIVE' ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => handleToggleClientStatus(selectedClient)}
                    style={{ borderRadius: 0 }}
                  >
                    {selectedClient.status === 'ACTIVE' ? '접속 중지 상태로 변경' : '정상 활성 상태로 변경'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 6: NETWORK DETAIL (네트워크 설정 상세 슬라이드 패널) */}
      {selectedNet && (
        <div 
          className={`detail-backdrop ${isNetDetailClosing ? 'closing' : ''}`}
          onClick={handleCloseNetDetail}
        >
          <div 
            className={`detail-slide-drawer drawer-md ${isNetDetailClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              padding: '1.75rem 2rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  사내 네트워크 상세 정보
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseNetDetail}
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  네트워크 인증 규칙
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>구분</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedNet.type === 'WIFI' ? '사내 Wi-Fi SSID' : '공인 IP 대역'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>식별명</span>
                    <span style={{ color: 'var(--text-primary)' }}>{selectedNet.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>설정값</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{selectedNet.value}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>등록일자</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{selectedNet.createdAt}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseNetDetail}
                  style={{ borderRadius: 0 }}
                >
                  닫기
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleDeleteNetwork(selectedNet.id)}
                  style={{ borderRadius: 0, color: '#ef4444' }}
                >
                  네트워크 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 7: ATTENDANCE DETAIL (출퇴근 근태 상세 내역 슬라이드 패널) */}
      {selectedAttendance && (
        <div 
          className={`detail-backdrop ${isAttDetailClosing ? 'closing' : ''}`}
          onClick={handleCloseAttDetail}
        >
          <div 
            className={`detail-slide-drawer drawer-md ${isAttDetailClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              padding: '1.75rem 2rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  출퇴근 근태 상세 내역
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseAttDetail}
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  당일 근무 및 인증 정보
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>근무일자</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedAttendance.date}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>출근 기록 시각</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedAttendance.checkIn ? selectedAttendance.checkIn.slice(0, 5) : '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>퇴근 기록 시각</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{selectedAttendance.checkOut ? selectedAttendance.checkOut.slice(0, 5) : '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>실근무시간</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedAttendance.workHours || 0}시간</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>근무 형태</span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {selectedAttendance.workType === 'OFFICE' ? '사내정상' : (selectedAttendance.workType === 'REMOTE' ? '재택근무' : '외근/출장')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>사내망 인증 여부</span>
                    <span style={{ fontWeight: 600, color: selectedAttendance.isCompanyNetwork ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {selectedAttendance.isCompanyNetwork ? '사내망 일치 (정상)' : '사외 접속'}
                    </span>
                  </div>
                  {selectedAttendance.reason && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>신청 사유 / 메모</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{selectedAttendance.reason}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseAttDetail}
                  style={{ borderRadius: 0, padding: '0.65rem 1.5rem' }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: ANNOUNCEMENT REGISTER & EDIT (사내 공지 배너 등록/수정 슬라이드 드로어) */}
      {showAnnoDrawer && (
        <div 
          className={`detail-backdrop ${isAnnoClosing ? 'closing' : ''}`}
          onClick={handleCloseAnnoDrawer}
        >
          <div 
            className={`detail-slide-drawer drawer-md ${isAnnoClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {/* Header: Title & Close button */}
            <div style={{
              padding: '1.75rem 2.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {editingAnno ? '사내 공지 배너 수정' : '신규 공지 배너 등록'}
              </h3>
              <button
                type="button"
                onClick={handleCloseAnnoDrawer}
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

            {/* Body */}
            <div style={{ flex: 1, padding: '1.75rem 2.25rem 2.25rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>
              <form onSubmit={handleSaveAnnouncement} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1.75rem' }}>
                {/* Hero Title: 공지 제목 */}
                <div>
                  <label style={{ display: 'block', fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    공지 제목 *
                  </label>
                  <input
                    type="text"
                    required
                    value={annoForm.title}
                    onChange={(e) => setAnnoForm({ ...annoForm, title: e.target.value })}
                    placeholder="하단 롤링 배너에 표시될 공지 제목을 입력하세요"
                    style={{
                      width: '100%',
                      fontSize: '20px',
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.4,
                      color: 'var(--text-primary)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      padding: '0.75rem 1rem',
                      outline: 'none',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                {/* Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ display: 'block', fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    공지 상세 내용 (선택)
                  </label>
                  <textarea
                    value={annoForm.content}
                    onChange={(e) => setAnnoForm({ ...annoForm, content: e.target.value })}
                    placeholder="공지 세부 내용 또는 추가 전달 사항을 입력하세요"
                    style={{
                      width: '100%',
                      height: '160px',
                      fontSize: '16px',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      padding: '0.75rem 1rem',
                      outline: 'none',
                      resize: 'none',
                      borderRadius: '4px',
                      lineHeight: 1.6
                    }}
                  />
                </div>

                {/* Display Status Custom Checkbox (Strict Universal CustomCheckbox Rule) */}
                <div style={{ padding: '0.5rem 0' }}>
                  <CustomCheckbox
                    checked={annoForm.isActive}
                    onChange={(checked) => setAnnoForm({ ...annoForm, isActive: checked })}
                    label="하단 롤링 배너에 실시간으로 즉시 노출"
                  />
                </div>

                {/* Footer Button (No Cancel Button) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1.25rem',
                  marginTop: 'auto'
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
                    {editingAnno ? '수정 저장' : '공지 등록'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 1: APPROVALS & ATTENDANCE (결재 및 당일 근태) */}
      {activeTab === 'approvals' && (
        <div style={{ paddingTop: '0.5rem', width: '100%' }}>
          {/* 결재 대기 문서 검토 */}
          <div style={{
            marginBottom: '2.5rem',
            paddingBottom: '2rem',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                결재 대기 문서 ({pendingApprovals.length}건)
              </h3>
            </div>

            {pendingApprovals.length === 0 ? (
              <div style={{ padding: '2rem 0', color: 'var(--text-muted)', fontSize: '16px' }}>
                결재 대기 중인 문서가 없습니다.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '16px',
                  textAlign: 'left'
                }}>
                  <thead>
                    <tr style={{
                      borderBottom: '1px solid var(--border-color)',
                      borderTop: '1px solid var(--border-color)',
                      background: 'var(--bg-card)'
                    }}>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)', whiteSpace: 'nowrap', width: '20%' }}>신청자</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)', whiteSpace: 'nowrap', width: '15%' }}>구분</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)', whiteSpace: 'nowrap', width: '18%' }}>일자</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>사유</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)', textAlign: 'center', whiteSpace: 'nowrap', width: '160px' }}>결재 처리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingApprovals.map(item => {
                      const typeLabel = item.leaveType === 'REMOTE' ? '재택근무'
                        : (item.leaveType === 'FIELD' ? '외근'
                        : (item.leaveType === 'TRIP' ? '출장'
                        : (item.leaveType === 'OVERTIME' ? '추가근무'
                        : (item.leaveType === 'HOLIDAY_WORK' ? '연휴근무'
                        : (item.timeSlot === 'AM' ? '오전반차'
                        : (item.timeSlot === 'PM' ? '오후반차' : '연차'))))));

                      const dateDisplay = item.startDate === item.endDate || !item.endDate
                        ? item.startDate
                        : `${item.startDate} ~ ${item.endDate}`;

                      const isCancelReq = item.status === 'CANCEL_REQUESTED';

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid var(--border-color)'
                          }}
                        >
                          <td style={{ padding: '0.95rem 1rem', fontSize: '16px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 600 }}>{item.userName}</span>
                            <span style={{ color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>({item.dept})</span>
                          </td>
                          <td style={{ padding: '0.95rem 1rem', fontSize: '16px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 600 }}>{typeLabel}</span>
                            {isCancelReq && (
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.4rem', fontWeight: 600 }}>
                                [취소 요청]
                              </span>
                            )}
                            {Array.isArray(item.approvers) && item.approvers.length > 0 && (
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                [{item.approvers.filter(a => a.status === 'APPROVED').length}/{item.approvers.length} 승인 진행 중]
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.95rem 1rem', fontSize: '16px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {dateDisplay}
                          </td>
                          <td style={{ padding: '0.95rem 1rem', fontSize: '16px', color: 'var(--text-secondary)' }}>
                            {item.reason || '-'}
                          </td>
                          <td style={{ padding: '0.95rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                              {isCancelReq ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => handlePortalApproval(item.id, 'CANCELLED')}
                                    style={{
                                      height: '38px',
                                      padding: '0 1rem',
                                      fontSize: '16px',
                                      fontWeight: 600,
                                      borderRadius: 0
                                    }}
                                  >
                                    취소 승인
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => handlePortalApproval(item.id, 'APPROVED')}
                                    style={{
                                      height: '38px',
                                      padding: '0 1rem',
                                      fontSize: '16px',
                                      fontWeight: 600,
                                      borderRadius: 0
                                    }}
                                  >
                                    취소 반려
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => handlePortalApproval(item.id, 'APPROVED')}
                                    style={{
                                      height: '38px',
                                      padding: '0 1.2rem',
                                      fontSize: '16px',
                                      fontWeight: 600,
                                      borderRadius: 0
                                    }}
                                  >
                                    승인
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => handlePortalApproval(item.id, 'REJECTED')}
                                    style={{
                                      height: '38px',
                                      padding: '0 1.2rem',
                                      fontSize: '16px',
                                      fontWeight: 600,
                                      borderRadius: 0
                                    }}
                                  >
                                    반려
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <AdminAttendanceSection
            user={user}
            employees={employees}
            onShowToast={onShowToast}
            onRefresh={loadData}
          />
        </div>
      )}

    </div>
  );
}
