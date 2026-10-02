/**
 * ============================================================================
 * ACC SERVER-AUTHORITATIVE COUNTDOWN TIMER
 * ============================================================================
 * Displays remaining seconds relative to authoritative server deadline.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Timer, Plus, RotateCcw, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { auctionSound } from '../utils/auctionSound';

interface CountdownTimerProps {
  deadlineMs: number | null;
  serverTime: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showControls?: boolean;
  onAdjustTimer?: (seconds: number) => void;
  onResetTimer?: (seconds?: number) => void;
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  deadlineMs,
  serverTime,
  size = 'md',
  showControls = false,
  onAdjustTimer,
  onResetTimer,
  onExpire,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastBeepSecond = useRef<number | null>(null);
  const clockOffsetRef = useRef<number>(0);

  useEffect(() => {
    if (serverTime) {
      clockOffsetRef.current = serverTime - Date.now();
    }
  }, [serverTime]);

  useEffect(() => {
    if (!deadlineMs) {
      setSecondsRemaining(null);
      lastBeepSecond.current = null;
      return;
    }

    const updateTimer = () => {
      const currentServerTime = Date.now() + clockOffsetRef.current;
      const diff = Math.max(0, Math.ceil((deadlineMs - currentServerTime) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 5 && diff > 0 && lastBeepSecond.current !== diff) {
        lastBeepSecond.current = diff;
        if (soundEnabled) {
          auctionSound.playTimerBeep(diff <= 2);
        }
      }

      if (diff === 0 && lastBeepSecond.current !== 0) {
        lastBeepSecond.current = 0;
        if (onExpire) {
          onExpire();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [deadlineMs, onExpire, soundEnabled]);

  const sizeClasses = {
    sm: 'text-xs font-bold px-2.5 py-1',
    md: 'text-xl md:text-2xl font-black px-4 py-2',
    lg: 'text-3xl md:text-4xl font-black px-5 py-2.5',
    xl: 'text-5xl sm:text-6xl md:text-7xl font-black px-6 py-3.5',
  }[size];

  if (secondsRemaining === null) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className={`inline-flex items-center gap-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-400 ${sizeClasses} font-display tracking-widest shadow-lg`}>
          <Timer className="w-4 h-4 animate-pulse text-blue-400" />
          <span>LOT STANDBY</span>
        </div>
        {showControls && (
          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={() => onResetTimer && onResetTimer(30)}
              className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Start 30s
            </button>
          </div>
        )}
      </div>
    );
  }

  const isExpired = secondsRemaining === 0;
  const isGoingTwice = secondsRemaining <= 5 && !isExpired;
  const isGoingOnce = secondsRemaining <= 10 && secondsRemaining > 5;

  const colorClasses = isExpired
    ? 'bg-red-950/95 border-red-500 text-red-300 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse'
    : isGoingTwice
    ? 'bg-red-950/90 border-red-500 text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse'
    : isGoingOnce
    ? 'bg-amber-950/90 border-amber-500 text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]'
    : 'bg-emerald-950/90 border-emerald-500 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]';

  const stageBadge = isExpired ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/40 text-red-200 border border-red-500 text-[10px] sm:text-xs font-black uppercase tracking-wider animate-bounce">
      <AlertCircle className="w-3 h-3" /> Time Expired • Hammer Ready
    </span>
  ) : isGoingTwice ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/50 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
      Going Twice • Final Call
    </span>
  ) : isGoingOnce ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-600/30 text-amber-300 border border-amber-500/50 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
      Going Once
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
      Active Bidding
    </span>
  );

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `00:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className={`inline-flex items-center gap-2 sm:gap-3 rounded-2xl border-2 ${colorClasses} ${sizeClasses} font-display tracking-widest transition-all duration-300 shadow-2xl`}>
        <Timer className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${isGoingTwice || isExpired ? 'animate-bounce text-red-400' : ''}`} />
        <span>{formatTime(secondsRemaining)}</span>
        <button
          type="button"
          onClick={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            auctionSound.enabled = next;
          }}
          title={soundEnabled ? 'Mute Auction Countdown Beeps' : 'Enable Countdown Audio Beeps'}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition ml-0.5 cursor-pointer"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 opacity-50" />}
        </button>
      </div>

      <div className="flex items-center justify-center">
        {stageBadge}
      </div>

      {showControls && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1 text-xs">
          <button
            onClick={() => onAdjustTimer && onAdjustTimer(10)}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-0.5 font-bold transition cursor-pointer"
            title="Add 10 seconds"
          >
            <Plus className="w-3 h-3 text-emerald-400" /> 10s
          </button>
          <button
            onClick={() => onAdjustTimer && onAdjustTimer(30)}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-0.5 font-bold transition cursor-pointer"
            title="Add 30 seconds"
          >
            <Plus className="w-3 h-3 text-cyan-400" /> 30s
          </button>
          <button
            onClick={() => onResetTimer && onResetTimer(20)}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-0.5 font-bold transition cursor-pointer"
            title="Reset to 20 seconds (subsequent bid timer)"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" /> 20s
          </button>
          <button
            onClick={() => onResetTimer && onResetTimer(30)}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-0.5 font-bold transition cursor-pointer"
            title="Reset to 30 seconds (opening bid timer)"
          >
            <RotateCcw className="w-3 h-3 text-blue-400" /> 30s
          </button>
        </div>
      )}
    </div>
  );
};
