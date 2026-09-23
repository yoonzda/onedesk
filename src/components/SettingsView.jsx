import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, CreditCard, Calendar, Sun, Moon, HelpCircle } from 'lucide-react';
import CustomTimePicker from './CustomTimePicker';

function TooltipHelp({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '6px',
        cursor: 'pointer',
        verticalAlign: 'middle'
      }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(prev => !prev)}
      tabIndex={0}
      role="tooltip"
      aria-label={text}
    >
      <HelpCircle
        size={18}
        style={{
          color: show ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'color 0.15s ease'
        }}
      />
      {show && (
        <span
          style={{
            position: 'absolute',
            left: 'calc(100% + 8px)',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
            padding: '7px 12px',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            zIndex: 9999,
            borderRadius: 0,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
            pointerEvents: 'none'
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

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
  if (!hireDateStr) return 15;
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

  // Company-wide Payroll & Attendance Policy (Admin only)
  const [companyPolicy, setCompanyPolicy] = useState({
    salaryPaymentDay: 25,
    mealAllowanceDefault: 200000,
    lateDeductionPerCase: 20000,
    earlyLeaveDeductionPerCase: 10000,
    absenceDeductionType: 'DAILY_PRORATED',
    absenceDeductionFixed: 100000,
    halfDayAmWorkStart: '14:00',
    halfDayAmWorkEnd: '18:00',
    halfDayPmWorkStart: '09:00',
    halfDayPmWorkEnd: '14:00'
  });
  const [savingPolicy, setSavingPolicy] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetch('/api/company-policy')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.policy) {
            setCompanyPolicy(data.policy);
          }
        })
        .catch(err => console.error('Failed to load company policy in SettingsView:', err));
    }
  }, [user]);

  const handleSaveCompanyPolicy = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingPolicy(true);
    try {
      const res = await fetch('/api/company-policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...companyPolicy,
          salaryPaymentDay: Math.min(31, Math.max(1, Number(companyPolicy.salaryPaymentDay) || 25)),
          halfDayAmWorkStart: companyPolicy.halfDayAmWorkStart || '14:00',
          halfDayAmWorkEnd: companyPolicy.halfDayAmWorkEnd || '18:00',
          halfDayPmWorkStart: companyPolicy.halfDayPmWorkStart || '09:00',
          halfDayPmWorkEnd: companyPolicy.halfDayPmWorkEnd || '14:00',
          updatedBy: user?.name || '최고관리자'
        })
      });
      const data = await res.json();
      if (data.success) {
        setCompanyPolicy(data.policy);
        onShowToast?.(
          '전사 정책 저장 완료',
          `정기 급여 지급일(매월 ${data.policy.salaryPaymentDay}일) 및 반차 출퇴근 기준 정책이 저장되었습니다.`,
          'success'
        );
      } else {
        onShowToast?.('저장 실패', data.message || '전사 정책 저장 중 오류가 발생했습니다.', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast?.('오류', '서버와의 통신에 실패했습니다.', 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

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
      padding: isEmbedded ? '0.5rem 0 5rem 0' : '1.5rem 0 6rem 0'
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
          padding: '2.5rem 0 1rem 0',
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
                fontWeight: 600,
                borderRadius: 0,
                cursor: 'pointer'
              }}
            >
              {saving ? '저장 중...' : '내 정보 및 설정 저장 완료'}
            </button>
          </div>
        </div>

      </form>

      {/* SECTION (ADMIN ONLY): 전사 급여 및 근태 기준 설정 (관리자 전용 설정 - 화면 최하단 배치) */}
      {user?.role === 'ADMIN' && (
        <div style={{ marginTop: '4rem', paddingTop: '1.5rem', borderTop: '2px solid var(--border-color)' }}>
          <div style={{
            paddingBottom: '0.85rem',
            borderBottom: '2px solid var(--border-color)',
            marginBottom: '0.5rem'
          }}>
            <h3 style={{ fontSize: '20px', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              전사 급여 및 근태 기준 설정
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* 1. 정기 급여 지급일 */}
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
                정기 급여 지급일
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>매월</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={companyPolicy.salaryPaymentDay || 25}
                  onChange={(e) => setCompanyPolicy({
                    ...companyPolicy,
                    salaryPaymentDay: Math.min(31, Math.max(1, Number(e.target.value)))
                  })}
                  style={{
                    width: '100px',
                    height: '44px',
                    padding: '0 0.85rem',
                    fontSize: '16px',
                    fontWeight: 700,
                    borderRadius: 0,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>일</span>
                <TooltipHelp text="지급일 도래 전: '지급 예정' / 지급일 도래 후: '지급 완료'로 자동 전환됩니다." />
              </div>
            </div>

            {/* 2. 오전 반차 근무 기준 시간 */}
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
                오전 반차 근무 시간
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>출근</span>
                <CustomTimePicker
                  value={companyPolicy.halfDayAmWorkStart || '14:00'}
                  onChange={(val) => setCompanyPolicy({
                    ...companyPolicy,
                    halfDayAmWorkStart: val
                  })}
                  width="125px"
                  height="44px"
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500, margin: '0 0.25rem' }}>~</span>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>퇴근</span>
                <CustomTimePicker
                  value={companyPolicy.halfDayAmWorkEnd || '18:00'}
                  onChange={(val) => setCompanyPolicy({
                    ...companyPolicy,
                    halfDayAmWorkEnd: val
                  })}
                  width="125px"
                  height="44px"
                />
                <TooltipHelp text="오전 휴무 후 오후 출근 기준 시각 및 정규 퇴근 시각입니다. 출근 기준 1시간 전부터 출근 체크가 허용되며, 기준 시각 초과 시 지각 처리됩니다." />
              </div>
            </div>

            {/* 3. 오후 반차 근무 기준 시간 */}
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
                오후 반차 근무 시간
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>출근</span>
                <CustomTimePicker
                  value={companyPolicy.halfDayPmWorkStart || '09:00'}
                  onChange={(val) => setCompanyPolicy({
                    ...companyPolicy,
                    halfDayPmWorkStart: val
                  })}
                  width="125px"
                  height="44px"
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500, margin: '0 0.25rem' }}>~</span>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>퇴근</span>
                <CustomTimePicker
                  value={companyPolicy.halfDayPmWorkEnd || '14:00'}
                  onChange={(val) => setCompanyPolicy({
                    ...companyPolicy,
                    halfDayPmWorkEnd: val
                  })}
                  width="125px"
                  height="44px"
                />
                <TooltipHelp text="오전 정상 출근 후 오후 퇴근 기준 시각입니다. 퇴근 기준 시각 이전 퇴근 시 조퇴 처리됩니다." />
              </div>
            </div>

            {/* 4. 비과세 식대 기본액 */}
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
                비과세 식대 기본액
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={companyPolicy.mealAllowanceDefault ?? 200000}
                  onChange={(e) => setCompanyPolicy({
                    ...companyPolicy,
                    mealAllowanceDefault: Math.max(0, Number(e.target.value))
                  })}
                  style={{
                    width: '220px',
                    height: '44px',
                    padding: '0 1rem',
                    fontSize: '16px',
                    fontWeight: 600,
                    borderRadius: 0,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>원</span>
                <TooltipHelp text="소득세법상 법정 비과세 한도는 월 200,000원입니다." />
              </div>
            </div>

            {/* 5. 지각 1회당 근태 차감액 */}
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
                지각 1회당 차감액
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={companyPolicy.lateDeductionPerCase ?? 20000}
                  onChange={(e) => setCompanyPolicy({
                    ...companyPolicy,
                    lateDeductionPerCase: Math.max(0, Number(e.target.value))
                  })}
                  style={{
                    width: '220px',
                    height: '44px',
                    padding: '0 1rem',
                    fontSize: '16px',
                    fontWeight: 600,
                    borderRadius: 0,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>원</span>
                <TooltipHelp text="월간 지각 횟수에 비례하여 급여에서 일괄 공제됩니다." />
              </div>
            </div>

            {/* 6. 조퇴 1회당 근태 차감액 */}
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
                조퇴 1회당 차감액
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={companyPolicy.earlyLeaveDeductionPerCase ?? 10000}
                  onChange={(e) => setCompanyPolicy({
                    ...companyPolicy,
                    earlyLeaveDeductionPerCase: Math.max(0, Number(e.target.value))
                  })}
                  style={{
                    width: '220px',
                    height: '44px',
                    padding: '0 1rem',
                    fontSize: '16px',
                    fontWeight: 600,
                    borderRadius: 0,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>원</span>
                <TooltipHelp text="월간 조퇴 횟수에 비례하여 급여에서 일괄 공제됩니다." />
              </div>
            </div>

            {/* 7. 정책 저장 버튼 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1.25rem 0',
              borderBottom: '1px solid var(--border-color)',
              gap: '2.5rem'
            }}>
              <div style={{ width: '200px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <button
                  type="button"
                  onClick={handleSaveCompanyPolicy}
                  disabled={savingPolicy}
                  className="btn btn-primary"
                  style={{
                    minWidth: '260px',
                    height: '44px',
                    fontSize: '15px',
                    fontWeight: 600,
                    borderRadius: 0,
                    cursor: savingPolicy ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingPolicy ? '전사 정책 저장 중...' : '전사 급여 및 근태 기준 저장'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
