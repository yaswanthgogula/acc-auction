/**
 * ============================================================================
 * ACC AUTHORITATIVE LIVE AUCTION MANAGER
 * ============================================================================
 * Server-authoritative state transitions, concurrency mutex, legal bid
 * validation, maximum permissible bid calculation, timer handling, hammer,
 * undo, Random Draw, Guest Draw, squad management, and SSE event broadcasting.
 */

import {
  queryAll,
  queryOne,
  execute,
  executeTransaction,
} from './db';
import { AuctionPipeline } from '../engine/acc-combined-engines';
import { formatAcademicCategory, normalizeCategoryCode } from '../utils/academicCategories';
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
    };
  }

  getFranchises(editionId: string) {
    const franchises = queryAll('SELECT * FROM franchises WHERE edition_id = ? ORDER BY name ASC', [editionId]);
    return franchises.map((f) => {
      const squad = queryAll(
        `SELECT sm.*, p.name as player_name, p.bucket, p.roll_number, p.photo_url, p.player_type, p.branch,
                p.mobile_number, p.batting_style, p.bowling_style, p.stats_json, p.cricheroes_url, p.skill, p.email,
                p.is_referred, p.referral_status, p.referred_by_captain_name
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

      const referralCountRow = queryOne(
        `SELECT COUNT(*) as count FROM referral_tokens WHERE franchise_id = ? AND verification_status = 'APPROVED'`,
        [f.id]
      );
      const approvedReferralCount = referralCountRow?.count || 0;

      // Count of all players referred by this franchise (total referred)
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
        referredCount: Math.max(referredCount, approvedReferralCount, totalReferredPlayers),
        squadCount: squad.length,
      };
    });
  }

  getScarcityReport(editionId: string) {
    const franchises = this.getFranchises(editionId);
    const availablePlayers = queryAll(
      `SELECT bucket, COUNT(*) as count FROM players
       WHERE edition_id = ? AND is_auction_eligible = 1
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
    const mandatoryBuckets = ['B1', 'B2', 'B3', 'B4', 'B5'];

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
    const drawOrder = ['B3', 'B4', 'B2', 'B5', 'B1', 'PG'];
    const upcoming: any[] = [];
    const seenIds = new Set<string>();

    for (const bucket of drawOrder) {
      if (upcoming.length >= limit) break;
      const candidates = queryAll(
        `SELECT p.id, p.name, p.roll_number, p.photo_url, p.program, p.branch, p.academic_year,
                p.skill, p.player_type, p.base_price, p.bucket
         FROM players p
         WHERE p.edition_id = ? AND p.is_auction_eligible = 1
           AND p.is_referred = 0
           AND (p.referral_status IS NULL OR p.referral_status = 'NONE')
           AND (p.bucket = ? OR (? = 'PG' AND (p.bucket IS NULL OR p.bucket = 'PG' OR p.program = 'PG')))
           AND p.id NOT IN (SELECT player_id FROM squad_members WHERE edition_id = ? AND (status = 'ACTIVE' OR status IS NULL) AND undone = 0)
           AND p.id NOT IN (SELECT player_id FROM auction_lots WHERE edition_id = ? AND (lot_state = 'SOLD' OR lot_state = 'IN_AUCTION' OR lot_state = 'CALLED'))
         ORDER BY p.roll_number ASC LIMIT ?`,
        [editionId, bucket, bucket, editionId, editionId, limit - upcoming.length]
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
    const candidates = queryAll(
      `SELECT p.id, p.name, p.roll_number, p.photo_url, p.program, p.branch, p.academic_year,
              p.skill, p.player_type, p.base_price, p.bucket, p.batting_style, p.bowling_style, p.stats_json
       FROM players p
       WHERE p.edition_id = ?
         AND p.is_auction_eligible = 1
         AND (p.is_referred = 0 OR p.is_referred IS NULL)
         AND (p.referral_status IS NULL OR p.referral_status = 'NONE' OR p.referral_status = 'REJECTED')
         AND p.id NOT IN (SELECT player_id FROM squad_members WHERE edition_id = ? AND (status = 'ACTIVE' OR status IS NULL) AND undone = 0)
         AND p.id NOT IN (SELECT player_id FROM auction_lots WHERE edition_id = ? AND (lot_state = 'SOLD' OR lot_state = 'IN_AUCTION' OR lot_state = 'CALLED'))
       ORDER BY p.name ASC`,
      [editionId, editionId, editionId]
    );

    return candidates.map((c) => ({
      ...c,
      academicCategoryLabel: formatAcademicCategory(c.bucket),
    }));
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
        `SELECT p.bucket FROM squad_members sm JOIN players p ON sm.player_id = p.id WHERE sm.franchise_id = ? AND (sm.status = 'ACTIVE' OR sm.status IS NULL) AND sm.undone = 0`,
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
      });

      return { success: true, lot: updatedLot };
    } finally {
      release();
    }
  }

  async passLot(franchiseId: string, editionId: string) {
    const lot = this.getCurrentLot(editionId);
    if (!lot) throw new Error('NO_ACTIVE_LOT: No active lot to pass on.');
    const now = Date.now();

    execute(
      `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`AUDIT_${now}`, editionId, franchiseId, 'FRANCHISE', 'PLAYER_PASSED', 'AUCTION_LOT', lot.id, now]
    );

    this.broadcast('PLAYER_PASSED', { lotId: lot.id, franchiseId });
    return { success: true };
  }

  async strikeHammer(editionId: string, actor: string = 'SuperAdmin') {
    const release = await this.acquireLock();
    try {
      const lot = this.getCurrentLot(editionId);
      if (!lot) throw new Error('NO_ACTIVE_LOT: No lot currently in auction.');

      const now = Date.now();

      if (lot.highest_bidder_id && lot.bid_count > 0) {
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
      return { sold: false, playerId: lot.player_id, lotState: 'UNSOLD' };
    } finally {
      release();
    }
  }

  async undoSale(saleId: string, reason: string, actor: string = 'SuperAdmin') {
    const release = await this.acquireLock();
    try {
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
    selectedPlayerId?: string,
    actor: string = 'SuperAdmin'
  ) {
    const release = await this.acquireLock();
    try {
      const activeLot = this.getCurrentLot(editionId);
      if (activeLot) {
        throw new Error('ACTIVE_LOT_EXISTS: Cannot call next player while a lot is currently open in auction.');
      }

      let targetPlayer: any = null;

      if (mode === 'GUEST' && selectedPlayerId) {
        targetPlayer = queryOne(
          `SELECT p.* FROM players p
           WHERE p.id = ? AND p.edition_id = ?
             AND p.is_auction_eligible = 1
             AND (p.is_referred = 0 OR p.is_referred IS NULL)
             AND (p.referral_status IS NULL OR p.referral_status = 'NONE' OR p.referral_status = 'REJECTED')
             AND p.id NOT IN (SELECT player_id FROM squad_members WHERE edition_id = ? AND (status = 'ACTIVE' OR status IS NULL) AND undone = 0)
             AND p.id NOT IN (SELECT player_id FROM auction_lots WHERE edition_id = ? AND (lot_state = 'SOLD' OR lot_state = 'IN_AUCTION' OR lot_state = 'CALLED'))`,
          [selectedPlayerId, editionId, editionId, editionId]
        );
        if (!targetPlayer) {
          throw new Error('PLAYER_NOT_ELIGIBLE_FOR_GUEST_DRAW: Selected player is either referred, sold, or ineligible.');
        }
      } else {
        const drawOrder = ['B3', 'B4', 'B2', 'B5', 'B1', 'PG'];
        for (const bucket of drawOrder) {
          const candidate = queryOne(
            `SELECT p.* FROM players p
             WHERE p.edition_id = ? AND p.is_auction_eligible = 1
               AND (p.is_referred = 0 OR p.is_referred IS NULL)
               AND (p.referral_status IS NULL OR p.referral_status = 'NONE' OR p.referral_status = 'REJECTED')
               AND (p.bucket = ? OR (? = 'PG' AND (p.bucket IS NULL OR p.bucket = 'PG' OR p.program = 'PG')))
               AND p.id NOT IN (SELECT player_id FROM squad_members WHERE edition_id = ? AND (status = 'ACTIVE' OR status IS NULL) AND undone = 0)
               AND p.id NOT IN (SELECT player_id FROM auction_lots WHERE edition_id = ? AND lot_state = 'SOLD')
               AND p.id NOT IN (SELECT player_id FROM auction_lots WHERE edition_id = ? AND lot_state = 'IN_AUCTION')
             ORDER BY p.roll_number ASC LIMIT 1`,
            [editionId, bucket, bucket, editionId, editionId, editionId]
          );

          if (candidate) {
            targetPlayer = candidate;
            break;
          }
        }
      }

      if (!targetPlayer) {
        throw new Error('NO_AVAILABLE_PLAYERS: All eligible players in this round have been called or sold.');
      }

      const now = Date.now();
      const lotId = `LOT_${now}_${targetPlayer.id}`;
      const openingPrice = targetPlayer.base_price || 20;
      const deadlineMs = now + 30000;

      executeTransaction(() => {
        execute(
          `INSERT INTO auction_lots (id, edition_id, round, bucket, player_id, draw_number, draw_mode, opening_price, current_price, highest_bidder_id, bid_count, deadline_ms, started_at, lot_state, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [lotId, editionId, 1, targetPlayer.bucket || 'PG', targetPlayer.id, null, mode, openingPrice, openingPrice, null, 0, deadlineMs, now, 'CALLED', now]
        );

        execute(
          `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, reason, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `AUDIT_${now}`,
            editionId,
            actor,
            mode === 'GUEST' ? 'GUEST' : 'SUPER_ADMIN',
            mode === 'GUEST' ? 'GUEST_DRAW_CALLED' : 'PLAYER_CALLED',
            'PLAYER',
            targetPlayer.id,
            JSON.stringify({ lotId, openingPrice, mode }),
            mode === 'GUEST' ? 'Player drawn via Guest Draw Mode' : 'Player drawn via Random Draw Mode',
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
  }
}

export const auctionManager = new AuctionManager();
