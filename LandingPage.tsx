/**
 * ============================================================================
 * ACC PLAYER AUCTION PORTAL — OFFICIAL HOME PAGE
 * ============================================================================
 * Clean professional UI with live ticker, war chests, player pool, and direct access.
 * Google login removed as per Requirement 4.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Gavel,
  User,
  Users,
  Crown,
  ArrowRight,
  Radio,
  Trophy,
  Coins,
  Sparkles,
  Search,
  Filter,
  Clock,
  TrendingUp,
  Award,
  Zap,
  Monitor,
  Volume2,
  VolumeX,
  AlertTriangle,
  ExternalLink,
  Activity,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../context/AuctionContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { CricketBatsmanHero } from '../components/CricketBatsmanHero';
import { formatAcademicCategory } from '../utils/academicCategories';

interface LandingPageProps {
  onNavigate: (route: string) => void;
  onOpenLogin: (type?: 'PLAYER' | 'FRANCHISE' | 'ADMIN') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onOpenLogin,
}) => {
  const { user } = useAuth();
  const {
    viewerCount,
    currentLot,
    franchises: auctionFranchises,
    recentBids,
    serverTime,
    placeBid,
    soundEnabled,
    toggleSound,
    lastSaleEvent,
    players: auctionPlayers,
    fetchPlayers,
    activeSession,
  } = useAuction();

  const [players, setPlayers] = useState<any[]>(auctionPlayers || []);
  const franchises = auctionFranchises || [];
  const [activeRole, setActiveRole] = useState<string>('ALL');
  const [activeBucket, setActiveBucket] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [biddingSubmitting, setBiddingSubmitting] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [dismissSaleAlert, setDismissSaleAlert] = useState(false);

  useEffect(() => {
    if (auctionPlayers && auctionPlayers.length > 0) {
      setPlayers(auctionPlayers);
    } else {
      fetchPlayers().then((pList) => {
        if (pList && pList.length > 0) setPlayers(pList);
      });
    }
  }, [auctionPlayers, fetchPlayers]);

  const isAuctionLive = Boolean(currentLot);
  const activeLot = currentLot;

  const hasBidder = Boolean(activeLot?.highest_bidder_id) && (activeLot?.bid_count ?? 0) > 0;
  const currentPrice = activeLot?.current_price ?? activeLot?.base_price ?? 20;
  const nextIncrement = currentPrice < 100 ? 10 : currentPrice < 200 ? 20 : 30;
  const nextBidAmount = hasBidder ? currentPrice + nextIncrement : currentPrice;

  const isFranchiseUser = user?.role === 'FRANCHISE' && user?.franchiseId;
  const myFranchise = franchises.find((f) => f.id === user?.franchiseId);
  const isLeadingBidder = myFranchise && activeLot?.highest_bidder_id === myFranchise.id;

  const handleQuickBid = async () => {
    if (!myFranchise || !isFranchiseUser) {
      onOpenLogin('FRANCHISE');
      return;
    }
    setBidError(null);
    setBiddingSubmitting(true);
    try {
      const res = await placeBid(myFranchise.id);
      if (!res.success) {
        setBidError(res.error || 'Failed to place bid');
      }
    } catch (err: any) {
      setBidError(err.message || 'Bid rejected');
    } finally {
      setBiddingSubmitting(false);
    }
  };

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const skillText = `${p.player_type || ''} ${p.skill || ''}`.toUpperCase();
      let matchesRole = true;
      if (activeRole === 'BATTER') matchesRole = skillText.includes('BATTER') || skillText.includes('BAT');
      else if (activeRole === 'BOWLER') matchesRole = skillText.includes('BOWL');
      else if (activeRole === 'ALLROUNDER') matchesRole = skillText.includes('ALL');
      else if (activeRole === 'KEEPER') matchesRole = skillText.includes('WICKET') || skillText.includes('KEEPER');

      const matchesBucket = activeBucket === 'ALL' || p.bucket === activeBucket;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        (p.roll_number && p.roll_number.toLowerCase().includes(q)) ||
        (p.branch && p.branch.toLowerCase().includes(q));

      return matchesRole && matchesBucket && matchesSearch;
    });
  }, [players, activeRole, activeBucket, searchQuery]);

  return (
    <div className="w-full flex flex-col bg-[#050914] text-slate-100 min-h-[calc(100vh-5rem)] overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200 font-sans">
      {/* 1. TOP LIVE BROADCAST TICKER RIBBON */}
      <div className="w-full bg-[#080e22]/95 border-b border-blue-950/80 px-4 sm:px-8 py-2 flex items-center justify-between text-xs z-30 backdrop-blur-md">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar font-medium">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] tracking-wider uppercase shrink-0 shadow animate-pulse">
            <Radio className="w-3 h-3" /> LIVE ACC BROADCAST
          </span>
          <span className="text-slate-300 font-mono text-[11px] truncate">
            AVANTHI CRICKET CARNIVAL 2026 · SESSION {activeSession} · 11 FRANCHISES · FIXED BUCKET ORDER: 3RD → 4TH → 2ND → DIPLOMA → PG → 1ST
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[11px] font-semibold">
          <span className="flex items-center gap-1.5 text-sky-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono font-bold tabular-nums">{viewerCount}</span> Spectator{viewerCount === 1 ? '' : 's'}
          </span>

          <button
            onClick={toggleSound}
            className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'Audio ON' : 'Muted'}</span>
          </button>

          <button
            onClick={() => onNavigate('/live')}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-bold transition cursor-pointer"
          >
            <Gavel className="w-3.5 h-3.5 text-amber-400" />
            <span>Enter Live Arena</span>
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME SOLD NOTIFICATION BANNER */}
      {lastSaleEvent && !dismissSaleAlert && (
        <div className="w-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-950 font-bold px-4 py-2.5 flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full text-xs sm:text-sm">
            <Gavel className="w-5 h-5 shrink-0 stroke-[2.5]" />
            <span className="uppercase tracking-wider font-heading font-black">
              HAMMER HAS FALLEN!
            </span>
            <span className="font-mono text-xs sm:text-sm">
              {lastSaleEvent.playerName || 'Player'} SOLD to{' '}
              <span className="underline font-black">{lastSaleEvent.winningFranchiseName || 'Franchise'}</span> for{' '}
              <span className="bg-slate-950 text-amber-400 px-2 py-0.5 rounded font-black">
                {lastSaleEvent.finalPrice ?? 20} Pts (₹)
              </span>
            </span>
          </div>
          <button
            onClick={() => setDismissSaleAlert(true)}
            className="text-slate-950 hover:text-white text-xs font-black px-2 py-1 bg-slate-950/20 hover:bg-slate-950/40 rounded transition cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. HERO SECTION */}
      <section className="relative w-full overflow-hidden pt-8 sm:pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-blue-950/80 bg-gradient-to-b from-[#050914] via-[#091129] to-[#050914]">
        <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-10 right-10 w-[500px] h-[350px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="absolute right-[28%] bottom-0 w-[420px] h-[520px] opacity-15 hidden xl:block pointer-events-none">
          <CricketBatsmanHero className="w-full h-full" />
        </div>

        <div className="relative z-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* LEFT HERO CONTENT */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0a1330]/90 border border-blue-400/40 shadow-sm backdrop-blur-md mb-3">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] text-cyan-200 font-display">
                  AVANTHI INSTITUTE OF ENGINEERING & TECHNOLOGY
                </span>
              </div>

              <div className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-sky-400 mb-2 flex items-center gap-2">
                <span>DREAM</span>
                <span className="text-blue-500">|</span>
                <span>BID</span>
                <span className="text-blue-500">|</span>
                <span>BUILD YOUR TEAM</span>
              </div>

              <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight uppercase font-heading leading-none text-white drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)]">
                ACC
              </h1>

              <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase font-heading leading-none text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-[0_12px_30px_rgba(234,179,8,0.5)] -mt-1 sm:-mt-3">
                PLAYER AUCTION
              </h2>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold text-amber-400 font-mono tracking-wide">
                <span>SEASON 2026</span>
                <span className="text-blue-500">•</span>
                <span>AUCTION SESSIONS 1 & 2</span>
                <span className="text-blue-500">•</span>
                <span>REAL-TIME BIDDING</span>
                <span className="text-blue-500">•</span>
                <span className="text-cyan-300">11 FRANCHISES</span>
              </div>

              <p className="mt-4 max-w-xl text-xs sm:text-sm font-medium text-slate-300 tracking-wide leading-relaxed">
                The official premier collegiate cricket auction portal. Real-time franchise bidding, strict bucket ordering (3rd → 4th → 2nd → Diploma → PG → 1st), detained year policy, and two controlled auction sessions.
              </p>

              {/* 3 HORIZONTAL STATISTIC CARDS */}
              <div className="mt-6 grid grid-cols-3 gap-3 w-full max-w-xl">
                <div className="p-3 rounded-2xl bg-[#0a122c]/85 border border-blue-500/30 flex flex-col justify-between backdrop-blur-md">
                  <div className="flex items-center justify-between text-blue-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL PLAYERS</span>
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-display tabular-nums">
                    {players.length > 0 ? players.length : '0'}
                  </div>
                  <div className="text-[10px] text-blue-300 font-mono">
                    Registered
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#0a122c]/85 border border-blue-500/30 flex flex-col justify-between backdrop-blur-md">
                  <div className="flex items-center justify-between text-amber-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FRANCHISES</span>
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400 font-display tabular-nums">
                    {franchises.length > 0 ? franchises.length : 11}
                  </div>
                  <div className="text-[10px] text-amber-300/80 font-mono">
                    11 Teams
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#0a122c]/85 border border-blue-500/30 flex flex-col justify-between backdrop-blur-md">
                  <div className="flex items-center justify-between text-cyan-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PURSE CAP</span>
                    <Coins className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-black text-cyan-300 font-display tabular-nums">
                    1,000
                  </div>
                  <div className="text-[10px] text-cyan-300/80 font-mono">
                    Points (₹)
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-lg">
                <button
                  onClick={() => onNavigate('/live')}
                  className="py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-400 text-slate-950 font-heading font-black text-lg sm:text-xl tracking-wider uppercase flex items-center justify-center gap-3 cursor-pointer flex-1 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition border border-yellow-300/40"
                >
                  <Gavel className="w-6 h-6 text-slate-950 stroke-[2.5]" />
                  <span>ENTER LIVE AUCTION</span>
                  <ArrowRight className="w-5 h-5 text-slate-950 stroke-[3]" />
                </button>

                <button
                  onClick={() => onNavigate('/projector')}
                  className="py-4 px-6 rounded-2xl bg-[#09122c]/85 hover:bg-blue-950/80 text-blue-200 hover:text-white border border-blue-500/50 font-bold text-sm flex items-center justify-center gap-2.5 transition cursor-pointer"
                  title="Auditorium Mega Screen Live Projector View"
                >
                  <Monitor className="w-5 h-5 text-cyan-400" />
                  <span className="whitespace-nowrap">PROJECTOR VIEW</span>
                </button>
              </div>

              {/* QUICK ACCESS BAR */}
              <div className="mt-4 grid grid-cols-3 gap-2.5 w-full max-w-lg">
                <button
                  onClick={() => onNavigate('/player/register')}
                  className="py-2.5 px-3 rounded-xl bg-[#081026]/90 hover:bg-[#0c183a] border border-blue-500/30 text-slate-200 hover:text-cyan-300 flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="whitespace-nowrap">REGISTER PLAYER</span>
                </button>

                <button
                  onClick={() => onOpenLogin('FRANCHISE')}
                  className="py-2.5 px-3 rounded-xl bg-[#081026]/90 hover:bg-[#0c183a] border border-amber-500/30 text-slate-200 hover:text-amber-300 flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap">FRANCHISE LOGIN</span>
                </button>

                <button
                  onClick={() => onOpenLogin('ADMIN')}
                  className="py-2.5 px-3 rounded-xl bg-[#081026]/90 hover:bg-[#0c183a] border border-purple-500/30 text-slate-200 hover:text-purple-300 flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="whitespace-nowrap">ADMIN PORTAL</span>
                </button>
              </div>
            </div>

            {/* RIGHT HERO PANEL: LIVE AUCTION PROGRESS */}
            <div className="lg:col-span-5 flex flex-col items-center relative">
              <div className="w-full max-w-md rounded-3xl bg-[#081129]/95 border-2 border-blue-500/40 p-6 backdrop-blur-2xl relative overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between border-b border-blue-900/60 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <span className="text-xs font-black tracking-wide text-white uppercase font-heading">
                      LIVE ARENA FLOOR
                    </span>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-cyan-300 border border-blue-400/30 font-mono uppercase">
                    Session {activeSession}
                  </span>
                </div>

                {isAuctionLive && activeLot ? (
                  <>
                    <div className="mb-4 p-3 rounded-2xl bg-[#050b1a] border border-blue-900/50 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" /> 30s Countdown Clock
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          Resets on counter-bid
                        </span>
                      </div>
                      <div>
                        <CountdownTimer
                          deadlineMs={activeLot.deadline_ms || null}
                          serverTime={serverTime}
                          size="md"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-20 h-20 rounded-2xl bg-[#09132e] border-2 border-amber-500/50 overflow-hidden flex items-center justify-center shrink-0 shadow-xl relative">
                        {activeLot.photo_url ? (
                          <img
                            src={activeLot.photo_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-10 h-10 text-slate-500" />
                        )}
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-950/90 text-[9px] font-bold text-amber-400 border border-amber-500/40">
                          {formatAcademicCategory(activeLot.bucket)}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xl font-black text-white font-display uppercase tracking-wide truncate">
                          {activeLot.player_name || activeLot.name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {activeLot.roll_number || 'Roll N/A'} · {activeLot.branch || 'Avanthi'}
                        </div>
                        <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                          <Zap className="w-3 h-3 text-cyan-400" />
                          <span>{activeLot.player_type || 'All-Rounder'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#050b1a] border border-blue-900/50 mb-4">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Opening Base
                        </div>
                        <div className="text-lg font-black text-slate-200 font-mono tabular-nums">
                          {activeLot.opening_price || 20} Pts
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Current Bid
                        </div>
                        <div className="text-2xl font-black text-amber-400 font-display tabular-nums">
                          {currentPrice} Pts (₹)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl bg-[#0b1638] border border-blue-900/60 mb-4">
                      <span className="text-slate-400 font-medium">Leading Franchise:</span>
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-400" />
                        {activeLot.highest_bidder_name || 'Opening Bid Awaited'}
                      </span>
                    </div>

                    {isFranchiseUser ? (
                      <div className="flex flex-col gap-2">
                        <button
                          disabled={biddingSubmitting || isLeadingBidder}
                          onClick={handleQuickBid}
                          className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                            isLeadingBidder
                              ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 cursor-not-allowed'
                              : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-950/50'
                          }`}
                        >
                          <Gavel className="w-4 h-4" />
                          <span>
                            {isLeadingBidder
                              ? 'YOU ARE LEADING THIS LOT'
                              : biddingSubmitting
                              ? 'SUBMITTING BID...'
                              : `RAISE PADDLE (+${nextIncrement} PTS) · ${nextBidAmount} PTS`}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onNavigate('/live')}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Gavel className="w-4 h-4" />
                        <span>ENTER LIVE AUCTION ROOM</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                      <Gavel className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-bold text-white font-heading uppercase">
                      AUCTION STANDBY
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
                      Session {activeSession} is configured. Fixed bucket order is ready. Open the live arena to begin.
                    </p>

                    <div className="mt-5 flex flex-col gap-2 w-full">
                      <button
                        onClick={() => onNavigate('/live')}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Gavel className="w-4 h-4" />
                        <span>Enter Live Floor Arena</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. MARQUEE BROADCAST RIBBON */}
      <div className="w-full bg-[#081026] border-y border-blue-950 py-2.5 overflow-hidden">
        <div className="flex items-center gap-8 whitespace-nowrap text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest animate-marquee">
          <span>⚡ OFFICIAL ACC 2026 LIVE AUCTION SYSTEM</span>
          <span>•</span>
          <span>SESSION 1 & SESSION 2 GOVERNANCE</span>
          <span>•</span>
          <span>FIXED BUCKET ORDER: 3RD → 4TH → 2ND → DIPLOMA → PG → 1ST</span>
          <span>•</span>
          <span>10-SECOND AUTOMATIC TRANSITION AFTER HAMMER STRIKE</span>
          <span>•</span>
          <span>11 FRANCHISES COMPETING</span>
        </div>
      </div>

      {/* 5. FRANCHISES STANDINGS */}
      <section className="w-full bg-[#060c1e] border-y border-blue-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase font-mono">
                <Coins className="w-3.5 h-3.5" /> Official Franchises
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white font-heading uppercase mt-1">
                Franchise War Chests & Purses
              </h3>
            </div>
            <div className="text-xs text-slate-400">
              Initial Purse: <span className="font-mono font-bold text-amber-400">1,000 Pts</span> · Session: <span className="font-mono font-bold text-cyan-300">Session {activeSession}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {franchises.map((franchise, idx) => {
              const purseRemaining = franchise.purse ?? 1000;
              const pursePercent = Math.min(100, Math.max(0, (purseRemaining / 1000) * 100));
              const squadCount = franchise.squad?.length || 0;

              return (
                <div
                  key={franchise.id || idx}
                  className="p-4 rounded-2xl bg-[#081129]/80 border border-blue-900/60 hover:border-amber-500/50 transition flex flex-col justify-between shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-black text-white font-display truncate">
                          {franchise.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: <span className="text-cyan-300 font-bold">{franchise.id}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-slate-300 font-mono">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400 text-[11px]">Purse Available:</span>
                        <span className="font-mono font-black text-amber-400 tabular-nums">
                          {purseRemaining} / 1000 Pts
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                          style={{ width: `${pursePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-blue-950 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Squad Built:</span>
                    <span className="font-mono font-bold text-sky-400 tabular-nums">
                      {squadCount} / 22 Players
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. ATHLETE SCOUTING POOL */}
      <section className="w-full py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase font-mono">
              <Sparkles className="w-3.5 h-3.5" /> Athlete Scouting Center
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white font-heading uppercase mt-1">
              Registered Auction Pool
            </h3>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, roll, branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#081129] border border-blue-900/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Category:
          </span>
          {[
            { id: 'ALL', label: 'All Categories' },
            { id: 'B3', label: '1. 3rd Year B.Tech' },
            { id: 'B4', label: '2. 4th Year B.Tech' },
            { id: 'B2', label: '3. 2nd Year B.Tech' },
            { id: 'B5', label: '4. Diploma - D' },
            { id: 'PG', label: '5. PG - P' },
            { id: 'B1', label: '6. 1st Year B.Tech' },
          ].map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBucket(b.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                activeBucket === b.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'bg-[#081129] text-slate-400 hover:text-white border border-blue-900/60'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlayers.slice(0, 12).map((player) => (
            <div
              key={player.id}
              onClick={() => setSelectedPlayer(player)}
              className="p-4 rounded-2xl bg-[#081129]/80 border border-blue-900/60 hover:border-amber-400/60 cursor-pointer flex flex-col justify-between group transition duration-200 shadow-md"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden border border-blue-900/60 shrink-0">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition">
                      {player.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {player.roll_number || 'Roll N/A'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium truncate">
                      {player.branch || 'AIET'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono truncate">
                    {formatAcademicCategory(player.bucket)}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 truncate">
                    {player.player_type || 'All-Rounder'}
                  </span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-blue-950 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Base Price:</span>
                <span className="font-mono font-bold text-amber-400 tabular-nums">
                  {player.is_referred === 1 ? 'Referred' : player.base_price ? `${player.base_price} Pts (₹)` : 'Optional'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DOSSIER MODAL */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#09122c] border border-blue-500/40 p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-amber-500/60 overflow-hidden shrink-0">
                {selectedPlayer.photo_url ? (
                  <img src={selectedPlayer.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <User className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-xl font-black text-white font-display uppercase">{selectedPlayer.name}</h4>
                <div className="text-xs text-slate-300 font-mono">
                  Roll: {selectedPlayer.roll_number} · Dept: {selectedPlayer.branch || 'AIET'}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    {formatAcademicCategory(selectedPlayer.bucket)}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                    {selectedPlayer.player_type || 'All-Rounder'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedPlayer(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
