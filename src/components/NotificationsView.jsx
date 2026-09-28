import React, { useState } from 'react';
import { Calendar, Clock, Building2, Bell, FileText, ChevronRight } from 'lucide-react';

// Helper to determine category, icon, and signature color matching user's reference
function getCategoryInfo(notif) {
  const type = notif.type?.toUpperCase() || '';
  const link = notif.link?.toLowerCase() || '';

  if (type.includes('SCHEDULE') || type.includes('MEETING') || link === 'calendar') {
    return {
      label: '회의 일정',
      icon: Calendar,
      color: '#3b82f6' // Blue
    };
  }
  if (type.includes('LEAVE') || type.includes('ATTEND') || link === 'commute' || link === 'admin_attendance') {
    return {
      label: '근태 · 결재',
      icon: Clock,
      color: '#10b981' // Green
    };
  }
  if (type.includes('CLIENT') || link === 'client_requests') {
    return {
      label: '고객사 요청',
      icon: Building2,
      color: '#f59e0b' // Amber
    };
  }
  if (type.includes('ANNOUNCE') || link === 'settings') {
    return {
      label: '사내 공지',
      icon: Bell,
      color: '#8b5cf6' // Purple
    };
  }
  return {
    label: '업무 알림',
    icon: FileText,
    color: '#64748b' // Slate
  };
}

// Relative timestamp matching reference: "방금 전", "1일 전", "6월 12일"
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const normalized = dateStr.replace(' ', 'T');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) {
    return dateStr.slice(0, 16);
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMinutes < 1) {
    return '방금 전';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }
  if (diffHours < 24 && now.getDate() === d.getDate()) {
    return `${diffHours}시간 전`;
  }
  if (diffDays === 1) {
    return '1일 전';
  }
  if (diffDays > 1 && diffDays < 7) {
    return `${diffDays}일 전`;
  }

  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function NotificationsView({
  notifications = [],
  onReadNotification,
  onReadAllNotifications,
  onNavigate,
  onGoHome
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleItemClick = (notif) => {
    if (onNavigate) {
      onNavigate(notif);
    } else if (onReadNotification) {
      onReadNotification(notif.id);
    }
  };

  return (
    <div style={{
      width: '100%',
      padding: '1.25rem 0 5rem 0'
    }}>
      {/* 1. Page Header Area */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.75rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            margin: 0,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            알림 센터
          </h2>
          <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
            미확인 {unreadCount}건 · 전체 {notifications.length}건
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {unreadCount > 0 && onReadAllNotifications && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onReadAllNotifications}
              style={{
                height: '40px',
                padding: '0 1.25rem',
                fontSize: '16px',
                fontWeight: 500,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              모두 읽음 처리
            </button>
          )}
          {onGoHome && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onGoHome}
              style={{
                height: '40px',
                padding: '0 1.25rem',
                fontSize: '16px',
                fontWeight: 500,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              홈으로
            </button>
          )}
        </div>
      </div>

      {/* 2. Notification Center Card */}
      {notifications.length === 0 ? (
        <div style={{
          padding: '5rem 2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          fontSize: '16px'
        }}>
          등록된 알림이 없습니다.
        </div>
      ) : (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}>
          {notifications.map((notif, index) => {
            const isUnread = !notif.isRead;
            const isHovered = hoveredId === notif.id;
            const { label: categoryLabel, icon: IconComponent, color: categoryColor } = getCategoryInfo(notif);
            const timeDisplay = formatRelativeTime(notif.createdAt);

            return (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                onMouseEnter={() => setHoveredId(notif.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  padding: '1.25rem 1.75rem',
                  borderBottom: index === notifications.length - 1 ? 'none' : '1px solid var(--border-color)',
                  backgroundColor: isUnread
                    ? (isHovered ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.05)')
                    : (isHovered ? 'var(--bg-card-hover)' : 'transparent'),
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {/* Header Line: [Icon + Category] on Left, [Relative Time] on Right */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconComponent
                      size={18}
                      style={{
                        color: categoryColor,
                        flexShrink: 0
                      }}
                    />
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: isUnread ? 'var(--text-primary)' : 'var(--text-muted)',
                      letterSpacing: '-0.01em'
                    }}>
                      {categoryLabel}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '16px',
                    color: 'var(--text-muted)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {timeDisplay}
                  </span>
                </div>

                {/* Message Body (Bold Title + Description just like the reference screenshot) */}
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
                  letterSpacing: '-0.015em',
                  lineHeight: 1.45
                }}>
                  {notif.title}
                </div>

                {notif.message && notif.message !== notif.title && (
                  <div style={{
                    fontSize: '16px',
                    color: isUnread ? 'var(--text-secondary)' : 'var(--text-muted)',
                    lineHeight: 1.55,
                    marginTop: '6px',
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word'
                  }}>
                    {notif.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
