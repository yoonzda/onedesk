import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, CreditCard, Calendar, Sun, Moon } from 'lucide-react';


const POSITIONS = [
  { id: 'top-left', label: '좌측 상단', style: { top: '20px', left: '20px' } },
  { id: 'top-center', label: '상단 중앙', style: { top: '20px', left: '50%', transform: 'translateX(-50%)' } },
  { id: 'top-right', label: '우측 상단', style: { top: '20px', right: '20px' } },
  { id: 'bottom-left', label: '좌측 하단', style: { bottom: '20px', left: '20px' } },
  { id: 'bottom-center', label: '하단 중앙', style: { bottom: '20px', left: '50%', transform: 'translateX(-50%)' } },
  { id: 'bottom-right', label: '우측 하단', style: { bottom: '20px', right: '20px' } },
];

const BANK_OPTIONS = [
  '국민은행', '신한은행', '우리은행', '하나은행', '기업은행', 
  'NH농협은행', '카카오뱅크', '토스뱅크', 'SC제일은행', '우체국', 
  'KDB산업은행', '수협은행'
];

function calculateLegalLeave(hireDateStr) {
  if (!hireDateStr) return 0;
  const hireDate = new Date(hireDateStr);
  const today = new Date();
  const diffMonths = (today.getFullYear() - hireDate.getFullYear()) * 12 + (today.getMonth() - hireDate.getMonth());
  const diffYears = Math.floor(diffMonths / 12);
  if (diffMonths < 12) {
    return Math.max(0, Math.min(11, diffMonths));
  } else {
    const extraYears = Math.floor((diffYears - 1) / 2);
    return Math.min(25, 15 + extraYears);
  }
}

export default function SettingsView({
  user,
  onUpdateUser,
  toastPosition = 'top-right',
  onToastPositionChange,
  onShowToast,
  theme,
  onToggleTheme,
  onGoHome,
  isEmbedded = false
}) {
  const [form, setForm] = useState({
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    bankName: user?.bankName || '국민은행',
    accountNumber: user?.accountNumber || ''
  });
  const [saving, setSaving] = useState(false);



  useEffect(() => {
    if (user) {
      setForm({
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        bankName: user.bankName || '국민은행',
        accountNumber: user.accountNumber || ''
      });
    }
  }, [user]);

  const totalLeave = user?.totalLeave !== undefined
    ? user.totalLeave
    : (calculateLegalLeave(user?.hireDate) + (user?.manualLeaveAdjustment || 0));
  const usedLeave = user?.usedLeave !== undefined ? user.usedLeave : 0;
  const remainingLeave = user?.remainingLeave !== undefined
    ? user.remainingLeave
    : Math.max(0, totalLeave - usedLeave);

  const handleSelectPosition = (posId) => {
    if (onToastPositionChange) {
      onToastPositionChange(posId);
    }
    const posObj = POSITIONS.find(p => p.id === posId);
    if (onShowToast) {
      onShowToast('위치 설정', `토스트 알림 위치가 [${posObj?.label || posId}]으로 변경되었습니다.`, 'info');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('내 정보 저장 완료', '개인 정보 및 수신 계좌 설정이 성공적으로 저장되었습니다.', 'success');
        if (onUpdateUser) {
          onUpdateUser(data.user);
        }
        setForm(prev => ({ ...prev, password: '' }));
      } else {
        onShowToast?.('저장 실패', data.message || '저장 중 오류가 발생했습니다.', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast?.('오류', '서버와의 통신에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      padding: 0
    }}>
      
      {/* View Header (Only shown when not embedded) */}
      {!isEmbedded && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1.25rem'
        }}>
          <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
            환경 설정
          </h2>
          {onGoHome && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onGoHome}
              style={{ height: '44px', fontSize: '16px', padding: '0 1.5rem' }}
            >
              홈으로
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* SECTION 1: 내 정보 및 연락처 */}
        <div>
          <div style={{
            paddingBottom: '0.85rem',
            borderBottom: '2px solid var(--border-color)',
            marginBottom: '0.5rem'
          }}>
            <h3 style={{ fontSize: '20px', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              내 정보 및 연락처
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* 1. 성명 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                사원 성명
              </div>
              <div style={{
                flex: 1,
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}>
                {user?.name || '-'}
              </div>
            </div>

            {/* 2. 소속 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                소속
              </div>
              <div style={{
                flex: 1,
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-primary)'
              }}>
                {user?.dept || '-'}
              </div>
            </div>

            {/* 3. 직책 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                직책
              </div>
              <div style={{
                flex: 1,
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-primary)'
              }}>
                {user?.position || '-'}
              </div>
            </div>

            {/* 4. 사번 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                사번
              </div>
              <div style={{
                flex: 1,
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-primary)'
              }}>
                {user?.empNo || '-'}
              </div>
            </div>

            {/* 5. 입사일 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                입사일
              </div>
              <div style={{
                flex: 1,
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-primary)'
              }}>
                {user?.hireDate || '-'}
              </div>
            </div>

            {/* 6. 총 부여 연차 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                총 부여 연차
              </div>
              <div style={{
                flex: 1,
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-primary)'
              }}>
                {totalLeave.toFixed(1)}일
              </div>
            </div>

            {/* 7. 사용 연차 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                사용 연차
              </div>
              <div style={{
                flex: 1,
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-primary)'
              }}>
                {usedLeave.toFixed(1)}일
              </div>
            </div>

            {/* 8. 잔여 연차 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                잔여 연차
              </div>
              <div style={{
                flex: 1,
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}>
                {remainingLeave.toFixed(1)}일
              </div>
            </div>

            {/* 9. 수신 이메일 (수정 가능) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                수신 이메일
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="이메일 주소 입력"
                  style={{
                    width: '100%',
                    maxWidth: '520px',
                    height: '44px',
                    padding: '0 1rem',
                    fontSize: '16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* 10. 휴대전화 번호 (수정 가능) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                휴대전화
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="휴대전화 번호 입력"
                  style={{
                    width: '100%',
                    maxWidth: '520px',
                    height: '44px',
                    padding: '0 1rem',
                    fontSize: '16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* 11. 비밀번호 변경 (수정 가능) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                비밀번호 변경
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="새 비밀번호 입력"
                  style={{
                    width: '100%',
                    maxWidth: '520px',
                    height: '44px',
                    padding: '0 1rem',
                    fontSize: '16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: 급여 수령 계좌 관리 */}
        <div style={{ marginTop: '3.5rem' }}>
          <div style={{
            paddingBottom: '0.85rem',
            borderBottom: '2px solid var(--border-color)',
            marginBottom: '0.5rem'
          }}>
            <h3 style={{ fontSize: '20px', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              급여 수령 계좌
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* 1. 은행명 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                입금 은행
              </div>
              <div style={{ flex: 1 }}>
                <select
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  style={{
                    width: '100%',
                    maxWidth: '520px',
                    height: '44px',
                    padding: '0 1rem',
                    fontSize: '16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {BANK_OPTIONS.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. 계좌번호 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                계좌번호
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  placeholder="계좌번호 입력"
                  style={{
                    width: '100%',
                    maxWidth: '520px',
                    height: '44px',
                    padding: '0 1rem',
                    fontSize: '16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* 3. 예금주 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                예금주
              </div>
              <div style={{
                flex: 1,
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}>
                {user?.name || '-'}
              </div>
            </div>
          </div>
        </div>


        {/* SECTION 3: 시스템 환경 설정 */}
        <div style={{ marginTop: '3.5rem' }}>
          <div style={{
            paddingBottom: '0.85rem',
            borderBottom: '2px solid var(--border-color)',
            marginBottom: '0.5rem'
          }}>
            <h3 style={{ fontSize: '20px', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              시스템 환경 설정
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* 1. 화면 테마 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                화면 테마
              </div>
              <div style={{ flex: 1, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => { if (theme !== 'dark') onToggleTheme(); }}
                  className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '140px', height: '44px', fontSize: '16px', borderRadius: '6px' }}
                >
                  {theme === 'dark' && '● '}다크 모드
                </button>
                <button
                  type="button"
                  onClick={() => { if (theme !== 'light') onToggleTheme(); }}
                  className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '140px', height: '44px', fontSize: '16px', borderRadius: '6px' }}
                >
                  {theme === 'light' && '● '}라이트 모드
                </button>
              </div>
            </div>

            {/* 2. 토스트 알림 위치 */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: '1.25rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{
                width: '200px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                flexShrink: 0
              }}>
                토스트 알림 위치
              </div>
              <div style={{ flex: 1, width: '100%' }}>
                <div
                  className="screen-preview-frame"
                  style={{
                    width: '100%',
                    height: '340px',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    opacity: 0.25
                  }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 0.5rem', display: 'block' }}>
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <div style={{ fontSize: '16px', fontWeight: 500 }}>
                      화면 작업 영역
                    </div>
                  </div>

                  {POSITIONS.map(pos => {
                    const isSelected = toastPosition === pos.id;
                    return (
                      <div
                        key={pos.id}
                        onClick={() => handleSelectPosition(pos.id)}
                        className={`toast-position-slot ${isSelected ? 'active' : 'inactive'}`}
                        style={pos.style}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '16px'
                        }}>
                          {isSelected && (
                            <span style={{ fontSize: '14px' }}>●</span>
                          )}
                          <span>{pos.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Action Button */}
        <div style={{
          display: 'flex',
          padding: '2.5rem 0 0 0',
          gap: '2.5rem'
        }}>
          <div style={{ width: '200px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{
                width: '100%',
                maxWidth: '520px',
                height: '48px',
                fontSize: '16px',
                fontWeight: 400,
                borderRadius: 0,
                cursor: 'pointer'
              }}
            >
              {saving ? '저장 중...' : '내 정보 및 설정 저장 완료'}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
