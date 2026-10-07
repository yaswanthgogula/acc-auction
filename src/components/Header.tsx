/**
 * ============================================================================
 * ACC MAIN NAVIGATION HEADER
 * ============================================================================
 */

import React from 'react';
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
  const { soundEnabled, toggleSound } = useAuction();

  const navItems = [
    { id: 'HOME', label: 'Home', icon: Home, route: '/' },
    { id: 'PLAYERS', label: 'Players', icon: Users, route: '/players' },
    { id: 'FRANCHISES', label: 'Franchises', icon: Award, route: '/franchises' },
    { id: 'AUCTION', label: 'Auction', icon: Radio, route: '/live', isLive: true },
    { id: 'PROJECTOR', label: 'Projector', icon: Tv, route: '/projector' },
  ];

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

        {/* Right Side: Slogan & Auth Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
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
