/**
 * ============================================================================
 * ACC LIVE AUCTION NOTIFICATION & CUSTOM TIMER ALERT BANNER
 * ============================================================================
 * Implements Requirement 2:
 * - Shows custom timer alert ("Auction starts in MM:SS")
 * - If player is not using the app, sends desktop/mobile push notification
 * - Real-time notification for every bid: which player has been bid by which franchise and amount
 * - When custom timer alert stops, after 10 seconds directly starts auction automatically!
 */

import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { mobileNotification } from '../utils/mobileNotification';
import { Bell, Clock, X, ChevronRight, Smartphone, Zap, TrendingUp, AlertCircle } from 'lucide-react';

interface AuctionNotificationBannerProps {
  onNavigate?: (route: string) => void;
}

export const AuctionNotificationBanner: React.FC<AuctionNotificationBannerProps> = ({ onNavigate }) => {
  const {
    activeNotification,
    dismissNotification,
    customTimerAlert,
    cancelCustomTimerAlert,
    liveBidNotification,
    dismissLiveBidNotification,
  } = useAuction();

  const [alertSecondsRemaining, setAlertSecondsRemaining] = useState<number | null>(null);
  const [mobileAlertEnabled, setMobileAlertEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // Custom Timer Alert Countdown Ticker (Requirement 2)
  useEffect(() => {
    if (!customTimerAlert || !customTimerAlert.active) {
      setAlertSecondsRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((customTimerAlert.startsAt - now) / 1000));
      setAlertSecondsRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [customTimerAlert]);

  // Request browser notification permission
  const handleEnableMobileAlerts = async () => {
    const res = await mobileNotification.requestPermission();
    if (res === 'granted') {
      setMobileAlertEnabled(true);
    }
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isFinal10s = customTimerAlert?.phase === 'FINAL_10S' || (alertSecondsRemaining !== null && alertSecondsRemaining <= 10 && Boolean(customTimerAlert?.active));

  return (
    <div className="relative z-50 flex flex-col w-full shadow-2xl">
      {/* 1. CUSTOM TIMER ALERT (Requirement 2) */}
      {customTimerAlert && customTimerAlert.active && (
        <div
          className={`w-full text-slate-950 px-4 py-3 border-b transition-all duration-300 ${
            isFinal10s
              ? 'bg-gradient-to-r from-red-500 via-amber-400 to-red-500 animate-pulse border-red-600 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
              : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 border-amber-500'
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                  isFinal10s ? 'bg-slate-950 text-red-400 animate-bounce' : 'bg-slate-950 text-amber-400'
                }`}
              >
                <Clock className="w-5 h-5 animate-spin" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider ${
                      isFinal10s ? 'bg-red-950 text-red-300' : 'bg-slate-950 text-amber-400'
                    }`}
                  >
                    {isFinal10s ? '🚨 FINAL 10 SECONDS' : '⏳ AUCTION TIMER ALERT'}
                  </span>
                  <span className="font-heading font-black text-slate-950 uppercase tracking-tight text-sm">
                    {isFinal10s ? 'AUCTION COMMENCING AUTOMATICALLY!' : customTimerAlert.message}
                  </span>
                </div>
                <span className="text-slate-900 text-[11px] font-semibold mt-0.5">
                  {isFinal10s
                    ? 'When custom timer alert stops, after 10 seconds auction starts directly!'
                    : 'Scheduled auction commencement alert for all players and audience.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-auto">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950 text-amber-300 font-mono font-black text-sm shadow-inner border border-slate-800">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                <span>
                  {isFinal10s ? `STARTS IN: 00:0${alertSecondsRemaining ?? 10}s` : `STARTS IN: ${formatCountdown(alertSecondsRemaining ?? 0)}`}
                </span>
              </div>

              {!mobileAlertEnabled && mobileNotification.isSupported() && (
                <button
                  onClick={handleEnableMobileAlerts}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 text-white font-bold text-[11px] flex items-center gap-1.5 transition shadow cursor-pointer border border-slate-800"
                  title="Receive timer alert on your mobile device even if app is minimized"
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Get Mobile Notification</span>
                </button>
              )}

              {onNavigate && (
                <button
                  onClick={() => onNavigate('/live')}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold text-xs flex items-center gap-1 transition shadow cursor-pointer"
                >
                  <span>Enter Floor</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={cancelCustomTimerAlert}
                className="p-1.5 rounded-lg text-slate-950 hover:bg-slate-950/20 transition cursor-pointer"
                title="Dismiss or cancel timer alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. REAL-TIME LIVE BID BROADCAST NOTIFICATION (Requirement 2) */}
      {liveBidNotification && (
        <div className="w-full bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 text-white px-4 py-2 border-b border-cyan-500/40 shadow-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow animate-pulse">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded bg-blue-950 text-cyan-300 font-mono font-bold text-[10px] border border-blue-700">
                  🏏 LIVE BID ALERT
                </span>
                <span className="font-bold text-white text-xs">
                  <span className="text-amber-300 font-black">{liveBidNotification.playerName}</span> has been bid by{' '}
                  <span className="text-cyan-300 font-black">{liveBidNotification.franchiseName}</span> for{' '}
                  <span className="text-yellow-400 font-black font-mono">₹{liveBidNotification.amount} Lakhs</span>!
                </span>
              </div>
            </div>

            <button
              onClick={dismissLiveBidNotification}
              className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. STANDARD SYSTEM NOTIFICATION BANNER */}
      {activeNotification && !customTimerAlert && (
        <div className="relative z-40 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-2.5 shadow-2xl border-b border-amber-600/40">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-400 text-[10px] font-mono font-black uppercase tracking-wider shrink-0 w-fit">
                  LIVE BROADCAST
                </span>
                <span className="font-black text-slate-950 tracking-tight text-sm truncate">
                  {activeNotification.title}
                </span>
                <span className="hidden md:inline text-slate-800 text-xs truncate max-w-xl">
                  — {activeNotification.message}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-auto">
              {!mobileAlertEnabled && mobileNotification.isSupported() && (
                <button
                  onClick={handleEnableMobileAlerts}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-950 text-slate-100 font-bold text-[11px] flex items-center gap-1 transition shadow cursor-pointer border border-slate-800"
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Enable Mobile Alerts</span>
                </button>
              )}

              {onNavigate && (
                <button
                  onClick={() => onNavigate('/live')}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold text-xs flex items-center gap-1 transition shadow cursor-pointer"
                >
                  <span>Go to Floor</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={dismissNotification}
                className="p-1 rounded-md text-slate-900 hover:bg-slate-950/20 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
