import React, { useState, useEffect, useRef } from 'react';

export default function Timer({ remainingMs }) {
  const [displayMs, setDisplayMs] = useState(remainingMs);
  const intervalRef = useRef(null);

  useEffect(() => {
    setDisplayMs(remainingMs);
  }, [remainingMs]);

  useEffect(() => {
    if (displayMs <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setDisplayMs((prev) => {
        if (prev <= 1000) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [displayMs > 0]);

  const totalSeconds = Math.floor(displayMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const isWarning = displayMs > 0 && displayMs < 60000;
  const isExpired = displayMs === 0;

  return (
    <div className={`timer ${isWarning ? 'warning' : ''} ${isExpired ? 'expired' : ''}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <span className="tabular-nums tracking-wider">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      {isExpired && <span className="text-xs font-display font-bold uppercase tracking-wider animate-pulse">Time Up</span>}
    </div>
  );
}
