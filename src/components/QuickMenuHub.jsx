import React from 'react';
import FlipClock from './FlipClock';

export default function QuickMenuHub({
  user,
  attendance,
  onCheckIn,
  onCheckOut,
  onNavigate,
  currentView = 'HUB',
  subTabs = {},
  onSelectSubTab,
  unreadNotifsCount = 0,
  pendingRequestsCount = 0,
  approvedWorkType,
  todayLeave,
  isTodayFullDayLeave,
  isAmHalfLeave
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

  const menuItems = React.useMemo(() => {
    if (user.role === 'CLIENT') {
      return [
        {
          key: 'HUB',
          label: '홈',
          onClick: () => onNavigate('HUB'),
          subItems: []
        },
        {
          key: 'CLIENT_HOMEPAGE',
          label: '홈페이지 바로가기',
          isExternal: true,
          onClick: () => window.open(user.websiteUrl || user.homepageUrl || 'https://example.com', '_blank')
        },
        {
          key: 'CLIENT_ADMIN',
          label: '관리자 바로가기',
          isExternal: true,
          onClick: () => window.open(
            user.adminUrl ||
            user.websiteAdminUrl ||
            (user.websiteUrl ? `${user.websiteUrl}/admin` : (user.homepageUrl ? `${user.homepageUrl}/admin` : 'https://example.com/admin')),
            '_blank'
          )
        },
        {
          key: 'CLIENT_REQUESTS',
          label: '요청사항 바로가기',
          onClick: () => onNavigate('CLIENT_REQUESTS'),
          subItems: []
        }
      ];
    }

    const items = [
      {
        key: 'HUB',
        label: '홈',
        onClick: () => onNavigate('HUB'),
        subItems: []
      },
      {
        key: 'COMMUTE',
        label: '근태 관리',
        onClick: () => onNavigate('COMMUTE'),
        subItems: [
          { id: 'calendar', label: '달력보기' },
          { id: 'leaveStatus', label: '연차 현황' },
          { id: 'apply', label: '근태 신청' },
          { id: 'history', label: '근태 내역' }
        ]
      },
      {
        key: 'CLIENT_REQUESTS',
        label: '요청관리',
        hasDot: pendingRequestsCount > 0,
        onClick: () => onNavigate('CLIENT_REQUESTS'),
        subItems: []
      },
      {
        key: 'PROJECTS',
        label: '프로젝트 관리',
        onClick: () => onNavigate('PROJECTS'),
        subItems: [
          { id: 'PROJECTS', label: '프로젝트 목록', isViewSwitch: true },
          { id: 'TASKS_LIST', label: '내 업무 목록', isViewSwitch: true }
        ]
      },
      {
        key: 'CALENDAR_LEAVE',
        label: '일정 관리',
        onClick: () => onNavigate('CALENDAR_LEAVE'),
        subItems: []
      },
      {
        key: 'FILES',
        label: '파일 관리',
        onClick: () => onNavigate('FILES'),
        subItems: []
      },
      {
        key: 'NOTIFICATIONS',
        label: '알림',
        hasDot: unreadNotifsCount > 0,
        onClick: () => onNavigate('NOTIFICATIONS'),
        subItems: []
      }
    ];

    if (user.username === 'insa' || user.role === 'HR') {
      items.push({
        key: 'PAYROLL',
        label: '급여 관리',
        onClick: () => onNavigate('PAYROLL'),
        subItems: []
      });
    }

    if (user.role === 'ADMIN') {
      items.push({
        key: 'ADMIN',
        label: '최고 관리자',
        onClick: () => onNavigate('ADMIN'),
        subItems: [
          { id: 'accounts', label: '계정관리' },
          { id: 'internal', label: '사내관리' },
          { id: 'clients', label: '고객사 관리' },
          { id: 'onedesk', label: '원데스크 설정' },
          { id: 'etc', label: '기타' }
        ]
      });
    }

    items.push({
      key: 'SETTINGS',
      label: '환경설정',
      onClick: () => onNavigate('SETTINGS'),
      subItems: []
    });

    return items;
  }, [user, unreadNotifsCount, pendingRequestsCount, onNavigate]);

  return (
    <aside className="workspace-sidebar">
      {/* 1. 상단 기본 정보 (날짜 -> 부서/성명 -> 출퇴근 버튼 -> 상하 대칭 간격 플립 시계) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {/* 1번째 줄: 오늘 날짜 */}
        <div style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
          letterSpacing: '-0.015em',
          marginBottom: '0.3rem'
        }}>
          {getFormattedToday()}
        </div>

        {/* 2번째 줄: 부서명 / 성명 */}
        {user.role === 'CLIENT' ? (
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.55rem',
            flexWrap: 'wrap'
          }}>
            <span style={{
              fontSize: '17px',
              color: 'var(--text-secondary)'
            }}>
              협력 고객사
            </span>
            <h2 style={{
              fontSize: '26px',
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em',
              margin: 0,
              lineHeight: 1.2
            }}>
              {user.companyName}
            </h2>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.55rem',
            flexWrap: 'wrap',
            marginBottom: '0.95rem'
          }}>
            <span style={{
              fontSize: '17px',
              color: 'var(--text-secondary)'
            }}>
              {user.dept || '개발팀'}
            </span>
            <h2 style={{
              fontSize: '28px',
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em',
              margin: 0,
              lineHeight: 1.2
            }}>
              {user.name}
            </h2>
          </div>
        )}

        {/* 3번째 줄: 출근 / 퇴근 슬롯 (플립 시계 위쪽 배치) */}
        {user.role !== 'CLIENT' && (
          <>
            {isAmHalfLeave && todayLeave?.status === 'APPROVED' && !attendance?.checkIn && (
              <div style={{
                marginBottom: '0.5rem',
                fontSize: '15px',
                color: 'var(--text-secondary)'
              }}>
                오전 반차
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.55rem',
              width: '100%'
            }}>
              {isTodayFullDayLeave && todayLeave?.status === 'APPROVED' && !attendance?.checkIn ? (
                <>
                  <div
                    style={{
                      height: '44px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '7px',
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
                      height: '44px',
                      fontSize: '16px',
                      borderRadius: '7px',
                      cursor: 'pointer'
                    }}
                  >
                    관리
                  </button>
                </>
              ) : (
                <>
                  {!attendance?.checkIn ? (
                    isAmHalfLocked ? (
                      <div
                        style={{
                          height: '44px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '7px',
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
                        style={{
                          height: '44px',
                          fontSize: '16px',
                          borderRadius: '7px',
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
                        height: '44px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '17px',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '7px',
                        letterSpacing: '0.02em'
                      }}
                    >
                      {attendance.checkIn.slice(0, 5)}
                    </div>
                  )}

                  {attendance?.checkOut ? (
                    <div
                      title={`퇴근 시간: ${attendance.checkOut}`}
                      style={{
                        height: '44px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '17px',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '7px',
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
                        height: '44px',
                        fontSize: '16px',
                        borderRadius: '7px',
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

        {/* 4번째 줄: 플립 시계 (상하 간격 1.65rem으로 넓고 완벽히 동일하게 통일) */}
        <div style={{
          width: '100%',
          paddingTop: '1.65rem',
          paddingBottom: '1.65rem'
        }}>
          <FlipClock size="sidebar" />
        </div>
      </div>

      {/* 2. 세로 사이드바 메뉴 리스트 + 액티브 메뉴 하단 아코디언 하위 탭 */}
      <nav style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%'
      }}>
        {menuItems.map(item => {
          const isProjectsRelated = item.key === 'PROJECTS' && (currentView === 'PROJECTS' || currentView === 'TASKS_LIST');
          const isActive = !item.isExternal && (currentView === item.key || isProjectsRelated);
          const hasSubItems = Array.isArray(item.subItems) && item.subItems.length > 0;

          return (
            <React.Fragment key={item.key}>
              <button
                type="button"
                onClick={item.onClick}
                className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem'
                }}>
                  <span>{item.label}</span>
                  {item.hasDot && (
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        backgroundColor: '#ef4444',
                        borderRadius: '50%',
                        display: 'inline-block'
                      }}
                    />
                  )}
                </span>
              </button>

              {hasSubItems && (
                <div className={`sidebar-subnav-wrapper ${isActive ? 'open' : ''}`}>
                  <div className="sidebar-subnav">
                    {item.subItems.map(sub => {
                      const isSubActive = sub.isViewSwitch
                        ? currentView === sub.id
                        : subTabs[item.key] === sub.id;

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          className={`sidebar-subnav-btn ${isSubActive ? 'active' : ''}`}
                          onClick={() => {
                            if (sub.isViewSwitch) {
                              onNavigate(sub.id);
                            } else if (onSelectSubTab) {
                              onSelectSubTab(item.key, sub.id);
                            }
                          }}
                        >
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
}
