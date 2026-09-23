import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

// 기본 30분 단위 시간 옵션 생성 (00:00 ~ 24:00)
const DEFAULT_TIME_OPTIONS = [];
for (let h = 0; h <= 24; h++) {
  const hh = String(h).padStart(2, '0');
  DEFAULT_TIME_OPTIONS.push(`${hh}:00`);
  if (h < 24) {
    DEFAULT_TIME_OPTIONS.push(`${hh}:30`);
  }
}

/**
 * CustomTimePicker
 * 상단 연/월 선택기(UserWorkCalendar)의 세련된 다크 팝오버 감성을 그대로 계승한
 * 1열 완성형 스마트 시간 선택기 (1클릭 즉시 선택 + 자동 중앙 스크롤)
 */
export default function CustomTimePicker({
  value = '09:00',
  onChange,
  minTime = null,
  filter = null,
  options = null,
  width = '120px',
  height = '44px',
  style = {},
  align = 'left',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const selectedItemRef = useRef(null);

  // 사용 가능한 옵션 리스트 필터링
  const availableOptions = useMemo(() => {
    let list = options || DEFAULT_TIME_OPTIONS;

    // 사용자 정의 필터 적용
    if (typeof filter === 'function') {
      list = list.filter(filter);
    }

    // minTime 보다 큰 시간만 노출 (종료 시간용)
    if (minTime) {
      const [sh, sm] = minTime.split(':').map(Number);
      const minMinutes = sh * 60 + sm;
      list = list.filter(t => {
        const [th, tm] = t.split(':').map(Number);
        return th * 60 + tm > minMinutes;
      });
    }

    return list;
  }, [options, filter, minTime]);

  // 화면 하단 공간 감지 후 필요 시 위쪽으로 전개
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 250 && rect.top > 250) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // 팝오버 열릴 때 현재 선택된 시간 항목으로 부드럽게 자동 중앙 스크롤
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (listRef.current && selectedItemRef.current) {
          const container = listRef.current;
          const target = selectedItemRef.current;
          container.scrollTop = target.offsetTop - (container.clientHeight / 2) + (target.clientHeight / 2);
        }
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [isOpen, value]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 시간 1클릭 선택 처리
  const handleSelect = (timeStr) => {
    if (onChange) {
      onChange(timeStr);
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        userSelect: 'none',
        ...style
      }}
    >
      {/* 트리거 버튼: 미니멀하고 단정한 인풋 스타일 + 선명한 시계 아이콘 */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        style={{
          width,
          height,
          padding: '0 0.85rem',
          fontSize: '15px',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          backgroundColor: 'var(--bg-input)',
          border: isOpen ? '1px solid #3b82f6' : '1px solid var(--border-color)',
          borderRadius: 0,
          color: 'var(--text-primary)',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          transition: 'border-color 0.15s ease'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span>{value || '00:00'}</span>
        </div>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--text-secondary)',
            transition: 'transform 0.18s ease',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            flexShrink: 0
          }}
        />
      </button>

      {/* 스마트 1열 다크 팝오버 (연/월 선택기 감성 + 직각 라운딩 0) */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            ...(openUpward
              ? { bottom: 'calc(100% + 6px)', top: 'auto', boxShadow: '0 -16px 36px rgba(0, 0, 0, 0.5)' }
              : { top: 'calc(100% + 6px)', bottom: 'auto', boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)' }
            ),
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            zIndex: 1100,
            width,
            minWidth: '120px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 0,
            overflow: 'hidden',
            animation: 'fadeIn 0.18s ease-out'
          }}
        >
          {/* 1열 세로 스크롤 리스트 (스크롤바 숨김 + 터치/휠 롤러) */}
          <div
            ref={listRef}
            className="no-scrollbar"
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '0.4rem 0',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {availableOptions.map(t => {
              const isSelected = t === value;
              return (
                <div
                  key={t}
                  ref={isSelected ? selectedItemRef : null}
                  onClick={() => handleSelect(t)}
                  style={{
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: isSelected ? 700 : 500,
                    fontVariantNumeric: 'tabular-nums',
                    color: isSelected ? '#3b82f6' : 'var(--text-primary)',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.05))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {t}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
