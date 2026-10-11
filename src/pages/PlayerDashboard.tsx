/**
 * ============================================================================
 * ACC PLAYER INDIVIDUAL DASHBOARD (REAL-TIME AUCTION STATUS & EDIT PROFILE)
 * ============================================================================
 * Implements:
 * - Requirement 7: Player Edit Profile option (allows editing permitted profile
 *   fields while strictly protecting admin-controlled fields like approval,
 *   auction eligibility, winning franchise, and prices).
 * - Requirement 3: Displays detained status and effective academic category.
 * - Requirement 8: Displays admin approval status (PENDING / APPROVED / REJECTED).
 */

import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../context/AuctionContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { PhotoCaptureModal } from '../components/PhotoCaptureModal';
import { formatAcademicCategory, isDiplomaPlayer } from '../utils/academicCategories';
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
  Crown,
  Edit,
  X,
  AlertTriangle,
  Camera,
} from 'lucide-react';

export const PlayerDashboard: React.FC<{ onNavigate: (route: string) => void }> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { currentLot, franchises, serverTime, players, loadingPlayers, getPlayerById, updatePlayerProfile } = useAuction();

  // Edit Profile Modal State (Requirement 7)
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editIsDetained, setEditIsDetained] = useState(false);
  const [editPlayerType, setEditPlayerType] = useState('ALL_ROUNDER');
  const [editBattingPosition, setEditBattingPosition] = useState('Middle Order');
  const [editBattingHand, setEditBattingHand] = useState('Right Hand Batsman');
  const [editBattingPlayingType, setEditBattingPlayingType] = useState('Balanced');
  const [editBowlingProfile, setEditBowlingProfile] = useState('Fast Medium');
  const [editCricheroesLink, setEditCricheroesLink] = useState('');
  const [editExperience, setEditExperience] = useState('');
  const [editPreviousAcc, setEditPreviousAcc] = useState('');
  const [editMatches, setEditMatches] = useState<number>(0);
  const [editRuns, setEditRuns] = useState<number>(0);
  const [editWickets, setEditWickets] = useState<number>(0);
  const [editHighScore, setEditHighScore] = useState('');
  const [editBatAvg, setEditBatAvg] = useState('');
  const [editEcon, setEditEcon] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

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

  const openEditModal = () => {
    if (!player) return;
    let pStats: any = {};
    try {
      pStats = typeof player.stats_json === 'string' ? JSON.parse(player.stats_json) : (player.stats_json || player.stats || {});
    } catch {}

    setEditName(player.name || '');
    setEditMobile(player.mobile_number || '');
    setEditEmail(player.email || '');
    setEditPhotoUrl(player.photo_url || '');
    setEditIsDetained(player.is_detained === 1);
    setEditPlayerType(player.player_type || 'ALL_ROUNDER');
    setEditBattingPosition(player.batting_position || pStats.battingPosition || 'Middle Order');
    setEditBattingHand(player.batting_hand || player.batting_style || pStats.battingStyle || 'Right Hand Batsman');
    setEditBattingPlayingType(player.batting_playing_type || pStats.battingPlayingType || 'Balanced');
    setEditBowlingProfile(player.bowling_profile || player.bowling_style || pStats.bowlingStyle || 'Fast Medium');
    setEditCricheroesLink(player.cricheroes_url || '');
    setEditExperience(player.experience || '');
    setEditPreviousAcc(player.previous_acc || '');
    setEditMatches(pStats.matches || 0);
    setEditRuns(pStats.runs || 0);
    setEditWickets(pStats.wickets || 0);
    setEditHighScore(pStats.highestScore || '-');
    setEditBatAvg(pStats.battingAverage || '0.0');
    setEditEcon(pStats.economy || '0.0');

    setEditError(null);
    setEditMessage(null);
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;
    setSavingEdit(true);
    setEditError(null);
    setEditMessage(null);

    try {
      const statsPayload = {
        matches: editMatches,
        runs: editRuns,
        wickets: editWickets,
        highestScore: editHighScore,
        battingAverage: editBatAvg,
        economy: editEcon,
        battingStyle: editBattingHand,
        bowlingStyle: editBowlingProfile,
        battingPosition: editBattingPosition,
        battingHand: editBattingHand,
        battingPlayingType: editBattingPlayingType,
        bowlingProfile: editBowlingProfile,
      };

      const res = await updatePlayerProfile(player.id, {
        name: editName,
        mobileNumber: editMobile,
        email: editEmail,
        photoUrl: editPhotoUrl,
        isDetained: editIsDetained,
        playerType: editPlayerType,
        battingPosition: editBattingPosition,
        battingHand: editBattingHand,
        battingPlayingType: editBattingPlayingType,
        bowlingProfile: editBowlingProfile,
        cricheroesLink: editCricheroesLink,
        experience: editExperience,
        previousAcc: editPreviousAcc,
        stats: statsPayload,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to save profile changes.');
      }

      setEditMessage('Profile changes saved successfully and persisted in database.');
      setTimeout(() => setShowEditModal(false), 1200);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

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
          Logged in as <strong className="text-white">{user?.username}</strong>. Please register your player dossier with your college roll number.
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() => onNavigate('/player/register')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Register Now
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
        <div className="flex items-center gap-2">
          {/* Requirement 7: Edit Profile Button */}
          <button
            onClick={openEditModal}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1.5 transition cursor-pointer px-3 py-1.5 rounded-xl hover:bg-slate-900 border border-slate-800"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
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
                {currentLot.current_price} Pts (Purse)
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
            {isDiplomaPlayer(player) && (
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-mono font-bold text-xs border border-rose-500/60 inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Player detained by 1 year diploma</span>
              </span>
            )}
            {/* Requirement 3: Detained status badge */}
            {player.is_detained === 1 && !isDiplomaPlayer(player) && (
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-mono font-bold text-xs border border-rose-500/40">
                Detained (Year Shifted)
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

      {/* AUCTION STATUS & APPROVALS (Requirement 8 & 3) */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-5">
        <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
          <Gavel className="w-5 h-5 text-amber-400" />
          Auction Floor Status & Approval State
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Base Price</div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">
              {isReferred ? 'N/A (Referred)' : player.base_price ? `${player.base_price} Pts (Purse)` : '20 Pts (Purse)'}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Official Tournament Base</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Approval State</div>
            <div className={`text-base font-black uppercase mt-1 ${
              player.approval_status === 'APPROVED' ? 'text-emerald-400' : player.approval_status === 'REJECTED' ? 'text-red-400' : 'text-amber-400'
            }`}>
              {player.approval_status || 'PENDING'}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {player.approval_status === 'APPROVED' ? 'Accepted by Tournament Admin' : 'Review pending'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Auction Eligibility</div>
            <div className="flex items-center gap-1.5 mt-1 font-bold">
              {player.is_auction_eligible === 1 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-300">ELIGIBLE</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-300">NOT ELIGIBLE</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {player.is_auction_eligible === 1 ? 'Entered into auction pool' : 'Requires admin approval'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Detained Status</div>
            <div className="text-sm font-bold text-white mt-1">
              {isDiplomaPlayer(player) ? (
                <span className="text-rose-400">Player detained by 1 year diploma</span>
              ) : player.is_detained === 1 ? (
                <span className="text-rose-400">YES (Shifted)</span>
              ) : (
                <span className="text-slate-300">NO (Regular)</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Academic Year Policy</span>
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
                {isReferred ? '0 Pts (Direct Assignment)' : `${player.sold_price || player.base_price || 20} Pts (Purse)`}
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
              Your Cricket Statistics & Details
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              These details are verified and visible to Admin, Franchise Members, and Live Viewers.
            </p>
          </div>
          <button
            onClick={openEditModal}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit Stats</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Matches Played</span>
            <div className="text-2xl font-black text-white mt-1">{stats.matches || 0}</div>
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
            <span className="text-[10px] text-slate-400 uppercase font-bold">Total Wickets</span>
            <div className="text-2xl font-black text-cyan-400 mt-1">{stats.wickets || 0}</div>
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
            <span className="text-[10px] text-slate-400 uppercase font-bold">Best Bowling</span>
            <div className="text-lg font-bold text-slate-200 mt-1">{stats.bestBowling || '-'}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Economy</span>
            <div className="text-lg font-bold text-slate-200 mt-1">{stats.economy || '0.0'}</div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL (Requirement 7) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300">
                <Edit className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-black text-white uppercase tracking-tight">
                  Edit Player Profile & Stats
                </h3>
                <p className="text-xs text-slate-400">
                  Update your contact details, cricket statistics, and detained status.
                </p>
              </div>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {editMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{editMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              {/* Requirement 3: Detained flag editor */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Are you detained in current academic year?</span>
                  <span className="text-[10px] text-slate-400">Placed into previous year's bucket if YES</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsDetained}
                      onChange={(e) => setEditIsDetained(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                  <span className="font-mono font-bold text-amber-400">{editIsDetained ? 'YES' : 'NO'}</span>
                </div>
              </div>

              {/* Photo Update */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                  {editPhotoUrl ? (
                    <img src={editPhotoUrl} alt="Player" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 m-4 text-slate-600" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" /> Change Photo
                </button>
              </div>

              {/* Stats Numerical Table */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <span className="font-bold text-slate-300 uppercase font-mono text-[10px]">Cricket Performance Statistics:</span>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div>
                    <label className="block text-slate-500 text-[10px]">Matches</label>
                    <input
                      type="number"
                      value={editMatches}
                      onChange={(e) => setEditMatches(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">Runs</label>
                    <input
                      type="number"
                      value={editRuns}
                      onChange={(e) => setEditRuns(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">Wickets</label>
                    <input
                      type="number"
                      value={editWickets}
                      onChange={(e) => setEditWickets(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">Top Score</label>
                    <input
                      type="text"
                      value={editHighScore}
                      onChange={(e) => setEditHighScore(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">Bat Avg</label>
                    <input
                      type="text"
                      value={editBatAvg}
                      onChange={(e) => setEditBatAvg(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">Economy</label>
                    <input
                      type="text"
                      value={editEcon}
                      onChange={(e) => setEditEcon(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">CricHeroes Link</label>
                <input
                  type="text"
                  value={editCricheroesLink}
                  onChange={(e) => setEditCricheroesLink(e.target.value)}
                  placeholder="https://cricheroes.in/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider transition"
                >
                  {savingEdit ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPhotoModal && (
        <PhotoCaptureModal
          isOpen={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          onPhotoSelected={(dataUrl) => {
            setEditPhotoUrl(dataUrl);
            setShowPhotoModal(false);
          }}
        />
      )}
    </div>
  );
};
