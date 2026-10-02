/**
 * ============================================================================
 * ACC PROJECTOR VIEW — AUDITORIUM GIGANTIC STAGE
 * ============================================================================
 */

import React from 'react';
import { useAuction } from '../context/AuctionContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { AvanthiLogo } from '../components/AvanthiLogo';
import { AuctionNotificationBanner } from '../components/AuctionNotificationBanner';
import { formatAcademicCategory } from '../utils/academicCategories';
import { Users, Award, Radio, Sparkles } from 'lucide-react';

export const ProjectorView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { currentLot, franchises, serverTime } = useAuction();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col select-none overflow-hidden">
      <AuctionNotificationBanner />

      <div className="flex-1 flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <AvanthiLogo size="lg" showText={true} />
            <div className="hidden md:flex flex-col ml-4">
              <span className="font-heading text-2xl font-black text-white uppercase tracking-wider">
                Avanthi Cricket Carnival
              </span>
              <span className="text-xs text-amber-400 font-mono tracking-widest uppercase">
                Official Player Auction • Live Stage
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/30 border border-red-500/50 text-red-400 font-black text-xs uppercase tracking-wider animate-pulse">
              <Radio className="w-3.5 h-3.5" /> LIVE ON BLOCK
            </div>
            <button
              onClick={onExit}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Exit Projector Mode
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
          <div className="lg:col-span-8 flex flex-col md:flex-row gap-8 items-center h-full justify-center">
            {currentLot ? (
              <>
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl overflow-hidden border-4 border-amber-500/60 shadow-[0_0_50px_rgba(245,158,11,0.3)] bg-slate-900 shrink-0">
                  {currentLot.photo_url ? (
                    <img src={currentLot.photo_url} alt="Player" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <Users className="w-24 h-24" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-slate-950/90 text-amber-400 font-mono font-black text-sm border border-amber-500/50">
                    {formatAcademicCategory(currentLot.bucket)}
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-4 text-center md:text-left">
                  <div className="inline-block">
                    <span className="text-sm font-mono text-cyan-400 font-bold uppercase tracking-wider">
                      {currentLot.roll_number} • {currentLot.branch} ({currentLot.program})
                    </span>
                    <div className="flex items-center justify-center md:justify-start gap-3 mt-1">
                      <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black text-white uppercase tracking-tight leading-none">
                        {currentLot.player_name}
                      </h1>
                      {currentLot.draw_mode === 'GUEST' && (
                        <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> GUEST DRAW
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                      <span className="px-3 py-1 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-800 text-xs font-bold uppercase tracking-wider">
                        {currentLot.player_type || 'All-Rounder'}
                      </span>
                      {currentLot.batting_style && (
                        <span className="px-3 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-xs font-mono">
                          {currentLot.batting_style}
                        </span>
                      )}
                      {currentLot.bowling_style && currentLot.bowling_style !== 'None' && currentLot.bowling_style !== 'NONE' && (
                        <span className="px-3 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-xs font-mono">
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
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-2.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-center font-mono mt-3">
                          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                            <div className="text-[10px] uppercase font-sans text-slate-400 font-bold">Matches</div>
                            <div className="text-base font-black text-white">{stats.matches ?? stats.matchesPlayed ?? '-'}</div>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                            <div className="text-[10px] uppercase font-sans text-amber-400 font-bold">Runs</div>
                            <div className="text-base font-black text-amber-300">{stats.runs ?? '-'}</div>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                            <div className="text-[10px] uppercase font-sans text-rose-400 font-bold">Wickets</div>
                            <div className="text-base font-black text-rose-300">{stats.wickets ?? '-'}</div>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                            <div className="text-[10px] uppercase font-sans text-cyan-400 font-bold">Bat Avg</div>
                            <div className="text-sm font-black text-cyan-300">{stats.battingAvg ?? stats.batting_avg ?? stats.battingAverage ?? '-'}</div>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                            <div className="text-[10px] uppercase font-sans text-purple-400 font-bold">Economy</div>
                            <div className="text-sm font-black text-purple-300">{stats.economy ?? '-'}</div>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                            <div className="text-[10px] uppercase font-sans text-emerald-400 font-bold">Top Score</div>
                            <div className="text-sm font-black text-emerald-300">{stats.highestScore ?? stats.topScore ?? '-'}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
                    <div>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-mono">
                        Opening Base
                      </span>
                      <span className="font-mono text-2xl font-bold text-slate-300">
                        {currentLot.opening_price} Pts (₹)
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1 font-mono">
                        Highest Bid
                      </span>
                      <span className="font-display text-4xl sm:text-5xl font-black text-amber-400">
                        {currentLot.current_price} Pts (₹)
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 to-slate-900 border border-amber-500/50 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                        Winning Franchise
                      </span>
                      <div className="font-heading text-2xl sm:text-3xl font-black text-white">
                        {currentLot.highest_bidder_name || 'Awaiting Opening Bid'}
                      </div>
                    </div>
                    <Award className="w-10 h-10 text-amber-400 shrink-0" />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <Users className="w-20 h-20 text-slate-700 mx-auto mb-4" />
                <h2 className="font-heading text-3xl font-bold text-slate-300">Floor Standby</h2>
                <p className="text-slate-500 text-sm mt-1">
                  The auctioneer will call the next candidate shortly.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-900/90 border-2 border-slate-800 shadow-2xl h-full">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 font-mono">
              Authoritative Auction Timer
            </span>

            <CountdownTimer
              deadlineMs={currentLot?.deadline_ms || null}
              serverTime={serverTime}
              size="xl"
            />

            <div className="mt-8 text-center text-xs text-slate-400 font-mono">
              30s Opening • 20s Subsequent Raise
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3 flex items-center gap-6 overflow-x-auto no-scrollbar font-mono text-xs text-slate-400">
          <span className="font-bold text-amber-400 shrink-0 uppercase tracking-wider">
            Franchise Purses:
          </span>
          {franchises.map((f) => (
            <div key={f.id} className="flex items-center gap-1.5 shrink-0">
              <span className="font-semibold text-white">{f.name}:</span>
              <span className="text-amber-400 font-bold">{f.purse} Pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
