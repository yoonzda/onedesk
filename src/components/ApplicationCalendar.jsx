import React, { useState, useMemo } from 'react';
import { getHoliday, isWeekendOrHoliday } from '../utils/holidays';

export default function ApplicationCalendar({
  category = 'LEAVE', // 'LEAVE' | 'WORK'
  applyType = 'ANNUAL',
  selectedSlots = {}, // { '2026-09-10': 'ALL' | 'AM' | 'PM' }
  onToggleSlot,
  existingLeaves = []
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const todayStr = getTodayStr();

  // Helper for existing leave label (Strictly pure typography, NO badges/chips)
  const getExistingLeaveLabel = (leave) => {
    if (!leave) return '';
    if (leave.leaveType === 'REMOTE') return '재택';
    if (leave.leaveType === 'FIELD') return '외근';
    if (leave.leaveType === 'TRIP') return '출장';
    if (leave.leaveType === 'OVERTIME') return '야근';
    if (leave.leaveType === 'HOLIDAY_WORK') return '휴일근무';
    if (leave.leaveType === 'SPECIAL') return '경조사';
    if (leave.leaveType === 'SICK') return '병가';
    if (leave.leaveType === 'OFFICIAL') return '공가';
    if (leave.leaveType === 'ETC') return '기타';
    if (leave.timeSlot === 'AM') return '오전반차';
    if (leave.timeSlot === 'PM') return '오후반차';
    return '연차';
  };

  // Map of active leaves by date
  const activeLeavesMap = useMemo(() => {
    const map = {};
    (existingLeaves || []).forEach(leave => {
      if (leave.status === 'REJECTED' || leave.status === 'CANCELLED') return;
      if (!leave.startDate) return;

      const start = new Date(leave.startDate);
      const end = leave.endDate ? new Date(leave.endDate) : start;
      const cur = new Date(start);

      let count = 0;
      while (cur <= end && count < 60) {
        count++;
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${d}`;

        if (!map[dStr]) map[dStr] = [];
        map[dStr].push(leave);

        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [existingLeaves]);

  // Generate calendar days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();

  const days = [];
  // Trailing previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevLastDate - i;
    const prevM = month === 0 ? 12 : month;
    const prevY = month === 0 ? year - 1 : year;
    const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ day: d, isCurrentMonth: false, dateStr });
  }
  // Current month
  for (let i = 1; i <= lastDate; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ day: i, isCurrentMonth: true, dateStr });
  }
  // Leading next month
  const totalSlots = days.length <= 35 ? 35 : 42;
  const remaining = totalSlots - days.length;
  for (let i = 1; i <= remaining; i++) {
    const nextM = month === 11 ? 1 : month + 2;
    const nextY = month === 11 ? year + 1 : year;
    const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ day: i, isCurrentMonth: false, dateStr });
  }

  const weekHeaders = ['일', '월', '화', '수', '목', '금', '토'];

  // Handle cell clicks
  const handleCellClick = (dateStr, part = 'ALL', isSelectable = true) => {
    if (!isSelectable) return; // Silent non-interaction on disabled dates (Rule: NO popups)

    const dayLeaves = activeLeavesMap[dateStr] || [];
    const hasExistingAll = dayLeaves.some(l => l.timeSlot === 'ALL' || (!l.timeSlot && l.leaveType !== 'HALF_AM' && l.leaveType !== 'HALF_PM'));
    const hasExistingAm = hasExistingAll || dayLeaves.some(l => l.timeSlot === 'AM');
    const hasExistingPm = hasExistingAll || dayLeaves.some(l => l.timeSlot === 'PM');

    // Prevent collision clicks
    if (applyType === 'HALF_AM' && hasExistingAm) return;
    if (applyType === 'HALF_PM' && hasExistingPm) return;
    if (applyType !== 'HALF_AM' && applyType !== 'HALF_PM' && (hasExistingAll || hasExistingAm || hasExistingPm)) return;

    const current = selectedSlots[dateStr]; // undefined | 'ALL' | 'AM' | 'PM'

    // If applyType is HALF_AM (오전 반차 선택 모드)
    if (applyType === 'HALF_AM') {
      if (current === 'AM') {
        onToggleSlot(dateStr, null);
      } else {
        onToggleSlot(dateStr, 'AM');
      }
      return;
    }

    // If applyType is HALF_PM (오후 반차 선택 모드)
    if (applyType === 'HALF_PM') {
      if (current === 'PM') {
        onToggleSlot(dateStr, null);
      } else {
        onToggleSlot(dateStr, 'PM');
      }
      return;
    }

    // If applyType is HOLIDAY_WORK or OVERTIME (단일 날짜 시간 선택 모드)
    if (applyType === 'HOLIDAY_WORK' || applyType === 'OVERTIME') {
      if (current === 'ALL') {
        onToggleSlot(dateStr, null);
      } else {
        onToggleSlot(dateStr, 'ALL');
      }
      return;
    }

    // If full day type (연차, 재택근무, 병가, 경조사, 공가, 기타)
    if (current === 'ALL') {
      onToggleSlot(dateStr, null);
    } else {
      onToggleSlot(dateStr, 'ALL');
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* 1. Header (상단 달력 UserWorkCalendar와 통일: 배경 없음, 테두리 감싸기 없음) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        position: 'relative'
      }}>
        <button
          type="button"
          onClick={prevMonth}
          title="이전 달"
          aria-label="이전 달"
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
            borderRadius: '4px'
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <span style={{
          fontSize: '28px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: 'var(--text-primary)'
        }}>
          {year}년 {month + 1}월
        </span>

        <button
          type="button"
          onClick={nextMonth}
          title="다음 달"
          aria-label="다음 달"
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
            borderRadius: '4px'
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* 2. Calendar Grid Box (요일부터 감싸는 테두리 박스) */}
      <div style={{
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        overflow: 'hidden'
      }}>
        {/* Weekday Headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-main)'
        }}>
          {weekHeaders.map((head, idx) => {
            const isSun = idx === 0;
            const isSat = idx === 6;
            return (
              <div
                key={head}
                style={{
                  padding: '0.75rem 0.5rem',
                  textAlign: 'center',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: isSun ? '#ef4444' : (isSat ? '#3b82f6' : 'var(--text-primary)')
                }}
              >
                {head}
              </div>
            );
          })}
        </div>

        {/* Days Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          backgroundColor: 'var(--bg-card)'
        }}>
          {days.map(({ day, isCurrentMonth, dateStr }, idx) => {
            const slot = selectedSlots[dateStr]; // undefined | 'ALL' | 'AM' | 'PM'
            const isToday = dateStr === todayStr;
            const colIdx = idx % 7;
            const isSunday = colIdx === 0;
            const isSaturday = colIdx === 6;

            const holidayName = getHoliday(dateStr);
            const isHoliday = !!holidayName;
            const isWeekendHoliday = isWeekendOrHoliday(dateStr);

            // Existing leaves check
            const dayLeaves = activeLeavesMap[dateStr] || [];
            const hasExistingAll = dayLeaves.some(l => l.timeSlot === 'ALL' || (!l.timeSlot && l.leaveType !== 'HALF_AM' && l.leaveType !== 'HALF_PM'));
            const hasExistingAm = hasExistingAll || dayLeaves.some(l => l.timeSlot === 'AM');
            const hasExistingPm = hasExistingAll || dayLeaves.some(l => l.timeSlot === 'PM');

            // Selectability constraint:
            // 휴일근무: 주말 또는 법정공휴일만 선택 가능 (평일은 비활성화)
            // 기타: 평일만 선택 가능 (주말, 법정공휴일은 비활성화)
            const baseSelectable = isCurrentMonth && (applyType === 'HOLIDAY_WORK' ? isWeekendHoliday : !isWeekendHoliday);

            // Collision determination
            let isCollision = false;
            if (applyType === 'HALF_AM') {
              isCollision = hasExistingAm;
            } else if (applyType === 'HALF_PM') {
              isCollision = hasExistingPm;
            } else {
              isCollision = hasExistingAll || hasExistingAm || hasExistingPm;
            }

            const isSelectable = baseSelectable && !isCollision;

            const isAmSelected = slot === 'AM' || slot === 'ALL';
            const isPmSelected = slot === 'PM' || slot === 'ALL';
            const isAllSelected = slot === 'ALL';

            // Text color calculation:
            let dateColor = 'var(--text-primary)';
            if (isSunday || isHoliday) {
              dateColor = '#ef4444';
            } else if (isSaturday) {
              dateColor = '#3b82f6';
            } else if (!isSelectable) {
              dateColor = 'var(--text-muted)';
            }

            const isRightEdge = (idx + 1) % 7 === 0;
            const isBottomRow = idx >= days.length - 7;

            const cellBg = isCurrentMonth
              ? (isSelectable ? 'var(--bg-card)' : 'var(--bg-main)')
              : 'var(--bg-main)';
            
            const cellBgImage = (!isSelectable && isCurrentMonth)
              ? 'repeating-linear-gradient(135deg, rgba(128, 128, 128, 0.08) 0px, rgba(128, 128, 128, 0.08) 1px, transparent 1px, transparent 8px)'
              : 'none';

            const cellOpacity = isAllSelected || isAmSelected || isPmSelected
              ? 1
              : (!isCurrentMonth ? 0.25 : (isSelectable ? 1 : 0.55));

            const isHalfDay = applyType === 'HALF_AM' || applyType === 'HALF_PM';

            const existingSummary = dayLeaves.map(l => `${getExistingLeaveLabel(l)}${l.status === 'PENDING' ? ' (대기)' : ''}`).join(', ');

            if (!isHalfDay) {
              return (
                <div
                  key={dateStr}
                  onClick={() => handleCellClick(dateStr, 'ALL', isSelectable)}
                  title={
                    isCurrentMonth 
                      ? `${dateStr}${holidayName ? ` (${holidayName})` : ''}${existingSummary ? ` [등록 일정: ${existingSummary}]` : ''}` 
                      : ''
                  }
                  style={{
                    height: '86px',
                    backgroundColor: isAllSelected ? 'var(--text-primary)' : cellBg,
                    backgroundImage: isAllSelected ? 'none' : cellBgImage,
                    borderRight: isRightEdge ? 'none' : '1px solid var(--border-color)',
                    borderBottom: isBottomRow ? 'none' : '1px solid var(--border-color)',
                    padding: '0.45rem 0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                    cursor: isSelectable ? 'pointer' : 'not-allowed',
                    opacity: cellOpacity,
                    transition: 'background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (isSelectable && !isAllSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isSelectable && !isAllSelected) {
                      e.currentTarget.style.backgroundColor = cellBg;
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '6px'
                  }}>
                    <span style={{
                      fontSize: '16px',
                      lineHeight: 1,
                      fontWeight: isToday || isAllSelected ? 700 : (isSelectable ? 700 : 400),
                      color: isAllSelected ? 'var(--bg-card)' : dateColor
                    }}>
                      {day}
                    </span>
                    {holidayName && (
                      <span style={{
                        fontSize: '13px',
                        lineHeight: 1,
                        fontWeight: isSelectable ? 600 : 500,
                        color: isAllSelected 
                          ? 'var(--bg-card)' 
                          : '#ef4444',
                        opacity: isAllSelected ? 1 : (isSelectable ? 1 : 0.8),
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {holidayName}
                      </span>
                    )}
                  </div>

                  {/* 기존 신청/승인된 일정 텍스트 표기 (Strictly NO Badges / NO Chips) */}
                  {dayLeaves.length > 0 && isCurrentMonth && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      {dayLeaves.slice(0, 2).map((l, lIdx) => {
                        const lbl = getExistingLeaveLabel(l);
                        const isPending = l.status === 'PENDING';
                        return (
                          <div
                            key={l.id || lIdx}
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              lineHeight: 1.2,
                              color: isAllSelected 
                                ? 'var(--bg-card)' 
                                : (isPending ? '#60a5fa' : 'var(--text-secondary)'),
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>{lbl}</span>
                            {isPending && <span style={{ fontSize: '11px', opacity: 0.85 }}>· 대기</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Half-Day View
            const amLeave = dayLeaves.find(l => l.timeSlot === 'AM' || l.timeSlot === 'ALL' || (!l.timeSlot && l.leaveType !== 'HALF_PM'));
            const isAmSelectable = isCurrentMonth && (applyType === 'HALF_AM' ? (!isWeekendHoliday && !hasExistingAm) : !isWeekendHoliday);

            const pmLeave = dayLeaves.find(l => l.timeSlot === 'PM' || l.timeSlot === 'ALL' || (!l.timeSlot && l.leaveType !== 'HALF_AM'));
            const isPmSelectable = isCurrentMonth && (applyType === 'HALF_PM' ? (!isWeekendHoliday && !hasExistingPm) : !isWeekendHoliday);

            return (
              <div
                key={dateStr}
                style={{
                  height: '86px',
                  backgroundColor: cellBg,
                  backgroundImage: cellBgImage,
                  borderRight: isRightEdge ? 'none' : '1px solid var(--border-color)',
                  borderBottom: isBottomRow ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  userSelect: 'none',
                  cursor: (isAmSelectable || isPmSelectable) ? 'pointer' : 'not-allowed',
                  opacity: cellOpacity,
                  transition: 'opacity 0.15s ease'
                }}
              >
                {/* 상단 분할 영역 (오전 / 일자 번호) */}
                <div
                  onClick={() => handleCellClick(dateStr, 'AM', isAmSelectable)}
                  title={
                    isCurrentMonth 
                      ? `${dateStr} 오전${holidayName ? ` (${holidayName})` : ''}${amLeave ? ` [등록: ${getExistingLeaveLabel(amLeave)}]` : ''}` 
                      : ''
                  }
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    cursor: isAmSelectable ? 'pointer' : 'not-allowed',
                    backgroundColor: isAmSelected ? 'var(--text-primary)' : 'transparent',
                    color: isAmSelected ? 'var(--bg-card)' : dateColor,
                    borderBottom: isAllSelected ? '1px solid var(--text-primary)' : '1px dashed var(--border-color)',
                    transition: 'background-color 0.15s ease, color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (isAmSelectable && !isAmSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isAmSelectable && !isAmSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{
                      fontSize: '16px',
                      lineHeight: 1,
                      fontWeight: isToday || isAmSelected ? 700 : (isAmSelectable ? 700 : 400),
                      color: isAmSelected ? 'var(--bg-card)' : dateColor
                    }}>
                      {day}
                    </span>
                    {holidayName && (
                      <span style={{
                        fontSize: '12px',
                        lineHeight: 1,
                        color: isAmSelected ? 'var(--bg-card)' : '#ef4444'
                      }}>
                        {holidayName}
                      </span>
                    )}
                  </div>
                  {amLeave && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: isAmSelected ? 'var(--bg-card)' : (amLeave.status === 'PENDING' ? '#60a5fa' : 'var(--text-secondary)')
                    }}>
                      {getExistingLeaveLabel(amLeave)}{amLeave.status === 'PENDING' ? ' · 대기' : ''}
                    </span>
                  )}
                </div>

                {/* 하단 분할 영역 (오후) */}
                <div
                  onClick={() => handleCellClick(dateStr, 'PM', isPmSelectable)}
                  title={
                    isCurrentMonth 
                      ? `${dateStr} 오후${pmLeave ? ` [등록: ${getExistingLeaveLabel(pmLeave)}]` : ''}` 
                      : ''
                  }
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: isPmSelectable ? 'pointer' : 'not-allowed',
                    backgroundColor: isPmSelected ? 'var(--text-primary)' : 'transparent',
                    color: isPmSelected ? 'var(--bg-card)' : 'var(--text-secondary)',
                    transition: 'background-color 0.15s ease, color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (isPmSelectable && !isPmSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isPmSelectable && !isPmSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{
                    fontSize: '12px',
                    color: isPmSelected ? 'var(--bg-card)' : 'var(--text-muted)'
                  }}>
                    오후
                  </span>
                  {pmLeave && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: isPmSelected ? 'var(--bg-card)' : (pmLeave.status === 'PENDING' ? '#60a5fa' : 'var(--text-secondary)')
                    }}>
                      {getExistingLeaveLabel(pmLeave)}{pmLeave.status === 'PENDING' ? ' · 대기' : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
