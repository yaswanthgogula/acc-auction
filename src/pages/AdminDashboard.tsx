/**
 * ============================================================================
 * ACC SUPER ADMIN COMMAND PORTAL
 * ============================================================================
 * Features:
 * - Live Auction Action Desk: Random Draw (preserved) + Guest Draw Mode trigger + Timer Controls
 * - Custom Time Broadcast Notice Alert (set any custom time e.g. 5m, 10m, 15m, 30m)
 * - Mobile notification alert delivery indicator
 * - Franchise registration with Captain & Vice Captain: Name, Mobile, Role, and Stats based on role
 * - Admin capability to regenerate both new Login ID and Password for franchise leaders
 * - Dedicated REFERRED PLAYERS section for cross-checking: PLAYER -> REFERRED BY CAPTAIN -> FRANCHISE
 * - Complete player dossier modal displaying exact stats mentioned during registration
 * - Admin Squad Visibility: Active Squad & Safely Removed Players history
 * - Single player & franchise deletion (Admin only)
 * - 31 Official Acceptance Tests execution
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuction } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { GuestDrawModal } from '../components/GuestDrawModal';
import { formatAcademicCategory } from '../utils/academicCategories';
import {
  Crown,
  Gavel,
  Users,
  AlertTriangle,
  RotateCcw,
  Play,
  Award,
  FileCheck,
  Shield,
  Activity,
  Terminal,
  Trash2,
  Key,
  Copy,
  RefreshCw,
  Eye,
  Clock,
  Bell,
  Send,
  Megaphone,
  Phone,
  Search,
  UserPlus,
  ShieldCheck,
  X,
  Trophy,
  Sparkles,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, login } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'OPERATOR';

  const [adminGateUsername, setAdminGateUsername] = useState('');
  const [adminGatePassword, setAdminGatePassword] = useState('');
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  const {
    currentLot,
    franchises,
    editionId,
    serverTime,
    strikeHammer,
    drawNextPlayer,
    skipCurrentLot,
    undoSale,
    placeBid,
    refreshState,
    adjustTimer,
    resetTimer,
    sendAuctionNotification,
    fetchPlayers,
    regenerateFranchiseCredentials,
  } = useAuction();

  // Guest Draw Modal
  const [showGuestDrawModal, setShowGuestDrawModal] = useState(false);

  // Broadcast Notice with Custom Time Alert
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMinutes, setBroadcastMinutes] = useState<number>(10);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);

  // Admin Dashboard Tabs
  const [activeTab, setActiveTab] = useState<'AUCTION' | 'PLAYERS' | 'REFERRALS' | 'FRANCHISES' | 'SQUADS' | 'ADMIN_ACCOUNTS' | 'TESTS' | 'AUDIT'>('AUCTION');
  const [players, setPlayers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any | null>(null);
  const [runningTests, setRunningTests] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Safe undo state
  const [undoSaleId, setUndoSaleId] = useState('');
  const [undoReason, setUndoReason] = useState('');
  const [showUndoModal, setShowUndoModal] = useState(false);

  // Dedicated Referred Players state
  const [referredPlayersList, setReferredPlayersList] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  // All Squads visibility state
  const [allSquads, setAllSquads] = useState<any[]>([]);
  const [loadingSquads, setLoadingSquads] = useState(false);

  // Franchise registration state
  const [newFranchiseName, setNewFranchiseName] = useState('');
  const [newCoordinator, setNewCoordinator] = useState('');
  const [newCoordinatorBranch, setNewCoordinatorBranch] = useState('CSE');
  const [newCoordinatorMobile, setNewCoordinatorMobile] = useState('');

  // CAPTAIN: Name, Mobile, Role, and Stats based on role
  const [newCaptainName, setNewCaptainName] = useState('');
  const [newCaptainMobile, setNewCaptainMobile] = useState('');
  const [newCaptainRole, setNewCaptainRole] = useState<'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER'>('ALL_ROUNDER');
  const [newCaptainMatches, setNewCaptainMatches] = useState<number>(15);
  const [newCaptainInnings, setNewCaptainInnings] = useState<number>(14);
  const [newCaptainRuns, setNewCaptainRuns] = useState<number>(420);
  const [newCaptainHighScore, setNewCaptainHighScore] = useState<string>('78*');
  const [newCaptainBatAvg, setNewCaptainBatAvg] = useState<string>('35.0');
  const [newCaptainSR, setNewCaptainSR] = useState<string>('142.5');
  const [newCaptainOvers, setNewCaptainOvers] = useState<string>('42.0');
  const [newCaptainWickets, setNewCaptainWickets] = useState<number>(14);
  const [newCaptainBestBowl, setNewCaptainBestBowl] = useState<string>('3/22');
  const [newCaptainEcon, setNewCaptainEcon] = useState<string>('6.5');
  const [newCaptainCatches, setNewCaptainCatches] = useState<number>(8);
  const [newCaptainStumpings, setNewCaptainStumpings] = useState<number>(2);

  // VICE CAPTAIN: Name, Mobile, Role, and Stats based on role
  const [newViceCaptainName, setNewViceCaptainName] = useState('');
  const [newViceCaptainMobile, setNewViceCaptainMobile] = useState('');
  const [newViceCaptainRole, setNewViceCaptainRole] = useState<'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER'>('ALL_ROUNDER');
  const [newViceCaptainMatches, setNewViceCaptainMatches] = useState<number>(14);
  const [newViceCaptainInnings, setNewViceCaptainInnings] = useState<number>(12);
  const [newViceCaptainRuns, setNewViceCaptainRuns] = useState<number>(280);
  const [newViceCaptainHighScore, setNewViceCaptainHighScore] = useState<string>('54');
  const [newViceCaptainBatAvg, setNewViceCaptainBatAvg] = useState<string>('28.0');
  const [newViceCaptainSR, setNewViceCaptainSR] = useState<string>('135.0');
  const [newViceCaptainOvers, setNewViceCaptainOvers] = useState<string>('48.0');
  const [newViceCaptainWickets, setNewViceCaptainWickets] = useState<number>(18);
  const [newViceCaptainBestBowl, setNewViceCaptainBestBowl] = useState<string>('4/18');
  const [newViceCaptainEcon, setNewViceCaptainEcon] = useState<string>('6.2');
  const [newViceCaptainCatches, setNewViceCaptainCatches] = useState<number>(6);
  const [newViceCaptainStumpings, setNewViceCaptainStumpings] = useState<number>(0);

  // Regenerated credentials modal
  const [credentialsModal, setCredentialsModal] = useState<{
    franchiseId: string;
    username: string;
    password: string;
    name: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [adminList, setAdminList] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminConfirmPassword, setNewAdminConfirmPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'SUPER_ADMIN' | 'OPERATOR'>('SUPER_ADMIN');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Search & filter for player queue
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [playerBucketFilter, setPlayerBucketFilter] = useState('ALL');
  const [playerRoleFilter, setPlayerRoleFilter] = useState('ALL');
  const [selectedPlayerDossier, setSelectedPlayerDossier] = useState<any | null>(null);
  const [selectedFranchiseDossier, setSelectedFranchiseDossier] = useState<any | null>(null);

  // Deletion modals
  const [confirmDeleteFranchise, setConfirmDeleteFranchise] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingFranchise, setIsDeletingFranchise] = useState(false);
  const [confirmDeletePlayer, setConfirmDeletePlayer] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingPlayer, setIsDeletingPlayer] = useState(false);
  const [showRemoveAllPlayersModal, setShowRemoveAllPlayersModal] = useState(false);
  const [isRemovingAllPlayers, setIsRemovingAllPlayers] = useState(false);
  const [showRemoveAllFranchisesModal, setShowRemoveAllFranchisesModal] = useState(false);
  const [isRemovingAllFranchises, setIsRemovingAllFranchises] = useState(false);
  const [showResetSystemModal, setShowResetSystemModal] = useState(false);
  const [isResettingSystem, setIsResettingSystem] = useState(false);

  const loadPlayers = useCallback(
    async (force = false) => {
      try {
        const data = await fetchPlayers({ force, editionId });
        if (Array.isArray(data)) {
          setPlayers(data);
        }
      } catch {}
    },
    [fetchPlayers, editionId]
  );

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit/logs');
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
      }
    } catch {}
  };

  const loadReferrals = useCallback(async () => {
    try {
      setLoadingReferrals(true);
      const res = await fetch('/api/admin/referrals', {
        headers: {
          'x-user-role': user?.role || 'SUPER_ADMIN',
          'x-user-id': user?.id || '',
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.referredPlayers)) {
        setReferredPlayersList(data.referredPlayers);
      }
    } catch {} finally {
      setLoadingReferrals(false);
    }
  }, [user]);

  const loadAllSquads = useCallback(async () => {
    try {
      setLoadingSquads(true);
      const res = await fetch('/api/admin/squads');
      const data = await res.json();
      if (data.success && Array.isArray(data.squads)) {
        setAllSquads(data.squads);
      }
    } catch {} finally {
      setLoadingSquads(false);
    }
  }, []);

  const loadAdmins = useCallback(async () => {
    try {
      setLoadingAdmins(true);
      const res = await fetch('/api/admin/admins', {
        headers: {
          'x-user-role': user?.role || 'SUPER_ADMIN',
          'x-user-id': user?.id || '',
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.admins)) {
        setAdminList(data.admins);
      }
    } catch {} finally {
      setLoadingAdmins(false);
    }
  }, [user]);

  useEffect(() => {
    loadPlayers();
    loadAuditLogs();
    if (isAdmin) {
      loadAdmins();
      loadReferrals();
      loadAllSquads();
    }
  }, [editionId, loadPlayers, isAdmin, loadAdmins, loadReferrals, loadAllSquads]);

  // Requirement 4: Capability to regenerate both new login id and password for franchise leaders
  const handleRegenerateCredentials = async (franchiseId: string) => {
    setActionError(null);
    try {
      const res = await regenerateFranchiseCredentials(franchiseId);
      if (!res.success) {
        throw new Error(res.error || 'Failed to regenerate credentials.');
      }
      setCredentialsModal(res.credentials);
      setActionMessage('New Login ID and Password generated successfully!');
      refreshState({ force: true });
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleVerifyPlayer = async (playerId: string, updates: any) => {
    try {
      setActionError(null);
      const res = await fetch('/api/admin/verify-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, ...updates, actor: user?.username || 'SuperAdmin' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActionMessage('Player verification updated successfully.');
      loadPlayers(true);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!newAdminUsername.trim() || !newAdminPassword.trim()) {
      setActionError('Admin username and password are required.');
      return;
    }
    if (newAdminPassword !== newAdminConfirmPassword) {
      setActionError('Passwords do not match.');
      return;
    }
    setCreatingAdmin(true);
    try {
      const res = await fetch('/api/auth/register-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'SUPER_ADMIN',
          'x-user-id': user?.id || '',
          'x-user-username': user?.username || 'Admin',
        },
        body: JSON.stringify({
          username: newAdminUsername.trim(),
          password: newAdminPassword.trim(),
          confirmPassword: newAdminConfirmPassword.trim(),
          email: newAdminEmail.trim(),
          role: newAdminRole,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActionMessage(`Admin account '${newAdminUsername}' provisioned successfully!`);
      setNewAdminUsername('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminConfirmPassword('');
      loadAdmins();
      loadAuditLogs();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Requirement 3: Replace Captain's place with captain name, mobile, player role, and stats based on role
  // Same for vice captain also for both!
  const handleCreateFranchise = async () => {
    if (!newFranchiseName.trim()) return;
    try {
      setActionError(null);

      // Prepare captain stats based on role
      const captainStatsPayload: any = {
        role: newCaptainRole,
        matches: newCaptainMatches,
      };
      if (newCaptainRole === 'BATSMAN' || newCaptainRole === 'ALL_ROUNDER' || newCaptainRole === 'WICKET_KEEPER') {
        captainStatsPayload.innings = newCaptainInnings;
        captainStatsPayload.runs = newCaptainRuns;
        captainStatsPayload.highestScore = newCaptainHighScore;
        captainStatsPayload.battingAverage = newCaptainBatAvg;
        captainStatsPayload.strikeRate = newCaptainSR;
      }
      if (newCaptainRole === 'BOWLER' || newCaptainRole === 'ALL_ROUNDER') {
        captainStatsPayload.overs = newCaptainOvers;
        captainStatsPayload.wickets = newCaptainWickets;
        captainStatsPayload.bestBowling = newCaptainBestBowl;
        captainStatsPayload.economy = newCaptainEcon;
      }
      if (newCaptainRole === 'WICKET_KEEPER') {
        captainStatsPayload.catches = newCaptainCatches;
        captainStatsPayload.stumpings = newCaptainStumpings;
      }

      // Prepare vice captain stats based on role
      const viceCaptainStatsPayload: any = {
        role: newViceCaptainRole,
        matches: newViceCaptainMatches,
      };
      if (newViceCaptainRole === 'BATSMAN' || newViceCaptainRole === 'ALL_ROUNDER' || newViceCaptainRole === 'WICKET_KEEPER') {
        viceCaptainStatsPayload.innings = newViceCaptainInnings;
        viceCaptainStatsPayload.runs = newViceCaptainRuns;
        viceCaptainStatsPayload.highestScore = newViceCaptainHighScore;
        viceCaptainStatsPayload.battingAverage = newViceCaptainBatAvg;
        viceCaptainStatsPayload.strikeRate = newViceCaptainSR;
      }
      if (newViceCaptainRole === 'BOWLER' || newViceCaptainRole === 'ALL_ROUNDER') {
        viceCaptainStatsPayload.overs = newViceCaptainOvers;
        viceCaptainStatsPayload.wickets = newViceCaptainWickets;
        viceCaptainStatsPayload.bestBowling = newViceCaptainBestBowl;
        viceCaptainStatsPayload.economy = newViceCaptainEcon;
      }
      if (newViceCaptainRole === 'WICKET_KEEPER') {
        viceCaptainStatsPayload.catches = newViceCaptainCatches;
        viceCaptainStatsPayload.stumpings = newViceCaptainStumpings;
      }

      const res = await fetch('/api/franchises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'SUPER_ADMIN',
          'x-user-id': user?.id || '',
          'x-user-username': user?.username || 'SuperAdmin',
        },
        body: JSON.stringify({
          editionId,
          name: newFranchiseName.trim(),
          facultyCoordinator: newCoordinator.trim(),
          facultyBranch: newCoordinatorBranch,
          facultyMobile: newCoordinatorMobile.trim(),
          department: newCoordinatorBranch,
          // Captain details
          captainName: newCaptainName.trim(),
          captainMobile: newCaptainMobile.trim(),
          captainRole: newCaptainRole,
          captainStats: captainStatsPayload,
          // Vice Captain details
          viceCaptainName: newViceCaptainName.trim(),
          viceCaptainMobile: newViceCaptainMobile.trim(),
          viceCaptainRole: newViceCaptainRole,
          viceCaptainStats: viceCaptainStatsPayload,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.credentials) {
        setCredentialsModal(data.credentials);
      }

      setActionMessage(`Franchise '${newFranchiseName}' registered successfully with Captain and Vice-Captain role-based stats.`);
      setNewFranchiseName('');
      setNewCoordinator('');
      setNewCoordinatorMobile('');
      setNewCaptainName('');
      setNewCaptainMobile('');
      setNewViceCaptainName('');
      setNewViceCaptainMobile('');
      refreshState({ force: true });
      loadAuditLogs();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunTests = async () => {
    setRunningTests(true);
    try {
      const res = await fetch('/api/tests/run');
      const data = await res.json();
      setTestResults(data);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setRunningTests(false);
    }
  };

  const handleConfirmDeleteFranchise = async () => {
    if (!confirmDeleteFranchise) return;
    setIsDeletingFranchise(true);
    try {
      setActionError(null);
      const res = await fetch(`/api/franchises/${confirmDeleteFranchise.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'ADMIN',
          'x-user-id': user?.id || '',
          'x-user-username': user?.username || 'Admin',
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActionMessage(`Franchise '${confirmDeleteFranchise.name}' was completely deleted from the database.`);
      setConfirmDeleteFranchise(null);
      refreshState({ force: true });
      loadAuditLogs();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsDeletingFranchise(false);
    }
  };

  const handleDeletePlayer = (playerId: string, playerName: string) => {
    setConfirmDeletePlayer({ id: playerId, name: playerName });
  };

  const handleConfirmDeletePlayer = async () => {
    if (!confirmDeletePlayer) return;
    setIsDeletingPlayer(true);
    try {
      setActionError(null);
      const res = await fetch(`/api/players/${confirmDeletePlayer.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'ADMIN',
          'x-user-id': user?.id || '',
          'x-user-username': user?.username || 'Admin',
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActionMessage(`Player '${confirmDeletePlayer.name}' was completely deleted from the database.`);
      setConfirmDeletePlayer(null);
      loadPlayers(true);
      refreshState({ force: true });
      loadAuditLogs();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsDeletingPlayer(false);
    }
  };

  const handleConfirmRemoveAllPlayers = async () => {
    setIsRemovingAllPlayers(true);
    try {
      setActionError(null);
      const res = await fetch('/api/admin/remove-all-players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'ADMIN',
          'x-user-id': user?.id || '',
          'x-user-username': user?.username || 'Admin',
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActionMessage(data.message || 'All players completely removed from database.');
      setShowRemoveAllPlayersModal(false);
      loadPlayers(true);
      refreshState({ force: true });
      loadAuditLogs();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsRemovingAllPlayers(false);
    }
  };

  const handleConfirmRemoveAllFranchises = async () => {
    setIsRemovingAllFranchises(true);
    try {
      setActionError(null);
      const res = await fetch('/api/admin/remove-all-franchises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'ADMIN',
          'x-user-id': user?.id || '',
          'x-user-username': user?.username || 'Admin',
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActionMessage(data.message || 'All franchises completely removed from database.');
      setShowRemoveAllFranchisesModal(false);
      refreshState({ force: true });
      loadPlayers(true);
      loadAuditLogs();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsRemovingAllFranchises(false);
    }
  };

  const handleConfirmResetSystem = async () => {
    setIsResettingSystem(true);
    try {
      setActionError(null);
      const res = await fetch('/api/admin/reset-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'ADMIN',
          'x-user-id': user?.id || '',
          'x-user-username': user?.username || 'Admin',
        },
        body: JSON.stringify({
          role: user?.role,
          userId: user?.id,
          username: user?.username,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActionMessage(data.message || 'System reset executed successfully.');
      setShowResetSystemModal(false);
      loadPlayers(true);
      loadAuditLogs();
      refreshState({ force: true });
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsResettingSystem(false);
    }
  };

  const handleExecuteUndo = async () => {
    if (!undoSaleId || !undoReason) {
      setActionError('Sale ID and reason are required.');
      return;
    }
    const res = await undoSale(undoSaleId, undoReason);
    if (!res.success) {
      setActionError(res.error || 'Undo failed.');
    } else {
      setActionMessage('Safe undo executed successfully.');
      setShowUndoModal(false);
      setUndoSaleId('');
      setUndoReason('');
      loadAuditLogs();
      refreshState({ force: true });
    }
  };

  // Requirement 1: Setting custom time alert for broadcast auction notice
  const handleSendCustomBroadcast = async () => {
    setSendingNotification(true);
    setActionError(null);
    try {
      const minutes = Number(broadcastMinutes) || 10;
      const res = await sendAuctionNotification({
        startsInMinutes: minutes,
        title: broadcastTitle || `⚡ Live Auction Begins in ${minutes} Minute${minutes === 1 ? '' : 's'}!`,
        message: broadcastMsg || `All 11 franchise war-rooms and players: Please assemble at the Live Floor Arena in ${minutes} minutes.`,
      });
      if (res.success) {
        setActionMessage(`Broadcast dispatched! Alert set for ${minutes} minutes and delivered to mobile/desktop devices.`);
        setShowBroadcastModal(false);
      } else {
        setActionError(res.error || 'Failed to send broadcast');
      }
    } finally {
      setSendingNotification(false);
    }
  };

  const handleAdminGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError(null);
    if (!adminGateUsername.trim() || !adminGatePassword.trim()) {
      setGateError('Username and password are required.');
      return;
    }

    setGateSubmitting(true);
    try {
      const res = await login(adminGateUsername.trim(), adminGatePassword.trim(), 'SUPER_ADMIN');
      if (!res.success) throw new Error(res.error || 'Login failed.');
      refreshState({ force: true });
      loadPlayers(true);
      loadAuditLogs();
      loadReferrals();
      loadAllSquads();
    } catch (err: any) {
      setGateError(err.message || 'Authentication failed');
    } finally {
      setGateSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col gap-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border-2 border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto mb-4 shadow-xl">
            <Crown className="w-8 h-8" />
          </div>
          <h2 className="font-heading text-2xl font-black text-white uppercase tracking-tight">
            Administrator Authentication
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            Restricted to official tournament coordinators and auction officials.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col gap-4">
          {gateError && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{gateError}</span>
            </div>
          )}

          <form onSubmit={handleAdminGateSubmit} className="flex flex-col gap-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Admin Username *</label>
              <input
                type="text"
                value={adminGateUsername}
                onChange={(e) => setAdminGateUsername(e.target.value)}
                placeholder="e.g. admin or superadmin"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Password *</label>
              <input
                type="password"
                value={adminGatePassword}
                onChange={(e) => setAdminGatePassword(e.target.value)}
                placeholder="Admin Password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={gateSubmitting}
              className="mt-2 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg"
            >
              {gateSubmitting ? 'Authenticating...' : 'Log In as Administrator'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400 flex items-center justify-center text-purple-300">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-black text-white uppercase tracking-tight">
              Super Admin Command Portal
            </h1>
            <p className="text-xs text-slate-400">
              Avanthi Cricket Carnival • Complete Tournament, Leadership, Referral & Auction Management
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold">
            {[
              { key: 'AUCTION', label: 'Auction & Draws', icon: Gavel },
              { key: 'PLAYERS', label: 'Player Queue', icon: FileCheck },
              { key: 'REFERRALS', label: 'Referred Players', icon: UserPlus },
              { key: 'FRANCHISES', label: 'Franchise Leadership', icon: Award },
              { key: 'SQUADS', label: 'Squads Audit', icon: Users },
              { key: 'ADMIN_ACCOUNTS', label: 'Admin Accounts', icon: ShieldCheck },
              { key: 'TESTS', label: '31 Tests', icon: Terminal },
              { key: 'AUDIT', label: 'Audit Trail', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowResetSystemModal(true)}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset System
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs font-bold underline">Dismiss</button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-xs font-bold underline">Dismiss</button>
        </div>
      )}

      {/* TAB 1: AUCTION DESK (RANDOM DRAW + GUEST DRAW MODE + CUSTOM TIME ALERT) */}
      {activeTab === 'AUCTION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-purple-400" />
                Live Auction Action Desk & Timer Controls
              </h3>
              <span className="text-xs font-bold text-amber-400 font-mono">
                Order: B3 → B4 → B2 → B5 → B1 → PG
              </span>
            </div>

            {/* Timer card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-950 to-blue-950/30 border border-blue-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                    Authoritative Auction Timer
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Auto-resets: 30s on first bid, 20s on subsequent raises
                  </div>
                </div>
              </div>

              <CountdownTimer
                deadlineMs={currentLot?.deadline_ms || null}
                serverTime={serverTime}
                size="md"
                showControls={true}
                onAdjustTimer={(sec) => adjustTimer(sec)}
                onResetTimer={(sec) => resetTimer(sec)}
              />
            </div>

            {/* Requirement 1: Setting Custom Time Alert Broadcast Notice */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 border border-amber-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                      <Megaphone className="w-3.5 h-3.5" /> Broadcast Auction Notice
                    </span>
                    <span className="px-2 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold border border-amber-500/30">
                      Custom Time Alert Supported
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Dispatches alert directly to user mobiles and active screens with customizable countdown time.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowBroadcastModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Set Custom Time Alert</span>
                </button>
              </div>
            </div>

            {/* Current Lot Card or Draw Actions */}
            {currentLot ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading text-2xl font-black text-white">
                        {currentLot.player_name || currentLot.playerName}
                      </h4>
                      {currentLot.draw_mode === 'GUEST' && (
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono font-bold">
                          ★ GUEST DRAW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cyan-400 font-mono">
                      {formatAcademicCategory(currentLot.bucket)} • {currentLot.branch} • {currentLot.program}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Current Bid</span>
                    <div className="text-2xl font-black text-amber-400 font-display">
                      {currentLot.current_price} Pts (₹)
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-300">
                  <span className="text-slate-500">Leading Franchise: </span>
                  <span className="font-bold text-white">{currentLot.highest_bidder_name || 'None'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={async () => {
                      setActionError(null);
                      const res = await strikeHammer();
                      if (!res.success) {
                        setActionError(res.error || 'Failed to strike hammer.');
                      } else {
                        setActionMessage(`Hammer struck! Result: ${res.result?.lotState}`);
                      }
                    }}
                    className="py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                  >
                    <Gavel className="w-5 h-5" />
                    Hammer Strike (SOLD / UNSOLD)
                  </button>

                  <button
                    onClick={() => skipCurrentLot('Admin skipped lot')}
                    className="py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm uppercase tracking-wider transition cursor-pointer"
                  >
                    Skip Lot (Re-queue)
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center flex flex-col items-center">
                <p className="text-sm text-slate-400 mb-4">
                  No player currently active on the auction floor. Choose draw protocol:
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                  <button
                    onClick={() => drawNextPlayer('AUTO')}
                    className="flex-1 w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Random Draw Mode (Auto)</span>
                  </button>

                  <button
                    onClick={() => setShowGuestDrawModal(true)}
                    className="flex-1 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Guest Draw Mode</span>
                  </button>
                </div>
              </div>
            )}

            {/* Proxy bidding */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Admin Proxy Bidding (On Behalf of Franchise)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {franchises.map((f) => (
                  <button
                    key={f.id}
                    disabled={!currentLot || !f.bidAllowed}
                    onClick={() => placeBid(f.id)}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-700 text-xs text-left truncate transition cursor-pointer"
                  >
                    <div className="font-bold text-white truncate">{f.name}</div>
                    <div className="text-[10px] text-amber-400">{f.purse} Pts (₹)</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Safe undo */}
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-red-300 uppercase">
                  Historical Safe Undo Operation
                </div>
                <p className="text-[11px] text-slate-400">
                  Target any previously concluded sale, refund purse, restore player.
                </p>
              </div>
              <button
                onClick={() => setShowUndoModal(true)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Safe Undo
              </button>
            </div>
          </div>

          {/* Right Column: Franchise Standings */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Franchises Standings & Quotas
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                11 Teams
              </span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[520px] overflow-y-auto pr-1 text-xs">
              {franchises.map((f) => (
                <div
                  key={f.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{f.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Coordinator: {f.faculty_coordinator || 'Assigned'} ({f.faculty_branch || f.department || 'General'})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-base font-black text-amber-400">{f.purse} Pts (₹)</div>
                      <div className="text-[10px] text-slate-400">Squad: {f.squadCount || 0}/22</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] font-mono text-slate-400">
                    <div>
                      B1:{f.bucketCounts?.B1 || 0} B2:{f.bucketCounts?.B2 || 0} B3:{f.bucketCounts?.B3 || 0} B4:{f.bucketCounts?.B4 || 0} B5:{f.bucketCounts?.B5 || 0}
                    </div>
                    <button
                      onClick={() => setSelectedFranchiseDossier(f)}
                      className="px-2 py-1 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white transition font-bold cursor-pointer"
                    >
                      Leadership & Stats →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PLAYERS ROSTER (EXACT DETAILS & FULL STATS VISIBLE TO ADMIN) */}
      {activeTab === 'PLAYERS' && (() => {
        const filteredPlayers = players.filter((p) => {
          const query = playerSearchQuery.toLowerCase().trim();
          const matchesSearch = !query ||
            p.name?.toLowerCase().includes(query) ||
            p.roll_number?.toLowerCase().includes(query) ||
            p.mobile_number?.includes(query) ||
            p.branch?.toLowerCase().includes(query);

          const matchesBucket = playerBucketFilter === 'ALL' || p.bucket === playerBucketFilter;
          const roleStr = (p.player_type || p.skill || '').toUpperCase();
          const matchesRole = playerRoleFilter === 'ALL' ||
            (playerRoleFilter === 'BATTER' && roleStr.includes('BAT') && !roleStr.includes('ALL')) ||
            (playerRoleFilter === 'BOWLER' && roleStr.includes('BOWL') && !roleStr.includes('ALL')) ||
            (playerRoleFilter === 'ALL-ROUNDER' && roleStr.includes('ALL')) ||
            (playerRoleFilter === 'WICKET-KEEPER' && (roleStr.includes('WICKET') || roleStr.includes('KEEPER')));

          return matchesSearch && matchesBucket && matchesRole;
        });

        return (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-400" />
                  Player Complete Stats & Roster ({players.length} Registered)
                </h3>
                <p className="text-xs text-slate-400">
                  Admin view: Displays exact details mentioned during player registration, role profiles, and base prices.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => loadPlayers(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Queue
                </button>
                <button
                  onClick={() => setShowRemoveAllPlayersModal(true)}
                  disabled={players.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove All Players
                </button>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  placeholder="Search by player name, roll no, mobile, branch..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 text-xs"
                />
              </div>

              <div>
                <select
                  value={playerBucketFilter}
                  onChange={(e) => setPlayerBucketFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                >
                  <option value="ALL">All Categories</option>
                  <option value="B1">1st Year B.Tech</option>
                  <option value="B2">2nd Year B.Tech</option>
                  <option value="B3">3rd Year B.Tech</option>
                  <option value="B4">4th Year B.Tech</option>
                  <option value="B5">Diploma - D</option>
                  <option value="PG">PG - P</option>
                </select>
              </div>

              <div>
                <select
                  value={playerRoleFilter}
                  onChange={(e) => setPlayerRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                >
                  <option value="ALL">All Playing Roles</option>
                  <option value="BATTER">Batsman Only</option>
                  <option value="BOWLER">Bowler Only</option>
                  <option value="ALL-ROUNDER">All-Rounder Only</option>
                  <option value="WICKET-KEEPER">Wicket-Keeper Only</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-3">Player Details</th>
                    <th className="p-3">Cricket Stats (M/R/W)</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Academic Category</th>
                    <th className="p-3">Base Price</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredPlayers.map((p) => {
                    let pStats: any = {};
                    try {
                      pStats = typeof p.stats_json === 'string' ? JSON.parse(p.stats_json) : (p.stats_json || p.stats || {});
                    } catch {}

                    return (
                      <tr key={p.id} className="hover:bg-slate-950/40">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                              {p.photo_url ? (
                                <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-4 h-4 m-2.5 text-slate-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">{p.name}</div>
                              <div className="text-[10px] text-cyan-400 font-mono">
                                {p.roll_number} • {p.branch} • {p.player_type || 'All-Rounder'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 font-mono">
                          <div className="text-white font-bold">
                            M: {pStats.matches || 0} | Runs: <span className="text-amber-400">{pStats.runs || 0}</span> | Wkts: <span className="text-cyan-400">{pStats.wickets || 0}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Avg: {pStats.battingAverage || pStats.battingAvg || '-'} | Eco: {pStats.economy || '-'}
                          </div>
                        </td>

                        <td className="p-3">
                          {p.mobile_number ? (
                            <a
                              href={`tel:${p.mobile_number}`}
                              className="inline-flex items-center gap-1 font-mono text-emerald-400 font-bold hover:underline"
                            >
                              <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{p.mobile_number}</span>
                            </a>
                          ) : (
                            <span className="text-slate-500 italic">None</span>
                          )}
                        </td>

                        <td className="p-3 font-mono font-bold text-amber-400">
                          {formatAcademicCategory(p.bucket)}
                        </td>

                        <td className="p-3">
                          {p.is_referred === 1 ? (
                            <span className="text-slate-500 font-mono italic text-[11px]">NULL (Referred)</span>
                          ) : (
                            <select
                              value={p.base_price || 20}
                              onChange={(e) => handleVerifyPlayer(p.id, { basePrice: parseInt(e.target.value, 10), isEligible: true })}
                              className="px-2 py-1 rounded bg-slate-950 border border-amber-500/50 text-amber-300 font-mono font-bold text-xs"
                            >
                              {[20, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250].map((pr) => (
                                <option key={pr} value={pr}>{pr} Pts (₹)</option>
                              ))}
                            </select>
                          )}
                        </td>

                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.is_referred === 1
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : p.franchise_name
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}>
                            {p.is_referred === 1 ? 'Referred (Direct Squad)' : p.franchise_name ? `Sold (${p.franchise_name})` : 'Eligible'}
                          </span>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedPlayerDossier(p)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Dossier</span>
                            </button>
                            <button
                              onClick={() => handleDeletePlayer(p.id, p.name)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition cursor-pointer"
                              title="Delete Single Player (Admin Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB 3: DEDICATED REFERRED PLAYERS SECTION */}
      {/* Requirement: Dedicated "Referred Players" section in the Admin portal.
          For every referred player, Admin must be able to see:
          A. How the player registered / referral source
          B. Which franchise referred the player
          C. Franchise captain name
          D. Player name
          E. Player roll number
          F. Registration details needed for verification
          Purpose: Allow Admin to cross-check: PLAYER → REFERRED BY CAPTAIN → FRANCHISE */}
      {activeTab === 'REFERRALS' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                  Dedicated Referred Players Verification & Cross-Check
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-500/40">
                  {referredPlayersList.length} Referred Players
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Cross-check verification pipeline: <strong>PLAYER → REFERRED BY CAPTAIN → FRANCHISE</strong>. Verify authenticity and direct squad assignment.
              </p>
            </div>

            <button
              onClick={loadReferrals}
              disabled={loadingReferrals}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingReferrals ? 'animate-spin' : ''}`} />
              <span>Refresh Records</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Player (Name & Roll)</th>
                  <th className="p-3">Referred By Captain</th>
                  <th className="p-3">Assigned Franchise</th>
                  <th className="p-3">Referral Source</th>
                  <th className="p-3">Verification Details</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {referredPlayersList.map((p) => {
                  let pStats: any = {};
                  try {
                    pStats = typeof p.stats_json === 'string' ? JSON.parse(p.stats_json) : (p.stats || {});
                  } catch {}

                  return (
                    <tr key={p.player_registration_id} className="hover:bg-slate-950/40">
                      <td className="p-3">
                        <div className="font-bold text-white text-sm">{p.player_name}</div>
                        <div className="text-[11px] text-cyan-300 font-mono">
                          Roll: {p.roll_number}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{p.captain_name || 'Franchise Captain'}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{p.franchise_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {p.franchise_id}
                        </div>
                      </td>

                      <td className="p-3 font-mono text-slate-300 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                          {p.referral_source || 'Referral Link'}
                        </span>
                      </td>

                      <td className="p-3 text-[11px]">
                        <div className="text-slate-300">
                          Mobile: <strong className="text-emerald-400 font-mono">{p.mobile_number}</strong>
                        </div>
                        <div className="text-slate-400">
                          {p.branch} • {p.program} • {formatAcademicCategory(p.bucket)}
                        </div>
                        <div className="text-slate-500 font-mono text-[10px]">
                          Matches: {pStats.matches || 0} | Runs: {pStats.runs || 0} | Wkts: {pStats.wickets || 0}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                          ✓ DIRECT SQUAD
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedPlayerDossier(p)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 font-bold transition cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {referredPlayersList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                      No referred player registrations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FRANCHISES & REGENERATE CREDENTIALS */}
      {/* Requirement 3: In franchise registration replace the captain's place with:
          captain name, mobile number, player role, stats based on their role
          same for vice captain also for both.
          Requirement 4: Capability to regenerate both new login id and password. */}
      {activeTab === 'FRANCHISES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Register Franchise With Role-Based Leadership
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter franchise details, faculty coordinator, Captain & Vice Captain with role and stats based on their role.
              </p>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Franchise Name *</label>
                <input
                  type="text"
                  value={newFranchiseName}
                  onChange={(e) => setNewFranchiseName(e.target.value)}
                  placeholder="e.g. Avanthi Titans"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium"
                />
              </div>

              {/* Faculty Coordinator Details */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <span className="font-bold text-slate-300 uppercase text-[10px] font-mono">
                  Faculty Coordinator Details (Not a Player):
                </span>
                <input
                  type="text"
                  value={newCoordinator}
                  onChange={(e) => setNewCoordinator(e.target.value)}
                  placeholder="Coordinator Full Name"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newCoordinatorBranch}
                    onChange={(e) => setNewCoordinatorBranch(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    <option>CSE</option>
                    <option>ECE</option>
                    <option>EEE</option>
                    <option>MECH</option>
                    <option>CIVIL</option>
                    <option>IT</option>
                    <option>AI&DS</option>
                    <option>DIPLOMA</option>
                  </select>
                  <input
                    type="tel"
                    value={newCoordinatorMobile}
                    onChange={(e) => setNewCoordinatorMobile(e.target.value)}
                    placeholder="Mobile Number"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              {/* Requirement 3: CAPTAIN - Name, Mobile Number, Player Role, and Stats based on role */}
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/40 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs font-mono uppercase">
                    <Crown className="w-3.5 h-3.5 text-amber-400" /> Captain Leadership Profile
                  </span>
                  <span className="text-[10px] text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-700 font-bold">
                    Role-Based Stats
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Captain Name *</label>
                    <input
                      type="text"
                      value={newCaptainName}
                      onChange={(e) => setNewCaptainName(e.target.value)}
                      placeholder="Captain Name"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      value={newCaptainMobile}
                      onChange={(e) => setNewCaptainMobile(e.target.value)}
                      placeholder="Mobile Number"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">Captain Player Role *</label>
                  <select
                    value={newCaptainRole}
                    onChange={(e) => setNewCaptainRole(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                  >
                    <option value="BATSMAN">Batter / Batsman</option>
                    <option value="BOWLER">Bowler</option>
                    <option value="ALL_ROUNDER">All-Rounder</option>
                    <option value="WICKET_KEEPER">Wicket-Keeper</option>
                  </select>
                </div>

                {/* Stats based on Captain's role */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-500 block">Matches</span>
                    <input
                      type="number"
                      value={newCaptainMatches}
                      onChange={(e) => setNewCaptainMatches(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>

                  {(newCaptainRole === 'BATSMAN' || newCaptainRole === 'ALL_ROUNDER' || newCaptainRole === 'WICKET_KEEPER') && (
                    <>
                      <div>
                        <span className="text-slate-500 block">Runs</span>
                        <input
                          type="number"
                          value={newCaptainRuns}
                          onChange={(e) => setNewCaptainRuns(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block">High Score</span>
                        <input
                          type="text"
                          value={newCaptainHighScore}
                          onChange={(e) => setNewCaptainHighScore(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block">Bat Avg</span>
                        <input
                          type="text"
                          value={newCaptainBatAvg}
                          onChange={(e) => setNewCaptainBatAvg(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block">Strike Rate</span>
                        <input
                          type="text"
                          value={newCaptainSR}
                          onChange={(e) => setNewCaptainSR(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                    </>
                  )}

                  {(newCaptainRole === 'BOWLER' || newCaptainRole === 'ALL_ROUNDER') && (
                    <>
                      <div>
                        <span className="text-slate-500 block">Wickets</span>
                        <input
                          type="number"
                          value={newCaptainWickets}
                          onChange={(e) => setNewCaptainWickets(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block">Best Bowl</span>
                        <input
                          type="text"
                          value={newCaptainBestBowl}
                          onChange={(e) => setNewCaptainBestBowl(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block">Economy</span>
                        <input
                          type="text"
                          value={newCaptainEcon}
                          onChange={(e) => setNewCaptainEcon(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                    </>
                  )}

                  {newCaptainRole === 'WICKET_KEEPER' && (
                    <>
                      <div>
                        <span className="text-slate-500 block">Catches</span>
                        <input
                          type="number"
                          value={newCaptainCatches}
                          onChange={(e) => setNewCaptainCatches(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block">Stumpings</span>
                        <input
                          type="number"
                          value={newCaptainStumpings}
                          onChange={(e) => setNewCaptainStumpings(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Requirement 3: VICE CAPTAIN - Name, Mobile Number, Player Role, and Stats based on role */}
              <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/40 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-400 flex items-center gap-1.5 text-xs font-mono uppercase">
                    <Shield className="w-3.5 h-3.5 text-blue-400" /> Vice-Captain Profile
                  </span>
                  <span className="text-[10px] text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-700 font-bold">
                    Role-Based Stats
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Vice-Captain Name *</label>
                    <input
                      type="text"
                      value={newViceCaptainName}
                      onChange={(e) => setNewViceCaptainName(e.target.value)}
                      placeholder="Vice-Captain Name"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      value={newViceCaptainMobile}
                      onChange={(e) => setNewViceCaptainMobile(e.target.value)}
                      placeholder="Mobile Number"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">Vice-Captain Player Role *</label>
                  <select
                    value={newViceCaptainRole}
                    onChange={(e) => setNewViceCaptainRole(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                  >
                    <option value="BATSMAN">Batter / Batsman</option>
                    <option value="BOWLER">Bowler</option>
                    <option value="ALL_ROUNDER">All-Rounder</option>
                    <option value="WICKET_KEEPER">Wicket-Keeper</option>
                  </select>
                </div>

                {/* Stats based on Vice-Captain's role */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-500 block">Matches</span>
                    <input
                      type="number"
                      value={newViceCaptainMatches}
                      onChange={(e) => setNewViceCaptainMatches(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>

                  {(newViceCaptainRole === 'BATSMAN' || newViceCaptainRole === 'ALL_ROUNDER' || newViceCaptainRole === 'WICKET_KEEPER') && (
                    <>
                      <div>
                        <span className="text-slate-500 block">Runs</span>
                        <input
                          type="number"
                          value={newViceCaptainRuns}
                          onChange={(e) => setNewViceCaptainRuns(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block">High Score</span>
                        <input
                          type="text"
                          value={newViceCaptainHighScore}
                          onChange={(e) => setNewViceCaptainHighScore(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                    </>
                  )}

                  {(newViceCaptainRole === 'BOWLER' || newViceCaptainRole === 'ALL_ROUNDER') && (
                    <>
                      <div>
                        <span className="text-slate-500 block">Wickets</span>
                        <input
                          type="number"
                          value={newViceCaptainWickets}
                          onChange={(e) => setNewViceCaptainWickets(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block">Best Bowl</span>
                        <input
                          type="text"
                          value={newViceCaptainBestBowl}
                          onChange={(e) => setNewViceCaptainBestBowl(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block">Economy</span>
                        <input
                          type="text"
                          value={newViceCaptainEcon}
                          onChange={(e) => setNewViceCaptainEcon(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                    </>
                  )}

                  {newViceCaptainRole === 'WICKET_KEEPER' && (
                    <>
                      <div>
                        <span className="text-slate-500 block">Catches</span>
                        <input
                          type="number"
                          value={newViceCaptainCatches}
                          onChange={(e) => setNewViceCaptainCatches(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block">Stumpings</span>
                        <input
                          type="number"
                          value={newViceCaptainStumpings}
                          onChange={(e) => setNewViceCaptainStumpings(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                disabled={franchises.length >= 11 || !newFranchiseName.trim()}
                onClick={handleCreateFranchise}
                className="mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                {franchises.length >= 11 ? 'Maximum 11 Franchises Reached' : 'Register Franchise & Leadership'}
              </button>
            </div>
          </div>

          {/* Franchise Roster Table with Regenerate Credentials button */}
          <div className="lg:col-span-7 rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Franchises & Credentials Management ({franchises.length} / 11)
                </h3>
                <p className="text-xs text-slate-400">
                  Admin capability: View stats, delete franchise, or regenerate both new login ID & password.
                </p>
              </div>
              <button
                onClick={() => setShowRemoveAllFranchisesModal(true)}
                disabled={franchises.length === 0}
                className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove All
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1 text-xs">
              {franchises.map((f, i) => (
                <div key={f.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{f.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-800">
                          ID: {f.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-amber-300">Coordinator:</span>
                        <span>{f.faculty_coordinator || 'Assigned'}</span>
                        {f.faculty_mobile && (
                          <span className="text-emerald-400 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {f.faculty_mobile}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-base font-black text-amber-400">{f.purse} Pts (₹)</div>
                      <div className="text-[10px] text-slate-500">Squad: {f.squadCount || 0}/22</div>
                    </div>
                  </div>

                  {/* Captain & Vice Captain Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-900 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-1">
                      <span className="font-bold text-amber-400 flex items-center gap-1 text-[10px]">
                        <Crown className="w-3.5 h-3.5" /> CAPTAIN: {f.captain_name || 'Designated'}
                      </span>
                      {f.captain_mobile && (
                        <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {f.captain_mobile}
                        </div>
                      )}
                      <div className="text-[10px] text-amber-300 font-semibold truncate">
                        Role: {f.captain_specialty || f.captain_skill || 'All-Rounder'}
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-1">
                      <span className="font-bold text-blue-400 flex items-center gap-1 text-[10px]">
                        <Shield className="w-3.5 h-3.5" /> VICE-CAPTAIN: {f.vice_captain_name || 'Designated'}
                      </span>
                      {f.vice_captain_mobile && (
                        <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {f.vice_captain_mobile}
                        </div>
                      )}
                      <div className="text-[10px] text-blue-300 font-semibold truncate">
                        Role: {f.vice_captain_specialty || f.vice_captain_skill || 'All-Rounder'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Username: <strong className="text-white">{f.username || `team_${i + 1}`}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Requirement 4: Admin capability to regenerate both new login id and password */}
                      <button
                        onClick={() => handleRegenerateCredentials(f.id)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 transition cursor-pointer font-bold text-[11px] flex items-center gap-1"
                        title="Regenerate new Login ID and Password for this franchise leader"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Regenerate ID & Pwd</span>
                      </button>

                      <button
                        onClick={() => setSelectedFranchiseDossier(f)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition cursor-pointer font-bold text-[11px]"
                      >
                        All Stats
                      </button>

                      <button
                        onClick={() => setConfirmDeleteFranchise({ id: f.id, name: f.name })}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition cursor-pointer"
                        title="Delete Franchise from Database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ADMIN SQUAD VISIBILITY */}
      {activeTab === 'SQUADS' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Tournament Squads & Safe Removal Audit (Admin Visibility)
              </h3>
              <p className="text-xs text-slate-400">
                Admin can see current active squad members, safely removed players, squad status, and removal history.
              </p>
            </div>
            <button
              onClick={loadAllSquads}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Refresh Squads
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Franchise</th>
                  <th className="p-3">Player Name</th>
                  <th className="p-3">Academic Category</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Removal Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {allSquads.map((s) => (
                  <tr key={s.squad_member_id} className="hover:bg-slate-950/40">
                    <td className="p-3 font-bold text-white">{s.franchise_name}</td>
                    <td className="p-3 font-medium text-slate-200">{s.player_name}</td>
                    <td className="p-3 font-mono text-amber-400">{s.academicCategoryLabel}</td>
                    <td className="p-3 font-mono">{s.acquisition_type}</td>
                    <td className="p-3 font-mono text-amber-300 font-bold">{s.price} Pts</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        s.status === 'REMOVED'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {s.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {s.status === 'REMOVED' ? (
                        <span>{s.removal_reason || 'Removed by Captain'} ({s.removed_by || 'Admin'})</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: ADMIN ACCOUNTS */}
      {activeTab === 'ADMIN_ACCOUNTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-5">
            <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" />
              Register New Administrator
            </h3>
            <form onSubmit={handleCreateNewAdmin} className="flex flex-col gap-4 text-xs">
              <input
                type="text"
                required
                placeholder="Admin Username"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
              <input
                type="password"
                required
                placeholder="Confirm Password"
                value={newAdminConfirmPassword}
                onChange={(e) => setNewAdminConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
              <button
                type="submit"
                disabled={creatingAdmin}
                className="py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase cursor-pointer"
              >
                {creatingAdmin ? 'Creating...' : 'Create Admin Account'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
            <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              Active Administrators
            </h3>
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
              {adminList.map((adm) => (
                <div key={adm.id || adm.username} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{adm.username} ({adm.role})</span>
                  <span className="text-[11px] text-slate-400 font-mono">{adm.email || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: 31 TESTS */}
      {activeTab === 'TESTS' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              ACC 31 Official Acceptance Tests
            </h3>
            <button
              disabled={runningTests}
              onClick={handleRunTests}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
            >
              {runningTests ? 'Running...' : 'Execute 31 Tests'}
            </button>
          </div>

          {testResults && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto text-xs font-mono">
              {testResults.tests?.map((t: any) => (
                <div key={t.id} className={`p-3 rounded-xl border flex items-start justify-between ${t.passed ? 'bg-slate-950/70 border-emerald-900/50 text-slate-300' : 'bg-red-950/40 border-red-800 text-red-300'}`}>
                  <div><span className="text-emerald-400 font-bold mr-2">[{t.id}]</span>{t.name}</div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.passed ? 'bg-emerald-950 text-emerald-400' : 'bg-red-900 text-white'}`}>{t.passed ? 'PASS' : 'FAIL'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: AUDIT */}
      {activeTab === 'AUDIT' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Audit Trail
            </h3>
            <button
              onClick={loadAuditLogs}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Refresh Logs
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[550px] overflow-y-auto text-xs font-mono">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-400 font-bold text-[10px] mr-2">{log.action}</span>
                  <span className="text-white font-bold">{log.actor}</span>
                  <span className="text-slate-400 ml-2">({log.entity} #{log.entity_id})</span>
                </div>
                <span className="text-slate-500 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST CUSTOM TIME ALERT NOTICE (Requirement 1) */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                Custom Time Broadcast Auction Notice
              </h3>
              <button onClick={() => setShowBroadcastModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Set any custom time countdown for the auction starting alert. Delivered to user screens and mobile notification shade.
            </p>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Time Alert (Minutes) *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={broadcastMinutes}
                    onChange={(e) => setBroadcastMinutes(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm font-bold"
                  />
                  <div className="flex gap-1">
                    {[5, 10, 15, 30].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setBroadcastMinutes(m)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold cursor-pointer ${
                          broadcastMinutes === m ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-950 text-slate-300 border-slate-700'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Broadcast Title (Optional)</label>
                <input
                  type="text"
                  placeholder={`⚡ Live Auction Begins in ${broadcastMinutes} Minutes!`}
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Message Content (Optional)</label>
                <textarea
                  rows={2}
                  placeholder={`All 11 franchise war-rooms and players: Please assemble at the Live Floor Arena in ${broadcastMinutes} minutes.`}
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCustomBroadcast}
                disabled={sendingNotification}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingNotification ? 'Sending...' : `Send ${broadcastMinutes}m Alert`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GUEST DRAW MODAL */}
      <GuestDrawModal
        isOpen={showGuestDrawModal}
        onClose={() => setShowGuestDrawModal(false)}
        onPlayerSelected={() => {
          setActionMessage('Player successfully called via Guest Draw Mode!');
          refreshState({ force: true });
        }}
      />

      {/* MODAL: PLAYER DOSSIER (EXACT STATS ENTERED DURING REGISTRATION) */}
      {selectedPlayerDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-blue-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedPlayerDossier(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white font-heading">{selectedPlayerDossier.player_name || selectedPlayerDossier.name}</h3>
            <p className="text-xs text-slate-400 font-mono">
              Roll: {selectedPlayerDossier.roll_number} • {selectedPlayerDossier.branch} • {formatAcademicCategory(selectedPlayerDossier.bucket)}
            </p>

            {/* Performance Stats */}
            {(() => {
              let pStats: any = selectedPlayerDossier.stats || {};
              try {
                if (typeof selectedPlayerDossier.stats_json === 'string') {
                  pStats = JSON.parse(selectedPlayerDossier.stats_json);
                }
              } catch {}
              return (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2 font-mono text-xs">
                  <span className="font-bold text-cyan-300 font-sans text-xs">Complete Statistics (Entered by Athlete):</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Matches</span>
                      <strong className="text-white text-sm">{pStats.matches || 0}</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Runs</span>
                      <strong className="text-amber-400 text-sm">{pStats.runs || 0}</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Wickets</span>
                      <strong className="text-cyan-400 text-sm">{pStats.wickets || 0}</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">High Score</span>
                      <strong className="text-emerald-400 text-sm">{pStats.highestScore || '-'}</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Bat Avg</span>
                      <strong className="text-slate-200 text-xs">{pStats.battingAverage || '-'}</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Economy</span>
                      <strong className="text-slate-200 text-xs">{pStats.economy || '-'}</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-between items-center pt-2">
              <button onClick={() => { handleDeletePlayer(selectedPlayerDossier.id || selectedPlayerDossier.player_registration_id, selectedPlayerDossier.player_name || selectedPlayerDossier.name); setSelectedPlayerDossier(null); }} className="px-4 py-2 rounded-xl bg-red-600/20 text-red-300 border border-red-500/40 text-xs font-bold">
                Delete Player from Database
              </button>
              <button onClick={() => setSelectedPlayerDossier(null)} className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FRANCHISE DOSSIER WITH CAPTAIN STATS */}
      {selectedFranchiseDossier && (() => {
        const f = selectedFranchiseDossier;
        const cStats = f.captain_stats || {};
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-xl bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedFranchiseDossier(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-black text-xl">
                  {f.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-heading">{f.name}</h3>
                  <div className="text-xs text-slate-400 font-mono">
                    ID: <span className="text-cyan-400 font-bold">{f.id}</span> • {f.department || 'Avanthi'}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Faculty Coordinator: <strong className="text-white">{f.faculty_coordinator || 'Assigned'}</strong> ({f.faculty_branch || 'General'})
                  </div>
                </div>
              </div>

              {/* CAPTAIN PROFILE & STATS SECTION */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/50 flex flex-col gap-2.5">
                <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs font-mono uppercase">
                  <Crown className="w-4 h-4 text-amber-400" /> Captain Profile & Cricket Statistics
                </span>
                <div className="font-bold text-white text-base">
                  {f.captain_name || 'Designated Captain'} {f.captain_mobile && `(${f.captain_mobile})`}
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  <strong>Role & Specialty:</strong> {f.captain_specialty || cStats.specialty || f.captain_skill || 'Captain & Core Player'}
                </div>
                <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 text-[9px] block">MATCHES</span>
                    <strong className="text-white text-sm">{cStats.matches ?? '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] block">RUNS</span>
                    <strong className="text-amber-400 text-sm">{cStats.runs ?? '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] block">WICKETS</span>
                    <strong className="text-cyan-400 text-sm">{cStats.wickets ?? '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] block">TOP SCORE</span>
                    <strong className="text-emerald-400 text-sm">{cStats.highestScore ?? '-'}</strong>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    handleRegenerateCredentials(f.id);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  Regenerate Login ID & Password
                </button>

                <button
                  onClick={() => setSelectedFranchiseDossier(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONFIRM DELETE FRANCHISE */}
      {confirmDeleteFranchise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-600 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="font-heading text-xl font-bold text-white text-center">Delete Franchise from Database?</h3>
            <p className="text-xs text-slate-300 text-center">Are you sure you want to permanently delete franchise "{confirmDeleteFranchise.name}"?</p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setConfirmDeleteFranchise(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">Cancel</button>
              <button onClick={handleConfirmDeleteFranchise} disabled={isDeletingFranchise} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PLAYER */}
      {confirmDeletePlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-600 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="font-heading text-xl font-bold text-white text-center">Delete Player from Database?</h3>
            <p className="text-xs text-slate-300 text-center">Are you sure you want to permanently delete player "{confirmDeletePlayer.name}"?</p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setConfirmDeletePlayer(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">Cancel</button>
              <button onClick={handleConfirmDeletePlayer} disabled={isDeletingPlayer} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE ALL PLAYERS MODAL */}
      {showRemoveAllPlayersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border-2 border-red-600 p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="font-heading text-xl font-black text-white">Delete All Players from Database?</h3>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowRemoveAllPlayersModal(false)} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">Cancel</button>
              <button onClick={handleConfirmRemoveAllPlayers} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black text-xs">Confirm Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE ALL FRANCHISES MODAL */}
      {showRemoveAllFranchisesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border-2 border-red-600 p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="font-heading text-xl font-black text-white">Delete All Franchises from Database?</h3>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowRemoveAllFranchisesModal(false)} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">Cancel</button>
              <button onClick={handleConfirmRemoveAllFranchises} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black text-xs">Confirm Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM RESET MODAL */}
      {showResetSystemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border-2 border-red-600 p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="font-heading text-xl font-black text-white">Reset System Data</h3>
            <p className="text-xs text-slate-300">This will purge tournament data while preserving database schema and administrative credentials.</p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowResetSystemModal(false)} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">Cancel</button>
              <button onClick={handleConfirmResetSystem} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black text-xs">Confirm Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* CREDENTIALS MODAL (FOR NEWLY GENERATED OR REGENERATED FRANCHISE LOGIN ID & PASSWORD) */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                Franchise Login ID & Password
              </h3>
              <button onClick={() => setCredentialsModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[10px] block">Login ID:</span>
                  <span className="text-white font-black text-base">{credentialsModal.username}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(credentialsModal.username, 'uid')}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  {copiedKey === 'uid' ? 'Copied!' : 'Copy ID'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[10px] block">New Password:</span>
                  <span className="text-amber-300 font-black text-base">{credentialsModal.password}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(credentialsModal.password, 'pwd')}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  {copiedKey === 'pwd' ? 'Copied!' : 'Copy Pwd'}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                const text = `Franchise: ${credentialsModal.name}\nLogin ID: ${credentialsModal.username}\nPassword: ${credentialsModal.password}`;
                copyToClipboard(text, 'both');
              }}
              className="py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase"
            >
              {copiedKey === 'both' ? 'Copied ID & Password!' : 'Copy Both ID & Password'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
