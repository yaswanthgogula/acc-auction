/**
 * ============================================================================
 * ACC PLAYER OFFICIAL REGISTRATION PORTAL
 * ============================================================================
 * Supports:
 * - Normal player registration (with optional base price)
 * - Referral link registration (auto-identifies referral token, displays read-only Captain & Franchise,
 *   strictly hides base price field, base price forced NULL in backend, directly assigned to franchise)
 * - Dynamic Batting Profile (Position, Hand, Playing Type) for batting roles
 * - Dynamic Bowling Profile for bowling roles
 * - Role-specific performance statistics (Batting, Bowling, All-Rounder, Wicket-Keeper)
 * - Academic category derivation (1st Year B.Tech, 2nd Year B.Tech, 3rd Year B.Tech, 4th Year B.Tech, Diploma - D, PG - P)
 */

import React, { useState, useEffect, useRef } from 'react';
import { parseAvanthiRollNumber } from '../engine/acc-combined-engines';
import { PhotoCaptureModal } from '../components/PhotoCaptureModal';
import { formatAcademicCategory } from '../utils/academicCategories';
import {
  User,
  Camera,
  Upload,
  CheckCircle,
  AlertTriangle,
  Shield,
  FileCheck,
  Check,
  Lock,
  Eye,
  EyeOff,
  Activity,
  Award,
  Crown,
  Sparkles,
} from 'lucide-react';

interface PlayerRegisterProps {
  onNavigate: (route: string) => void;
  onOpenLogin?: (type?: 'PLAYER' | 'FRANCHISE' | 'ADMIN') => void;
}

export const PlayerRegister: React.FC<PlayerRegisterProps> = ({ onNavigate, onOpenLogin }) => {
  // Referral state
  const [referralToken, setReferralToken] = useState<string | null>(null);
  const [referralData, setReferralData] = useState<{
    valid: boolean;
    franchiseId: string;
    franchiseName: string;
    captainName: string;
    captainMobile?: string;
  } | null>(null);
  const [checkingReferral, setCheckingReferral] = useState(false);

  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Optional base price for normal players (strictly hidden for referred players)
  const [basePrice, setBasePrice] = useState<string>('20');

  // Player Role selection
  const [playerType, setPlayerType] = useState<'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER'>('ALL_ROUNDER');

  // Dynamic Batting Profile
  const [battingPosition, setBattingPosition] = useState<'Opener' | 'Middle Order' | 'Tailender' | 'Finisher'>('Middle Order');
  const [battingHand, setBattingHand] = useState<'Left Hand Batsman' | 'Right Hand Batsman'>('Right Hand Batsman');
  const [battingPlayingType, setBattingPlayingType] = useState<'Defence' | 'Radical' | 'Balanced' | 'Brute'>('Balanced');

  // Dynamic Bowling Profile
  const [bowlingProfile, setBowlingProfile] = useState<
    'Fast Bowler' | 'Medium Fast' | 'Fast Medium' | 'Spin' | 'Off Spin' | 'Leg Spin' | 'Left Arm Orthodox' | 'Right Arm Orthodox' | 'Chinaman'
  >('Fast Medium');

  // CricHeroes Link
  const [cricheroesLink, setCricheroesLink] = useState('');

  // Role-Based Statistics
  const [matchesPlayed, setMatchesPlayed] = useState('');
  const [inningsBatted, setInningsBatted] = useState('');
  const [runsScored, setRunsScored] = useState('');
  const [highestScore, setHighestScore] = useState('');
  const [battingAvg, setBattingAvg] = useState('');
  const [strikeRate, setStrikeRate] = useState('');
  const [fifties, setFifties] = useState('');
  const [hundreds, setHundreds] = useState('');
  const [oversBowled, setOversBowled] = useState('');
  const [wicketsTaken, setWicketsTaken] = useState('');
  const [bestBowling, setBestBowling] = useState('');
  const [bowlingAvg, setBowlingAvg] = useState('');
  const [bowlingEconomy, setBowlingEconomy] = useState('');
  const [threeWickets, setThreeWickets] = useState('');
  const [fiveWickets, setFiveWickets] = useState('');
  const [catches, setCatches] = useState('');
  const [stumpings, setStumpings] = useState('');

  // Photo
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [parsedInfo, setParsedInfo] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any | null>(null);

  // Detect referral token from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setReferralToken(ref.trim());
      validateReferralToken(ref.trim());
    }
  }, []);

  const validateReferralToken = async (token: string) => {
    setCheckingReferral(true);
    try {
      const res = await fetch(`/api/referrals/validate/${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.success && data.valid) {
        setReferralData({
          valid: true,
          franchiseId: data.franchiseId,
          franchiseName: data.franchiseName,
          captainName: data.captainName,
          captainMobile: data.captainMobile,
        });
      } else {
        setReferralData(null);
        setErrorMsg(data.error || 'Invalid or expired referral link.');
      }
    } catch {
      setReferralData(null);
    } finally {
      setCheckingReferral(false);
    }
  };

  useEffect(() => {
    if (rollNumber.trim().length >= 6) {
      const parsed = parseAvanthiRollNumber(rollNumber.trim());
      setParsedInfo(parsed);
    } else {
      setParsedInfo(null);
    }
  }, [rollNumber]);

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG/PNG/WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image file too large. Please select an image under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 360;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          setPhotoUrl(compressed);
        } else {
          setPhotoUrl(reader.result as string);
        }
        setErrorMsg(null);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const isBattingRelated = playerType === 'BATSMAN' || playerType === 'ALL_ROUNDER' || playerType === 'WICKET_KEEPER';
  const isBowlingRelated = playerType === 'BOWLER' || playerType === 'ALL_ROUNDER';
  const isWicketKeeper = playerType === 'WICKET_KEEPER';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!parsedInfo || !parsedInfo.valid) {
      setErrorMsg('Please enter a valid Avanthi roll number (college code 81 or 597).');
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 10) {
      setErrorMsg('A valid 10-digit mobile number is mandatory.');
      return;
    }
    if (!photoUrl) {
      setErrorMsg('Player photograph is required. Please capture via camera or upload from your gallery.');
      return;
    }
    if (!password.trim() || password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    setSubmitting(true);
    try {
      const statsPayload: any = {
        matches: matchesPlayed ? parseInt(matchesPlayed, 10) : 0,
        battingStyle: battingHand,
        bowlingStyle: isBowlingRelated ? bowlingProfile : 'None',
        battingPosition: isBattingRelated ? battingPosition : null,
        battingHand: isBattingRelated ? battingHand : null,
        battingPlayingType: isBattingRelated ? battingPlayingType : null,
        bowlingProfile: isBowlingRelated ? bowlingProfile : null,
      };

      if (isBattingRelated) {
        statsPayload.inningsBatted = inningsBatted ? parseInt(inningsBatted, 10) : 0;
        statsPayload.runs = runsScored ? parseInt(runsScored, 10) : 0;
        statsPayload.highestScore = highestScore || '-';
        statsPayload.battingAverage = battingAvg || '0.0';
        statsPayload.strikeRate = strikeRate || '0.0';
        statsPayload.fifties = fifties ? parseInt(fifties, 10) : 0;
        statsPayload.hundreds = hundreds ? parseInt(hundreds, 10) : 0;
      }

      if (isBowlingRelated) {
        statsPayload.oversBowled = oversBowled || '0';
        statsPayload.wickets = wicketsTaken ? parseInt(wicketsTaken, 10) : 0;
        statsPayload.bestBowling = bestBowling || '-';
        statsPayload.bowlingAverage = bowlingAvg || '0.0';
        statsPayload.economy = bowlingEconomy || '0.0';
        statsPayload.threeWickets = threeWickets ? parseInt(threeWickets, 10) : 0;
        statsPayload.fiveWickets = fiveWickets ? parseInt(fiveWickets, 10) : 0;
      }

      if (isWicketKeeper) {
        statsPayload.catches = catches ? parseInt(catches, 10) : 0;
        statsPayload.stumpings = stumpings ? parseInt(stumpings, 10) : 0;
      }

      const res = await fetch('/api/players/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editionId: 'ED_ACC_2026',
          name: name.trim(),
          rollNumber: rollNumber.trim().toUpperCase(),
          mobile: mobile.trim(),
          email: email.trim() || `${rollNumber.trim().toLowerCase()}@avanthi.edu.in`,
          password: password.trim(),
          playerType,
          role: playerType,
          skill: playerType,
          battingPosition: isBattingRelated ? battingPosition : null,
          battingHand: isBattingRelated ? battingHand : null,
          battingPlayingType: isBattingRelated ? battingPlayingType : null,
          battingStyle: battingHand,
          bowlingProfile: isBowlingRelated ? bowlingProfile : null,
          bowlingStyle: isBowlingRelated ? bowlingProfile : 'None',
          bowlingType: isBowlingRelated ? bowlingProfile : 'None',
          isWicketkeeper: playerType === 'WICKET_KEEPER',
          cricheroesLink: cricheroesLink.trim(),
          cricheroesUrl: cricheroesLink.trim(),
          photoUrl,
          stats: statsPayload,
          // CRITICAL: A referred player must NOT have a base price.
          // Do not send base price for referred player.
          basePrice: referralData?.valid ? null : (basePrice ? parseInt(basePrice, 10) : null),
          referralToken: referralData?.valid ? referralToken : null,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessInfo({
        playerId: data.playerId,
        name: name.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        bucket: data.derivedBucket || 'B1',
        academicCategoryLabel: formatAcademicCategory(data.derivedBucket),
        playerType: data.playerType || (playerType === 'BOWLER' ? 'Bowler' : playerType === 'BATSMAN' ? 'Batter' : playerType === 'WICKET_KEEPER' ? 'Wicket-Keeper' : 'All-Rounder'),
        isReferred: data.isReferred,
        referralFranchiseName: referralData?.franchiseName,
        referralCaptainName: referralData?.captainName,
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (successInfo) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-6 shadow-xl">
          <CheckCircle className="w-10 h-10" />
        </div>

        <h2 className="font-heading text-3xl font-black text-white uppercase tracking-tight">
          Registration Complete!
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md">
          {successInfo.isReferred
            ? `Your referral registration has been recorded and you are directly assigned to franchise ${successInfo.referralFranchiseName}!`
            : 'Your player dossier has been registered for the Avanthi Cricket Carnival 2026 Player Auction.'}
        </p>

        <div className="w-full mt-6 p-6 rounded-3xl bg-slate-900 border border-slate-800 text-left flex flex-col gap-3 font-mono text-xs shadow-xl">
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">Player ID:</span>
            <span className="text-cyan-300 font-bold">{successInfo.playerId}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">Name:</span>
            <span className="text-white font-bold">{successInfo.name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">Roll Number:</span>
            <span className="text-amber-300 font-bold">{successInfo.rollNumber}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">Academic Category:</span>
            <span className="text-amber-400 font-bold">{successInfo.academicCategoryLabel}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">Player Role:</span>
            <span className="text-white">{successInfo.playerType || 'All-Rounder'}</span>
          </div>

          {successInfo.isReferred ? (
            <>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Referred By Captain:</span>
                <span className="text-amber-300 font-bold">{successInfo.referralCaptainName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Assigned Franchise:</span>
                <span className="text-cyan-300 font-bold">{successInfo.referralFranchiseName}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Squad Assignment:</span>
                <span className="text-emerald-400 font-bold">Direct Franchise Squad (0 Pts / No Auction)</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between pt-1">
              <span className="text-slate-400">Auction Status:</span>
              <span className="text-emerald-400 font-bold">Registered & Eligible for Auction Floor</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full">
          <button
            onClick={() => {
              if (onOpenLogin) onOpenLogin('PLAYER');
              else onNavigate('/player/dashboard');
            }}
            className="w-full sm:flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-blue-950/50 flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" /> Log In as Player
          </button>
          <button
            onClick={() => onNavigate('/live')}
            className="w-full sm:flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            View Live Auction Floor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="font-heading text-3xl font-black text-white uppercase tracking-tight">
          Player Registration Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-lg mx-auto">
          Avanthi Cricket Carnival Official Registry. Valid roll numbers automatically derive academic tier category and quota compliance.
        </p>
      </div>

      {/* REFERRED BY FRANCHISE SECTION (LOCKED & READ-ONLY) */}
      {referralData && referralData.valid && (
        <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-500 shadow-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Referred By Franchise</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-mono font-bold uppercase">
              Locked Referral
            </span>
          </div>

          <p className="text-xs text-slate-300">
            You were referred directly by a franchise team captain. The details below are automatically populated from the referral link and are not editable. You will be directly assigned to this franchise squad without auction bidding.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Franchise Name:</span>
              <span className="text-amber-300 font-black text-base flex items-center gap-1.5 mt-0.5">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                {referralData.franchiseName}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Franchise Captain Name:</span>
              <span className="text-white font-black text-base flex items-center gap-1.5 mt-0.5">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                {referralData.captainName}
              </span>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col gap-4">
          <h2 className="font-heading text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            1. Identity & Roll Number Verification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                College Roll Number *
              </label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 23811A0501 or 24597-CM-015"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm uppercase placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                required
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Must contain college code (81 / 597)
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Full Name (Official) *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. V. Sai Teja"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Mobile Number (WhatsApp) *
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. player@avanthi.edu.in"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          {parsedInfo && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                parsedInfo.valid
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {parsedInfo.valid ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>{parsedInfo.branch ? `${parsedInfo.program} • ${parsedInfo.branch} (Year ${parsedInfo.academicYear})` : parsedInfo.error}</span>
              </div>
              {parsedInfo.valid && parsedInfo.bucket && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs">
                  {formatAcademicCategory(parsedInfo.bucket)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col gap-4">
          <h2 className="font-heading text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400" />
            2. Player Login Password
          </h2>
          <p className="text-xs text-slate-400">
            Create a password to log into your account and view your exact stats and team assignment.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Create Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Confirm Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col gap-4">
          <h2 className="font-heading text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            3. Player Photograph (Mandatory)
          </h2>
          <p className="text-xs text-slate-400">
            A clear front-facing photograph for your official player profile.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-32 h-32 rounded-2xl bg-slate-950 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {photoUrl ? (
                <img src={photoUrl} alt="Player" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-600" />
              )}
            </div>

            <div className="flex-1 flex flex-col gap-2.5 w-full">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCameraModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  Capture with Camera
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                >
                  <Upload className="w-4 h-4" />
                  Upload from Gallery
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGalleryUpload}
                  className="hidden"
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {photoUrl ? (
                  <span className="text-emerald-400 font-bold">✓ Photograph attached successfully.</span>
                ) : (
                  <span>Select camera capture or upload an image file from your device gallery.</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col gap-5">
          <h2 className="font-heading text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            4. Player Role & Dynamic Cricket Profile
          </h2>

          <div>
            <label className="block text-slate-300 font-bold mb-1.5 text-xs">
              Select Primary Role *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { id: 'BATSMAN', label: 'Batter / Batsman' },
                { id: 'BOWLER', label: 'Bowler' },
                { id: 'ALL_ROUNDER', label: 'All-Rounder' },
                { id: 'WICKET_KEEPER', label: 'Wicket-Keeper' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setPlayerType(r.id as any)}
                  className={`py-2.5 px-3 rounded-xl font-bold transition cursor-pointer border ${
                    playerType === r.id
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {isBattingRelated && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-blue-500/40 flex flex-col gap-3">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Batting Profile Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Batting Position</label>
                  <select
                    value={battingPosition}
                    onChange={(e) => setBattingPosition(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                  >
                    <option value="Opener">Opener</option>
                    <option value="Middle Order">Middle Order</option>
                    <option value="Tailender">Tailender</option>
                    <option value="Finisher">Finisher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Batting Hand</label>
                  <select
                    value={battingHand}
                    onChange={(e) => setBattingHand(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                  >
                    <option value="Right Hand Batsman">Right Hand Batsman</option>
                    <option value="Left Hand Batsman">Left Hand Batsman</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Playing Type</label>
                  <select
                    value={battingPlayingType}
                    onChange={(e) => setBattingPlayingType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                  >
                    <option value="Defence">Defence</option>
                    <option value="Radical">Radical</option>
                    <option value="Balanced">Balanced</option>
                    <option value="Brute">Brute</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {isBowlingRelated && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 flex flex-col gap-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Bowling Profile Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Bowling Style</label>
                  <select
                    value={bowlingProfile}
                    onChange={(e) => setBowlingProfile(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                  >
                    <option value="Fast Bowler">Fast Bowler</option>
                    <option value="Medium Fast">Medium Fast</option>
                    <option value="Fast Medium">Fast Medium</option>
                    <option value="Spin">Spin</option>
                    <option value="Off Spin">Off Spin</option>
                    <option value="Leg Spin">Leg Spin</option>
                    <option value="Left Arm Orthodox">Left Arm Orthodox</option>
                    <option value="Right Arm Orthodox">Right Arm Orthodox</option>
                    <option value="Chinaman">Chinaman</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* BASE PRICE LOGIC:
              A referred player must NOT have a base price.
              Do NOT show the base-price field to a referred player during registration.
              Do NOT allow a referred player to set or enter a base price. */}
          {!referralData?.valid ? (
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-bold text-xs uppercase tracking-wider font-mono">
                  Base Price (Optional)
                </label>
                <span className="text-[10px] text-amber-400 font-mono">
                  Normal Player Optional Field
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                You may optionally choose your starting base price or leave it empty.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                {[
                  { val: '20', label: '20 Pts (₹)' },
                  { val: '30', label: '30 Pts (₹)' },
                  { val: '40', label: '40 Pts (₹)' },
                  { val: '50', label: '50 Pts (₹)' },
                  { val: '80', label: '80 Pts (₹)' },
                  { val: '100', label: '100 Pts (₹)' },
                  { val: '', label: 'Leave Empty' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setBasePrice(item.val)}
                    className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                      basePrice === item.val
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Exact Stats Entry (Will be visible to player and everyone) */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3 font-mono">
              Performance Statistics (Entered exactly by you)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Matches Played</label>
                <input
                  type="number"
                  value={matchesPlayed}
                  onChange={(e) => setMatchesPlayed(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              {isBattingRelated && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Innings Batted</label>
                    <input
                      type="number"
                      value={inningsBatted}
                      onChange={(e) => setInningsBatted(e.target.value)}
                      placeholder="e.g. 14"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Total Runs</label>
                    <input
                      type="number"
                      value={runsScored}
                      onChange={(e) => setRunsScored(e.target.value)}
                      placeholder="e.g. 420"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Highest Score</label>
                    <input
                      type="text"
                      value={highestScore}
                      onChange={(e) => setHighestScore(e.target.value)}
                      placeholder="e.g. 84*"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Batting Average</label>
                    <input
                      type="text"
                      value={battingAvg}
                      onChange={(e) => setBattingAvg(e.target.value)}
                      placeholder="e.g. 35.0"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Strike Rate</label>
                    <input
                      type="text"
                      value={strikeRate}
                      onChange={(e) => setStrikeRate(e.target.value)}
                      placeholder="e.g. 142.5"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">50s / 100s</label>
                    <input
                      type="text"
                      value={fifties}
                      onChange={(e) => setFifties(e.target.value)}
                      placeholder="e.g. 3 / 0"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </>
              )}

              {isBowlingRelated && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Overs Bowled</label>
                    <input
                      type="text"
                      value={oversBowled}
                      onChange={(e) => setOversBowled(e.target.value)}
                      placeholder="e.g. 48.2"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Wickets Taken</label>
                    <input
                      type="number"
                      value={wicketsTaken}
                      onChange={(e) => setWicketsTaken(e.target.value)}
                      placeholder="e.g. 18"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Best Bowling</label>
                    <input
                      type="text"
                      value={bestBowling}
                      onChange={(e) => setBestBowling(e.target.value)}
                      placeholder="e.g. 4/18"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Economy Rate</label>
                    <input
                      type="text"
                      value={bowlingEconomy}
                      onChange={(e) => setBowlingEconomy(e.target.value)}
                      placeholder="e.g. 6.2"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Bowling Average</label>
                    <input
                      type="text"
                      value={bowlingAvg}
                      onChange={(e) => setBowlingAvg(e.target.value)}
                      placeholder="e.g. 16.5"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </>
              )}

              {isWicketKeeper && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Catches Taken</label>
                    <input
                      type="number"
                      value={catches}
                      onChange={(e) => setCatches(e.target.value)}
                      placeholder="e.g. 12"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Stumpings</label>
                    <input
                      type="number"
                      value={stumpings}
                      onChange={(e) => setStumpings(e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1 text-xs">
              CricHeroes Profile Link or Registered Mobile
            </label>
            <input
              type="text"
              value={cricheroesLink}
              onChange={(e) => setCricheroesLink(e.target.value)}
              placeholder="e.g. https://cricheroes.in/player-profile/XXXXXX or mobile number"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider transition cursor-pointer shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2"
        >
          <FileCheck className="w-5 h-5" />
          {submitting ? 'Submitting Registration...' : 'Complete Player Registration'}
        </button>
      </form>

      <PhotoCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onPhotoSelected={(imgData: string) => {
          setPhotoUrl(imgData);
          setShowCameraModal(false);
          setErrorMsg(null);
        }}
      />
    </div>
  );
};
