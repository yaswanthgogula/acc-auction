/**
 * ============================================================================
 * ACC PLAYER OFFICIAL REGISTRATION PORTAL
 * ============================================================================
 * Implements:
 * - Requirement 9: Two-Phase Registration (Phase 1 Basic + OTP -> Phase 2 Profile & Stats)
 * - Requirement 3: Detained student logic (Detained in current year -> placed into previous year's bucket)
 * - Requirement 10: Profile picture restrictions (face validation + plain background + configurable size)
 * - Requirement 8: Approval state workflow (Submitted -> Admin Review -> Admin Approval)
 * - Preserves referral link auto-attachment and 0-base-price direct franchise assignment
 */

import React, { useState, useEffect, useRef } from 'react';
import { parseAvanthiRollNumber } from '../engine/acc-combined-engines';
import { PhotoCaptureModal } from '../components/PhotoCaptureModal';
import { formatAcademicCategory, deriveEffectiveBucket } from '../utils/academicCategories';
import { validatePlayerProfilePicture } from '../utils/imageValidation';
import { mobileNotification } from '../utils/mobileNotification';
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
  Smartphone,
  KeyRound,
  ArrowRight,
  X,
} from 'lucide-react';

interface PlayerRegisterProps {
  onNavigate: (route: string) => void;
  onOpenLogin?: (type?: 'PLAYER' | 'FRANCHISE' | 'ADMIN') => void;
}

export const PlayerRegister: React.FC<PlayerRegisterProps> = ({ onNavigate, onOpenLogin }) => {
  // Registration Phase: 1 (Basic + OTP) or 2 (Detailed Profile & Stats)
  const [currentPhase, setCurrentPhase] = useState<1 | 2>(1);
  const [createdPlayerId, setCreatedPlayerId] = useState<string | null>(null);

  // Referral state
  const [referralToken, setReferralToken] = useState<string | null>(null);
  const [referralData, setReferralData] = useState<{
    valid: boolean;
    franchiseId: string;
    franchiseName: string;
    captainName: string;
    captainMobile?: string;
  } | null>(null);

  // Phase 1 Fields
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPhase1Choice, setShowPhase1Choice] = useState(false);

  // Phase 2 Fields (Requirement 3: Detained status)
  const [isDetained, setIsDetained] = useState<boolean>(false);
  const [playerType, setPlayerType] = useState<'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER'>('ALL_ROUNDER');

  // Dynamic Batting Profile
  const [battingPosition, setBattingPosition] = useState<'Opener' | 'Middle Order' | 'Tailender' | 'Finisher'>('Middle Order');
  const [battingHand, setBattingHand] = useState<'Left Hand Batsman' | 'Right Hand Batsman'>('Right Hand Batsman');
  const [battingPlayingType, setBattingPlayingType] = useState<'Defence' | 'Radical' | 'Balanced' | 'Brute'>('Balanced');

  // Dynamic Bowling Profile
  const [bowlingProfile, setBowlingProfile] = useState<
    'Fast Bowler' | 'Medium Fast' | 'Fast Medium' | 'Spin' | 'Off Spin' | 'Leg Spin' | 'Left Arm Orthodox' | 'Right Arm Orthodox' | 'Chinaman'
  >('Fast Medium');

  // CricHeroes Link & Stats
  const [cricheroesLink, setCricheroesLink] = useState('');
  const [basePrice, setBasePrice] = useState<string>('20');
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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setReferralToken(ref.trim());
      validateReferralToken(ref.trim());
    }
  }, []);

  const validateReferralToken = async (token: string) => {
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
      }
    } catch {}
  };

  useEffect(() => {
    if (rollNumber.trim().length >= 6) {
      const parsed = parseAvanthiRollNumber(rollNumber.trim(), isDetained);
      setParsedInfo(parsed);
    } else {
      setParsedInfo(null);
    }
  }, [rollNumber, isDetained]);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const validation = await validatePlayerProfilePicture(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Photo did not meet tournament regulations.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
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
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setPhotoUrl(compressed);
        } else {
          setPhotoUrl(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const isBattingRelated = playerType === 'BATSMAN' || playerType === 'ALL_ROUNDER' || playerType === 'WICKET_KEEPER';
  const isBowlingRelated = playerType === 'BOWLER' || playerType === 'ALL_ROUNDER';
  const isWicketKeeper = playerType === 'WICKET_KEEPER';

  const handleSubmitPhase1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!parsedInfo || !parsedInfo.valid) {
      setErrorMsg('Please enter a valid Avanthi roll number.');
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 10) {
      setErrorMsg('A valid 10-digit mobile number is mandatory.');
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
      const res = await fetch('/api/players/register-phase1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          rollNumber: rollNumber.trim().toUpperCase(),
          mobileNumber: mobile.trim(),
          password: password.trim(),
          isDetained,
          referralToken: referralData?.valid ? referralToken : null,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Phase 1 registration failed.');
      }

      setCreatedPlayerId(data.playerId);
      setShowPhase1Choice(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPhase2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!createdPlayerId) {
      setErrorMsg('Please complete Phase 1 basic registration first.');
      return;
    }
    if (!photoUrl) {
      setErrorMsg('Player photograph is required for Phase 2. Please capture via camera or upload.');
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

      const res = await fetch('/api/players/submit-phase2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: createdPlayerId,
          photoUrl,
          isDetained,
          playerType,
          role: playerType,
          skill: playerType,
          battingPosition: isBattingRelated ? battingPosition : null,
          battingHand: isBattingRelated ? battingHand : null,
          battingPlayingType: isBattingRelated ? battingPlayingType : null,
          bowlingProfile: isBowlingRelated ? bowlingProfile : null,
          stats: statsPayload,
          cricheroesLink: cricheroesLink.trim(),
          basePrice: referralData?.valid ? null : (basePrice ? parseInt(basePrice, 10) : null),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit Phase 2.');
      }

      setSuccessInfo({
        playerId: createdPlayerId,
        name: name.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        bucket: data.effectiveBucket,
        academicCategoryLabel: data.academicCategoryLabel,
        isDetained,
        isReferred: referralData?.valid,
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
          Registration & Profile Submitted!
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md">
          {successInfo.isReferred
            ? `Your referral registration has been recorded and you are directly assigned to franchise ${successInfo.referralFranchiseName}!`
            : 'Your detailed dossier & cricket stats have been submitted. As per tournament regulations, your profile is now under Admin Review for final auction eligibility.'}
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
            <span className="text-slate-400">Detained Status:</span>
            <span className={`font-bold ${successInfo.isDetained ? 'text-amber-400' : 'text-slate-400'}`}>
              {successInfo.isDetained ? 'YES (Placed into previous year\'s bucket)' : 'NO (Regular bucket)'}
            </span>
          </div>

          <div className="flex justify-between pt-1">
            <span className="text-slate-400">Approval State:</span>
            <span className="text-amber-400 font-bold">PENDING ADMIN APPROVAL</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full">
          <button
            onClick={() => {
              if (onOpenLogin) onOpenLogin('PLAYER');
              else onNavigate('/player/dashboard');
            }}
            className="w-full sm:flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" /> Go to Player Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold mb-3">
          <div className={`px-4 py-1.5 rounded-xl flex items-center gap-1.5 ${currentPhase === 1 ? 'bg-amber-500 text-slate-950 font-black' : 'text-emerald-400'}`}>
            <span>Phase 1: Basic Information</span>
            {currentPhase === 2 && <Check className="w-3.5 h-3.5" />}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          <div className={`px-4 py-1.5 rounded-xl flex items-center gap-1.5 ${currentPhase === 2 ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-500'}`}>
            <span>Phase 2: Profile & Stats</span>
          </div>
        </div>

        <h1 className="font-heading text-3xl font-black text-white uppercase tracking-tight">
          {currentPhase === 1 ? 'Phase 1: Basic Registration' : 'Phase 2: Detailed Profile & Cricket Stats'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-lg mx-auto">
          {currentPhase === 1
            ? 'Provide basic account credentials to register for the tournament.'
            : 'Complete your cricket role, match statistics, academic year & photo for Admin approval.'}
        </p>
      </div>

      {referralData && referralData.valid && (
        <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-purple-950/80 border-2 border-purple-500 shadow-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-black uppercase tracking-wider">
              <Award className="w-4 h-4 text-purple-400" />
              <span>Referred Player Registration</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-500 text-slate-950 text-[10px] font-mono font-bold uppercase">
              Locked Referral
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-purple-500/40 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Franchise Name:</span>
              <span className="text-purple-300 font-black text-base flex items-center gap-1.5 mt-0.5">
                <Award className="w-4 h-4 text-purple-400 shrink-0" />
                {referralData.franchiseName}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Franchise Captain:</span>
              <span className="text-white font-black text-base flex items-center gap-1.5 mt-0.5">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                {referralData.captainName}
              </span>
            </div>
          </div>
        </div>
      )}

      {showPhase1Choice && (
        <div className="mb-6 p-6 rounded-3xl bg-slate-900 border-2 border-amber-500 shadow-2xl flex flex-col gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-black text-white uppercase tracking-tight">
                Phase 1 Registration Completed!
              </h2>
              <p className="text-xs text-slate-300">
                Your account credentials have been created with roll number <strong>{rollNumber}</strong>.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-amber-300 block mb-1">Requirement 9: Two-Phase Workflow</span>
            You can either complete Phase 2 now (profile photo, detained status check, and cricket statistics) or log in later from the dashboard to finish your profile.
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowPhase1Choice(false);
                setCurrentPhase(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full sm:flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
            >
              <span>Complete Phase 2 Profile Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenLogin) onOpenLogin('PLAYER');
                else onNavigate('/player/dashboard');
              }}
              className="w-full sm:flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Log In & Finish Later
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {currentPhase === 1 && !showPhase1Choice && (
        <form onSubmit={handleSubmitPhase1} className="flex flex-col gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col gap-4">
            <h2 className="font-heading text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              1. Basic Information & Mobile Verification
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
            </div>

            {parsedInfo && (
              <div className="flex flex-col gap-3">
                <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${parsedInfo.valid ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-amber-950/40 border-amber-800/60 text-amber-300'}`}>
                  <div className="flex items-center gap-2.5">
                    {parsedInfo.valid ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                    <span>{parsedInfo.branch ? `${parsedInfo.program} • ${parsedInfo.branch} (Year ${parsedInfo.academicYear})` : parsedInfo.error}</span>
                  </div>
                </div>

                {parsedInfo.valid && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-700/80 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-white font-bold text-sm block flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-amber-400" />
                          Have you been detained in any academic year? *
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Tournament Regulation: If detained, your auction tier is automatically deduced to the lower bucket by 1.
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsDetained(false)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer border ${
                            !isDetained
                              ? 'bg-slate-800 text-white border-slate-600 shadow'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          No (Regular)
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDetained(true)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer border ${
                            isDetained
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-950/50'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-amber-400'
                          }`}
                        >
                          Yes (Detained)
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Calculated Bucket:</span>
                        <span className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-black text-xs">
                          {parsedInfo.academicCategoryLabel}
                        </span>
                      </div>
                      {isDetained && parsedInfo.originalLabel && (
                        <span className="text-amber-400 text-[11px] font-bold">
                          ⚠️ Deduced to lower bucket by 1 ({parsedInfo.originalLabel} ➔ {parsedInfo.academicCategoryLabel})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                2. Account Password
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Create Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 4 characters"
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
                <label className="block text-slate-300 font-bold mb-1">Confirm Password *</label>
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition cursor-pointer shadow-xl flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/50"
          >
            <span>{submitting ? 'Creating Account...' : 'Complete Phase 1 & Proceed to Profile'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {currentPhase === 2 && (
        <form onSubmit={handleSubmitPhase2} className="flex flex-col gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col gap-4">
            <h2 className="font-heading text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              1. Academic & Detained Status (Requirement 3)
            </h2>

            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-white font-bold text-sm block">Are you detained in your current academic year?</span>
                  <span className="text-[11px] text-slate-400">
                    Rule: If detained, your auction tier is deduced to the lower bucket by 1.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsDetained(false)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer border ${
                      !isDetained
                        ? 'bg-slate-800 text-white border-slate-600 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    No (Regular)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDetained(true)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer border ${
                      isDetained
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-950/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-amber-400'
                    }`}
                  >
                    Yes (Detained)
                  </button>
                </div>
              </div>

              {parsedInfo && (
                <div className="pt-2 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Effective Auction Bucket:</span>
                    <span className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-black text-xs">
                      {parsedInfo.academicCategoryLabel}
                    </span>
                  </div>
                  {isDetained && parsedInfo.originalLabel && (
                    <span className="text-amber-400 text-[11px] font-bold">
                      ⚠️ Deduced to lower bucket by 1 ({parsedInfo.originalLabel} ➔ {parsedInfo.academicCategoryLabel})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col gap-4">
            <h2 className="font-heading text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              2. Player Photograph (Requirement 10: Validated Face & Plain Background)
            </h2>

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
                    className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
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
                <span className="text-[11px] text-slate-400">
                  {photoUrl ? <strong className="text-emerald-400">✓ Photograph compliant and attached.</strong> : 'Front-facing portrait with clear face and plain background.'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col gap-5">
            <h2 className="font-heading text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              3. Player Role & Dynamic Cricket Profile
            </h2>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5 text-xs">Select Primary Role *</label>
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
              <div className="p-4 rounded-2xl bg-slate-950 border border-blue-500/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Batting Position</label>
                  <select
                    value={battingPosition}
                    onChange={(e) => setBattingPosition(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="Defence">Defence</option>
                    <option value="Radical">Radical</option>
                    <option value="Balanced">Balanced</option>
                    <option value="Brute">Brute</option>
                  </select>
                </div>
              </div>
            )}

            {isBowlingRelated && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 text-xs">
                <label className="block text-slate-300 font-bold mb-1">Bowling Style</label>
                <select
                  value={bowlingProfile}
                  onChange={(e) => setBowlingProfile(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
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
            )}

            {!referralData?.valid && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 flex flex-col gap-2">
                <label className="block text-slate-300 font-bold text-xs uppercase font-mono">
                  Base Price (Optional)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['20', '30', '40', '50', '80', '100', ''].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBasePrice(val)}
                      className={`py-2 px-3 rounded-lg text-xs font-mono font-bold border ${
                        basePrice === val ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      {val ? `${val} Pts (₹)` : 'Leave Empty'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3 font-mono">
                Career Performance Statistics
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
                  </>
                )}

                {isBowlingRelated && (
                  <>
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
                      <label className="block text-slate-400 text-[11px] mb-1">Economy</label>
                      <input
                        type="text"
                        value={bowlingEconomy}
                        onChange={(e) => setBowlingEconomy(e.target.value)}
                        placeholder="e.g. 6.2"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1 text-xs">CricHeroes Link (Optional)</label>
              <input
                type="text"
                value={cricheroesLink}
                onChange={(e) => setCricheroesLink(e.target.value)}
                placeholder="https://cricheroes.in/..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider transition cursor-pointer shadow-xl flex items-center justify-center gap-2"
          >
            <FileCheck className="w-5 h-5" />
            <span>{submitting ? 'Submitting for Admin Review...' : 'Submit Profile for Admin Review'}</span>
          </button>
        </form>
      )}

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
