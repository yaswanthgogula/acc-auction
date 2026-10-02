/**
 * ============================================================================
 * ACC LIVE AUCTION NOTIFICATION BANNER
 * ============================================================================
 * Displays official broadcast alerts across all app pages with custom time countdown.
 * Delivers native push notifications to mobile/desktop devices when minimized.
 */

import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { mobileNotification } from '../utils/mobileNotification';
import { Bell, Clock, X, ChevronRight, Smartphone } from 'lucide-react';

interface AuctionNotificationBannerProps {
  onNavigate?: (route: string) => void;
}

export const AuctionNotificationBanner: React.FC<AuctionNotificationBannerProps> = ({ onNavigate }) => {
  const { activeNotification, dismissNotification } = useAuction();
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [mobileAlertEnabled, setMobileAlertEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  useEffect(() => {
    if (!activeNotification?.startsAt) {
      setSecondsRemaining(null);
      return;
    }

    // Trigger native mobile notification if supported
    mobileNotification.sendNotification(
      activeNotification.title || '🏏 ACC Live Auction Broadcast',
      activeNotification.message || 'Auction begins shortly. Open live floor.'
    );

    const updateRemaining = () => {
      const diff = Math.max(0, Math.ceil((activeNotification.startsAt! - Date.now()) / 1000));
      setSecondsRemaining(diff);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [activeNotification]);

  const handleEnableMobileAlerts = async () => {
    const res = await mobileNotification.requestPermission();
    if (res === 'granted') {
      setMobileAlertEnabled(true);
    }
  };

  if (!activeNotification) return null;

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative z-50 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-2.5 shadow-2xl border-b border-amber-600/40">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Icon & Badge */}
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

        {/* Right: Countdown clock, action button & dismiss */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {secondsRemaining !== null && secondsRemaining > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 text-amber-400 font-mono font-black text-xs shadow-inner">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>STARTS IN {formatCountdown(secondsRemaining)}</span>
            </div>
          )}

          {!mobileAlertEnabled && mobileNotification.isSupported() && (
            <button
              onClick={handleEnableMobileAlerts}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-950 text-slate-100 font-bold text-[11px] flex items-center gap-1 transition shadow cursor-pointer border border-slate-800"
              title="Deliver alerts to your phone notification tray even when app is closed"
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
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
