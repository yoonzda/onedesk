import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

export default function CustomDatePicker({ 
  value, 
  onChange, 
  requestDates = [],
  placeholder = '전체 날짜',
  width = '180px',
  height = '42px',
  style = {},
  align = 'left',
  clearable = true,
  minDate = null,
  maxDate = null,
  iconOnly = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);
  const containerRef = useRef(null);

  // Update viewDate if value changes externally
  useEffect(() => {
    if (value) {
      setViewDate(new Date(value));
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };
  
  const nextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const todayStr = getTodayStr();

  // Generate calendar days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();

  const days = [];
  // Trailing days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevLastDate - i;
    const prevM = month === 0 ? 12 : month;
    const prevY = month === 0 ? year - 1 : year;
    const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ day: d, isCurrentMonth: false, dateStr });
  }
  // Current month days
  for (let i = 1; i <= lastDate; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ day: i, isCurrentMonth: true, dateStr });
  }
  // Leading days from next month
  const totalSlots = days.length <= 35 ? 35 : 42;
  const remaining = totalSlots - days.length;
  for (let i = 1; i <= remaining; i++) {
    const nextM = month === 11 ? 1 : month + 2;
    const nextY = month === 11 ? year + 1 : year;
    const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ day: i, isCurrentMonth: false, dateStr });
  }

  const handleSelectDate = (dateStr) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const effectiveWidth = iconOnly ? 'auto' : width;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: effectiveWidth, display: iconOnly ? 'inline-block' : 'block', ...style }}>
      {/* Trigger: iconOnly 시 테두리/배경색 없는 순수 아이콘 버튼, 일반 모드 시 form-control 박스 */}
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title={value ? `선택된 날짜: ${value} (클릭하여 변경)` : placeholder}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: (isOpen || value) ? 'var(--text-primary)' : 'var(--text-muted)',
            opacity: (isOpen || value) ? 1 : 0.45,
            outline: 'none',
            userSelect: 'none',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = (isOpen || value) ? 'var(--text-primary)' : 'var(--text-muted)';
            e.currentTarget.style.opacity = (isOpen || value) ? '1' : '0.45';
          }}
        >
          <Calendar size={22} strokeWidth={2} />
        </button>
      ) : (
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="form-control"
          style={{
            height,
            width: '100%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            userSelect: 'none',
            padding: '0 0.85rem',
            backgroundColor: 'var(--bg-input)',
            borderColor: isOpen ? 'var(--border-focus)' : 'var(--border-color)',
            color: value ? 'var(--text-primary)' : 'var(--text-muted)'
          }}
        >
          <span style={{ fontSize: '15px' }}>
            {value || placeholder}
          </span>
          {value && clearable && (
            <span 
              onClick={handleClear}
              title="날짜 초기화"
              style={{ 
                fontSize: '18px', 
                color: 'var(--text-muted)', 
                marginLeft: '6px',
                cursor: 'pointer'
              }}
            >
              ×
            </span>
          )}
        </div>
      )}

      {/* Spacious Custom Date Picker Overlay */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            width: '340px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-focus)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28)',
            zIndex: 9999
          }}
        >
          {/* Header: Arrow Navigation and YYYY. MM format */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={prevMonth}
              aria-label="이전 달"
              style={{ width: '36px', height: '36px', padding: 0, fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ‹
            </button>
            <div style={{ fontSize: '18px', color: 'var(--text-primary)', letterSpacing: '0.04em', fontWeight: 600 }}>
              {year}. {String(month + 1).padStart(2, '0')}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={nextMonth}
              aria-label="다음 달"
              style={{ width: '36px', height: '36px', padding: 0, fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ›
            </button>
          </div>

          {/* Weekday Names */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            textAlign: 'center',
            marginBottom: '0.65rem',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-muted)'
          }}>
            <div>일</div>
            <div>월</div>
            <div>화</div>
            <div>수</div>
            <div>목</div>
            <div>금</div>
            <div>토</div>
          </div>

          {/* Days Grid - Spacious Cells with Request Day Indicator */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px'
          }}>
            {days.map((item, idx) => {
              const isSelected = value === item.dateStr;
              const isToday = todayStr === item.dateStr;
              const hasRequest = requestDates && requestDates.includes(item.dateStr);
              const isDisabled = Boolean((minDate && item.dateStr < minDate) || (maxDate && item.dateStr > maxDate));

              const textColor = isDisabled 
                ? 'var(--text-muted)' 
                : (item.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)');

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleSelectDate(item.dateStr)}
                  style={{
                    height: '42px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    border: isSelected 
                      ? '1px solid var(--primary)' 
                      : (isToday ? '1px solid var(--border-color)' : '1px solid transparent'),
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected 
                      ? 'var(--primary)' 
                      : 'transparent',
                    color: isSelected 
                      ? 'var(--bg-main)' 
                      : textColor,
                    opacity: isDisabled ? 0.2 : (item.isCurrentMonth ? 1 : 0.35),
                    fontSize: '16px',
                    fontWeight: 400,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{ lineHeight: 1 }}>{item.day}</span>
                  {hasRequest && !isDisabled && (
                    <span 
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? 'var(--bg-main)' : 'var(--text-primary)',
                        marginTop: '3px'
                      }} 
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer: Compact Today button */}
          {(() => {
            const isTodayDisabled = Boolean((minDate && todayStr < minDate) || (maxDate && todayStr > maxDate));
            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '0.85rem',
                paddingTop: '0.65rem',
                borderTop: '1px solid var(--border-color)'
              }}>
                <button
                  type="button"
                  disabled={isTodayDisabled}
                  className="btn btn-secondary btn-sm"
                  onClick={() => !isTodayDisabled && handleSelectDate(todayStr)}
                  style={{
                    padding: '0.3rem 1.2rem',
                    fontSize: '15px',
                    height: 'auto',
                    lineHeight: 1.4,
                    opacity: isTodayDisabled ? 0.35 : 1,
                    cursor: isTodayDisabled ? 'not-allowed' : 'pointer',
                    fontWeight: 400
                  }}
                >
                  오늘
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
