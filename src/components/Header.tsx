/**
 * ============================================================================
 * ACC MAIN NAVIGATION HEADER & UNIVERSAL INBOX
 * ============================================================================
 * - Includes Universal Inbox (via Bell icon) accessible to ALL users
 * - Sleek, dark Discord-themed dropdown UI (bg-[#2b2d31], accent borders)
 * - Broadcast notification history with filters & mark all as read
 */

import React, { useState, useRef, useEffect } from 'react';
import { AvanthiLogo } from './AvanthiLogo';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../context/AuctionContext';
import {
  Radio,
  Users,
  Award,
  LogOut,
  LogIn,
  Home,
  Tv,
  Volume2,
  VolumeX,
  Bell,
  CheckCheck,
  Trash2,
  X,
  Gavel,
  Clock,
  Trophy,
  Megaphone,
  UserX,
} from 'lucide-react';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenLogin: (type?: 'PLAYER' | 'FRANCHISE' | 'ADMIN') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  onOpenLogin,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const {
    soundEnabled,
    toggleSound,
    notificationHistory,
    unreadNotificationCount,
    markAllNotificationsAsRead,
    clearNotificationHistory,
  } = useAuction();

  const [showInbox, setShowInbox] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<'ALL' | 'BIDS' | 'ALERTS'>('ALL');
  const inboxRef = useRef<HTMLDivElement>(null);

  // Close inbox dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inboxRef.current && !inboxRef.current.contains(e.target as Node)) {
        setShowInbox(false);
      }
    };
    if (showInbox) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInbox]);

  const navItems = [
    { id: 'HOME', label: 'Home', icon: Home, route: '/' },
    { id: 'PLAYERS', label: 'Players', icon: Users, route: '/players' },
    { id: 'FRANCHISES', label: 'Franchises', icon: Award, route: '/franchises' },
    { id: 'AUCTION', label: 'Auction', icon: Radio, route: '/live', isLive: true },
    { id: 'PROJECTOR', label: 'Projector', icon: Tv, route: '/projector' },
  ];

  const filteredNotifications = notificationHistory.filter((item) => {
    if (inboxFilter === 'BIDS') return item.type === 'BID';
    if (inboxFilter === 'ALERTS') return item.type !== 'BID';
    return true;
  });

  const formatTimestamp = (ts: number) => {
    try {
      const diffSec = Math.floor((Date.now() - ts) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 transition-all shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div
          onClick={() => onNavigate('/')}
          className="cursor-pointer flex items-center gap-3 transition transform active:scale-95 shrink-0"
        >
          <AvanthiLogo size="md" showText={true} />
        </div>

        {/* Center Navigation */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800/80 shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.route)}
                title={item.label}
                className={`relative px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                {item.isLive && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Side: Sound, Universal Inbox & Auth Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Stadium Sound Enabled (Click to Mute)' : 'Stadium Sound Muted (Click to Enable)'}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 animate-pulse text-amber-400" />
                <span className="hidden xl:inline text-[11px] font-mono">Sound ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-500" />
                <span className="hidden xl:inline text-[11px] font-mono">Muted</span>
              </>
            )}
          </button>

          {/* Universal Notification Inbox (Accessible to ALL Users) */}
          <div className="relative" ref={inboxRef}>
            <button
              onClick={() => {
                setShowInbox(!showInbox);
                if (!showInbox && unreadNotificationCount > 0) {
                  // Keep count until user marks as read or browses
                }
              }}
              title="Universal Notification Inbox"
              aria-label="Universal Notification Inbox"
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer relative ${
                showInbox
                  ? 'bg-[#5865f2] border-[#5865f2] text-white shadow-lg shadow-[#5865f2]/40'
                  : unreadNotificationCount > 0
                  ? 'bg-[#2b2d31] border-yellow-500/50 text-yellow-300 hover:bg-[#35373c]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Bell className={`w-4 h-4 ${unreadNotificationCount > 0 ? 'text-yellow-400 animate-pulse' : ''}`} />
              <span className="hidden xl:inline text-[11px] font-mono">Inbox</span>
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-[#f04747] text-white text-[10px] font-black rounded-full min-w-4 text-center shadow-md animate-pulse">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Exact Discord Theme Universal Inbox Dropdown */}
            {showInbox && (
              <div
                className="absolute right-0 top-12 z-50 w-[340px] sm:w-[420px] rounded-2xl bg-[#2b2d31] border border-[#1e1f22] shadow-2xl shadow-black/95 flex flex-col overflow-hidden text-white font-sans animate-in fade-in duration-150"
              >
                {/* Header: Discord Channel Bar */}
                <div className="p-3.5 bg-[#1e1f22] border-b border-[#2b2d31] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[#949ba4] font-mono text-sm font-black">#</span>
                    <h4 className="font-heading font-bold text-white text-sm truncate">Universal Inbox</h4>
                    {unreadNotificationCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#f04747] text-white text-[10px] font-bold shrink-0">
                        {unreadNotificationCount} new
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {unreadNotificationCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        title="Mark all as read"
                        className="p-1.5 rounded-lg text-[#949ba4] hover:text-emerald-400 hover:bg-[#2b2d31] transition cursor-pointer text-xs flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[10px] font-bold">Read All</span>
                      </button>
                    )}
                    {notificationHistory.length > 0 && (
                      <button
                        onClick={clearNotificationHistory}
                        title="Clear notification history"
                        className="p-1.5 rounded-lg text-[#949ba4] hover:text-rose-400 hover:bg-[#2b2d31] transition cursor-pointer text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowInbox(false)}
                      title="Close inbox"
                      className="p-1.5 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#2b2d31] transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="px-3 py-2 bg-[#2b2d31] border-b border-[#1e1f22] flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setInboxFilter('ALL')}
                    className={`px-3 py-1 rounded-md font-bold text-[11px] transition cursor-pointer ${
                      inboxFilter === 'ALL'
                        ? 'bg-[#35373c] text-white'
                        : 'text-[#949ba4] hover:text-white hover:bg-[#1e1f22]'
                    }`}
                  >
                    All ({notificationHistory.length})
                  </button>
                  <button
                    onClick={() => setInboxFilter('BIDS')}
                    className={`px-3 py-1 rounded-md font-bold text-[11px] transition cursor-pointer ${
                      inboxFilter === 'BIDS'
                        ? 'bg-[#35373c] text-yellow-300'
                        : 'text-[#949ba4] hover:text-white hover:bg-[#1e1f22]'
                    }`}
                  >
                    Bids ({notificationHistory.filter((n) => n.type === 'BID').length})
                  </button>
                  <button
                    onClick={() => setInboxFilter('ALERTS')}
                    className={`px-3 py-1 rounded-md font-bold text-[11px] transition cursor-pointer ${
                      inboxFilter === 'ALERTS'
                        ? 'bg-[#35373c] text-indigo-300'
                        : 'text-[#949ba4] hover:text-white hover:bg-[#1e1f22]'
                    }`}
                  >
                    Alerts ({notificationHistory.filter((n) => n.type !== 'BID').length})
                  </button>
                </div>

                {/* Notifications History Feed */}
                <div className="max-h-[380px] overflow-y-auto p-2.5 flex flex-col gap-2">
                  {filteredNotifications.length === 0 ? (
                    <div className="py-12 px-4 text-center flex flex-col items-center justify-center text-[#949ba4]">
                      <Bell className="w-8 h-8 mb-2 opacity-40 text-slate-500" />
                      <p className="text-xs font-semibold text-slate-300">No notifications in this channel</p>
                      <p className="text-[11px] text-[#949ba4] mt-1 max-w-xs">
                        Broadcasted live bids, timer warnings, and system notices will be saved here in real-time.
                      </p>
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => {
                      let borderAccent = 'border-l-indigo-400';
                      let badgeBg = 'bg-indigo-500/20 text-indigo-400';
                      let IconComponent = Megaphone;
                      let channelTag = '#announcements';

                      if (notif.type === 'BID') {
                        borderAccent = 'border-l-yellow-400';
                        badgeBg = 'bg-yellow-400/20 text-yellow-300';
                        IconComponent = Gavel;
                        channelTag = '#live-bids';
                      } else if (notif.type === 'TIMER') {
                        borderAccent = 'border-l-rose-500';
                        badgeBg = 'bg-rose-500/20 text-rose-400';
                        IconComponent = Clock;
                        channelTag = '#timer-alerts';
                      } else if (notif.type === 'SALE') {
                        borderAccent = 'border-l-emerald-400';
                        badgeBg = 'bg-emerald-400/20 text-emerald-400';
                        IconComponent = Trophy;
                        channelTag = '#auction-sales';
                      } else if (notif.type === 'UNSOLD') {
                        borderAccent = 'border-l-slate-400';
                        badgeBg = 'bg-slate-700/50 text-slate-300';
                        IconComponent = UserX;
                        channelTag = '#unsold-pool';
                      }

                      return (
                        <div
                          key={notif.id}
                          className={`rounded-lg bg-[#1e1f22] p-2.5 border border-[#2b2d31] border-l-4 ${borderAccent} transition hover:bg-[#232428] flex flex-col gap-1.5 ${
                            !notif.read ? 'ring-1 ring-amber-500/20' : 'opacity-90'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`p-1 rounded ${badgeBg} shrink-0`}>
                                <IconComponent className="w-3.5 h-3.5" />
                              </span>
                              <span className="font-mono text-[10px] font-bold text-[#949ba4] uppercase">
                                {channelTag}
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-white text-xs font-bold truncate">
                                {notif.title}
                              </span>
                            </div>

                            <span className="text-[10px] font-mono text-[#949ba4] shrink-0">
                              {formatTimestamp(notif.timestamp)}
                            </span>
                          </div>

                          <div className="text-xs text-[#dbdee1] leading-relaxed">
                            {notif.type === 'BID' && notif.meta ? (
                              <div>
                                <span className="font-semibold text-white">
                                  {notif.meta.playerName || 'Player'}
                                </span>{' '}
                                bid by{' '}
                                <span className="font-bold text-yellow-400">
                                  {notif.meta.franchiseName || 'Franchise'}
                                </span>{' '}
                                for{' '}
                                <span className="font-mono font-bold text-emerald-400">
                                  {notif.meta.amount} Pts (Purse)
                                </span>
                              </div>
                            ) : (
                              <p>{notif.message}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:flex flex-col text-right leading-tight select-none pointer-events-none">
            <span className="font-script text-white text-lg font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] -rotate-1">
              Same College
            </span>
            <span className="font-script text-sky-300 text-lg font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] -rotate-1">
              Same Passion
            </span>
            <span className="font-script text-amber-300 text-lg font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] -rotate-1">
              Bigger Dreams
            </span>
          </div>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-slate-200 leading-tight">
                  {user.username}
                </span>
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  {user.role}
                </span>
              </div>

              {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'OPERATOR') && (
                <button
                  onClick={() => onNavigate('/admin')}
                  className="px-2.5 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition cursor-pointer"
                >
                  Admin
                </button>
              )}
              {user.role === 'FRANCHISE' && (
                <button
                  onClick={() => onNavigate('/franchise')}
                  className="px-2.5 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition cursor-pointer"
                >
                  Console
                </button>
              )}
              {user.role === 'PLAYER' && (
                <button
                  onClick={() => onNavigate('/player/dashboard')}
                  className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition cursor-pointer"
                >
                  Dashboard
                </button>
              )}

              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenLogin('PLAYER')}
                className="px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-1.5 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-blue-400" />
                LOGIN
              </button>
              <button
                onClick={() => onNavigate('/player/register')}
                className="px-3.5 py-2 text-xs sm:text-sm font-black rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-950/40 flex items-center gap-1.5 transition cursor-pointer uppercase tracking-wider"
              >
                REGISTER
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
