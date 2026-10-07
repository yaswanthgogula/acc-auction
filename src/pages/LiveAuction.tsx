/**
 * ============================================================================
 * ACC LIVE AUCTION ARENA & THEATRE
 * ============================================================================
 */

import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { GuestDrawModal } from '../components/GuestDrawModal';
import { formatAcademicCategory } from '../utils/academicCategories';
import {
  Gavel,
  Radio,
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  Play,
  Maximize2,
  Sparkles,
  Clock,
  Activity,
} from 'lucide-react';

export interface LiveAuctionProps {
  onNavigate: (route: string) => void;
  onOpenLogin: (type?: 'PLAYER' | 'FRANCHISE' | 'ADMIN') => void;
}

export const LiveAuction: React.FC<LiveAuctionProps> = ({
  onNavigate,
  onOpenLogin,
}) => {
  const { user } = useAuth();
  const {
    currentLot,
    franchises,
    recentBids,
    serverTime,
    placeBid,
    passLot,
    strikeHammer,
    drawNextPlayer,
    adjustTimer,
    resetTimer,
    autoTransitionCountdown,
    activeSession,
    sessionState,
    isPaused,
    pausedRemainingMs,
  } = useAuction();

  const [bidding, setBidding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGuestDrawModal, setShowGuestDrawModal] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'OPERATOR';
  const isFranchise = user?.role === 'FRANCHISE';
  const myFranchise = isFranchise ? franchises.find((f) => f.id === user?.franchiseId) : null;

  const handleFranchiseBid = async () => {
    if (!myFranchise) return;
    setErrorMsg(null);
    setBidding(true);
    try {
      const res = await placeBid(myFranchise.id);
      if (!res.success) {
        setErrorMsg(res.error || 'Bid rejected.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBidding(false);
    }
  };

  const hasBidder = Boolean(currentLot?.highest_bidder_id) && (currentLot?.bid_count ?? 0) > 0;
  const currentPrice = currentLot?.current_price ?? currentLot?.base_price ?? 20;
  const nextIncrement = currentPrice < 100 ? 10 : currentPrice < 200 ? 20 : 30;
  const nextLegalBid = currentLot
    ? (hasBidder ? currentPrice + nextIncrement : currentPrice)
    : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
            <Radio className="w-6 h-6 animate-pulse text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                Live Auction Arena
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider animate-pulse">
                LIVE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-cyan-300 font-mono text-[10px] font-bold border border-blue-800">
                Session {activeSession}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Avanthi Cricket Carnival • Fixed Bucket Order: 3rd → 4th → 2nd → Diploma → PG → 1st
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowGuestDrawModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Guest Draw (Masked)</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('/projector')}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow"
          >
            <Maximize2 className="w-4 h-4 text-sky-400" />
            Projector Screen
          </button>
        </div>
      </div>

      {autoTransitionCountdown !== null && autoTransitionCountdown > 0 && (
        <div className="p-4 rounded-2xl bg-cyan-950/80 border-2 border-cyan-400 text-cyan-200 flex items-center justify-between font-mono text-xs shadow-xl animate-pulse">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 animate-spin text-cyan-400" />
            <span>10-Second Automatic Transition Active: Proceeding to next eligible player...</span>
          </div>
          <span className="font-display font-black text-base text-amber-300">
            00:0{autoTransitionCountdown}s
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} className="font-bold underline text-xs">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-5">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 text-xs font-bold font-mono">
                  {currentLot ? formatAcademicCategory(currentLot.bucket) : 'LOT STANDBY'}
                </span>
                <span className="text-xs text-slate-400">
                  {currentLot ? currentLot.player_type || 'Player' : 'Waiting for Auctioneer Draw'}
                </span>
              </div>

              <div className="flex items-center justify-center sm:justify-end">
                <CountdownTimer
                  deadlineMs={currentLot?.deadline_ms || null}
                  serverTime={serverTime}
                  isPaused={isPaused}
                  pausedSeconds={pausedRemainingMs ? Math.ceil(pausedRemainingMs / 1000) : undefined}
                  size="lg"
                  showControls={isAdmin}
                  onAdjustTimer={(sec) => adjustTimer(sec)}
                  onResetTimer={(sec) => resetTimer(sec)}
                />
              </div>
            </div>

            {currentLot ? (
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-500/40 shadow-xl shrink-0">
                  {currentLot.photo_url ? (
                    <img src={currentLot.photo_url} alt="Player" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Users className="w-16 h-16" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/90 text-xs font-mono font-bold text-amber-400 border border-amber-500/30">
                    {formatAcademicCategory(currentLot.bucket)}
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-3 text-center md:text-left">
                  <div>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <h2 className="font-heading text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                        {currentLot.player_name}
                      </h2>
                      {currentLot.draw_mode === 'GUEST' && (
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono font-bold">
                          GUEST DRAW
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-cyan-400 font-mono mt-1">
                      <span>{currentLot.roll_number}</span>
                      <span>•</span>
                      <span>{currentLot.branch}</span>
                      <span>•</span>
                      <span>{currentLot.program}</span>
                      <span>•</span>
                      <span>Session {currentLot.player_auction_session || activeSession}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-600/30 text-cyan-300 border border-blue-500/40">
                        {currentLot.player_type || 'All-Rounder'}
                      </span>
                      {currentLot.batting_style && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-xs font-mono">
                          {currentLot.batting_style}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 mt-2">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Opening Base</div>
                      <div className="font-mono text-xl font-bold text-slate-200">
                        {currentLot.opening_price} Pts (₹)
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center justify-center md:justify-start gap-1">
                        <TrendingUp className="w-3 h-3" /> Current Bid
                      </div>
                      <div className="font-display text-3xl font-black text-amber-400">
                        {currentLot.current_price} Pts (₹)
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Leading Bidder:</span>
                    <span className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
                      <Award className="w-4 h-4 text-amber-400" />
                      {currentLot.highest_bidder_name || 'No Bids Submitted Yet'}
                    </span>
                  </div>

                  {(() => {
                    let s = currentLot.stats;
                    if (!s && currentLot.stats_json) {
                      try {
                        s = typeof currentLot.stats_json === 'string' ? JSON.parse(currentLot.stats_json) : currentLot.stats_json;
                      } catch {}
                    }
                    const stats = s || {};

                    return (
                      <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col gap-2 mt-1">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 text-xs">
                          <span className="font-heading font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                            <Activity className="w-3.5 h-3.5 text-emerald-400" />
                            Official Cricket Statistics (Visible to Everyone)
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                            Verified Dossier
                          </span>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center font-mono">
                          <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">Matches</span>
                            <strong className="text-white text-xs">{stats.matches ?? 0}</strong>
                          </div>
                          <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">Runs</span>
                            <strong className="text-amber-300 text-xs">{stats.runs ?? 0}</strong>
                          </div>
                          <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">Highest</span>
                            <strong className="text-emerald-300 text-xs">{stats.highestScore || '-'}</strong>
                          </div>
                          <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">Bat Avg</span>
                            <strong className="text-slate-200 text-xs">{stats.battingAverage || '0.0'}</strong>
                          </div>
                          <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">Strike Rate</span>
                            <strong className="text-cyan-300 text-xs">{stats.strikeRate || '0.0'}</strong>
                          </div>
                          <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">Wickets</span>
                            <strong className="text-cyan-400 text-xs">{stats.wickets ?? 0}</strong>
                          </div>
                          <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">Economy</span>
                            <strong className="text-purple-300 text-xs">{stats.economy || '0.0'}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
                  <Gavel className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Floor Ready For Next Lot</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {isAdmin
                    ? 'Draw next player in fixed bucket order (3rd → 4th → 2nd → Diploma → PG → 1st) or launch Guest Draw.'
                    : 'The auctioneer is preparing the next player for the floor.'}
                </p>
                {isAdmin && (
                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
                    <button
                      onClick={() => drawNextPlayer('AUTO')}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Draw Fixed Order
                    </button>
                    <button
                      onClick={() => setShowGuestDrawModal(true)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Sparkles className="w-4 h-4" />
                      Guest Draw (Masked)
                    </button>
                  </div>
                )}
              </div>
            )}

            {isFranchise && myFranchise && currentLot && (
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 font-black">
                    {myFranchise.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{myFranchise.name} Console</div>
                    <div className="text-[11px] text-amber-400 font-mono">
                      Purse: {myFranchise.purse} Pts (₹) • Max Bid: {myFranchise.maxBid || 0} Pts
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => passLot(myFranchise.id)}
                    className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition cursor-pointer"
                  >
                    Pass
                  </button>
                  <button
                    disabled={!myFranchise.bidAllowed || bidding || currentLot.highest_bidder_id === myFranchise.id}
                    onClick={handleFranchiseBid}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-950/50"
                  >
                    {currentLot.highest_bidder_id === myFranchise.id ? 'You are Leading' : `Bid ${nextLegalBid} Pts (₹)`}
                  </button>
                </div>
              </div>
            )}

            {isAdmin && currentLot && (
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <Gavel className="w-4 h-4" /> Admin Action Desk
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => strikeHammer()}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
                  >
                    Hammer Strike (SOLD / UNSOLD)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl flex flex-col gap-3">
            <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Live Bid Activity Log
            </h3>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 text-xs font-mono">
              {recentBids.map((b, i) => (
                <div key={b.id || i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-bold text-white font-sans">{b.franchise_name || b.franchiseName}</span>
                  </div>
                  <div className="text-amber-400 font-bold">{b.amount} Pts (₹)</div>
                </div>
              ))}
              {recentBids.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-6">
                  No bids recorded for this lot yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                11 Franchises Standings
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">1,000 Pts Cap</span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[580px] overflow-y-auto pr-1 text-xs">
              {franchises.map((f) => {
                const isLeadingThisLot = currentLot && currentLot.highest_bidder_id === f.id;
                return (
                  <div
                    key={f.id}
                    className={`p-3 rounded-xl border transition ${
                      isLeadingThisLot ? 'bg-amber-950/40 border-amber-500' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-white truncate max-w-[160px]">{f.name}</div>
                      <div className="font-mono font-black text-amber-400">{f.purse} Pts (₹)</div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Squad: {f.squadCount || 0}/22</span>
                      <span className={f.bidAllowed ? 'text-emerald-400' : 'text-red-400'}>
                        {f.bidAllowed ? 'Eligible' : 'Blocked'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <GuestDrawModal
        isOpen={showGuestDrawModal}
        onClose={() => setShowGuestDrawModal(false)}
        onPlayerSelected={() => {}}
      />
    </div>
  );
};
