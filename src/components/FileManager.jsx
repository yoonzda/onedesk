import React, { useState, useRef, useMemo } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import CustomCheckbox from './CustomCheckbox';

export default function FileManager({
  files = [],
  schedules = [],
  user,
  onUploadFile,
  onDeleteFile,
  onLinkFileToSchedule,
  onShowToast
}) {
  // Main view tab: 'ALL' (전체) | 'SCHEDULE' (일정) | 'TYPE' (유형)
  const [activeTab, setActiveTab] = useState('ALL');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyFiles, setOnlyMyFiles] = useState(false);
  const [sortBy, setSortBy] = useState('LATEST'); // 'LATEST' | 'NAME' | 'SIZE'

  // Accordion state for 'SCHEDULE' tab
  // Open 'UNLINKED' and active schedules by default
  const [openAccordionIds, setOpenAccordionIds] = useState(() => new Set(['UNLINKED']));

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
      if (sortBy === 'NAME') {
        return (a.name || '').localeCompare(b.name || '', 'ko-KR');
      }
      if (sortBy === 'SIZE') {
        return (b.size || 0) - (a.size || 0);
      }
      // Default: 'LATEST'
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
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
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.85rem' }}>
          <h2 style={{
            fontSize: '26px',
            fontWeight: 700,
            margin: 0,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            파일 보관함
          </h2>
          <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
            총 {processedFiles.length}건
          </span>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowUploadDrawer(true)}
          style={{
            height: '42px',
            padding: '0 1.25rem',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer'
          }}
        >
          <Plus size={18} strokeWidth={2.2} />
          파일 등록
        </button>
      </div>

      {/* 2. Top Navigation Tabs: 전체 | 일정 | 유형 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.75rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '1.5rem'
      }}>
        {[
          { id: 'ALL', label: '전체' },
          { id: 'SCHEDULE', label: '일정' },
          { id: 'TYPE', label: '유형' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.65rem 0.2rem',
              fontSize: '16px',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--text-primary)' : '2px solid transparent',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Search & Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.85rem 1.25rem',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        marginBottom: '1.75rem'
      }}>
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: 600 }}>Q</span>
          <input
            type="text"
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="파일명 또는 업로더 검색..."
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '15px',
              padding: '4px 0',
              outline: 'none',
              boxShadow: 'none',
              color: 'var(--text-primary)',
              width: '100%'
            }}
          />
        </div>

        {/* Right Controls: 내 등록 파일 & 정렬 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* 내 등록 파일 Checkbox (Rule 5) */}
          <CustomCheckbox
            checked={onlyMyFiles}
            onChange={setOnlyMyFiles}
            label="내 등록 파일"
          />

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>정렬</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                padding: '4px 8px',
                borderRadius: '4px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="LATEST" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>최신순</option>
              <option value="NAME" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>파일명순</option>
              <option value="SIZE" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>용량순</option>
            </select>
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
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-secondary)'
              }}>
                <div style={{ flex: 1, minWidth: '200px' }}>파일명</div>
                <div style={{ width: '90px', textAlign: 'center' }}>유형</div>
                <div style={{ width: '100px', textAlign: 'right' }}>용량</div>
                <div style={{ width: '110px', textAlign: 'center' }}>등록자</div>
                <div style={{ width: '120px', textAlign: 'center' }}>등록일</div>
                <div style={{ width: '170px', textAlign: 'right' }}>관리</div>
              </div>

              {/* Rows */}
              {processedFiles.map(file => (
                <div
                  key={file.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '15px',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* File Name (Download Link) */}
                  <div style={{ flex: 1, minWidth: '200px', wordBreak: 'break-all', paddingRight: '1rem' }}>
                    <a
                      href={file.url}
                      download={file.name}
                      title="클릭 시 다운로드"
                      style={{
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    >
                      {file.name}
                    </a>
                  </div>

                  {/* Format/Type (Pure typography text - Rule 1) */}
                  <div style={{ width: '90px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13.5px' }}>
                    {getFileFormat(file.name)}
                  </div>

                  {/* Size */}
                  <div style={{ width: '100px', textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {file.sizeFormatted || '-'}
                  </div>

                  {/* Uploader */}
                  <div style={{ width: '110px', textAlign: 'center', color: 'var(--text-primary)' }}>
                    {file.uploaderName || '-'}
                  </div>

                  {/* Date */}
                  <div style={{ width: '120px', textAlign: 'center', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {file.createdAt ? file.createdAt.slice(0, 10) : '-'}
                  </div>

                  {/* Actions (다운로드 · 일정 연결 · 삭제) */}
                  <div style={{ width: '170px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
                    <a
                      href={file.url}
                      download={file.name}
                      style={{
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        fontSize: '13.5px',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
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
                        fontSize: '13.5px',
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
                            fontSize: '13.5px',
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

      {/* TAB 2: 일정 (아코디언 FAQ 스타일 - 최상단 '미지정' + 일정 리스트) */}
      {activeTab === 'SCHEDULE' && (() => {
        // 1. Unlinked files
        const unlinkedFiles = processedFiles.filter(f => getFileScheduleIds(f).length === 0);

        // 2. Schedules that have files or are meetings
        const schedulesWithFiles = (meetingSchedules || []).map(sch => {
          const sFiles = processedFiles.filter(f => {
            const schedIds = getFileScheduleIds(f);
            return schedIds.includes(sch.id) || (Array.isArray(sch.fileIds) && sch.fileIds.includes(f.id));
          });
          return {
            schedule: sch,
            files: sFiles
          };
        }).filter(item => item.files.length > 0); // Only show schedules that have files in this view

        const isUnlinkedOpen = openAccordionIds.has('UNLINKED');

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Section 1: 미지정 (가장 상단 배치) */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)'
            }}>
              {/* Accordion Header: 미지정 (파일 건수 없이 깔끔한 성명과 ChevronDown 아이콘) */}
              <div
                onClick={() => toggleAccordion('UNLINKED')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.2rem 1.5rem',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  미지정
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  transform: isUnlinkedOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  color: 'var(--text-secondary)'
                }}>
                  <ChevronDown size={20} strokeWidth={2.2} />
                </div>
              </div>

              {/* Accordion Body: 파일명, 용량, 다운로드, 삭제 */}
              {isUnlinkedOpen && (
                <div style={{ borderTop: '1px solid var(--border-color)' }}>
                  {unlinkedFiles.length === 0 ? (
                    <div style={{ padding: '2rem 1.5rem', color: 'var(--text-muted)', fontSize: '14.5px' }}>
                      미지정 파일이 없습니다.
                    </div>
                  ) : (
                    unlinkedFiles.map(file => (
                      <div
                        key={file.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.9rem 1.5rem',
                          borderBottom: '1px solid var(--border-color)',
                          fontSize: '15px',
                          gap: '1rem'
                        }}
                      >
                        {/* File Name */}
                        <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                          <a
                            href={file.url}
                            download={file.name}
                            style={{
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                          >
                            {file.name}
                          </a>
                        </div>

                        {/* Size */}
                        <div style={{ width: '100px', textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {file.sizeFormatted || '-'}
                        </div>

                        {/* Actions (다운로드 · 삭제) */}
                        <div style={{ width: '120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
                          <a
                            href={file.url}
                            download={file.name}
                            style={{
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                              fontSize: '13.5px',
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
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
                                  fontSize: '13.5px',
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
              )}
            </div>

            {/* Section 2: Schedules List */}
            {schedulesWithFiles.map(({ schedule: sch, files: sFiles }) => {
              const isOpen = openAccordionIds.has(sch.id);
              const schedDate = sch.startDate ? sch.startDate.slice(0, 10) : '';

              return (
                <div
                  key={sch.id}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {/* Accordion Header (일정 이름, 날짜, ChevronDown 아이콘) */}
                  <div
                    onClick={() => toggleAccordion(sch.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.2rem 1.5rem',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.85rem' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {sch.title}
                      </span>
                      {schedDate && (
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                          {schedDate}
                        </span>
                      )}
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                      color: 'var(--text-secondary)'
                    }}>
                      <ChevronDown size={20} strokeWidth={2.2} />
                    </div>
                  </div>

                  {/* Accordion Body: 파일명, 용량, 다운로드, 삭제 */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--border-color)' }}>
                      {sFiles.map(file => (
                        <div
                          key={file.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.9rem 1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            fontSize: '15px',
                            gap: '1rem'
                          }}
                        >
                          {/* File Name */}
                          <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                            <a
                              href={file.url}
                              download={file.name}
                              style={{
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                            >
                              {file.name}
                            </a>
                          </div>

                          {/* Size */}
                          <div style={{ width: '100px', textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {file.sizeFormatted || '-'}
                          </div>

                          {/* Actions (다운로드 · 삭제) */}
                          <div style={{ width: '120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
                            <a
                              href={file.url}
                              download={file.name}
                              style={{
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                fontSize: '13.5px',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
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
                                    fontSize: '13.5px',
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
              );
            })}
          </div>
        );
      })()}

      {/* TAB 3: 유형 (분류체계: 문서, 엑셀, 이미지, 기타) */}
      {activeTab === 'TYPE' && (() => {
        const categories = ['문서', '엑셀', '이미지', '기타'];
        const grouped = {
          '문서': processedFiles.filter(f => getFileCategory(f.name) === '문서'),
          '엑셀': processedFiles.filter(f => getFileCategory(f.name) === '엑셀'),
          '이미지': processedFiles.filter(f => getFileCategory(f.name) === '이미지'),
          '기타': processedFiles.filter(f => getFileCategory(f.name) === '기타')
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {categories.map(cat => {
              const catFiles = grouped[cat] || [];
              return (
                <div key={cat}>
                  {/* Category Header */}
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    paddingBottom: '0.65rem',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '0.5rem'
                  }}>
                    {cat}
                  </div>

                  {/* Files List */}
                  {catFiles.length === 0 ? (
                    <div style={{ padding: '1.25rem 0', color: 'var(--text-muted)', fontSize: '14.5px' }}>
                      해당 유형의 파일이 없습니다.
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)'
                    }}>
                      {catFiles.map(file => (
                        <div
                          key={file.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.9rem 1.25rem',
                            borderBottom: '1px solid var(--border-color)',
                            fontSize: '15px'
                          }}
                        >
                          {/* File Name */}
                          <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-all', paddingRight: '1rem' }}>
                            <a
                              href={file.url}
                              download={file.name}
                              style={{
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                            >
                              {file.name}
                            </a>
                          </div>

                          {/* Size */}
                          <div style={{ width: '100px', textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {file.sizeFormatted || '-'}
                          </div>

                          {/* Uploader */}
                          <div style={{ width: '110px', textAlign: 'center', color: 'var(--text-primary)' }}>
                            {file.uploaderName || '-'}
                          </div>

                          {/* Date */}
                          <div style={{ width: '120px', textAlign: 'center', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {file.createdAt ? file.createdAt.slice(0, 10) : '-'}
                          </div>

                          {/* Actions */}
                          <div style={{ width: '120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
                            <a
                              href={file.url}
                              download={file.name}
                              style={{
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                fontSize: '13.5px',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
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
                                    fontSize: '13.5px',
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
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0, paddingTop: '6px' }}>
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
                            <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {selectedFile.name}
                            </div>
                            <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              {Math.round(selectedFile.size / 1024)} KB · 클릭하여 변경
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              파일을 마우스로 끌어다 놓거나 클릭하여 선택
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
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
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0, paddingTop: '6px' }}>
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
                        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>연결 가능한 일정이 없습니다.</div>
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
                    <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      메모
                    </span>
                    <input
                      type="text"
                      value={fileMemo}
                      onChange={(e) => setFileMemo(e.target.value)}
                      placeholder="파일 관련 메모 또는 설명을 입력하세요 (선택)"
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
                      fontSize: '16px',
                      fontWeight: 600,
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
              <h3 style={{ fontSize: '19px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
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
                파일: <strong style={{ color: 'var(--text-primary)' }}>{linkModalFile.name}</strong>
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
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>연결 가능한 일정이 없습니다.</div>
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
                style={{ height: '40px', padding: '0 1.25rem', fontSize: '14px', borderRadius: 0 }}
              >
                취소
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveScheduleLinks}
                disabled={isSavingLinks}
                style={{ height: '40px', padding: '0 1.5rem', fontSize: '14px', borderRadius: 0, fontWeight: 600 }}
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
