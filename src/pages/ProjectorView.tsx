/**
 * ============================================================================
 * ACC PROJECTOR VIEW — AUDITORIUM GIGANTIC STAGE (Requirement 1, 2 & 3)
 * ============================================================================
 */

import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { AvanthiLogo } from '../components/AvanthiLogo';
import { AuctionNotificationBanner } from '../components/AuctionNotificationBanner';
import { GuestDrawModal } from '../components/GuestDrawModal';
import { formatAcademicCategory } from '../utils/academicCategories';
import { auctionSound } from '../utils/auctionSound';
import {
  Users,
  Award,
  Radio,
  Sparkles,
  Gavel,
  Clock,
  Trophy,
  Shield,
  Activity,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
} from 'lucide-react';

export const ProjectorView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { user } = useAuth();
  const {
    currentLot,
    franchises,
    serverTime,
    lastSaleEvent,
    autoTransitionCountdown,
    activeSession,
    isPaused,
    pausedRemainingMs,
    togglePauseAuction,
    drawNextPlayer,
    adjustTimer,
    soundEnabled,
    toggleSound,
    refreshState,
  } = useAuction();

  const isUserAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(() => {
    return isUserAdmin || localStorage.getItem('acc_projector_admin') === 'true';
  });
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const isAdmin = isUserAdmin || adminUnlocked;

  const [hammerStage, setHammerStage] = useState<number>(0);
  const [hammering, setHammering] = useState(false);
  const [hammerFeedback, setHammerFeedback] = useState<string | null>(null);
  const [showGuestDrawModal, setShowGuestDrawModal] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [drawingAuto, setDrawingAuto] = useState(false);

  const isSoldOrHammered = currentLot?.lot_state === 'SOLD' || (lastSaleEvent && lastSaleEvent.lotState === 'SOLD');
  const isUnsold = currentLot?.lot_state === 'UNSOLD';

  const handleAdminVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = adminPasscode.trim().toLowerCase();
    if (clean === 'admin' || clean === 'admin123' || clean === '1234' || clean === 'superadmin' || clean === 'avanthi') {
      setAdminUnlocked(true);
      localStorage.setItem('acc_projector_admin', 'true');
      setShowAdminAuthModal(false);
      setAdminPasscode('');
      setAuthError(null);
      setHammerFeedback('👑 Admin Auctioneer Authority Unlocked for Projector Screen!');
      setTimeout(() => setHammerFeedback(null), 3500);
    } else {
      setAuthError('Invalid Admin Passcode. Default is "admin" or "admin123".');
    }
  };

  const handleTogglePause = async () => {
    if (!isAdmin) {
      setShowAdminAuthModal(true);
      return;
    }
    setPausing(true);
    try {
      const res = await togglePauseAuction();
      if (res.success) {
        setHammerFeedback(res.isPaused ? '⏸️ AUCTION PAUSED • COUNTDOWNS FROZEN' : '▶️ AUCTION RESUMED • BIDDING ACTIVE');
        setTimeout(() => setHammerFeedback(null), 3500);
      } else {
        setHammerFeedback(res.error || 'Failed to toggle pause');
        setTimeout(() => setHammerFeedback(null), 3500);
      }
    } catch (err: any) {
      setHammerFeedback(err.message || 'Pause/Play error');
      setTimeout(() => setHammerFeedback(null), 3500);
    } finally {
      setPausing(false);
    }
  };

  const handleHammerStrike = async (action: 'HAMMER_SALE' | 'PLAYER_UNSOLD' = 'HAMMER_SALE', stage: number = 3) => {
    if (!isAdmin) {
      setShowAdminAuthModal(true);
      return;
    }
    if (!currentLot) return;
    setHammering(true);
    setHammerFeedback(null);

    if (action === 'HAMMER_SALE' && currentLot.highest_bidder_id) {
      auctionSound.playSoldCelebration();
    } else {
      auctionSound.playGavelStrike();
    }

    try {
      const res = await fetch('/api/auction/hammer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'SUPER_ADMIN',
          'x-user-username': user?.username || 'StageAdmin',
        },
        body: JSON.stringify({
          editionId: currentLot.edition_id || 'ED_ACC_2026',
          lotId: currentLot.id,
          action,
          stage,
          actor: user?.username || 'Admin (Projector Screen)',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to complete hammer strike.');
      }
      setHammerStage(0);
      setHammerFeedback(
        action === 'HAMMER_SALE' && currentLot.highest_bidder_id
          ? `🔨 SOLD! Confirmed by Admin for ₹${currentLot.current_price} to ${currentLot.highest_bidder_name}`
          : 'Player marked UNSOLD by Stage Admin.'
      );
      await refreshState({ force: true });
      setTimeout(() => setHammerFeedback(null), 4000);
    } catch (err: any) {
      setHammerFeedback(err.message || 'Hammer execution error');
      setTimeout(() => setHammerFeedback(null), 4000);
    } finally {
      setHammering(false);
    }
  };

  const handleStageCall = (callNum: number) => {
    if (!isAdmin) {
      setShowAdminAuthModal(true);
      return;
    }
    setHammerStage(callNum);
    auctionSound.playGavelStrike();
    if (callNum === 1) {
      setHammerFeedback('🔨 GOING ONCE... (Call 1)');
    } else if (callNum === 2) {
      setHammerFeedback('🔨 GOING TWICE... (Final Call!)');
    }
    setTimeout(() => setHammerFeedback(null), 3500);
  };

  const handleDrawNextAuto = async () => {
    if (!isAdmin) {
      setShowAdminAuthModal(true);
      return;
    }
    setDrawingAuto(true);
    setHammerFeedback(null);
    try {
      const res = await drawNextPlayer('AUTO');
      if (!res.success) {
        throw new Error(res.error || 'No more players available for this session.');
      }
      setHammerFeedback(`🎉 Next Player Drawn: ${res.lot?.player_name}`);
      setTimeout(() => setHammerFeedback(null), 3500);
    } catch (err: any) {
      setHammerFeedback(err.message);
      setTimeout(() => setHammerFeedback(null), 4000);
    } finally {
      setDrawingAuto(false);
    }
  };

  const lotStats = (() => {
    if (!currentLot) return null;
    let s = currentLot.stats;
    if (!s && currentLot.stats_json) {
      try {
        s = typeof currentLot.stats_json === 'string' ? JSON.parse(currentLot.stats_json) : currentLot.stats_json;
      } catch {}
    }
    return s || {};
  })();

  return (
    <div className="fixed inset-0 z-50 bg-[#020617] text-white flex flex-col select-none overflow-hidden font-sans">
      <AuctionNotificationBanner />

      <div className="w-full bg-slate-950/95 border-b border-slate-800 px-6 sm:px-8 py-3 flex items-center justify-between z-20 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4 sm:gap-5">
          <AvanthiLogo size="lg" showText={true} />
          <div className="hidden md:flex flex-col ml-2">
            <span className="font-heading text-2xl lg:text-3xl font-black text-white uppercase tracking-wider leading-none">
              Avanthi Cricket Carnival 2026
            </span>
            <span className="text-xs text-amber-400 font-mono tracking-widest uppercase flex items-center gap-2 mt-1">
              <span>Auditorium Mega Screen • Live Stage Floor</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-800 font-bold">
                Session {activeSession}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleTogglePause}
            disabled={pausing}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-lg ${
              isPaused
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 animate-pulse border-2 border-emerald-300 shadow-emerald-950/60'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/60 hover:border-amber-400'
            }`}
            title={isPaused ? 'Resume live auction countdown' : 'Pause live auction countdown'}
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4 fill-current text-slate-950" />
                <span>RESUME (PLAY)</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 fill-current text-amber-400" />
                <span>PAUSE AUCTION</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowGuestDrawModal(true)}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-purple-950/50 border border-purple-400/50"
            title="Open Guest Draw Mode with masked cards for guest VIP on stage"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <span className="hidden sm:inline">GUEST LUCKY DRAW</span>
            <span className="sm:hidden">GUEST DRAW</span>
          </button>

          <div className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/30 border border-red-500/60 text-red-300 font-black text-xs uppercase tracking-wider animate-pulse">
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span>LIVE STAGE</span>
          </div>

          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Mute Stadium Sounds' : 'Enable Stadium Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={onExit}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Exit
          </button>
        </div>
      </div>

      {isPaused && (
        <div className="w-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-950 py-2.5 px-6 font-mono text-xs sm:text-sm font-black uppercase text-center tracking-widest shadow-2xl z-30 border-y-2 border-yellow-200 flex items-center justify-center gap-4 animate-pulse">
          <div className="flex items-center gap-2">
            <Pause className="w-4 h-4 fill-current" />
            <span>AUCTION PAUSED BY AUDITORIUM STAGE CONTROLLER • COUNTDOWNS FROZEN</span>
          </div>
          <button
            onClick={handleTogglePause}
            className="px-3 py-1 rounded-lg bg-slate-950 text-amber-300 hover:text-white font-bold text-xs uppercase cursor-pointer border border-amber-400 transition"
          >
            Resume Now
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-12 py-4 relative overflow-y-auto">
        <div className="absolute top-1/4 left-1/3 w-[700px] h-[400px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[600px] h-[400px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />

        {hammerFeedback && (
          <div className="absolute top-4 inset-x-8 z-50 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black font-mono text-base uppercase text-center shadow-2xl animate-bounce border-2 border-yellow-200">
            {hammerFeedback}
          </div>
        )}

        {isSoldOrHammered && (
          <div className="absolute inset-x-8 top-4 z-40 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-950 rounded-3xl p-6 shadow-[0_0_80px_rgba(245,158,11,0.6)] flex items-center justify-between border-4 border-yellow-200 animate-bounce">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-2xl">
                <Gavel className="w-10 h-10 animate-spin" />
              </div>
              <div>
                <div className="text-sm uppercase tracking-widest font-mono font-black">
                  🔨 HAMMER STRIKE COMPLETED • LOT CONCLUDED
                </div>
                <h2 className="font-heading text-4xl lg:text-5xl font-black uppercase tracking-tight">
                  SOLD! {currentLot?.player_name || lastSaleEvent?.playerName}
                </h2>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase font-mono font-black">Winning Franchise</span>
              <div className="font-heading text-3xl font-black">
                {currentLot?.highest_bidder_name || lastSaleEvent?.winningFranchiseName || 'Winning Franchise'}
              </div>
              <div className="text-xl font-mono font-black text-amber-950">
                Final Bid: {currentLot?.current_price || lastSaleEvent?.finalPrice} Pts (₹)
              </div>
            </div>
          </div>
        )}

        {isUnsold && (
          <div className="absolute inset-x-8 top-4 z-40 bg-slate-900 border-2 border-slate-700 text-slate-300 rounded-3xl p-5 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Gavel className="w-8 h-8 text-amber-400" />
              <div>
                <div className="text-xs font-mono uppercase text-slate-400">LOT CONCLUDED</div>
                <h3 className="font-heading text-2xl font-black text-white uppercase">PLAYER UNSOLD</h3>
              </div>
            </div>
            <div className="text-sm font-mono text-slate-400">Will re-enter pool for Round 2</div>
          </div>
        )}

        {autoTransitionCountdown !== null && autoTransitionCountdown > 0 && !isPaused && (
          <div className="absolute inset-x-8 bottom-28 z-40 p-4 rounded-2xl bg-blue-950/90 border-2 border-cyan-400 text-cyan-200 flex items-center justify-between shadow-2xl font-mono">
            <div className="flex items-center gap-3 font-bold text-sm">
              <Clock className="w-5 h-5 text-cyan-400 animate-spin" />
              <span>AUTOMATIC AUCTION TRANSITION (Requirement 6)</span>
            </div>
            <div className="font-display text-2xl font-black text-amber-300">
              NEXT LOT IN: 00:0{autoTransitionCountdown}s
            </div>
          </div>
        )}

        {currentLot ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden border-4 border-amber-500/70 shadow-[0_0_60px_rgba(245,158,11,0.35)] bg-slate-900 shrink-0">
                {currentLot.photo_url ? (
                  <img src={currentLot.photo_url} alt="Player" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <Users className="w-28 h-28" />
                  </div>
                )}
                <div className="absolute top-3 left-3 px-3.5 py-1 rounded-xl bg-slate-950/90 text-amber-400 font-mono font-black text-sm border border-amber-500/50 shadow">
                  {formatAcademicCategory(currentLot.bucket)}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs border border-slate-800">
                  {currentLot.program || 'B.Tech'}
                </span>
                <span className="px-3 py-1 rounded-xl bg-blue-950 text-cyan-300 font-mono text-xs border border-blue-800">
                  {currentLot.branch || 'General'}
                </span>
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs border border-amber-500/40">
                  Session {currentLot.auction_session || activeSession}
                </span>
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col gap-4">
              <div>
                <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  Roll: {currentLot.roll_number} • {currentLot.branch}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-none drop-shadow-md">
                    {currentLot.player_name}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-xl bg-blue-600/30 text-cyan-300 border border-blue-500/40 font-bold text-xs uppercase">
                    {currentLot.player_type || 'All-Rounder'}
                  </span>
                  {currentLot.batting_style && (
                    <span className="px-3 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 font-mono text-xs">
                      Bat: {currentLot.batting_style}
                    </span>
                  )}
                  {currentLot.bowling_style && (
                    <span className="px-3 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 font-mono text-xs">
                      Bowl: {currentLot.bowling_style}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border-2 border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-mono font-bold text-slate-400 tracking-wider">
                      Authoritative Timer
                    </span>
                    {isPaused && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-mono font-black uppercase animate-pulse">
                        FROZEN
                      </span>
                    )}
                  </div>
                  <div className="my-1.5">
                    <CountdownTimer
                      deadlineMs={currentLot.deadline_ms}
                      serverTime={serverTime}
                      isPaused={isPaused}
                      pausedSeconds={pausedRemainingMs ? Math.ceil(pausedRemainingMs / 1000) : undefined}
                      size="lg"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    30s Opening • 20s Subsequent • Server Authoritative
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border-2 border-amber-500/60 flex flex-col justify-between shadow-2xl">
                  <span className="text-[11px] uppercase font-mono font-bold text-amber-400 tracking-wider">
                    Current Highest Bid
                  </span>
                  <div className="font-display text-4xl sm:text-5xl font-black text-amber-400 my-0.5">
                    {currentLot.current_price} <span className="text-lg text-amber-300">Pts (₹)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Opening Base: {currentLot.opening_price} Pts
                  </span>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-2 border-amber-500/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                    Current Leading Franchise
                  </span>
                  <div className="font-heading text-2xl sm:text-3xl font-black text-white mt-0.5">
                    {currentLot.highest_bidder_name || 'Awaiting Opening Bid'}
                  </div>
                </div>
                <Award className="w-10 h-10 text-amber-400 shrink-0" />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="font-heading text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Verified Cricket Statistics & Career Records
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    Live Dossier
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center font-mono">
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">Matches</span>
                    <strong className="text-white text-sm">{lotStats?.matches ?? 0}</strong>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">Runs</span>
                    <strong className="text-amber-300 text-sm">{lotStats?.runs ?? 0}</strong>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">Top Score</span>
                    <strong className="text-emerald-300 text-sm">{lotStats?.highestScore || '-'}</strong>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">Bat Avg</span>
                    <strong className="text-slate-200 text-sm">{lotStats?.battingAverage || '0.0'}</strong>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">Strike Rate</span>
                    <strong className="text-cyan-300 text-sm">{lotStats?.strikeRate || '0.0'}</strong>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">Wickets</span>
                    <strong className="text-cyan-400 text-sm">{lotStats?.wickets ?? 0}</strong>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">Economy</span>
                    <strong className="text-purple-300 text-sm">{lotStats?.economy || '0.0'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center flex flex-col items-center justify-center max-w-2xl mx-auto">
            <div className="w-24 h-24 rounded-3xl bg-slate-900 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-2xl">
              <Gavel className="w-12 h-12" />
            </div>
            <h2 className="font-heading text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
              Auction Floor Standby
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-lg leading-relaxed">
              Session {activeSession} is active. Admin and VIP Guests can select and draw the next candidate directly from this screen using the buttons below!
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full">
              <button
                type="button"
                onClick={() => setShowGuestDrawModal(true)}
                className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-2xl shadow-purple-950/60 transition cursor-pointer border border-purple-400/60 transform hover:scale-[1.02]"
              >
                <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
                <span>GUEST LUCKY DRAW (MASKED)</span>
              </button>

              <button
                type="button"
                disabled={drawingAuto}
                onClick={handleDrawNextAuto}
                className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-2xl shadow-amber-950/50 transition cursor-pointer disabled:opacity-50 transform hover:scale-[1.02]"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{drawingAuto ? 'Drawing Lot...' : 'DRAW NEXT LOT (BUCKET ORDER)'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {currentLot && (
        <div className="w-full bg-slate-950/95 border-t-2 border-purple-500/80 p-3 sm:p-4 z-40 shadow-2xl backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 font-mono">
              <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400 flex items-center justify-center text-purple-300 shrink-0">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <span className="text-white font-bold text-xs uppercase block font-heading tracking-wide flex items-center gap-2">
                  <span>STAGE AUCTIONEER & GUEST CONTROLS</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold">
                    ONLINE
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Lot: <strong className="text-amber-300">{currentLot.player_name}</strong> • Current Bid: <strong className="text-amber-400 font-mono">₹{currentLot.current_price}</strong> by <strong className="text-cyan-300">{currentLot.highest_bidder_name || 'No Bidder Yet'}</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowAdminAuthModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Unlock Hammer</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAdminUnlocked(false);
                    localStorage.removeItem('acc_projector_admin');
                    setHammerFeedback('Stage hammer locked. Guest mode active.');
                    setTimeout(() => setHammerFeedback(null), 3000);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                  title="Lock hammer controls to Guest Mode"
                >
                  <Unlock className="w-3 h-3 text-emerald-400" />
                  <span>Admin Authority Active</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleStageCall(1)}
                className={`px-3 py-2 rounded-xl font-mono font-bold text-xs transition cursor-pointer border ${
                  hammerStage === 1
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                1️⃣ Going Once
              </button>

              <button
                type="button"
                onClick={() => handleStageCall(2)}
                className={`px-3 py-2 rounded-xl font-mono font-bold text-xs transition cursor-pointer border ${
                  hammerStage === 2
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                2️⃣ Going Twice
              </button>

              <button
                type="button"
                disabled={hammering}
                onClick={() => {
                  if (!isAdmin) {
                    setShowAdminAuthModal(true);
                    return;
                  }
                  if (!currentLot.highest_bidder_id) {
                    handleHammerStrike('PLAYER_UNSOLD', 3);
                  } else {
                    handleHammerStrike('HAMMER_SALE', 3);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xl transition cursor-pointer disabled:opacity-40 animate-pulse border border-yellow-200"
              >
                <Gavel className="w-4 h-4 fill-current" />
                <span>
                  {hammering
                    ? 'Striking...'
                    : currentLot.highest_bidder_id
                    ? '🔨 HIT HAMMER (SOLD!)'
                    : '🔨 HIT HAMMER (UNSOLD)'}
                </span>
              </button>

              <button
                type="button"
                disabled={hammering}
                onClick={() => handleHammerStrike('PLAYER_UNSOLD', 3)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-rose-300 border border-rose-900 hover:border-rose-700 font-bold text-xs uppercase transition cursor-pointer disabled:opacity-40"
              >
                Mark Unsold
              </button>

              <button
                type="button"
                onClick={() => adjustTimer(10)}
                className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-mono font-bold cursor-pointer"
                title="Add 10 seconds to auction countdown"
              >
                +10s
              </button>

              <button
                type="button"
                onClick={() => setShowGuestDrawModal(true)}
                className="px-3 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-300 border border-purple-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Guest Draw Mode"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Guest Draw</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-slate-950 border-t border-slate-800 px-6 sm:px-8 py-2.5 flex items-center gap-6 overflow-x-auto no-scrollbar font-mono text-xs">
        <span className="text-amber-400 font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" /> Franchise Purses:
        </span>
        {franchises.map((f) => (
          <div key={f.id} className="flex items-center gap-1.5 shrink-0 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
            <span className="font-bold text-white">{f.name}:</span>
            <span className="text-amber-400 font-black">{f.purse} Pts</span>
          </div>
        ))}
      </div>

      {showGuestDrawModal && (
        <GuestDrawModal
          isOpen={showGuestDrawModal}
          onClose={() => setShowGuestDrawModal(false)}
          onPlayerSelected={(lot) => {
            setShowGuestDrawModal(false);
            setHammerFeedback(`🎉 Player drawn successfully onto stage! Lot: ${lot?.player_name || lot?.id}`);
            setTimeout(() => setHammerFeedback(null), 4000);
          }}
        />
      )}

      {showAdminAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-black text-white uppercase tracking-tight">
                  Admin Auctioneer Access
                </h3>
                <span className="text-xs text-amber-400 font-mono">
                  Hammer strikes are restricted to Stage Admins only
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Guests can view the screen and draw cards, but striking the hammer and concluding auction lots requires Admin Auctioneer authorization.
            </p>

            <form onSubmit={handleAdminVerify} className="flex flex-col gap-4">
              <div>
                <label className="block text-slate-300 text-xs font-bold mb-1.5 font-mono">
                  Enter Admin Passcode / PIN:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    placeholder="Enter admin passcode"
                    autoFocus
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase cursor-pointer transition shadow"
                  >
                    Unlock
                  </button>
                </div>
                {authError && (
                  <span className="text-xs text-rose-400 mt-1.5 block font-bold">
                    {authError}
                  </span>
                )}
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Hint: Default admin passcode is <code>admin</code> or <code>admin123</code>.
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminAuthModal(false);
                    setAdminPasscode('');
                    setAuthError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
