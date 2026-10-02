import React, { useState } from 'react';
import { X, Check, ArrowRight, Eye, RefreshCw } from 'lucide-react';

export default function ModalStyleTestPage({ currentStyle = 1, onSelectStyle, onBack }) {
  const [activePreviewStyle, setActivePreviewStyle] = useState(null); // 1 ~ 5 for live backdrop preview
  const [testInputValues, setTestInputValues] = useState({
    1: '새부서 4',
    2: '새부서 4',
    3: '새부서 4',
    4: '새부서 4',
    5: '새부서 4'
  });
  const [appliedStyle, setAppliedStyle] = useState(currentStyle);

  const handleInputChange = (styleNum, val) => {
    setTestInputValues(prev => ({ ...prev, [styleNum]: val }));
  };

  const handleApply = (styleNum) => {
    setAppliedStyle(styleNum);
    if (onSelectStyle) onSelectStyle(styleNum);
    localStorage.setItem('ws_dept_modal_style', styleNum.toString());
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-main, #0f0f12)',
      color: 'var(--text-primary, #ffffff)',
      padding: '3rem 2.5rem 6rem 2.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '3rem'
    }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color, #27272a)',
        paddingBottom: '1.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color, #38383e)',
                color: 'var(--text-secondary, #a1a1aa)',
                padding: '0.5rem 1rem',
                fontSize: '14.5px',
                fontWeight: 400,
                cursor: 'pointer',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              돌아가기
            </button>
          )}
          <h2 style={{
            fontSize: '22px',
            fontWeight: 400,
            margin: 0,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            신규 부서 추가 팝업 스타일 테스트
          </h2>
        </div>

        <div style={{
          fontSize: '15px',
          fontWeight: 400,
          color: 'var(--text-secondary)'
        }}>
          현재 적용 스타일: 스타일 {appliedStyle}
        </div>
      </div>

      {/* Grid of 5 Styles Side-by-Side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '2.5rem',
        alignItems: 'start'
      }}>

        {/* ---------------- STYLE 1: Minimalist Underline ---------------- */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          border: '1px solid var(--border-color, #27272a)',
          backgroundColor: 'rgba(255, 255, 255, 0.015)',
          padding: '1.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)' }}>
              스타일 1 · 선형 언더라인 & 절제미
            </div>
            {appliedStyle === 1 && (
              <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 400 }}>[현재 적용됨]</span>
            )}
          </div>

          {/* Modal Mockup Container */}
          <div style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#161619',
            border: '1px solid #303036',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            padding: '2.25rem 2rem 2rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.75rem'
          }}>
            {/* Top Close Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '18px', fontWeight: 400, color: '#ffffff' }}>
                신규 부서 추가
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Underline Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <input
                type="text"
                value={testInputValues[1]}
                onChange={(e) => handleInputChange(1, e.target.value)}
                placeholder="부서명을 입력하세요"
                style={{
                  width: '100%',
                  height: '40px',
                  fontSize: '16px',
                  fontWeight: 400,
                  padding: '0 0.25rem',
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderBottom: '1px solid #ffffff',
                  outline: 'none',
                  borderRadius: 0
                }}
              />
            </div>

            {/* Action Button */}
            <button
              type="button"
              style={{
                width: '100%',
                height: '42px',
                fontSize: '15px',
                fontWeight: 400,
                backgroundColor: '#ffffff',
                color: '#09090b',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 0,
                transition: 'opacity 0.15s ease'
              }}
            >
              확인
            </button>
          </div>

          {/* Card Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setActivePreviewStyle(1)}
              style={{
                flex: 1,
                height: '38px',
                fontSize: '14.5px',
                fontWeight: 400,
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Eye size={15} /> 화면 미리보기
            </button>
            <button
              type="button"
              onClick={() => handleApply(1)}
              style={{
                flex: 1,
                height: '38px',
                fontSize: '14.5px',
                fontWeight: 400,
                backgroundColor: appliedStyle === 1 ? '#27272a' : 'var(--text-primary)',
                color: appliedStyle === 1 ? '#a1a1aa' : 'var(--bg-main)',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 0
              }}
            >
              {appliedStyle === 1 ? '적용 중' : '이 스타일로 적용'}
            </button>
          </div>
        </div>

        {/* ---------------- STYLE 2: Integrated Framed & Flush Action ---------------- */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          border: '1px solid var(--border-color, #27272a)',
          backgroundColor: 'rgba(255, 255, 255, 0.015)',
          padding: '1.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)' }}>
              스타일 2 · 프레임 통합 & 하단 플러시 바
            </div>
            {appliedStyle === 2 && (
              <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 400 }}>[현재 적용됨]</span>
            )}
          </div>

          {/* Modal Mockup Container */}
          <div style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#18181c',
            border: '1px solid #323238',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header + Input Body */}
            <div style={{ padding: '2rem 1.75rem 1.75rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '17.5px', fontWeight: 400, color: '#ffffff' }}>
                  신규 부서 추가
                </div>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#71717a' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Inset Box Input */}
              <input
                type="text"
                value={testInputValues[2]}
                onChange={(e) => handleInputChange(2, e.target.value)}
                placeholder="부서명을 입력하세요"
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '15px',
                  fontWeight: 400,
                  padding: '0 1rem',
                  backgroundColor: '#101012',
                  color: '#ffffff',
                  border: '1px solid #2e2e34',
                  outline: 'none',
                  borderRadius: 0,
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)'
                }}
              />
            </div>

            {/* Edge-to-Edge Flush Action Button */}
            <button
              type="button"
              style={{
                width: '100%',
                height: '46px',
                fontSize: '15px',
                fontWeight: 400,
                backgroundColor: '#26262c',
                color: '#ffffff',
                border: 'none',
                borderTop: '1px solid #323238',
                cursor: 'pointer',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s ease'
              }}
            >
              확인
            </button>
          </div>

          {/* Card Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setActivePreviewStyle(2)}
              style={{
                flex: 1,
                height: '38px',
                fontSize: '14.5px',
                fontWeight: 400,
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Eye size={15} /> 화면 미리보기
            </button>
            <button
              type="button"
              onClick={() => handleApply(2)}
              style={{
                flex: 1,
                height: '38px',
                fontSize: '14.5px',
                fontWeight: 400,
                backgroundColor: appliedStyle === 2 ? '#27272a' : 'var(--text-primary)',
                color: appliedStyle === 2 ? '#a1a1aa' : 'var(--bg-main)',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 0
              }}
            >
              {appliedStyle === 2 ? '적용 중' : '이 스타일로 적용'}
            </button>
          </div>
        </div>

        {/* ---------------- STYLE 3: High-Contrast Inverted Solid ---------------- */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          border: '1px solid var(--border-color, #27272a)',
          backgroundColor: 'rgba(255, 255, 255, 0.015)',
          padding: '1.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)' }}>
              스타일 3 · 하이콘트라스트 흑백 정통파
            </div>
            {appliedStyle === 3 && (
              <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 400 }}>[현재 적용됨]</span>
            )}
          </div>

          {/* Modal Mockup Container */}
          <div style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#121214',
            border: '1px solid #44444a',
            boxShadow: '0 20px 48px rgba(0,0,0,0.7)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            textAlign: 'center'
          }}>
            {/* Top Close Button */}
            <button
              type="button"
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: '#a1a1aa'
              }}
            >
              <X size={18} />
            </button>

            {/* Title */}
            <div style={{ fontSize: '18px', fontWeight: 400, color: '#ffffff', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
              신규 부서 추가
            </div>

            {/* Sharp Box Input with Bright Border */}
            <input
              type="text"
              value={testInputValues[3]}
              onChange={(e) => handleInputChange(3, e.target.value)}
              placeholder="부서명을 입력하세요"
              style={{
                width: '100%',
                height: '44px',
                fontSize: '15.5px',
                fontWeight: 400,
                padding: '0 1rem',
                backgroundColor: '#1b1b1e',
                color: '#ffffff',
                border: '1px solid #5a5a64',
                outline: 'none',
                borderRadius: 0,
                textAlign: 'center'
              }}
            />

            {/* Primary Action Button */}
            <button
              type="button"
              style={{
                width: '100%',
                height: '44px',
                fontSize: '15.5px',
                fontWeight: 400,
                backgroundColor: '#ffffff',
                color: '#000000',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 0,
                letterSpacing: '-0.01em',
                transition: 'opacity 0.15s ease'
              }}
            >
              확인
            </button>
          </div>

          {/* Card Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setActivePreviewStyle(3)}
              style={{
                flex: 1,
                height: '38px',
                fontSize: '14.5px',
                fontWeight: 400,
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Eye size={15} /> 화면 미리보기
            </button>
            <button
              type="button"
              onClick={() => handleApply(3)}
              style={{
                flex: 1,
                height: '38px',
                fontSize: '14.5px',
                fontWeight: 400,
                backgroundColor: appliedStyle === 3 ? '#27272a' : 'var(--text-primary)',
                color: appliedStyle === 3 ? '#a1a1aa' : 'var(--bg-main)',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 0
              }}
            >
              {appliedStyle === 3 ? '적용 중' : '이 스타일로 적용'}
            </button>
          </div>
        </div>

        {/* ---------------- STYLE 4: Glassmorphic Translucent Dark ---------------- */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          border: '1px solid var(--border-color, #27272a)',
          backgroundColor: 'rgba(255, 255, 255, 0.015)',
          padding: '1.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)' }}>
              스타일 4 · 글래스모피즘 & 림 하이라이트
            </div>
            {appliedStyle === 4 && (
              <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 400 }}>[현재 적용됨]</span>
            )}
          </div>

          {/* Modal Mockup Container with Top Highlight Rim */}
          <div style={{
            position: 'relative',
            width: '100%',
            backgroundColor: 'rgba(28, 28, 34, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
            padding: '2.5rem 2rem 2rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            textAlign: 'center'
          }}>
            {/* Top Rim Shimmer Line */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
            }} />

            {/* Top Close Button */}
            <button
              type="button"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)'
              }}
            >
              <X size={18} />
            </button>

            {/* Title */}
            <div style={{ fontSize: '18px', fontWeight: 400, color: '#ffffff' }}>
              신규 부서 추가
            </div>

            {/* Translucent Input */}
            <input
              type="text"
              value={testInputValues[4]}
              onChange={(e) => handleInputChange(4, e.target.value)}
              placeholder="부서명을 입력하세요"
              style={{
                width: '100%',
                height: '44px',
                fontSize: '15px',
                fontWeight: 400,
                padding: '0 1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                outline: 'none',
                borderRadius: 0,
                textAlign: 'center'
              }}
            />

            {/* Shimmer Border Action Button */}
            <button
              type="button"
              style={{
                width: '100%',
                height: '42px',
                fontSize: '15px',
                fontWeight: 400,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                cursor: 'pointer',
                borderRadius: 0,
                transition: 'all 0.15s ease'
              }}
            >
              확인
            </button>
          </div>

          {/* Card Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setActivePreviewStyle(4)}
              style={{
                flex: 1,
                height: '38px',
                fontSize: '14.5px',
                fontWeight: 400,
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Eye size={15} /> 화면 미리보기
            </button>
            <button
              type="button"
              onClick={() => handleApply(4)}
              style={{
                flex: 1,
                height: '38px',
                fontSize: '14.5px',
                fontWeight: 400,
                backgroundColor: appliedStyle === 4 ? '#27272a' : 'var(--text-primary)',
                color: appliedStyle === 4 ? '#a1a1aa' : 'var(--bg-main)',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 0
              }}
            >
              {appliedStyle === 4 ? '적용 중' : '이 스타일로 적용'}
            </button>
          </div>
        </div>

        {/* ---------------- STYLE 5: Compact Inline Command Bar ---------------- */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          border: '1px solid var(--border-color, #27272a)',
          backgroundColor: 'rgba(255, 255, 255, 0.015)',
          padding: '1.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)' }}>
              스타일 5 · 가로 결합 커맨드 바 (Compact Row)
            </div>
            {appliedStyle === 5 && (
              <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 400 }}>[현재 적용됨]</span>
            )}
          </div>

          {/* Modal Mockup Container: Horizontal & Compact */}
          <div style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#18181b',
            border: '1px solid #38383e',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            padding: '2rem 1.75rem 1.75rem 1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '15px', color: '#a1a1aa', fontWeight: 400 }}>
                신규 부서 추가
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Combined Input + Inline Confirm Button Row */}
            <div style={{
              display: 'flex',
              border: '1px solid #4a4a54',
              backgroundColor: '#121214'
            }}>
              <input
                type="text"
                value={testInputValues[5]}
                onChange={(e) => handleInputChange(5, e.target.value)}
                placeholder="부서명을 입력하세요"
                style={{
                  flex: 1,
                  height: '44px',
                  fontSize: '15.5px',
                  fontWeight: 400,
                  padding: '0 1rem',
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  outline: 'none',
                  borderRadius: 0
                }}
              />
              <button
                type="button"
                style={{
                  padding: '0 1.5rem',
                  height: '44px',
                  fontSize: '14.5px',
                  fontWeight: 400,
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  border: 'none',
                  borderLeft: '1px solid #4a4a54',
                  cursor: 'pointer',
                  borderRadius: 0,
                  whiteSpace: 'nowrap'
                }}
              >
                확인
              </button>
            </div>
          </div>

          {/* Card Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setActivePreviewStyle(5)}
              style={{
                flex: 1,
                height: '38px',
                fontSize: '14.5px',
                fontWeight: 400,
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Eye size={15} /> 화면 미리보기
            </button>
            <button
              type="button"
              onClick={() => handleApply(5)}
              style={{
                flex: 1,
                height: '38px',
                fontSize: '14.5px',
                fontWeight: 400,
                backgroundColor: appliedStyle === 5 ? '#27272a' : 'var(--text-primary)',
                color: appliedStyle === 5 ? '#a1a1aa' : 'var(--bg-main)',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 0
              }}
            >
              {appliedStyle === 5 ? '적용 중' : '이 스타일로 적용'}
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* FULL-SCREEN LIVE MODAL PREVIEW OVERLAY                                    */}
      {/* ========================================================================= */}
      {activePreviewStyle !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActivePreviewStyle(null);
          }}
        >
          {/* Close notice top bar */}
          <div style={{
            position: 'absolute',
            top: '20px',
            color: 'var(--text-muted)',
            fontSize: '14px',
            fontWeight: 400
          }}>
            [스타일 {activePreviewStyle} 실제 팝업 미리보기 - 닫으려면 배경 클릭 또는 X 버튼]
          </div>

          {/* STYLE 1 FULL PREVIEW */}
          {activePreviewStyle === 1 && (
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '360px',
              backgroundColor: '#161619',
              border: '1px solid #303036',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              padding: '2.5rem 2.25rem 2.25rem 2.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '19px', fontWeight: 400, color: '#ffffff' }}>
                  신규 부서 추가
                </div>
                <button
                  type="button"
                  onClick={() => setActivePreviewStyle(null)}
                  style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#71717a' }}
                >
                  <X size={18} />
                </button>
              </div>

              <input
                type="text"
                autoFocus
                value={testInputValues[1]}
                onChange={(e) => handleInputChange(1, e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setActivePreviewStyle(null);
                }}
                style={{
                  width: '100%',
                  height: '42px',
                  fontSize: '16px',
                  fontWeight: 400,
                  padding: '0 0.25rem',
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderBottom: '1px solid #ffffff',
                  outline: 'none',
                  borderRadius: 0
                }}
              />

              <button
                type="button"
                onClick={() => {
                  handleApply(1);
                  setActivePreviewStyle(null);
                }}
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '15px',
                  fontWeight: 400,
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 0
                }}
              >
                확인 (이 스타일로 적용)
              </button>
            </div>
          )}

          {/* STYLE 2 FULL PREVIEW */}
          {activePreviewStyle === 2 && (
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#18181c',
              border: '1px solid #323238',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '2.25rem 2rem 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '18px', fontWeight: 400, color: '#ffffff' }}>
                    신규 부서 추가
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePreviewStyle(null)}
                    style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#71717a' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <input
                  type="text"
                  autoFocus
                  value={testInputValues[2]}
                  onChange={(e) => handleInputChange(2, e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') setActivePreviewStyle(null);
                  }}
                  style={{
                    width: '100%',
                    height: '44px',
                    fontSize: '15px',
                    fontWeight: 400,
                    padding: '0 1rem',
                    backgroundColor: '#101012',
                    color: '#ffffff',
                    border: '1px solid #2e2e34',
                    outline: 'none',
                    borderRadius: 0,
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  handleApply(2);
                  setActivePreviewStyle(null);
                }}
                style={{
                  width: '100%',
                  height: '46px',
                  fontSize: '15px',
                  fontWeight: 400,
                  backgroundColor: '#26262c',
                  color: '#ffffff',
                  border: 'none',
                  borderTop: '1px solid #323238',
                  cursor: 'pointer',
                  borderRadius: 0
                }}
              >
                확인 (이 스타일로 적용)
              </button>
            </div>
          )}

          {/* STYLE 3 FULL PREVIEW */}
          {activePreviewStyle === 3 && (
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '360px',
              backgroundColor: '#121214',
              border: '1px solid #44444a',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              textAlign: 'center'
            }}>
              <button
                type="button"
                onClick={() => setActivePreviewStyle(null)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#a1a1aa'
                }}
              >
                <X size={18} />
              </button>

              <div style={{ fontSize: '18px', fontWeight: 400, color: '#ffffff', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                신규 부서 추가
              </div>

              <input
                type="text"
                autoFocus
                value={testInputValues[3]}
                onChange={(e) => handleInputChange(3, e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setActivePreviewStyle(null);
                }}
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '15.5px',
                  fontWeight: 400,
                  padding: '0 1rem',
                  backgroundColor: '#1b1b1e',
                  color: '#ffffff',
                  border: '1px solid #5a5a64',
                  outline: 'none',
                  borderRadius: 0,
                  textAlign: 'center'
                }}
              />

              <button
                type="button"
                onClick={() => {
                  handleApply(3);
                  setActivePreviewStyle(null);
                }}
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '15.5px',
                  fontWeight: 400,
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 0,
                  letterSpacing: '-0.01em'
                }}
              >
                확인 (이 스타일로 적용)
              </button>
            </div>
          )}

          {/* STYLE 4 FULL PREVIEW */}
          {activePreviewStyle === 4 && (
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '360px',
              backgroundColor: 'rgba(28, 28, 34, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              padding: '2.5rem 2rem 2rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
              }} />

              <button
                type="button"
                onClick={() => setActivePreviewStyle(null)}
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)'
                }}
              >
                <X size={18} />
              </button>

              <div style={{ fontSize: '18px', fontWeight: 400, color: '#ffffff' }}>
                신규 부서 추가
              </div>

              <input
                type="text"
                autoFocus
                value={testInputValues[4]}
                onChange={(e) => handleInputChange(4, e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setActivePreviewStyle(null);
                }}
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '15px',
                  fontWeight: 400,
                  padding: '0 1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  outline: 'none',
                  borderRadius: 0,
                  textAlign: 'center'
                }}
              />

              <button
                type="button"
                onClick={() => {
                  handleApply(4);
                  setActivePreviewStyle(null);
                }}
                style={{
                  width: '100%',
                  height: '42px',
                  fontSize: '15px',
                  fontWeight: 400,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.28)',
                  cursor: 'pointer',
                  borderRadius: 0
                }}
              >
                확인 (이 스타일로 적용)
              </button>
            </div>
          )}

          {/* STYLE 5 FULL PREVIEW */}
          {activePreviewStyle === 5 && (
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#18181b',
              border: '1px solid #38383e',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              padding: '2rem 1.75rem 1.75rem 1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '15px', color: '#a1a1aa', fontWeight: 400 }}>
                  신규 부서 추가
                </div>
                <button
                  type="button"
                  onClick={() => setActivePreviewStyle(null)}
                  style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#71717a' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{
                display: 'flex',
                border: '1px solid #4a4a54',
                backgroundColor: '#121214'
              }}>
                <input
                  type="text"
                  autoFocus
                  value={testInputValues[5]}
                  onChange={(e) => handleInputChange(5, e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') setActivePreviewStyle(null);
                  }}
                  placeholder="부서명을 입력하세요"
                  style={{
                    flex: 1,
                    height: '44px',
                    fontSize: '15.5px',
                    fontWeight: 400,
                    padding: '0 1rem',
                    backgroundColor: 'transparent',
                    color: '#ffffff',
                    border: 'none',
                    outline: 'none',
                    borderRadius: 0
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    handleApply(5);
                    setActivePreviewStyle(null);
                  }}
                  style={{
                    padding: '0 1.5rem',
                    height: '44px',
                    fontSize: '14.5px',
                    fontWeight: 400,
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    border: 'none',
                    borderLeft: '1px solid #4a4a54',
                    cursor: 'pointer',
                    borderRadius: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  확인 (적용)
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
