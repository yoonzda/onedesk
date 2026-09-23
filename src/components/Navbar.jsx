import React from 'react';
import { Mail, Sun, Moon, LogOut } from 'lucide-react';

export default function Navbar({ 
  user, 
  onLogout, 
  theme, 
  onToggleTheme, 
  onGoHome, 
  currentView,
  unreadNotifsCount = 0,
  onOpenNotifications
}) {
  if (!user) return null;

  return (
    <header className="navbar" style={{
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-header)',
      padding: '0.85rem 0'
    }}>
      <div className="navbar-container" style={{
        maxWidth: '1360px',
        width: '100%',
        margin: '0 auto',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        
        {/* Left: Pure Logo Icon Only (No Text) */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            onClick={onGoHome}
            title="홈으로 이동"
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <img 
              src="/logo_mono.png" 
              alt="Logo" 
              style={{ width: '32px', height: '32px', objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>

        {/* Right: Mail Notification, Theme Toggle, Logout Icons (Borderless) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          
          {/* Mail Notification Button (알림/메시지) - Borderless */}
          {user.role !== 'CLIENT' && onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              title={unreadNotifsCount > 0 ? `알림 (${unreadNotifsCount}건 미확인)` : '알림'}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: currentView === 'NOTIFICATIONS' ? 'var(--text-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                outline: 'none',
                transition: 'color 0.15s ease'
              }}
            >
              <Mail size={22} strokeWidth={2} />
              {unreadNotifsCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    right: '3px',
                    width: '7px',
                    height: '7px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    display: 'block'
                  }}
                />
              )}
            </button>
          )}


          {/* Theme Toggle Icon (Sun / Moon) - Borderless */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none'
            }}
          >
            {theme === 'dark' ? (
              <Sun size={22} strokeWidth={2} />
            ) : (
              <Moon size={22} strokeWidth={2} />
            )}
          </button>

          {/* Logout Icon - Borderless */}
          <button
            type="button"
            onClick={onLogout}
            title="로그아웃"
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none'
            }}
          >
            <LogOut size={22} strokeWidth={2} />
          </button>

        </div>

      </div>
    </header>
  );
}
