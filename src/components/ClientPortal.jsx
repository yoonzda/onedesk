import React, { useState, useEffect, useRef } from 'react';
import { Plus, RotateCcw, Search, X } from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';
import CustomCheckbox from './CustomCheckbox';
import HtmlEditor from './HtmlEditor';

function formatFileName(name) {
  if (!name) return '첨부파일';
  try {
    const decoded = decodeURIComponent(escape(name));
    if (decoded) return decoded;
  } catch (e) {}
  return name;
}

function formatHtmlContent(content) {
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
}

export default function ClientPortal({ 
  user, 
  onShowToast,
  onGoHome,
  onUpdateUser,
  targetRequestId = null,
  onClearTargetRequestId = null,
  activeSubTab = 'ALL'
}) {
  const [activeTab, setActiveTab] = useState('ALL'); // ALL (전체), IN_PROGRESS (진행 중), REVIEW (확인 요청), DONE (작업 완료)
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const [comments, setComments] = useState([]);
  
  // New Request Slide Drawer State (신규 업무 요청 패널)
  const [showNewDrawer, setShowNewDrawer] = useState(false);
  const [isNewDrawerClosing, setIsNewDrawerClosing] = useState(false);

  // Edit Request State (요청 상태에서만 수정 지원)
  const [isEditingReq, setIsEditingReq] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    desiredDate: '',
    priority: 'NORMAL'
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleOpenDrawer = (req) => {
    setIsDrawerClosing(false);
    setSelectedReq(req);
    setIsEditingReq(false);
  };

  const handleCloseDrawer = () => {
    if (isDrawerClosing) return;
    setIsDrawerClosing(true);
    setTimeout(() => {
      setSelectedReq(null);
      setIsEditingReq(false);
      setIsDrawerClosing(false);
    }, 220);
  };

  const handleStartEdit = () => {
    if (!selectedReq) return;
    setEditForm({
      title: selectedReq.title || '',
      content: selectedReq.content || '',
      desiredDate: selectedReq.desiredDate || '',
      priority: selectedReq.priority || 'NORMAL'
    });
    setIsEditingReq(true);
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editForm.title.trim() || !editForm.content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/client-requests/${selectedReq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('요청 수정 완료', '요청 내용이 성공적으로 수정되었습니다.');
        setSelectedReq(prev => ({ ...prev, ...editForm }));
        setIsEditingReq(false);
        loadRequests();
      } else {
        alert(data.message || '수정 중 오류가 발생했습니다.');
      }
    } catch (err) {
      alert('서버 통신 오류가 발생했습니다.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenNewDrawer = () => {
    setIsNewDrawerClosing(false);
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

  // Settings Slide Drawer State (담당자 정보 수정 패널)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSettingsClosing, setIsSettingsClosing] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    managerName: user?.managerName || '',
    phone: user?.phone || '',
    bizNo: user?.bizNo || '',
    password: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const handleCloseSettingsDrawer = () => {
    if (isSettingsClosing) return;
    setIsSettingsClosing(true);
    setTimeout(() => {
      setShowSettingsModal(false);
      setIsSettingsClosing(false);
    }, 220);
  };

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 360);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  // Pagination / Load More (더보기)
  const [visibleCount, setVisibleCount] = useState(10);
  const [doneSubFilter, setDoneSubFilter] = useState('ALL'); // 'ALL' | 'UNCONFIRMED'

  // New Request Form
  const clientFileInputRef = useRef(null);
  const [newForm, setNewForm] = useState({
    title: '',
    content: '',
    priority: 'NORMAL',
    desiredDate: '',
    attachments: []
  });

  // Comment Form
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const loadRequests = async () => {
    try {
      const res = await fetch(`/api/client-requests?clientId=${user.id}&role=CLIENT`);
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Client Confirm Completed Request (안내 창 확인 후 완료 확정 처리, 해제 불가)
  const handleConfirmRequest = async (reqId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!window.confirm('작업 내역을 확인 완료 처리하시겠습니까?\n확인 완료 후에는 완료가 확정되어 다시 되돌릴 수 없습니다.')) {
      return;
    }
    try {
      const res = await fetch(`/api/client-requests/${reqId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmed: true,
          confirmedBy: user?.managerName || user?.name || '고객사'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('작업 내역이 확인 완료되었습니다.\n[작업 완료] 탭으로 이동되었습니다.');
        loadRequests();
        setIsDrawerClosing(true);
        setTimeout(() => {
          setSelectedReq(null);
          setIsDrawerClosing(false);
          setActiveTab('DONE');
        }, 200);
      } else {
        alert(data.message || '처리 실패');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Client Reopen Request (보완 / 재요청 사유 입력 후 진행 중 탭으로 복귀)
  const handleReopenRequest = async (reqId) => {
    const reason = window.prompt(
      '보완 또는 재요청 사유를 입력해주세요:\n(입력하신 사유가 사내 담당자에게 전달되어 다시 작업이 진행됩니다)'
    );
    if (reason === null) return; // 취소 클릭
    const trimmedReason = reason.trim() || '추가 보완 및 수정 요청';

    try {
      const res = await fetch(`/api/client-requests/${reqId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: trimmedReason,
          requestedBy: user?.managerName || user?.name || '고객사'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('보완 재요청이 정상 접수되었습니다.\n[진행 중] 탭으로 이동되었습니다.');
        loadRequests();
        setIsDrawerClosing(true);
        setTimeout(() => {
          setSelectedReq(null);
          setIsDrawerClosing(false);
          setActiveTab('IN_PROGRESS');
        }, 200);
      } else {
        alert(data.message || '재요청 처리 실패');
      }
    } catch (err) {
      console.error(err);
      alert('재요청 처리 중 오류가 발생했습니다.');
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
    loadRequests();
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (selectedReq) {
      loadComments(selectedReq.id);
    }
  }, [selectedReq]);

  const handledTargetRequestIdRef = useRef(null);

  useEffect(() => {
    if (!targetRequestId) {
      handledTargetRequestIdRef.current = null;
      return;
    }
    if (handledTargetRequestIdRef.current === targetRequestId) {
      return;
    }

    const openTarget = (req) => {
      handledTargetRequestIdRef.current = targetRequestId;
      setSelectedReq(req);
      setIsDrawerClosing(false);
      loadComments(req.id);
      if (req.status === 'DONE' && req.clientConfirmed) setActiveTab('DONE');
      else if (req.status === 'DONE' && !req.clientConfirmed) setActiveTab('REVIEW');
      else setActiveTab('IN_PROGRESS');
      if (onClearTargetRequestId) {
        onClearTargetRequestId();
      }
    };

    const found = requests.find(r => r.id === targetRequestId);
    if (found) {
      openTarget(found);
    } else {
      fetch(`/api/client-requests?clientId=${user.id}&role=CLIENT`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setRequests(data);
            const req = data.find(r => r.id === targetRequestId);
            if (req) openTarget(req);
          }
        })
        .catch(console.error);
    }
  }, [targetRequestId, requests]);

  // File Upload Handler
  const handleFileUpload = async (e, isComment = false) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        if (isComment) {
          setCommentAttachments(prev => [...prev, data.file]);
        } else {
          setNewForm(prev => ({
            ...prev,
            attachments: [...prev.attachments, data.file]
          }));
        }
        onShowToast('파일 업로드 완료', `${data.file.name} 파일이 첨부되었습니다.`);
      }
    } catch (err) {
      alert('파일 업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  // Clipboard Paste Handler for Comment Images (이미지 캡처 붙여넣기 지원)
  const handleCommentPaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const customFile = new File([file], `capture_${Date.now()}.png`, { type: file.type });
        setUploading(true);
        const formData = new FormData();
        formData.append('file', customFile);

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (data.success) {
            setCommentAttachments(prev => [...prev, data.file]);
            onShowToast('이미지 붙여넣기 완료', '캡처 이미지가 첨부되었습니다.');
          }
        } catch (err) {
          alert('이미지 업로드 실패');
        } finally {
          setUploading(false);
        }
      }
    }
  };

  // Submit Request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!newForm.title || !newForm.content) {
      alert('제목과 내용을 모두 입력하세요.');
      return;
    }

    try {
      const res = await fetch('/api/client-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newForm,
          clientId: user.id,
          clientName: user.companyName
        })
      });
      const data = await res.json();

      if (data.success) {
        onShowToast('요청 등록 완료', '요청사항이 사내 담당자에게 전달되었습니다.');
        setShowNewDrawer(false);
        setNewForm({
          title: '',
          content: '',
          priority: 'NORMAL',
          desiredDate: '',
          attachments: []
        });
        loadRequests();
      }
    } catch (err) {
      alert('요청 등록 오류');
    }
  };

  // Submit Comment / Reply
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() && commentAttachments.length === 0) return;

    try {
      const res = await fetch(`/api/client-requests/${selectedReq.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: user.id,
          authorName: user.managerName || user.name || '담당자',
          authorRole: 'CLIENT',
          content: commentText.trim(),
          attachments: commentAttachments
        })
      });
      const data = await res.json();

      if (data.success) {
        setCommentText('');
        setCommentAttachments([]);
        loadComments(selectedReq.id);
        onShowToast('답글 등록 완료', '답글이 성공적으로 등록되었습니다.');
      }
    } catch (err) {
      alert('답글 등록 오류');
    }
  };

  const handleOpenSettings = () => {
    setSettingsForm({
      managerName: user?.managerName || '',
      phone: user?.phone || '',
      bizNo: user?.bizNo || '',
      password: ''
    });
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!settingsForm.managerName.trim()) {
      alert('담당자 이름을 입력해주세요.');
      return;
    }
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/clients/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm)
      });
      const data = await res.json();
      if (data.success) {
        if (onUpdateUser) onUpdateUser(data.client);
        onShowToast('정보 수정 완료', '담당자 정보가 성공적으로 변경되었습니다.');
        handleCloseSettingsDrawer();
      } else {
        alert(data.message || '정보 수정 중 오류가 발생했습니다.');
      }
    } catch (err) {
      alert('서버 통신 오류가 발생했습니다.');
    } finally {
      setSavingSettings(false);
    }
  };

  // 3개 탭 구성 (진행 중 / 확인 요청 🔴 / 작업 완료)
  const rawInProgress = requests
    .filter(r => r.status !== 'DONE')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const rawReview = requests
    .filter(r => r.status === 'DONE' && !r.clientConfirmed)
    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));

  const rawDone = requests
    .filter(r => r.status === 'DONE' && r.clientConfirmed)
    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));

  const unconfirmedReviewCount = rawReview.length;

  const filterList = (list) => {
    return list.filter(r => {
      const matchKeyword = !searchTerm.trim() ||
        (r.title && r.title.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (r.content && r.content.toLowerCase().includes(searchTerm.toLowerCase().trim()));

      const matchDate = !selectedDate || 
        (activeTab === 'DONE' 
          ? (r.completedAt && r.completedAt.startsWith(selectedDate)) 
          : (r.createdAt && r.createdAt.startsWith(selectedDate)));
      return matchKeyword && matchDate;
    });
  };

  const filteredAll = filterList([...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  const filteredInProgress = filterList(rawInProgress);
  const filteredReview = filterList(rawReview);
  const filteredDone = filterList(rawDone);

  const getCurrentList = () => {
    switch (activeTab) {
      case 'ALL': return filteredAll;
      case 'IN_PROGRESS': return filteredInProgress;
      case 'REVIEW': return filteredReview;
      case 'DONE': return filteredDone;
      default: return filteredAll;
    }
  };

  const currentList = getCurrentList();
  const displayedList = currentList.slice(0, visibleCount);
  const hasMore = currentList.length > visibleCount;

  // Collect dates that have requests in current tab (완료 탭: 완료일 기준, 그 외 탭: 등록일 기준)
  const currentRawList = activeTab === 'ALL' ? requests
    : activeTab === 'IN_PROGRESS' ? rawInProgress
    : activeTab === 'REVIEW' ? rawReview
    : rawDone;

  const currentRequestDates = currentRawList
    .map(r => (activeTab === 'DONE' ? r.completedAt : r.createdAt)?.slice(0, 10))
    .filter(Boolean);

  // 다른 탭으로 전환 시 검색 조건(검색어, 날짜) 자동 초기화
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedReq(null);
    setVisibleCount(10);
    setSearchTerm('');
    setSelectedDate('');
  };

  const getStatusLabel = (item) => {
    if (!item) return '';
    const status = typeof item === 'string' ? item : item.status;
    switch (status) {
      case 'REQUESTED': return '요청';
      case 'RECEIVED': return '접수 완료';
      case 'IN_PROGRESS': return '진행 중';
      case 'REOPENED': return '재요청';
      case 'DONE': return '작업 완료';
      default: return status || '';
    }
  };

  return (
    <div>
      {/* Welcome Banner */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>
            {user.companyName} 전용 협업 포털
          </h2>
          <p className="text-secondary" style={{ marginTop: '0.35rem', fontSize: '16px' }}>
            담당자: {user.managerName} {user.phone ? `(${user.phone})` : ''} | 실시간 업무 요청 및 처리 현황 관리
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Settings / Info Edit Button - Flat Monochrome Standard */}
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={handleOpenSettings}
          >
            담당자 정보 설정
          </button>

          <button 
            type="button"
            className="btn btn-primary"
            onClick={handleOpenNewDrawer}
          >
            신규 업무 요청 작성
          </button>
        </div>
      </div>

      {/* Search & Date Filter Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '0.85rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '0',
        position: 'relative',
        zIndex: 20
      }}>
        {/* Left: Status Filter Pills (전체 | 진행 중 | 확인 요청 | 작업 완료) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: '전체' },
            { id: 'IN_PROGRESS', label: '진행 중' },
            { id: 'REVIEW', label: '확인 요청' },
            { id: 'DONE', label: '작업 완료' }
          ].map(f => {
            const isSelected = activeTab === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleTabChange(f.id)}
                style={{
                  padding: '0.4rem 1.05rem',
                  borderRadius: '9999px',
                  border: isSelected ? '1px solid var(--text-muted)' : '1px solid var(--border-color)',
                  backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: 'none'
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Right: Unified Minimal Icon Toolbar (Search Toggle + Date Picker + Reset Icon) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.4rem' }}>
          {/* 1. 검색 아이콘 버튼 (전폭 리본 바 토글) */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="검색 (전폭 검색 바 토글)"
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: (isSearchOpen || searchTerm) ? 'var(--text-primary)' : 'var(--text-secondary)',
              opacity: (isSearchOpen || searchTerm) ? 1 : 0.72,
              outline: 'none',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = (isSearchOpen || searchTerm) ? 'var(--text-primary)' : 'var(--text-secondary)';
              e.currentTarget.style.opacity = (isSearchOpen || searchTerm) ? 1 : 0.72;
            }}
          >
            <Search size={22} strokeWidth={2} />
          </button>

          {/* 2. 완료일 / 등록일 선택 달력 아이콘 */}
          <CustomDatePicker 
            value={selectedDate}
            onChange={(val) => { setSelectedDate(val); setVisibleCount(10); }}
            requestDates={currentRequestDates}
            placeholder={activeTab === 'DONE' ? '완료일 선택' : '등록일 선택'}
            iconOnly={true}
            align="right"
          />

          {/* 3. 필터 초기화 아이콘 */}
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedDate('');
              setVisibleCount(10);
            }}
            title="필터 초기화"
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: (searchTerm || selectedDate) ? 'var(--text-primary)' : 'var(--text-secondary)',
              opacity: (searchTerm || selectedDate) ? 1 : 0.55,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = (searchTerm || selectedDate) ? 'var(--text-primary)' : 'var(--text-secondary)';
              e.currentTarget.style.opacity = (searchTerm || selectedDate) ? '1' : '0.55';
            }}
          >
            <RotateCcw size={22} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Option 2: Full-Width Search Ribbon Bar (부드러운 하드웨어 가속 슬라이드) */}
      <div
        style={{
          height: isSearchOpen ? '84px' : '0px',
          opacity: isSearchOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'height 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease',
          marginBottom: '1.5rem',
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
              onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(10); }}
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
                  setVisibleCount(10);
                }
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {searchTerm.trim() && (
              <span style={{ fontSize: '15px', color: 'var(--text-muted)', whiteSpace: 'nowrap', userSelect: 'none', fontWeight: 400 }}>
                {currentList.length}건
              </span>
            )}
            <button
              type="button"
              tabIndex={isSearchOpen ? 0 : -1}
              onClick={() => {
                setIsSearchOpen(false);
                setSearchTerm('');
                setVisibleCount(10);
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

      {/* Main Request List (Full Width, No Radius, Table Header) */}
      <div>
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 0 }}>
          
          {/* Table Header (번호 42px 컴팩트화, 여백 최적화) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1.05rem 1.25rem',
            background: 'var(--bg-card-hover)',
            borderBottom: '2px solid var(--border-color)',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em'
          }}>
            <span style={{ width: '42px', flexShrink: 0, textAlign: 'center' }}>번호</span>
            <span style={{ flex: 1, minWidth: 0, paddingLeft: '0.5rem' }}>제목</span>
            <span style={{ width: activeTab === 'DONE' ? '130px' : '120px', flexShrink: 0, textAlign: 'center' }}>
              등록일
            </span>
            {activeTab === 'IN_PROGRESS' && (
              <span style={{ width: '110px', flexShrink: 0, textAlign: 'center' }}>상태</span>
            )}
            {activeTab === 'REVIEW' && (
              <span style={{ width: '70px', flexShrink: 0, textAlign: 'center' }}>확인</span>
            )}
            {activeTab === 'DONE' && (
              <span style={{ width: '130px', flexShrink: 0, textAlign: 'center' }}>완료일</span>
            )}
          </div>

          {displayedList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '16px' }}>
                {searchTerm || selectedDate 
                  ? '검색 조건과 일치하는 요청이 없습니다.' 
                  : (activeTab === 'IN_PROGRESS' ? '현재 진행 중인 요청이 없습니다.'
                    : activeTab === 'REVIEW' ? '확인 대기 중인 작업이 없습니다. 모든 작업이 검수 완료되었습니다.'
                    : '완료된 작업 히스토리가 없습니다.')}
              </p>
              {(searchTerm || selectedDate) && (
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => { setSearchTerm(''); setSelectedDate(''); }}
                  style={{ marginTop: '0.85rem', borderRadius: 0 }}
                >
                  필터 초기화
                </button>
              )}
            </div>
          ) : (
            <div>
              {displayedList.map((req, idx) => {
                const isSelected = selectedReq && selectedReq.id === req.id;
                const isLast = idx === displayedList.length - 1;
                return (
                  <div
                    key={req.id}
                    className="client-req-item"
                    onClick={() => handleOpenDrawer(req)}
                    style={{
                      padding: '1.1rem 1.25rem',
                      cursor: 'pointer',
                      borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'var(--transition)'
                    }}
                  >
                    {/* 1. 번호 (No.) - 컴팩트 42px */}
                    <span style={{
                      width: '42px',
                      flexShrink: 0,
                      textAlign: 'center',
                      fontSize: '15px',
                      fontWeight: 500,
                      color: 'var(--text-secondary)'
                    }}>
                      {currentList.length - idx}
                    </span>

                    {/* 2. 제목 (긴급 인디케이터 + 제목 텍스트) */}
                    <div style={{
                      flex: 1,
                      minWidth: 0,
                      paddingLeft: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {req.priority === 'HIGH' && (
                        req.status === 'DONE' ? (
                          <span className="urgent-dot-done" title="긴급 (작업 완료)" />
                        ) : (
                          <span className="urgent-dot" title="긴급" />
                        )
                      )}
                      <span style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {req.title}
                      </span>
                    </div>

                    {/* 3. 등록일 - 15px */}
                    <span style={{
                      width: activeTab === 'DONE' ? '130px' : '120px',
                      flexShrink: 0,
                      textAlign: 'center',
                      fontSize: '15px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap'
                    }}>
                      {req.createdAt?.slice(0, 10)}
                    </span>

                    {/* 4. 상태 (진행 중 탭 전용: 요청 / 접수 완료 / 진행 중) */}
                    {activeTab === 'IN_PROGRESS' && (
                      <span style={{
                        width: '110px',
                        flexShrink: 0,
                        textAlign: 'center',
                        fontSize: '15px',
                        fontWeight: req.status === 'IN_PROGRESS' || req.status === 'RECEIVED' ? 600 : 500,
                        color: req.status === 'IN_PROGRESS' 
                          ? '#3b82f6' 
                          : (req.status === 'RECEIVED' ? 'var(--text-primary)' : 'var(--text-secondary)'),
                        whiteSpace: 'nowrap'
                      }}>
                        {getStatusLabel(req)}
                      </span>
                    )}

                    {/* 5. 확인 액션 (확인 요청 탭 전용: 전사 표준 CustomCheckbox 사각 체크박스) */}
                    {activeTab === 'REVIEW' && (
                      <div 
                        style={{
                          width: '70px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CustomCheckbox
                          checked={false}
                          onChange={(e) => handleConfirmRequest(req.id, e)}
                          size={18}
                        />
                      </div>
                    )}

                    {/* 6. 완료일 (작업 완료 탭 전용) */}
                    {activeTab === 'DONE' && (
                      <span style={{
                        width: '130px',
                        flexShrink: 0,
                        textAlign: 'center',
                        fontSize: '15px',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap'
                      }}>
                        {req.completedAt?.slice(0, 10) || req.createdAt?.slice(0, 10)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Separated Load More Button */}
        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setVisibleCount(prev => prev + 10)}
              style={{ minWidth: '160px', padding: '0.65rem 2rem', fontSize: '15px', borderRadius: 0 }}
            >
              더보기
            </button>
          </div>
        )}
      </div>

      {/* Slide-over Detail Drawer Panel */}
      {selectedReq && (
        <>
          <div
            className={`detail-backdrop ${isDrawerClosing ? 'closing' : ''}`}
            onClick={handleCloseDrawer}
          />

          <div className={`detail-slide-drawer ${isDrawerClosing ? 'closing' : ''}`}>
            <div style={{
              padding: '2.5rem 2.5rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem',
              flex: 1
            }}>
              {/* 1. Large Title & Unboxed Properties / Edit Form */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '1.25rem'
                }}>
                  <h2 style={{
                    fontSize: '22px',
                    fontWeight: 400,
                    color: 'var(--text-primary)',
                    lineHeight: 1.4,
                    wordBreak: 'keep-all',
                    margin: 0,
                    flex: 1
                  }}>
                    {selectedReq.title}
                  </h2>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    {/* Edit button: only visible in requested state (before in-progress) and when not editing */}
                    {(selectedReq.status === 'REQUESTED' || selectedReq.status === 'RECEIVED') && !isEditingReq && (
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="btn btn-secondary btn-sm"
                        style={{
                          borderRadius: 0,
                          padding: '0.45rem 1rem',
                          fontSize: '15px',
                          fontWeight: 400
                        }}
                      >
                        수정
                      </button>
                    )}

                    {/* Close button - Crisp SVG matching logout icon without background hover change */}
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
                        borderRadius: '4px',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>

                {isEditingReq ? (
                  /* Edit Mode Form (라벨 17px 확대 및 각 항목 한 줄 독립 배치) */
                  <form onSubmit={handleSaveEdit} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.75rem',
                    padding: '1.5rem',
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '1.75rem'
                  }}>
                    {/* 1. 제목 (한 줄) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <label style={{ width: '120px', flexShrink: 0, fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)' }}>
                        제목
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        style={{ flex: 1, height: '48px', fontSize: '16px', borderRadius: 0 }}
                      />
                    </div>

                    {/* 2. 우선 요청 (한 줄 독립 배치) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <label style={{ width: '120px', flexShrink: 0, fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)' }}>
                        우선 요청
                      </label>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <CustomCheckbox
                          checked={editForm.priority === 'HIGH'}
                          onChange={(checked) => setEditForm({ ...editForm, priority: checked ? 'HIGH' : 'NORMAL' })}
                          size={20}
                        />
                      </div>
                    </div>

                    {/* 3. 희망일 (한 줄 독립 배치) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <label style={{ width: '120px', flexShrink: 0, fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)' }}>
                        희망일
                      </label>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <CustomDatePicker
                          value={editForm.desiredDate}
                          onChange={(val) => setEditForm({ ...editForm, desiredDate: val })}
                          placeholder="희망 완료일 선택"
                          minDate={getTodayStr()}
                        />
                      </div>
                    </div>

                    {/* 4. 요청 상세 (한 줄 라벨 + 아래 에디터) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)' }}>
                        요청 상세
                      </label>
                      <HtmlEditor
                        value={editForm.content}
                        onChange={(html) => setEditForm(prev => ({ ...prev, content: html }))}
                        placeholder=""
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setIsEditingReq(false)}
                        style={{ borderRadius: 0, padding: '0.6rem 1.4rem', fontSize: '15px' }}
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="btn btn-primary"
                        style={{
                          borderRadius: 0,
                          padding: '0.6rem 1.75rem',
                          fontSize: '15px',
                          fontWeight: 400,
                          cursor: 'pointer'
                        }}
                      >
                        {savingEdit ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Clean, Refined Unboxed Properties (2-Column Grid Layout) */
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr',
                    rowGap: '16px',
                    columnGap: '18px',
                    alignItems: 'center',
                    padding: '0.5rem 0 1.5rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '1.5rem'
                  }}>
                    {/* 상태 (작업 완료 상태 시 '작업 완료'로 통일 표기) */}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: 400 }}>상태</span>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 400,
                      color: selectedReq.status === 'IN_PROGRESS'
                        ? '#3b82f6'
                        : 'var(--text-primary)'
                    }}>
                      {selectedReq.status === 'DONE' ? '작업 완료' : getStatusLabel(selectedReq)}
                    </span>

                    {/* 우선순위 */}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: 400 }}>우선순위</span>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 400,
                      color: selectedReq.priority === 'HIGH' ? '#f87171' : 'var(--text-primary)'
                    }}>
                      {selectedReq.priority === 'HIGH' ? '우선 요청' : '일반'}
                    </span>

                    {/* 등록일 */}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: 400 }}>등록일</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: '16px' }}>
                      {selectedReq.createdAt?.slice(0, 10)}
                    </span>

                    {/* 희망 완료일 (미지정 시 행 자체를 노출하지 않음) */}
                    {selectedReq.desiredDate && (
                      <>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: 400 }}>희망 완료일</span>
                        <span style={{ color: 'var(--text-primary)', fontSize: '16px' }}>
                          {selectedReq.desiredDate}
                        </span>
                      </>
                    )}

                    {/* 첨부파일 */}
                    {selectedReq.attachments && selectedReq.attachments.length > 0 && (
                      <>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: 400 }}>첨부파일</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                          {selectedReq.attachments.map(att => (
                            <a
                              key={att.id || att.url}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: '#3b82f6',
                                textDecoration: 'none',
                                fontSize: '15px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <span>{formatFileName(att.name)}</span>
                              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>[다운로드]</span>
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 2. 요청 내용 (수정 모드가 아닐 때 노출) */}
              {!isEditingReq && (
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
                    요청 내용
                  </h3>
                  <div
                    className="request-content-html"
                    style={{
                      fontSize: '16px',
                      lineHeight: 1.75,
                      wordBreak: 'break-word',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '1.25rem 1.5rem',
                      letterSpacing: '-0.01em'
                    }}
                    dangerouslySetInnerHTML={{ __html: formatHtmlContent(selectedReq.content) }}
                  />
                </div>
              )}

              {/* 3. 댓글 (사내 및 고객사 소통) */}
              {!isEditingReq && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
                      댓글 {comments.length > 0 && <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>· {comments.length}</span>}
                    </h3>
                  </div>

                  {/* 댓글 목록 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {comments.length === 0 ? (
                      <div style={{ fontSize: '15px', color: 'var(--text-muted)', padding: '1rem 0', textAlign: 'center' }}>
                        등록된 댓글이 없습니다.
                      </div>
                    ) : (
                      comments.map((comm) => {
                        let cleanAuthor = (comm.authorName || '작성자').trim();
                        while (/\([^)]*\)/.test(cleanAuthor)) {
                          cleanAuthor = cleanAuthor.replace(/\([^)]*\)/g, '').trim();
                        }
                        while (/\[[^\]]*\]/.test(cleanAuthor)) {
                          cleanAuthor = cleanAuthor.replace(/\[[^\]]*\]/g, '').trim();
                        }
                        if (selectedReq?.clientName) {
                          const pureClient = selectedReq.clientName.replace(/[()\[\]\s]/g, '');
                          if (pureClient) {
                            cleanAuthor = cleanAuthor.replaceAll(pureClient, '').trim();
                          }
                        }
                        cleanAuthor = cleanAuthor
                          .replace(/\(주\)/g, '')
                          .replace(/주식회사/g, '')
                          .replace(/알파솔루션/g, '')
                          .replace(/[()\[\]]/g, '')
                          .trim();
                        if (!cleanAuthor) cleanAuthor = '작성자';

                        return (
                          <div
                            key={comm.id}
                            style={{
                              padding: '1rem 1.25rem',
                              backgroundColor: 'var(--bg-input)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.75rem'
                            }}
                          >
                            {/* 작성자 이름 단독 표시: 하단 헤어라인 구분선으로 발화 주체 명확화 */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingBottom: '0.55rem',
                              borderBottom: '1px solid var(--border-color)'
                            }}>
                              <span style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 400 }}>
                                {cleanAuthor}
                              </span>
                            </div>

                            {/* 댓글 내용: 선명하고 시원한 16px 본문 */}
                            <div style={{
                              fontSize: '16px',
                              color: 'var(--text-primary)',
                              lineHeight: 1.7,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontWeight: 400,
                              letterSpacing: '-0.01em'
                            }}>
                              {comm.content}
                            </div>

                            {/* 첨부파일 (클립 이모지 없이 깔끔한 텍스트 링크) */}
                            {comm.attachments && comm.attachments.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)' }}>
                                {comm.attachments.map(att => (
                                  <a
                                    key={att.id || att.url}
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: '14px', color: '#3b82f6', textDecoration: 'none' }}
                                  >
                                    첨부: {formatFileName(att.name)}
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* 날짜와 시간은 이름 옆이 아닌 아래에 배치 */}
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)', paddingTop: '0.15rem' }}>
                              {comm.createdAt?.slice(0, 16)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* 댓글 입력 폼 */}
                  <form onSubmit={handleSendComment} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="댓글을 입력하세요..."
                      rows={3}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        padding: '0.85rem',
                        fontSize: '15px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label
                        style={{
                          fontSize: '14px',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.4rem 0.8rem',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px'
                        }}
                      >
                        파일 첨부
                        <input
                          type="file"
                          style={{ display: 'none' }}
                          onChange={e => handleFileUpload(e, true)}
                        />
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {commentAttachments.length > 0 && (
                          <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                            첨부 {commentAttachments.length}개
                          </span>
                        )}
                        <button
                          type="submit"
                          style={{
                            padding: '0.55rem 1.4rem',
                            fontSize: '15px',
                            fontWeight: 400,
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          댓글 등록
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* 4. 조치 내용 (작업 완료일, 조치 내용 본문만 단정하게 표시 - 댓글 아래 배치) */}
              {!isEditingReq && (selectedReq.completionSummary || selectedReq.completedAt || selectedReq.status === 'DONE') && (
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
                    조치 내용
                  </h3>
                  <div style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}>
                    {/* 상단 메타데이터: 조치 상태 및 완료일 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '0.65rem',
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '14px'
                    }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 400 }}>조치 완료</span>
                      {selectedReq.completedAt && (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                          완료일 {selectedReq.completedAt.slice(0, 10)}
                        </span>
                      )}
                    </div>

                    {/* 조치 내용 본문 */}
                    <div style={{
                      fontSize: '16px',
                      color: 'var(--text-primary)',
                      lineHeight: 1.75,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontWeight: 400,
                      letterSpacing: '-0.01em'
                    }}>
                      {selectedReq.completionSummary || '요청하신 작업이 정상적으로 완료되었습니다.'}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. 최하단 액션 버튼: 전사 드로어 표준 풀너비 수직 스택 스타일 (CompanyCalendar / 신규 요청 드로어와 동일) */}
              {!isEditingReq && selectedReq.status === 'DONE' && !selectedReq.clientConfirmed && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  marginTop: 'auto',
                  paddingTop: '1.5rem',
                  width: '100%'
                }}>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '16px',
                      fontWeight: 400,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                    }}
                    onClick={(e) => handleConfirmRequest(selectedReq.id, e)}
                  >
                    확인
                  </button>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '16px',
                      fontWeight: 400,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => handleReopenRequest(selectedReq.id)}
                  >
                    재요청
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}


      {/* SLIDE DRAWER: NEW REQUEST (신규 업무 요청 작성 - CompanyCalendar 일정 추가 스타일 적용) */}
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
                작업 요청 등록
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

            {/* Body */}
            <div style={{ flex: 1, padding: '1.75rem 2.25rem 2.25rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>
              <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1.75rem' }}>
                {/* Title Input (Hero 28px borderless title) */}
                <div>
                  <input
                    type="text"
                    required
                    value={newForm.title}
                    onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                    placeholder="작업 요청 제목을 입력하세요"
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
                  {/* 1. 우선 요청 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      우선 요청
                    </span>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                      <CustomCheckbox
                        checked={newForm.priority === 'HIGH'}
                        onChange={(checked) => setNewForm({ ...newForm, priority: checked ? 'HIGH' : 'NORMAL' })}
                        size={18}
                      />
                    </div>
                  </div>

                  {/* 2. 희망일 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0 }}>
                      희망일
                    </span>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                      <CustomDatePicker
                        value={newForm.desiredDate}
                        onChange={(val) => setNewForm({ ...newForm, desiredDate: val })}
                        placeholder="희망 완료일 선택"
                        width="160px"
                        minDate={getTodayStr()}
                      />
                    </div>
                  </div>

                  {/* 3. 요청 상세 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0, paddingTop: '6px' }}>
                      상세내용
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <HtmlEditor
                        value={newForm.content}
                        onChange={(html) => setNewForm(prev => ({ ...prev, content: html }))}
                        placeholder="요청하실 구체적인 내용, 오류 현상 등을 작성해주세요"
                      />
                    </div>
                  </div>

                  {/* 4. 파일 첨부 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0, lineHeight: 1.5, display: 'inline-flex', alignItems: 'center' }}>
                      파일
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
                      {newForm.attachments.map(att => (
                        <div key={att.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {formatFileName(att.name)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setNewForm(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== att.id) }))}
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

                      <div>
                        <button
                          type="button"
                          onClick={() => clientFileInputRef.current?.click()}
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
                            transition: 'opacity 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          <Plus size={22} strokeWidth={2} />
                        </button>
                      </div>
                      <input
                        ref={clientFileInputRef}
                        type="file"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, false)}
                      />
                      {uploading && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>업로드 중...</span>}
                    </div>
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
                    disabled={uploading}
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '16px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {uploading ? '파일 업로드 중...' : '요청 등록'}
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

      {/* Settings Slide Drawer (고객사 담당자 정보 수정 패널) */}
      {showSettingsModal && (
        <div 
          className={`detail-backdrop ${isSettingsClosing ? 'closing' : ''}`} 
          onClick={handleCloseSettingsDrawer}
        >
          <div 
            className={`detail-slide-drawer drawer-md ${isSettingsClosing ? 'closing' : ''}`} 
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              padding: '1.75rem 2.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                고객사 정보 설정
              </h3>
              <button 
                type="button" 
                onClick={handleCloseSettingsDrawer}
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '2.25rem' }}>
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
                {/* Hero Title */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.35,
                    color: 'var(--text-primary)'
                  }}>
                    {user.companyName || '고객사 정보'}
                  </div>
                  <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    전용 계정 정보 및 담당자 연락처 관리
                  </div>
                </div>

                {/* Row List */}
                <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-color)' }}>
                  {/* Row 1: 로그인 아이디 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      아이디
                    </span>
                    <div style={{ flex: 1, fontSize: '17px', color: 'var(--text-primary)' }}>
                      {user.username || '-'}
                    </div>
                  </div>

                  {/* Row 2: 담당자명 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      담당자
                    </span>
                    <input 
                      type="text" 
                      value={settingsForm.managerName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, managerName: e.target.value })}
                      placeholder="담당자 이름을 입력하세요"
                      required 
                      style={{
                        flex: 1,
                        fontSize: '18px',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        padding: 0
                      }}
                    />
                  </div>

                  {/* Row 3: 연락처 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      연락처
                    </span>
                    <input 
                      type="text" 
                      value={settingsForm.phone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                      placeholder="예: 010-9876-5432" 
                      style={{
                        flex: 1,
                        fontSize: '18px',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        padding: 0
                      }}
                    />
                  </div>

                  {/* Row 4: 사업자번호 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      사업자번호
                    </span>
                    <input 
                      type="text" 
                      value={settingsForm.bizNo}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bizNo: e.target.value })}
                      placeholder="예: 101-86-12345" 
                      style={{
                        flex: 1,
                        fontSize: '18px',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        padding: 0
                      }}
                    />
                  </div>

                  {/* Row 5: 비밀번호 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      비밀번호
                    </span>
                    <input 
                      type="password" 
                      value={settingsForm.password}
                      onChange={(e) => setSettingsForm({ ...settingsForm, password: e.target.value })}
                      placeholder="변경 시에만 새 비밀번호 입력" 
                      style={{
                        flex: 1,
                        fontSize: '18px',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
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
                  paddingTop: '2.5rem',
                  width: '100%'
                }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={savingSettings}
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '16px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {savingSettings ? '저장 중...' : '설정 저장 완료'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleCloseSettingsDrawer}
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

    </div>
  );
}
