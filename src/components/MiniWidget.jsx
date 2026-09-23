import React, { useState, useEffect } from 'react';

export default function MiniWidget({ 
  user, 
  attendance, 
  onCheckIn, 
  onCheckOut, 
  onStatusToggle, 
  schedules, 
  notifications, 
  todayLeave,
  isAmHalfLeave,
  isTodayFullDayLeave,
  onClose 
}) {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('ko-KR'));
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ko-KR'));

      if (attendance && attendance.checkIn && !attendance.checkOut) {
        const [h, m] = attendance.checkIn.split(':').map(Number);
        const now = new Date();
        const startM = h * 60 + m;
        const currentM = now.getHours() * 60 + now.getMinutes();
        setElapsedMinutes(Math.max(0, currentM - startM));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attendance]);

  const formatElapsedTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}시간 ${m}분`;
  };

  const todaySchedules = (schedules || []).slice(0, 2);
  const unreadNotifs = (notifications || []).filter(n => !n.isRead).slice(0, 2);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isAmHalfLocked = isAmHalfLeave && !attendance?.checkIn && nowMinutes < (13 * 60);

  return (
    <div className="floating-widget">
      
      {/* Header */}
      <div className="widget-header">
        <span style={{ fontSize: '16px', color: 'var(--primary)' }}>OneDesk 미니 위젯</span>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>
          전체화면
        </button>
      </div>

      {/* Body */}
      <div className="widget-body">
        
        {/* User Status Card */}
        <div style={{
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-md)',
          padding: '1.15rem',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span className="text-sm text-muted">{user.dept} | {user.name}</span>
            <span className="text-sm text-primary">{currentTime}</span>
          </div>

          {/* Commute Status */}
          {attendance && attendance.checkIn ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span className="text-sm text-success">
                  상태: {attendance.status === 'COMPLETED' ? '퇴근 완료' : (isAmHalfLeave ? '오전 반차 · 근무 중' : '근무 중')}
                </span>
                <span className="text-sm">
                  출근 {attendance.checkIn?.slice(0, 5)} {attendance.checkOut ? `| 퇴근 ${attendance.checkOut?.slice(0, 5)}` : ''}
                </span>
              </div>

              {!attendance.checkOut && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                    <span>실시간 근무 시간</span>
                    <span className="text-primary" style={{ fontSize: '16px' }}>{formatElapsedTime(elapsedMinutes)}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => onStatusToggle(attendance.status === 'OUT' ? 'WORKING' : 'OUT')}
                    >
                      {attendance.status === 'OUT' ? '복귀' : '외출'}
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={onCheckOut}
                    >
                      퇴근하기
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '0.6rem 0' }}>
              <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
                {isAmHalfLeave && todayLeave?.status === 'APPROVED' 
                  ? '오늘 오전 반차' 
                  : (isTodayFullDayLeave && todayLeave?.status === 'APPROVED' 
                    ? `오늘 ${todayLeave.leaveType === 'SICK' ? '병가' : (todayLeave.leaveType === 'SPECIAL' ? '경조사' : '연차')} 휴무일입니다.` 
                    : '오늘 출근 체크 전입니다.')
                }
              </p>
              {!isTodayFullDayLeave && (
                isAmHalfLocked ? (
                  <div 
                    style={{ 
                      width: '100%', 
                      padding: '0.45rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      cursor: 'default',
                      userSelect: 'none'
                    }} 
                    title="오전 반차 휴무 중 (13:00부터 출근 가능)"
                  >
                    반차
                  </div>
                ) : (
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ width: '100%' }} 
                    onClick={onCheckIn}
                  >
                    {isAmHalfLeave ? '출근하기' : '원클릭 출근하기'}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Today's Schedules */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="text-sm text-secondary">
              오늘 예정 일정 ({todaySchedules.length})
            </span>
          </div>

          {todaySchedules.length === 0 ? (
            <p className="text-sm text-muted" style={{ padding: '0.4rem 0' }}>예정된 일정이 없습니다.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {todaySchedules.map(s => (
                <div key={s.id} style={{
                  padding: '0.6rem 0.75rem',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '16px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                    {s.title}
                  </span>
                  <span className="text-muted">{s.startDate?.slice(11, 16) || '종일'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Realtime Alert Feed */}
        {unreadNotifs.length > 0 && (
          <div style={{
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 0.9rem',
            fontSize: '16px'
          }}>
            <div style={{ color: 'var(--warning)', marginBottom: '0.3rem', fontSize: '16px' }}>
              실시간 알림 ({unreadNotifs.length})
            </div>
            <p style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{unreadNotifs[0].message}</p>
          </div>
        )}

      </div>
    </div>
  );
}
