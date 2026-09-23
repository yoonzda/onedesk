import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Edit3, X, Check, Download, Search, LayoutGrid, List, Send, Copy, Printer, SlidersHorizontal } from 'lucide-react';
import CustomTimePicker from './CustomTimePicker';

export default function PayrollManager({ user, onShowToast }) {
  const isHrOrAdmin = user?.role === 'HR' || user?.role === 'ADMIN' || user?.username === 'insa';
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [payrolls, setPayrolls] = useState([]);
  const [metrics, setMetrics] = useState({
    totalPay: 0,
    totalDeduction: 0,
    netPay: 0,
    totalCount: 0,
    pendingReviewCount: 0,
    reviewedCount: 0,
    paidCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    annualSalary: 0,
    baseSalary: 0,
    dutyAllowance: 0,
    mealAllowance: 200000,
    overtimePay: 0,
    bonus: 0,
    lateDeduction: 0,
    status: 'PENDING_REVIEW'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('TABLE');

  // Company-wide Deduction & Policy State
  const [showPolicyDrawer, setShowPolicyDrawer] = useState(false);
  const [isPolicyClosing, setIsPolicyClosing] = useState(false);
  const [isPolicySaving, setIsPolicySaving] = useState(false);
  const [companyPolicy, setCompanyPolicy] = useState({
    salaryPaymentDay: 25,
    lateDeductionPerCase: 20000,
    earlyLeaveDeductionPerCase: 10000,
    absenceDeductionType: 'DAILY_PRORATED',
    absenceDeductionFixed: 100000,
    mealAllowanceDefault: 200000,
    halfDayAmWorkStart: '14:00',
    halfDayAmWorkEnd: '18:00',
    halfDayPmWorkStart: '09:00',
    halfDayPmWorkEnd: '14:00',
    updatedAt: '',
    updatedBy: ''
  });
  const [policyForm, setPolicyForm] = useState({
    salaryPaymentDay: 25,
    lateDeductionPerCase: 20000,
    earlyLeaveDeductionPerCase: 10000,
    absenceDeductionType: 'DAILY_PRORATED',
    absenceDeductionFixed: 100000,
    mealAllowanceDefault: 200000,
    halfDayAmWorkStart: '14:00',
    halfDayAmWorkEnd: '18:00',
    halfDayPmWorkStart: '09:00',
    halfDayPmWorkEnd: '14:00'
  });

  const fetchCompanyPolicy = async () => {
    try {
      const res = await fetch('/api/company-policy');
      const data = await res.json();
      if (data.success && data.policy) {
        setCompanyPolicy(data.policy);
        setPolicyForm(data.policy);
      }
    } catch (err) {
      console.error('Failed to load company policy:', err);
    }
  };

  useEffect(() => {
    fetchCompanyPolicy();
  }, []);

  const monthsList = useMemo(() => {
    const list = [];
    const now = new Date();
    const currentY = now.getFullYear();
    const currentM = now.getMonth() + 1;
    // Generate up to current month (from 2026-06 to current month)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentY, currentM - 1 - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const ym = `${y}-${m}`;
      if (ym >= '2026-06') {
        list.push(ym);
      }
    }
    if (list.length === 0) list.push(`${currentY}-${String(currentM).padStart(2, '0')}`);
    return list;
  }, []);

  const fetchPayrolls = async (month) => {
    setLoading(true);
    try {
      if (isHrOrAdmin) {
        const res = await fetch(`/api/payrolls?month=${month}`);
        const data = await res.json();
        if (data.success) {
          setPayrolls(data.payrolls || []);
          setMetrics(data.metrics || {});
          if (data.policy) {
            setCompanyPolicy(data.policy);
          }
        }
      } else {
        const res = await fetch(`/api/payrolls/my?userId=${user?.id}&month=${month}`);
        const data = await res.json();
        if (data.success && data.payroll) {
          setPayrolls([data.payroll]);
          setSelectedPayroll(data.payroll);
        } else {
          setPayrolls([]);
          setSelectedPayroll(null);
        }
      }
    } catch (err) {
      console.error('Failed to load payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls(selectedMonth);
  }, [selectedMonth, user]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newY = prevDate.getFullYear();
    const newM = String(prevDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newY = nextDate.getFullYear();
    const newM = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const handleDownloadExcel = () => {
    try {
      window.location.href = `/api/payrolls/export?month=${selectedMonth}`;
      onShowToast?.('급여대장 다운로드', `${selectedMonth} 전사 급여대장 엑셀 파일 다운로드가 시작되었습니다.`);
    } catch (err) {
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  // Company Policy Drawer Handlers
  const handleOpenPolicyDrawer = () => {
    setPolicyForm({ ...companyPolicy });
    setShowPolicyDrawer(true);
    setIsPolicyClosing(false);
  };

  const handleClosePolicyDrawer = () => {
    if (isPolicyClosing) return;
    setIsPolicyClosing(true);
    setTimeout(() => {
      setShowPolicyDrawer(false);
      setIsPolicyClosing(false);
    }, 220);
  };

  const handleSavePolicy = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsPolicySaving(true);
    try {
      const res = await fetch('/api/company-policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...policyForm,
          updatedBy: user?.name || '최고관리자'
        })
      });
      const data = await res.json();
      if (data.success) {
        setCompanyPolicy(data.policy);
        onShowToast?.('전사 기준 반영 완료', '전사 공제 기준이 저장되고 전체 사원의 당월 급여가 일괄 재계산되었습니다.', 'success');
        handleClosePolicyDrawer();
        fetchPayrolls(selectedMonth);
      } else {
        alert(data.message || '저장에 실패했습니다.');
      }
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsPolicySaving(false);
    }
  };

  // Finance workflow helpers
  const handleCopyAccount = (bankName, accountNumber) => {
    if (!accountNumber) return;
    const text = `${bankName ? bankName + ' ' : ''}${accountNumber}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    onShowToast?.('계좌번호 복사 완료', `${text} 가 클립보드에 복사되었습니다.`);
  };

  const handleSendAllPaystubs = async () => {
    try {
      const res = await fetch('/api/payrolls/send-all-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('전체 명세서 발송 완료', data.message || `${selectedMonth} 급여 명세서가 이메일로 전송되었습니다.`);
        fetchPayrolls(selectedMonth);
      } else {
        onShowToast?.('명세서 발송 안내', data.message || '발송 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      onShowToast?.('명세서 발송 실패', '서버 통신 오류가 발생했습니다.');
    }
  };

  const handleSendSinglePaystub = async (payroll) => {
    if (!payroll) return;
    try {
      const res = await fetch('/api/payrolls/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollId: payroll.id })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('명세서 발송 완료', data.message || `${payroll.name} 사원에게 이메일로 명세서가 발송되었습니다.`);
        fetchPayrolls(selectedMonth);
        if (selectedPayroll && selectedPayroll.id === payroll.id) {
          setSelectedPayroll(prev => ({ ...prev, sentAt: data.sentAt, sentTo: data.recipient }));
        }
      } else {
        onShowToast?.('명세서 발송 안내', data.message || '발송 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      onShowToast?.('명세서 발송 실패', '서버 통신 오류가 발생했습니다.');
    }
  };

  const handlePrintPaystub = () => {
    window.print();
  };

  const handleOpenDetail = (p) => {
    setSelectedPayroll(p);
    setIsEditing(false);
    setEditForm({
      annualSalary: p.annualSalary || 0,
      baseSalary: p.baseSalary || 0,
      dutyAllowance: p.dutyAllowance || 0,
      mealAllowance: p.mealAllowance || 200000,
      overtimePay: p.overtimePay || 0,
      bonus: p.bonus || 0,
      lateDeduction: p.lateDeduction || 0,
      status: p.status || 'PENDING_REVIEW'
    });
  };

  const handleCloseDrawer = () => {
    if (isDrawerClosing) return;
    setIsDrawerClosing(true);
    setTimeout(() => {
      setSelectedPayroll(null);
      setIsDrawerClosing(false);
      setIsEditing(false);
    }, 220);
  };

  // Recalculate baseSalary when annualSalary is changed in form
  const handleAnnualSalaryChange = (newVal) => {
    const annual = Number(newVal) || 0;
    const monthlyTarget = Math.round(annual / 12);
    const base = Math.max(0, monthlyTarget - editForm.mealAllowance - editForm.dutyAllowance);
    setEditForm(prev => ({
      ...prev,
      annualSalary: annual,
      baseSalary: base
    }));
  };

  const handleSavePayroll = async () => {
    if (!selectedPayroll) return;
    try {
      const res = await fetch(`/api/payrolls/${selectedPayroll.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('급여 정보 수정 완료', `${selectedPayroll.name}님의 연봉 및 정산 내역이 재계산되었습니다.`);
        setSelectedPayroll(data.payroll);
        setIsEditing(false);
        fetchPayrolls(selectedMonth);
      } else {
        alert(data.message || '수정에 실패했습니다.');
      }
    } catch (err) {
      alert('오류가 발생했습니다.');
    }
  };

  // Step 1: Change specific employee status
  const handleUpdateStatus = async (payrollId, newStatus) => {
    try {
      const res = await fetch(`/api/payrolls/${payrollId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        const msg = newStatus === 'REVIEWED' ? '확인 완료 처리되었습니다.' : (newStatus === 'PAID' ? '지급 완료 처리되었습니다.' : '상태가 변경되었습니다.');
        onShowToast?.('상태 변경 완료', msg);
        if (selectedPayroll && selectedPayroll.id === payrollId) {
          setSelectedPayroll(data.payroll);
        }
        fetchPayrolls(selectedMonth);
      } else {
        alert(data.message || '상태 변경 실패');
      }
    } catch (err) {
      alert('오류가 발생했습니다.');
    }
  };

  // Step 2: Batch review all pending in current month
  const handleReviewAll = async () => {
    if (!window.confirm(`${selectedMonth} 확인 대기 급여 내역을 일괄 [확인 완료] 처리하시겠습니까?`)) return;
    try {
      const res = await fetch('/api/payrolls/review-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('일괄 확인 완료', data.message);
        fetchPayrolls(selectedMonth);
      }
    } catch (err) {
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  // Step 3: Batch confirm all paid in current month
  const handleConfirmMonth = async () => {
    if (!window.confirm(`${selectedMonth} 확인 완료된 전사 급여를 일괄 [지급 완료] 처리하시겠습니까?`)) return;
    try {
      const res = await fetch('/api/payrolls/confirm-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.('급여 일괄 지급 확정', data.message);
        fetchPayrolls(selectedMonth);
      }
    } catch (err) {
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  // Format currency
  const fmt = (num) => (num || 0).toLocaleString() + '원';
  const fmtMan = (num) => {
    if (!num) return '0원';
    const man = Math.floor(num / 10000);
    return man.toLocaleString() + '만원';
  };

  const filteredPayrolls = payrolls.filter(p => {
    if (deptFilter !== 'ALL' && p.dept !== deptFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.dept.toLowerCase().includes(q);
    }
    return true;
  });

  const depts = ['ALL', ...Array.from(new Set(payrolls.map(p => p.dept)))];

  // Helper for pure text status rendering (Monochrome Typography)
  const renderStatusText = (status, paymentDate) => {
    if (status === 'PAID') {
      return (
        <div>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>[지급 완료]</span>
          {paymentDate && (
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {paymentDate}
            </div>
          )}
        </div>
      );
    }
    if (status === 'REVIEWED') {
      return (
        <div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>[확인 완료]</span>
          {paymentDate && (
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {paymentDate} 지급 예정
            </div>
          )}
        </div>
      );
    }
    return (
      <div>
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>[확인 대기]</span>
        {paymentDate && (
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {paymentDate} 지급 예정
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '0 1.5rem 3rem 1.5rem', maxWidth: '1360px', margin: '0 auto' }}>
      
      {/* 1. Header Bar: Title (Left) + Top Action Buttons (Right: 엑셀 다운로드, 일괄 확인, 일괄 지급) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '1.75rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 700,
            margin: 0,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            {isHrOrAdmin ? '전사 급여 관리' : '내 급여 명세서'}
          </h2>
        </div>

        {/* Top Action Buttons (Excel Download, Batch Review, Batch Confirm) */}
        {isHrOrAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSendAllPaystubs}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.65rem 1rem',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={15} />
              전체 명세서 메일 발송
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.65rem 1rem',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                transition: 'all 0.15s ease'
              }}
            >
              <Download size={15} />
              급여 이체용 대장 다운로드
            </button>

            <button
              type="button"
              onClick={handleOpenPolicyDrawer}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.65rem 1rem',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                transition: 'all 0.15s ease'
              }}
            >
              <SlidersHorizontal size={15} />
              전사 공제 기준 설정
            </button>

            <button
              type="button"
              onClick={handleConfirmMonth}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-main)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.65rem 1.15rem',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                transition: 'opacity 0.15s ease'
              }}
            >
              <Check size={15} />
              당월 일괄 지급 확정
            </button>
          </div>
        )}
      </div>

      {/* 2. Calendar-style Navigation & Department Tabs Bar (‹ 2026년 9월 › on Left, Department Tabs on Right) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1.25rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.5rem'
      }}>
        {/* Left: ‹ 2026년 9월 › Month Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            title="이전 달"
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
          >
            <ChevronLeft size={24} />
          </button>

          <span style={{
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            minWidth: '130px',
            textAlign: 'center'
          }}>
            {selectedMonth.replace('-', '년 ')}월
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            title="다음 달"
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Right: Department Tabs (Calendar style) & Search Input */}
        {isHrOrAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              {depts.map(d => {
                const isSelected = deptFilter === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDeptFilter(d)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: 'none',
                      border: 'none',
                      padding: '8px 0',
                      fontSize: '18px',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                      borderBottom: isSelected ? '2px solid var(--text-primary)' : '2px solid transparent',
                      cursor: 'pointer',
                      letterSpacing: '-0.02em',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    {d === 'ALL' ? '전체' : d}
                  </button>
                );
              })}
            </div>

            {/* Search Input with Clear button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.45rem 0.85rem'
            }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="사원명 / 부서 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: '150px'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* View Mode Switcher: 목록형 / 카드형 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              overflow: 'hidden',
              backgroundColor: 'var(--bg-card)'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.45rem 0.85rem',
                  background: viewMode === 'TABLE' ? 'var(--bg-input, rgba(255,255,255,0.08))' : 'transparent',
                  border: 'none',
                  borderRight: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontWeight: viewMode === 'TABLE' ? 700 : 500,
                  color: viewMode === 'TABLE' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="목록형 보기"
              >
                <List size={16} />
                <span>목록형</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('CARD')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.45rem 0.85rem',
                  background: viewMode === 'CARD' ? 'var(--bg-input, rgba(255,255,255,0.08))' : 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: viewMode === 'CARD' ? 700 : 500,
                  color: viewMode === 'CARD' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="카드형 보기"
              >
                <LayoutGrid size={16} />
                <span>카드형</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Roster Section: Table View or Card View */}
      {isHrOrAdmin ? (
        viewMode === 'TABLE' ? (
          <div className="card" style={{
            padding: 0,
            overflow: 'hidden',
            borderRadius: 0,
            border: '1px solid var(--border-color)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--bg-card-hover)',
                  borderBottom: '2px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  fontWeight: 600,
                  letterSpacing: '-0.01em'
                }}>
                  <th style={{ padding: '0.95rem 1.25rem', width: '16%' }}>사원 정보</th>
                  <th style={{ padding: '0.95rem 1.25rem', width: '22%' }}>송금 계좌 (은행·계좌번호)</th>
                  <th style={{ padding: '0.95rem 1.25rem', textAlign: 'right', width: '15%' }}>월 세전 급여</th>
                  <th style={{ padding: '0.95rem 1.25rem', textAlign: 'right', width: '15%' }}>공제 합계</th>
                  <th style={{ padding: '0.95rem 1.25rem', textAlign: 'right', width: '17%' }}>실수령 송금액</th>
                  <th style={{ padding: '0.95rem 1.25rem', textAlign: 'center', width: '15%' }}>정산 및 지급 상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayrolls.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                      조회 조건에 일치하는 사원 급여 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredPayrolls.map((p) => {
                    return (
                      <tr
                        key={p.id}
                        onClick={() => handleOpenDetail(p)}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* 사원 정보 (사원명 + 부서) */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                            {p.name}
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                            {p.dept}
                          </span>
                        </td>

                        {/* 송금 계좌 (은행 및 계좌번호 + 원클릭 복사) */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                              {p.bankName} {p.accountNumber}
                            </span>
                            <button
                              type="button"
                              title="계좌번호 복사"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyAccount(p.bankName, p.accountNumber);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                padding: '2px',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        </td>

                        {/* 월 세전 급여 */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {fmt(p.totalPay)}
                          </span>
                        </td>

                        {/* 공제 합계 (양수 표기, 마이너스 부호 제거) */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {fmt(p.totalDeduction)}
                          </span>
                        </td>

                        {/* 실수령 송금액 */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {fmt(p.netPay)}
                          </span>
                        </td>

                        {/* 정산 및 지급 상태 */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span style={{ fontSize: '14px' }}>
                            {renderStatusText(p.status, p.paymentDate)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card Grid View (카드형 보기) */
          filteredPayrolls.length === 0 ? (
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '4rem 2rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '15px'
            }}>
              조회 조건에 일치하는 사원 급여 내역이 없습니다.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(390px, 1fr))',
              gap: '1.25rem'
            }}>
              {filteredPayrolls.map((p) => {
                const lateCnt = p.lateCount || 0;
                const remainingLv = p.remainingLeave !== undefined ? p.remainingLeave : 15;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleOpenDetail(p)}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.25rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--text-secondary)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Card Top: 사원명 + 부서 */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>
                          {p.dept}
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {selectedMonth.replace('-', '년 ')}월 정산
                      </div>
                    </div>

                    {/* Hero Stat: 실수령액 (세후) */}
                    <div style={{
                      padding: '1.25rem',
                      backgroundColor: 'var(--bg-input, rgba(255,255,255,0.02))',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        실수령액 (세후)
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        {fmt(p.netPay)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        당월 실제 통장 입금 지급액
                      </div>
                    </div>

                    {/* 2x2 Financial Breakdown */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem',
                      paddingTop: '0.25rem',
                      borderTop: '1px solid var(--border-color)'
                    }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>기준 연봉</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {fmtMan(p.annualSalary)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>월 세전 급여</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {fmt(p.totalPay)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>공제 합계</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {fmt(p.totalDeduction)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>당월 근태 정산</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: lateCnt > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', marginTop: '2px' }}>
                          지각 {lateCnt}회 · 잔여 {remainingLv}일
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )
      ) : (
        /* Regular Employee View: Directly shows Single Pay Stub */
        selectedPayroll ? (
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '2.5rem',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {/* Paystub Header (No 사번, No 직책) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '1.5rem',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {selectedMonth.replace('-', '년 ')}월 급여 명세서
                </h3>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '0.45rem' }}>
                  {selectedPayroll.dept} · {selectedPayroll.name} 귀하
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>당월 정산 상태</div>
                <div style={{ fontSize: '15px', marginTop: '0.2rem' }}>
                  {renderStatusText(selectedPayroll.status, selectedPayroll.paymentDate)}
                </div>
              </div>
            </div>

            {/* 성분표 스타일 단일 수직 명세서 (Enhanced Nutrition Facts Waterfall) */}
            <div style={{
              backgroundColor: 'var(--bg-main)',
              border: '2px solid var(--border-color)',
              padding: '2.25rem',
              marginTop: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.75rem'
            }}>
              {/* [헤더] 실수령액 메인 강조 */}
              <div style={{
                borderBottom: '2px solid var(--text-primary)',
                paddingBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    실제 수령액 (세후 통장 입금)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                      {selectedPayroll.bankName} {selectedPayroll.accountNumber}
                    </span>
                    <button
                      type="button"
                      title="계좌번호 복사"
                      onClick={() => handleCopyAccount(selectedPayroll.bankName, selectedPayroll.accountNumber)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '2px',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700 }}>
                    당월 실수령액
                  </span>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {fmt(selectedPayroll.netPay)}
                  </span>
                </div>
              </div>

              {/* [1. 계약 기준 연봉] */}
              <div style={{
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    계약 기준 연봉
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {fmtMan(selectedPayroll.annualSalary)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  월 기본 환산: {fmt(Math.round((selectedPayroll.annualSalary || 0) / 12))}
                </div>
              </div>

              {/* [2. 지급 항목: 월 세전 총급여] */}
              <div style={{
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    월 세전 총급여 (지급 총액)
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {fmt(selectedPayroll.totalPay)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>· 기본급</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.baseSalary)}</span>
                  </div>
                  {selectedPayroll.dutyAllowance > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>· 직책수당</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.dutyAllowance)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>· 식대 (비과세 200,000원)</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.mealAllowance)}</span>
                  </div>
                  {selectedPayroll.overtimePay > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>· 연장근로수당</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.overtimePay)}</span>
                    </div>
                  )}
                  {selectedPayroll.bonus > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>· 상여금</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.bonus)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* [3. 공제 항목: 법정 4대 보험 및 세금] */}
              <div style={{
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    총 공제액
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {fmt(selectedPayroll.totalDeduction)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>· 국민연금 (4.5%)</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.nationalPension)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>· 건강보험 (3.545%)</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.healthInsurance)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>· 장기요양보험 (건보의 12.95%)</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.careInsurance)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>· 고용보험 (0.9%)</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.employmentInsurance)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>· 소득세</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.incomeTax)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>· 지방소득세 (소득세의 10%)</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.localIncomeTax)}</span>
                  </div>
                  {selectedPayroll.lateDeduction > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>· 근태 지각 차감 ({selectedPayroll.lateCount}회)</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.lateDeduction)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* [4. 당월 근태 및 연차 현황] */}
              <div style={{
                borderBottom: '2px solid var(--text-primary)',
                paddingBottom: '1rem'
              }}>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
                  당월 근태 및 연차 연동 현황
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>· 당월 지각</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {selectedPayroll.lateCount || 0}회 {selectedPayroll.lateDeduction > 0 ? `(${fmt(selectedPayroll.lateDeduction)} 급여 차감 반영)` : '(차감 없음)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>· 잔여 연차</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {selectedPayroll.remainingLeave !== undefined ? selectedPayroll.remainingLeave : 15}일 (당월 사용 {selectedPayroll.monthlyLeaveUsed || 0}일 / 총 {selectedPayroll.totalLeave !== undefined ? selectedPayroll.totalLeave : 15}일)
                    </span>
                  </div>
                </div>
              </div>

              {/* [5. 최종 차인지급액] */}
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                paddingTop: '0.35rem'
              }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  차인지급액 (최종 입금액)
                </span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {fmt(selectedPayroll.netPay)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handlePrintPaystub}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '0.55rem 1rem',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={14} />
                  명세서 인쇄 / PDF 저장
                </button>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem', lineHeight: 1.5 }}>
                본 명세서는 회사의 전자 급여 관리 시스템에 의해 산출 및 발행되었습니다.
                <br />
                문의: 인사총무팀 (insa@company.com)
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', fontSize: '16px' }}>
            해당 월의 급여 명세서 데이터가 존재하지 않습니다.
          </div>
        )
      )}

      {/* 5. Slide-in Detailed Pay Stub Drawer (min(720px, 90vw)) */}
      {selectedPayroll && isHrOrAdmin && (
        <div
          className={`detail-backdrop ${isDrawerClosing ? 'closing' : ''}`}
          onClick={handleCloseDrawer}
        >
          <div
            className={`detail-slide-drawer drawer-md ${isDrawerClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              overflowY: 'auto'
            }}
          >
            {/* Drawer Header (NO 사번, NO 직책) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.75rem 2.25rem',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  상세 급여 명세서
                </h3>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {selectedPayroll.dept} · {selectedPayroll.name}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: isEditing ? 'var(--text-primary)' : 'var(--bg-card)',
                    color: isEditing ? 'var(--bg-main)' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.95rem',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Edit3 size={16} />
                  {isEditing ? '조회 모드' : '항목 수정'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '2.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Review / Status Workflow Bar */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>현재 정산 상태</div>
                  <div style={{ fontSize: '16px', marginTop: '3px' }}>
                    {renderStatusText(selectedPayroll.status, selectedPayroll.paymentDate)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedPayroll.status === 'PENDING_REVIEW' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPayroll.id, 'REVIEWED')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--text-primary)',
                        color: 'var(--bg-main)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.55rem 1rem',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Check size={16} />
                      근태 및 산출 내역 확인 완료
                    </button>
                  )}

                  {selectedPayroll.status === 'REVIEWED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedPayroll.id, 'PENDING_REVIEW')}
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '0.55rem 0.85rem',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        확인 대기로 되돌리기
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedPayroll.id, 'PAID')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: 'var(--text-primary)',
                          color: 'var(--bg-main)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.55rem 1.1rem',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        급여 지급 완료 확정
                      </button>
                    </>
                  )}

                  {selectedPayroll.status === 'PAID' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPayroll.id, 'REVIEWED')}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '0.55rem 0.85rem',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      지급 확정 취소 (확인 완료로 복원)
                    </button>
                  )}
                </div>
              </div>

              {/* Editing Form OR Nutrition Facts (성분표) Waterfall Statement */}
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    연봉 및 급여 항목 조정 (수정 시 기본급 및 세금이 자동 역산/재계산됩니다)
                  </div>

                  {/* Annual Salary Input */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      연봉 (Annual Salary, 원 단위)
                    </label>
                    <input
                      type="number"
                      value={editForm.annualSalary}
                      onChange={(e) => handleAnnualSalaryChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '16px',
                        fontWeight: 700
                      }}
                    />
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {fmtMan(editForm.annualSalary)} (월 환산 기준: {fmt(Math.round(editForm.annualSalary / 12))})
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        월 기본급 (자동 계산)
                      </label>
                      <input
                        type="number"
                        value={editForm.baseSalary}
                        onChange={(e) => setEditForm({ ...editForm, baseSalary: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '15px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        직책수당 (원)
                      </label>
                      <input
                        type="number"
                        value={editForm.dutyAllowance}
                        onChange={(e) => setEditForm({ ...editForm, dutyAllowance: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '15px'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        식대 비과세 (원)
                      </label>
                      <input
                        type="number"
                        value={editForm.mealAllowance}
                        onChange={(e) => setEditForm({ ...editForm, mealAllowance: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '15px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        지각 차감액 (원)
                      </label>
                      <input
                        type="number"
                        value={editForm.lateDeduction}
                        onChange={(e) => setEditForm({ ...editForm, lateDeduction: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '15px'
                        }}
                      />
                      <span style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        전사 기준 자동 계산: {selectedPayroll?.lateCount || 0}회 × {Number(companyPolicy.lateDeductionPerCase || 20000).toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        연장근로수당 (원)
                      </label>
                      <input
                        type="number"
                        value={editForm.overtimePay}
                        onChange={(e) => setEditForm({ ...editForm, overtimePay: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '15px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        상여금 (원)
                      </label>
                      <input
                        type="number"
                        value={editForm.bonus}
                        onChange={(e) => setEditForm({ ...editForm, bonus: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '15px'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      정산 상태
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '15px'
                      }}
                    >
                      <option value="PENDING_REVIEW">[확인 대기] 정산 검토 필요</option>
                      <option value="REVIEWED">[확인 완료] 검토 완료 / 지급 대기</option>
                      <option value="PAID">[지급 완료] 계좌 이체 완료</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSavePayroll}
                    style={{
                      marginTop: '1rem',
                      padding: '0.85rem',
                      backgroundColor: 'var(--text-primary)',
                      color: 'var(--bg-main)',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    수정 내용 반영 및 재계산
                  </button>
                </div>
              ) : (
                /* 성분표 스타일 단일 수직 명세서 (Enhanced Nutrition Facts Waterfall) */
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}>
                  {/* [헤더] 실수령액 메인 강조 */}
                  <div style={{
                    borderBottom: '2px solid var(--text-primary)',
                    paddingBottom: '1.15rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        실제 수령액 (세후 통장 입금)
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {selectedPayroll.bankName} {selectedPayroll.accountNumber}
                        </span>
                        <button
                          type="button"
                          title="계좌번호 복사"
                          onClick={() => handleCopyAccount(selectedPayroll.bankName, selectedPayroll.accountNumber)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700 }}>
                        당월 실수령액
                      </span>
                      <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        {fmt(selectedPayroll.netPay)}
                      </span>
                    </div>
                  </div>

                  {/* [1. 계약 기준 연봉] */}
                  <div style={{
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        계약 기준 연봉
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {fmtMan(selectedPayroll.annualSalary)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      월 기본 환산: {fmt(Math.round((selectedPayroll.annualSalary || 0) / 12))}
                    </div>
                  </div>

                  {/* [2. 지급 항목: 월 세전 총급여] */}
                  <div style={{
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        월 세전 총급여 (지급 총액)
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {fmt(selectedPayroll.totalPay)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>· 기본급</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.baseSalary)}</span>
                      </div>
                      {selectedPayroll.dutyAllowance > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>· 직책수당</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.dutyAllowance)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>· 식대 (비과세 200,000원)</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.mealAllowance)}</span>
                      </div>
                      {selectedPayroll.overtimePay > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>· 연장근로수당</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.overtimePay)}</span>
                        </div>
                      )}
                      {selectedPayroll.bonus > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>· 상여금</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.bonus)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* [3. 공제 항목: 법정 4대 보험 및 세금] */}
                  <div style={{
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        총 공제액
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {fmt(selectedPayroll.totalDeduction)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>· 국민연금 (4.5%)</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.nationalPension)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>· 건강보험 (3.545%)</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.healthInsurance)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>· 장기요양보험 (건보의 12.95%)</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.careInsurance)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>· 고용보험 (0.9%)</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.employmentInsurance)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>· 소득세</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.incomeTax)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>· 지방소득세 (소득세의 10%)</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.localIncomeTax)}</span>
                      </div>
                      {selectedPayroll.lateDeduction > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>· 근태 지각 차감 ({selectedPayroll.lateCount}회)</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(selectedPayroll.lateDeduction)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* [4. 당월 근태 및 연차 현황] */}
                  <div style={{
                    borderBottom: '2px solid var(--text-primary)',
                    paddingBottom: '1rem'
                  }}>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
                      당월 근태 및 연차 연동 현황
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>· 당월 지각</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {selectedPayroll.lateCount || 0}회 {selectedPayroll.lateDeduction > 0 ? `(${fmt(selectedPayroll.lateDeduction)} 급여 차감 반영)` : '(차감 없음)'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>· 잔여 연차</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {selectedPayroll.remainingLeave !== undefined ? selectedPayroll.remainingLeave : 15}일 (당월 사용 {selectedPayroll.monthlyLeaveUsed || 0}일 / 총 {selectedPayroll.totalLeave !== undefined ? selectedPayroll.totalLeave : 15}일)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* [5. 최종 차인지급액] */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    paddingTop: '0.35rem'
                  }}>
                    <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      차인지급액 (최종 입금액)
                    </span>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      {fmt(selectedPayroll.netPay)}
                    </span>
                  </div>

                  {/* 재무/회계 관리자 액션 (사원 전달 및 인쇄) */}
                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid var(--border-color)',
                    marginTop: '0.25rem'
                  }}>
                    {selectedPayroll.sentAt && (
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginRight: 'auto' }}>
                        이메일 발송: {selectedPayroll.sentAt.slice(5, 16)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSendSinglePaystub(selectedPayroll)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '0.55rem 0.95rem',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Send size={14} />
                      사원에게 명세서 발송
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintPaystub}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '0.55rem 0.95rem',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Printer size={14} />
                      명세서 인쇄 / PDF 저장
                    </button>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem', lineHeight: 1.5 }}>
                    본 명세서는 회사의 전자 급여 관리 시스템에 의해 산출 및 발행되었습니다.
                    <br />
                    문의: 인사총무팀 (insa@company.com)
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 5. Company-Wide Deduction Policy Drawer */}
      {showPolicyDrawer && (
        <div
          className={`detail-backdrop ${isPolicyClosing ? 'closing' : ''}`}
          onClick={handleClosePolicyDrawer}
        >
          <div
            className={`detail-slide-drawer drawer-md ${isPolicyClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 'min(620px, 100vw)',
              height: '100%'
            }}
          >
            {/* Header (Rule 3: NO descriptive subtitles) */}
            <div style={{
              padding: '1.75rem 2.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)',
              flexShrink: 0
            }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                전사 공제 및 근태 차감 기준 설정
              </h3>
              <button
                type="button"
                onClick={handleClosePolicyDrawer}
                title="닫기"
                aria-label="닫기"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px'
                }}
              >
                <X size={22} strokeWidth={2.2} />
              </button>
            </div>

            {/* Form Body - Clean Minimal Layout (Rule 1 & 2: NO badges, NO chips) */}
            <div style={{ flex: 1, padding: '2rem 2.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              
              {/* 0. 정기 급여 지급일 설정 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  정기 급여 지급일 설정
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    매월 정기 급여 지급일 (일)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>매월</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={policyForm.salaryPaymentDay || 25}
                      onChange={(e) => setPolicyForm({ ...policyForm, salaryPaymentDay: Math.min(31, Math.max(1, Number(e.target.value))) })}
                      style={{
                        backgroundColor: 'var(--bg-input, transparent)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '0.75rem 1rem',
                        fontSize: '16px',
                        fontWeight: 700,
                        borderRadius: 0,
                        outline: 'none',
                        width: '120px',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>일</span>
                  </div>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    매월 설정된 지급일 도래 전까지는 명세서에 '지급 예정'으로 표시되며, 도래 후 자동으로 '지급 완료' 처리됩니다.
                  </span>
                </div>
              </div>

              {/* 오전 반차 근무 기준 시간 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  오전 반차 근무 기준 시간
                </span>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '14.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      출근 기준 시각
                    </label>
                    <CustomTimePicker
                      value={policyForm.halfDayAmWorkStart || '14:00'}
                      onChange={(val) => setPolicyForm({ ...policyForm, halfDayAmWorkStart: val })}
                      width="100%"
                      height="44px"
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '14.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      퇴근 기준 시각
                    </label>
                    <CustomTimePicker
                      value={policyForm.halfDayAmWorkEnd || '18:00'}
                      onChange={(val) => setPolicyForm({ ...policyForm, halfDayAmWorkEnd: val })}
                      width="100%"
                      height="44px"
                    />
                  </div>
                </div>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  출근 시각 1시간 전부터 출근 체크가 허용되며, 출근 기준 시각 초과 시 지각 처리됩니다.
                </span>
              </div>

              {/* 오후 반차 근무 기준 시간 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  오후 반차 근무 기준 시간
                </span>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '14.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      출근 기준 시각
                    </label>
                    <CustomTimePicker
                      value={policyForm.halfDayPmWorkStart || '09:00'}
                      onChange={(val) => setPolicyForm({ ...policyForm, halfDayPmWorkStart: val })}
                      width="100%"
                      height="44px"
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '14.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      퇴근 기준 시각
                    </label>
                    <CustomTimePicker
                      value={policyForm.halfDayPmWorkEnd || '14:00'}
                      onChange={(val) => setPolicyForm({ ...policyForm, halfDayPmWorkEnd: val })}
                      width="100%"
                      height="44px"
                    />
                  </div>
                </div>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  퇴근 기준 시각 이전 퇴근 시 조퇴 처리됩니다.
                </span>
              </div>

              {/* 1. 지각 차감 기준 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  지각 차감 기준
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '14.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    지각 1회당 차감액 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={policyForm.lateDeductionPerCase}
                    onChange={(e) => setPolicyForm({ ...policyForm, lateDeductionPerCase: Math.max(0, Number(e.target.value)) })}
                    style={{
                      backgroundColor: 'var(--bg-input, transparent)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '0.75rem 1rem',
                      fontSize: '16px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                  <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
                    전체 직원에게 일괄 적용: {Number(policyForm.lateDeductionPerCase).toLocaleString()}원 / 회당
                  </span>
                </div>
              </div>

              {/* 2. 조퇴 차감 기준 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  조퇴 차감 기준
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '14.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    조퇴 1회당 차감액 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={policyForm.earlyLeaveDeductionPerCase}
                    onChange={(e) => setPolicyForm({ ...policyForm, earlyLeaveDeductionPerCase: Math.max(0, Number(e.target.value)) })}
                    style={{
                      backgroundColor: 'var(--bg-input, transparent)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '0.75rem 1rem',
                      fontSize: '16px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                  <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
                    전체 직원에게 일괄 적용: {Number(policyForm.earlyLeaveDeductionPerCase).toLocaleString()}원 / 회당
                  </span>
                </div>
              </div>

              {/* 3. 결근 차감 기준 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  결근 차감 기준
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <label style={{ fontSize: '14.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    결근 1일당 차감 방식
                  </label>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '15px', color: 'var(--text-primary)' }}>
                      <input
                        type="radio"
                        name="absenceDeductionType"
                        value="DAILY_PRORATED"
                        checked={policyForm.absenceDeductionType === 'DAILY_PRORATED'}
                        onChange={(e) => setPolicyForm({ ...policyForm, absenceDeductionType: e.target.value })}
                        style={{ accentColor: '#3b82f6' }}
                      />
                      기본급 기준 일할 계산
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '15px', color: 'var(--text-primary)' }}>
                      <input
                        type="radio"
                        name="absenceDeductionType"
                        value="FIXED"
                        checked={policyForm.absenceDeductionType === 'FIXED'}
                        onChange={(e) => setPolicyForm({ ...policyForm, absenceDeductionType: e.target.value })}
                        style={{ accentColor: '#3b82f6' }}
                      />
                      고정 일당 차감
                    </label>
                  </div>
                  {policyForm.absenceDeductionType === 'FIXED' && (
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={policyForm.absenceDeductionFixed}
                      onChange={(e) => setPolicyForm({ ...policyForm, absenceDeductionFixed: Math.max(0, Number(e.target.value)) })}
                      placeholder="결근 1일당 고정 차감액"
                      style={{
                        backgroundColor: 'var(--bg-input, transparent)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '0.75rem 1rem',
                        fontSize: '16px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        outline: 'none',
                        width: '100%',
                        marginTop: '0.35rem'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* 4. 비과세 식대 기준 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  비과세 식대 기준
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '14.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    월 기본 식대 비과세액 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={policyForm.mealAllowanceDefault}
                    onChange={(e) => setPolicyForm({ ...policyForm, mealAllowanceDefault: Math.max(0, Number(e.target.value)) })}
                    style={{
                      backgroundColor: 'var(--bg-input, transparent)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '0.75rem 1rem',
                      fontSize: '16px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                  <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
                    법정 비과세 한도: 월 200,000원
                  </span>
                </div>
              </div>

            </div>

            {/* Bottom Sticky Action Buttons */}
            <div style={{
              padding: '1.5rem 2.25rem 2.25rem 2.25rem',
              backgroundColor: 'var(--bg-card)',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              width: '100%',
              flexShrink: 0,
              marginTop: 'auto'
            }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSavePolicy}
                disabled={isPolicySaving}
                style={{
                  width: '100%',
                  height: '46px',
                  fontSize: '15.5px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: isPolicySaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isPolicySaving ? '저장 및 일괄 재계산 중...' : '전사 기준 저장 및 전체 일괄 재계산'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClosePolicyDrawer}
                disabled={isPolicySaving}
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '15px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                취소
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
