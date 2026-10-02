import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Printer, X, Copy, Check, HelpCircle } from 'lucide-react';
import { getHoliday } from '../utils/holidays';

export default function UserWorkCalendar({ user, attendance, onShowToast }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [attendances, setAttendances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Quick Year/Month Smartphone Roller State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempYear, setTempYear] = useState(() => currentDate.getFullYear());
  const [tempMonth, setTempMonth] = useState(() => currentDate.getMonth() + 1);
  const pickerRef = useRef(null);
  const selectedYearRef = useRef(null);
  const selectedMonthRef = useRef(null);
  const yearColRef = useRef(null);
  const monthColRef = useRef(null);

  const calYear = currentDate.getFullYear();
  const calMonth = currentDate.getMonth(); // 0-indexed

  const yearsList = [2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
  const monthsList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Sync tempYear, tempMonth and auto-scroll within columns ONLY (NEVER scroll the browser window)
  useEffect(() => {
    if (showDatePicker) {
      setTempYear(calYear);
      setTempMonth(calMonth + 1);
      setTimeout(() => {
        if (yearColRef.current && selectedYearRef.current) {
          const container = yearColRef.current;
          const target = selectedYearRef.current;
          container.scrollTop = target.offsetTop - (container.clientHeight / 2) + (target.clientHeight / 2);
        }
        if (monthColRef.current && selectedMonthRef.current) {
          const container = monthColRef.current;
          const target = selectedMonthRef.current;
          container.scrollTop = target.offsetTop - (container.clientHeight / 2) + (target.clientHeight / 2);
        }
      }, 20);
    }
  }, [showDatePicker, calYear, calMonth]);

  // Click outside to close picker popover
  useEffect(() => {
    if (!showDatePicker) return;
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  // Month navigation: 이전, 다음
  const prevMonth = () => setCurrentDate(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(calYear, calMonth + 1, 1));

  // Paystub Drawer State & Handlers
  const [showPaystubDrawer, setShowPaystubDrawer] = useState(false);
  const [isPaystubDrawerClosing, setIsPaystubDrawerClosing] = useState(false);
  const [paystubData, setPaystubData] = useState(null);
  const [isPaystubLoading, setIsPaystubLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [salaryPaymentDay, setSalaryPaymentDay] = useState(25);
  const [showLegalBasis, setShowLegalBasis] = useState(false);
  const [isLegalClosing, setIsLegalClosing] = useState(false);

  const handleCloseLegalBasis = () => {
    if (isLegalClosing) return;
    setIsLegalClosing(true);
    setTimeout(() => {
      setShowLegalBasis(false);
      setIsLegalClosing(false);
    }, 220);
  };

  const fetchCompanyPolicy = async () => {
    try {
      const res = await fetch('/api/company-policy');
      const data = await res.json();
      if (data.success && data.policy?.salaryPaymentDay) {
        setSalaryPaymentDay(data.policy.salaryPaymentDay);
      }
    } catch (err) {
      console.error('Failed to load company policy in calendar:', err);
    }
  };

  useEffect(() => {
    fetchCompanyPolicy();
  }, []);

  const fmt = (val) => (val !== undefined && val !== null ? Number(val).toLocaleString() + '원' : '0원');
  const fmtMan = (val) => {
    if (!val) return '0원';
    const num = Number(val);
    const man = Math.floor(num / 10000);
    return man > 0 ? `${man.toLocaleString()}만 원` : `${num.toLocaleString()}원`;
  };

  const currentYM = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;

  const fetchPaystub = async (targetMonth = currentYM) => {
    if (!user?.id) return;
    setIsPaystubLoading(true);
    try {
      const res = await fetch(`/api/payrolls/my?userId=${user.id}&month=${targetMonth}`);
      const data = await res.json();
      if (data.success && data.payroll) {
        setPaystubData(data.payroll);
        if (data.policy?.salaryPaymentDay) {
          setSalaryPaymentDay(data.policy.salaryPaymentDay);
        }
      } else {
        setPaystubData(null);
      }
    } catch (err) {
      console.error('Failed to load paystub:', err);
      setPaystubData(null);
    } finally {
      setIsPaystubLoading(false);
    }
  };

  const handleOpenPaystub = () => {
    fetchPaystub(currentYM);
    setShowPaystubDrawer(true);
    setIsPaystubDrawerClosing(false);
  };

  const handleClosePaystub = () => {
    if (isPaystubDrawerClosing) return;
    setIsPaystubDrawerClosing(true);
    if (showLegalBasis) setIsLegalClosing(true);
    setTimeout(() => {
      setShowPaystubDrawer(false);
      setIsPaystubDrawerClosing(false);
      setShowLegalBasis(false);
      setIsLegalClosing(false);
    }, 220);
  };

  const handleCopyAccount = (bank, account) => {
    if (!account) return;
    const text = `${bank || ''} ${account}`.trim();
    navigator.clipboard?.writeText(text);
    setIsCopied(true);
    onShowToast?.('계좌 복사 완료', `${text} 가 클립보드에 복사되었습니다.`, 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    if (!paystubData) return;
    const isPaydayPassed = paystubData.status === 'PAID' || (paystubData.paymentDate && paystubData.paymentDate <= todayStr);

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const earnings = [
      { label: '기본급', amount: paystubData.baseSalary },
      ...(paystubData.dutyAllowance > 0 ? [{ label: '직책수당', amount: paystubData.dutyAllowance }] : []),
      { label: '식대 (비과세)', amount: paystubData.mealAllowance },
      ...(paystubData.overtimePay > 0 ? [{ label: '연장근로수당', amount: paystubData.overtimePay }] : []),
      ...(paystubData.bonus > 0 ? [{ label: '상여금', amount: paystubData.bonus }] : [])
    ];

    const deductions = [
      { label: '국민연금 (4.5%)', amount: paystubData.nationalPension },
      { label: '건강보험 (3.545%)', amount: paystubData.healthInsurance },
      { label: '장기요양보험 (건보의 12.95%)', amount: paystubData.careInsurance },
      { label: '고용보험 (0.9%)', amount: paystubData.employmentInsurance },
      { label: '근로소득세 (간이세액)', amount: paystubData.incomeTax },
      { label: '지방소득세 (소득세의 10%)', amount: paystubData.localIncomeTax },
      ...(paystubData.lateDeduction > 0 ? [{ label: `근태 차감 (지각 ${paystubData.lateCount || 0}회)`, amount: paystubData.lateDeduction }] : [])
    ];

    const maxRows = Math.max(earnings.length, deductions.length);
    const rows = [];
    for (let i = 0; i < maxRows; i++) {
      rows.push({
        earn: earnings[i] || null,
        deduct: deductions[i] || null
      });
    }

    const printHtml = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="utf-8">
        <title>${calYear}년 ${calMonth + 1}월 급여명세서 ${isPaydayPassed ? '' : '[지급 예정]'} - ${paystubData.name || user?.name || ''}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
            color: #0f172a;
            background: #ffffff;
            padding: 0;
            font-size: 15px;
            line-height: 1.45;
          }
          .sheet {
            width: 100%;
            max-width: 700px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            padding-bottom: 16px;
            border-bottom: 2px solid #0f172a;
            margin-bottom: 16px;
          }
          .header h1 {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #0f172a;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          .info-table th, .info-table td {
            border: 1px solid #64748b;
            padding: 9px 14px;
            font-size: 15px;
          }
          .info-table th {
            background-color: #f1f5f9;
            font-weight: 700;
            color: #0f172a;
            text-align: center;
            width: 16%;
          }
          .info-table td {
            color: #0f172a;
            font-weight: 600;
            width: 34%;
          }
          .net-pay-box {
            border: 2px solid #0f172a;
            background-color: #f8fafc;
            padding: 14px 20px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .net-pay-label {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
          }
          .net-pay-sub {
            font-size: 14px;
            color: #475569;
            margin-top: 3px;
            font-weight: 500;
          }
          .net-pay-amount {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            font-variant-numeric: tabular-nums;
          }
          .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          .breakdown-table th, .breakdown-table td {
            border: 1px solid #64748b;
            padding: 9px 12px;
            font-size: 15px;
          }
          .breakdown-table th {
            background-color: #e2e8f0;
            font-weight: 800;
            color: #0f172a;
            text-align: center;
          }
          .breakdown-table .section-subhead th {
            background-color: #f1f5f9;
            font-weight: 700;
            color: #0f172a;
          }
          .breakdown-table td.amount {
            text-align: right;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            color: #0f172a;
          }
          .breakdown-table td.deduct-amount {
            color: #b91c1c;
          }
          .total-row td {
            background-color: #f1f5f9;
            font-weight: 800;
            font-size: 15px;
            border-top: 2px solid #0f172a;
          }
          .meta-summary {
            border: 1px solid #64748b;
            padding: 10px 14px;
            font-size: 14px;
            color: #1e293b;
            display: flex;
            justify-content: space-between;
            background-color: #f8fafc;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <h1>${calYear}년 ${calMonth + 1}월 급여명세서 ${isPaydayPassed ? '' : '[지급 예정]'}</h1>
          </div>

          <table class="info-table">
            <tr>
              <th>성 명</th>
              <td>${paystubData.name || user?.name || ''}</td>
              <th>귀 속 연 월</th>
              <td>${calYear}년 ${calMonth + 1}월</td>
            </tr>
            <tr>
              <th>부서 / 직급</th>
              <td>${paystubData.dept || user?.dept || '부서'} ${user?.position ? '· ' + user.position : ''}</td>
              <th>지급일자</th>
              <td>${paystubData.paymentDate ? `${paystubData.paymentDate} (${isPaydayPassed ? '지급 완료' : '지급 예정'})` : (isPaydayPassed ? '지급 완료' : '지급 예정')}</td>
            </tr>
            <tr>
              <th>지급계좌</th>
              <td>${paystubData.bankName || '국민은행'} ${paystubData.accountNumber || '-'}</td>
              <th>사 번</th>
              <td>${paystubData.userId || user?.id || '-'}</td>
            </tr>
          </table>

          <div class="net-pay-box">
            <div>
              <div class="net-pay-label">${isPaydayPassed ? '차인지급액 (실제 수령액)' : '차인지급액 (실수령 예정액)'}</div>
              <div class="net-pay-sub">
                지급 총액 ${Number(paystubData.totalPay).toLocaleString()}원 - 공제 총액 ${Number(paystubData.totalDeduction).toLocaleString()}원
              </div>
            </div>
            <div class="net-pay-amount">${Number(paystubData.netPay).toLocaleString()} 원</div>
          </div>

          <table class="breakdown-table">
            <thead>
              <tr>
                <th colspan="2" style="width: 50%;">지 급 내 역</th>
                <th colspan="2" style="width: 50%;">공 제 내 역</th>
              </tr>
              <tr class="section-subhead">
                <th style="width: 27%; font-size: 14px; text-align: left; padding-left: 12px;">지급 항목</th>
                <th style="width: 23%; font-size: 14px; text-align: right; padding-right: 12px;">금액</th>
                <th style="width: 27%; font-size: 14px; text-align: left; padding-left: 12px;">공제 항목</th>
                <th style="width: 23%; font-size: 14px; text-align: right; padding-right: 12px;">금액</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td>${r.earn ? r.earn.label : ''}</td>
                  <td class="amount">${r.earn ? Number(r.earn.amount).toLocaleString() + '원' : ''}</td>
                  <td>${r.deduct ? r.deduct.label : ''}</td>
                  <td class="amount ${r.deduct ? 'deduct-amount' : ''}">${r.deduct ? '-' + Number(r.deduct.amount).toLocaleString() + '원' : ''}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td>지급 총액</td>
                <td class="amount">${Number(paystubData.totalPay).toLocaleString()}원</td>
                <td>공제 총액</td>
                <td class="amount deduct-amount">-${Number(paystubData.totalDeduction).toLocaleString()}원</td>
              </tr>
            </tbody>
          </table>

          <div class="meta-summary">
            <span>산출 기초: 당월 지각 ${paystubData.lateCount || 0}회</span>
            <span>잔여 연차: ${paystubData.remainingLeave ?? '-'}일 (총 ${paystubData.totalLeave ?? '-'}일 중 ${paystubData.usedLeave ?? '-'}일 사용)</span>
          </div>
        </div>
      </body>
      </html>
    `;

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(printHtml);
    doc.close();

    printFrame.contentWindow.focus();
    setTimeout(() => {
      printFrame.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 1500);
    }, 250);
  };

  // Close drawer on Escape key
  useEffect(() => {
    if (!showPaystubDrawer) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClosePaystub();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPaystubDrawer]);

  // Keep paystub in sync if drawer is open while navigating months
  useEffect(() => {
    if (showPaystubDrawer) {
      fetchPaystub(currentYM);
    }
  }, [calYear, calMonth, showPaystubDrawer]);

  // Fetch attendances and leaves for current user
  const loadUserData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const [attRes, lvRes] = await Promise.all([
        fetch(`/api/attendances?userId=${user.id}`).then(r => r.json()),
        fetch(`/api/leaves?userId=${user.id}`).then(r => r.json())
      ]);
      setAttendances(Array.isArray(attRes) ? attRes : []);
      setLeaves(Array.isArray(lvRes) ? lvRes : []);
    } catch (err) {
      console.error('Failed to load user work calendar data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [user?.id, attendance?.checkIn, attendance?.checkOut, attendance?.status]);

  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const todayStr = getTodayStr();

  // Calendar 35-42 days grid generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
    const lastDate = new Date(calYear, calMonth + 1, 0).getDate();
    const prevLastDate = new Date(calYear, calMonth, 0).getDate();

    const days = [];

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevLastDate - i;
      const prevM = calMonth === 0 ? 12 : calMonth;
      const prevY = calMonth === 0 ? calYear - 1 : calYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateNumber: d,
        dateStr,
        isCurrentMonth: false,
        dayOfWeek: new Date(prevY, prevM - 1, d).getDay()
      });
    }

    // Current month days
    for (let d = 1; d <= lastDate; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateNumber: d,
        dateStr,
        isCurrentMonth: true,
        dayOfWeek: new Date(calYear, calMonth, d).getDay()
      });
    }

    // Next month leading days
    const remaining = (7 - (days.length % 7)) % 7;
    const totalSlots = days.length + remaining < 35 ? 35 : (days.length + remaining);
    const nextSlots = totalSlots - days.length;
    for (let d = 1; d <= nextSlots; d++) {
      const nextM = calMonth === 11 ? 1 : calMonth + 2;
      const nextY = calMonth === 11 ? calYear + 1 : calYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateNumber: d,
        dateStr,
        isCurrentMonth: false,
        dayOfWeek: new Date(nextY, nextM - 1, d).getDay()
      });
    }

    return days.map(day => {
      const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
      const isToday = day.dateStr === todayStr;

      // Find attendance
      const att = attendances.find(a => a.date === day.dateStr);

      // Find approved actual leave (휴가: 연차, 반차, 병가, 경조사, 기타휴가)
      const leave = leaves.find(l => 
        (l.status === 'APPROVED' || l.status === 'CANCEL_REQUESTED') && 
        ['ANNUAL', 'HALF_AM', 'HALF_PM', 'SICK', 'SPECIAL', 'ETC'].includes(l.leaveType) &&
        day.dateStr >= l.startDate && 
        day.dateStr <= (l.endDate || l.startDate)
      );

      // Find approved work schedule (근무: 재택, 외근, 출장, 추가근무, 연휴근무)
      const workSchedule = leaves.find(l => 
        l.status === 'APPROVED' && 
        ['REMOTE', 'FIELD', 'TRIP', 'OVERTIME', 'HOLIDAY_WORK'].includes(l.leaveType) &&
        day.dateStr >= l.startDate && 
        day.dateStr <= (l.endDate || l.startDate)
      );

      return {
        ...day,
        isWeekend,
        isToday,
        att,
        leave,
        workSchedule
      };
    });
  }, [calYear, calMonth, attendances, leaves, todayStr]);

  const weekHeaders = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div style={{ marginTop: '1.5rem', width: '100%' }}>
      {/* Calendar Header: Left (Year/Month Navigator) + Right ([O월 급여 명세서] Button) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        position: 'relative',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Left: Previous + Year/Month Popover + Next */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

        {/* Clickable Year/Month (Without down-arrow, Clean Text Trigger) */}
        <div style={{ position: 'relative' }} ref={pickerRef}>
          <button
            type="button"
            onClick={() => setShowDatePicker(prev => !prev)}
            title="연도 및 월 선택"
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              transition: 'opacity 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.75'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <span style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1
            }}>
              {calYear}년 {calMonth + 1}월
            </span>
          </button>

          {/* Smartphone Roller / Scroll Picker Popover */}
          {showDatePicker && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              zIndex: 100,
              width: '320px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              animation: 'fadeIn 0.18s ease-out'
            }}>
              {/* Dual Scroll Columns (Smartphone Roller Style - No headers, no footers, no scrollbars) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                height: '260px',
                position: 'relative'
              }}>
                {/* Year Scroll Column */}
                <div
                  ref={yearColRef}
                  className="no-scrollbar"
                  style={{
                    overflowY: 'auto',
                    borderRight: '1px solid var(--border-color)',
                    padding: '0.5rem 0',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                >
                  {yearsList.map(y => {
                    const isSelected = y === tempYear;
                    return (
                      <div
                        key={y}
                        ref={isSelected ? selectedYearRef : null}
                        onClick={() => {
                          setTempYear(y);
                          setCurrentDate(new Date(y, tempMonth - 1, 1));
                        }}
                        style={{
                          height: '52px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#3b82f6' : 'var(--text-primary)',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                          userSelect: 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.05))';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {y}년
                      </div>
                    );
                  })}
                </div>

                {/* Month Scroll Column */}
                <div
                  ref={monthColRef}
                  className="no-scrollbar"
                  style={{
                    overflowY: 'auto',
                    padding: '0.5rem 0',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                >
                  {monthsList.map(m => {
                    const isSelected = m === tempMonth;
                    return (
                      <div
                        key={m}
                        ref={isSelected ? selectedMonthRef : null}
                        onClick={() => {
                          setTempMonth(m);
                          setCurrentDate(new Date(tempYear, m - 1, 1));
                          setShowDatePicker(false);
                        }}
                        style={{
                          height: '52px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#3b82f6' : 'var(--text-primary)',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                          userSelect: 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.05))';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {m}월
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

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

        {/* Right End: [ O월 급여 명세서 ] Button */}
        {(() => {
          const calYM = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
          const scheduledCalPayday = `${calYM}-${String(salaryPaymentDay).padStart(2, '0')}`;
          const isCalMonthPaydayPassed = scheduledCalPayday <= todayStr;
          return (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!isCalMonthPaydayPassed}
              onClick={isCalMonthPaydayPassed ? handleOpenPaystub : undefined}
              title={isCalMonthPaydayPassed ? `${calMonth + 1}월 급여 명세서 확인` : `${calMonth + 1}월 정기 급여 지급일(${salaryPaymentDay}일) 도래 전입니다.`}
              style={{
                padding: '0.75rem 1.4rem',
                fontSize: '15px',
                borderRadius: 0,
                cursor: isCalMonthPaydayPassed ? 'pointer' : 'not-allowed',
                opacity: isCalMonthPaydayPassed ? 1 : 0.45
              }}
            >
              {calMonth + 1}월 급여 명세서
            </button>
          );
        })()}
      </div>

      {/* Calendar Grid */}
      <div style={{
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        overflow: 'hidden'
      }}>
        {/* Weekday Headers (Font Size: 16px) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-input)'
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
                  fontSize: '16px',
                  fontWeight: 600,
                  color: isSun ? '#ef4444' : (isSat ? '#3b82f6' : 'var(--text-secondary)')
                }}
              >
                {head}
              </div>
            );
          })}
        </div>

        {/* Days Grid (Height increased: minmax(140px, auto), All text min 16px, Today has 2px distinct border) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: 'minmax(140px, auto)'
        }}>
          {calendarDays.map((day, idx) => {
            const isSun = day.dayOfWeek === 0;
            const isSat = day.dayOfWeek === 6;
            const hasAtt = !!day.att;
            const hasLeave = !!day.leave;
            const hasWorkSchedule = !!day.workSchedule;

            const isAmHalf = day.leave && (day.leave.timeSlot === 'AM' || day.leave.leaveType === 'HALF_AM');
            const isPmHalf = day.leave && (day.leave.timeSlot === 'PM' || day.leave.leaveType === 'HALF_PM');
            const isHalfDay = isAmHalf || isPmHalf;

            // Plain leave text without brackets
            let leaveLabel = '';
            if (day.leave) {
              if (isAmHalf) leaveLabel = '오전 반차';
              else if (isPmHalf) leaveLabel = '오후 반차';
              else if (day.leave.leaveType === 'SICK') leaveLabel = '병가';
              else if (day.leave.leaveType === 'SPECIAL') leaveLabel = '경조사';
              else if (day.leave.leaveType === 'ETC') leaveLabel = '기타휴가';
              else leaveLabel = '연차';

              if (day.leave.status === 'CANCEL_REQUESTED') {
                leaveLabel += ' (취소대기)';
              }
            }

            // Plain work schedule text (재택, 외근 등)
            let workLabel = '';
            if (day.workSchedule) {
              if (day.workSchedule.leaveType === 'REMOTE') workLabel = '재택근무';
              else if (day.workSchedule.leaveType === 'FIELD') workLabel = '외근';
              else if (day.workSchedule.leaveType === 'TRIP') workLabel = '출장';
              else if (day.workSchedule.leaveType === 'HOLIDAY_WORK') workLabel = '휴일근무';
            }

            const holidayName = getHoliday(day.dateStr);
            const isHoliday = !!holidayName;

            // 주말 또는 법정공휴일에 출근 기록이 있는 경우 휴일근무로 표시
            const effectiveWorkLabel = workLabel || (hasAtt && (isHoliday || day.isWeekend) ? '휴일근무' : '');

            return (
              <div
                key={`${day.dateStr}-${idx}`}
                style={{
                  padding: '0.75rem',
                  borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: day.isToday 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : (!day.isCurrentMonth ? 'rgba(0,0,0,0.015)' : 'transparent'),
                  // 오늘 날짜 칸(그 날짜)에 2px 고대비 모노크롬 테두리 적용
                  outline: day.isToday ? '2px solid var(--text-primary, #ffffff)' : 'none',
                  outlineOffset: '-2px',
                  zIndex: day.isToday ? 3 : 1,
                  opacity: day.isCurrentMonth ? 1 : 0.35,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {/* Date Number & Status / Public Holiday Name (오른쪽 끝 배치) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.6rem',
                  gap: '6px'
                }}>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    color: (isSun || isHoliday) ? '#ef4444' : (isSat ? '#3b82f6' : 'var(--text-primary)')
                  }}>
                    {day.dateNumber}
                  </span>
                  {(holidayName || effectiveWorkLabel || leaveLabel) && (
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {holidayName && (
                        <span style={{ color: '#ef4444' }}>
                          {holidayName}
                        </span>
                      )}
                      {holidayName && (effectiveWorkLabel || leaveLabel) && (
                        <span style={{ color: 'var(--border-color)' }}>·</span>
                      )}
                      {(leaveLabel || effectiveWorkLabel) && (
                        <span style={{ color: day.dateStr > todayStr ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                          {leaveLabel || effectiveWorkLabel}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Day Content: 출근/퇴근 (우측 배치 & 시작점 좌측 일치) or 미기록 '-' (가운데 정렬) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  fontSize: '15px',
                  lineHeight: 1.4
                }}>
                  {hasAtt && (day.att.checkIn || day.att.checkOut) ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      width: '100%'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto auto',
                        columnGap: '6px',
                        rowGap: '0.3rem',
                        alignItems: 'center',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '15px',
                        fontWeight: 400,
                        lineHeight: 1.4
                      }}>
                        {/* 1행: 출근 라벨 + 시각 */}
                        <span style={{
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap'
                        }}>
                          출근
                        </span>
                        <span style={{
                          color: day.att.isLate ? '#ef4444' : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          textAlign: 'center'
                        }}>
                          {day.att.checkIn ? day.att.checkIn.slice(0, 5) : '-'}
                        </span>

                        {/* 2행: 퇴근 라벨 + 시각 (미기록 시 '-'가 윗줄 시간을 기준으로 가운데 정렬) */}
                        {(!day.isToday || day.att.checkOut) && (
                          <>
                            <span style={{
                              color: day.att.checkOut ? 'var(--text-primary)' : 'var(--text-muted)',
                              whiteSpace: 'nowrap'
                            }}>
                              퇴근
                            </span>
                            <span style={{
                              color: day.att.checkOut ? 'var(--text-primary)' : 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              textAlign: 'center'
                            }}>
                              {day.att.checkOut ? day.att.checkOut.slice(0, 5) : '-'}
                            </span>
                          </>
                        )}

                        {/* 3행: 야근 라벨 + 시간 (승인된 야근 인정 시 표기) */}
                        {day.att.overtimeHours > 0 && (
                          <>
                            <span style={{
                              color: 'var(--text-secondary)',
                              whiteSpace: 'nowrap'
                            }}>
                              야근
                            </span>
                            <span style={{
                              color: 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                              textAlign: 'center'
                            }}>
                              {day.att.overtimeHours}h
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paystub Slide Drawer */}
      {showPaystubDrawer && (
        <div
          className={`detail-backdrop ${isPaystubDrawerClosing ? 'closing' : ''}`}
          onClick={handleClosePaystub}
        >
          {/* Side Panel: 4대보험 및 세금 법정 산출 기준 (히스토리 패널처럼 메인 드로어 좌측에 도킹 슬라이드) */}
          {showLegalBasis && (
            <div
              className={`timeline-slide-panel ${isLegalClosing ? 'closing' : ''}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '460px',
                maxWidth: 'calc(100vw - min(720px, 90vw))',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 0,
                zIndex: 1000
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.5rem 1.75rem',
                borderBottom: '1px solid var(--border-color)',
                flexShrink: 0
              }}>
                <h4 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HelpCircle size={18} />
                  법정 공제 산출 기준
                </h4>
                <button
                  type="button"
                  onClick={handleCloseLegalBasis}
                  title="닫기"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 0
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  본 기준은 대한민국 4대 사회보험 법령 및 소득세법 규정에 따라 자동 계산되는 법정 공제 표준 요율입니다.
                </div>

                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 0
                }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-input)' }}>
                      <th style={{ width: '28%', padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 700, textAlign: 'left' }}>항목</th>
                      <th style={{ width: '32%', padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 700, textAlign: 'left' }}>요율 / 금액</th>
                      <th style={{ width: '40%', padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 700, textAlign: 'left' }}>법적 근거</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-primary)' }}>국민연금</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>4.5% (근로자)</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>국민연금법 제88조</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-primary)' }}>건강보험</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>3.545% (근로자)</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>국민건강보험법 시행령 제44조</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-primary)' }}>장기요양</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>건보료의 12.95%</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>노인장기요양보험법 시행령 제4조</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-primary)' }}>고용보험</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>0.9% (실업급여)</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>고용보험법 시행령 제12조</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-primary)' }}>소득세</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>간이세액표</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>소득세법 제134조</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-primary)' }}>지방소득세</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>소득세의 10%</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>지방세법 제93조</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-primary)' }}>비과세 식대</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>월 200,000원 한도</td>
                      <td style={{ padding: '9px 10px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>소득세법 제12조 제3호</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div
            className={`detail-slide-drawer drawer-md ${isPaystubDrawerClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              overflowY: 'auto',
              borderRadius: 0
            }}
          >
            {/* Drawer Header (NO 뱃지, NO 칩, NO 라운딩) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.5rem 2rem',
              borderBottom: '1px solid var(--border-color)',
              borderRadius: 0
            }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {calYear}년 {calMonth + 1}월 급여명세서 {paystubData && (paystubData.status === 'PAID' || (paystubData.paymentDate && paystubData.paymentDate <= todayStr)) ? '' : '[지급 예정]'}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {paystubData && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (showLegalBasis) {
                          handleCloseLegalBasis();
                        } else {
                          setShowLegalBasis(true);
                          setIsLegalClosing(false);
                        }
                      }}
                      title="4대보험 및 세금 법정 산출 기준 안내"
                      aria-label="4대보험 및 세금 법정 산출 기준 안내"
                      style={{
                        background: showLegalBasis ? 'var(--bg-input)' : 'none',
                        border: '1px solid ' + (showLegalBasis ? 'var(--border-color)' : 'transparent'),
                        color: showLegalBasis ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 0,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        if (!showLegalBasis) e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <HelpCircle size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      title="인쇄 및 PDF 다운로드"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 0,
                        padding: '0.55rem 0.95rem',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Printer size={15} />
                      <span>인쇄 / PDF 저장</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleClosePaystub}
                  title="닫기 (ESC)"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 0
                  }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Drawer Body: 대한민국 표준 기업 급여명세서 (완전한 격자 표 양식, NO Radius, 정갈한 실무 서식) */}
            <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {isPaystubLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)', fontSize: '16px' }}>
                  급여 명세서 데이터를 불러오는 중입니다...
                </div>
              ) : paystubData ? (
                (() => {
                  const earnings = [
                    { label: '기본급', amount: paystubData.baseSalary },
                    ...(paystubData.dutyAllowance > 0 ? [{ label: '직책수당', amount: paystubData.dutyAllowance }] : []),
                    { label: '식대 (비과세)', amount: paystubData.mealAllowance },
                    ...(paystubData.overtimePay > 0 ? [{ label: '연장근로수당', amount: paystubData.overtimePay }] : []),
                    ...(paystubData.bonus > 0 ? [{ label: '상여금', amount: paystubData.bonus }] : [])
                  ];

                  const deductions = [
                    { label: '국민연금 (4.5%)', amount: paystubData.nationalPension },
                    { label: '건강보험 (3.545%)', amount: paystubData.healthInsurance },
                    { label: '장기요양보험', amount: paystubData.careInsurance },
                    { label: '고용보험 (0.9%)', amount: paystubData.employmentInsurance },
                    { label: '소득세', amount: paystubData.incomeTax },
                    { label: '지방소득세', amount: paystubData.localIncomeTax },
                    ...(paystubData.lateDeduction > 0 ? [{ label: `근태 차감 (지각 ${paystubData.lateCount || 0}회)`, amount: paystubData.lateDeduction, isLate: true }] : [])
                  ];

                  const maxRows = Math.max(earnings.length, deductions.length);
                  const pairedRows = [];
                  for (let i = 0; i < maxRows; i++) {
                    pairedRows.push({
                      earn: earnings[i] || null,
                      deduct: deductions[i] || null
                    });
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* 1. 기본 인적 및 발행 정보 격자 표 (NO Radius, 100% Collapse) */}
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 0
                      }}>
                        <tbody>
                          <tr>
                            <th style={{ width: '16%', padding: '10px 14px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                              성 명
                            </th>
                            <td style={{ width: '34%', padding: '10px 14px', border: '1px solid var(--border-color)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {paystubData.name || user?.name}
                            </td>
                            <th style={{ width: '16%', padding: '10px 14px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                              귀 속 연 월
                            </th>
                            <td style={{ width: '34%', padding: '10px 14px', border: '1px solid var(--border-color)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {calYear}년 {calMonth + 1}월
                            </td>
                          </tr>
                          <tr>
                            <th style={{ padding: '10px 14px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                              부서 / 직급
                            </th>
                            <td style={{ padding: '10px 14px', border: '1px solid var(--border-color)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {paystubData.dept || user?.dept || '부서'} {user?.position ? `· ${user.position}` : ''}
                            </td>
                            <th style={{ padding: '10px 14px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                              지 급 일 자
                            </th>
                            <td style={{ padding: '10px 14px', border: '1px solid var(--border-color)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {paystubData.paymentDate ? `${paystubData.paymentDate} (${(paystubData.status === 'PAID' || paystubData.paymentDate <= todayStr) ? '지급 완료' : '지급 예정'})` : ((paystubData.status === 'PAID' || paystubData.paymentDate <= todayStr) ? '지급 완료' : '지급 예정')}
                            </td>
                          </tr>
                          <tr>
                            <th style={{ padding: '10px 14px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                              지 급 계 좌
                            </th>
                            <td style={{ padding: '10px 14px', border: '1px solid var(--border-color)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{paystubData.bankName} {paystubData.accountNumber || '-'}</span>
                                {paystubData.accountNumber && (
                                  <button
                                    type="button"
                                    title="계좌번호 복사"
                                    onClick={() => handleCopyAccount(paystubData.bankName, paystubData.accountNumber)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--text-secondary)',
                                      padding: '2px',
                                      display: 'inline-flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                                  </button>
                                )}
                              </div>
                            </td>
                            <th style={{ padding: '10px 14px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                              사 번
                            </th>
                            <td style={{ padding: '10px 14px', border: '1px solid var(--border-color)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {paystubData.userId || user?.id || '-'}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* 2. 실수령액 (차인지급액) 공식 배너 (NO Radius, 고대비 볼드) */}
                      <div style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '2px solid var(--text-primary)',
                        borderRadius: 0,
                        padding: '1.15rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {(paystubData.status === 'PAID' || (paystubData.paymentDate && paystubData.paymentDate <= todayStr)) ? '차인지급액 (실제 수령액)' : '차인지급액 (실수령 예정액)'}
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            지급 총액 {fmt(paystubData.totalPay)} - 공제 총액 {fmt(paystubData.totalDeduction)}
                          </div>
                        </div>
                        <div style={{
                          fontSize: '28px',
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                          letterSpacing: '-0.02em',
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          {fmt(paystubData.netPay)}
                        </div>
                      </div>

                      {/* 3. 지급 및 공제 내역 통합 격자 표 (2열 대비 공식 명세서 양식, NO Radius) */}
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 0
                      }}>
                        <thead>
                          <tr>
                            <th colSpan="2" style={{
                              width: '50%',
                              textAlign: 'center',
                              backgroundColor: 'var(--bg-input)',
                              border: '1px solid var(--border-color)',
                              padding: '10px',
                              fontSize: '15px',
                              fontWeight: 800,
                              color: 'var(--text-primary)'
                            }}>
                              지 급 내 역
                            </th>
                            <th colSpan="2" style={{
                              width: '50%',
                              textAlign: 'center',
                              backgroundColor: 'var(--bg-input)',
                              border: '1px solid var(--border-color)',
                              padding: '10px',
                              fontSize: '15px',
                              fontWeight: 800,
                              color: 'var(--text-primary)'
                            }}>
                              공 제 내 역
                            </th>
                          </tr>
                          <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                            <th style={{ width: '27%', padding: '8px 12px', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'left' }}>
                              지급 항목
                            </th>
                            <th style={{ width: '23%', padding: '8px 12px', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>
                              금액
                            </th>
                            <th style={{ width: '27%', padding: '8px 12px', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'left' }}>
                              공제 항목
                            </th>
                            <th style={{ width: '23%', padding: '8px 12px', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>
                              금액
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pairedRows.map((row, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '9px 12px', border: '1px solid var(--border-color)', fontSize: '15px', color: 'var(--text-primary)' }}>
                                {row.earn?.label || ''}
                              </td>
                              <td style={{ padding: '9px 12px', border: '1px solid var(--border-color)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {row.earn ? fmt(row.earn.amount) : ''}
                              </td>
                              <td style={{ padding: '9px 12px', border: '1px solid var(--border-color)', fontSize: '15px', color: row.deduct?.isLate ? '#ef4444' : 'var(--text-primary)' }}>
                                {row.deduct?.label || ''}
                              </td>
                              <td style={{ padding: '9px 12px', border: '1px solid var(--border-color)', fontSize: '15px', fontWeight: 600, color: row.deduct ? '#ef4444' : 'inherit', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {row.deduct ? `-${fmt(row.deduct.amount)}` : ''}
                              </td>
                            </tr>
                          ))}
                          <tr style={{ backgroundColor: 'var(--bg-input)' }}>
                            <td style={{ padding: '10px 12px', border: '1px solid var(--border-color)', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                              지급 총액
                            </td>
                            <td style={{ padding: '10px 12px', border: '1px solid var(--border-color)', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {fmt(paystubData.totalPay)}
                            </td>
                            <td style={{ padding: '10px 12px', border: '1px solid var(--border-color)', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                              공제 총액
                            </td>
                            <td style={{ padding: '10px 12px', border: '1px solid var(--border-color)', fontSize: '16px', fontWeight: 800, color: '#ef4444', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              -{fmt(paystubData.totalDeduction)}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* 4. 산출 기초 및 근태 현황 (하단 단일 직각 표, NO Radius) */}
                      <div style={{
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 0,
                        padding: '0.85rem 1.25rem',
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        <span>산출 기초: 당월 지각 {paystubData.lateCount || 0}회</span>
                        <span>잔여 연차: {paystubData.remainingLeave ?? '-'}일 (총 {paystubData.totalLeave ?? '-'}일 중 {paystubData.usedLeave ?? '-'}일 사용)</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '5rem 2rem',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 0
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    {calYear}년 {calMonth + 1}월 급여 명세서가 없습니다.
                  </div>
                  <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                    해당 월의 급여 내역이 아직 등록되지 않았거나 정산 진행 중입니다.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
