/**
 * ============================================================================
 * ACC AUTHORITATIVE LIVE AUCTION MANAGER
 * ============================================================================
 * Server-authoritative state transitions, concurrency mutex, legal bid
 * validation, maximum permissible bid calculation, timer handling, hammer,
 * undo, Random Draw, Masked Guest Draw (Req 5), Fixed 10s Auto-Transition (Req 6),
 * Strict Bucket Ordering (Req 1), and Two Auction Sessions (Req 11).
 */

import {
  queryAll,
  queryOne,
  execute,
  executeTransaction,
} from './db';
import { AuctionPipeline } from '../engine/acc-combined-engines';
import { formatAcademicCategory, normalizeCategoryCode, STRICT_BUCKET_AUCTION_ORDER } from '../utils/academicCategories';
import {
  saveSquadMemberToCloudSql,
  saveSaleToCloudSql,
  saveFranchiseToCloudSql,
} from './cloudsql-sync';

export interface SSEClient {
  id: string;
  res: any;
}

class AuctionManager {
  private sseClients: Map<string, any> = new Map();
  private mutexLocked = false;
  private mutexQueue: Array<() => void> = [];

  // Automatic 10-second transition timer (Requirement 6)
  private autoTransitionTimeout: NodeJS.Timeout | null = null;
  private autoTransitionCountdownInterval: NodeJS.Timeout | null = null;
  private autoTransitionDeadline: number | null = null;

  // Pause / Play Auction Controls (Requirement 3)
  private isPaused: boolean = false;
  private pausedRemainingMs: number | null = null;
  private pausedAutoTransitionSeconds: number | null = null;

  // Draw Mode & Auto-Transition Control (Requirement 4)
  private autoDrawMode: boolean = true;
  private currentDrawMode: 'AUTO' | 'GUEST' = 'AUTO';

  // Tracking passes per lot (Requirement 1)
  private lotPasses: Map<string, Set<string>> = new Map();

  // Session Control (Requirement 11)
  private activeSession: 1 | 2 = 1;
  private sessionState: 'SESSION_1_ACTIVE' | 'SESSION_1_ENDED' | 'SESSION_2_ACTIVE' | 'SESSION_2_ENDED' = 'SESSION_1_ACTIVE';

  private async acquireLock(): Promise<() => void> {
    return new Promise((resolve) => {
      const release = () => {
        if (this.mutexQueue.length > 0) {
          const next = this.mutexQueue.shift()!;
          next();
        } else {
          this.mutexLocked = false;
        }
      };

      if (!this.mutexLocked) {
        this.mutexLocked = true;
        resolve(release);
      } else {
        this.mutexQueue.push(() => resolve(release));
      }
    });
  }

  private viewerBroadcastTimeout: NodeJS.Timeout | null = null;
  private customTimerAlert: {
    active: boolean;
    startsAt: number;
    durationSeconds: number;
    message: string;
    phase: 'ALERT_COUNTDOWN' | 'FINAL_10S' | 'STARTED';
  } | null = null;
  private customAlertTimeout: NodeJS.Timeout | null = null;
  private customFinal10sTimeout: NodeJS.Timeout | null = null;

  getCustomTimerAlert() {
    if (!this.customTimerAlert || !this.customTimerAlert.active) return null;
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((this.customTimerAlert.startsAt - now) / 1000));
    return {
      ...this.customTimerAlert,
      secondsRemaining: remaining,
    };
  }

  setCustomTimerAlert(durationSeconds: number, message: string = 'Auction starts in timer', actor: string = 'SuperAdmin') {
    if (this.customAlertTimeout) clearTimeout(this.customAlertTimeout);
    if (this.customFinal10sTimeout) clearTimeout(this.customFinal10sTimeout);

    const edition = this.getActiveEdition();
    const editionId = edition?.id || 'ED_ACC_2026';
    const now = Date.now();
    const targetStartsAt = now + durationSeconds * 1000;

    this.customTimerAlert = {
      active: true,
      startsAt: targetStartsAt,
      durationSeconds,
      message,
      phase: 'ALERT_COUNTDOWN',
    };

    this.broadcast('CUSTOM_TIMER_ALERT_STARTED', {
      customTimerAlert: this.getCustomTimerAlert(),
      actor,
    });

    this.customAlertTimeout = setTimeout(() => {
      const final10StartsAt = Date.now() + 10000;
      this.customTimerAlert = {
        active: true,
        startsAt: final10StartsAt,
        durationSeconds: 10,
        message: 'Auction custom alert ended. Directly starting auction in 10 seconds!',
        phase: 'FINAL_10S',
      };

      this.broadcast('CUSTOM_TIMER_FINAL_10S', {
        customTimerAlert: this.getCustomTimerAlert(),
      });

      this.customFinal10sTimeout = setTimeout(async () => {
        this.customTimerAlert = {
          active: false,
          startsAt: Date.now(),
          durationSeconds: 0,
          message: 'Auction officially started!',
          phase: 'STARTED',
        };

        this.broadcast('CUSTOM_TIMER_ALERT_ENDED', { customTimerAlert: null });

        try {
          await this.setAuctionSession(editionId, 1, 'START', 'SystemAutoTimer');
          const current = this.getCurrentLot(editionId);
          if (!current) {
            try {
              await this.drawNextPlayer(editionId, 'AUTO', undefined, 'SystemTimer');
            } catch (drawErr: any) {
              if (drawErr?.message?.includes('NO_AVAILABLE_PLAYERS')) {
                console.log(`[Auto-Timer] Session 1 active. All approved players in the bucket queue have been called or sold.`);
              } else {
                throw drawErr;
              }
            }
          }
        } catch (e: any) {
          if (!e?.message?.includes('NO_AVAILABLE_PLAYERS')) {
            console.error('Error auto-starting auction after custom timer alert:', e);
          }
        }
      }, 10000);
    }, durationSeconds * 1000);

    return this.getCustomTimerAlert();
  }

  cancelCustomTimerAlert() {
    if (this.customAlertTimeout) clearTimeout(this.customAlertTimeout);
    if (this.customFinal10sTimeout) clearTimeout(this.customFinal10sTimeout);
    this.customTimerAlert = null;
    this.broadcast('CUSTOM_TIMER_ALERT_ENDED', { customTimerAlert: null });
    return { success: true };
  }

  private scheduleViewerBroadcast() {
    if (this.viewerBroadcastTimeout) return;
    this.viewerBroadcastTimeout = setTimeout(() => {
      this.viewerBroadcastTimeout = null;
      this.broadcast('VIEWERS_UPDATED', { viewerCount: this.sseClients.size });
    }, 4000);
  }

  addSSEClient(clientId: string, res: any) {
    this.sseClients.set(clientId, res);
    this.scheduleViewerBroadcast();
  }

  removeSSEClient(clientId: string) {
    this.sseClients.delete(clientId);
    this.scheduleViewerBroadcast();
  }

  getActiveSession(): 1 | 2 {
    const edition = this.getActiveEdition();
    if (edition?.active_session) {
      this.activeSession = edition.active_session === 2 ? 2 : 1;
    }
    return this.activeSession;
  }

  getSessionState(): string {
    const edition = this.getActiveEdition();
    if (edition?.session_state) {
      this.sessionState = edition.session_state as any;
    }
    return this.sessionState;
  }

  async setAuctionSession(editionId: string, session: 1 | 2, action: 'START' | 'END', actor: string = 'SuperAdmin') {
    const release = await this.acquireLock();
    try {
      this.cancelAutoTransition();
      this.activeSession = session;
      const newState = action === 'START'
        ? (session === 1 ? 'SESSION_1_ACTIVE' : 'SESSION_2_ACTIVE')
        : (session === 1 ? 'SESSION_1_ENDED' : 'SESSION_2_ENDED');

      this.sessionState = newState as any;

      const now = Date.now();
      execute(
        `UPDATE editions SET active_session = ?, session_state = ? WHERE id = ?`,
        [session, newState, editionId]
      );

      if (action === 'END') {
        execute(
          `UPDATE auction_lots SET deadline_ms = NULL, lot_state = 'SKIPPED'
           WHERE edition_id = ? AND (lot_state = 'IN_AUCTION' OR lot_state = 'CALLED')`,
          [editionId]
        );
      }

      execute(
        `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AUDIT_${now}_SESSION`,
          editionId,
          actor,
          'SUPER_ADMIN',
          action === 'START' ? `START_SESSION_${session}` : `END_SESSION_${session}`,
          'AUCTION_SESSION',
          `SESSION_${session}`,
          JSON.stringify({ session, action, state: newState }),
          now,
        ]
      );

      this.broadcast('SESSION_STATE_CHANGED', {
        activeSession: session,
        sessionState: newState,
        action,
        timestamp: now,
      });

      return {
        success: true,
        activeSession: session,
        sessionState: newState,
        message: action === 'START' ? `Auction Session ${session} started successfully.` : `Auction Session ${session} ended. Bidding activity stopped.`,
      };
    } finally {
      release();
    }
  }

  getAutoDrawMode(): boolean {
    return this.autoDrawMode;
  }

  getCurrentDrawMode(): 'AUTO' | 'GUEST' {
    return this.currentDrawMode;
  }

  setAutoDrawMode(enabled: boolean, mode: 'AUTO' | 'GUEST' = enabled ? 'AUTO' : 'GUEST', actor: string = 'Admin') {
    this.autoDrawMode = enabled;
    this.currentDrawMode = mode;
    if (!enabled) {
      this.cancelAutoTransition();
    }
    const now = Date.now();
    execute(
      `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`AUDIT_${now}`, this.getActiveEdition()?.id || 'ED_ACC_2026', actor, 'ADMIN', 'DRAW_MODE_CHANGED', 'SYSTEM', mode, enabled ? 'AUTO_ACTIVE' : 'AUTO_STOPPED', now]
    );
    this.broadcast('AUTO_DRAW_MODE_CHANGED', {
      autoDrawMode: this.autoDrawMode,
      currentDrawMode: this.currentDrawMode,
      reason: enabled ? 'RANDOM_DRAW_ACTIVATED' : 'GUEST_DRAW_ACTIVATED',
      actor,
    });
    return { success: true, autoDrawMode: this.autoDrawMode, currentDrawMode: this.currentDrawMode };
  }

  cancelAutoTransition() {
    if (this.autoTransitionTimeout) {
      clearTimeout(this.autoTransitionTimeout);
      this.autoTransitionTimeout = null;
    }
    if (this.autoTransitionCountdownInterval) {
      clearInterval(this.autoTransitionCountdownInterval);
      this.autoTransitionCountdownInterval = null;
    }
    this.autoTransitionDeadline = null;
    this.broadcast('AUTO_TRANSITION_CANCELLED', {});
  }

  private scheduleAutoTransition(editionId: string) {
    this.cancelAutoTransition();

    // If Guest Draw mode is active, automatic auction draw is stopped (Requirement 4)
    if (!this.autoDrawMode) {
      return;
    }

    const sessionState = this.getSessionState();
    if (sessionState.endsWith('_ENDED')) {
      return;
    }

    const durationSeconds = 10;
    const now = Date.now();
    this.autoTransitionDeadline = now + durationSeconds * 1000;

    let secondsLeft = durationSeconds;
    this.broadcast('AUTO_TRANSITION_COUNTDOWN', {
      countdownSeconds: secondsLeft,
      deadlineMs: this.autoTransitionDeadline,
    });

    this.autoTransitionCountdownInterval = setInterval(() => {
      secondsLeft = Math.max(0, Math.ceil(((this.autoTransitionDeadline || 0) - Date.now()) / 1000));
      this.broadcast('AUTO_TRANSITION_COUNTDOWN', {
        countdownSeconds: secondsLeft,
        deadlineMs: this.autoTransitionDeadline,
      });
      if (secondsLeft <= 0) {
        if (this.autoTransitionCountdownInterval) {
          clearInterval(this.autoTransitionCountdownInterval);
          this.autoTransitionCountdownInterval = null;
        }
      }
    }, 1000);

    this.autoTransitionTimeout = setTimeout(async () => {
      this.cancelAutoTransition();
      try {
        await this.drawNextPlayer(editionId, 'AUTO', undefined, 'SYSTEM_AUTO_TRANSITION');
      } catch (err: any) {
        console.warn('[Auto-Transition] Next lot could not be drawn automatically:', err.message);
      }
    }, durationSeconds * 1000);
  }

  private scheduleAutoTransitionWithSeconds(editionId: string, durationSeconds: number) {
    this.cancelAutoTransition();
    const sessionState = this.getSessionState();
    if (sessionState.endsWith('_ENDED') || this.isPaused || !this.autoDrawMode) {
      return;
    }

    const now = Date.now();
    this.autoTransitionDeadline = now + durationSeconds * 1000;

    let secondsLeft = durationSeconds;
    this.broadcast('AUTO_TRANSITION_COUNTDOWN', {
      countdownSeconds: secondsLeft,
      deadlineMs: this.autoTransitionDeadline,
    });

    this.autoTransitionCountdownInterval = setInterval(() => {
      secondsLeft = Math.max(0, Math.ceil(((this.autoTransitionDeadline || 0) - Date.now()) / 1000));
      this.broadcast('AUTO_TRANSITION_COUNTDOWN', {
        countdownSeconds: secondsLeft,
        deadlineMs: this.autoTransitionDeadline,
      });
      if (secondsLeft <= 0) {
        if (this.autoTransitionCountdownInterval) {
          clearInterval(this.autoTransitionCountdownInterval);
          this.autoTransitionCountdownInterval = null;
        }
      }
    }, 1000);

    this.autoTransitionTimeout = setTimeout(async () => {
      this.cancelAutoTransition();
      try {
        await this.drawNextPlayer(editionId, 'AUTO', undefined, 'SYSTEM_AUTO_TRANSITION');
      } catch (err: any) {
        console.warn('[Auto-Transition] Next lot could not be drawn automatically:', err.message);
      }
    }, durationSeconds * 1000);
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  getPausedRemainingMs(): number | null {
    return this.pausedRemainingMs;
  }

  async toggleAuctionPause(editionId: string, actor: string = 'StageAdmin') {
    const release = await this.acquireLock();
    try {
      this.isPaused = !this.isPaused;
      const now = Date.now();
      const lot = this.getCurrentLot(editionId);

      if (this.isPaused) {
        if (lot && lot.deadline_ms) {
          this.pausedRemainingMs = Math.max(0, lot.deadline_ms - now);
        } else {
          this.pausedRemainingMs = null;
        }

        if (this.autoTransitionDeadline) {
          this.pausedAutoTransitionSeconds = Math.max(0, Math.ceil((this.autoTransitionDeadline - now) / 1000));
          this.cancelAutoTransition();
        } else {
          this.pausedAutoTransitionSeconds = null;
        }

        execute(
          `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `AUDIT_${now}_PAUSE`,
            editionId,
            actor,
            'SUPER_ADMIN',
            'AUCTION_PAUSED',
            'AUCTION_STATE',
            editionId,
            JSON.stringify({ isPaused: true, pausedRemainingMs: this.pausedRemainingMs }),
            now,
          ]
        );

        this.broadcast('AUCTION_PAUSED', {
          isPaused: true,
          pausedRemainingMs: this.pausedRemainingMs,
          pausedAutoTransitionSeconds: this.pausedAutoTransitionSeconds,
          lot: this.getCurrentLot(editionId),
          actor,
        });

        return {
          success: true,
          isPaused: true,
          pausedRemainingMs: this.pausedRemainingMs,
          message: 'Auction countdown and automatic transitions paused by stage admin.',
        };
      } else {
        let newDeadline: number | null = null;
        if (lot && this.pausedRemainingMs !== null && this.pausedRemainingMs > 0) {
          newDeadline = now + this.pausedRemainingMs;
          execute('UPDATE auction_lots SET deadline_ms = ? WHERE id = ?', [newDeadline, lot.id]);
          this.pausedRemainingMs = null;
        }

        if (this.pausedAutoTransitionSeconds && this.pausedAutoTransitionSeconds > 0) {
          const transSecs = this.pausedAutoTransitionSeconds;
          this.pausedAutoTransitionSeconds = null;
          this.scheduleAutoTransitionWithSeconds(editionId, transSecs);
        }

        execute(
          `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `AUDIT_${now}_RESUME`,
            editionId,
            actor,
            'SUPER_ADMIN',
            'AUCTION_RESUMED',
            'AUCTION_STATE',
            editionId,
            JSON.stringify({ isPaused: false, newDeadline }),
            now,
          ]
        );

        const updatedLot = this.getCurrentLot(editionId);
        this.broadcast('AUCTION_RESUMED', {
          isPaused: false,
          lot: updatedLot,
          actor,
        });

        return {
          success: true,
          isPaused: false,
          lot: updatedLot,
          message: 'Auction resumed successfully.',
        };
      }
    } finally {
      release();
    }
  }

  async sendAuctionNotification(params: {
    editionId: string;
    type?: string;
    title?: string;
    message?: string;
    target?: string;
    startsInMinutes?: number;
    actor?: string;
  }) {
    const {
      editionId,
      type = 'AUCTION_STARTING_CUSTOM',
      startsInMinutes = 10,
      actor = 'SuperAdmin',
      target = 'ALL',
    } = params;

    const now = Date.now();
    const startsAt = now + startsInMinutes * 60 * 1000;
    const defaultTitle = `⚡ Live Auction Begins in ${startsInMinutes} Minute${startsInMinutes === 1 ? '' : 's'}!`;
    const defaultMessage = `The Avanthi Cricket Carnival Live Auction Floor is opening in ${startsInMinutes} minutes. All 11 franchises and registered players please assemble at the live floor. Purses and quota rules are locked.`;

    const title = params.title || defaultTitle;
    const message = params.message || defaultMessage;
    const notifId = `NOTIF_${now}_${Math.random().toString(36).substring(2, 6)}`;

    execute(
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        edition_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'AUCTION_STARTING_10M',
        target TEXT NOT NULL DEFAULT 'ALL',
        starts_at INTEGER,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`
    );

    execute(
      `INSERT INTO notifications (id, edition_id, title, message, type, target, starts_at, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [notifId, editionId, title, message, type, target, startsAt, actor, now]
    );

    execute(
      `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `AUDIT_${now}`,
        editionId,
        actor,
        'SUPER_ADMIN',
        'SEND_NOTIFICATION',
        'NOTIFICATION',
        notifId,
        JSON.stringify({ type, title, startsInMinutes, startsAt }),
        now,
      ]
    );

    const notificationData = {
      id: notifId,
      editionId,
      title,
      message,
      type,
      target,
      startsAt,
      startsInMinutes,
      createdBy: actor,
      createdAt: now,
    };

    this.broadcast('AUCTION_NOTIFICATION', notificationData);
    return notificationData;
  }

  getRecentNotifications(editionId: string, limit: number = 10) {
    try {
      return queryAll(
        `SELECT * FROM notifications WHERE edition_id = ? ORDER BY created_at DESC LIMIT ?`,
        [editionId, limit]
      );
    } catch {
      return [];
    }
  }

  getViewerCount(): number {
    return this.sseClients.size;
  }

  broadcast(eventType: string, data: any) {
    const payload = {
      ...data,
      serverTime: Date.now(),
      autoTransitionDeadline: this.autoTransitionDeadline,
      activeSession: this.getActiveSession(),
      sessionState: this.getSessionState(),
      customTimerAlert: this.getCustomTimerAlert(),
      isPaused: this.isPaused,
      pausedRemainingMs: this.pausedRemainingMs,
    };
    const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const [_, clientRes] of this.sseClients.entries()) {
      try {
        clientRes.write(message);
      } catch {}
    }
  }

  getActiveEdition() {
    return queryOne('SELECT * FROM editions WHERE status = "ACTIVE" OR status = "AUCTION_ACTIVE" ORDER BY created_at DESC LIMIT 1') ||
      queryOne('SELECT * FROM editions ORDER BY created_at DESC LIMIT 1');
  }

  getCurrentLot(editionId: string) {
    const lot = queryOne(
      `SELECT l.*, p.name as player_name, p.roll_number, p.photo_url, p.program, p.branch, p.academic_year,
              p.skill, p.player_type, p.batting_style, p.bowling_style, p.batting_position, p.batting_hand, p.batting_playing_type, p.bowling_profile,
              p.is_detained, p.approval_status, p.auction_session as player_auction_session,
              p.experience, p.cricheroes_url, p.cricheroes_mobile, p.stats_json,
              f.name as highest_bidder_name, f.logo_url as highest_bidder_logo
       FROM auction_lots l
       JOIN players p ON l.player_id = p.id
       LEFT JOIN franchises f ON l.highest_bidder_id = f.id
       WHERE l.edition_id = ? AND (l.lot_state = 'IN_AUCTION' OR l.lot_state = 'CALLED')
       ORDER BY l.started_at DESC LIMIT 1`,
      [editionId]
    );

    if (!lot) return null;

    const bids = queryAll(
      `SELECT b.*, f.name as franchise_name, f.logo_url as franchise_logo
       FROM bids b
       JOIN franchises f ON b.franchise_id = f.id
       WHERE b.lot_id = ?
       ORDER BY b.sequence ASC`,
      [lot.id]
    );

    let parsedStats = null;
    if (lot.stats_json) {
      try {
        parsedStats = JSON.parse(lot.stats_json);
      } catch {}
    }

    const academicCategoryLabel = formatAcademicCategory(lot.bucket);

    return {
      ...lot,
      academicCategoryLabel,
      batting_style: lot.batting_style || parsedStats?.battingStyle || 'Right Hand Bat',
      bowling_style: lot.bowling_style || parsedStats?.bowlingStyle || 'None',
      stats: parsedStats,
      bids,
      passed_franchises: Array.from(this.lotPasses.get(lot.id) || []),
      autoTransitionDeadline: this.autoTransitionDeadline,
    };
  }

  getFranchises(editionId: string) {
    const franchises = queryAll('SELECT * FROM franchises WHERE edition_id = ? ORDER BY name ASC', [editionId]);
    return franchises.map((f) => {
      const squad = queryAll(
        `SELECT sm.*, p.name as player_name, p.bucket, p.roll_number, p.photo_url, p.player_type, p.branch,
                p.mobile_number, p.batting_style, p.bowling_style, p.stats_json, p.cricheroes_url, p.skill, p.email,
                p.is_referred, p.referral_status, p.referred_by_captain_name, p.is_detained
         FROM squad_members sm
         JOIN players p ON sm.player_id = p.id
         WHERE sm.franchise_id = ? AND (sm.status = 'ACTIVE' OR sm.status IS NULL) AND sm.undone = 0
         ORDER BY sm.timestamp ASC`,
        [f.id]
      );

      const removedSquad = queryAll(
        `SELECT sm.*, p.name as player_name, p.bucket, p.roll_number, p.photo_url, p.player_type, p.branch,
                p.mobile_number, p.stats_json, sm.removed_at, sm.removed_by, sm.removal_reason
         FROM squad_members sm
         JOIN players p ON sm.player_id = p.id
         WHERE sm.franchise_id = ? AND (sm.status = 'REMOVED' OR sm.undone = 1)
         ORDER BY sm.removed_at DESC`,
        [f.id]
      );

      const bucketCounts: Record<string, number> = { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, PG: 0 };
      let auctionPurchasesCount = 0;
      let retainedCount = 0;
      let referredCount = 0;

      for (const s of squad) {
        const normCode = normalizeCategoryCode(s.bucket);
        if (normCode && bucketCounts[normCode] !== undefined) {
          bucketCounts[normCode]++;
        }
        if (s.acquisition_type === 'AUCTION_PURCHASE') {
          auctionPurchasesCount++;
        } else if (s.acquisition_type === 'RETAINED') {
          retainedCount++;
        } else if (s.acquisition_type === 'REFERRED' || s.acquisition_type === 'DIRECT_ASSIGNMENT') {
          referredCount++;
        }
      }

      const user = queryOne('SELECT id, username, email FROM users WHERE franchise_id = ?', [f.id]);

      let parsedFranchiseStats: any = {};
      if (f.franchise_stats_json) {
        try {
          parsedFranchiseStats = JSON.parse(f.franchise_stats_json);
        } catch {}
      }

      let parsedCaptainStats: any = null;
      if (f.captain_stats_json) {
        try {
          parsedCaptainStats = JSON.parse(f.captain_stats_json);
        } catch {}
      } else if (parsedFranchiseStats?.captainStats) {
        parsedCaptainStats = parsedFranchiseStats.captainStats;
      }

      let parsedViceCaptainStats: any = null;
      if (f.vice_captain_stats_json) {
        try {
          parsedViceCaptainStats = JSON.parse(f.vice_captain_stats_json);
        } catch {}
      } else if (parsedFranchiseStats?.viceCaptainStats) {
        parsedViceCaptainStats = parsedFranchiseStats.viceCaptainStats;
      }

      const allReferredCountRow = queryOne(
        `SELECT COUNT(*) as count FROM players WHERE referring_franchise_id = ? AND is_referred = 1`,
        [f.id]
      );
      const totalReferredPlayers = allReferredCountRow?.count || 0;

      return {
        ...f,
        faculty_coordinator_name: f.faculty_coordinator || '',
        faculty_coordinator_branch: f.faculty_branch || f.department || '',
        faculty_coordinator_mobile: f.faculty_mobile || f.leader_mobile || '',
        captain_specialty: f.captain_specialty || parsedCaptainStats?.specialty || f.captain_skill || 'Captain',
        vice_captain_specialty: f.vice_captain_specialty || parsedViceCaptainStats?.specialty || f.vice_captain_skill || 'Vice-Captain',
        captain_stats: parsedCaptainStats,
        vice_captain_stats: parsedViceCaptainStats,
        franchise_stats: parsedFranchiseStats,
        username: user?.username || null,
        squad,
        removedSquad,
        bucketCounts,
        auctionPurchasesCount,
        retainedCount,
        referredCount: Math.max(referredCount, totalReferredPlayers),
        squadCount: squad.length,
      };
    });
  }

  getScarcityReport(editionId: string) {
    const franchises = this.getFranchises(editionId);
    const availablePlayers = queryAll(
      `SELECT bucket, COUNT(*) as count FROM players
       WHERE edition_id = ?
         AND (approval_status = 'APPROVED' OR (approval_status IS NULL AND is_auction_eligible = 1))
         AND is_referred = 0
         AND id NOT IN (SELECT player_id FROM squad_members WHERE edition_id = ? AND (status = 'ACTIVE' OR status IS NULL) AND undone = 0)
       GROUP BY bucket`,
      [editionId, editionId]
    );

    const supplyMap: Record<string, number> = { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0 };
    for (const row of availablePlayers) {
      const code = normalizeCategoryCode(row.bucket);
      if (code && supplyMap[code] !== undefined) {
        supplyMap[code] += row.count;
      }
    }

    const items: Record<string, any> = {};
    const mandatoryBuckets = ['B3', 'B4', 'B2', 'B5', 'B1'];

    for (const b of mandatoryBuckets) {
      let totalNeed = 0;
      for (const f of franchises) {
        const current = f.bucketCounts[b] || 0;
        const need = Math.max(0, 2 - current);
        totalNeed += need;
      }

      const supply = supplyMap[b] || 0;
      const isExhausted = supply === 0 && totalNeed > 0;
      const isWarning = supply <= totalNeed;

      items[b] = {
        bucket: b,
        academicCategoryLabel: formatAcademicCategory(b),
        unsoldSupply: supply,
        totalNeed,
        isWarning,
        isExhausted,
      };
    }

    return items;
  }

  getUpcomingPlayers(editionId: string, limit: number = 6) {
    const activeSession = this.getActiveSession();
    const drawOrder = STRICT_BUCKET_AUCTION_ORDER;
    const upcoming: any[] = [];
    const seenIds = new Set<string>();

    for (const bucket of drawOrder) {
      if (upcoming.length >= limit) break;
      const candidates = queryAll(
        `SELECT p.id, p.name, p.roll_number, p.photo_url, p.program, p.branch, p.academic_year,
                p.skill, p.player_type, p.base_price, p.bucket, p.is_detained, p.random_identifier, p.auction_session
         FROM players p
         WHERE p.edition_id = ?
           AND (p.approval_status = 'APPROVED' OR (p.approval_status IS NULL AND p.is_auction_eligible = 1))
           AND p.is_referred = 0
           AND (p.auction_session = ? OR p.auction_session IS NULL)
           AND (p.referral_status IS NULL OR p.referral_status = 'NONE')
           AND (p.registration_status IS NULL OR p.registration_status != 'UNSOLD')
           AND (p.bucket = ? OR (? = 'PG' AND (p.bucket IS NULL OR p.bucket = 'PG' OR p.program = 'PG')))
           AND p.id NOT IN (SELECT player_id FROM squad_members WHERE edition_id = ? AND (status = 'ACTIVE' OR status IS NULL) AND undone = 0)
           AND p.id NOT IN (SELECT player_id FROM auction_lots WHERE edition_id = ? AND (lot_state = 'SOLD' OR lot_state = 'IN_AUCTION' OR lot_state = 'CALLED' OR lot_state = 'UNSOLD'))
         ORDER BY p.roll_number ASC LIMIT ?`,
        [editionId, activeSession, bucket, bucket, editionId, editionId, limit - upcoming.length]
      );

      for (const cand of candidates) {
        if (!seenIds.has(cand.id)) {
          seenIds.add(cand.id);
          upcoming.push({
            ...cand,
            academicCategoryLabel: formatAcademicCategory(cand.bucket),
          });
          if (upcoming.length >= limit) break;
        }
      }
    }
    return upcoming;
  }

  getEligibleGuestDrawPlayers(editionId: string) {
    const activeSession = this.getActiveSession();
    const candidates = queryAll(
      `SELECT p.id, p.bucket, p.base_price, p.random_identifier, p.auction_session
       FROM players p
       WHERE p.edition_id = ?
         AND (p.approval_status = 'APPROVED' OR (p.approval_status IS NULL AND p.is_auction_eligible = 1))
         AND (p.is_referred = 0 OR p.is_referred IS NULL)
         AND (p.auction_session = ? OR p.auction_session IS NULL)
         AND (p.referral_status IS NULL OR p.referral_status = 'NONE' OR p.referral_status = 'REJECTED')
         AND (p.registration_status IS NULL OR p.registration_status != 'UNSOLD')
         AND p.id NOT IN (SELECT player_id FROM squad_members WHERE edition_id = ? AND (status = 'ACTIVE' OR status IS NULL) AND undone = 0)
         AND p.id NOT IN (SELECT player_id FROM auction_lots WHERE edition_id = ? AND (lot_state = 'SOLD' OR lot_state = 'IN_AUCTION' OR lot_state = 'CALLED' OR lot_state = 'UNSOLD'))
       ORDER BY p.bucket ASC, p.id ASC`,
      [editionId, activeSession, editionId, editionId]
    );

    return candidates.map((c, index) => {
      const cardNumber = index + 1;
      const cardLabel = `CARD #${cardNumber}`;
      return {
        id: c.id,
        cardNumber,
        cardLabel,
        identifiedNumber: `${cardNumber}`,
        random_identifier: cardLabel,
        bucket: c.bucket,
        academicCategoryLabel: formatAcademicCategory(c.bucket),
        base_price: c.base_price || 20,
        auction_session: c.auction_session || activeSession,
      };
    });
  }

  getUnsoldPlayers(editionId: string) {
    return queryAll(
      `SELECT p.id, p.name, p.roll_number, p.photo_url, p.program, p.branch, p.academic_year,
              p.skill, p.player_type, p.base_price, p.bucket, p.is_detained, p.random_identifier,
              p.auction_session, p.registration_status, l.id as lot_id, l.created_at as unsold_at
       FROM players p
       LEFT JOIN (
         SELECT player_id, MAX(id) as id, MAX(created_at) as created_at
         FROM auction_lots
         WHERE edition_id = ? AND lot_state = 'UNSOLD'
         GROUP BY player_id
       ) l ON l.player_id = p.id
       WHERE p.edition_id = ?
         AND (p.registration_status = 'UNSOLD' OR p.id IN (SELECT player_id FROM auction_lots WHERE edition_id = ? AND lot_state = 'UNSOLD'))
       ORDER BY p.bucket ASC, p.roll_number ASC`,
      [editionId, editionId, editionId]
    );
  }

  async reAdmitUnsoldPlayer(editionId: string, playerId: string, actor: string = 'SuperAdmin') {
    const release = await this.acquireLock();
    try {
      const player = queryOne('SELECT * FROM players WHERE id = ? AND edition_id = ?', [playerId, editionId]);
      if (!player) throw new Error('PLAYER_NOT_FOUND: Player does not exist in this edition.');

      executeTransaction(() => {
        execute(
          `UPDATE players SET registration_status = 'APPROVED', approval_status = 'APPROVED', is_auction_eligible = 1 WHERE id = ?`,
          [playerId]
        );
        execute(
          `UPDATE auction_lots SET lot_state = 'ARCHIVED_UNSOLD' WHERE player_id = ? AND edition_id = ? AND lot_state = 'UNSOLD'`,
          [playerId, editionId]
        );
        const now = Date.now();
        execute(
          `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`AUDIT_${now}`, editionId, actor, 'SUPER_ADMIN', 'PLAYER_READMITTED', 'PLAYER', playerId, now]
        );
      });

      this.broadcast('STATE_UPDATED', { reason: 'PLAYER_READMITTED', playerId });
      return { success: true, message: `Player '${player.name}' has been re-admitted to the main auction pool with explicit admin approval.` };
    } finally {
      release();
    }
  }

  async adjustTimer(seconds: number, editionId: string, actor: string = 'Admin') {
    const release = await this.acquireLock();
    try {
      const lot = this.getCurrentLot(editionId);
      if (!lot) throw new Error('NO_ACTIVE_LOT: No active auction lot to adjust timer for.');

      const now = Date.now();
      let currentDeadline = lot.deadline_ms ? Math.max(lot.deadline_ms, now) : now;
      let newDeadline = currentDeadline + seconds * 1000;
      if (seconds < 0 && newDeadline < now) {
        newDeadline = now;
      }

      execute('UPDATE auction_lots SET deadline_ms = ? WHERE id = ?', [newDeadline, lot.id]);

      const updatedLot = this.getCurrentLot(editionId);
      this.broadcast('TIMER_ADJUSTED', {
        lot: updatedLot,
        adjustedBySeconds: seconds,
        newDeadline,
      });

      return { success: true, newDeadline, secondsRemaining: Math.ceil((newDeadline - now) / 1000) };
    } finally {
      release();
    }
  }

  async resetTimer(seconds: number = 30, editionId: string, actor: string = 'Admin') {
    const release = await this.acquireLock();
    try {
      const lot = this.getCurrentLot(editionId);
      if (!lot) throw new Error('NO_ACTIVE_LOT: No active auction lot to reset timer for.');

      const now = Date.now();
      const newDeadline = now + seconds * 1000;

      execute('UPDATE auction_lots SET deadline_ms = ? WHERE id = ?', [newDeadline, lot.id]);

      const updatedLot = this.getCurrentLot(editionId);
      this.broadcast('TIMER_RESET', {
        lot: updatedLot,
        newDeadline,
        seconds,
      });

      return { success: true, newDeadline, seconds };
    } finally {
      release();
    }
  }

  async placeBid(franchiseId: string, editionId: string, actor: string = 'Franchise') {
    const release = await this.acquireLock();
    try {
      const sessionState = this.getSessionState();
      if (sessionState.endsWith('_ENDED')) {
        throw new Error('SESSION_ENDED: Current auction session has been ended by Administrator. No new bids can be accepted.');
      }

      const lot = this.getCurrentLot(editionId);
      if (!lot) {
        throw new Error('NO_ACTIVE_LOT: No player currently in auction.');
      }
      if (lot.lot_state !== 'IN_AUCTION' && lot.lot_state !== 'CALLED') {
        throw new Error(`INVALID_STATE: Lot state is ${lot.lot_state}, bids only accepted when IN_AUCTION.`);
      }

      const franchise = queryOne('SELECT * FROM franchises WHERE id = ? AND edition_id = ?', [franchiseId, editionId]);
      if (!franchise) {
        throw new Error('FRANCHISE_NOT_FOUND: Franchise does not exist in this edition.');
      }
      if (franchise.active === 0) {
        throw new Error('FRANCHISE_INACTIVE: Franchise is currently inactive.');
      }

      if (lot.highest_bidder_id === franchiseId) {
        throw new Error('ALREADY_HIGHEST_BIDDER: You are already the highest bidder on this lot.');
      }

      const hasBidder = lot.highest_bidder_id !== null && lot.bid_count > 0;
      const nextLegalBid = AuctionPipeline.calculateNextLegalBid(lot.current_price, hasBidder);

      if (franchise.purse < nextLegalBid) {
        throw new Error(`INSUFFICIENT_PURSE: Current purse (${franchise.purse}) is less than required bid (${nextLegalBid}).`);
      }

      const squad = queryAll('SELECT * FROM squad_members WHERE franchise_id = ? AND (status = ' + "'ACTIVE'" + ' OR status IS NULL) AND undone = 0', [franchiseId]);
      if (squad.length >= 22) {
        throw new Error('SQUAD_FULL: Squad has reached the maximum capacity of 22 players.');
      }

      const bucketCounts: Record<string, number> = { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, PG: 0 };
      let auctionPurchasesCount = 0;
      for (const s of squad) {
        if (s.acquisition_type === 'AUCTION_PURCHASE') auctionPurchasesCount++;
      }
      const playerSquadRows = queryAll(
        `SELECT p.bucket FROM squad_members sm JOIN players p ON sm.player_id = p.id WHERE sm.franchise_id = ? AND (sm.status = 'ACTIVE' OR sm.status IS NULL) AND undone = 0`,
        [franchiseId]
      );
      for (const r of playerSquadRows) {
        const normCode = normalizeCategoryCode(r.bucket);
        if (normCode && bucketCounts[normCode] !== undefined) bucketCounts[normCode]++;
      }

      const franchiseEngineModel: AuctionPipeline.Franchise = {
        id: franchise.id,
        name: franchise.name,
        editionId,
        purse: franchise.purse,
        auctionPurchasesCount,
        retainedCount: 2,
        referredCount: 0,
        squadPlayerIds: squad.map((s: any) => s.player_id),
        bucketCounts,
        active: true,
        hasPassedCurrentLot: false,
      };

      const maxBid = AuctionPipeline.calculateMaximumPermissibleBid(franchiseEngineModel, lot.bucket);
      if (nextLegalBid > maxBid) {
        throw new Error(
          `EXCEEDS_MAX_PERMISSIBLE_BID: Bid ${nextLegalBid} exceeds maximum permissible bid ${maxBid}. You must reserve funds to fulfill remaining mandatory bucket slots.`
        );
      }

      const feasibility = AuctionPipeline.checkFranchiseFeasibility(
        franchiseEngineModel,
        { id: lot.player_id, name: lot.player_name, bucket: lot.bucket, basePrice: lot.opening_price, originalBasePrice: lot.opening_price, lotState: AuctionPipeline.PlayerLotState.IN_AUCTION, editionId, round: lot.round }
      );
      if (!feasibility.feasible) {
        throw new Error(`FEASIBILITY_VIOLATION: ${feasibility.reason}`);
      }

      const isFirstBid = lot.highest_bidder_id === null;
      const timerMs = isFirstBid ? 30000 : 20000;
      const now = Date.now();
      const newDeadline = now + timerMs;
      const nextSequence = lot.bid_count + 1;

      executeTransaction(() => {
        execute(
          `UPDATE auction_lots
           SET current_price = ?, highest_bidder_id = ?, bid_count = ?, deadline_ms = ?, lot_state = 'IN_AUCTION'
           WHERE id = ?`,
          [nextLegalBid, franchiseId, nextSequence, newDeadline, lot.id]
        );

        const bidId = `BID_${now}_${nextSequence}`;
        execute(
          `INSERT INTO bids (id, lot_id, franchise_id, amount, sequence, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
          [bidId, lot.id, franchiseId, nextLegalBid, nextSequence, now]
        );

        execute(
          `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `AUDIT_${now}`,
            editionId,
            actor,
            'FRANCHISE',
            'BID_PLACED',
            'AUCTION_LOT',
            lot.id,
            JSON.stringify({ franchiseId, amount: nextLegalBid, sequence: nextSequence }),
            now,
          ]
        );
      });

      const updatedLot = this.getCurrentLot(editionId);
      this.broadcast('BID_PLACED', {
        lot: updatedLot,
        bid: { franchiseId, amount: nextLegalBid, sequence: nextSequence, timestamp: now },
        bidNotification: {
          playerName: lot.player_name,
          franchiseName: franchise.name,
          franchiseLogo: franchise.logo_url,
          amount: nextLegalBid,
          lotId: lot.id,
          timestamp: now,
          message: `🏏 BID ALERT: ${lot.player_name} bid by ${franchise.name} for ${nextLegalBid} Pts (Purse)!`,
        },
      });

      return { success: true, lot: updatedLot };
    } finally {
      release();
    }
  }

  async passLot(franchiseId: string, editionId: string) {
    const lot = this.getCurrentLot(editionId);
    if (!lot) throw new Error('NO_ACTIVE_LOT: No active lot to pass on.');
    if (lot.highest_bidder_id && lot.highest_bidder_id === franchiseId) {
      throw new Error('CANNOT_PASS: Current winning bidder cannot pass.');
    }
    const now = Date.now();

    if (!this.lotPasses.has(lot.id)) {
      this.lotPasses.set(lot.id, new Set());
    }
    const passes = this.lotPasses.get(lot.id)!;
    passes.add(franchiseId);

    const franchise = queryOne('SELECT * FROM franchises WHERE id = ?', [franchiseId]);
    const franchiseName = franchise ? franchise.name : 'Franchise';

    execute(
      `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`AUDIT_${now}`, editionId, franchiseId, 'FRANCHISE', 'PLAYER_PASSED', 'AUCTION_LOT', lot.id, now]
    );

    const totalTeams = queryOne('SELECT COUNT(*) as c FROM franchises WHERE edition_id = ?', [editionId])?.c || 11;

    this.broadcast('PLAYER_PASSED', {
      lotId: lot.id,
      franchiseId,
      franchiseName,
      passedCount: passes.size,
      totalTeams,
      playerName: lot.player_name,
    });

    // If all franchises passed with 0 bids, auto-hammer UNSOLD
    if ((!lot.bid_count || lot.bid_count === 0) && passes.size >= totalTeams) {
      setTimeout(() => {
        this.strikeHammer(editionId, 'System (All Franchises Passed)', 'PLAYER_UNSOLD').catch(console.error);
      }, 400);
    } else if (lot.highest_bidder_id && passes.size >= (totalTeams - 1)) {
      // Leading bidder exists and all other teams have passed -> auto-hammer sold
      setTimeout(() => {
        this.strikeHammer(editionId, 'System (All Competing Franchises Passed)', 'HAMMER_SALE').catch(console.error);
      }, 400);
    }

    return { success: true, lotId: lot.id, franchiseId, passedCount: passes.size };
  }

  async strikeHammer(
    editionId: string,
    actor: string = 'SuperAdmin',
    action: 'HAMMER_SALE' | 'PLAYER_UNSOLD' = 'HAMMER_SALE'
  ) {
    const release = await this.acquireLock();
    try {
      const lot = this.getCurrentLot(editionId);
      if (!lot) throw new Error('NO_ACTIVE_LOT: No lot currently in auction.');

      const now = Date.now();

      if (action !== 'PLAYER_UNSOLD' && lot.highest_bidder_id && lot.bid_count > 0) {
        const franchise = queryOne('SELECT * FROM franchises WHERE id = ?', [lot.highest_bidder_id]);
        if (!franchise) throw new Error('WINNING_FRANCHISE_NOT_FOUND');

        const finalPrice = lot.current_price;
        const newPurse = franchise.purse - finalPrice;
        if (newPurse < 0) throw new Error('PURSE_NEGATIVE_RECONCILIATION_ERROR');

        const saleId = `SALE_${now}_${lot.player_id}`;
        const squadMemberId = `SQD_${now}_${lot.player_id}`;

        executeTransaction(() => {
          execute('UPDATE franchises SET purse = ? WHERE id = ?', [newPurse, franchise.id]);

          execute(
            `INSERT INTO purse_transactions (id, edition_id, franchise_id, amount, balance_after, transaction_type, reference_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [`PTX_${now}`, editionId, franchise.id, -finalPrice, newPurse, 'AUCTION_PURCHASE', lot.id, now]
          );

          execute(
            `INSERT INTO squad_members (id, edition_id, franchise_id, player_id, acquisition_type, price, round, status, timestamp, undone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [squadMemberId, editionId, franchise.id, lot.player_id, 'AUCTION_PURCHASE', finalPrice, lot.round, 'ACTIVE', now, 0]
          );

          execute(`UPDATE auction_lots SET lot_state = 'SOLD', deadline_ms = NULL WHERE id = ?`, [lot.id]);
          execute(`UPDATE players SET registration_status = 'SOLD' WHERE id = ?`, [lot.player_id]);

          execute(
            `INSERT INTO sales (id, edition_id, lot_id, player_id, franchise_id, amount, bucket, sale_type, timestamp, undone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [saleId, editionId, lot.id, lot.player_id, franchise.id, finalPrice, lot.bucket, 'HAMMER_SALE', now, 0]
          );

          execute(
            `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              `AUDIT_${now}`,
              editionId,
              actor,
              'SUPER_ADMIN',
              'HAMMER_SALE',
              'PLAYER',
              lot.player_id,
              JSON.stringify({ franchiseId: franchise.id, price: finalPrice, saleId }),
              now,
            ]
          );
        });

        saveSquadMemberToCloudSql({
          id: squadMemberId,
          edition_id: editionId,
          franchise_id: franchise.id,
          player_id: lot.player_id,
          acquisition_type: 'AUCTION_PURCHASE',
          price: finalPrice,
          round: lot.round,
          status: 'ACTIVE',
          timestamp: now,
          undone: 0,
        }).catch(() => {});

        saveSaleToCloudSql({
          id: saleId,
          edition_id: editionId,
          lot_id: lot.id,
          player_id: lot.player_id,
          franchise_id: franchise.id,
          amount: finalPrice,
          bucket: lot.bucket,
          sale_type: 'HAMMER_SALE',
          timestamp: now,
          undone: 0,
        }).catch(() => {});

        saveFranchiseToCloudSql({
          ...franchise,
          purse: newPurse,
        }).catch(() => {});

        this.broadcast('HAMMER_SALE', {
          lotId: lot.id,
          playerId: lot.player_id,
          playerName: lot.player_name,
          playerPhoto: lot.photo_url,
          bucket: lot.bucket,
          academicCategoryLabel: formatAcademicCategory(lot.bucket),
          winningFranchiseId: franchise.id,
          winningFranchiseName: franchise.name,
          winningFranchiseLogo: franchise.logo_url,
          finalPrice,
          lotState: 'SOLD',
        });

        this.scheduleAutoTransition(editionId);

        return { sold: true, playerId: lot.player_id, franchiseId: franchise.id, price: finalPrice, lotState: 'SOLD' };
      }

      executeTransaction(() => {
        execute(`UPDATE auction_lots SET lot_state = 'UNSOLD', deadline_ms = NULL WHERE id = ?`, [lot.id]);
        execute(`UPDATE players SET registration_status = 'UNSOLD' WHERE id = ?`, [lot.player_id]);
        execute(
          `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`AUDIT_${now}`, editionId, actor, 'SUPER_ADMIN', 'PLAYER_UNSOLD', 'PLAYER', lot.player_id, now]
        );
      });

      this.broadcast('PLAYER_UNSOLD', {
        lotId: lot.id,
        playerId: lot.player_id,
        playerName: lot.player_name,
        lotState: 'UNSOLD',
      });

      this.scheduleAutoTransition(editionId);

      return { sold: false, playerId: lot.player_id, lotState: 'UNSOLD' };
    } finally {
      release();
    }
  }

  async undoSale(saleId: string, reason: string, actor: string = 'SuperAdmin') {
    const release = await this.acquireLock();
    try {
      this.cancelAutoTransition();
      let sale = queryOne('SELECT * FROM sales WHERE id = ?', [saleId]);
      if (!sale) {
        sale = queryOne('SELECT s.* FROM sales s JOIN squad_members sm ON s.player_id = sm.player_id WHERE sm.id = ?', [saleId])
          || queryOne('SELECT * FROM sales WHERE player_id = ? ORDER BY timestamp DESC', [saleId]);
      }
      if (!sale) throw new Error('SALE_RECORD_NOT_FOUND');

      if (sale.undone === 1) {
        throw new Error('ALREADY_UNDO: Sale has already been undone.');
      }

      const franchise = queryOne('SELECT * FROM franchises WHERE id = ?', [sale.franchise_id]);
      if (!franchise) throw new Error('FRANCHISE_NOT_FOUND');

      const refundedPurse = franchise.purse + sale.amount;
      const now = Date.now();

      executeTransaction(() => {
        execute(
          'UPDATE sales SET undone = 1, undone_at = ?, undone_by = ?, undo_reason = ? WHERE id = ?',
          [now, actor, reason, sale.id]
        );

        execute('UPDATE franchises SET purse = ? WHERE id = ?', [refundedPurse, franchise.id]);

        execute(
          `INSERT INTO purse_transactions (id, edition_id, franchise_id, amount, balance_after, transaction_type, reference_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`PTX_${now}`, sale.edition_id, franchise.id, sale.amount, refundedPurse, 'SALE_UNDO_REFUND', sale.id, now]
        );

        execute(
          "UPDATE squad_members SET undone = 1, status = 'REMOVED', removed_at = ?, removed_by = ?, removal_reason = ? WHERE franchise_id = ? AND player_id = ? AND undone = 0",
          [now, actor, reason, franchise.id, sale.player_id]
        );

        execute(`UPDATE auction_lots SET lot_state = 'AVAILABLE' WHERE id = ?`, [sale.lot_id]);
        execute(`UPDATE players SET registration_status = 'REGISTERED' WHERE id = ?`, [sale.player_id]);

        execute(
          `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `AUDIT_${now}`,
            sale.edition_id,
            actor,
            'SUPER_ADMIN',
            'SALE_UNDO',
            'SALE',
            saleId,
            JSON.stringify({ refundedPurse, refundAmount: sale.amount, playerId: sale.player_id }),
            reason,
            now,
          ]
        );
      });

      saveSaleToCloudSql({
        ...sale,
        undone: 1,
        undone_at: now,
        undone_by: actor,
        undo_reason: reason,
      }).catch(() => {});

      saveFranchiseToCloudSql({
        ...franchise,
        purse: refundedPurse,
      }).catch(() => {});

      this.broadcast('SALE_UNDONE', { saleId, refundAmount: sale.amount, franchiseId: franchise.id });
      return { success: true, refundedPurse };
    } finally {
      release();
    }
  }

  async removeSquadMemberByCaptain(params: {
    franchiseId: string;
    playerId: string;
    reason: string;
    actor: string;
  }) {
    const release = await this.acquireLock();
    try {
      const { franchiseId, playerId, reason, actor } = params;
      const squadEntry = queryOne(
        `SELECT sm.*, p.name as player_name FROM squad_members sm
         JOIN players p ON sm.player_id = p.id
         WHERE sm.franchise_id = ? AND sm.player_id = ? AND (sm.status = 'ACTIVE' OR sm.status IS NULL) AND sm.undone = 0`,
        [franchiseId, playerId]
      );

      if (!squadEntry) {
        throw new Error('PLAYER_NOT_IN_SQUAD: Player is not an active member of this squad.');
      }

      const now = Date.now();

      executeTransaction(() => {
        execute(
          `UPDATE squad_members
           SET status = 'REMOVED', undone = 1, removed_at = ?, removed_by = ?, removal_reason = ?
           WHERE id = ?`,
          [now, actor, reason || 'Removed by Franchise Captain', squadEntry.id]
        );

        execute(
          `UPDATE players
           SET registration_status = 'REMOVED_FROM_SQUAD'
           WHERE id = ?`,
          [playerId]
        );

        execute(
          `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, reason, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `AUDIT_${now}_SQUAD_REM`,
            squadEntry.edition_id,
            actor,
            'CAPTAIN',
            'REMOVE_SQUAD_MEMBER',
            'SQUAD_MEMBER',
            squadEntry.id,
            JSON.stringify({ franchiseId, playerId, playerName: squadEntry.player_name, status: 'REMOVED' }),
            reason || 'Player safely removed by franchise captain',
            now,
          ]
        );
      });

      saveSquadMemberToCloudSql({
        ...squadEntry,
        status: 'REMOVED',
        undone: 1,
        removed_at: now,
        removed_by: actor,
        removal_reason: reason || 'Removed by Franchise Captain',
      }).catch(() => {});

      this.broadcast('STATE_UPDATED', { reason: 'SQUAD_MEMBER_REMOVED', franchiseId, playerId });
      return { success: true, message: `Player '${squadEntry.player_name}' has been safely removed from your squad.` };
    } finally {
      release();
    }
  }

  async drawNextPlayer(
    editionId: string,
    mode: 'AUTO' | 'GUEST' = 'AUTO',
    selectedIdOrIdentifier?: string,
    actor: string = 'SuperAdmin'
  ) {
    const release = await this.acquireLock();
    try {
      this.cancelAutoTransition();

      // Manage auto draw mode according to draw protocol (Requirement 4)
      if (mode === 'GUEST') {
        this.autoDrawMode = false;
        this.currentDrawMode = 'GUEST';
        this.broadcast('AUTO_DRAW_MODE_CHANGED', {
          autoDrawMode: false,
          currentDrawMode: 'GUEST',
          reason: 'GUEST_DRAW_ACTIVATED',
        });
      } else {
        this.autoDrawMode = true;
        this.currentDrawMode = 'AUTO';
        this.broadcast('AUTO_DRAW_MODE_CHANGED', {
          autoDrawMode: true,
          currentDrawMode: 'AUTO',
          reason: 'RANDOM_DRAW_ACTIVATED',
        });
      }

      const sessionState = this.getSessionState();
      if (sessionState.endsWith('_ENDED')) {
        throw new Error(`AUCTION_SESSION_ENDED: Session ${this.activeSession} has concluded. Switch or start the appropriate session.`);
      }

      const activeLot = this.getCurrentLot(editionId);
      if (activeLot) {
        throw new Error('ACTIVE_LOT_EXISTS: Cannot call next player while a lot is currently open in auction.');
      }

      const currentSession = this.getActiveSession();
      let targetPlayer: any = null;

      if (mode === 'GUEST' && selectedIdOrIdentifier) {
        targetPlayer = queryOne(
          `SELECT p.* FROM players p
           WHERE (p.id = ? OR p.random_identifier = ?)
             AND p.edition_id = ?
             AND (p.approval_status = 'APPROVED' OR (p.approval_status IS NULL AND p.is_auction_eligible = 1))
             AND (p.auction_session = ? OR p.auction_session IS NULL)
             AND (p.is_referred = 0 OR p.is_referred IS NULL)
             AND (p.referral_status IS NULL OR p.referral_status = 'NONE' OR p.referral_status = 'REJECTED')
             AND (p.registration_status IS NULL OR p.registration_status != 'UNSOLD')
             AND p.id NOT IN (SELECT player_id FROM squad_members WHERE edition_id = ? AND (status = 'ACTIVE' OR status IS NULL) AND undone = 0)
             AND p.id NOT IN (SELECT player_id FROM auction_lots WHERE edition_id = ? AND (lot_state = 'SOLD' OR lot_state = 'IN_AUCTION' OR lot_state = 'CALLED' OR lot_state = 'UNSOLD'))`,
          [selectedIdOrIdentifier, selectedIdOrIdentifier, editionId, currentSession, editionId, editionId]
        );
        if (!targetPlayer) {
          throw new Error('PLAYER_NOT_ELIGIBLE_FOR_GUEST_DRAW: Selected player identifier is invalid, unsold, referred, unapproved, or already auctioned.');
        }
      } else {
        const drawOrder = STRICT_BUCKET_AUCTION_ORDER;
        for (const bucket of drawOrder) {
          const candidate = queryOne(
            `SELECT p.* FROM players p
             WHERE p.edition_id = ?
               AND (p.approval_status = 'APPROVED' OR (p.approval_status IS NULL AND p.is_auction_eligible = 1))
               AND (p.auction_session = ? OR p.auction_session IS NULL)
               AND (p.is_referred = 0 OR p.is_referred IS NULL)
               AND (p.referral_status IS NULL OR p.referral_status = 'NONE' OR p.referral_status = 'REJECTED')
               AND (p.registration_status IS NULL OR p.registration_status != 'UNSOLD')
               AND (p.bucket = ? OR (? = 'PG' AND (p.bucket IS NULL OR p.bucket = 'PG' OR p.program = 'PG')))
               AND p.id NOT IN (SELECT player_id FROM squad_members WHERE edition_id = ? AND (status = 'ACTIVE' OR status IS NULL) AND undone = 0)
               AND p.id NOT IN (SELECT player_id FROM auction_lots WHERE edition_id = ? AND (lot_state = 'SOLD' OR lot_state = 'IN_AUCTION' OR lot_state = 'CALLED' OR lot_state = 'UNSOLD'))
             ORDER BY p.roll_number ASC LIMIT 1`,
            [editionId, currentSession, bucket, bucket, editionId, editionId]
          );

          if (candidate) {
            targetPlayer = candidate;
            break;
          }
        }
      }

      if (!targetPlayer) {
        throw new Error(`NO_AVAILABLE_PLAYERS: All approved players for Session ${currentSession} in the fixed bucket order have been called or sold.`);
      }

      const now = Date.now();
      const lotId = `LOT_${now}_${targetPlayer.id}`;
      const openingPrice = targetPlayer.base_price || 20;
      const deadlineMs = now + 30000;

      executeTransaction(() => {
        execute(
          `INSERT INTO auction_lots (id, edition_id, round, bucket, player_id, draw_number, draw_mode, random_identifier, auction_session, opening_price, current_price, highest_bidder_id, bid_count, deadline_ms, started_at, lot_state, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            lotId,
            editionId,
            1,
            targetPlayer.bucket || 'PG',
            targetPlayer.id,
            null,
            mode,
            targetPlayer.random_identifier || null,
            targetPlayer.auction_session || currentSession,
            openingPrice,
            openingPrice,
            null,
            0,
            deadlineMs,
            now,
            'CALLED',
            now,
          ]
        );

        execute(
          `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, reason, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `AUDIT_${now}`,
            editionId,
            actor,
            mode === 'GUEST' ? 'GUEST' : (actor === 'SYSTEM_AUTO_TRANSITION' ? 'SYSTEM' : 'SUPER_ADMIN'),
            mode === 'GUEST' ? 'GUEST_DRAW_CALLED' : 'PLAYER_CALLED',
            'PLAYER',
            targetPlayer.id,
            JSON.stringify({ lotId, openingPrice, mode, bucket: targetPlayer.bucket, session: currentSession }),
            mode === 'GUEST' ? 'Player drawn via Guest Draw Mode with masked identifier' : 'Player drawn in fixed bucket order',
            now,
          ]
        );
      });

      const newLot = this.getCurrentLot(editionId);
      this.broadcast('PLAYER_CALLED', { lot: newLot, drawMode: mode });
      return newLot;
    } finally {
      release();
    }
  }

  async skipLot(editionId: string, actor: string = 'SuperAdmin', reason: string = 'Skipped by Super Admin') {
    const release = await this.acquireLock();
    try {
      this.cancelAutoTransition();
      const lot = this.getCurrentLot(editionId);
      if (!lot) throw new Error('NO_ACTIVE_LOT: No active lot to skip.');
      const now = Date.now();

      executeTransaction(() => {
        execute(`UPDATE auction_lots SET lot_state = 'SKIPPED', deadline_ms = NULL WHERE id = ?`, [lot.id]);
        execute(
          `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`AUDIT_${now}`, editionId, actor, 'SUPER_ADMIN', 'PLAYER_SKIPPED', 'PLAYER', lot.player_id, reason, now]
        );
      });

      this.broadcast('PLAYER_SKIPPED', { lotId: lot.id, playerId: lot.player_id });
      return { success: true };
    } finally {
      release();
    }
  }

  resetAuctionState() {
    this.cancelAutoTransition();
    this.isPaused = false;
    this.pausedRemainingMs = null;
    this.pausedAutoTransitionSeconds = null;
    this.customTimerAlert = null;
    this.broadcast('STATE_UPDATED', { reason: 'AUCTION_RESET' });
  }
}

export const auctionManager = new AuctionManager();
