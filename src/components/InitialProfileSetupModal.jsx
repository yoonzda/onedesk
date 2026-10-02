import React, { useState } from 'react';

const BANK_OPTIONS = [
  '국민은행',
  '신한은행',
  '우리은행',
  '하나은행',
  '카카오뱅크',
  '토스뱅크',
  '기업은행',
  '농협은행',
  'SC제일은행',
  '우체국'
];

export const formatPhoneNumber = (value) => {
  if (!value) return '';
  const digits = value.replace(/[^0-9]/g, '').slice(0, 11);
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.startsWith('02')) {
    const seoulDigits = digits.slice(0, 10);
    if (seoulDigits.length <= 2) return seoulDigits;
    if (seoulDigits.length <= 5) return `${seoulDigits.slice(0, 2)}-${seoulDigits.slice(2)}`;
    if (seoulDigits.length <= 9) return `${seoulDigits.slice(0, 2)}-${seoulDigits.slice(2, 5)}-${seoulDigits.slice(5)}`;
    return `${seoulDigits.slice(0, 2)}-${seoulDigits.slice(2, 6)}-${seoulDigits.slice(6, 10)}`;
  }
  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  if (digits.length <= 10) {
    if (digits.startsWith('010') || digits.length <= 9) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
};

export default function InitialProfileSetupModal({ user, onComplete, onLogout }) {
  const [phone, setPhone] = useState(formatPhoneNumber(user.phone || ''));
  const [email, setEmail] = useState(user.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [bankName, setBankName] = useState(user.bankName || BANK_OPTIONS[0]);
  const [accountNumber, setAccountNumber] = useState(user.accountNumber || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      setErrorMsg('연락처를 입력하세요.');
      return;
    }
    if (cleanPhone.length < 9) {
      setErrorMsg('올바른 연락처 번호를 입력하세요.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('이메일을 입력하세요.');
      return;
    }

    if (newPassword && newPassword !== newPasswordConfirm) {
      setErrorMsg('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        phone: phone.trim(),
        email: email.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim()
      };
      if (newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      const res = await fetch(`/api/users/${user.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success && data.user) {
        const fullUser = {
          ...user,
          ...data.user,
          phone: payload.phone,
          email: payload.email,
          bankName: payload.bankName,
          accountNumber: payload.accountNumber,
          firstLogin: false,
          needsProfileSetup: false
        };
        onComplete(fullUser);
      } else {
        setErrorMsg(data.message || '개인정보 저장에 실패했습니다.');
      }
    } catch (err) {
      setErrorMsg('개인정보 등록 중 통신 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      backgroundColor: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      overflowY: 'auto'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '760px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Header */}
        <div style={{
          paddingBottom: '1.75rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <h2 style={{ fontSize: '26px', fontWeight: 400, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em' }}>
            정보 등록
          </h2>
        </div>

            {/* Assigned Corporate Identity (Pure Typography, Zero Boxes) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem 3rem',
              padding: '2.25rem 0',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 400 }}>이름</span>
                <span style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: 400, letterSpacing: '-0.02em' }}>{user.name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 400 }}>부서</span>
                <span style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: 400, letterSpacing: '-0.02em' }}>{user.dept || '-'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 400 }}>직급</span>
                <span style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: 400, letterSpacing: '-0.02em' }}>{user.position || '사원'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 400 }}>사번</span>
                <span style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: 400, letterSpacing: '-0.02em' }}>{user.empNo || '-'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 400 }}>아이디</span>
                <span style={{ fontSize: '20px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 400 }}>@{user.username}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 400 }}>입사일</span>
                <span style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: 400, letterSpacing: '-0.02em' }}>{user.hireDate || '-'}</span>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} style={{ padding: '2.5rem 0 1rem 0', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {errorMsg && (
                <div style={{
                  padding: '0.85rem 1.15rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  borderRadius: '4px',
                  fontSize: '15px',
                  fontWeight: 400
                }}>
                  {errorMsg}
                </div>
              )}

              {/* 1. 연락처 (필수) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <label style={{ fontSize: '16.5px', color: 'var(--text-primary)', fontWeight: 400 }}>
                  연락처 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  autoFocus
                  maxLength={13}
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  placeholder="010-0000-0000"
                  style={{ height: '52px', fontSize: '16.5px', fontWeight: 400, padding: '0 1.15rem' }}
                />
              </div>

              {/* 2. 이메일 (필수) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <label style={{ fontSize: '16.5px', color: 'var(--text-primary)', fontWeight: 400 }}>
                  이메일 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  style={{ height: '52px', fontSize: '16.5px', fontWeight: 400, padding: '0 1.15rem' }}
                />
              </div>

              {/* 3. 새 비밀번호 (선택) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <label style={{ fontSize: '16.5px', color: 'var(--text-primary)', fontWeight: 400 }}>
                  새 비밀번호
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <input
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    style={{ height: '52px', fontSize: '16.5px', fontWeight: 400, padding: '0 1.15rem' }}
                  />
                  <input
                    type="password"
                    className="form-control"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="비밀번호 확인"
                    style={{ height: '52px', fontSize: '16.5px', fontWeight: 400, padding: '0 1.15rem' }}
                  />
                </div>
              </div>

              {/* 4. 급여 계좌 (선택) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <label style={{ fontSize: '16.5px', color: 'var(--text-primary)', fontWeight: 400 }}>
                  급여 계좌
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.25rem' }}>
                  <select
                    className="form-control"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    style={{ height: '52px', fontSize: '16.5px', fontWeight: 400, padding: '0 1rem' }}
                  >
                    {BANK_OPTIONS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="form-control"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="계좌번호 입력"
                    style={{ height: '52px', fontSize: '16.5px', fontWeight: 400, padding: '0 1.15rem' }}
                  />
                </div>
              </div>

              {/* Submit Action */}
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{
                    height: '54px',
                    fontSize: '18px',
                    fontWeight: 400,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmitting ? '저장 중...' : '등록'}
                </button>
              </div>
            </form>
      </div>
    </div>
  );
}
