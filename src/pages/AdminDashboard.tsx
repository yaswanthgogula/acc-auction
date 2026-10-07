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
import { formatAcademicCategory } from '../utils/academicCategories';
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
  } = useAuction();

  const [customTimerDuration, setCustomTimerDuration] = useState<number>(60);
  const [customTimerMessage, setCustomTimerMessage] = useState<string>('Live Auction starting soon! All franchises take positions.');
  const [settingCustomAlert, setSettingCustomAlert] = useState(false);

  const [decidingReferralId, setDecidingReferralId] = useState<string | null>(null);
  const [showGuestDrawModal, setShowGuestDrawModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'AUCTION' | 'APPROVALS' | 'SESSIONS' | 'PLAYERS' | 'REFERRALS' | 'FRANCHISES' | 'ADMIN_ACCOUNTS' | 'TESTS' | 'AUDIT'>('AUCTION');
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
  const [newCaptainName, setNewCaptainName] = useState('');
  const [newCaptainMobile, setNewCaptainMobile] = useState('');
  const [newCaptainRoll, setNewCaptainRoll] = useState('');
  const [newCaptainRole, setNewCaptainRole] = useState<'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER'>('ALL_ROUNDER');
  const [newViceCaptainName, setNewViceCaptainName] = useState('');
  const [newViceCaptainMobile, setNewViceCaptainMobile] = useState('');
  const [newViceCaptainRoll, setNewViceCaptainRoll] = useState('');

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
    if (!newCaptainName.trim()) {
      setActionError('Captain Name is required.');
      return;
    }
    if (!newViceCaptainName.trim()) {
      setActionError('Vice-Captain Name is required.');
      return;
    }

    setSubmittingFranchise(true);
    try {
      const payload = {
        editionId,
        name: newFranchiseName.trim(),
        customFranchiseId: newFranchiseCustomId.trim() || undefined,
        facultyCoordinator: newCoordinator.trim() || 'Assigned Faculty Coordinator',
        facultyBranch: newCoordinatorBranch || 'General',
        facultyMobile: newCoordinatorMobile.trim() || '',
        department: newCoordinatorBranch || 'Engineering',
        customPassword: newFranchiseCustomPassword.trim() || undefined,
        captainName: newCaptainName.trim(),
        captainMobile: newCaptainMobile.trim() || '',
        captainRole: newCaptainRole,
        captainStats: {
          roll: newCaptainRoll.trim(),
          matches: 15,
          runs: 420,
          wickets: 14,
        },
        viceCaptainName: newViceCaptainName.trim(),
        viceCaptainMobile: newViceCaptainMobile.trim() || '',
        viceCaptainRole: 'ALL_ROUNDER',
        viceCaptainStats: {
          roll: newViceCaptainRoll.trim(),
          matches: 14,
          runs: 280,
          wickets: 18,
        },
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

      setActionMessage(`Franchise '${newFranchiseName}' registered successfully with Captain and Vice-Captain stats!`);
      if (data.credentials) {
        setCredentialsModal(data.credentials);
      }

      setNewFranchiseName('');
      setNewFranchiseCustomId('');
      setNewCoordinator('');
      setNewCoordinatorMobile('');
      setNewCaptainName('');
      setNewViceCaptainName('');
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
                    onClick={() => drawNextPlayer('AUTO')}
                    className="flex-1 w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Random Draw (Fixed Order)</span>
                  </button>

                  <button
                    onClick={() => setShowGuestDrawModal(true)}
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
                    <div className="text-[10px] text-amber-400">{f.purse} Pts (₹)</div>
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
                      <div className="font-mono text-base font-black text-amber-400">{f.purse} Pts (₹)</div>
                      <div className="text-[10px] text-slate-400">Squad: {f.squadCount || 0}/22</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    B3:{f.bucketCounts?.B3 || 0} B4:{f.bucketCounts?.B4 || 0} B2:{f.bucketCounts?.B2 || 0} B5:{f.bucketCounts?.B5 || 0} B1:{f.bucketCounts?.B1 || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                        {p.is_detained === 1 ? <span className="text-rose-400">YES (Shifted)</span> : <span className="text-slate-400">Regular</span>}
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
                            className="px-2.5 py-1 rounded bg-red-600/20 text-red-300 border border-red-500/30 text-[11px]"
                          >
                            Reject
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
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
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
                      {p.is_detained === 1 ? <span className="text-rose-400">YES</span> : <span className="text-slate-400">NO</span>}
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-400">{formatAcademicCategory(p.bucket)}</td>
                    <td className="p-3 font-mono">Session {p.auction_session || 1}</td>
                    <td className="p-3 font-mono text-[10px]">{p.approval_status || 'PENDING'}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedPlayerDossier(p)}
                        className="px-2.5 py-1 rounded bg-blue-600/20 text-blue-300 font-bold text-[11px]"
                      >
                        Dossier
                      </button>
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
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {referredPlayersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
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
                      <td className="p-3 font-mono font-bold text-[10px]">{p.referral_status || 'PENDING'}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleDecideReferral(p.player_registration_id, 'ACCEPT')}
                            className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[11px]"
                          >
                            Accept to Squad
                          </button>
                          <button
                            onClick={() => handleDecideReferral(p.player_registration_id, 'REJECT', 20)}
                            className="px-2.5 py-1 rounded bg-rose-900 text-rose-200 font-bold text-[11px]"
                          >
                            Send to Auction
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
              <form onSubmit={handleCreateFranchise} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Franchise Name *</label>
                    <input
                      type="text"
                      required
                      value={newFranchiseName}
                      onChange={(e) => setNewFranchiseName(e.target.value)}
                      placeholder="e.g. Avanthi Titans"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Captain Name *</label>
                    <input
                      type="text"
                      required
                      value={newCaptainName}
                      onChange={(e) => setNewCaptainName(e.target.value)}
                      placeholder="Captain Full Name"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Vice-Captain Name *</label>
                    <input
                      type="text"
                      required
                      value={newViceCaptainName}
                      onChange={(e) => setNewViceCaptainName(e.target.value)}
                      placeholder="Vice-Captain Full Name"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateFranchiseForm(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFranchise}
                    className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black uppercase"
                  >
                    {submittingFranchise ? 'Registering...' : 'Register Franchise'}
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
                <div key={f.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h4 className="font-heading text-lg font-black text-white">{f.name}</h4>
                      <span className="text-amber-400 font-mono font-bold text-xs">{f.purse} Pts</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">Captain: {f.captain_name || 'Designated'}</div>
                    <div className="text-xs text-slate-400 font-mono">VC: {f.vice_captain_name || 'Designated'}</div>
                    <div className="text-xs text-slate-500 font-mono mt-1">Squad: {f.squadCount || 0}/22</div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800 mt-3">
                    <button
                      onClick={() => handleRegenerateFranchiseCredentials(f.id)}
                      className="flex-1 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Key className="w-3.5 h-3.5" /> Pass
                    </button>
                    <button
                      onClick={() => setConfirmDeleteFranchise({ id: f.id, name: f.name })}
                      className="p-1.5 rounded-xl bg-red-600/20 text-red-300"
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
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
          <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            Active Administrators
          </h3>
          <div className="flex flex-col gap-2 font-mono text-xs">
            {adminList.map((adm) => (
              <div key={adm.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-white font-bold">{adm.username} ({adm.role})</span>
                <span className="text-slate-400">{adm.email}</span>
              </div>
            ))}
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
    </div>
  );
};
