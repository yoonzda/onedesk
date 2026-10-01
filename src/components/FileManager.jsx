import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ChevronDown, Plus, Search, X, User, ArrowUpDown, RotateCcw, Check, ArrowUpRight } from 'lucide-react';
import CustomCheckbox from './CustomCheckbox';

export default function FileManager({
  files = [],
  schedules = [],
  user,
  onUploadFile,
  onDeleteFile,
  onLinkFileToSchedule,
  onShowToast,
  onNavigateToSchedule
}) {
  // Main view tab: 'ALL' (전체) | 'SCHEDULE' (일정) | 'TYPE' (유형)
  const [activeTab, setActiveTab] = useState('ALL');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [onlyMyFiles, setOnlyMyFiles] = useState(false);
  const [sortBy, setSortBy] = useState('NAME_ASC'); // 'NAME_ASC' | 'NAME_DESC' | 'DATE_DESC' | 'DATE_ASC' | 'SIZE_DESC' | 'SIZE_ASC'
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef(null);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 360);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
    };
    if (isSortOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortOpen]);

  // Accordion state for 'SCHEDULE' tab (always closed by default)
  const [openAccordionIds, setOpenAccordionIds] = useState(() => new Set());

  // Upload Drawer State
  const [showUploadDrawer, setShowUploadDrawer] = useState(false);
  const [isUploadClosing, setIsUploadClosing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
  const [fileMemo, setFileMemo] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Link Schedule Modal State (for any existing file)
  const [linkModalFile, setLinkModalFile] = useState(null);
  const [targetLinkScheduleIds, setTargetLinkScheduleIds] = useState([]);
  const [isSavingLinks, setIsSavingLinks] = useState(false);

  // Helper: File format/extension
  const getFileFormat = (fileName) => {
    if (!fileName) return 'FILE';
    const parts = fileName.split('.');
    if (parts.length > 1) {
      return parts.pop().toUpperCase();
    }
    return 'FILE';
  };

  // Helper: Categorize file into 4 pure groups (문서, 엑셀, 이미지, 기타)
  const getFileCategory = (fileName) => {
    const ext = getFileFormat(fileName).toLowerCase();
    if (['pdf', 'hwp', 'doc', 'docx', 'txt', 'ppt', 'pptx'].includes(ext)) {
      return '문서';
    }
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return '엑셀';
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
      return '이미지';
    }
    return '기타';
  };

  // Helper: get scheduleIds for a file (many-to-many safe)
  const getFileScheduleIds = (file) => {
    if (Array.isArray(file.scheduleIds)) return file.scheduleIds;
    if (file.scheduleId) return [file.scheduleId];
    return [];
  };

  // Filter schedules available for linking (meetings, work, field, etc.)
  const meetingSchedules = useMemo(() => {
    return (schedules || []).filter(s =>
      s.category === 'INTERNAL_MEETING' ||
      s.category === 'EXTERNAL_MEETING' ||
      s.category === 'FIELD' ||
      s.category === 'ETC' ||
      s.category === 'DEPT' ||
      s.category === 'CLIENT' ||
      s.category === 'COMPANY'
    );
  }, [schedules]);

  // Filtered and Sorted files list
  const processedFiles = useMemo(() => {
    let list = files.filter(file => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = file.name?.toLowerCase().includes(query);
        const matchesUploader = file.uploaderName?.toLowerCase().includes(query);
        if (!matchesName && !matchesUploader) return false;
      }

      // 2. Only My Files filter
      if (onlyMyFiles) {
        const isMine = (user?.id && file.uploaderId === user.id) ||
          (user?.name && file.uploaderName === user.name);
        if (!isMine) return false;
      }

      return true;
    });

    // Sort
    return list.sort((a, b) => {
      if (sortBy === 'NAME_DESC') {
        return (b.name || '').localeCompare(a.name || '', 'ko-KR');
      }
      if (sortBy === 'DATE_DESC' || sortBy === 'LATEST') {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'DATE_ASC') {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      }
      if (sortBy === 'SIZE_ASC') {
        return (a.size || 0) - (b.size || 0);
      }
      if (sortBy === 'SIZE_DESC' || sortBy === 'SIZE') {
        return (b.size || 0) - (a.size || 0);
      }
      // Default: 'NAME_ASC' / 'NAME'
      return (a.name || '').localeCompare(b.name || '', 'ko-KR');
    });
  }, [files, searchQuery, onlyMyFiles, sortBy, user]);

  // Close Upload Drawer
  const handleCloseUploadDrawer = () => {
    if (isUploadClosing) return;
    setIsUploadClosing(true);
    setTimeout(() => {
      setShowUploadDrawer(false);
      setIsUploadClosing(false);
      setSelectedFile(null);
      setSelectedScheduleIds([]);
      setFileMemo('');
    }, 220);
  };

  // Upload handlers
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmitUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('업로드할 파일을 선택하세요.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('scheduleIds', JSON.stringify(selectedScheduleIds));
    if (selectedScheduleIds.length > 0) {
      formData.append('scheduleId', selectedScheduleIds[0]);
    }
    formData.append('uploaderId', user?.id || 'usr-admin');
    formData.append('uploaderName', user?.name || '김관리');
    if (fileMemo) formData.append('memo', fileMemo);

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('파일 등록 완료', `'${data.file.name}' 파일이 등록되었습니다.`);
        if (onUploadFile) onUploadFile(data.file);
        handleCloseUploadDrawer();
      } else {
        alert(data.message || '파일 업로드에 실패했습니다.');
      }
    } catch (err) {
      alert('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete file handler
  const handleDelete = async (fileId, fileName) => {
    if (!window.confirm(`'${fileName}' 파일을 정말 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('파일 삭제 완료', `'${fileName}' 파일이 삭제되었습니다.`);
        if (onDeleteFile) onDeleteFile(fileId);
      } else {
        alert(data.message || '삭제에 실패했습니다.');
      }
    } catch (err) {
      alert('파일 삭제 중 오류가 발생했습니다.');
    }
  };

  // Toggle accordion item
  const toggleAccordion = (id) => {
    setOpenAccordionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Open Link Schedule Modal
  const handleOpenLinkModal = (file) => {
    setLinkModalFile(file);
    const existing = getFileScheduleIds(file);
    setTargetLinkScheduleIds(existing);
  };

  // Save Link Schedule (Many-to-Many)
  const handleSaveScheduleLinks = async () => {
    if (!linkModalFile) return;
    setIsSavingLinks(true);
    try {
      const res = await fetch(`/api/files/${linkModalFile.id}/schedules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleIds: targetLinkScheduleIds })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('일정 연결 완료', `'${linkModalFile.name}' 파일의 연결 일정이 저장되었습니다.`);
        if (onUploadFile) onUploadFile(data.file);
        setLinkModalFile(null);
      } else {
        alert('일정 연결 저장에 실패했습니다.');
      }
    } catch (err) {
      alert('일정 연결 중 오류가 발생했습니다.');
    } finally {
      setIsSavingLinks(false);
    }
  };

  return (
    <div style={{ paddingTop: '2rem', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 1. Header: Title & Upload Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 400,
            margin: 0,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1
          }}>
            파일 보관함
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowUploadDrawer(true)}
            style={{
              height: '42px',
              padding: '0 1.25rem',
              fontSize: '15px',
              fontWeight: 400,
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <Plus size={18} strokeWidth={2} />
            파일 등록
          </button>
        </div>
      </div>

      {/* 2. Top Navigation Tabs + Right Minimal Icon Toolbar */}
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
        {/* Left: Navigation Tabs: 전체 | 일정 | 유형 (사내 공통 tab-btn tab-btn-lg 표준 적용) */}
        <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', marginBottom: '-1px' }}>
          {[
            { id: 'ALL', label: '전체' },
            { id: 'SCHEDULE', label: '일정' },
            { id: 'TYPE', label: '유형' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn tab-btn-lg ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Unified Minimal Icon Toolbar (Search Toggle + Only My Files + Sort Popover + Reset Icon) */}
        {(() => {
          const hasActiveFilter = Boolean(searchQuery || onlyMyFiles || sortBy !== 'NAME_ASC');

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.4rem', position: 'relative' }}>
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
                  color: (isSearchOpen || searchQuery) ? 'var(--text-primary)' : 'var(--text-muted)',
                  opacity: (isSearchOpen || searchQuery) ? 1 : 0.45,
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = (isSearchOpen || searchQuery) ? 'var(--text-primary)' : 'var(--text-muted)';
                  e.currentTarget.style.opacity = (isSearchOpen || searchQuery) ? 1 : 0.45;
                }}
              >
                <Search size={22} strokeWidth={2} />
              </button>

              {/* 2. 내 등록 파일 아이콘 버튼 (User) */}
              <button
                type="button"
                onClick={() => setOnlyMyFiles(!onlyMyFiles)}
                title={onlyMyFiles ? "내 등록 파일 필터 적용 중 (클릭하여 전체 보기)" : "내 등록 파일만 보기"}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: onlyMyFiles ? 'var(--text-primary)' : 'var(--text-muted)',
                  opacity: onlyMyFiles ? 1 : 0.45,
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = onlyMyFiles ? 'var(--text-primary)' : 'var(--text-muted)';
                  e.currentTarget.style.opacity = onlyMyFiles ? 1 : 0.45;
                }}
              >
                <User size={22} strokeWidth={2} />
              </button>

              {/* 3. 정렬 아이콘 버튼 (ArrowUpDown + Popover Menu) */}
              <div ref={sortRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  title={`정렬: ${
                    sortBy === 'NAME_ASC' ? '이름순 (A-Z)' :
                    sortBy === 'NAME_DESC' ? '이름순 (Z-A)' :
                    sortBy === 'DATE_DESC' ? '최신순' :
                    sortBy === 'DATE_ASC' ? '오래된순' :
                    sortBy === 'SIZE_DESC' ? '용량 큰순' : '용량 작은순'
                  }`}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: (sortBy !== 'NAME_ASC' || isSortOpen) ? 'var(--text-primary)' : 'var(--text-muted)',
                    opacity: (sortBy !== 'NAME_ASC' || isSortOpen) ? 1 : 0.45,
                    outline: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = (sortBy !== 'NAME_ASC' || isSortOpen) ? 'var(--text-primary)' : 'var(--text-muted)';
                    e.currentTarget.style.opacity = (sortBy !== 'NAME_ASC' || isSortOpen) ? 1 : 0.45;
                  }}
                >
                  <ArrowUpDown size={22} strokeWidth={2} />
                </button>

                {isSortOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                    padding: 0,
                    minWidth: '160px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    {[
                      {
                        category: 'name',
                        options: [
                          { id: 'NAME_ASC', label: '이름순 (A-Z)' },
                          { id: 'NAME_DESC', label: '이름순 (Z-A)' }
                        ]
                      },
                      {
                        category: 'date',
                        options: [
                          { id: 'DATE_DESC', label: '최신순' },
                          { id: 'DATE_ASC', label: '오래된순' }
                        ]
                      },
                      {
                        category: 'size',
                        options: [
                          { id: 'SIZE_DESC', label: '용량 큰순' },
                          { id: 'SIZE_ASC', label: '용량 작은순' }
                        ]
                      }
                    ].map((group, gIdx, gArr) => (
                      <div
                        key={group.category}
                        style={{
                          borderBottom: gIdx < gArr.length - 1 ? '1px solid var(--border-color)' : 'none'
                        }}
                      >
                        {group.options.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSortBy(opt.id);
                              setIsSortOpen(false);
                            }}
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: 'none',
                              padding: '0.65rem 0.95rem',
                              textAlign: 'left',
                              fontSize: '14.5px',
                              fontWeight: 400,
                              color: sortBy === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              outline: 'none',
                              whiteSpace: 'nowrap',
                              transition: 'background-color 0.15s ease, color 0.15s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255, 255, 255, 0.04))';
                              e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = sortBy === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)';
                            }}
                          >
                            <span>{opt.label}</span>
                            {sortBy === opt.id && <Check size={16} color="var(--text-primary)" strokeWidth={2} />}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. 필터 초기화 아이콘 버튼 (RotateCcw) */}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setOnlyMyFiles(false);
                  setSortBy('NAME_ASC');
                  setIsSearchOpen(false);
                }}
                title="필터 초기화"
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
            </div>
          );
        })()}
      </div>

      {/* Full-Width Search Ribbon Bar (부드러운 하드웨어 가속 슬라이드) */}
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                  setSearchQuery('');
                }
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {searchQuery.trim() && (
              <span style={{ fontSize: '15px', color: 'var(--text-muted)', whiteSpace: 'nowrap', userSelect: 'none', fontWeight: 400 }}>
                {processedFiles.length}건
              </span>
            )}
            <button
              type="button"
              tabIndex={isSearchOpen ? 0 : -1}
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
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

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: 전체 (클린 리스트 - 연결 일정 미표시, 파일명, 유형, 용량, 등록자, 등록일, 액션) */}
      {activeTab === 'ALL' && (
        <div>
          {processedFiles.length === 0 ? (
            <div style={{
              padding: '4rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              fontSize: '15px'
            }}>
              등록된 파일이 없습니다.
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)'
            }}>
              {/* Table Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '16px',
                fontWeight: 400,
                color: 'var(--text-secondary)'
              }}>
                <div style={{ flex: 1, minWidth: '220px' }}>파일명</div>
                <div style={{ width: '90px', textAlign: 'center' }}>유형</div>
                <div style={{ width: '100px', textAlign: 'right' }}>용량</div>
                <div style={{ width: '110px', textAlign: 'center' }}>등록자</div>
                <div style={{ width: '130px', textAlign: 'center' }}>등록일</div>
                <div style={{ width: '180px', textAlign: 'right' }}>관리</div>
              </div>

              {/* Rows */}
              {processedFiles.map(file => (
                <div
                  key={file.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.2rem 1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '16px',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* File Name (Download Link) */}
                  <div style={{ flex: 1, minWidth: '220px', wordBreak: 'break-all', paddingRight: '1rem' }}>
                    <a
                      href={file.url}
                      download={file.name}
                      title="클릭 시 다운로드"
                      style={{
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        fontSize: '16px',
                        fontWeight: 400,
                        lineHeight: 1.5,
                        cursor: 'pointer',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    >
                      {file.name}
                    </a>
                  </div>

                  {/* Format/Type (Pure typography text - Rule 1 & 7) */}
                  <div style={{ width: '90px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '16px' }}>
                    {getFileFormat(file.name)}
                  </div>

                  {/* Size */}
                  <div style={{ width: '100px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '16px', fontVariantNumeric: 'tabular-nums' }}>
                    {file.sizeFormatted || '-'}
                  </div>

                  {/* Uploader */}
                  <div style={{ width: '110px', textAlign: 'center', color: 'var(--text-primary)', fontSize: '16px' }}>
                    {file.uploaderName || '-'}
                  </div>

                  {/* Date */}
                  <div style={{ width: '130px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '16px', fontVariantNumeric: 'tabular-nums' }}>
                    {file.createdAt ? file.createdAt.slice(0, 10) : '-'}
                  </div>

                  {/* Actions (다운로드 · 일정 연결 · 삭제) */}
                  <div style={{ width: '180px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
                    <a
                      href={file.url}
                      download={file.name}
                      style={{
                        color: '#60a5fa',
                        textDecoration: 'none',
                        fontSize: '15.5px',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      다운로드
                    </a>
                    <span style={{ color: 'var(--border-color)' }}>·</span>
                    <button
                      type="button"
                      onClick={() => handleOpenLinkModal(file)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--text-secondary)',
                        fontSize: '15.5px',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      일정 연결
                    </button>
                    {(user?.role === 'ADMIN' || file.uploaderId === user?.id || file.uploaderName === user?.name) && (
                      <>
                        <span style={{ color: 'var(--border-color)' }}>·</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(file.id, file.name)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: 'var(--text-muted)',
                            fontSize: '15.5px',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 일정 (근태 관리 아코디언 스타일 - 보더 디바이더 및 부드러운 그리드 슬라이드) */}
      {activeTab === 'SCHEDULE' && (() => {
        // 1. Unlinked files
        const unlinkedFiles = processedFiles.filter(f => getFileScheduleIds(f).length === 0);

        // 2. Schedules that have files
        const schedulesWithFiles = (meetingSchedules || []).map(sch => {
          const sFiles = processedFiles.filter(f => {
            const schedIds = getFileScheduleIds(f);
            return schedIds.includes(sch.id) || (Array.isArray(sch.fileIds) && sch.fileIds.includes(f.id));
          });
          return {
            schedule: sch,
            files: sFiles
          };
        }).filter(item => item.files.length > 0);

        const isUnlinkedOpen = openAccordionIds.has('UNLINKED');

        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Section 1: 미지정 (가장 상단 배치) */}
            <div style={{ borderBottom: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => toggleAccordion('UNLINKED')}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '1.85rem 0.25rem 1.6rem 0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  outline: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '26px',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                    fontWeight: 400,
                    lineHeight: 1.15
                  }}>
                    미지정
                  </span>
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: isUnlinkedOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transform: isUnlinkedOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
                }}>
                  <ChevronDown size={24} strokeWidth={2} />
                </div>
              </button>

              <div style={{
                display: 'grid',
                gridTemplateRows: isUnlinkedOpen ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.3s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.3s',
                overflow: 'hidden',
                visibility: isUnlinkedOpen ? 'visible' : 'hidden'
              }}>
                <div style={{ minHeight: 0 }}>
                  <div style={{
                    margin: '0 0.5rem 1.5rem 0.75rem',
                    borderLeft: '2px solid var(--text-muted)',
                    paddingLeft: '1.25rem'
                  }}>
                    {unlinkedFiles.length === 0 ? (
                      <div style={{
                        padding: '1rem 0.5rem',
                        color: 'var(--text-muted)',
                        fontSize: '18px'
                      }}>
                        미지정 파일이 없습니다.
                      </div>
                    ) : (
                      unlinkedFiles.map((file, idx) => (
                        <div
                          key={file.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 0.5rem',
                            borderTop: idx > 0 ? '1px solid var(--border-color)' : 'none',
                            gap: '1.5rem'
                          }}
                        >
                          {/* File Name (Download Link) */}
                          <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                            <a
                              href={file.url}
                              download={file.name}
                              title="클릭 시 다운로드"
                              style={{
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                fontSize: '18px',
                                fontWeight: 400,
                                lineHeight: 1.5,
                                cursor: 'pointer',
                                transition: 'color 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                            >
                              {file.name}
                            </a>
                          </div>

                          {/* Right: 용량 & 삭제 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexShrink: 0 }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '18px', fontVariantNumeric: 'tabular-nums' }}>
                              {file.sizeFormatted || '-'}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDelete(file.id, file.name)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                color: 'var(--text-muted)',
                                fontSize: '18px',
                                cursor: 'pointer',
                                transition: 'color 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Schedules List */}
            {schedulesWithFiles.map(({ schedule: sch, files: sFiles }) => {
              const isOpen = openAccordionIds.has(sch.id);
              const schedDate = sch.startDate ? sch.startDate.slice(0, 10) : '';

              return (
                <div key={sch.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => toggleAccordion(sch.id)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '1.85rem 0.25rem 1.6rem 0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left',
                      outline: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '26px',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em',
                        fontWeight: 400,
                        lineHeight: 1.15
                      }}>
                        {sch.title}
                      </span>
                      {schedDate && (
                        <span style={{ fontSize: '18px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                          {schedDate}
                        </span>
                      )}
                      {onNavigateToSchedule && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToSchedule(sch.id);
                          }}
                          title="일정 관리로 이동"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '18px',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '0 4px',
                            lineHeight: 1,
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <span>일정 보기</span>
                          <ArrowUpRight size={18} strokeWidth={2} />
                        </span>
                      )}
                    </div>

                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
                    }}>
                      <ChevronDown size={24} strokeWidth={2} />
                    </div>
                  </button>

                  <div style={{
                    display: 'grid',
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.3s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.3s',
                    overflow: 'hidden',
                    visibility: isOpen ? 'visible' : 'hidden'
                  }}>
                    <div style={{ minHeight: 0 }}>
                      <div style={{
                        margin: '0 0.5rem 1.5rem 0.75rem',
                        borderLeft: '2px solid var(--text-muted)',
                        paddingLeft: '1.25rem'
                      }}>
                        {sFiles.map((file, idx) => (
                          <div
                            key={file.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '1rem 0.5rem',
                              borderTop: idx > 0 ? '1px solid var(--border-color)' : 'none',
                              gap: '1.5rem'
                            }}
                          >
                            {/* File Name (Download Link) */}
                            <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                              <a
                                href={file.url}
                                download={file.name}
                                title="클릭 시 다운로드"
                                style={{
                                  color: 'var(--text-primary)',
                                  textDecoration: 'none',
                                  fontSize: '18px',
                                  fontWeight: 400,
                                  lineHeight: 1.5,
                                  cursor: 'pointer',
                                  transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                              >
                                {file.name}
                              </a>
                            </div>

                            {/* Right: 용량 & 삭제 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexShrink: 0 }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '18px', fontVariantNumeric: 'tabular-nums' }}>
                                {file.sizeFormatted || '-'}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleDelete(file.id, file.name)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  color: 'var(--text-muted)',
                                  fontSize: '18px',
                                  cursor: 'pointer',
                                  transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* TAB 3: 유형 (보드형 묶음 레이아웃: 문서, 엑셀, 이미지, 기타) */}
      {activeTab === 'TYPE' && (() => {
        const categories = ['문서', '엑셀', '이미지', '기타'];
        const grouped = {
          '문서': processedFiles.filter(f => getFileCategory(f.name) === '문서'),
          '엑셀': processedFiles.filter(f => getFileCategory(f.name) === '엑셀'),
          '이미지': processedFiles.filter(f => getFileCategory(f.name) === '이미지'),
          '기타': processedFiles.filter(f => getFileCategory(f.name) === '기타')
        };

        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))',
            gap: '1.25rem',
            alignItems: 'start',
            overflowX: 'auto',
            paddingBottom: '2rem'
          }}>
            {categories.map(cat => {
              const catFiles = grouped[cat] || [];
              return (
                <div
                  key={cat}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    minWidth: 0
                  }}
                >
                  {/* Column Header: 유형 명칭 및 파일 수 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.65rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '0.15rem'
                  }}>
                    <span style={{ fontSize: '20px', fontWeight: 400, color: 'var(--text-primary)' }}>
                      {cat}
                    </span>
                    <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                      {catFiles.length}
                    </span>
                  </div>

                  {/* Cards Stack */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                    {catFiles.length === 0 ? (
                      <div style={{
                        padding: '2.5rem 1rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '16px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px dashed var(--border-color)'
                      }}>
                        등록된 파일이 없습니다
                      </div>
                    ) : (
                      catFiles.map(file => (
                        <div
                          key={file.id}
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            padding: '1.15rem 1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--text-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                          }}
                        >
                          {/* File Name */}
                          <div style={{ minWidth: 0, wordBreak: 'break-all' }}>
                            <a
                              href={file.url}
                              download={file.name}
                              style={{
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                fontSize: '16px',
                                fontWeight: 400,
                                lineHeight: 1.5,
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                            >
                              {file.name}
                            </a>
                          </div>

                          {/* Meta Information: Size · Uploader · Date */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.4rem',
                            fontSize: '15px',
                            color: 'var(--text-secondary)',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            <span>{file.sizeFormatted || '-'}</span>
                            <span>·</span>
                            <span>{file.uploaderName || '-'}</span>
                            {file.createdAt && (
                              <>
                                <span>·</span>
                                <span>{file.createdAt.slice(0, 10)}</span>
                              </>
                            )}
                          </div>

                          {/* Memo */}
                          {file.memo && (
                            <div style={{
                              fontSize: '15px',
                              color: 'var(--text-secondary)',
                              lineHeight: 1.5,
                              wordBreak: 'break-all',
                              paddingTop: '0.2rem'
                            }}>
                              {file.memo}
                            </div>
                          )}

                          {/* Card Actions: 다운로드 · 삭제 */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '0.65rem',
                            paddingTop: '0.6rem',
                            borderTop: '1px solid var(--border-color)',
                            fontSize: '15.5px'
                          }}>
                            <a
                              href={file.url}
                              download={file.name}
                              style={{
                                color: '#60a5fa',
                                textDecoration: 'none',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >
                              다운로드
                            </a>
                            {(user?.role === 'ADMIN' || file.uploaderId === user?.id || file.uploaderName === user?.name) && (
                              <>
                                <span style={{ color: 'var(--border-color)' }}>·</span>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(file.id, file.name)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    color: 'var(--text-muted)',
                                    fontSize: '15.5px',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                  삭제
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add File Button (Like '+ 새 페이지' in reference board) */}
                  <button
                    type="button"
                    onClick={() => setShowUploadDrawer(true)}
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      background: 'transparent',
                      border: '1px dashed var(--border-color)',
                      color: 'var(--text-muted)',
                      fontSize: '15px',
                      fontWeight: 400,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      marginTop: 'auto'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--text-secondary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255, 255, 255, 0.04))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Plus size={16} strokeWidth={2} />
                    <span>파일 등록</span>
                  </button>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* 5. UPLOAD FILE SLIDE DRAWER (우측 슬라이드 드로어) */}
      {showUploadDrawer && (
        <div
          className={`detail-backdrop ${isUploadClosing ? 'closing' : ''}`}
          onClick={handleCloseUploadDrawer}
        >
          <div
            className={`detail-slide-drawer drawer-md ${isUploadClosing ? 'closing' : ''}`}
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
              <h3 style={{ fontSize: '22px', fontWeight: 400, margin: 0, color: 'var(--text-primary)' }}>
                보관함 파일 등록
              </h3>
              <button
                type="button"
                onClick={handleCloseUploadDrawer}
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Drawer Body Form */}
            <form onSubmit={handleSubmitUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ padding: '1.75rem 2.25rem 2.25rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: 1, overflowY: 'auto' }}>
                
                {/* Rows List */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  {/* 1. 파일 선택 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', flexShrink: 0, paddingTop: '6px' }}>
                      파일
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: '2px dashed var(--border-color)',
                          padding: '2rem 1.5rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          backgroundColor: 'var(--bg-input)',
                          borderRadius: '6px',
                          transition: 'border-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                        {selectedFile ? (
                          <div>
                            <div style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                              {selectedFile.name}
                            </div>
                            <div style={{ fontSize: '14.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              {Math.round(selectedFile.size / 1024)} KB · 클릭하여 변경
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                              파일을 마우스로 끌어다 놓거나 클릭하여 선택
                            </div>
                            <div style={{ fontSize: '14.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              PDF, Word, Excel, PowerPoint, 이미지 등 모든 파일 지원
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. 연결할 회의 / 일정 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', flexShrink: 0, paddingTop: '6px' }}>
                      연결 일정
                    </span>
                    <div style={{
                      flex: 1,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-input)',
                      padding: '0.85rem',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}>
                      {meetingSchedules.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '14.5px' }}>연결 가능한 일정이 없습니다.</div>
                      ) : (
                        meetingSchedules.map(sch => {
                          const isChecked = selectedScheduleIds.includes(sch.id);
                          return (
                            <CustomCheckbox
                              key={sch.id}
                              checked={isChecked}
                              onChange={(chk) => {
                                setSelectedScheduleIds(prev =>
                                  chk ? Array.from(new Set([...prev, sch.id])) : prev.filter(id => id !== sch.id)
                                );
                              }}
                              label={`${sch.startDate?.slice(5, 10)} · ${sch.title}`}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* 3. 메모 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '1.5rem'
                  }}>
                    <span style={{ width: '100px', fontSize: '16px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                      메모
                    </span>
                    <input
                      type="text"
                      value={fileMemo}
                      onChange={(e) => setFileMemo(e.target.value)}
                      placeholder="파일 관련 메모 또는 설명을 입력하세요 (선택)"
                      style={{
                        flex: 1,
                        fontSize: '16px',
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
                  paddingTop: '1.5rem',
                  width: '100%'
                }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isUploading || !selectedFile}
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '15px',
                      fontWeight: 400,
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {isUploading ? '업로드 중...' : '보관함 파일 등록 완료'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseUploadDrawer}
                    disabled={isUploading}
                    style={{
                      width: '100%',
                      height: '46px',
                      fontSize: '15px',
                      fontWeight: 400,
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
            </form>
          </div>
        </div>
      )}

      {/* 6. LINK SCHEDULE MODAL (기존 파일에 대한 다중 일정 연결 모달) */}
      {linkModalFile && (
        <div
          className="detail-backdrop"
          onClick={() => setLinkModalFile(null)}
          style={{ zIndex: 1050 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(500px, 92vw)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 400, margin: 0, color: 'var(--text-primary)' }}>
                연결 일정 설정
              </h3>
              <button
                type="button"
                onClick={() => setLinkModalFile(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
                파일: <span style={{ color: 'var(--text-primary)' }}>{linkModalFile.name}</span>
              </div>

              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input)',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {meetingSchedules.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '14.5px' }}>연결 가능한 일정이 없습니다.</div>
                ) : (
                  meetingSchedules.map(sch => {
                    const isChecked = targetLinkScheduleIds.includes(sch.id);
                    return (
                      <CustomCheckbox
                        key={sch.id}
                        checked={isChecked}
                        onChange={(chk) => {
                          setTargetLinkScheduleIds(prev =>
                            chk ? Array.from(new Set([...prev, sch.id])) : prev.filter(id => id !== sch.id)
                          );
                        }}
                        label={`${sch.startDate?.slice(5, 10)} · ${sch.title}`}
                      />
                    );
                  })
                )}
              </div>
            </div>

            <div style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setLinkModalFile(null)}
                style={{ height: '40px', padding: '0 1.25rem', fontSize: '14.5px', fontWeight: 400, borderRadius: 0 }}
              >
                취소
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveScheduleLinks}
                disabled={isSavingLinks}
                style={{ height: '40px', padding: '0 1.5rem', fontSize: '14.5px', borderRadius: 0, fontWeight: 400 }}
              >
                {isSavingLinks ? '저장 중...' : '연결 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
