/**
 * ============================================================================
 * ACC SUPER ADMIN COMMAND PORTAL
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuction } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { GuestDrawModal } from '../components/GuestDrawModal';
import { formatAcademicCategory, isDiplomaPlayer } from '../utils/academicCategories';
import {
  Crown,
  Gavel,
  Users,
  CheckCircle,
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
  Sparkles,
  Layers,
  Check,
  Lock,
  XCircle,
  User,
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
    activeSession,
    sessionState,
    setAuctionSession,
    assignPlayersToSession,
    approvePlayer,
    autoTransitionCountdown,
    customTimerAlert,
    setCustomTimerAlert,
    cancelCustomTimerAlert,
    unsoldPlayers,
    loadingUnsoldPlayers,
    fetchUnsoldPlayers,
    reAdmitUnsoldPlayer,
    setDrawMode,
    autoDrawMode,
    currentDrawMode,
  } = useAuction();

  const [customTimerDuration, setCustomTimerDuration] = useState<number>(60);
  const [customTimerMessage, setCustomTimerMessage] = useState<string>('Live Auction starting soon! All franchises take positions.');
  const [settingCustomAlert, setSettingCustomAlert] = useState(false);

  const [decidingReferralId, setDecidingReferralId] = useState<string | null>(null);
  const [reAdmittingId, setReAdmittingId] = useState<string | null>(null);
  const [showGuestDrawModal, setShowGuestDrawModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'AUCTION' | 'UNSOLD' | 'APPROVALS' | 'SESSIONS' | 'PLAYERS' | 'REFERRALS' | 'FRANCHISES' | 'ADMIN_ACCOUNTS' | 'TESTS' | 'AUDIT'>('AUCTION');
  const [players, setPlayers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any | null>(null);
  const [runningTests, setRunningTests] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [undoSaleId, setUndoSaleId] = useState('');
  const [undoReason, setUndoReason] = useState('');
  const [showUndoModal, setShowUndoModal] = useState(false);

  const [referredPlayersList, setReferredPlayersList] = useState<any[]>([]);
  const [rejectingPlayer, setRejectingPlayer] = useState<any | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [selectedPlayerIdsForSession, setSelectedPlayerIdsForSession] = useState<string[]>([]);

  // Franchise registration form state
  const [showCreateFranchiseForm, setShowCreateFranchiseForm] = useState(false);
  const [submittingFranchise, setSubmittingFranchise] = useState(false);
  const [newFranchiseName, setNewFranchiseName] = useState('');
  const [newFranchiseCustomId, setNewFranchiseCustomId] = useState('');
  const [newCoordinator, setNewCoordinator] = useState('');
  const [newCoordinatorBranch, setNewCoordinatorBranch] = useState('CSE');
  const [newCoordinatorMobile, setNewCoordinatorMobile] = useState('');
  const [newFranchiseCustomPassword, setNewFranchiseCustomPassword] = useState('');
  
  // Captain details & stats
  const [newCaptainName, setNewCaptainName] = useState('');
  const [newCaptainMobile, setNewCaptainMobile] = useState('');
  const [newCaptainRoll, setNewCaptainRoll] = useState('');
  const [newCaptainRole, setNewCaptainRole] = useState<'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER'>('ALL_ROUNDER');
  const [newCapMatches, setNewCapMatches] = useState('12');
  const [newCapRuns, setNewCapRuns] = useState('320');
  const [newCapWickets, setNewCapWickets] = useState('8');
  const [newCapBatAvg, setNewCapBatAvg] = useState('32.0');
  const [newCapSR, setNewCapSR] = useState('130.0');
  const [newCapHighScore, setNewCapHighScore] = useState('68');
  const [newCapEcon, setNewCapEcon] = useState('7.2');
  const [newCapBestBowl, setNewCapBestBowl] = useState('3/22');
  const [newCapBattingStyle, setNewCapBattingStyle] = useState('Right Hand Bat');
  const [newCapBowlingStyle, setNewCapBowlingStyle] = useState('Right-arm Medium');
  const [newCapCatches, setNewCapCatches] = useState('6');
  const [newCapStumpings, setNewCapStumpings] = useState('2');

  // Vice-Captain details & stats
  const [newViceCaptainName, setNewViceCaptainName] = useState('');
  const [newViceCaptainMobile, setNewViceCaptainMobile] = useState('');
  const [newViceCaptainRoll, setNewViceCaptainRoll] = useState('');
  const [newViceCaptainRole, setNewViceCaptainRole] = useState<'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER'>('ALL_ROUNDER');
  const [newVcMatches, setNewVcMatches] = useState('10');
  const [newVcRuns, setNewVcRuns] = useState('210');
  const [newVcWickets, setNewVcWickets] = useState('12');
  const [newVcBatAvg, setNewVcBatAvg] = useState('26.0');
  const [newVcSR, setNewVcSR] = useState('124.0');
  const [newVcHighScore, setNewVcHighScore] = useState('54');
  const [newVcEcon, setNewVcEcon] = useState('6.6');
  const [newVcBestBowl, setNewVcBestBowl] = useState('4/18');
  const [newVcBattingStyle, setNewVcBattingStyle] = useState('Right Hand Bat');
  const [newVcBowlingStyle, setNewVcBowlingStyle] = useState('Right-arm Fast');
  const [newVcCatches, setNewVcCatches] = useState('5');
  const [newVcStumpings, setNewVcStumpings] = useState('1');

  // Admin registration form state
  const [showCreateAdminForm, setShowCreateAdminForm] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminConfirmPassword, setNewAdminConfirmPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR'>('ADMIN');
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  const [credentialsModal, setCredentialsModal] = useState<{
    franchiseId: string;
    username: string;
    password: string;
    name: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [adminList, setAdminList] = useState<any[]>([]);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [selectedPlayerDossier, setSelectedPlayerDossier] = useState<any | null>(null);

  const [confirmDeleteFranchise, setConfirmDeleteFranchise] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeletePlayer, setConfirmDeletePlayer] = useState<{ id: string; name: string; roll: string } | null>(null);
  const [showResetSystemModal, setShowResetSystemModal] = useState(false);
  const [resettingSystem, setResettingSystem] = useState(false);
  const [resetConfirmationInput, setResetConfirmationInput] = useState('');

  const handleResetSystem = async () => {
    setActionError(null);
    setResettingSystem(true);
    try {
      const res = await fetch('/api/admin/reset-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'SUPER_ADMIN',
          'x-user-id': user?.id || '',
          'x-user-username': user?.username || 'SuperAdmin',
        },
        body: JSON.stringify({
          role: user?.role || 'SUPER_ADMIN',
          userId: user?.id,
          username: user?.username || 'SuperAdmin',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to reset system.');
      setShowResetSystemModal(false);
      setResetConfirmationInput('');
      setActionMessage(data.message || 'System completely reset. All data deleted. You can now add fresh franchises and register fresh players.');
      await refreshState({ force: true });
      await loadPlayers(true);
      await loadAuditLogs();
      await loadReferrals();
    } catch (err: any) {
      setActionError(err.message || 'System reset failed');
    } finally {
      setResettingSystem(false);
    }
  };

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
    } catch {}
  }, [user]);

  const loadAdmins = useCallback(async () => {
    try {
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
    } catch {}
  }, [user]);

  useEffect(() => {
    loadPlayers();
    loadAuditLogs();
    if (isAdmin) {
      loadAdmins();
      loadReferrals();
    }
  }, [editionId, loadPlayers, isAdmin, loadAdmins, loadReferrals]);

  const handleLaunchCustomTimerAlert = async () => {
    setSettingCustomAlert(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await setCustomTimerAlert(customTimerDuration, customTimerMessage.trim());
      if (!res.success) {
        throw new Error(res.error || 'Failed to start custom timer alert.');
      }
      setActionMessage(`Custom auction timer alert started for ${customTimerDuration} seconds.`);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSettingCustomAlert(false);
    }
  };

  const handleDecideReferral = async (playerId: string, decision: 'ACCEPT' | 'REJECT', basePrice: number = 20) => {
    setDecidingReferralId(playerId);
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/referrals/decide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'SUPER_ADMIN',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ playerId, decision, basePrice }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to process referral decision.');
      }
      setActionMessage(data.message);
      loadReferrals();
      loadPlayers(true);
      refreshState({ force: true });
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setDecidingReferralId(null);
    }
  };

  const handleReAdmitUnsoldPlayer = async (playerId: string) => {
    setReAdmittingId(playerId);
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await reAdmitUnsoldPlayer(playerId);
      if (!res.success) {
        throw new Error(res.error || 'Failed to re-admit player.');
      }
      setActionMessage(res.message || 'Player successfully re-admitted to the main auction pool with explicit admin approval!');
      await fetchUnsoldPlayers();
      loadPlayers(true);
      refreshState({ force: true });
    } catch (err: any) {
      setActionError(err.message || 'Error re-admitting unsold player');
    } finally {
      setReAdmittingId(null);
    }
  };

  const handleApprovePlayer = async (p: any, basePrice?: number) => {
    setActionError(null);
    try {
      const res = await approvePlayer(p.id, 'APPROVED', undefined, basePrice || p.base_price || 20);
      if (!res.success) {
        throw new Error(res.error || 'Approval failed');
      }
      setActionMessage(`Player '${p.name}' APPROVED! They are now eligible for the auction pool.`);
      loadPlayers(true);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleConfirmRejectPlayer = async () => {
    if (!rejectingPlayer) return;
    setActionError(null);
    try {
      const res = await approvePlayer(rejectingPlayer.id, 'REJECTED', rejectionReasonText);
      if (!res.success) {
        throw new Error(res.error || 'Rejection failed');
      }
      setActionMessage(`Player '${rejectingPlayer.name}' has been REJECTED from the auction pool.`);
      setRejectingPlayer(null);
      setRejectionReasonText('');
      loadPlayers(true);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleAssignToSession = async (targetSession: 1 | 2) => {
    if (selectedPlayerIdsForSession.length === 0) {
      setActionError('Please select at least one player to assign.');
      return;
    }
    setActionError(null);
    try {
      const res = await assignPlayersToSession(selectedPlayerIdsForSession, targetSession);
      if (!res.success) {
        throw new Error(res.error || 'Session assignment failed');
      }
      setActionMessage(`Assigned ${selectedPlayerIdsForSession.length} players to Session ${targetSession}.`);
      setSelectedPlayerIdsForSession([]);
      loadPlayers(true);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionMessage(null);

    if (!newFranchiseName.trim()) {
      setActionError('Franchise Name is required.');
      return;
    }
    if (!newCoordinator.trim()) {
      setActionError('Franchise Coordinator Name is required.');
      return;
    }
    if (!newCoordinatorMobile.trim()) {
      setActionError('Franchise Coordinator Mobile Number is required.');
      return;
    }
    if (!newCaptainName.trim()) {
      setActionError('Captain Name is required.');
      return;
    }
    if (!newCaptainMobile.trim()) {
      setActionError('Captain Mobile Number is required.');
      return;
    }
    if (!newCaptainRoll.trim()) {
      setActionError('Captain Roll Number is required.');
      return;
    }
    if (!newViceCaptainName.trim()) {
      setActionError('Vice-Captain Name is required.');
      return;
    }
    if (!newViceCaptainMobile.trim()) {
      setActionError('Vice-Captain Mobile Number is required.');
      return;
    }
    if (!newViceCaptainRoll.trim()) {
      setActionError('Vice-Captain Roll Number is required.');
      return;
    }

    setSubmittingFranchise(true);
    try {
      const captainStatsObj: any = {
        roll: newCaptainRoll.trim().toUpperCase(),
        role: newCaptainRole,
        mobile: newCaptainMobile.trim(),
        matches: parseInt(newCapMatches, 10) || 0,
        battingStyle: newCapBattingStyle,
        bowlingStyle: newCapBowlingStyle,
      };
      if (newCaptainRole === 'BATSMAN' || newCaptainRole === 'ALL_ROUNDER') {
        captainStatsObj.runs = parseInt(newCapRuns, 10) || 0;
        captainStatsObj.battingAverage = newCapBatAvg || '0.0';
        captainStatsObj.strikeRate = newCapSR || '0.0';
        captainStatsObj.highestScore = newCapHighScore || '0';
      }
      if (newCaptainRole === 'BOWLER' || newCaptainRole === 'ALL_ROUNDER') {
        captainStatsObj.wickets = parseInt(newCapWickets, 10) || 0;
        captainStatsObj.economy = newCapEcon || '0.0';
        captainStatsObj.bestBowling = newCapBestBowl || '-';
      }
      if (newCaptainRole === 'WICKET_KEEPER') {
        captainStatsObj.runs = parseInt(newCapRuns, 10) || 0;
        captainStatsObj.catches = parseInt(newCapCatches, 10) || 0;
        captainStatsObj.stumpings = parseInt(newCapStumpings, 10) || 0;
      }

      const viceCaptainStatsObj: any = {
        roll: newViceCaptainRoll.trim().toUpperCase(),
        role: newViceCaptainRole,
        mobile: newViceCaptainMobile.trim(),
        matches: parseInt(newVcMatches, 10) || 0,
        battingStyle: newVcBattingStyle,
        bowlingStyle: newVcBowlingStyle,
      };
      if (newViceCaptainRole === 'BATSMAN' || newViceCaptainRole === 'ALL_ROUNDER') {
        viceCaptainStatsObj.runs = parseInt(newVcRuns, 10) || 0;
        viceCaptainStatsObj.battingAverage = newVcBatAvg || '0.0';
        viceCaptainStatsObj.strikeRate = newVcSR || '0.0';
        viceCaptainStatsObj.highestScore = newVcHighScore || '0';
      }
      if (newViceCaptainRole === 'BOWLER' || newViceCaptainRole === 'ALL_ROUNDER') {
        viceCaptainStatsObj.wickets = parseInt(newVcWickets, 10) || 0;
        viceCaptainStatsObj.economy = newVcEcon || '0.0';
        viceCaptainStatsObj.bestBowling = newVcBestBowl || '-';
      }
      if (newViceCaptainRole === 'WICKET_KEEPER') {
        viceCaptainStatsObj.runs = parseInt(newVcRuns, 10) || 0;
        viceCaptainStatsObj.catches = parseInt(newVcCatches, 10) || 0;
        viceCaptainStatsObj.stumpings = parseInt(newVcStumpings, 10) || 0;
      }

      const payload = {
        editionId,
        name: newFranchiseName.trim(),
        customFranchiseId: newFranchiseCustomId.trim() || undefined,
        facultyCoordinator: newCoordinator.trim(),
        facultyBranch: newCoordinatorBranch || 'CSE',
        facultyMobile: newCoordinatorMobile.trim(),
        department: newCoordinatorBranch || 'CSE',
        customPassword: newFranchiseCustomPassword.trim() || undefined,
        captainName: newCaptainName.trim(),
        captainMobile: newCaptainMobile.trim(),
        captainRoll: newCaptainRoll.trim().toUpperCase(),
        captainRole: newCaptainRole,
        captainStats: captainStatsObj,
        viceCaptainName: newViceCaptainName.trim(),
        viceCaptainMobile: newViceCaptainMobile.trim(),
        viceCaptainRoll: newViceCaptainRoll.trim().toUpperCase(),
        viceCaptainRole: newViceCaptainRole,
        viceCaptainStats: viceCaptainStatsObj,
      };

      const res = await fetch('/api/franchises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'SUPER_ADMIN',
          'x-user-id': user?.id || '',
          'x-user-username': user?.username || 'SuperAdmin',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to register franchise');
      }

      setActionMessage(`Franchise '${newFranchiseName}' registered successfully with full Coordinator, Captain and Vice-Captain details!`);
      if (data.credentials) {
        setCredentialsModal(data.credentials);
      }

      setNewFranchiseName('');
      setNewFranchiseCustomId('');
      setNewCoordinator('');
      setNewCoordinatorMobile('');
      setNewCaptainName('');
      setNewCaptainMobile('');
      setNewCaptainRoll('');
      setNewViceCaptainName('');
      setNewViceCaptainMobile('');
      setNewViceCaptainRoll('');
      setShowCreateFranchiseForm(false);

      refreshState({ force: true });
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmittingFranchise(false);
    }
  };

  const handleRegenerateFranchiseCredentials = async (franchiseId: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/franchises/${franchiseId}/regenerate-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'SUPER_ADMIN',
          'x-user-id': user?.id || '',
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to regenerate credentials');
      setCredentialsModal(data.credentials);
      setActionMessage(data.message || 'Credentials regenerated successfully.');
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleDeleteFranchise = async (franchiseId: string, franchiseName: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/franchises/${franchiseId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': user?.role || 'SUPER_ADMIN',
          'x-user-username': user?.username || 'SuperAdmin',
          'x-user-id': user?.id || '',
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete franchise');
      setConfirmDeleteFranchise(null);
      setActionMessage(`Franchise '${franchiseName}' deleted successfully.`);
      refreshState({ force: true });
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': user?.role || 'SUPER_ADMIN',
          'x-user-username': user?.username || 'SuperAdmin',
          'x-user-id': user?.id || '',
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete player');
      setConfirmDeletePlayer(null);
      if (selectedPlayerDossier && selectedPlayerDossier.id === playerId) {
        setSelectedPlayerDossier(null);
      }
      setActionMessage(`Player '${playerName}' was permanently deleted from the tournament.`);
      refreshState({ force: true });
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!newAdminUsername.trim() || !newAdminPassword.trim()) {
      setActionError('Username and password are required.');
      return;
    }
    if (newAdminPassword !== newAdminConfirmPassword) {
      setActionError('Passwords do not match.');
      return;
    }
    setSubmittingAdmin(true);
    try {
      const res = await fetch('/api/auth/register-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'SUPER_ADMIN',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          username: newAdminUsername.trim(),
          email: newAdminEmail.trim() || undefined,
          password: newAdminPassword,
          confirmPassword: newAdminConfirmPassword,
          role: newAdminRole,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to register admin account');
      setActionMessage(`Administrator account '${newAdminUsername}' created successfully!`);
      setNewAdminUsername('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminConfirmPassword('');
      setShowCreateAdminForm(false);
      loadAdmins();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmittingAdmin(false);
    }
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
                placeholder="Enter admin username"
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

  const pendingApprovalsCount = players.filter((p) => p.approval_status === 'PENDING').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
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
              Avanthi Cricket Carnival • Two Sessions, Strict Bucket Order & Approval Governance
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold">
            {[
              { key: 'AUCTION', label: 'Auction & Timer', icon: Gavel },
              { key: 'UNSOLD', label: `Unsold Pool (${unsoldPlayers.length})`, icon: AlertTriangle, badge: unsoldPlayers.length > 0 },
              { key: 'APPROVALS', label: `Approvals (${pendingApprovalsCount})`, icon: CheckCircle, badge: pendingApprovalsCount > 0 },
              { key: 'SESSIONS', label: `Sessions (S${activeSession})`, icon: Layers },
              { key: 'PLAYERS', label: 'Player Queue', icon: FileCheck },
              { key: 'REFERRALS', label: 'Referred Players', icon: UserPlus },
              { key: 'FRANCHISES', label: 'Franchise Leadership', icon: Award },
              { key: 'ADMIN_ACCOUNTS', label: 'Admin Accounts', icon: ShieldCheck },
              { key: 'TESTS', label: '31 Tests', icon: Terminal },
              { key: 'AUDIT', label: 'Audit Trail', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer relative ${
                    activeTab === tab.key
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-1 -right-1" />
                  )}
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

      {/* TAB 1: AUCTION */}
      {activeTab === 'AUCTION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-purple-400" />
                Live Auction Action Desk
              </h3>
              <div className="text-xs font-bold text-amber-400 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                Order: 3rd → 4th → 2nd → Diploma → PG → 1st
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-white font-bold">CURRENT SESSION: {activeSession}</span>
                <span className="text-slate-400">({sessionState})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuctionSession(activeSession, sessionState.endsWith('_ACTIVE') ? 'END' : 'START')}
                  className={`px-3 py-1 rounded-lg font-bold uppercase transition cursor-pointer text-[10px] ${
                    sessionState.endsWith('_ACTIVE') ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {sessionState.endsWith('_ACTIVE') ? `End Session ${activeSession}` : `Start Session ${activeSession}`}
                </button>
                <button
                  onClick={() => setActiveTab('SESSIONS')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Configure Sessions →
                </button>
              </div>
            </div>

            {autoTransitionCountdown !== null && autoTransitionCountdown > 0 && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950 to-blue-950 border-2 border-cyan-400 text-cyan-200 flex items-center justify-between shadow-xl animate-pulse font-mono">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-cyan-400 animate-spin" />
                  <div>
                    <strong className="block text-white text-xs uppercase">AUTOMATIC AUCTION TRANSITION</strong>
                    <span className="text-[11px] text-slate-300">Proceeding to next eligible player in strict bucket order</span>
                  </div>
                </div>
                <div className="font-display text-2xl font-black text-amber-400">
                  00:0{autoTransitionCountdown}s
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 border border-amber-500/40 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="font-heading text-xs font-bold text-white uppercase tracking-wider">
                    Custom Auction Timer Alert
                  </span>
                </div>
                {customTimerAlert && customTimerAlert.active && (
                  <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-300 font-mono text-[10px] font-bold border border-red-800 animate-pulse">
                    Alert Active ({customTimerAlert.phase})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                <div className="sm:col-span-4">
                  <label className="block text-slate-400 mb-1 text-[11px]">Countdown Duration</label>
                  <select
                    value={customTimerDuration}
                    onChange={(e) => setCustomTimerDuration(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                  >
                    <option value={15}>15 Seconds (Quick Demo)</option>
                    <option value={30}>30 Seconds</option>
                    <option value={60}>1 Minute</option>
                    <option value={120}>2 Minutes</option>
                    <option value={300}>5 Minutes</option>
                  </select>
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-slate-400 mb-1 text-[11px]">Alert Broadcast Message</label>
                  <input
                    type="text"
                    value={customTimerMessage}
                    onChange={(e) => setCustomTimerMessage(e.target.value)}
                    placeholder="e.g. Live Auction starting soon!"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={settingCustomAlert}
                  onClick={handleLaunchCustomTimerAlert}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-lg"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{settingCustomAlert ? 'Launching...' : '🚀 Launch Custom Timer Alert'}</span>
                </button>

                {customTimerAlert && customTimerAlert.active && (
                  <button
                    type="button"
                    onClick={cancelCustomTimerAlert}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase transition cursor-pointer"
                  >
                    Cancel Alert
                  </button>
                )}
              </div>
            </div>

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
                          GUEST DRAW (MASKED)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cyan-400 font-mono">
                      {formatAcademicCategory(currentLot.bucket)} • {currentLot.branch} • {currentLot.program} • Session {currentLot.player_auction_session || activeSession}
                    </p>
                    {isDiplomaPlayer(currentLot) && (
                      <div className="mt-1 px-2.5 py-0.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-500/80 font-bold text-[10px] uppercase inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>Player detained by 1 year diploma</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Current Bid</span>
                    <div className="text-2xl font-black text-amber-400 font-display">
                      {currentLot.current_price} Pts (Purse)
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
                        setActionMessage(`Hammer struck! Result: ${res.result?.lotState}. 10-second transition started.`);
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
                    onClick={async () => {
                      await setDrawMode('AUTO');
                      drawNextPlayer('AUTO');
                    }}
                    className="flex-1 w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Random Draw (Fixed Order)</span>
                  </button>

                  <button
                    onClick={async () => {
                      await setDrawMode('GUEST');
                      setShowGuestDrawModal(true);
                    }}
                    className="flex-1 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Guest Mode (Masked Identifiers)</span>
                  </button>
                </div>
              </div>
            )}

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
                    <div className="text-[10px] text-amber-400">{f.purse} Pts</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Franchises Standings & Quotas
              </h3>
              <span className="text-[10px] font-mono text-slate-400">11 Teams</span>
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
                      <div className="text-[10px] text-slate-400">Coordinator: {f.faculty_coordinator || 'Assigned'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-base font-black text-amber-400">{f.purse} Pts</div>
                      <div className="text-[10px] text-slate-400">Squad: {f.squadCount || 0}/22</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    B3:{f.bucketCounts?.B3 || 0} B4:{f.bucketCounts?.B4 || 0} B2:{f.bucketCounts?.B2 || 0} B5:{f.bucketCounts?.B5 || 0} B1:{f.bucketCounts?.B1 || 0}
                  </div>
                </div>
              ))}
            </div>

            {/* UNSOLD PLAYERS COLUMN ON AUCTION FLOOR (Requirement 3) */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                    Unsold Players Column ({unsoldPlayers.length})
                  </h4>
                </div>
                <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950 px-2 py-0.5 rounded-full border border-rose-800/80">
                  Locked
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Players marked UNSOLD are kept in this column and cannot enter the standard auction or guest draw pools without explicit Admin approval.
              </p>

              {loadingUnsoldPlayers ? (
                <div className="text-center py-4 text-xs text-slate-500 font-mono">Loading unsold roster...</div>
              ) : unsoldPlayers.length === 0 ? (
                <div className="text-center py-5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-500">
                  No unsold players currently recorded in this auction.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 text-xs">
                  {unsoldPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2.5 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {p.photo_url ? (
                          <img
                            src={p.photo_url}
                            alt={p.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold shrink-0 text-[10px]">
                            {p.name?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate text-xs">{p.name}</div>
                          <div className="text-[10px] text-cyan-300 font-mono">
                            {p.roll_number} • {formatAcademicCategory(p.bucket)}
                          </div>
                          <div className="text-[10px] text-amber-400 font-mono font-bold">
                            {p.base_price || 20} Pts (Purse)
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleReAdmitUnsoldPlayer(p.id)}
                        disabled={reAdmittingId === p.id}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-wider shrink-0 transition cursor-pointer shadow"
                      >
                        {reAdmittingId === p.id ? 'Re-admitting...' : 'Approve & Re-enter'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED UNSOLD PLAYERS TAB (Requirement 3) */}
      {activeTab === 'UNSOLD' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Unsold Players Governance Pool ({unsoldPlayers.length})
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Players who went unsold during bidding. These athletes cannot enter the regular or guest draw auction without explicit Super Admin re-admission approval.
              </p>
            </div>
            <button
              onClick={() => fetchUnsoldPlayers()}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Unsold Pool
            </button>
          </div>

          {unsoldPlayers.length === 0 ? (
            <div className="text-center py-16 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
              <Users className="w-10 h-10 text-slate-600" />
              <div className="text-sm font-bold text-white">No Unsold Players</div>
              <p className="text-xs text-slate-400 max-w-sm">
                When an auction lot finishes with zero bids or is marked UNSOLD by the Admin, the player will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                    <th className="p-3">Player Info</th>
                    <th className="p-3">Roll Number</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Role / Skill</th>
                    <th className="p-3">Base Price</th>
                    <th className="p-3 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {unsoldPlayers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-950/40 transition">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {p.photo_url ? (
                            <img src={p.photo_url} alt={p.name} className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold shrink-0 text-xs">
                              {p.name?.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white text-sm">{p.name}</div>
                            <div className="text-[10px] text-slate-400">{p.program} • {p.branch}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-cyan-300 font-bold">{p.roll_number}</td>
                      <td className="p-3 font-mono text-amber-400 font-bold">{formatAcademicCategory(p.bucket)}</td>
                      <td className="p-3 text-slate-300">{p.player_type || p.skill || 'All-Rounder'}</td>
                      <td className="p-3 font-mono text-amber-400 font-black">{p.base_price || 20} Pts (Purse)</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleReAdmitUnsoldPlayer(p.id)}
                          disabled={reAdmittingId === p.id}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md inline-flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{reAdmittingId === p.id ? 'Re-admitting...' : 'Approve for Re-Auction'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPROVALS */}
      {activeTab === 'APPROVALS' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Admin Approval Workflow
              </h3>
              <p className="text-xs text-slate-400">
                A player who has not been approved by Admin MUST NOT enter the auction pool.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Player</th>
                  <th className="p-3">Detained Flag</th>
                  <th className="p-3">Derived Category</th>
                  <th className="p-3">Cricket Discipline</th>
                  <th className="p-3">Approval State</th>
                  <th className="p-3 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {players.map((p) => {
                  const isApproved = p.approval_status === 'APPROVED';

                  return (
                    <tr key={p.id} className="hover:bg-slate-950/40">
                      <td className="p-3">
                        <div className="font-bold text-white text-sm">{p.name}</div>
                        <div className="text-[11px] text-cyan-300 font-mono">{p.roll_number} • {p.branch}</div>
                      </td>
                      <td className="p-3 font-mono font-bold">
                        {isDiplomaPlayer(p) ? (
                          <span className="text-rose-400 font-bold text-xs">Player detained by 1 year diploma</span>
                        ) : p.is_detained === 1 ? (
                          <span className="text-rose-400">YES (Shifted)</span>
                        ) : (
                          <span className="text-slate-400">Regular</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-400">{formatAcademicCategory(p.bucket)}</td>
                      <td className="p-3">{p.player_type || 'All-Rounder'}</td>
                      <td className="p-3 font-mono font-bold text-[10px]">
                        {p.approval_status || 'PENDING'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedPlayerDossier(p)}
                            className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[11px]"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => handleApprovePlayer(p)}
                            disabled={isApproved}
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-bold text-[11px]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectingPlayer(p);
                              setRejectionReasonText('');
                            }}
                            className="px-2.5 py-1 rounded bg-amber-600/20 text-amber-300 border border-amber-500/30 text-[11px]"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => setConfirmDeletePlayer({ id: p.id, name: p.name, roll: p.roll_number })}
                            className="p-1 rounded bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/40 text-[11px]"
                            title="Delete Player"
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
      )}

      {/* TAB 3: SESSIONS */}
      {activeTab === 'SESSIONS' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                Two Auction Sessions Management
              </h3>
              <p className="text-xs text-slate-400">
                Control which players belong to Session 1 or Session 2.
              </p>
            </div>
            <div className="font-mono text-xs">
              Active State: <span className="text-cyan-300 font-bold">{sessionState}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3">
              <div>
                <span className="text-base font-bold text-white">Session 1</span>
                <p className="text-xs text-slate-400 mt-1">
                  Players assigned: <strong>{players.filter((p) => (p.auction_session || 1) === 1).length}</strong>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAuctionSession(1, 'START')}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Start Session 1
                </button>
                <button
                  onClick={() => setAuctionSession(1, 'END')}
                  className="flex-1 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs"
                >
                  End Session 1
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3">
              <div>
                <span className="text-base font-bold text-white">Session 2</span>
                <p className="text-xs text-slate-400 mt-1">
                  Players assigned: <strong>{players.filter((p) => p.auction_session === 2).length}</strong>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAuctionSession(2, 'START')}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Start Session 2
                </button>
                <button
                  onClick={() => setAuctionSession(2, 'END')}
                  className="flex-1 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs"
                >
                  End Session 2
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300 font-mono">
                Assign Selected Eligible Players:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAssignToSession(1)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  Assign to Session 1
                </button>
                <button
                  onClick={() => handleAssignToSession(2)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold"
                >
                  Assign to Session 2
                </button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-800 text-xs">
              {players.filter((p) => p.approval_status === 'APPROVED' && p.is_referred !== 1).map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedPlayerIdsForSession.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedPlayerIdsForSession((prev) => [...prev, p.id]);
                        else setSelectedPlayerIdsForSession((prev) => prev.filter((id) => id !== p.id));
                      }}
                    />
                    <span className="font-bold text-white">{p.name} ({p.roll_number})</span>
                  </div>
                  <span className="text-cyan-300 font-mono font-bold text-[10px]">
                    Session {p.auction_session || 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLAYERS */}
      {activeTab === 'PLAYERS' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-800">
            <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-400" />
              All Players ({players.length})
            </h3>
            <div className="flex items-center gap-2">
              <a
                href="#player/register"
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <span>+ Register New Player</span>
              </a>
              <button
                onClick={() => loadPlayers(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Player</th>
                  <th className="p-3">Detained Flag</th>
                  <th className="p-3">Bucket</th>
                  <th className="p-3">Session</th>
                  <th className="p-3">Approval</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {players.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-950/40">
                    <td className="p-3">
                      <div className="font-bold text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.roll_number} • {p.branch}</div>
                    </td>
                    <td className="p-3 font-bold font-mono">
                      {isDiplomaPlayer(p) ? (
                        <span className="text-rose-400 font-bold text-xs">Player detained by 1 year diploma</span>
                      ) : p.is_detained === 1 ? (
                        <span className="text-rose-400">YES</span>
                      ) : (
                        <span className="text-slate-400">NO</span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-400">{formatAcademicCategory(p.bucket)}</td>
                    <td className="p-3 font-mono">Session {p.auction_session || 1}</td>
                    <td className="p-3 font-mono text-[10px]">{p.approval_status || 'PENDING'}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedPlayerDossier(p)}
                          className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-[11px]"
                        >
                          Dossier
                        </button>
                        <button
                          onClick={() => setConfirmDeletePlayer({ id: p.id, name: p.name, roll: p.roll_number })}
                          className="p-1 rounded bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 text-[11px]"
                          title="Permanently Delete Player"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: REFERRALS */}
      {activeTab === 'REFERRALS' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-400" />
              Referred Players
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Direct squad assignment (0 pts) or transfer to auction floor.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Player</th>
                  <th className="p-3">Captain</th>
                  <th className="p-3">Franchise</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price / Purse</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {referredPlayersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No referral registrations recorded yet.
                    </td>
                  </tr>
                ) : (
                  referredPlayersList.map((p) => (
                    <tr key={p.player_registration_id} className="hover:bg-slate-950/40">
                      <td className="p-3">
                        <div className="font-bold text-white">{p.player_name}</div>
                        <div className="text-[10px] text-cyan-300 font-mono">{p.roll_number}</div>
                      </td>
                      <td className="p-3 text-amber-300 font-bold">{p.captain_name || 'Captain'}</td>
                      <td className="p-3 text-purple-300 font-bold">{p.franchise_name || 'Franchise'}</td>
                      <td className="p-3 font-mono text-amber-400">{formatAcademicCategory(p.bucket)}</td>
                      <td className="p-3 font-mono text-amber-400 font-bold">
                        {p.referral_status === 'APPROVED' ? '0 Pts (Direct Assignment)' : `${p.base_price || 20} Pts (Purse)`}
                      </td>
                      <td className="p-3 font-mono font-bold text-[10px]">{p.referral_status || 'PENDING'}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleDecideReferral(p.player_registration_id, 'ACCEPT')}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow"
                          >
                            Accept to Squad (0 Pts)
                          </button>
                          <button
                            onClick={() => handleDecideReferral(p.player_registration_id, 'REJECT', 20)}
                            className="px-2.5 py-1 rounded bg-rose-900 hover:bg-rose-800 text-rose-200 font-bold text-[11px] transition"
                          >
                            Send to Auction (20 Pts)
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: FRANCHISES */}
      {activeTab === 'FRANCHISES' && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Franchises & Leadership ({franchises.length}/11)
              </h3>
              <button
                onClick={() => setShowCreateFranchiseForm((prev) => !prev)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase"
              >
                {showCreateFranchiseForm ? 'Hide Form' : '+ Register Franchise'}
              </button>
            </div>

            {showCreateFranchiseForm && (
              <form onSubmit={handleCreateFranchise} className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-6 text-xs shadow-2xl">
                {/* 1. Franchise & Faculty Coordinator */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-amber-400 font-bold font-heading uppercase tracking-wider text-sm">
                    <Award className="w-4 h-4" />
                    <span>1. Franchise & Faculty Coordinator Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Franchise Name *</label>
                      <input
                        type="text"
                        required
                        value={newFranchiseName}
                        onChange={(e) => setNewFranchiseName(e.target.value)}
                        placeholder="e.g. Avanthi Titans"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Coordinator Name *</label>
                      <input
                        type="text"
                        required
                        value={newCoordinator}
                        onChange={(e) => setNewCoordinator(e.target.value)}
                        placeholder="Faculty Coordinator Name"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Coordinator Mobile *</label>
                      <input
                        type="tel"
                        required
                        value={newCoordinatorMobile}
                        onChange={(e) => setNewCoordinatorMobile(e.target.value)}
                        placeholder="10-digit Mobile Number"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Department / Branch *</label>
                      <select
                        value={newCoordinatorBranch}
                        onChange={(e) => setNewCoordinatorBranch(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                      >
                        <option value="CSE">CSE - Computer Science & Engineering</option>
                        <option value="ECE">ECE - Electronics & Communication</option>
                        <option value="EEE">EEE - Electrical & Electronics</option>
                        <option value="MECH">MECH - Mechanical Engineering</option>
                        <option value="CIVIL">CIVIL - Civil Engineering</option>
                        <option value="AIML">AIML - AI & Machine Learning</option>
                        <option value="DS">DS - Data Science</option>
                        <option value="IT">IT - Information Technology</option>
                        <option value="MBA">MBA - Master of Business Admin</option>
                        <option value="MCA">MCA - Master of Computer Applications</option>
                        <option value="DIPLOMA">Polytechnic Diploma</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Captain Details & Stats according to Player Role */}
                <div className="flex flex-col gap-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-cyan-400 font-bold font-heading uppercase tracking-wider text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      2. Captain Information & Stats ({newCaptainRole.replace('_', ' ')})
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Stats dynamically configured for {newCaptainRole}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Captain Name *</label>
                      <input
                        type="text"
                        required
                        value={newCaptainName}
                        onChange={(e) => setNewCaptainName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Captain Mobile *</label>
                      <input
                        type="tel"
                        required
                        value={newCaptainMobile}
                        onChange={(e) => setNewCaptainMobile(e.target.value)}
                        placeholder="10-digit Mobile"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Captain Roll Number *</label>
                      <input
                        type="text"
                        required
                        value={newCaptainRoll}
                        onChange={(e) => setNewCaptainRoll(e.target.value.toUpperCase())}
                        placeholder="e.g. 23811A0501"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Captain Cricket Role *</label>
                      <select
                        value={newCaptainRole}
                        onChange={(e) => setNewCaptainRole(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-bold"
                      >
                        <option value="ALL_ROUNDER">All-Rounder</option>
                        <option value="BATSMAN">Batter / Batsman</option>
                        <option value="BOWLER">Bowler</option>
                        <option value="WICKET_KEEPER">Wicket-Keeper</option>
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Captain Stats Fields */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1 font-bold">Matches</label>
                      <input
                        type="number"
                        min="0"
                        value={newCapMatches}
                        onChange={(e) => setNewCapMatches(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                      />
                    </div>

                    {(newCaptainRole === 'BATSMAN' || newCaptainRole === 'ALL_ROUNDER' || newCaptainRole === 'WICKET_KEEPER') && (
                      <>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Total Runs</label>
                          <input
                            type="number"
                            min="0"
                            value={newCapRuns}
                            onChange={(e) => setNewCapRuns(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Batting Avg</label>
                          <input
                            type="text"
                            value={newCapBatAvg}
                            onChange={(e) => setNewCapBatAvg(e.target.value)}
                            placeholder="32.5"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Strike Rate</label>
                          <input
                            type="text"
                            value={newCapSR}
                            onChange={(e) => setNewCapSR(e.target.value)}
                            placeholder="130.0"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">High Score</label>
                          <input
                            type="text"
                            value={newCapHighScore}
                            onChange={(e) => setNewCapHighScore(e.target.value)}
                            placeholder="74*"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Batting Style</label>
                          <select
                            value={newCapBattingStyle}
                            onChange={(e) => setNewCapBattingStyle(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-[11px]"
                          >
                            <option value="Right Hand Bat">Right Hand Bat</option>
                            <option value="Left Hand Bat">Left Hand Bat</option>
                          </select>
                        </div>
                      </>
                    )}

                    {(newCaptainRole === 'BOWLER' || newCaptainRole === 'ALL_ROUNDER') && (
                      <>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Wickets</label>
                          <input
                            type="number"
                            min="0"
                            value={newCapWickets}
                            onChange={(e) => setNewCapWickets(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Economy</label>
                          <input
                            type="text"
                            value={newCapEcon}
                            onChange={(e) => setNewCapEcon(e.target.value)}
                            placeholder="7.2"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Best Bowling</label>
                          <input
                            type="text"
                            value={newCapBestBowl}
                            onChange={(e) => setNewCapBestBowl(e.target.value)}
                            placeholder="3/22"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Bowling Style</label>
                          <select
                            value={newCapBowlingStyle}
                            onChange={(e) => setNewCapBowlingStyle(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-[11px]"
                          >
                            <option value="Right-arm Medium">Right-arm Medium</option>
                            <option value="Right-arm Fast">Right-arm Fast</option>
                            <option value="Right-arm Off-Spin">Right-arm Off-Spin</option>
                            <option value="Right-arm Leg-Spin">Right-arm Leg-Spin</option>
                            <option value="Left-arm Fast">Left-arm Fast</option>
                            <option value="Left-arm Spin">Left-arm Spin</option>
                          </select>
                        </div>
                      </>
                    )}

                    {newCaptainRole === 'WICKET_KEEPER' && (
                      <>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Catches</label>
                          <input
                            type="number"
                            min="0"
                            value={newCapCatches}
                            onChange={(e) => setNewCapCatches(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Stumpings</label>
                          <input
                            type="number"
                            min="0"
                            value={newCapStumpings}
                            onChange={(e) => setNewCapStumpings(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. Vice-Captain Details & Stats according to Player Role */}
                <div className="flex flex-col gap-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-emerald-400 font-bold font-heading uppercase tracking-wider text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      3. Vice-Captain Information & Stats ({newViceCaptainRole.replace('_', ' ')})
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Stats dynamically configured for {newViceCaptainRole}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Vice-Captain Name *</label>
                      <input
                        type="text"
                        required
                        value={newViceCaptainName}
                        onChange={(e) => setNewViceCaptainName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Vice-Captain Mobile *</label>
                      <input
                        type="tel"
                        required
                        value={newViceCaptainMobile}
                        onChange={(e) => setNewViceCaptainMobile(e.target.value)}
                        placeholder="10-digit Mobile"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Vice-Captain Roll Number *</label>
                      <input
                        type="text"
                        required
                        value={newViceCaptainRoll}
                        onChange={(e) => setNewViceCaptainRoll(e.target.value.toUpperCase())}
                        placeholder="e.g. 23811A0402"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Vice-Captain Cricket Role *</label>
                      <select
                        value={newViceCaptainRole}
                        onChange={(e) => setNewViceCaptainRole(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-300 font-bold"
                      >
                        <option value="ALL_ROUNDER">All-Rounder</option>
                        <option value="BATSMAN">Batter / Batsman</option>
                        <option value="BOWLER">Bowler</option>
                        <option value="WICKET_KEEPER">Wicket-Keeper</option>
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Vice-Captain Stats Fields */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1 font-bold">Matches</label>
                      <input
                        type="number"
                        min="0"
                        value={newVcMatches}
                        onChange={(e) => setNewVcMatches(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                      />
                    </div>

                    {(newViceCaptainRole === 'BATSMAN' || newViceCaptainRole === 'ALL_ROUNDER' || newViceCaptainRole === 'WICKET_KEEPER') && (
                      <>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Total Runs</label>
                          <input
                            type="number"
                            min="0"
                            value={newVcRuns}
                            onChange={(e) => setNewVcRuns(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Batting Avg</label>
                          <input
                            type="text"
                            value={newVcBatAvg}
                            onChange={(e) => setNewVcBatAvg(e.target.value)}
                            placeholder="28.0"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Strike Rate</label>
                          <input
                            type="text"
                            value={newVcSR}
                            onChange={(e) => setNewVcSR(e.target.value)}
                            placeholder="120.0"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">High Score</label>
                          <input
                            type="text"
                            value={newVcHighScore}
                            onChange={(e) => setNewVcHighScore(e.target.value)}
                            placeholder="65*"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Batting Style</label>
                          <select
                            value={newVcBattingStyle}
                            onChange={(e) => setNewVcBattingStyle(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-[11px]"
                          >
                            <option value="Right Hand Bat">Right Hand Bat</option>
                            <option value="Left Hand Bat">Left Hand Bat</option>
                          </select>
                        </div>
                      </>
                    )}

                    {(newViceCaptainRole === 'BOWLER' || newViceCaptainRole === 'ALL_ROUNDER') && (
                      <>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Wickets</label>
                          <input
                            type="number"
                            min="0"
                            value={newVcWickets}
                            onChange={(e) => setNewVcWickets(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Economy</label>
                          <input
                            type="text"
                            value={newVcEcon}
                            onChange={(e) => setNewVcEcon(e.target.value)}
                            placeholder="6.8"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Best Bowling</label>
                          <input
                            type="text"
                            value={newVcBestBowl}
                            onChange={(e) => setNewVcBestBowl(e.target.value)}
                            placeholder="4/18"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Bowling Style</label>
                          <select
                            value={newVcBowlingStyle}
                            onChange={(e) => setNewVcBowlingStyle(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-[11px]"
                          >
                            <option value="Right-arm Fast">Right-arm Fast</option>
                            <option value="Right-arm Medium">Right-arm Medium</option>
                            <option value="Right-arm Off-Spin">Right-arm Off-Spin</option>
                            <option value="Right-arm Leg-Spin">Right-arm Leg-Spin</option>
                            <option value="Left-arm Fast">Left-arm Fast</option>
                            <option value="Left-arm Spin">Left-arm Spin</option>
                          </select>
                        </div>
                      </>
                    )}

                    {newViceCaptainRole === 'WICKET_KEEPER' && (
                      <>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Catches</label>
                          <input
                            type="number"
                            min="0"
                            value={newVcCatches}
                            onChange={(e) => setNewVcCatches(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1 font-bold">Stumpings</label>
                          <input
                            type="number"
                            min="0"
                            value={newVcStumpings}
                            onChange={(e) => setNewVcStumpings(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateFranchiseForm(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFranchise}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider shadow-lg shadow-amber-950/40"
                  >
                    {submittingFranchise ? 'Registering...' : 'Register Complete Franchise'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {franchises.length === 0 ? (
            <div className="p-10 rounded-2xl bg-slate-900 border border-dashed border-slate-700 text-center flex flex-col items-center justify-center gap-3">
              <Award className="w-12 h-12 text-amber-400 opacity-60" />
              <div className="font-heading text-lg font-bold text-white">No Franchises Registered</div>
              <p className="text-xs text-slate-400 max-w-sm">
                The database is clean. Click the <strong>"+ Register Franchise"</strong> button above to add fresh teams to the tournament.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateFranchiseForm(true)}
                className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer"
              >
                + Register First Franchise
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {franchises.map((f, idx) => (
                <div key={f.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-xl gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-800">
                      <div>
                        <h4 className="font-heading text-lg font-black text-white">{f.name}</h4>
                        <span className="text-[10px] text-cyan-300 font-mono font-bold">{f.id}</span>
                      </div>
                      <span className="text-amber-400 font-mono font-black text-sm">{f.purse} Pts</span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] text-amber-400 uppercase font-mono font-bold block">Coordinator</span>
                        <div className="text-white font-semibold">{f.faculty_coordinator || 'Assigned Coordinator'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Dept: <strong className="text-slate-300">{f.department || f.faculty_branch || 'General'}</strong>
                          {f.faculty_mobile && <> • Ph: <strong className="text-slate-300">{f.faculty_mobile}</strong></>}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] text-cyan-400 uppercase font-mono font-bold block">Captain ({f.captain_skill || 'All-Rounder'})</span>
                        <div className="text-white font-semibold">{f.captain_name || 'Designated'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Roll: <strong className="text-slate-300">{f.captain_roll || 'N/A'}</strong>
                          {f.captain_mobile && <> • Ph: <strong className="text-slate-300">{f.captain_mobile}</strong></>}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold block">Vice-Captain ({f.vice_captain_skill || 'All-Rounder'})</span>
                        <div className="text-white font-semibold">{f.vice_captain_name || 'Designated'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Roll: <strong className="text-slate-300">{f.vice_captain_roll || 'N/A'}</strong>
                          {f.vice_captain_mobile && <> • Ph: <strong className="text-slate-300">{f.vice_captain_mobile}</strong></>}
                        </div>
                      </div>

                      <div className="text-xs text-slate-400 font-mono pt-1">Squad: <strong className="text-white">{f.squadCount || 0}/22</strong> players</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => handleRegenerateFranchiseCredentials(f.id)}
                      className="flex-1 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Key className="w-3.5 h-3.5" /> Passcode
                    </button>
                    <button
                      onClick={() => setConfirmDeleteFranchise({ id: f.id, name: f.name })}
                      className="p-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 transition"
                      title="Permanently Delete Franchise"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: ADMIN ACCOUNTS */}
      {activeTab === 'ADMIN_ACCOUNTS' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                Administrator Governance & Delegation
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Authorized administrators can delegate access and provision administrative accounts for new organizers.
              </p>
            </div>
            <button
              onClick={() => setShowCreateAdminForm((prev) => !prev)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-950/50"
            >
              <UserPlus className="w-4 h-4" />
              {showCreateAdminForm ? 'Close Form' : '+ Register New Administrator'}
            </button>
          </div>

          {showCreateAdminForm && (
            <form onSubmit={handleCreateAdmin} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-4 text-xs shadow-xl">
              <h4 className="font-heading text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Register New Administrator
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Admin Username *</label>
                  <input
                    type="text"
                    required
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                    placeholder="e.g. convenor_sports"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Admin Email (Optional)</label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="convenor@avanthi.edu.in"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Administrative Role *</label>
                  <select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-purple-300 font-bold"
                  >
                    <option value="SUPER_ADMIN">Super Administrator (Full Controls)</option>
                    <option value="ADMIN">Tournament Administrator</option>
                    <option value="OPERATOR">Console Operator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={newAdminConfirmPassword}
                    onChange={(e) => setNewAdminConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateAdminForm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdmin}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-wider cursor-pointer shadow-lg"
                >
                  {submittingAdmin ? 'Registering...' : 'Provision Admin Account'}
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider font-bold">
              Existing Administrators ({adminList.length})
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
              {adminList.map((adm) => (
                <div key={adm.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between shadow-md">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{adm.username}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        adm.role === 'SUPER_ADMIN' ? 'bg-purple-900/60 text-purple-300 border border-purple-700' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {adm.role}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{adm.email || `${adm.username}@avanthi.edu.in`}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'Active'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: TESTS */}
      {activeTab === 'TESTS' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              ACC 31 Acceptance Tests
            </h3>
            <button
              onClick={handleRunTests}
              disabled={runningTests}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              {runningTests ? 'Running...' : 'Execute Tests'}
            </button>
          </div>

          {testResults && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono max-h-96 overflow-y-auto">
              {testResults.tests?.map((t: any) => (
                <div key={t.id} className={`p-2.5 rounded-lg border flex justify-between ${t.passed ? 'bg-slate-950 border-emerald-900/40 text-slate-300' : 'bg-red-950 border-red-800 text-red-300'}`}>
                  <span>[{t.id}] {t.name}</span>
                  <strong className={t.passed ? 'text-emerald-400' : 'text-red-400'}>{t.passed ? 'PASS' : 'FAIL'}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 9: AUDIT */}
      {activeTab === 'AUDIT' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
          <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Audit Trail
          </h3>
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto text-xs font-mono">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                <span>{log.action} - {log.actor} ({log.entity})</span>
                <span className="text-slate-500 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <GuestDrawModal
        isOpen={showGuestDrawModal}
        onClose={() => setShowGuestDrawModal(false)}
        onPlayerSelected={() => {
          setActionMessage('Player called via Guest Draw Mode!');
          refreshState({ force: true });
        }}
      />

      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 font-mono text-xs">
            <h3 className="text-lg font-bold text-white font-heading">Credentials for {credentialsModal.name}</h3>
            <div>ID: <strong className="text-cyan-300">{credentialsModal.franchiseId}</strong></div>
            <div>Username: <strong className="text-white">{credentialsModal.username}</strong></div>
            <div>Password: <strong className="text-amber-400">{credentialsModal.password}</strong></div>
            <button
              onClick={() => setCredentialsModal(null)}
              className="mt-2 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold uppercase"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showResetSystemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-600 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-xs">
            <h3 className="font-heading text-xl font-bold text-white">Confirm Complete Tournament Reset?</h3>
            <p className="text-slate-300">
              This will completely delete all data from the app (all players, franchises, bids, lots, and sales). You will be able to add fresh franchises and register new players from scratch.
            </p>
            <p className="text-amber-400 font-semibold">
              Type RESET to completely wipe data and start fresh:
            </p>
            <input
              type="text"
              value={resetConfirmationInput}
              onChange={(e) => setResetConfirmationInput(e.target.value.toUpperCase())}
              placeholder="Type RESET"
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetSystemModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                disabled={resettingSystem || resetConfirmationInput !== 'RESET'}
                onClick={handleResetSystem}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white font-bold"
              >
                {resettingSystem ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE FRANCHISE MODAL (Requirement 3) */}
      {confirmDeleteFranchise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-600 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-heading text-lg font-bold text-white">Delete Franchise?</h3>
            </div>
            <p className="text-slate-300">
              Are you sure you want to permanently delete franchise <strong className="text-white">{confirmDeleteFranchise.name}</strong>?
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              This will remove the franchise, its faculty coordinator, its squad allocations, and its user credentials from the database.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteFranchise(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFranchise(confirmDeleteFranchise.id, confirmDeleteFranchise.name)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PLAYER MODAL (Requirement 3) */}
      {confirmDeletePlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-600 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-heading text-lg font-bold text-white">Delete Player?</h3>
            </div>
            <p className="text-slate-300">
              Are you sure you want to permanently delete player <strong className="text-white">{confirmDeletePlayer.name}</strong> ({confirmDeletePlayer.roll})?
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              This will completely remove the player profile, photograph, auction lots, and stats from the database.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeletePlayer(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeletePlayer(confirmDeletePlayer.id, confirmDeletePlayer.name)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT PLAYER MODAL (Requirement 5) */}
      {rejectingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-amber-600 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center gap-3 text-amber-400">
              <XCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-heading text-lg font-bold text-white">Reject Player From Auction Pool</h3>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Rejecting <strong className="text-white">{rejectingPlayer.name}</strong> ({rejectingPlayer.roll_number}) will set their status to <strong>REJECTED</strong> and keep them ineligible from entering the auction floor.
            </p>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                Rejection Reason (Optional):
              </label>
              <input
                type="text"
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                placeholder="e.g. Incomplete cricket stats or criteria not met"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-sans"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingPlayer(null);
                  setRejectionReasonText('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!rejectingPlayer) return;
                  try {
                    const res = await approvePlayer(
                      rejectingPlayer.id,
                      'REJECTED',
                      rejectionReasonText || 'Profile rejected by Tournament Administrator'
                    );
                    if (res?.success) {
                      setActionMessage(`Player '${rejectingPlayer.name}' has been REJECTED from the auction pool.`);
                      setRejectingPlayer(null);
                      setRejectionReasonText('');
                      refreshState({ force: true });
                    } else {
                      setActionError(res?.error || 'Failed to reject player');
                    }
                  } catch (err: any) {
                    setActionError(err.message);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase tracking-wider cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYER DOSSIER REVIEW MODAL */}
      {selectedPlayerDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                  {selectedPlayerDossier.photo_url ? (
                    <img src={selectedPlayerDossier.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-slate-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-white">{selectedPlayerDossier.name}</h3>
                  <div className="text-cyan-300 font-mono text-[11px]">
                    {selectedPlayerDossier.roll_number} • {selectedPlayerDossier.branch}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayerDossier(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Academic Category</span>
                <span className="text-amber-400 font-bold">{formatAcademicCategory(selectedPlayerDossier.bucket)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Detained Status</span>
                <span className={isDiplomaPlayer(selectedPlayerDossier) || selectedPlayerDossier.is_detained === 1 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {isDiplomaPlayer(selectedPlayerDossier)
                    ? 'Player detained by 1 year diploma'
                    : selectedPlayerDossier.is_detained === 1
                    ? 'YES'
                    : 'NO'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Cricket Role</span>
                <span className="text-white font-bold">{selectedPlayerDossier.player_type || 'All-Rounder'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Approval Status</span>
                <span className="text-cyan-300 font-bold">{selectedPlayerDossier.approval_status || 'PENDING'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-mono">Contact & Placement</span>
              <div className="flex justify-between text-slate-300">
                <span>Mobile: {selectedPlayerDossier.mobile_number || 'N/A'}</span>
                <span>Session: {selectedPlayerDossier.auction_session || 1}</span>
              </div>
              {selectedPlayerDossier.rejection_reason && (
                <div className="text-amber-400 text-[11px] mt-1 pt-1 border-t border-slate-900">
                  Rejection Reason: {selectedPlayerDossier.rejection_reason}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const p = selectedPlayerDossier;
                  setSelectedPlayerDossier(null);
                  setConfirmDeletePlayer({ id: p.id, name: p.name, roll: p.roll_number });
                }}
                className="px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>

              <button
                type="button"
                onClick={() => {
                  const p = selectedPlayerDossier;
                  setSelectedPlayerDossier(null);
                  setRejectingPlayer(p);
                  setRejectionReasonText('');
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleApprovePlayer(selectedPlayerDossier);
                  setSelectedPlayerDossier(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Approve Player
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
