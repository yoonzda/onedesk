import React, { useState } from 'react';

export default function CompleteModal({ 
  request, 
  user, 
  onClose, 
  onComplete 
}) {
  const [breakdown, setBreakdown] = useState({
    design: 0,
    publish: 0,
    dev: 2.0,
    etc: 0
  });
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 220);
  };

  const totalHours = (Number(breakdown.design) || 0) + 
                     (Number(breakdown.publish) || 0) + 
                     (Number(breakdown.dev) || 0) + 
                     (Number(breakdown.etc) || 0);

  const handleBreakdownChange = (field, val) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setBreakdown(prev => ({
      ...prev,
      [field]: num
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalHours <= 0) {
      alert('최소 1개 이상의 분야에 투입 공수(시간)를 입력해 주세요.');
      return;
    }

    setLoading(true);
    await onComplete(request.id, totalHours, summary, breakdown);
    setLoading(false);
  };

  return (
    <div
      className={`detail-backdrop ${isClosing ? 'closing' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`detail-slide-drawer drawer-md ${isClosing ? 'closing' : ''}`}
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
            작업 완료 및 공수 등록
          </h3>
          <button
            type="button"
            onClick={handleClose}
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

        {/* Drawer Body (Scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2.25rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            {/* Hero Work Title */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.35,
                color: 'var(--text-primary)'
              }}>
                {request.title}
              </div>
              <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                고객사: {request.clientName}
              </div>
            </div>

            {/* Row List */}
            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-color)' }}>
              {/* Row 1: 담당자 */}
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
                <div style={{ flex: 1, fontSize: '17px', color: 'var(--text-primary)' }}>
                  {user.name} ({user.dept || '부서'})
                </div>
              </div>

              {/* Row 2: 분야별 공수 */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '1.25rem 0',
                borderBottom: '1px solid var(--border-color)',
                gap: '1.5rem'
              }}>
                <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0, paddingTop: '6px' }}>
                  투입 공수
                </span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>디자인</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={breakdown.design || ''}
                        onChange={(e) => handleBreakdownChange('design', e.target.value)}
                        placeholder="0.0"
                        style={{
                          height: '42px',
                          fontSize: '16px',
                          textAlign: 'center',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>퍼블리싱</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={breakdown.publish || ''}
                        onChange={(e) => handleBreakdownChange('publish', e.target.value)}
                        placeholder="0.0"
                        style={{
                          height: '42px',
                          fontSize: '16px',
                          textAlign: 'center',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>개발</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={breakdown.dev || ''}
                        onChange={(e) => handleBreakdownChange('dev', e.target.value)}
                        placeholder="0.0"
                        style={{
                          height: '42px',
                          fontSize: '16px',
                          textAlign: 'center',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>기타</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={breakdown.etc || ''}
                        onChange={(e) => handleBreakdownChange('etc', e.target.value)}
                        placeholder="0.0"
                        style={{
                          height: '42px',
                          fontSize: '16px',
                          textAlign: 'center',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: '15px', color: 'var(--text-secondary)', paddingTop: '0.25rem' }}>
                    총 합산 공수: <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '17px' }}>{totalHours}시간</span> <span style={{ color: 'var(--text-muted)' }}>(약 {(totalHours / 8).toFixed(2)} M/D)</span>
                  </div>
                </div>
              </div>

              {/* Row 3: 조치 요약 */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '1.25rem 0',
                borderBottom: '1px solid var(--border-color)',
                gap: '1.5rem'
              }}>
                <span style={{ width: '100px', fontSize: '17px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0, paddingTop: '4px' }}>
                  조치 요약
                </span>
                <textarea
                  required
                  rows={4}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="작업 완료 조치 요약 및 고객사 전달 내용을 입력하세요"
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
              paddingTop: '2.5rem',
              width: '100%'
            }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '46px',
                  fontSize: '16px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {loading ? '처리 중...' : '작업 완료 및 공수 등록 완료'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
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
  );
}
