import React from 'react';

export default function AdminContactView({ onGoHome }) {
  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '1.5rem 0' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '24px', margin: 0 }}>기술 지원 및 담당 관리자 안내</h2>
      </div>

      <div className="card" style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        <div>
          <h3 style={{ fontSize: '20px', marginBottom: '0.85rem' }}>전담 기술지원팀</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '17px', marginBottom: '0.35rem' }}>김관리 이사 (총괄 관리자)</div>
              <div className="text-secondary" style={{ fontSize: '16px' }}>경영지원본부 / 시스템 총괄</div>
              <div className="text-muted" style={{ fontSize: '16px', marginTop: '0.5rem' }}>이메일: admin@company.com</div>
              <div className="text-muted" style={{ fontSize: '16px' }}>연락처: 010-1234-5678</div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '17px', marginBottom: '0.35rem' }}>이민수 팀장 (개발 기술 지원)</div>
              <div className="text-secondary" style={{ fontSize: '16px' }}>개발1팀 / 프로젝트 책임</div>
              <div className="text-muted" style={{ fontSize: '16px', marginTop: '0.5rem' }}>이메일: ms.lee@company.com</div>
              <div className="text-muted" style={{ fontSize: '16px' }}>연락처: 010-2345-6789</div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <h4 style={{ fontSize: '18px', marginBottom: '0.5rem' }}>운영 시간 및 긴급 접수 안내</h4>
          <p className="text-secondary" style={{ fontSize: '16px', lineHeight: 1.6 }}>
            - 정기 운영 시간: 평일 09:00 ~ 18:00 (주말 및 공휴일 휴무)<br />
            - 긴급 장애 및 서버 관련 이슈는 [요청사항 바로가기]에서 긴급도 [긴급]으로 설정하여 등록해 주시면 담당자에게 즉시 알림이 발송됩니다.
          </p>
        </div>

      </div>

    </div>
  );
}
