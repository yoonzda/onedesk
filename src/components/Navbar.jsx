import React from 'react';
import { Sun, Moon, LogOut } from 'lucide-react';

export default function Navbar({ 
  user, 
  onLogout, 
  theme, 
  onToggleTheme, 
  onGoHome
}) {

  if (!user) return null;

  return (
    <header className="navbar" style={{
      position: 'sticky',
      top: 0,
      zIndex: 90,
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
        
        {/* Left: Pure Logo Icon Only (Click to go to Home tab) */}
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
              src={`${import.meta.env.BASE_URL}logo_mono.png`} 
              alt="Logo" 
              style={{ width: '32px', height: '32px', objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>

        {/* Right: Only Theme Toggle & Logout Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
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
