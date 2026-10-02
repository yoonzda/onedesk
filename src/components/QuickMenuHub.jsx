import React from 'react';

export default function QuickMenuHub({
  user,
  attendance,
  onCheckIn,
  onCheckOut,
  onNavigate,
  unreadNotifsCount = 0,
  pendingRequestsCount = 0,
  approvedWorkType,
  todayLeave,
  isTodayFullDayLeave,
  isAmHalfLeave,
  isPmHalfLeave
}) {
  const handleCheckOutClick = () => {
    if (!attendance?.checkIn) {
      alert('출근 처리를 먼저 진행해 주세요.');
      return;
    }
    if (window.confirm('퇴근 처리하시겠습니까?')) {
      onCheckOut();
    }
  };

  const [nowMinutes, setNowMinutes] = React.useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const [amWorkStart, setAmWorkStart] = React.useState('14:00');

  React.useEffect(() => {
    fetch('/api/company-policy')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.policy?.halfDayAmWorkStart) {
          setAmWorkStart(data.policy.halfDayAmWorkStart);
        }
      })
      .catch(() => {});
  }, []);

  // 오전 반차: 출근 기준 시각 1시간 전부터 출근 버튼 활성화
  const amEarliestMins = React.useMemo(() => {
    const [h, m] = (amWorkStart || '14:00').split(':').map(Number);
    return Math.max(0, (h * 60 + (m || 0)) - 60);
  }, [amWorkStart]);

  const isAmHalfLocked = isAmHalfLeave && !attendance?.checkIn && nowMinutes < amEarliestMins;

  const getFormattedToday = () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = days[now.getDay()];
    return `${year}년 ${month}월 ${date}일 (${day})`;
  };

  return (
    <div style={{
      width: '100%',
      minHeight: 'calc(100vh - 120px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem 1rem'
    }}>
      
      {/* Top Welcome & Commute Station */}
      <div style={{
        marginBottom: '3rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        {/* 오늘 날짜 */}
        <div style={{
          fontSize: '17px',
          color: 'var(--text-secondary)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          marginBottom: '0.85rem'
        }}>
          {getFormattedToday()}
        </div>


        {/* 사용자 정보: 한 줄로 하되 글씨 크기만 다르게 배치 ("님" 제거) */}
        {user.role === 'CLIENT' ? (
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: '0.85rem',
            margin: '0.2rem 0'
          }}>
            <span style={{
              fontSize: '18px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              letterSpacing: '0.01em'
            }}>
              협력 고객사
            </span>
            <h2 style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em',
              margin: 0,
              lineHeight: 1.15
            }}>
              {user.companyName}
            </h2>
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: '0.85rem',
              margin: '0.2rem 0'
            }}>
              {/* 부서명 (한 줄 내 상대적으로 작은 크기) */}
              <span style={{
                fontSize: '18px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                letterSpacing: '0.01em'
              }}>
                {user.dept || '개발팀'}
              </span>

              {/* 성명 (한 줄 내 메인 크기, "님" 제거) */}
              <h2 style={{
                fontSize: '36px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.03em',
                margin: 0,
                lineHeight: 1.15
              }}>
                {user.name}
              </h2>
            </div>

            {/* 오전 반차 출근 전 상태 순수 텍스트 표기 (규칙 준수: 뱃지/칩 금지, 타이포그래피) */}
            {isAmHalfLeave && todayLeave?.status === 'APPROVED' && !attendance?.checkIn && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '15px',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                letterSpacing: '-0.01em'
              }}>
                오전 반차
              </div>
            )}

            {/* 출근 / 퇴근 / 연차 슬롯 */}
            <div style={{
              marginTop: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              {isTodayFullDayLeave && todayLeave?.status === 'APPROVED' && !attendance?.checkIn ? (
                <>
                  <div
                    style={{
                      minWidth: '96px',
                      height: '42px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'default',
                      userSelect: 'none'
                    }}
                  >
                    {todayLeave?.leaveType === 'SICK' ? '병가' : (todayLeave?.leaveType === 'SPECIAL' ? '경조사' : (todayLeave?.leaveType === 'ETC' ? '휴가' : '연차'))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onNavigate('CALENDAR_LEAVE')}
                    style={{
                      minWidth: '96px',
                      height: '42px',
                      fontSize: '15px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    관리
                  </button>
                </>
              ) : (
                <>
                  {/* 1. 출근 / 재택 / 외근 버튼 또는 시간 표시 */}
                  {!attendance?.checkIn ? (
                    isAmHalfLocked ? (
                      <div
                        style={{
                          minWidth: '96px',
                          height: '42px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'default',
                          userSelect: 'none'
                        }}
                        title="오전 반차 휴무 중 (출근은 13:00부터 가능합니다)"
                      >
                        반차
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          if (approvedWorkType === 'REMOTE') {
                            onCheckIn('REMOTE', '사전 승인 재택근무');
                          } else if (approvedWorkType === 'FIELD') {
                            onCheckIn('FIELD', '사전 승인 외근');
                          } else {
                            onCheckIn('OFFICE', isAmHalfLeave ? '오전 반차 출근' : '');
                          }
                        }}
                        title={
                          isAmHalfLeave ? '오전 반차 출근' :
                          (approvedWorkType === 'REMOTE' ? '사전 승인된 재택근무 출근' :
                          (approvedWorkType === 'FIELD' ? '사전 승인된 외근/출장 출근' : '사내정상 출근'))
                        }
                        style={{
                          minWidth: '96px',
                          height: '42px',
                          fontSize: '15px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        {approvedWorkType === 'REMOTE' ? '재택' : (approvedWorkType === 'FIELD' ? '외근' : '출근')}
                      </button>
                    )
                  ) : (
                <div
                  title={`출근 시간: ${attendance.checkIn}`}
                  style={{
                    minWidth: '96px',
                    height: '42px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    letterSpacing: '0.02em'
                  }}
                >
                  {attendance.checkIn.slice(0, 5)}
                </div>
              )}

              {/* 2. 퇴근 버튼 / 시간 표시 */}
              {attendance?.checkOut ? (
                <div
                  title={`퇴근 시간: ${attendance.checkOut}`}
                  style={{
                    minWidth: '96px',
                    height: '42px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    letterSpacing: '0.02em'
                  }}
                >
                  {attendance.checkOut.slice(0, 5)}
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCheckOutClick}
                  style={{
                    minWidth: '96px',
                    height: '42px',
                    fontSize: '15px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    cursor: attendance?.checkIn ? 'pointer' : 'default',
                    opacity: attendance?.checkIn ? 1 : 0.45
                  }}
                >
                  퇴근
                </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* CLIENT 3 CARDS LAYOUT */}
      {user.role === 'CLIENT' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem',
          width: '100%',
          maxWidth: '1080px'
        }}>
          
          {/* Client Card 1: 홈페이지 바로가기 */}
          <div 
            className="card card-hover"
            onClick={() => window.open(user.websiteUrl || user.homepageUrl || 'https://example.com', '_blank')}
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px'
            }}
          >
            <h3 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)', fontWeight: 400 }}>
              홈페이지 바로가기
            </h3>
          </div>

          {/* Client Card 2: 관리자 바로가기 (고객사 웹사이트 관리자 페이지 새 탭 열기) */}
          <div 
            className="card card-hover"
            onClick={() => window.open(user.adminUrl || user.websiteAdminUrl || (user.websiteUrl ? `${user.websiteUrl}/admin` : (user.homepageUrl ? `${user.homepageUrl}/admin` : 'https://example.com/admin')), '_blank')}
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px'
            }}
          >
            <h3 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)', fontWeight: 400 }}>
              관리자 바로가기
            </h3>
          </div>

          {/* Client Card 3: 요청사항 바로가기 */}
          <div 
            className="card card-hover"
            onClick={() => onNavigate('CLIENT_REQUESTS')}
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px'
            }}
          >
            <h3 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)', fontWeight: 400 }}>
              요청사항 바로가기
            </h3>
          </div>

        </div>
      ) : (
        /* STAFF & ADMIN 6 CARDS LAYOUT */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem',
          width: '100%',
          maxWidth: '1080px'
        }}>
          
          {/* Card 1: 근태 관리 바로가기 */}
          <div 
            className="card card-hover"
            onClick={() => onNavigate('COMMUTE')}
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px'
            }}
          >
            <h3 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)' }}>
              근태 관리
            </h3>
          </div>

          {/* Card 2: 요청관리 */}
          <div 
            className="card card-hover"
            onClick={() => onNavigate('CLIENT_REQUESTS')}
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px'
            }}
          >
            <h3 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)', position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              요청관리
              {pendingRequestsCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-9px',
                    width: '7px',
                    height: '7px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    display: 'block'
                  }}
                />
              )}
            </h3>
          </div>

          {/* Card 3: 프로젝트 관리 */}
          <div 
            className="card card-hover"
            onClick={() => onNavigate('PROJECTS')}
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px'
            }}
          >
            <h3 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)' }}>
              프로젝트 관리
            </h3>
          </div>

          {/* Card 4: 일정 관리 */}
          <div 
            className="card card-hover"
            onClick={() => onNavigate('CALENDAR_LEAVE')}
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px'
            }}
          >
            <h3 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)' }}>
              일정 관리
            </h3>
          </div>

          {/* Card 5: 파일 관리 */}
          <div 
            className="card card-hover"
            onClick={() => onNavigate('FILES')}
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px'
            }}
          >
            <h3 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)' }}>
              파일 관리
            </h3>
          </div>

          {/* Card 6: 기타 또는 관리자 또는 급여 관리 */}
          <div 
            className="card card-hover"
            onClick={() => {
              if (user.username === 'insa' || user.role === 'HR') {
                onNavigate('PAYROLL');
              } else if (user.role === 'ADMIN' || user.role === 'TEAM_LEADER') {
                onNavigate('ADMIN');
              } else {
                onNavigate('SETTINGS');
              }
            }}
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px'
            }}
          >
            <h3 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)' }}>
              {(user.username === 'insa' || user.role === 'HR') ? '급여 관리' : (user.role === 'ADMIN' ? '최고 관리자' : (user.role === 'TEAM_LEADER' ? '팀 관리' : '환경설정'))}
            </h3>
          </div>

        </div>
      )}

    </div>
  );
}
