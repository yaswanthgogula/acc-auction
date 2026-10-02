/**
 * ============================================================================
 * ACC PLAYER INDIVIDUAL DASHBOARD (REAL-TIME AUCTION STATUS & EXACT STATS)
 * ============================================================================
 * Whenever the player logs into their account, they see their stats exactly
 * what they have mentioned during registration, including role profiles,
 * match records, academic category, base price / referral status, and team assignment.
 */

import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../context/AuctionContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { formatAcademicCategory } from '../utils/academicCategories';
import {
  User,
  CheckCircle,
  Clock,
  Award,
  ExternalLink,
  Gavel,
  Zap,
  Activity,
  LogOut,
  Phone,
  Mail,
  Shield,
  Crown,
} from 'lucide-react';

export const PlayerDashboard: React.FC<{ onNavigate: (route: string) => void }> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { currentLot, franchises, serverTime, players, loadingPlayers, getPlayerById } = useAuction();

  const player = useMemo(() => {
    if (!user) return null;
    const userRoll = user?.username?.toUpperCase();
    if (user?.playerId) {
      const byId = getPlayerById(user.playerId);
      if (byId) return byId;
    }
    if (userRoll) {
      const byRoll = getPlayerById(userRoll);
      if (byRoll) return byRoll;
    }
    if (user?.player) {
      return user.player;
    }
    return (
      players.find(
        (p: any) =>
          (userRoll && p.roll_number?.toUpperCase() === userRoll) ||
          p.id === user?.playerId ||
          p.id === user?.id
      ) || null
    );
  }, [user, players, getPlayerById]);

  const loading = loadingPlayers && players.length === 0 && !player;

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading your player dossier & stats...
      </div>
    );
  }

  if (!player) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-slate-400">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
          <User className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-heading font-black text-white uppercase">Player Profile Not Found</h3>
        <p className="text-xs text-slate-400 mt-2">
          Logged in as <strong className="text-white">{user?.username}</strong>. Please register your player dossier with your college roll number or log in with your registered roll number.
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() => onNavigate('/player/register')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Register Now
          </button>
          <button
            onClick={() => onNavigate('/')}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Back Home
          </button>
        </div>
      </div>
    );
  }

  const isCurrentlyOnBlock = currentLot && (
    currentLot.player_id === player.id ||
    currentLot.roll_number?.toUpperCase() === player.roll_number?.toUpperCase()
  );

  const leadingFranchise = isCurrentlyOnBlock && (currentLot.highest_bidder_name || currentLot.highest_bidder_id)
    ? (currentLot.highest_bidder_name || franchises.find((f) => f.id === currentLot.highest_bidder_id)?.name)
    : null;

  let stats: any = {};
  try {
    stats = typeof player.stats_json === 'string' ? JSON.parse(player.stats_json) : (player.stats_json || player.stats || {});
  } catch {}

  const draftedFranchise = player.franchise_name || player.sold_to_team || player.referring_franchise_name || null;
  const isReferred = player.is_referred === 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Player Dashboard & Career Stats
          </span>
        </div>
        <button
          onClick={logout}
          className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1.5 transition cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-900 border border-slate-800"
        >
          <LogOut className="w-3.5 h-3.5" /> Log Out
        </button>
      </div>

      {/* Live Auction Block Callout */}
      {isCurrentlyOnBlock && (
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/25 via-slate-900 to-amber-950/40 border-2 border-amber-400 p-6 shadow-2xl animate-pulse relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow">
                <Zap className="w-3.5 h-3.5 fill-current" />
                YOU ARE ON THE AUCTION BLOCK RIGHT NOW!
              </div>
              <h2 className="font-heading text-2xl font-black text-white mt-2">
                Live Bidding in Progress
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Franchises are bidding for you right now on the live auction floor.
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-end">
              <span className="text-[10px] uppercase font-bold text-amber-400">Hammer Clock</span>
              <div className="mt-1">
                <CountdownTimer
                  deadlineMs={currentLot.deadline_ms || currentLot.deadlineMs || null}
                  serverTime={serverTime}
                  size="md"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 p-4 rounded-2xl bg-slate-950/90 border border-amber-500/40">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Current Highest Bid</span>
              <div className="text-3xl font-black text-amber-400 font-mono mt-1">
                {currentLot.current_price} Pts (₹)
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Leading Bidder</span>
              <div className="text-lg font-black text-white font-heading mt-1 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                {leadingFranchise ? leadingFranchise : 'Waiting for Opening Bid...'}
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('/live')}
            className="w-full mt-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
          >
            Watch Live Arena Floor →
          </button>
        </div>
      )}

      {/* Main Player Profile Card with Registration Information */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col sm:flex-row items-center gap-6">
        <div className="w-28 h-28 rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-500/50 shrink-0 shadow-lg">
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-14 h-14 m-7 text-slate-600" />
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-white">
              {player.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/40">
              {formatAcademicCategory(player.bucket)}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-bold text-xs border border-blue-500/30">
              {player.player_type || player.skill || 'All-Rounder'}
            </span>
            {isReferred && (
              <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 font-mono font-bold text-xs border border-purple-500/40">
                ★ Franchise Referred
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 font-mono mt-1.5">
            Roll: <strong className="text-white">{player.roll_number}</strong> • {player.branch} (Year {player.academic_year || 1}) • {player.program || 'B.Tech'}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs">
            {player.mobile_number && (
              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                <Phone className="w-3.5 h-3.5" />
                {player.mobile_number}
              </span>
            )}
            {player.email && (
              <span className="flex items-center gap-1 text-slate-300 font-mono">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                {player.email}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs">
            <span className="text-slate-400">
              Batting: <strong className="text-slate-200">{player.batting_style || player.batting_hand || stats.battingStyle || 'Right Hand Bat'}</strong>
            </span>
            <span className="text-slate-400">
              Bowling: <strong className="text-slate-200">{player.bowling_style || player.bowling_profile || stats.bowlingStyle || 'Right Arm Medium'}</strong>
            </span>
          </div>

          {player.cricheroes_url && (
            <a
              href={player.cricheroes_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium underline mt-2"
            >
              <ExternalLink className="w-3 h-3" /> View CricHeroes Profile
            </a>
          )}
        </div>
      </div>

      {/* REFERRAL INFORMATION BOX IF REFERRED PLAYER */}
      {isReferred && (
        <div className="p-5 rounded-3xl bg-purple-950/40 border-2 border-purple-500/50 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Award className="w-4 h-4 text-purple-400" /> Direct Franchise Referral Details
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-500 text-slate-950 font-black text-[10px] uppercase font-mono">
              Direct Assignment
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30">
              <span className="text-slate-400 block text-[10px]">Referred By Captain:</span>
              <strong className="text-white text-sm flex items-center gap-1.5 mt-0.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                {player.referred_by_captain_name || 'Franchise Captain'}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30">
              <span className="text-slate-400 block text-[10px]">Assigned Franchise:</span>
              <strong className="text-amber-300 text-sm flex items-center gap-1.5 mt-0.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                {player.referring_franchise_name || 'Franchise Squad'}
              </strong>
            </div>
          </div>
          <p className="text-[11px] text-slate-300">
            As a referred player, you are directly assigned to the franchise squad with no auction price, without consuming the franchise purse.
          </p>
        </div>
      )}

      {/* AUCTION STATUS & PRICE */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-5">
        <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
          <Gavel className="w-5 h-5 text-amber-400" />
          Auction Floor Status & Valuations
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Base Price</div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">
              {isReferred
                ? 'N/A (Referred Player)'
                : player.base_price
                ? `${player.base_price} Pts (₹)`
                : 'Optional / Not Set'}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {isReferred ? 'Referred players do not have a base price' : 'Official Tournament Base Price'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Auction Status</div>
            <div className={`text-base font-black uppercase mt-1 ${
              draftedFranchise
                ? 'text-emerald-400'
                : player.registration_status === 'UNSOLD'
                ? 'text-amber-400'
                : 'text-cyan-400'
            }`}>
              {draftedFranchise
                ? (isReferred ? 'DIRECT ASSIGNMENT' : 'SOLD / DRAFTED')
                : player.registration_status || 'REGISTERED'}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {draftedFranchise ? `Drafted to ${draftedFranchise}` : 'Available in Auction Queue'}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Eligibility</div>
            <div className="flex items-center gap-1.5 mt-1">
              {isReferred ? (
                <>
                  <Award className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-300">Direct Franchise Member</span>
                </>
              ) : player.is_auction_eligible === 1 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">Auction Eligible</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">Pending Verification</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-emerald-400/80 mt-0.5 block">
              {isReferred ? 'Direct Squad Member' : 'Approved for Live Bidding'}
            </span>
          </div>
        </div>

        {/* If Drafted to a franchise */}
        {draftedFranchise && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-950 border-2 border-emerald-500/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider mb-1">
                ✓ Squad Member Confirmed
              </div>
              <h4 className="font-heading text-xl font-black text-white">
                {draftedFranchise}
              </h4>
              <p className="text-xs text-emerald-300/80">
                You are officially part of the squad for ACC 2026!
              </p>
            </div>

            <div className="text-center sm:text-right font-mono">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">Winning Bid / Assignment</span>
              <div className="text-3xl font-black text-amber-400 mt-0.5">
                {isReferred ? '0 Pts (Direct Assignment)' : `${player.sold_price || player.base_price || 20} Pts (₹)`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COMPREHENSIVE CRICKET STATS (EXACTLY AS ENTERED DURING REGISTRATION) */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Your Cricket Statistics & Details (Exactly as Mentioned in Registration)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              These details are verified and visible to Everyone: Admin, Franchise Members, during Bidding, and Live Viewers.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 font-bold">
            Verified Record
          </span>
        </div>

        {/* Batting Profile Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-blue-500/30 flex flex-col gap-2">
          <span className="text-xs font-bold text-blue-400 uppercase font-mono tracking-wider">
            Batting Profile & Discipline:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Position:</span>
              <strong className="text-white">{player.batting_position || stats.battingPosition || 'Middle Order'}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Batting Hand:</span>
              <strong className="text-white">{player.batting_hand || player.batting_style || stats.battingStyle || 'Right Hand Bat'}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Playing Style:</span>
              <strong className="text-white">{player.batting_playing_type || stats.battingPlayingType || 'Balanced'}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Bowling Profile:</span>
              <strong className="text-white">{player.bowling_profile || player.bowling_style || stats.bowlingStyle || 'None'}</strong>
            </div>
          </div>
        </div>

        {/* Performance Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Matches Played</span>
            <div className="text-2xl font-black text-white mt-1">{stats.matches || 0}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Innings Batted</span>
            <div className="text-2xl font-black text-slate-200 mt-1">{stats.inningsBatted || '-'}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Total Runs</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{stats.runs || 0}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Highest Score</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{stats.highestScore || '-'}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Batting Average</span>
            <div className="text-lg font-bold text-slate-200 mt-1">{stats.battingAverage || '0.0'}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Strike Rate</span>
            <div className="text-lg font-bold text-slate-200 mt-1">{stats.strikeRate || '0.0'}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">50s / 100s</span>
            <div className="text-lg font-bold text-slate-200 mt-1">{stats.fifties || 0} / {stats.hundreds || 0}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Wickets Taken</span>
            <div className="text-2xl font-black text-cyan-400 mt-1">{stats.wickets || 0}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Overs Bowled</span>
            <div className="text-lg font-bold text-slate-200 mt-1">{stats.oversBowled || '0'}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Best Bowling</span>
            <div className="text-lg font-bold text-slate-200 mt-1">{stats.bestBowling || '-'}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Bowling Economy</span>
            <div className="text-lg font-bold text-slate-200 mt-1">{stats.economy || '0.0'}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Catches / Stumpings</span>
            <div className="text-lg font-bold text-slate-200 mt-1">{stats.catches || 0} / {stats.stumpings || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
