/**
 * ============================================================================
 * ACC FRANCHISE MOBILE-FIRST BIDDING CONSOLE & SQUAD MANAGEMENT
 * ============================================================================
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../context/AuctionContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { BucketProgressBar } from '../components/BucketProgressBar';
import { formatAcademicCategory } from '../utils/academicCategories';
import {
  Gavel,
  CheckCircle,
  AlertTriangle,
  Users,
  Shield,
  Clock,
  Sparkles,
  Crown,
  Phone,
  UserPlus,
  Copy,
  Trash2,
  Eye,
  X,
  Share2,
  Edit,
  Award,
} from 'lucide-react';

export const FranchiseConsole: React.FC = () => {
  const { user } = useAuth();
  const { currentLot, franchises, placeBid, passLot, serverTime, removeSquadPlayer, updateCaptainStats, activeSession, sessionState } = useAuction();
  const [bidding, setBidding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Referral generator state
  const [generatingReferral, setGeneratingReferral] = useState(false);
  const [newReferralLink, setNewReferralLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Squad management modal
  const [selectedPlayerDossier, setSelectedPlayerDossier] = useState<any | null>(null);
  const [removingPlayer, setRemovingPlayer] = useState<any | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  // Edit Captain Stats Modal
  const [showEditCaptainModal, setShowEditCaptainModal] = useState(false);
  const [savingCaptainStats, setSavingCaptainStats] = useState(false);

  // Captain form fields
  const [editCapName, setEditCapName] = useState('');
  const [editCapRoll, setEditCapRoll] = useState('');
  const [editCapMobile, setEditCapMobile] = useState('');
  const [editCapSpecialty, setEditCapSpecialty] = useState('');
  const [editCapBattingStyle, setEditCapBattingStyle] = useState('Right Hand Bat');
  const [editCapBowlingStyle, setEditCapBowlingStyle] = useState('Right Arm Medium');
  const [editCapMatches, setEditCapMatches] = useState<number>(0);
  const [editCapRuns, setEditCapRuns] = useState<number>(0);
  const [editCapWickets, setEditCapWickets] = useState<number>(0);
  const [editCapAvg, setEditCapAvg] = useState('0.0');
  const [editCapSR, setEditCapSR] = useState('0.0');
  const [editCapHighScore, setEditCapHighScore] = useState('-');
  const [editCapBestBowl, setEditCapBestBowl] = useState('-');
  const [editCapEconomy, setEditCapEconomy] = useState('0.0');
  const [editCapCricheroes, setEditCapCricheroes] = useState('');
  const [editCapBio, setEditCapBio] = useState('');

  // Squad views tab
  const [squadTab, setSquadTab] = useState<'ACTIVE' | 'REMOVED' | 'REFERRALS'>('ACTIVE');

  const myFranchise = franchises.find((f) => f.id === user?.franchiseId) || franchises[0];

  const openCaptainEditor = () => {
    if (!myFranchise) return;
    const stats = myFranchise.captain_stats || {};
    setEditCapName(myFranchise.captain_name || '');
    setEditCapRoll(myFranchise.captain_roll || '');
    setEditCapMobile(myFranchise.captain_mobile || '');
    setEditCapSpecialty(myFranchise.captain_specialty || stats.specialty || myFranchise.captain_skill || 'Pure Opening Batter');
    setEditCapBattingStyle(myFranchise.captain_batting_style || stats.battingStyle || 'Right Hand Bat');
    setEditCapBowlingStyle(myFranchise.captain_bowling_style || stats.bowlingStyle || 'None');
    setEditCapMatches(stats.matches ?? 0);
    setEditCapRuns(stats.runs ?? 0);
    setEditCapWickets(stats.wickets ?? 0);
    setEditCapAvg(stats.battingAverage || '0.0');
    setEditCapSR(stats.strikeRate || '0.0');
    setEditCapHighScore(stats.highestScore || '-');
    setEditCapBestBowl(stats.bestBowling || '-');
    setEditCapEconomy(stats.economy || '0.0');
    setEditCapCricheroes(myFranchise.captain_cricheroes_url || '');
    setEditCapBio(stats.bio || '');
    setShowEditCaptainModal(true);
  };

  const handleSaveCaptainStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myFranchise) return;
    setSavingCaptainStats(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const payload = {
        captainName: editCapName.trim(),
        captainRoll: editCapRoll.trim(),
        captainMobile: editCapMobile.trim(),
        captainSpecialty: editCapSpecialty.trim(),
        captainBattingStyle: editCapBattingStyle,
        captainBowlingStyle: editCapBowlingStyle,
        captainCricheroesUrl: editCapCricheroes.trim(),
        matches: editCapMatches,
        runs: editCapRuns,
        wickets: editCapWickets,
        battingAverage: editCapAvg,
        strikeRate: editCapSR,
        highestScore: editCapHighScore,
        bestBowling: editCapBestBowl,
        economy: editCapEconomy,
        bio: editCapBio.trim(),
      };

      const res = await updateCaptainStats(myFranchise.id, payload);
      if (!res.success) {
        throw new Error(res.error || 'Failed to update captain stats');
      }
      setActionSuccess('Your captain stats have been saved and are now visible to everyone!');
      setShowEditCaptainModal(false);
    } catch (err: any) {
      setActionError(err.message || 'Error updating captain stats');
    } finally {
      setSavingCaptainStats(false);
    }
  };

  const handleBid = async () => {
    if (!myFranchise) return;
    setActionError(null);
    setActionSuccess(null);
    setBidding(true);
    try {
      const res = await placeBid(myFranchise.id);
      if (!res.success) {
        setActionError(res.error || 'Bid was rejected by auction server.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Bid submission failed.');
    } finally {
      setBidding(false);
    }
  };

  const handlePass = async () => {
    if (!myFranchise) return;
    setActionError(null);
    setActionSuccess(null);
    await passLot(myFranchise.id);
  };

  const handleGenerateReferral = async () => {
    if (!myFranchise) return;
    setActionError(null);
    setActionSuccess(null);

    if ((myFranchise.referredCount || 0) >= 5) {
      setActionError('Maximum 5 referred players reached for your franchise.');
      return;
    }

    setGeneratingReferral(true);
    try {
      const res = await fetch('/api/referrals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          franchiseId: myFranchise.id,
          captainName: myFranchise.captain_name || user?.username,
          captainId: myFranchise.captain_roll || user?.id,
          captainMobile: myFranchise.captain_mobile || '',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate referral link.');
      }

      const fullLink = `${window.location.origin}${data.referralLink}`;
      setNewReferralLink(fullLink);
      setActionSuccess('Referral link generated! Share this link with your referred player.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to generate referral link.');
    } finally {
      setGeneratingReferral(false);
    }
  };

  const handleRemoveSquadPlayer = async () => {
    if (!removingPlayer || !myFranchise) return;
    setIsRemoving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await removeSquadPlayer(
        myFranchise.id,
        removingPlayer.player_id || removingPlayer.id,
        removalReason || 'Removed by Franchise Captain'
      );
      if (!res.success) {
        throw new Error(res.error || 'Failed to remove player.');
      }
      setActionSuccess(res.message || 'Player safely removed from squad.');
      setRemovingPlayer(null);
      setRemovalReason('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove player.');
    } finally {
      setIsRemoving(false);
    }
  };

  if (!myFranchise) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-slate-400">
        <Shield className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <h3 className="font-heading text-xl font-bold text-white">No Franchise Assigned</h3>
        <p className="text-xs mt-1">Please log in with an authorized franchise coordinator or captain account.</p>
      </div>
    );
  }

  const isHighestBidder = currentLot && currentLot.highest_bidder_id === myFranchise.id;
  const hasBidder = Boolean(currentLot?.highest_bidder_id) && (currentLot?.bid_count ?? 0) > 0;
  const currentPrice = currentLot?.current_price ?? currentLot?.opening_price ?? 20;
  const nextIncrement = currentPrice < 100 ? 10 : currentPrice < 200 ? 20 : 30;
  const nextLegalBid = currentLot ? (hasBidder ? currentPrice + nextIncrement : currentPrice) : 0;
  const canBid = currentLot && myFranchise.bidAllowed && !isHighestBidder && !sessionState.endsWith('_ENDED');
  const capStats = myFranchise.captain_stats || {};

  const referredPlayersList = myFranchise.squad?.filter((p: any) => p.is_referred === 1 || p.acquisition_type === 'DIRECT_ASSIGNMENT' || p.acquisition_type === 'REFERRED') || [];
  const referredCount = Math.min(5, Math.max(myFranchise.referredCount || 0, referredPlayersList.length));

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Franchise Status Banner & Leadership */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-amber-500/40 p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center font-black text-amber-300 text-lg shadow-inner shrink-0">
              {myFranchise.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-2xl font-black text-white leading-tight">
                  {myFranchise.name}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-800 font-bold">
                  ID: {myFranchise.id}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                  Session {activeSession}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                <span>Coordinator: <strong className="text-white">{myFranchise.faculty_coordinator || 'Assigned'}</strong></span>
                <span>•</span>
                <span>Branch: <strong className="text-slate-200">{myFranchise.faculty_branch || myFranchise.department || 'General'}</strong></span>
                {myFranchise.faculty_mobile && (
                  <>
                    <span>•</span>
                    <a href={`tel:${myFranchise.faculty_mobile}`} className="text-emerald-400 font-mono flex items-center gap-1 hover:underline">
                      <Phone className="w-3 h-3" /> {myFranchise.faculty_mobile}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4 w-full sm:w-auto">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Purse Available
            </div>
            <div className="text-3xl font-black text-amber-400 font-display">
              {myFranchise.purse} <span className="text-xs text-slate-300">Pts (INR)</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
              Squad: {myFranchise.squadCount || 0} / 22 Players
            </div>
          </div>
        </div>

        {/* CAPTAIN PROFILE & STATS CARD */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/50 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5 text-sm font-heading">
                <Crown className="w-4 h-4 text-amber-400" /> Captain Profile & Cricket Statistics
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                Visible to Everyone
              </span>
            </div>

            <button
              onClick={openCaptainEditor}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow transition cursor-pointer self-start sm:self-auto"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Enter / Update My Stats</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <div className="font-black text-white text-base">
                {myFranchise.captain_name || 'Designated Captain'}
              </div>
              <div className="text-cyan-300 font-mono text-[11px] mt-0.5">
                {myFranchise.captain_roll && `Roll: ${myFranchise.captain_roll} • `}
                {myFranchise.captain_mobile && `Mobile: ${myFranchise.captain_mobile}`}
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs max-w-xs truncate">
              Specialty: {myFranchise.captain_specialty || capStats.specialty || myFranchise.captain_skill || 'Captain & Core Athlete'}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 text-center font-mono text-xs bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <div className="p-1.5 rounded bg-slate-950">
              <span className="text-[10px] text-slate-400 block">Matches</span>
              <strong className="text-white text-sm">{capStats.matches ?? 0}</strong>
            </div>
            <div className="p-1.5 rounded bg-slate-950">
              <span className="text-[10px] text-slate-400 block">Runs</span>
              <strong className="text-amber-400 text-sm">{capStats.runs ?? 0}</strong>
            </div>
            <div className="p-1.5 rounded bg-slate-950">
              <span className="text-[10px] text-slate-400 block">Wickets</span>
              <strong className="text-cyan-400 text-sm">{capStats.wickets ?? 0}</strong>
            </div>
            <div className="p-1.5 rounded bg-slate-950">
              <span className="text-[10px] text-slate-400 block">Top Score</span>
              <strong className="text-emerald-400 text-sm">{capStats.highestScore || '-'}</strong>
            </div>
            <div className="p-1.5 rounded bg-slate-950">
              <span className="text-[10px] text-slate-400 block">Bat Avg</span>
              <strong className="text-slate-200 text-xs">{capStats.battingAverage || '-'}</strong>
            </div>
            <div className="p-1.5 rounded bg-slate-950">
              <span className="text-[10px] text-slate-400 block">Economy</span>
              <strong className="text-slate-200 text-xs">{capStats.economy || '-'}</strong>
            </div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-950/90 border border-red-700 text-red-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-xs font-bold underline">Dismiss</button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs font-bold underline">Dismiss</button>
        </div>
      )}

      {/* REFERRAL SYSTEM SECTION */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                Refer Player (Captain Referral System)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-black border border-amber-500/40">
                Referred Players: {referredCount} / 5
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Each franchise captain can refer 0–5 players maximum. The generated referral link auto-populates your details and bypasses auction bidding upon direct assignment.
            </p>
          </div>

          <button
            onClick={handleGenerateReferral}
            disabled={generatingReferral || referredCount >= 5}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-amber-950/40"
          >
            <UserPlus className="w-4 h-4" />
            <span>{referredCount >= 5 ? 'Max 5 Reached' : 'Refer Player'}</span>
          </button>
        </div>

        {newReferralLink && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-300 flex items-center gap-1 font-mono">
                <Share2 className="w-3.5 h-3.5" /> Unique Referral Link Generated:
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Share with your player</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newReferralLink}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs select-all"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newReferralLink);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase transition shrink-0 cursor-pointer flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AUCTION LOT LIVE BIDDING DESK */}
      {currentLot ? (
        <div className="rounded-3xl bg-slate-900 border-2 border-blue-600/50 p-6 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider font-display">
              Now on Floor • {formatAcademicCategory(currentLot.bucket)}
            </span>
            <CountdownTimer
              deadlineMs={currentLot.deadline_ms || currentLot.deadlineMs}
              serverTime={serverTime}
              size="sm"
            />
          </div>

          <div className="flex gap-4 items-center">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-blue-500/50 bg-slate-950 shrink-0 shadow-md">
              {currentLot.photo_url || currentLot.photoUrl ? (
                <img src={currentLot.photo_url || currentLot.photoUrl} alt="Player" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Users className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-heading text-2xl font-black text-white truncate">
                {currentLot.player_name || currentLot.playerName}
              </h3>
              <p className="text-xs text-cyan-400 font-semibold truncate">
                {currentLot.branch} • {currentLot.program}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                {currentLot.player_type || currentLot.playerType}
              </p>
              <div className="mt-2 text-xs font-mono">
                <span className="text-slate-400">Opening Base: </span>
                <span className="text-white font-bold">{currentLot.opening_price || currentLot.basePrice} Pts (₹)</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold font-mono">Current Highest Bid</div>
              <div className="text-3xl font-black text-amber-400 font-display">
                {currentLot.current_price || currentLot.opening_price} Pts (₹)
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold font-mono">Leading Bidder</div>
              <div className="text-base font-bold text-white truncate max-w-[160px]">
                {isHighestBidder ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 justify-end">
                    <CheckCircle className="w-4 h-4" /> You Are Winning
                  </span>
                ) : (
                  currentLot.highest_bidder_name || 'No Bids Yet'
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handlePass}
              className="py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm uppercase tracking-wider transition cursor-pointer"
            >
              Pass
            </button>

            <button
              disabled={!canBid || bidding}
              onClick={handleBid}
              className={`py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition cursor-pointer ${
                canBid
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Gavel className="w-5 h-5" />
              {isHighestBidder ? 'Winning Bid' : `Bid ${nextLegalBid} Pts (₹)`}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-8 text-center text-slate-400">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-heading text-xl font-bold text-white">Awaiting Next Lot</h3>
          <p className="text-xs mt-1">
            Super Admin will call the next player in the official draw sequence shortly.
          </p>
        </div>
      )}

      {/* QUOTA PROGRESS */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <h3 className="font-heading text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Academic Quota Compliance (Min 2 Each)
        </h3>
        <BucketProgressBar bucketCounts={myFranchise.bucketCounts || {}} compact={true} />
      </div>

      {/* SQUAD & REFERRED PLAYERS MANAGEMENT SECTION */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Captain Squad Management ({myFranchise.squadCount || 0} / 22)
            </h3>
            <p className="text-xs text-slate-400">
              Manage your squad. You can safely remove permitted players without deleting their records.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setSquadTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                squadTab === 'ACTIVE' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active ({myFranchise.squad?.length || 0})
            </button>
            <button
              onClick={() => setSquadTab('REFERRALS')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                squadTab === 'REFERRALS' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Referred ({referredCount}/5)
            </button>
            <button
              onClick={() => setSquadTab('REMOVED')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                squadTab === 'REMOVED' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Removed ({myFranchise.removedSquad?.length || 0})
            </button>
          </div>
        </div>

        {squadTab === 'ACTIVE' && (
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1 text-xs">
            {myFranchise.squad?.map((m: any, idx: number) => (
              <div
                key={m.id || idx}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                      {m.photo_url ? (
                        <img src={m.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5 m-3 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{m.player_name}</span>
                        {m.roll_number && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            {m.roll_number}
                          </span>
                        )}
                        {m.is_referred === 1 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                            Referred
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-amber-400 font-bold">{formatAcademicCategory(m.bucket)}</span>
                        <span>•</span>
                        <span>{m.player_type || 'Player'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-amber-400 font-black text-sm">
                      {m.acquisition_type === 'DIRECT_ASSIGNMENT' ? '0 Pts (Direct Assignment)' : `${m.price} Pts (₹)`}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setRemovingPlayer(m);
                      setRemovalReason('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove from Squad</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {squadTab === 'REFERRALS' && (
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 flex flex-col gap-2">
              <span className="font-bold text-purple-300 font-heading text-sm">
                Franchise Captain Referral Link (Max 5 Players)
              </span>
              <p className="text-[11px] text-slate-300">
                Share this referral link with candidates you want to recruit. Referred players will register without seeing a base price. Once approved by the Tournament Admin, they join your squad directly with 0 points.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/player/register?ref=${myFranchise.id}`}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/player/register?ref=${myFranchise.id}`);
                    setActionSuccess('Referral link copied to clipboard!');
                    setTimeout(() => setActionSuccess(null), 3000);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 cursor-pointer transition shadow"
                >
                  Copy Link
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
              {referredPlayersList.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center text-slate-500">
                  No referred players registered under your franchise yet. Share your referral link above!
                </div>
              ) : (
                referredPlayersList.map((m: any, idx: number) => (
                  <div
                    key={m.id || idx}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5 m-2.5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{m.player_name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                            Referred
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {m.roll_number} • {formatAcademicCategory(m.bucket)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400 block">
                        Direct Assignment (0 Pts)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Approved by Admin
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {squadTab === 'REMOVED' && (
          <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1 text-xs">
            {(!myFranchise.removedSquad || myFranchise.removedSquad.length === 0) ? (
              <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center text-slate-500">
                No players have been removed from your squad.
              </div>
            ) : (
              myFranchise.removedSquad.map((m: any, idx: number) => (
                <div
                  key={m.id || idx}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-rose-950/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700 opacity-60">
                      {m.photo_url ? (
                        <img src={m.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5 m-2.5 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-300 text-sm line-through">
                        {m.player_name}
                      </div>
                      <div className="text-[11px] text-rose-400 mt-0.5">
                        Reason: {m.removal_reason || 'Squad adjustment'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Status: REMOVED
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* EDIT CAPTAIN STATS MODAL */}
      {showEditCaptainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowEditCaptainModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-black text-white uppercase tracking-tight">
                  Captain Career Stats & Role Profile
                </h3>
              </div>
            </div>

            <form onSubmit={handleSaveCaptainStats} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Playing Role & Specialty *</label>
                <input
                  type="text"
                  required
                  value={editCapSpecialty}
                  onChange={(e) => setEditCapSpecialty(e.target.value)}
                  placeholder="e.g. Pure Opening Batter, Batting All-Rounder"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono">
                <div>
                  <label className="block text-slate-400 mb-1">Matches</label>
                  <input
                    type="number"
                    value={editCapMatches}
                    onChange={(e) => setEditCapMatches(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Runs</label>
                  <input
                    type="number"
                    value={editCapRuns}
                    onChange={(e) => setEditCapRuns(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-amber-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Wickets</label>
                  <input
                    type="number"
                    value={editCapWickets}
                    onChange={(e) => setEditCapWickets(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditCaptainModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCaptainStats}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold uppercase"
                >
                  {savingCaptainStats ? 'Saving...' : 'Save Captain Stats'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE SQUAD MODAL */}
      {removingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-rose-600 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="font-heading text-xl font-bold text-white text-center">
              Remove Player from Squad?
            </h3>
            <p className="text-xs text-slate-300 text-center">
              Are you sure you want to remove <strong className="text-white">"{removingPlayer.player_name}"</strong> from your squad?
            </p>
            <textarea
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              placeholder="Specify reason for squad status update..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
            />
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setRemovingPlayer(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveSquadPlayer}
                disabled={isRemoving}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
              >
                {isRemoving ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
