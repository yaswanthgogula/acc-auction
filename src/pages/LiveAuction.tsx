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
} from 'lucide-react';

interface LiveAuctionProps {
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
            </div>
            <p className="text-xs text-slate-400">
              Avanthi Cricket Carnival • Real-Time Authoritative Bidding & Countdown Clock
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
              <span>Guest Draw Mode</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('/projector')}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Maximize2 className="w-4 h-4 text-sky-400" />
            Projector Screen
          </button>
        </div>
      </div>

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
                    #{currentLot.lot_number || 1}
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
                    </div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                        currentLot.player_type?.toUpperCase().includes('BAT') && !currentLot.player_type?.toUpperCase().includes('ALL')
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : currentLot.player_type?.toUpperCase().includes('BOWL') && !currentLot.player_type?.toUpperCase().includes('ALL')
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : currentLot.player_type?.toUpperCase().includes('WICKET') || currentLot.player_type?.toUpperCase().includes('KEEPER')
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {currentLot.player_type || 'All-Rounder'}
                      </span>
                      {currentLot.batting_style && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-xs font-mono">
                          {currentLot.batting_style}
                        </span>
                      )}
                      {currentLot.bowling_style && currentLot.bowling_style !== 'None' && currentLot.bowling_style !== 'NONE' && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-xs font-mono">
                          {currentLot.bowling_style}
                        </span>
                      )}
                    </div>

                    {(() => {
                      let stats: any = {};
                      try {
                        if (typeof (currentLot as any).stats_json === 'string') {
                          stats = JSON.parse((currentLot as any).stats_json);
                        } else if ((currentLot as any).stats) {
                          stats = (currentLot as any).stats;
                        }
                      } catch {}
                      return (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-center font-mono mt-2">
                          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                            <div className="text-[9px] uppercase font-sans text-slate-400 font-bold">Matches</div>
                            <div className="text-sm font-black text-white">{stats.matches ?? stats.matchesPlayed ?? '-'}</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                            <div className="text-[9px] uppercase font-sans text-amber-400 font-bold">Runs</div>
                            <div className="text-sm font-black text-amber-300">{stats.runs ?? '-'}</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                            <div className="text-[9px] uppercase font-sans text-rose-400 font-bold">Wickets</div>
                            <div className="text-sm font-black text-rose-300">{stats.wickets ?? '-'}</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                            <div className="text-[9px] uppercase font-sans text-cyan-400 font-bold">Bat Avg</div>
                            <div className="text-sm font-black text-cyan-300">{stats.battingAvg ?? stats.batting_avg ?? stats.battingAverage ?? '-'}</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                            <div className="text-[9px] uppercase font-sans text-purple-400 font-bold">Economy</div>
                            <div className="text-sm font-black text-purple-300">{stats.economy ?? '-'}</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                            <div className="text-[9px] uppercase font-sans text-emerald-400 font-bold">Top Score</div>
                            <div className="text-sm font-black text-emerald-300">{stats.highestScore ?? stats.topScore ?? '-'}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 mt-2">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Opening Base</div>
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
                    ? 'Use either Random Draw Mode (Auto) or Guest Draw Mode to call the next candidate.'
                    : 'The auctioneer is preparing the next player for the floor.'}
                </p>
                {isAdmin && (
                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
                    <button
                      onClick={() => drawNextPlayer('AUTO')}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Random Draw Mode (Auto)
                    </button>
                    <button
                      onClick={() => setShowGuestDrawModal(true)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Sparkles className="w-4 h-4" />
                      Guest Draw Mode
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

          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl flex flex-col gap-3">
            <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Live Bid Activity Log
            </h3>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 text-xs">
              {recentBids.map((b, i) => (
                <div
                  key={b.id || i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-bold text-white font-sans">{b.franchise_name || b.franchiseName}</span>
                    <span className="text-slate-500 text-[10px]">bid</span>
                  </div>
                  <div className="text-amber-400 font-bold">
                    {b.amount} Pts (₹)
                  </div>
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
                      isLeadingThisLot
                        ? 'bg-amber-950/40 border-amber-500'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-white truncate max-w-[160px]">
                        {f.name}
                      </div>
                      <div className="font-mono font-black text-amber-400">
                        {f.purse} Pts (₹)
                      </div>
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
              {franchises.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-8">
                  No franchises loaded.
                </div>
              )}
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
