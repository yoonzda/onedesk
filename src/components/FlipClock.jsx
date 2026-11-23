import React, { useState, useEffect, useRef } from 'react';

/**
 * FlipDigit - 1글자 단위 독립 3D 물리 낙하 플립 카드
 * useRef와 고유 flipId key를 적용하여 매 초마다 멈춤 없이 100% 신뢰성 있게 연속 플립됩니다.
 */
function FlipDigit({ digit }) {
  const [current, setCurrent] = useState(digit);
  const [previous, setPrevious] = useState(digit);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipId, setFlipId] = useState(0);
  const prevDigitRef = useRef(digit);

  useEffect(() => {
    if (digit !== prevDigitRef.current) {
      const oldVal = prevDigitRef.current;
      prevDigitRef.current = digit;
      setPrevious(oldVal);
      setCurrent(digit);
      setIsFlipping(true);
      setFlipId(prev => prev + 1);

      const timer = setTimeout(() => {
        setIsFlipping(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [digit]);

  return (
    <div className="flip-card-unit">
      {/* 상단 고정판 (현재/새 숫자) */}
      <div className="flip-card-half flip-card-top static">
        <span className="flip-digit-text">{current}</span>
      </div>

      {/* 하단 고정판 (플립 중: 이전 숫자, 플립 완료 후: 새 숫자) */}
      <div className="flip-card-half flip-card-bottom static">
        <span className="flip-digit-text">{isFlipping ? previous : current}</span>
      </div>

      {/* 상단 플립 회전판 (중력 가속도로 아래로 떨어짐) */}
      {isFlipping && (
        <div key={`top-${flipId}`} className="flip-card-half flip-card-top flip-anim-top">
          <span className="flip-digit-text">{previous}</span>
        </div>
      )}

      {/* 하단 플립 회전판 (바닥에 착지하며 탄성 반동 스냅) */}
      {isFlipping && (
        <div key={`bottom-${flipId}`} className="flip-card-half flip-card-bottom flip-anim-bottom">
          <span className="flip-digit-text">{current}</span>
        </div>
      )}

      {/* 중앙 힌지 분할선 */}
      <div className="flip-card-seam" />
      {/* 좌우 정밀 힌지 핀 홈 */}
      <div className="flip-card-notch left" />
      <div className="flip-card-notch right" />
    </div>
  );
}

/**
 * FlipClock
 * @param {string} size - 'normal' | 'compact' | 'sidebar'
 */
export default function FlipClock({ size = 'normal' }) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');

  const sizeClass = size === 'sidebar' ? 'compact sidebar' : (size === 'compact' ? 'compact' : '');

  return (
    <div className={`flip-clock-container ${sizeClass}`}>
      {/* 시 (Hours) - 2개 독립 카드 */}
      <div className="flip-group">
        <div className="flip-pair">
          <FlipDigit digit={hours[0]} />
          <FlipDigit digit={hours[1]} />
        </div>
        <span className="flip-label">HOURS</span>
      </div>

      {/* 콜론 구분자 */}
      <div className="flip-colon-deluxe">
        <span className="colon-dot-deluxe" />
        <span className="colon-dot-deluxe" />
      </div>

      {/* 분 (Minutes) - 2개 독립 카드 */}
      <div className="flip-group">
        <div className="flip-pair">
          <FlipDigit digit={minutes[0]} />
          <FlipDigit digit={minutes[1]} />
        </div>
        <span className="flip-label">MINUTES</span>
      </div>

      {/* 콜론 구분자 */}
      <div className="flip-colon-deluxe">
        <span className="colon-dot-deluxe" />
        <span className="colon-dot-deluxe" />
      </div>

      {/* 초 (Seconds) - 2개 독립 카드 */}
      <div className="flip-group">
        <div className="flip-pair">
          <FlipDigit digit={seconds[0]} />
          <FlipDigit digit={seconds[1]} />
        </div>
        <span className="flip-label">SECONDS</span>
      </div>
    </div>
  );
}
