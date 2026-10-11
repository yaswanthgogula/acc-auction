/**
 * ============================================================================
 * ACC DISCORD-THEME TOAST NOTIFICATIONS (EXACT DISCORD UI)
 * ============================================================================
 * - Compact Discord-style toast popups in the corner
 * - Solid dark-gray background (bg-[#2b2d31]), rounded-lg, crisp text
 * - Left-side colored accent border:
 *     * Yellow (border-l-yellow-400) for Live Bids
 *     * Red (border-l-rose-500) for Timer Alerts
 *     * Blurple/Blue (border-l-indigo-400) for System Notices
 *     * Emerald (border-l-emerald-400) for Sold Hammer
 * - Stacks neatly in bottom-right corner
 * - Smooth, fast slide-in / fade-in arrival (STRICTLY NO BOUNCY EFFECTS)
 * - Zero Masking: never obstructs player dossiers, bids, or central timers
 */

import React, { useState, useEffect } from 'react';
import { useAuction, ToastItem } from '../context/AuctionContext';
import {
  Gavel,
  Clock,
  X,
  Volume2,
  Megaphone,
  Trophy,
  UserX,
  AlertCircle,
  Radio,
} from 'lucide-react';

interface AuctionNotificationBannerProps {
  onNavigate?: (route: string) => void;
  compact?: boolean;
}

export const AuctionNotificationBanner: React.FC<AuctionNotificationBannerProps> = ({
  onNavigate,
  compact = false,
}) => {
  const {
    toasts,
    dismissToast,
    customTimerAlert,
    cancelCustomTimerAlert,
  } = useAuction();

  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState<number | null>(null);

  // Synchronized countdown for active custom timer alert
  useEffect(() => {
    if (!customTimerAlert || !customTimerAlert.active) {
      setTimerSecondsRemaining(null);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.ceil((customTimerAlert.startsAt - Date.now()) / 1000));
      setTimerSecondsRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [customTimerAlert]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isFinal10s =
    customTimerAlert?.phase === 'FINAL_10S' ||
    (timerSecondsRemaining !== null && timerSecondsRemaining <= 10 && Boolean(customTimerAlert?.active));

  const hasActiveTimerToast = toasts.some((t) => t.type === 'TIMER');

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[99999] pointer-events-none flex flex-col gap-2.5 max-w-sm w-[350px] sm:w-[380px] select-none"
    >
      {/* 1. Persistent Active Custom Timer Alert (if active countdown is ongoing) */}
      {customTimerAlert && customTimerAlert.active && !hasActiveTimerToast && (
        <div
          className={`pointer-events-auto rounded-lg bg-[#2b2d31] text-[#dbdee1] border border-[#1e1f22] border-l-4 border-l-rose-500 shadow-2xl p-3 flex flex-col gap-1.5 transition-all duration-200 ease-out transform translate-x-0 opacity-100`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="p-1 rounded bg-rose-500/20 text-rose-400 shrink-0">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
              </span>
              <span className="font-mono text-[11px] font-bold text-rose-400 uppercase tracking-wider truncate">
                {isFinal10s ? '🚨 FINAL 10 SECONDS' : '⏳ TIMER ALERT'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-1.5 py-0.5 rounded bg-[#1e1f22] text-rose-300 font-mono font-black text-xs border border-[#35373c]">
                {isFinal10s
                  ? `00:0${timerSecondsRemaining ?? 10}s`
                  : formatCountdown(timerSecondsRemaining ?? 0)}
              </span>
              <button
                type="button"
                onClick={cancelCustomTimerAlert}
                title="Dismiss Alert"
                className="text-[#949ba4] hover:text-white p-1 rounded hover:bg-[#35373c] transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-[#dbdee1] font-sans leading-relaxed">
            {isFinal10s
              ? 'Auction commencing automatically! Get ready for live bidding.'
              : customTimerAlert.message || 'Auction starts soon.'}
          </p>
        </div>
      )}

      {/* 2. Discord-style Toast Popups Stack */}
      {toasts.map((toast) => {
        let borderAccent = 'border-l-indigo-400';
        let badgeBg = 'bg-indigo-500/20 text-indigo-400';
        let IconComponent = Megaphone;
        let channelTag = '#announcements';

        if (toast.type === 'BID') {
          borderAccent = 'border-l-yellow-400';
          badgeBg = 'bg-yellow-400/20 text-yellow-300';
          IconComponent = Gavel;
          channelTag = '#live-bids';
        } else if (toast.type === 'TIMER') {
          borderAccent = 'border-l-rose-500';
          badgeBg = 'bg-rose-500/20 text-rose-400';
          IconComponent = Clock;
          channelTag = '#timer-alerts';
        } else if (toast.type === 'SALE') {
          borderAccent = 'border-l-emerald-400';
          badgeBg = 'bg-emerald-400/20 text-emerald-400';
          IconComponent = Trophy;
          channelTag = '#auction-sales';
        } else if (toast.type === 'UNSOLD') {
          borderAccent = 'border-l-slate-400';
          badgeBg = 'bg-slate-700/50 text-slate-300';
          IconComponent = UserX;
          channelTag = '#unsold-pool';
        }

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto rounded-lg bg-[#2b2d31] text-[#dbdee1] border border-[#1e1f22] border-l-4 ${borderAccent} shadow-2xl shadow-black/80 p-3 flex flex-col gap-1.5 transition-all duration-200 ease-out transform translate-x-0 opacity-100 hover:bg-[#313338]`}
          >
            {/* Header: Channel tag / category & Close button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`p-1 rounded ${badgeBg} shrink-0`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </span>
                <span className="font-mono text-[10px] font-bold text-[#949ba4] uppercase tracking-wider">
                  {channelTag}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-white text-xs font-bold truncate">
                  {toast.title}
                </span>
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                title="Close"
                className="text-[#949ba4] hover:text-white p-1 rounded hover:bg-[#35373c] transition cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body: Crisp Discord-styled text */}
            <div className="text-xs text-[#dbdee1] font-sans leading-relaxed">
              {toast.type === 'BID' && toast.meta ? (
                <div>
                  <span className="font-semibold text-white">
                    {toast.meta.playerName || 'Player'}
                  </span>{' '}
                  bid by{' '}
                  <span className="font-bold text-yellow-400">
                    {toast.meta.franchiseName || 'Franchise'}
                  </span>{' '}
                  for{' '}
                  <span className="font-mono font-bold text-emerald-400">
                    {toast.meta.amount} Pts (Purse)
                  </span>
                </div>
              ) : (
                <p>{toast.message}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
