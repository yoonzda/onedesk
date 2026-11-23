import React from 'react';

// Helper to determine category label in pure typography
function getCategoryLabel(notif) {
  const type = notif.type?.toUpperCase() || '';
  const link = notif.link?.toLowerCase() || '';

  if (type.includes('SCHEDULE') || type.includes('MEETING') || link === 'calendar') {
    return '회의 일정';
  }
  if (type.includes('LEAVE') || type.includes('ATTEND') || link === 'commute' || link === 'admin_attendance') {
    return '근태 · 결재';
  }
  if (type.includes('CLIENT') || link === 'client_requests') {
    return '고객사 요청';
  }
  if (type.includes('ANNOUNCE') || link === 'settings') {
    return '사내 공지';
  }
  return '업무 알림';
}

// Extract '누구' (발신자 / 요청자 / 고객사 / 관련 대상)
function getNotificationActor(notif) {
  if (notif.actorName) return notif.actorName;
  if (notif.senderName) return notif.senderName;
  if (notif.userName) return notif.userName;
  if (notif.clientName) return notif.clientName;
  if (notif.authorName) return notif.authorName;

  const msg = notif.message || '';
  
  // 회사명 또는 대상 [대괄호] 추출
  const bracketMatch = msg.match(/^\[(.*?)\]/);
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1];
  }

  // "XXX님이" 형태 추출
  const nimMatch = msg.match(/([가-힣a-zA-Z0-9\s]+)님이/);
  if (nimMatch && nimMatch[1]) {
    return nimMatch[1].trim();
  }

  if (notif.clientCompanyName) return notif.clientCompanyName;
  if (notif.companyName) return notif.companyName;

  return getCategoryLabel(notif);
}

// Time grouping logic: 오늘, 어제, 이번 주, 이번 달, 지난 달, 오래된 알림
function getNotificationGroup(dateStr) {
  if (!dateStr) return '오래된 알림';
  const normalized = dateStr.replace(' ', 'T');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return '오래된 알림';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  // 이번 주 시작일 (월요일 기준)
  const dayOfWeek = (startOfToday.getDay() + 6) % 7;
  const startOfThisWeek = new Date(startOfToday.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);

  // 이번 달 및 지난 달 시작일
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const itemTime = d.getTime();

  if (itemTime >= startOfToday.getTime()) {
    return '오늘';
  }
  if (itemTime >= startOfYesterday.getTime()) {
    return '어제';
  }
  if (itemTime >= startOfThisWeek.getTime()) {
    return '이번 주';
  }
  if (itemTime >= startOfThisMonth.getTime()) {
    return '이번 달';
  }
  if (itemTime >= startOfLastMonth.getTime()) {
    return '지난 달';
  }
  return '오래된 알림';
}

// Format numbers-only time (월/일 문자 완전 배제: 09.30 14:20)
function formatNumbersOnlyTime(dateStr) {
  if (!dateStr) return '';
  const normalized = dateStr.replace(' ', 'T');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return dateStr.slice(0, 16);

  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  const now = new Date();
  if (d.getFullYear() !== now.getFullYear()) {
    return `${d.getFullYear()}.${mm}.${dd} ${hh}:${min}`;
  }
  return `${mm}.${dd} ${hh}:${min}`;
}

const GROUP_ORDER = ['오늘', '어제', '이번 주', '이번 달', '지난 달', '오래된 알림'];

export default function NotificationsView({
  notifications = [],
  onReadNotification,
  onReadAllNotifications,
  onDeleteNotification,
  onNavigate,
  onGoHome
}) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleItemClick = (notif) => {
    if (onNavigate) {
      onNavigate(notif);
    } else if (onReadNotification) {
      onReadNotification(notif.id);
    }
  };

  const handleDeleteAll = () => {
    if (!onDeleteNotification || notifications.length === 0) return;
    if (window.confirm(`전체 알림 ${notifications.length}건을 모두 삭제하시겠습니까?`)) {
      notifications.forEach(n => onDeleteNotification(n.id));
    }
  };

  // Group notifications into defined time sections
  const groupedNotifications = GROUP_ORDER.reduce((acc, groupName) => {
    acc[groupName] = [];
    return acc;
  }, {});

  notifications.forEach(notif => {
    const group = getNotificationGroup(notif.createdAt);
    if (!groupedNotifications[group]) {
      groupedNotifications['오래된 알림'].push(notif);
    } else {
      groupedNotifications[group].push(notif);
    }
  });

  return (
    <div style={{ width: '100%' }}>
      
      {/* 1. Header: 텍스트형 액션 버튼(모두 읽음 · 전체 삭제) */}
      {(unreadCount > 0 || notifications.length > 0) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginBottom: '1.25rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          {/* 텍스트 전용 버튼 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {unreadCount > 0 && onReadAllNotifications && (
              <button
                type="button"
                onClick={onReadAllNotifications}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px 8px',
                  fontSize: '15px',
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'opacity 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                모두 읽음
              </button>
            )}

            {notifications.length > 0 && onDeleteNotification && (
              <>
                {unreadCount > 0 && <span style={{ color: 'var(--border-color)', margin: '0 2px' }}>·</span>}
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '6px 8px',
                    fontSize: '15px',
                    fontWeight: 400,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'color 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  전체 삭제
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. Grouped Notifications Feed */}
      {notifications.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '5rem 1.5rem',
          color: 'var(--text-muted)',
          fontSize: '16px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)'
        }}>
          등록된 알림이 없습니다.
        </div>
      ) : (
        <div>
          {GROUP_ORDER.map((groupName, groupIdx) => {
            const items = groupedNotifications[groupName] || [];
            if (items.length === 0) return null;

            return (
              <div key={groupName}>
                
                {/* 기간 구분선 헤더 (크기 확대: 18px, 시원하고 선명한 타이틀) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                  marginTop: groupIdx === 0 ? '0' : '2.75rem'
                }}>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 400,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap'
                  }}>
                    {groupName}
                  </span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
                </div>

                {/* 개별 분리형 카드 (알림 제목 / 누구 / 시간 구조) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {items.map((notif) => {
                    const isUnread = !notif.isRead;
                    const actor = getNotificationActor(notif);
                    const timeDisplay = formatNumbersOnlyTime(notif.createdAt);

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleItemClick(notif)}
                        style={{
                          backgroundColor: isUnread ? 'var(--bg-card)' : 'transparent',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '1.4rem 1.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                          cursor: 'pointer',
                          userSelect: 'none',
                          opacity: isUnread ? 1 : 0.45,
                          transition: 'opacity 0.15s ease'
                        }}
                      >
                        {/* 1. 알림 제목 (크고 시원하게 확대: 20px) */}
                        <div style={{
                          fontSize: '20px',
                          fontWeight: 400,
                          color: isUnread ? 'var(--text-primary)' : 'var(--text-muted)',
                          lineHeight: 1.4,
                          wordBreak: 'keep-all'
                        }}>
                          {notif.title}
                        </div>

                        {/* 2. 누구 (16px) */}
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 400,
                          color: isUnread ? 'var(--text-secondary)' : 'var(--text-muted)',
                          lineHeight: 1.4
                        }}>
                          {actor}
                        </div>

                        {/* 3. 시간 (15px, 순수 숫자 표기) */}
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 400,
                          color: 'var(--text-muted)',
                          lineHeight: 1.4,
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          {timeDisplay}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
