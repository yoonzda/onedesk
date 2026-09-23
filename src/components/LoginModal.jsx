import React, { useState } from 'react';

export default function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const showLoginToast = (msg = '로그인 정보를 확인해주세요') => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();

    if (!username.trim() || !password.trim()) {
      showLoginToast('로그인 정보를 확인해주세요');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });
      const data = await res.json();

      if (data.success) {
        onLoginSuccess(data.user, data.sessionId, data.device);
      } else {
        showLoginToast('로그인 정보를 확인해주세요');
      }
    } catch (err) {
      showLoginToast('로그인 정보를 확인해주세요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: 'var(--bg-main)',
      position: 'relative'
    }}>
      {/* Top Floating Toast Notification (No Close Button, Clean Text Only) */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '36px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.9rem 1.85rem',
          fontSize: '16px',
          zIndex: 9999,
          whiteSpace: 'nowrap',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMessage}
        </div>
      )}

      <div className="card" style={{
        width: '100%',
        maxWidth: '820px',
        padding: '3.5rem 3rem',
        display: 'grid',
        gridTemplateColumns: '1.1fr 1.3fr',
        gap: '3rem',
        alignItems: 'center'
      }}>
        
        {/* Left: Ultra-Clean 04 Monochrome Logo & Clean 2-Line Slogan */}
        <div style={{
          borderRight: '1px solid var(--border-color)',
          paddingRight: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          {/* Logo 04 Image */}
          <img 
            src="/logo_mono.png" 
            alt="OneDesk Monochrome Logo"
            style={{
              width: '140px',
              height: '140px',
              objectFit: 'contain',
              display: 'block'
            }}
          />

          {/* Clean English Statement */}
          <div style={{
            marginTop: '1.75rem',
            textAlign: 'center',
            maxWidth: '320px'
          }}>
            <p style={{
              fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
              fontSize: '20px',
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
              letterSpacing: '-0.02em',
              fontWeight: 400
            }}>
              Alone we can do so little<br />
              Together we can do so much
            </p>
          </div>
        </div>

        {/* Right: Form Inputs with Spacious Spacing */}
        <div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* ID Input Group */}
            <div className="form-group" style={{ marginBottom: '34px' }}>
              <label className="form-label" style={{ fontSize: '16px', marginBottom: '4px' }}>
                아이디
              </label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                style={{
                  height: '52px',
                  fontSize: '18px',
                  padding: '0 1.15rem'
                }}
              />
            </div>

            {/* Password Input Group (Increased distance to login button) */}
            <div className="form-group" style={{ marginBottom: '44px' }}>
              <label className="form-label" style={{ fontSize: '16px', marginBottom: '4px' }}>
                비밀번호
              </label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  height: '52px',
                  fontSize: '18px',
                  padding: '0 1.15rem'
                }}
              />
            </div>

            {/* Flat Solid Monochrome Login Button */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
              style={{
                height: '52px',
                fontSize: '18px'
              }}
            >
              {loading ? '로그인 처리 중...' : '로그인'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}


