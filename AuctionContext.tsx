/**
 * ============================================================================
 * ACC REAL-TIME LIVE AUCTION CONTEXT & STATE MACHINE
 * ============================================================================
 * Supports Two Auction Sessions (Req 11), Automatic 10-Second Transition (Req 6),
 * Guest Mode masked identifiers (Req 5), Player Profile Editing (Req 7),
 * and Admin Approvals (Req 8).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { auctionSound } from '../utils/auctionSound';
import { mobileNotification } from '../utils/mobileNotification';
import { formatAcademicCategory, normalizeCategoryCode, STRICT_BUCKET_AUCTION_ORDER } from '../utils/academicCategories';
import { clockSync } from '../utils/clockSync';

export type AuctionFloorPhase = 'UPCOMING' | 'BIDDING' | 'SOLD' | 'UNSOLD';

export interface AuctionSaleRecord {
  lotId: string;
  playerId: string;
  playerName?: string;
  playerPhoto?: string;
  bucket?: string;
  winningFranchiseId: string;
  winningFranchiseName?: string;
  winningFranchiseLogo?: string;
  finalPrice: number;
  lotState: 'SOLD';
  timestamp?: number;
  player?: any;
  franchise?: any;
  amount?: number;
}

export interface UpcomingCandidate {
  id: string;
  name: string;
  roll_number: string;
  photo_url?: string;
  program: string;
  branch: string;
  academic_year: number;
  skill?: string;
  player_type?: string;
  base_price: number;
  bucket: string;
  academicCategoryLabel?: string;
  is_detained?: number;
  auction_session?: number;
  random_identifier?: string;
}

export interface AuctionNotification {
  id: string;
  editionId?: string;
  title: string;
  message: string;
  type: string;
  target?: string;
  startsAt?: number;
  startsInMinutes?: number;
  createdBy?: string;
  createdAt: number;
}

export interface PlayerStatsSummary {
  total: number;
  approved: number;
  pendingApproval: number;
  eligible: number;
  batters: number;
  bowlers: number;
  allRounders: number;
  wicketKeepers: number;
}

interface AuctionContextType {
  currentLot: any | null;
  auctionPhase: AuctionFloorPhase;
  upcomingPlayers: UpcomingCandidate[];
  franchises: any[];
  scarcity: Record<string, any>;
  soldCount: number;
  unsoldCount: number;
  serverTime: number;
  connected: boolean;
  loading: boolean;
  editionId: string;
  recentBids: any[];
  viewerCount: number;
  soundEnabled: boolean;
  lastSaleEvent: AuctionSaleRecord | null;
  activeNotification: AuctionNotification | null;

  // Custom Timer Alert (Requirement 2)
  customTimerAlert: {
    active: boolean;
    startsAt: number;
    durationSeconds: number;
    message: string;
    phase: 'ALERT_COUNTDOWN' | 'FINAL_10S' | 'STARTED';
    secondsRemaining?: number;
  } | null;
  liveBidNotification: {
    playerName: string;
    franchiseName: string;
    amount: number;
    message: string;
    timestamp: number;
  } | null;
  setCustomTimerAlert: (durationSeconds: number, message?: string) => Promise<{ success: boolean; alert?: any; error?: string }>;
  cancelCustomTimerAlert: () => Promise<{ success: boolean; error?: string }>;
  dismissLiveBidNotification: () => void;

  // Session & Automatic Transition (Requirements 6 & 11)
  activeSession: 1 | 2;
  sessionState: string;
  autoTransitionCountdown: number | null;
  autoTransitionDeadline: number | null;
  isPaused: boolean;
  pausedRemainingMs: number | null;
  togglePauseAuction: () => Promise<{ success: boolean; isPaused?: boolean; error?: string }>;
  pauseAuction: () => Promise<{ success: boolean; isPaused?: boolean; error?: string }>;
  resumeAuction: () => Promise<{ success: boolean; isPaused?: boolean; error?: string }>;
  setAuctionSession: (session: 1 | 2, action: 'START' | 'END') => Promise<{ success: boolean; message?: string; error?: string }>;
  assignPlayersToSession: (playerIds: string[], session: 1 | 2) => Promise<{ success: boolean; message?: string; error?: string }>;

  // Player approvals & profiles (Requirements 7 & 8)
  approvePlayer: (playerId: string, status: 'APPROVED' | 'REJECTED', reason?: string, basePrice?: number, session?: 1 | 2) => Promise<{ success: boolean; message?: string; error?: string }>;
  updatePlayerProfile: (playerId: string, data: any) => Promise<{ success: boolean; message?: string; player?: any; error?: string }>;

  players: any[];
  loadingPlayers: boolean;
  playersError: string | null;
  playersById: Record<string, any>;
  playersByBucket: Record<string, any[]>;
  auctionEligiblePlayers: any[];
  playerStatsSummary: PlayerStatsSummary;
  fetchPlayers: (options?: { force?: boolean; editionId?: string }) => Promise<any[]>;
  getPlayerById: (idOrRoll: string) => any | null;
  getPlayersByBucket: (bucket: string) => any[];

  dismissNotification: () => void;
  sendAuctionNotification: (params?: { startsInMinutes?: number; title?: string; message?: string; target?: string }) => Promise<{ success: boolean; notification?: any; error?: string }>;
  toggleSound: () => void;
  refreshState: (options?: { force?: boolean }) => Promise<void>;
  placeBid: (franchiseId: string) => Promise<{ success: boolean; error?: string }>;
  passLot: (franchiseId: string) => Promise<{ success: boolean; error?: string }>;
  strikeHammer: () => Promise<{ success: boolean; result?: any; error?: string }>;
  drawNextPlayer: (mode?: 'AUTO' | 'GUEST', identifierOrId?: string) => Promise<{ success: boolean; lot?: any; error?: string }>;
  skipCurrentLot: (reason?: string) => Promise<{ success: boolean; error?: string }>;
  undoSale: (saleId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  adjustTimer: (seconds: number) => Promise<{ success: boolean; error?: string }>;
  resetTimer: (seconds?: number) => Promise<{ success: boolean; error?: string }>;
  removeSquadPlayer: (franchiseId: string, playerId: string, reason: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  updateCaptainStats: (franchiseId: string, statsData: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  regenerateFranchiseCredentials: (franchiseId: string) => Promise<{ success: boolean; credentials?: any; error?: string }>;
}

const AuctionContext = createContext<AuctionContextType | undefined>(undefined);

export const AuctionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLot, setCurrentLot] = useState<any | null>(null);
  const [upcomingPlayers, setUpcomingPlayers] = useState<UpcomingCandidate[]>([]);
  const [franchises, setFranchises] = useState<any[]>([]);
  const [scarcity, setScarcity] = useState<Record<string, any>>({});
  const [soldCount, setSoldCount] = useState(0);
  const [unsoldCount, setUnsoldCount] = useState(0);
  const [serverTime, setServerTime] = useState<number>(() => clockSync.getNow());
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editionId, setEditionId] = useState('');
  const [recentBids, setRecentBids] = useState<any[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastSaleEvent, setLastSaleEvent] = useState<AuctionSaleRecord | null>(null);
  const [activeNotification, setActiveNotification] = useState<AuctionNotification | null>(null);

  // Synchronized real-time clock tick for smooth seconds display across views
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setServerTime(clockSync.getNow());
    }, 500);
    return () => clearInterval(tickInterval);
  }, []);

  // Custom Timer Alert & Live Bid Notification (Requirement 2)
  const [customTimerAlert, setCustomTimerAlert] = useState<{
    active: boolean;
    startsAt: number;
    durationSeconds: number;
    message: string;
    phase: 'ALERT_COUNTDOWN' | 'FINAL_10S' | 'STARTED';
    secondsRemaining?: number;
  } | null>(null);

  const [liveBidNotification, setLiveBidNotification] = useState<{
    playerName: string;
    franchiseName: string;
    amount: number;
    message: string;
    timestamp: number;
  } | null>(null);

  // Requirements 6 & 11 States
  const [activeSession, setActiveSession] = useState<1 | 2>(1);
  const [sessionState, setSessionState] = useState<string>('SESSION_1_ACTIVE');
  const [autoTransitionCountdown, setAutoTransitionCountdown] = useState<number | null>(null);
  const [autoTransitionDeadline, setAutoTransitionDeadline] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pausedRemainingMs, setPausedRemainingMs] = useState<number | null>(null);

  const [players, setPlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState<boolean>(false);
  const [playersError, setPlayersError] = useState<string | null>(null);

  const playersRef = useRef<any[]>([]);
  const lastFetchTimeRef = useRef<number>(0);
  const inFlightFetchPromiseRef = useRef<Promise<any[]> | null>(null);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const auctionPhase: AuctionFloorPhase = useMemo(() => {
    if (currentLot) {
      if (currentLot.lot_state === 'SOLD') return 'SOLD';
      if (currentLot.lot_state === 'UNSOLD') return 'UNSOLD';
      return 'BIDDING';
    }
    if (lastSaleEvent && lastSaleEvent.lotState === 'SOLD') {
      return 'SOLD';
    }
    return 'UPCOMING';
  }, [currentLot, lastSaleEvent]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      auctionSound.enabled = next;
      return next;
    });
  }, []);

  const lastStateFetchRef = useRef<number>(0);
  const inFlightStateFetchRef = useRef<Promise<void> | null>(null);

  const refreshState = useCallback(async (options?: { force?: boolean }) => {
    const now = Date.now();
    if (!options?.force && now - lastStateFetchRef.current < 2000) {
      return;
    }
    if (inFlightStateFetchRef.current) {
      return inFlightStateFetchRef.current;
    }

    const promise = (async () => {
      try {
        const res = await fetch('/api/auction/state');
        const data = await res.json();
        if (data.success) {
          lastStateFetchRef.current = Date.now();
          setCurrentLot((prev: any) => {
            if (!data.currentLot) return null;
            if (!prev || prev.id !== data.currentLot.id) return data.currentLot;
            if ((data.currentLot.bid_count ?? 0) < (prev.bid_count ?? 0)) return prev;
            return data.currentLot;
          });
          if (Array.isArray(data.upcomingPlayers)) {
            setUpcomingPlayers(data.upcomingPlayers);
          }
          setFranchises(data.franchises || []);
          setScarcity(data.scarcity || {});
          setSoldCount(data.soldCount || 0);
          setUnsoldCount(data.unsoldCount || 0);
          if (data.serverTime) {
            clockSync.recordServerTime(data.serverTime);
          }
          setServerTime(clockSync.getNow());
          if (typeof data.viewerCount === 'number') {
            setViewerCount(data.viewerCount);
          }
          if (data.editionId) setEditionId(data.editionId);
          if (data.activeSession) setActiveSession(data.activeSession === 2 ? 2 : 1);
          if (data.sessionState) setSessionState(data.sessionState);
          if (data.isPaused !== undefined) setIsPaused(Boolean(data.isPaused));
          if (data.pausedRemainingMs !== undefined) setPausedRemainingMs(data.pausedRemainingMs);
        }
      } catch {
        // Ignored
      } finally {
        setLoading(false);
        inFlightStateFetchRef.current = null;
      }
    })();

    inFlightStateFetchRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    refreshState({ force: true });

    const eventSource = new EventSource('/api/auction/events');
    let fallbackInterval: NodeJS.Timeout | null = null;

    eventSource.onopen = () => {
      setConnected(true);
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      if (!fallbackInterval) {
        fallbackInterval = setInterval(() => {
          if (document.visibilityState === 'visible') {
            refreshState();
          }
        }, 15000);
      }
    };

    eventSource.addEventListener('BID_PLACED', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.serverTime) {
          clockSync.recordServerTime(payload.serverTime);
          setServerTime(clockSync.getNow());
        }
        if (payload.lot) {
          setCurrentLot((prev: any) => {
            if (!prev || prev.id !== payload.lot.id || (payload.lot.bid_count ?? 0) >= (prev.bid_count ?? 0)) {
              return payload.lot;
            }
            return prev;
          });
        }
        if (payload.bid) {
          setRecentBids((prev) => [payload.bid, ...prev.slice(0, 19)]);
        }

        const notifData = payload.bidNotification || (payload.bid && payload.lot ? {
          playerName: payload.lot.player_name,
          franchiseName: payload.lot.highest_bidder_name || 'Franchise',
          amount: payload.bid.amount,
          message: `🏏 BID ALERT: ${payload.lot.player_name} bid by ${payload.lot.highest_bidder_name || 'Franchise'} for ₹${payload.bid.amount} Lakhs!`,
          timestamp: payload.bid.timestamp || Date.now(),
        } : null);

        if (notifData) {
          setLiveBidNotification(notifData);
          mobileNotification.sendNotification(
            `🏏 ACC Live Bid: ₹${notifData.amount}L`,
            notifData.message
          );
        }

        auctionSound.playBidChime();
      } catch {}
    });

    eventSource.addEventListener('CUSTOM_TIMER_ALERT_STARTED', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.customTimerAlert) {
          setCustomTimerAlert(payload.customTimerAlert);
          auctionSound.playBidChime();
          mobileNotification.sendNotification(
            '⏳ ACC Auction Starts Soon!',
            payload.customTimerAlert.message || 'Auction countdown alert started. Return to app now!'
          );
        }
      } catch {}
    });

    eventSource.addEventListener('CUSTOM_TIMER_FINAL_10S', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.customTimerAlert) {
          setCustomTimerAlert(payload.customTimerAlert);
          auctionSound.playBidChime();
          mobileNotification.sendNotification(
            '🚨 Final 10 Seconds!',
            'Auction starts directly in 10 seconds! Get ready for live bidding.'
          );
        }
      } catch {}
    });

    eventSource.addEventListener('CUSTOM_TIMER_ALERT_ENDED', () => {
      setCustomTimerAlert(null);
    });

    eventSource.addEventListener('PLAYER_CALLED', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.serverTime) {
          clockSync.recordServerTime(payload.serverTime);
          setServerTime(clockSync.getNow());
        }
        setCurrentLot(payload.lot);
        setRecentBids([]);
        setLastSaleEvent(null);
        setAutoTransitionCountdown(null);
        setAutoTransitionDeadline(null);
        auctionSound.playGavelStrike();
        refreshState({ force: true });
      } catch {}
    });

    eventSource.addEventListener('HAMMER_SALE', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.serverTime) {
          clockSync.recordServerTime(payload.serverTime);
          setServerTime(clockSync.getNow());
        }
        setLastSaleEvent(payload);
        if (payload.lot) {
          setCurrentLot(payload.lot);
        } else {
          setCurrentLot((prev: any) => (prev ? { ...prev, lot_state: 'SOLD', deadline_ms: null } : null));
        }
      } catch {}
      auctionSound.playSoldCelebration();
      refreshState({ force: true });
    });

    eventSource.addEventListener('PLAYER_UNSOLD', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.serverTime) {
          clockSync.recordServerTime(payload.serverTime);
          setServerTime(clockSync.getNow());
        }
        setCurrentLot((prev: any) => (prev ? { ...prev, lot_state: 'UNSOLD', deadline_ms: null } : null));
      } catch {}
      auctionSound.playGavelStrike();
      refreshState({ force: true });
    });

    eventSource.addEventListener('AUTO_TRANSITION_COUNTDOWN', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setAutoTransitionCountdown(payload.countdownSeconds);
        setAutoTransitionDeadline(payload.deadlineMs);
      } catch {}
    });

    eventSource.addEventListener('AUTO_TRANSITION_CANCELLED', () => {
      setAutoTransitionCountdown(null);
      setAutoTransitionDeadline(null);
    });

    eventSource.addEventListener('SESSION_STATE_CHANGED', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveSession(payload.activeSession === 2 ? 2 : 1);
        setSessionState(payload.sessionState);
        refreshState({ force: true });
      } catch {}
    });

    eventSource.addEventListener('PLAYER_SKIPPED', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.serverTime) {
          clockSync.recordServerTime(payload.serverTime);
          setServerTime(clockSync.getNow());
        }
        setCurrentLot(null);
      } catch {}
      refreshState({ force: true });
    });

    eventSource.addEventListener('TIMER_ADJUSTED', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.serverTime) {
          clockSync.recordServerTime(payload.serverTime);
          setServerTime(clockSync.getNow());
        }
        if (payload.lot) {
          setCurrentLot((prev: any) => ({ ...prev, ...payload.lot }));
        }
      } catch {}
    });

    eventSource.addEventListener('TIMER_RESET', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.serverTime) {
          clockSync.recordServerTime(payload.serverTime);
          setServerTime(clockSync.getNow());
        }
        if (payload.lot) {
          setCurrentLot((prev: any) => ({ ...prev, ...payload.lot }));
        }
      } catch {}
    });

    eventSource.addEventListener('CLOCK_SYNC', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.serverTime) {
          clockSync.recordServerTime(payload.serverTime);
          setServerTime(clockSync.getNow());
        }
      } catch {}
    });

    eventSource.addEventListener('STATE_UPDATED', () => {
      refreshState({ force: true });
    });

    eventSource.addEventListener('VIEWERS_UPDATED', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (typeof payload.viewerCount === 'number') {
          setViewerCount(payload.viewerCount);
        }
      } catch {}
    });

    eventSource.addEventListener('AUCTION_NOTIFICATION', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveNotification(payload);
        auctionSound.playBidChime();
      } catch {}
    });

    eventSource.addEventListener('AUCTION_PAUSED', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setIsPaused(true);
        if (payload.pausedRemainingMs !== undefined) setPausedRemainingMs(payload.pausedRemainingMs);
        if (payload.lot) setCurrentLot(payload.lot);
      } catch {}
    });

    eventSource.addEventListener('AUCTION_RESUMED', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setIsPaused(false);
        setPausedRemainingMs(null);
        if (payload.lot) setCurrentLot(payload.lot);
      } catch {}
    });

    return () => {
      if (fallbackInterval) clearInterval(fallbackInterval);
      eventSource.close();
    };
  }, [refreshState]);

  const fetchPlayers = useCallback(
    async (options?: { force?: boolean; editionId?: string }): Promise<any[]> => {
      const now = Date.now();
      const hasCached = lastFetchTimeRef.current > 0;
      const isCacheFresh = now - lastFetchTimeRef.current < 20000;

      if (!options?.force && hasCached && isCacheFresh) {
        return playersRef.current;
      }

      if (inFlightFetchPromiseRef.current) {
        return inFlightFetchPromiseRef.current;
      }

      setLoadingPlayers(true);
      setPlayersError(null);

      const targetEdition = options?.editionId || editionId || 'ED_ACC_2026';
      const fetchPromise = (async () => {
        try {
          const res = await fetch(`/api/players?editionId=${encodeURIComponent(targetEdition)}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.players)) {
            setPlayers(data.players);
            playersRef.current = data.players;
            lastFetchTimeRef.current = Date.now();
            return data.players;
          } else {
            throw new Error(data.error || 'Failed to retrieve players');
          }
        } catch (err: any) {
          const msg = err.message || 'Network error fetching player pool';
          setPlayersError(msg);
          return playersRef.current;
        } finally {
          setLoadingPlayers(false);
          inFlightFetchPromiseRef.current = null;
        }
      })();

      inFlightFetchPromiseRef.current = fetchPromise;
      return fetchPromise;
    },
    [editionId]
  );

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const playersById = useMemo<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.id) map[p.id] = p;
      if (p.roll_number) map[p.roll_number.toUpperCase()] = p;
    }
    return map;
  }, [players]);

  const playersByBucket = useMemo<Record<string, any[]>>(() => {
    const buckets: Record<string, any[]> = {
      B3: [],
      B4: [],
      B2: [],
      B5: [],
      PG: [],
      B1: [],
    };
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const b = normalizeCategoryCode(p.bucket) || 'PG';
      if (!buckets[b]) buckets[b] = [];
      buckets[b].push(p);
    }
    return buckets;
  }, [players]);

  const auctionEligiblePlayers = useMemo(() => {
    return players.filter(
      (p) =>
        (p.approval_status === 'APPROVED' || (p.approval_status === undefined && p.is_auction_eligible === 1)) &&
        p.is_referred !== 1
    );
  }, [players]);

  const playerStatsSummary = useMemo<PlayerStatsSummary>(() => {
    let approved = 0;
    let pendingApproval = 0;
    let eligible = 0;
    let batters = 0;
    let bowlers = 0;
    let allRounders = 0;
    let wicketKeepers = 0;

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.approval_status === 'APPROVED') approved++;
      if (p.approval_status === 'PENDING') pendingApproval++;
      if (p.is_auction_eligible === 1 && p.is_referred !== 1) eligible++;

      const roleStr = (p.player_type || p.skill || '').toUpperCase();
      if (roleStr.includes('WICKET') || roleStr.includes('KEEPER')) {
        wicketKeepers++;
      } else if (roleStr.includes('BOWL') && !roleStr.includes('ALL')) {
        bowlers++;
      } else if (roleStr.includes('BAT') && !roleStr.includes('ALL')) {
        batters++;
      } else {
        allRounders++;
      }
    }

    return {
      total: players.length,
      approved,
      pendingApproval,
      eligible,
      batters,
      bowlers,
      allRounders,
      wicketKeepers,
    };
  }, [players]);

  const getPlayerById = useCallback(
    (idOrRoll: string): any | null => {
      if (!idOrRoll) return null;
      return playersById[idOrRoll] || playersById[idOrRoll.toUpperCase()] || null;
    },
    [playersById]
  );

  const getPlayersByBucket = useCallback(
    (bucket: string): any[] => {
      if (!bucket || bucket === 'ALL') return players;
      const code = normalizeCategoryCode(bucket);
      return playersByBucket[code] || [];
    },
    [players, playersByBucket]
  );

  const setAuctionSession = useCallback(
    async (session: 1 | 2, action: 'START' | 'END') => {
      try {
        const res = await fetch('/api/admin/session/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session, action, editionId }),
        });
        const data = await res.json();
        if (!data.success) {
          return { success: false, error: data.error || 'Failed to control session' };
        }
        setActiveSession(session);
        setSessionState(data.sessionState);
        refreshState({ force: true });
        return { success: true, message: data.message };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [editionId, refreshState]
  );

  const assignPlayersToSession = useCallback(
    async (playerIds: string[], session: 1 | 2) => {
      try {
        const res = await fetch('/api/admin/session/assign-players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerIds, session }),
        });
        const data = await res.json();
        if (!data.success) {
          return { success: false, error: data.error || 'Failed to assign players to session' };
        }
        fetchPlayers({ force: true });
        refreshState({ force: true });
        return { success: true, message: data.message };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [fetchPlayers, refreshState]
  );

  const approvePlayer = useCallback(
    async (playerId: string, status: 'APPROVED' | 'REJECTED', reason?: string, basePrice?: number, session?: 1 | 2) => {
      try {
        const res = await fetch('/api/admin/approve-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, status, rejectionReason: reason, basePrice, session }),
        });
        const data = await res.json();
        if (!data.success) {
          return { success: false, error: data.error || 'Approval failed' };
        }
        fetchPlayers({ force: true });
        refreshState({ force: true });
        return { success: true, message: data.message };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [fetchPlayers, refreshState]
  );

  const updatePlayerProfile = useCallback(
    async (playerId: string, updateData: any) => {
      try {
        const res = await fetch('/api/players/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-player-id': playerId,
          },
          body: JSON.stringify({ playerId, ...updateData }),
        });
        const data = await res.json();
        if (!data.success) {
          return { success: false, error: data.error || 'Failed to update profile' };
        }
        fetchPlayers({ force: true });
        refreshState({ force: true });
        return { success: true, message: data.message, player: data.player };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [fetchPlayers, refreshState]
  );

  const dismissNotification = useCallback(() => {
    setActiveNotification(null);
  }, []);

  const sendAuctionNotification = useCallback(
    async (params?: {
      startsInMinutes?: number;
      title?: string;
      message?: string;
      target?: string;
    }) => {
      try {
        const res = await fetch('/api/auction/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            editionId,
            startsInMinutes: params?.startsInMinutes !== undefined ? params.startsInMinutes : 10,
            title: params?.title,
            message: params?.message,
            target: params?.target || 'ALL',
          }),
        });
        const data = await res.json();
        if (data.success && data.notification) {
          setActiveNotification(data.notification);
        }
        return { success: data.success, notification: data.notification, error: data.error };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [editionId]
  );

  const placeBid = useCallback(
    async (franchiseId: string) => {
      try {
        const res = await fetch('/api/auction/bid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ franchiseId, editionId }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Bid rejected' };
        }
        if (data.lot) {
          setCurrentLot((prev: any) => {
            if (!prev || prev.id !== data.lot.id || (data.lot.bid_count ?? 0) >= (prev.bid_count ?? 0)) {
              return data.lot;
            }
            return prev;
          });
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [editionId]
  );

  const passLot = useCallback(
    async (franchiseId: string) => {
      try {
        const res = await fetch('/api/auction/pass', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ franchiseId, editionId }),
        });
        const data = await res.json();
        return { success: data.success, error: data.error };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [editionId]
  );

  const strikeHammer = useCallback(
    async () => {
      try {
        const res = await fetch('/api/auction/hammer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editionId }),
        });
        const data = await res.json();
        if (data.success && data.result) {
          if (data.result.sold) {
            setLastSaleEvent({
              lotId: currentLot?.id || '',
              playerId: data.result.playerId,
              winningFranchiseId: data.result.franchiseId,
              finalPrice: data.result.price,
              lotState: 'SOLD',
            });
          }
        }
        refreshState({ force: true });
        fetchPlayers({ force: true });
        return { success: data.success, result: data.result, error: data.error };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [editionId, currentLot?.id, refreshState, fetchPlayers]
  );

  const drawNextPlayer = useCallback(
    async (mode: 'AUTO' | 'GUEST' = 'AUTO', identifierOrId?: string) => {
      try {
        const savedUserStr = localStorage.getItem('acc_auth_user');
        let currentUser: any = null;
        try {
          if (savedUserStr) currentUser = JSON.parse(savedUserStr);
        } catch {}

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (currentUser) {
          headers['x-user-role'] = currentUser.role || '';
          headers['x-user-id'] = currentUser.id || '';
          headers['x-user-username'] = currentUser.username || '';
        }

        const res = await fetch('/api/auction/draw-next', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            editionId,
            mode,
            playerId: identifierOrId,
            identifier: identifierOrId,
            actor: currentUser?.username || 'Admin',
            role: currentUser?.role || 'SUPER_ADMIN',
          }),
        });
        const data = await res.json();
        if (data.success && data.lot) {
          setCurrentLot(data.lot);
          setRecentBids([]);
          setLastSaleEvent(null);
          setAutoTransitionCountdown(null);
          setAutoTransitionDeadline(null);
        }
        refreshState({ force: true });
        return { success: data.success, lot: data.lot, error: data.error };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [editionId, refreshState]
  );

  const skipCurrentLot = useCallback(
    async (reason?: string) => {
      try {
        const res = await fetch('/api/auction/skip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editionId, reason }),
        });
        const data = await res.json();
        if (data.success) {
          setCurrentLot(null);
          setAutoTransitionCountdown(null);
          setAutoTransitionDeadline(null);
        }
        refreshState({ force: true });
        return { success: data.success, error: data.error };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [editionId, refreshState]
  );

  const undoSale = useCallback(
    async (saleId: string, reason: string) => {
      try {
        const res = await fetch('/api/auction/undo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saleId, reason }),
        });
        const data = await res.json();
        refreshState({ force: true });
        fetchPlayers({ force: true });
        return { success: data.success, error: data.error };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [refreshState, fetchPlayers]
  );

  const adjustTimer = useCallback(
    async (seconds: number) => {
      try {
        const res = await fetch('/api/auction/timer/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seconds, editionId }),
        });
        const data = await res.json();
        refreshState({ force: true });
        return { success: data.success, error: data.error };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [editionId, refreshState]
  );

  const resetTimer = useCallback(
    async (seconds: number = 30) => {
      try {
        const res = await fetch('/api/auction/timer/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seconds, editionId }),
        });
        const data = await res.json();
        refreshState({ force: true });
        return { success: data.success, error: data.error };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [editionId, refreshState]
  );

  const removeSquadPlayer = useCallback(
    async (franchiseId: string, playerId: string, reason: string) => {
      try {
        const res = await fetch(`/api/franchise/${franchiseId}/squad/remove-player`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, reason }),
        });
        const data = await res.json();
        if (!data.success) {
          return { success: false, error: data.error || 'Failed to remove player.' };
        }
        refreshState({ force: true });
        fetchPlayers({ force: true });
        return { success: true, message: data.message };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [refreshState, fetchPlayers]
  );

  const updateCaptainStats = useCallback(
    async (franchiseId: string, statsData: any) => {
      try {
        const res = await fetch(`/api/franchises/${franchiseId}/captain-stats`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(statsData),
        });
        const data = await res.json();
        if (!data.success) {
          return { success: false, error: data.error || 'Failed to update captain stats.' };
        }
        refreshState({ force: true });
        return { success: true, message: data.message };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [refreshState]
  );

  const regenerateFranchiseCredentials = useCallback(
    async (franchiseId: string) => {
      try {
        const res = await fetch(`/api/franchises/${franchiseId}/regenerate-credentials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (!data.success) {
          return { success: false, error: data.error || 'Failed to regenerate credentials.' };
        }
        refreshState({ force: true });
        return { success: true, credentials: data.credentials };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [refreshState]
  );

  const togglePauseAuction = useCallback(async () => {
    try {
      const res = await fetch('/api/auction/toggle-pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editionId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPaused(Boolean(data.isPaused));
      }
      refreshState({ force: true });
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [editionId, refreshState]);

  const pauseAuction = useCallback(async () => {
    try {
      const res = await fetch('/api/auction/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editionId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPaused(true);
      }
      refreshState({ force: true });
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [editionId, refreshState]);

  const resumeAuction = useCallback(async () => {
    try {
      const res = await fetch('/api/auction/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editionId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPaused(false);
      }
      refreshState({ force: true });
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [editionId, refreshState]);

  const setCustomTimerAlertApi = useCallback(
    async (durationSeconds: number, message?: string) => {
      try {
        const res = await fetch('/api/auction/custom-timer-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durationSeconds, message }),
        });
        const data = await res.json();
        if (!data.success) {
          return { success: false, error: data.error || 'Failed to set timer alert.' };
        }
        if (data.alert) setCustomTimerAlert(data.alert);
        return { success: true, alert: data.alert };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    []
  );

  const cancelCustomTimerAlertApi = useCallback(async () => {
    try {
      const res = await fetch('/api/auction/custom-timer-alert', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setCustomTimerAlert(null);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const dismissLiveBidNotification = useCallback(() => {
    setLiveBidNotification(null);
  }, []);

  const contextValue = useMemo<AuctionContextType>(
    () => ({
      currentLot,
      auctionPhase,
      upcomingPlayers,
      franchises,
      scarcity,
      soldCount,
      unsoldCount,
      serverTime,
      connected,
      loading,
      editionId,
      recentBids,
      viewerCount,
      soundEnabled,
      lastSaleEvent,
      activeNotification,
      customTimerAlert,
      liveBidNotification,

      activeSession,
      sessionState,
      autoTransitionCountdown,
      autoTransitionDeadline,
      isPaused,
      pausedRemainingMs,
      togglePauseAuction,
      pauseAuction,
      resumeAuction,
      setAuctionSession,
      assignPlayersToSession,
      approvePlayer,
      updatePlayerProfile,

      players,
      loadingPlayers,
      playersError,
      playersById,
      playersByBucket,
      auctionEligiblePlayers,
      playerStatsSummary,
      fetchPlayers,
      getPlayerById,
      getPlayersByBucket,

      dismissNotification,
      sendAuctionNotification,
      setCustomTimerAlert: setCustomTimerAlertApi,
      cancelCustomTimerAlert: cancelCustomTimerAlertApi,
      dismissLiveBidNotification,
      toggleSound,
      refreshState,
      placeBid,
      passLot,
      strikeHammer,
      drawNextPlayer,
      skipCurrentLot,
      undoSale,
      adjustTimer,
      resetTimer,
      removeSquadPlayer,
      updateCaptainStats,
      regenerateFranchiseCredentials,
    }),
    [
      currentLot,
      auctionPhase,
      upcomingPlayers,
      franchises,
      scarcity,
      soldCount,
      unsoldCount,
      serverTime,
      connected,
      loading,
      editionId,
      recentBids,
      viewerCount,
      soundEnabled,
      lastSaleEvent,
      activeNotification,
      customTimerAlert,
      liveBidNotification,
      activeSession,
      sessionState,
      autoTransitionCountdown,
      autoTransitionDeadline,
      isPaused,
      pausedRemainingMs,
      togglePauseAuction,
      pauseAuction,
      resumeAuction,
      setAuctionSession,
      assignPlayersToSession,
      approvePlayer,
      updatePlayerProfile,
      players,
      loadingPlayers,
      playersError,
      playersById,
      playersByBucket,
      auctionEligiblePlayers,
      playerStatsSummary,
      fetchPlayers,
      getPlayerById,
      getPlayersByBucket,
      dismissNotification,
      sendAuctionNotification,
      setCustomTimerAlertApi,
      cancelCustomTimerAlertApi,
      dismissLiveBidNotification,
      toggleSound,
      refreshState,
      placeBid,
      passLot,
      strikeHammer,
      drawNextPlayer,
      skipCurrentLot,
      undoSale,
      adjustTimer,
      resetTimer,
      removeSquadPlayer,
      updateCaptainStats,
      regenerateFranchiseCredentials,
    ]
  );

  return (
    <AuctionContext.Provider value={contextValue}>
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => {
  const context = useContext(AuctionContext);
  if (!context) throw new Error('useAuction must be used within an AuctionProvider');
  return context;
};
