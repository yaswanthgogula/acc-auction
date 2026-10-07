/**
 * ============================================================================
 * ACC SQL RELATIONAL DATABASE LAYER
 * ============================================================================
 * Uses sql.js (WebAssembly SQLite) with full ACID SQL relational semantics,
 * foreign keys, unique constraints, transactions, and persistent disk backing.
 * Synchronizes with Supabase PostgreSQL cloud database layer when configured.
 */

import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import bcrypt from 'bcryptjs';
import {
  initCloudSql,
  loadCloudSqlData,
  removeAllPlayersFromCloudSql,
  removeAllFranchisesFromCloudSql,
  deletePlayerFromCloudSql,
  deleteFranchiseFromCloudSql,
  savePlayerToCloudSql,
  saveFranchiseToCloudSql,
  saveUserToCloudSql,
} from './cloudsql-sync';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'acc_auction.sqlite');

let db: Database | null = null;
let SQL: any = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  SQL = await initSqlJs();

  const isExistingDb = fs.existsSync(DB_FILE);
  const instance: Database = isExistingDb
    ? new SQL.Database(fs.readFileSync(DB_FILE))
    : new SQL.Database();

  db = instance;

  instance.run('PRAGMA foreign_keys = ON;');
  createSchema(instance);

  const alterStatements = [
    'ALTER TABLE franchises ADD COLUMN faculty_branch TEXT;',
    'ALTER TABLE franchises ADD COLUMN faculty_mobile TEXT;',
    'ALTER TABLE franchises ADD COLUMN captain_name TEXT;',
    'ALTER TABLE franchises ADD COLUMN vice_captain_name TEXT;',
    'ALTER TABLE franchises ADD COLUMN captain_roll TEXT;',
    'ALTER TABLE franchises ADD COLUMN captain_mobile TEXT;',
    'ALTER TABLE franchises ADD COLUMN captain_branch TEXT;',
    'ALTER TABLE franchises ADD COLUMN captain_year TEXT;',
    'ALTER TABLE franchises ADD COLUMN captain_skill TEXT;',
    'ALTER TABLE franchises ADD COLUMN captain_specialty TEXT;',
    'ALTER TABLE franchises ADD COLUMN captain_batting_style TEXT;',
    'ALTER TABLE franchises ADD COLUMN captain_bowling_style TEXT;',
    'ALTER TABLE franchises ADD COLUMN captain_cricheroes_url TEXT;',
    'ALTER TABLE franchises ADD COLUMN captain_details_json TEXT;',
    'ALTER TABLE franchises ADD COLUMN captain_stats_json TEXT;',
    'ALTER TABLE franchises ADD COLUMN vice_captain_roll TEXT;',
    'ALTER TABLE franchises ADD COLUMN vice_captain_mobile TEXT;',
    'ALTER TABLE franchises ADD COLUMN vice_captain_branch TEXT;',
    'ALTER TABLE franchises ADD COLUMN vice_captain_year TEXT;',
    'ALTER TABLE franchises ADD COLUMN vice_captain_skill TEXT;',
    'ALTER TABLE franchises ADD COLUMN vice_captain_specialty TEXT;',
    'ALTER TABLE franchises ADD COLUMN vice_captain_batting_style TEXT;',
    'ALTER TABLE franchises ADD COLUMN vice_captain_bowling_style TEXT;',
    'ALTER TABLE franchises ADD COLUMN vice_captain_cricheroes_url TEXT;',
    'ALTER TABLE franchises ADD COLUMN vice_captain_details_json TEXT;',
    'ALTER TABLE franchises ADD COLUMN vice_captain_stats_json TEXT;',
    'ALTER TABLE franchises ADD COLUMN matches_played INTEGER DEFAULT 0;',
    'ALTER TABLE franchises ADD COLUMN matches_won INTEGER DEFAULT 0;',
    'ALTER TABLE franchises ADD COLUMN matches_lost INTEGER DEFAULT 0;',
    'ALTER TABLE franchises ADD COLUMN titles_won INTEGER DEFAULT 0;',
    'ALTER TABLE franchises ADD COLUMN win_percentage TEXT DEFAULT "0%";',
    'ALTER TABLE franchises ADD COLUMN franchise_stats_json TEXT;',
    'ALTER TABLE players ADD COLUMN batting_style TEXT;',
    'ALTER TABLE players ADD COLUMN bowling_style TEXT;',
    'ALTER TABLE players ADD COLUMN batting_position TEXT;',
    'ALTER TABLE players ADD COLUMN batting_hand TEXT;',
    'ALTER TABLE players ADD COLUMN batting_playing_type TEXT;',
    'ALTER TABLE players ADD COLUMN bowling_profile TEXT;',
    'ALTER TABLE players ADD COLUMN is_referred INTEGER DEFAULT 0;',
    'ALTER TABLE players ADD COLUMN referral_token TEXT;',
    'ALTER TABLE players ADD COLUMN referred_by_captain_id TEXT;',
    'ALTER TABLE players ADD COLUMN referred_by_captain_name TEXT;',
    'ALTER TABLE players ADD COLUMN referring_franchise_id TEXT;',
    'ALTER TABLE players ADD COLUMN referring_franchise_name TEXT;',
    'ALTER TABLE players ADD COLUMN referral_status TEXT DEFAULT "NONE";',
    'ALTER TABLE players ADD COLUMN referral_verified_at INTEGER;',
    'ALTER TABLE players ADD COLUMN referral_verified_by TEXT;',
    'ALTER TABLE players ADD COLUMN is_detained INTEGER DEFAULT 0;',
    'ALTER TABLE players ADD COLUMN registration_phase INTEGER DEFAULT 1;',
    'ALTER TABLE players ADD COLUMN approval_status TEXT DEFAULT "PENDING";',
    'ALTER TABLE players ADD COLUMN rejection_reason TEXT;',
    'ALTER TABLE players ADD COLUMN auction_session INTEGER DEFAULT 1;',
    'ALTER TABLE players ADD COLUMN random_identifier TEXT;',
    'ALTER TABLE editions ADD COLUMN active_session INTEGER DEFAULT 1;',
    'ALTER TABLE editions ADD COLUMN session_state TEXT DEFAULT "SESSION_1_ACTIVE";',
    'ALTER TABLE auction_lots ADD COLUMN random_identifier TEXT;',
    'ALTER TABLE auction_lots ADD COLUMN auction_session INTEGER DEFAULT 1;',
    'ALTER TABLE squad_members ADD COLUMN status TEXT DEFAULT "ACTIVE";',
    'ALTER TABLE squad_members ADD COLUMN removed_at INTEGER;',
    'ALTER TABLE squad_members ADD COLUMN removed_by TEXT;',
    'ALTER TABLE squad_members ADD COLUMN removal_reason TEXT;',
  ];

  for (const sql of alterStatements) {
    try {
      instance.run(sql);
    } catch {}
  }

  await bootstrapSuperAdmin(instance);

  try {
    await initCloudSql();
    const cloudData = await loadCloudSqlData();

    if (cloudData.editions && cloudData.editions.length > 0) {
      for (const ed of cloudData.editions) {
        try {
          instance.run(
            'INSERT OR REPLACE INTO editions (id, name, year, status, active_session, session_state, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [ed.id, ed.name, ed.year, ed.status, ed.active_session || 1, ed.session_state || 'SESSION_1_ACTIVE', ed.created_at]
          );
        } catch {}
      }
    }

    if (cloudData.users && cloudData.users.length > 0) {
      for (const u of cloudData.users) {
        try {
          instance.run(
            'INSERT OR REPLACE INTO users (id, username, email, password_hash, role, franchise_id, player_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [u.id, u.username, u.email, u.password_hash, u.role, u.franchise_id, u.player_id, u.created_at]
          );
        } catch {}
      }
    }

    if (cloudData.franchises && cloudData.franchises.length > 0) {
      for (const f of cloudData.franchises) {
        try {
          instance.run(
            `INSERT OR REPLACE INTO franchises (
              id, edition_id, name, logo_url, department, faculty_coordinator,
              faculty_branch, faculty_mobile,
              captain_name, vice_captain_name, captain_roll, captain_mobile,
              captain_branch, captain_year, captain_skill, captain_specialty, captain_batting_style,
              captain_bowling_style, captain_cricheroes_url, captain_details_json, captain_stats_json,
              vice_captain_roll, vice_captain_mobile, vice_captain_branch,
              vice_captain_year, vice_captain_skill, vice_captain_specialty, vice_captain_batting_style,
              vice_captain_bowling_style, vice_captain_cricheroes_url,
              vice_captain_details_json, vice_captain_stats_json,
              matches_played, matches_won, matches_lost, titles_won, win_percentage, franchise_stats_json,
              purse, active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              f.id, f.edition_id || 'ED_ACC_2026', f.name, f.logo_url, f.department, f.faculty_coordinator,
              f.faculty_branch || f.department || '', f.faculty_mobile || f.leader_mobile || '',
              f.captain_name, f.vice_captain_name, f.captain_roll, f.captain_mobile,
              f.captain_branch, f.captain_year, f.captain_skill, f.captain_specialty || null, f.captain_batting_style,
              f.captain_bowling_style, f.captain_cricheroes_url, f.captain_details_json, f.captain_stats_json,
              f.vice_captain_roll, f.vice_captain_mobile, f.vice_captain_branch,
              f.vice_captain_year, f.vice_captain_skill, f.vice_captain_specialty || null, f.vice_captain_batting_style,
              f.vice_captain_bowling_style, f.vice_captain_cricheroes_url,
              f.vice_captain_details_json, f.vice_captain_stats_json,
              f.matches_played || 0, f.matches_won || 0, f.matches_lost || 0, f.titles_won || 0, f.win_percentage || '0%', f.franchise_stats_json || null,
              f.purse ?? 1000, f.active ?? 1, f.created_at || Date.now()
            ]
          );
        } catch {}
      }
    }

    if (cloudData.players && cloudData.players.length > 0) {
      for (const p of cloudData.players) {
        try {
          instance.run(
            `INSERT OR REPLACE INTO players (
              id, edition_id, roll_number, name, email, mobile_number, photo_url,
              program, branch, academic_year, bucket, skill, player_type,
              batting_style, bowling_style, batting_position, batting_hand, batting_playing_type, bowling_profile,
              is_detained, registration_phase, approval_status, rejection_reason, auction_session, random_identifier,
              is_referred, referral_token, referred_by_captain_id, referred_by_captain_name,
              referring_franchise_id, referring_franchise_name, referral_status,
              cricheroes_url, stats_json, base_price,
              payment_status, registration_status, is_auction_eligible, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              p.id, p.edition_id || 'ED_ACC_2026', p.roll_number, p.name, p.email, p.mobile_number, p.photo_url,
              p.program, p.branch, p.academic_year, p.bucket, p.skill, p.player_type,
              p.batting_style, p.bowling_style, p.batting_position || null, p.batting_hand || null, p.batting_playing_type || null, p.bowling_profile || null,
              p.is_detained || 0, p.registration_phase || 1, p.approval_status || 'PENDING', p.rejection_reason || null, p.auction_session || 1, p.random_identifier || null,
              p.is_referred || 0, p.referral_token || null, p.referred_by_captain_id || null, p.referred_by_captain_name || null,
              p.referring_franchise_id || null, p.referring_franchise_name || null, p.referral_status || 'NONE',
              p.cricheroes_url, p.stats_json, p.base_price,
              p.payment_status || 'REGISTERED', p.registration_status || 'REGISTERED', p.is_auction_eligible ?? 0, p.created_at, p.updated_at || Date.now()
            ]
          );
        } catch {}
      }
    }

    if (cloudData.squadMembers && cloudData.squadMembers.length > 0) {
      for (const sm of cloudData.squadMembers) {
        try {
          instance.run(
            `INSERT OR REPLACE INTO squad_members (
              id, edition_id, franchise_id, player_id, acquisition_type, price, round, status, timestamp, undone, removed_at, removed_by, removal_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [sm.id, sm.edition_id, sm.franchise_id, sm.player_id, sm.acquisition_type, sm.price, sm.round, sm.status, sm.timestamp, sm.undone, sm.removed_at, sm.removed_by, sm.removal_reason]
          );
        } catch {}
      }
    }

    if (cloudData.referralTokens && cloudData.referralTokens.length > 0) {
      for (const rt of cloudData.referralTokens) {
        try {
          instance.run(
            `INSERT OR REPLACE INTO referral_tokens (
              token, edition_id, franchise_id, franchise_name, captain_id, captain_name, captain_mobile, created_at, status, player_id, player_name, verification_status, verification_reason, verified_by, verified_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [rt.token, rt.edition_id, rt.franchise_id, rt.franchise_name, rt.captain_id, rt.captain_name, rt.captain_mobile, rt.created_at, rt.status, rt.player_id, rt.player_name, rt.verification_status, rt.verification_reason, rt.verified_by, rt.verified_at]
          );
        } catch {}
      }
    }

    if (cloudData.sales && cloudData.sales.length > 0) {
      for (const s of cloudData.sales) {
        try {
          instance.run(
            `INSERT OR REPLACE INTO sales (
              id, edition_id, lot_id, player_id, franchise_id, amount, bucket, sale_type, timestamp, undone, undone_at, undone_by, undo_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [s.id, s.edition_id, s.lot_id, s.player_id, s.franchise_id, s.amount, s.bucket, s.sale_type, s.timestamp, s.undone, s.undone_at, s.undone_by, s.undo_reason]
          );
        } catch {}
      }
    }
  } catch (err) {
    console.warn('[Supabase Sync] Warning on startup sync:', err);
  }

  const currentFCount = instance.exec("SELECT COUNT(*) as count FROM franchises WHERE edition_id = 'ED_ACC_2026'");
  const fTotal = currentFCount.length > 0 && currentFCount[0].values.length > 0 ? (currentFCount[0].values[0][0] as number) : 0;
  if (fTotal === 0 && !isExistingDb) {
    await seedDefaultAvanthiData(instance, false);
  }

  saveDatabaseToDisk();
  return instance;
}

export function saveDatabaseToDisk(): void {
  if (!db) return;
  try {
    const binary = db.export();
    const buffer = Buffer.from(binary);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (e) {
    console.error('Failed to save sqlite file to disk:', e);
  }
}

function createSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS editions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      active_session INTEGER DEFAULT 1,
      session_state TEXT DEFAULT 'SESSION_1_ACTIVE',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      franchise_id TEXT,
      player_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS franchises (
      id TEXT PRIMARY KEY,
      edition_id TEXT NOT NULL,
      name TEXT NOT NULL,
      logo_url TEXT,
      faculty_coordinator TEXT,
      faculty_branch TEXT,
      faculty_mobile TEXT,
      department TEXT,
      leader_photo_url TEXT,
      leader_mobile TEXT,
      captain_id TEXT,
      vice_captain_id TEXT,
      captain_name TEXT,
      vice_captain_name TEXT,
      captain_roll TEXT,
      captain_mobile TEXT,
      captain_branch TEXT,
      captain_year TEXT,
      captain_skill TEXT,
      captain_specialty TEXT,
      captain_batting_style TEXT,
      captain_bowling_style TEXT,
      captain_cricheroes_url TEXT,
      captain_details_json TEXT,
      captain_stats_json TEXT,
      vice_captain_roll TEXT,
      vice_captain_mobile TEXT,
      vice_captain_branch TEXT,
      vice_captain_year TEXT,
      vice_captain_skill TEXT,
      vice_captain_specialty TEXT,
      vice_captain_batting_style TEXT,
      vice_captain_bowling_style TEXT,
      vice_captain_cricheroes_url TEXT,
      vice_captain_details_json TEXT,
      vice_captain_stats_json TEXT,
      matches_played INTEGER NOT NULL DEFAULT 0,
      matches_won INTEGER NOT NULL DEFAULT 0,
      matches_lost INTEGER NOT NULL DEFAULT 0,
      titles_won INTEGER NOT NULL DEFAULT 0,
      win_percentage TEXT DEFAULT '0%',
      franchise_stats_json TEXT,
      purse INTEGER NOT NULL DEFAULT 1000,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      edition_id TEXT NOT NULL,
      roll_number TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile_number TEXT NOT NULL,
      photo_url TEXT,
      program TEXT NOT NULL,
      branch TEXT NOT NULL,
      academic_year INTEGER NOT NULL,
      bucket TEXT,
      skill TEXT NOT NULL,
      player_type TEXT NOT NULL,
      batting_style TEXT,
      bowling_style TEXT,
      batting_position TEXT,
      batting_hand TEXT,
      batting_playing_type TEXT,
      bowling_profile TEXT,
      experience TEXT,
      previous_acc TEXT,
      cricheroes_url TEXT,
      cricheroes_mobile TEXT,
      cricheroes_status TEXT NOT NULL DEFAULT 'PROFILE_CREATION_PENDING',
      stats_json TEXT,
      base_price INTEGER,
      payment_status TEXT NOT NULL DEFAULT 'REGISTERED',
      registration_status TEXT NOT NULL DEFAULT 'REGISTERED',
      registration_phase INTEGER DEFAULT 1,
      approval_status TEXT DEFAULT 'PENDING',
      rejection_reason TEXT,
      is_auction_eligible INTEGER NOT NULL DEFAULT 0,
      is_detained INTEGER DEFAULT 0,
      auction_session INTEGER DEFAULT 1,
      random_identifier TEXT,
      ineligibility_reasons TEXT,
      is_editing_blocked INTEGER NOT NULL DEFAULT 0,
      is_detained_override INTEGER NOT NULL DEFAULT 0,
      detention_reason TEXT,
      is_referred INTEGER DEFAULT 0,
      referral_token TEXT,
      referred_by_captain_id TEXT,
      referred_by_captain_name TEXT,
      referring_franchise_id TEXT,
      referring_franchise_name TEXT,
      referral_status TEXT DEFAULT 'NONE',
      referral_verified_at INTEGER,
      referral_verified_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS referral_tokens (
      token TEXT PRIMARY KEY,
      edition_id TEXT NOT NULL,
      franchise_id TEXT NOT NULL,
      franchise_name TEXT NOT NULL,
      captain_id TEXT,
      captain_name TEXT NOT NULL,
      captain_mobile TEXT,
      created_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      player_id TEXT,
      player_name TEXT,
      verification_status TEXT NOT NULL DEFAULT 'PENDING',
      verification_reason TEXT,
      verified_by TEXT,
      verified_at INTEGER,
      FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE,
      FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      edition_id TEXT NOT NULL,
      franchise_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      conflict_notes TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE,
      FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auction_lots (
      id TEXT PRIMARY KEY,
      edition_id TEXT NOT NULL,
      round INTEGER NOT NULL DEFAULT 1,
      bucket TEXT NOT NULL,
      player_id TEXT NOT NULL,
      draw_number INTEGER,
      draw_mode TEXT NOT NULL DEFAULT 'AUTO',
      random_identifier TEXT,
      auction_session INTEGER DEFAULT 1,
      lot_state TEXT NOT NULL DEFAULT 'AVAILABLE',
      opening_price INTEGER NOT NULL,
      current_price INTEGER NOT NULL,
      highest_bidder_id TEXT,
      bid_count INTEGER NOT NULL DEFAULT 0,
      deadline_ms INTEGER,
      started_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      lot_id TEXT NOT NULL,
      franchise_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      sequence INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (lot_id) REFERENCES auction_lots(id) ON DELETE CASCADE,
      FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      edition_id TEXT NOT NULL,
      lot_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      franchise_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      bucket TEXT,
      sale_type TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      undone INTEGER NOT NULL DEFAULT 0,
      undone_at INTEGER,
      undone_by TEXT,
      undo_reason TEXT,
      FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS squad_members (
      id TEXT PRIMARY KEY,
      edition_id TEXT NOT NULL,
      franchise_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      acquisition_type TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      round INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      timestamp INTEGER NOT NULL,
      undone INTEGER NOT NULL DEFAULT 0,
      removed_at INTEGER,
      removed_by TEXT,
      removal_reason TEXT,
      FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE,
      FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purse_transactions (
      id TEXT PRIMARY KEY,
      edition_id TEXT NOT NULL,
      franchise_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      transaction_type TEXT NOT NULL,
      reference_id TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE,
      FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      edition_id TEXT,
      actor TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      old_state TEXT,
      new_state TEXT,
      reason TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      edition_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'AUCTION_STARTING_10M',
      target TEXT NOT NULL DEFAULT 'ALL',
      starts_at INTEGER,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_edition ON notifications(edition_id);
    CREATE INDEX IF NOT EXISTS idx_players_edition ON players(edition_id);
    CREATE INDEX IF NOT EXISTS idx_players_roll ON players(roll_number);
    CREATE INDEX IF NOT EXISTS idx_franchises_edition ON franchises(edition_id);
    CREATE INDEX IF NOT EXISTS idx_squad_franchise ON squad_members(franchise_id);
    CREATE INDEX IF NOT EXISTS idx_bids_lot ON bids(lot_id);
    CREATE INDEX IF NOT EXISTS idx_sales_edition ON sales(edition_id);
    CREATE INDEX IF NOT EXISTS idx_audit_edition ON audit_logs(edition_id);
    CREATE INDEX IF NOT EXISTS idx_referral_tokens_franchise ON referral_tokens(franchise_id);
  `);
}

async function bootstrapSuperAdmin(db: Database) {
  const result = db.exec("SELECT COUNT(*) as count FROM users WHERE role = 'SUPER_ADMIN'");
  const count = result.length > 0 && result[0].values.length > 0 ? (result[0].values[0][0] as number) : 0;

  if (count === 0) {
    const adminId = 'ADMIN_MASTER_01';
    const username = 'admin';
    const email = 'superadmin@avanthi.edu.in';
    const passwordHash = await bcrypt.hash('admin123', 10);
    const now = Date.now();

    db.run(
      'INSERT INTO users (id, username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, username, email, passwordHash, 'SUPER_ADMIN', now]
    );

    saveUserToCloudSql({
      id: adminId,
      username,
      email,
      password_hash: passwordHash,
      role: 'SUPER_ADMIN',
      created_at: now,
    }).catch(() => {});

    db.run(
      'INSERT INTO audit_logs (id, actor, role, action, entity, entity_id, new_state, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        `AUDIT_${now}`,
        'SYSTEM_BOOTSTRAP',
        'SYSTEM',
        'PROVISION_SUPER_ADMIN',
        'USER',
        adminId,
        JSON.stringify({ username, role: 'SUPER_ADMIN' }),
        now,
      ]
    );
  }

  const editionResult = db.exec("SELECT COUNT(*) as count FROM editions WHERE status = 'ACTIVE'");
  const editionCount = editionResult.length > 0 && editionResult[0].values.length > 0 ? (editionResult[0].values[0][0] as number) : 0;
  const editionId = 'ED_ACC_2026';
  const now = Date.now();

  if (editionCount === 0) {
    db.run(
      'INSERT INTO editions (id, name, year, status, active_session, session_state, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [editionId, 'ACC 2026', 2026, 'ACTIVE', 1, 'SESSION_1_ACTIVE', now]
    );
  }
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

let inTransaction = false;

export function execute(sql: string, params: any[] = []): void {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  if (!inTransaction) {
    saveDatabaseToDisk();
  }
}

export function executeTransaction(fn: () => void): void {
  if (!db) throw new Error('Database not initialized');
  inTransaction = true;
  db.run('BEGIN TRANSACTION;');
  try {
    fn();
    db.run('COMMIT;');
    inTransaction = false;
    saveDatabaseToDisk();
  } catch (err) {
    try {
      db.run('ROLLBACK;');
    } catch {}
    inTransaction = false;
    throw err;
  }
}

export async function resetSystemData(actorUsername: string = 'SuperAdmin'): Promise<void> {
  if (!db) return;
  executeTransaction(() => {
    execute('DELETE FROM bids;');
    execute('DELETE FROM sales;');
    execute('DELETE FROM squad_members;');
    execute('DELETE FROM purse_transactions;');
    execute('DELETE FROM auction_lots;');
    execute('DELETE FROM referral_tokens;');
    execute('DELETE FROM referrals;');
    execute('DELETE FROM notifications;');
    execute('DELETE FROM players;');
    execute('DELETE FROM audit_logs;');
    execute("DELETE FROM users WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN');");
    execute('DELETE FROM franchises;');
    execute("UPDATE editions SET active_session = 1, session_state = 'SESSION_1_ACTIVE', status = 'ACTIVE' WHERE id = 'ED_ACC_2026';");

    const now = Date.now();
    execute(
      `INSERT INTO audit_logs (id, actor, role, action, entity, entity_id, new_state, reason, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `AUDIT_${now}_SYSTEM_RESET`,
        actorUsername,
        'SUPER_ADMIN',
        'RESET_SYSTEM',
        'DATABASE_APPLICATION_DATA',
        'ALL',
        JSON.stringify({ schemaStatus: 'PRESERVED', dataStatus: 'PURGED', resetAt: now }),
        'Transactional cleanup of all application data while maintaining structural database schema',
        now,
      ]
    );
  });

  await bootstrapSuperAdmin(db);

  removeAllPlayersFromCloudSql().catch(() => {});
  removeAllFranchisesFromCloudSql().catch(() => {});
  saveDatabaseToDisk();
}

export function deleteSinglePlayer(playerId: string, actorUsername: string = 'Admin'): void {
  if (!db) return;
  const player = queryOne('SELECT * FROM players WHERE id = ?', [playerId]);
  if (!player) return;

  const now = Date.now();
  executeTransaction(() => {
    execute('DELETE FROM bids WHERE lot_id IN (SELECT id FROM auction_lots WHERE player_id = ?)', [playerId]);
    execute('DELETE FROM sales WHERE player_id = ?', [playerId]);
    execute('DELETE FROM squad_members WHERE player_id = ?', [playerId]);
    execute('DELETE FROM auction_lots WHERE player_id = ?', [playerId]);
    execute('DELETE FROM referral_tokens WHERE player_id = ?', [playerId]);
    execute('DELETE FROM referrals WHERE player_id = ?', [playerId]);
    execute('DELETE FROM users WHERE player_id = ?', [playerId]);
    execute('UPDATE franchises SET captain_id = NULL WHERE captain_id = ?', [playerId]);
    execute('UPDATE franchises SET vice_captain_id = NULL WHERE vice_captain_id = ?', [playerId]);
    execute('DELETE FROM players WHERE id = ?', [playerId]);

    execute(
      `INSERT INTO audit_logs (id, actor, role, action, entity, entity_id, old_state, new_state, reason, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `AUDIT_${now}_DEL_PL`,
        actorUsername,
        'ADMIN',
        'DELETE_SINGLE_PLAYER',
        'PLAYER',
        playerId,
        JSON.stringify({ name: player.name, roll: player.roll_number }),
        'DELETED',
        `Admin permanently deleted player '${player.name}' (${player.roll_number}) from database`,
        now,
      ]
    );
  });

  deletePlayerFromCloudSql(playerId).catch(() => {});
}

export function deleteSingleFranchise(franchiseId: string, actorUsername: string = 'Admin'): void {
  if (!db) return;
  const franchise = queryOne('SELECT * FROM franchises WHERE id = ?', [franchiseId]);
  if (!franchise) return;

  const now = Date.now();
  executeTransaction(() => {
    execute('UPDATE players SET referring_franchise_id = NULL, is_referred = 0, referral_token = NULL, referral_status = "NONE" WHERE referring_franchise_id = ?', [franchiseId]);
    execute('DELETE FROM referral_tokens WHERE franchise_id = ?', [franchiseId]);
    execute('DELETE FROM referrals WHERE franchise_id = ?', [franchiseId]);
    execute("UPDATE players SET registration_status = 'REGISTERED', is_auction_eligible = CASE WHEN approval_status = 'APPROVED' THEN 1 ELSE is_auction_eligible END WHERE id IN (SELECT player_id FROM squad_members WHERE franchise_id = ?)", [franchiseId]);
    execute('DELETE FROM bids WHERE franchise_id = ?', [franchiseId]);
    execute('DELETE FROM sales WHERE franchise_id = ?', [franchiseId]);
    execute('DELETE FROM squad_members WHERE franchise_id = ?', [franchiseId]);
    execute('DELETE FROM purse_transactions WHERE franchise_id = ?', [franchiseId]);
    execute('DELETE FROM users WHERE franchise_id = ?', [franchiseId]);
    execute('UPDATE auction_lots SET highest_bidder_id = NULL WHERE highest_bidder_id = ?', [franchiseId]);
    execute('DELETE FROM franchises WHERE id = ?', [franchiseId]);

    execute(
      `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, old_state, new_state, reason, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `AUDIT_${now}_DEL_FR`,
        franchise.edition_id || null,
        actorUsername,
        'ADMIN',
        'DELETE_SINGLE_FRANCHISE',
        'FRANCHISE',
        franchiseId,
        JSON.stringify({ name: franchise.name, department: franchise.department }),
        'DELETED',
        `Admin permanently deleted franchise '${franchise.name}' from database`,
        now,
      ]
    );
  });

  deleteFranchiseFromCloudSql(franchiseId).catch(() => {});
}

export function removeAllPlayers(actorUsername: string = 'SuperAdmin'): { count: number } {
  if (!db) return { count: 0 };
  let count = 0;
  executeTransaction(() => {
    const playersList = queryAll('SELECT id FROM players');
    count = playersList.length;

    execute('DELETE FROM bids;');
    execute('DELETE FROM sales;');
    execute('DELETE FROM squad_members;');
    execute('DELETE FROM auction_lots;');
    execute('DELETE FROM referral_tokens;');
    execute('DELETE FROM referrals;');
    execute("DELETE FROM users WHERE role = 'PLAYER';");
    execute('DELETE FROM players;');

    execute('UPDATE franchises SET purse = 1000, captain_id = NULL, vice_captain_id = NULL;');
    execute("DELETE FROM purse_transactions WHERE transaction_type != 'INITIAL_PURSE';");

    const now = Date.now();
    execute(
      `INSERT INTO audit_logs (id, actor, role, action, entity, entity_id, new_state, reason, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `AUDIT_${now}_REMOVE_ALL_PLAYERS`,
        actorUsername,
        'ADMIN',
        'REMOVE_ALL_PLAYERS',
        'PLAYERS',
        'ALL',
        JSON.stringify({ deletedCount: count }),
        `Admin permanently removed all ${count} players from the system`,
        now,
      ]
    );
  });
  removeAllPlayersFromCloudSql().catch(() => {});
  return { count };
}

export function removeAllFranchises(actorUsername: string = 'SuperAdmin'): { count: number } {
  if (!db) return { count: 0 };
  let count = 0;
  executeTransaction(() => {
    const franchisesList = queryAll('SELECT id FROM franchises');
    count = franchisesList.length;

    execute('DELETE FROM bids;');
    execute('DELETE FROM sales;');
    execute('DELETE FROM squad_members;');
    execute('DELETE FROM purse_transactions;');
    execute('DELETE FROM auction_lots;');
    execute('DELETE FROM referral_tokens;');
    execute('DELETE FROM referrals;');
    execute("DELETE FROM users WHERE role = 'FRANCHISE';");
    execute('DELETE FROM franchises;');

    execute("UPDATE players SET registration_status = 'REGISTERED', referring_franchise_id = NULL, is_referred = 0, referral_status = 'NONE';");

    const now = Date.now();
    execute(
      `INSERT INTO audit_logs (id, actor, role, action, entity, entity_id, new_state, reason, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `AUDIT_${now}_REMOVE_ALL_FRANCHISES`,
        actorUsername,
        'ADMIN',
        'REMOVE_ALL_FRANCHISES',
        'FRANCHISES',
        'ALL',
        JSON.stringify({ deletedCount: count }),
        `Admin permanently removed all ${count} franchises from the system`,
        now,
      ]
    );
  });
  removeAllFranchisesFromCloudSql().catch(() => {});
  return { count };
}

function createCrispAvatar(text: string, bgColor: string, textColor: string = '#FFFFFF'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="24" fill="${bgColor}"/><text x="60" y="68" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="40" font-weight="900" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function seedDefaultAvanthiData(
  dbInstance?: Database,
  force: boolean = false
): Promise<{ franchisesCount: number; playersCount: number }> {
  const targetDb = dbInstance || db;
  if (!targetDb) return { franchisesCount: 0, playersCount: 0 };

  const editionId = 'ED_ACC_2026';
  const now = Date.now();

  const auditF = targetDb.exec("SELECT COUNT(*) as count FROM audit_logs WHERE action = 'REMOVE_ALL_FRANCHISES'");
  const hasRemovedFranchises = auditF.length > 0 && auditF[0].values.length > 0 && ((auditF[0].values[0][0] as number) > 0);

  const fRes = targetDb.exec("SELECT COUNT(*) as count FROM franchises WHERE edition_id = 'ED_ACC_2026'");
  const fCount = fRes.length > 0 && fRes[0].values.length > 0 ? (fRes[0].values[0][0] as number) : 0;

  let seededFranchises = 0;

  if (!hasRemovedFranchises && (fCount === 0 || force)) {
    if (force) {
      targetDb.run("DELETE FROM franchises WHERE edition_id = 'ED_ACC_2026'");
      targetDb.run("DELETE FROM users WHERE role = 'FRANCHISE'");
    }

    const defaultFranchises = [
      {
        id: 'FR_ASK', code: 'ASK', name: 'Avanthi Super Kings', dept: 'CSE', branch: 'CSE',
        cap: 'Rohit Sharma', vc: 'K. L. Rahul',
        fac: 'Dr. K. Rama Rao', facMobile: '9848011221', color: '#EAB308',
        capSpecialty: 'Pure Opening Batter',
        capBat: 'Right Hand Bat', capBowl: 'Right-arm Off-Spin',
        capStats: { matches: 28, runs: 1140, wickets: 6, highestScore: '108*', battingAverage: '45.6', strikeRate: '148.5', economy: '7.8' }
      },
      {
        id: 'FR_ARC', code: 'ARC', name: 'Avanthi Royal Challengers', dept: 'ECE', branch: 'ECE',
        cap: 'Virat Kohli', vc: 'Devdutt P.',
        fac: 'Dr. S. V. V. Satyanarayana', facMobile: '9848011222', color: '#EF4444',
        capSpecialty: 'Aggressive Top-Order Anchor',
        capBat: 'Right Hand Bat', capBowl: 'Right-arm Medium',
        capStats: { matches: 32, runs: 1420, wickets: 8, highestScore: '118*', battingAverage: '52.5', strikeRate: '142.0', economy: '8.1' }
      },
      {
        id: 'FR_AT', code: 'AT', name: 'Avanthi Titans', dept: 'MECH', branch: 'MECH',
        cap: 'Hardik Pandya', vc: 'Shubman Gill',
        fac: 'Dr. R. G. Reddy', facMobile: '9848011223', color: '#06B6D4',
        capSpecialty: 'Fast-Bowling All-Rounder',
        capBat: 'Right Hand Bat', capBowl: 'Right-arm Fast Medium',
        capStats: { matches: 26, runs: 780, wickets: 34, highestScore: '86*', battingAverage: '39.0', strikeRate: '168.2', economy: '6.9' }
      },
      {
        id: 'FR_ASR', code: 'ASR', name: 'Avanthi Sunrisers', dept: 'CIVIL', branch: 'CIVIL',
        cap: 'Pat Cummins', vc: 'Bhuvneshwar K.',
        fac: 'Dr. M. Prasad', facMobile: '9848011224', color: '#F97316',
        capSpecialty: 'Express Strike Bowler',
        capBat: 'Right Hand Bat', capBowl: 'Right-arm Fast',
        capStats: { matches: 24, runs: 390, wickets: 42, highestScore: '56*', battingAverage: '24.3', strikeRate: '172.5', economy: '6.4' }
      },
      {
        id: 'FR_AKR', code: 'AKR', name: 'Avanthi Knight Riders', dept: 'CSM (AI & ML)', branch: 'CSM',
        cap: 'Shreyas Iyer', vc: 'Rinku Singh',
        fac: 'Dr. P. Naidu', facMobile: '9848011225', color: '#8B5CF6',
        capSpecialty: 'Middle-Order Batter',
        capBat: 'Right Hand Bat', capBowl: 'Right-arm Leg-Spin',
        capStats: { matches: 25, runs: 890, wickets: 4, highestScore: '94', battingAverage: '42.3', strikeRate: '138.8', economy: '7.9' }
      },
      {
        id: 'FR_ADC', code: 'ADC', name: 'Avanthi Delhi Capitals', dept: 'EEE', branch: 'EEE',
        cap: 'Rishabh Pant', vc: 'Axar Patel',
        fac: 'Dr. B. Suresh', facMobile: '9848011226', color: '#3B82F6',
        capSpecialty: 'Wicket-Keeper Finisher',
        capBat: 'Left Hand Bat', capBowl: 'None',
        capStats: { matches: 27, runs: 980, wickets: 0, highestScore: '102*', battingAverage: '40.8', strikeRate: '162.4', economy: '0.0' }
      },
      {
        id: 'FR_AGG', code: 'AGG', name: 'Avanthi Gujarat Giants', dept: 'CSD (Data Science)', branch: 'CSD',
        cap: 'Sai Sudharsan', vc: 'Rashid Khan',
        fac: 'Dr. V. Babu', facMobile: '9848011227', color: '#EC4899',
        capSpecialty: 'Classical Top-Order Batter',
        capBat: 'Left Hand Bat', capBowl: 'Right-arm Leg-Spin',
        capStats: { matches: 22, runs: 840, wickets: 3, highestScore: '96', battingAverage: '46.6', strikeRate: '136.2', economy: '7.2' }
      },
      {
        id: 'FR_ALSG', code: 'ALSG', name: 'Avanthi Lucknow Super Giants', dept: 'IT', branch: 'IT',
        cap: 'Nicholas Pooran', vc: 'Ayush Badoni',
        fac: 'Dr. T. Kiran', facMobile: '9848011228', color: '#14B8A6',
        capSpecialty: 'Explosive Wicket-Keeper Finisher',
        capBat: 'Left Hand Bat', capBowl: 'Right-arm Off-Spin',
        capStats: { matches: 23, runs: 790, wickets: 2, highestScore: '89*', battingAverage: '41.5', strikeRate: '175.6', economy: '8.4' }
      },
      {
        id: 'FR_APK', code: 'APK', name: 'Avanthi Punjab Kings', dept: 'Diploma', branch: 'Diploma',
        cap: 'Shikhar Dhawan', vc: 'Jitesh Sharma',
        fac: 'Prof. N. Murthy', facMobile: '9848011229', color: '#DC2626',
        capSpecialty: 'Opening Stroke-Maker',
        capBat: 'Left Hand Bat', capBowl: 'Right-arm Off-Spin',
        capStats: { matches: 30, runs: 1220, wickets: 0, highestScore: '106*', battingAverage: '43.5', strikeRate: '135.0', economy: '0.0' }
      },
      {
        id: 'FR_ARR', code: 'ARR', name: 'Avanthi Rajasthan Royals', dept: 'Pharmacy', branch: 'Pharmacy',
        cap: 'Sanju Samson', vc: 'Yashasvi J.',
        fac: 'Dr. J. Lakshmi', facMobile: '9848011230', color: '#D946EF',
        capSpecialty: 'Wicket-Keeper Batter',
        capBat: 'Right Hand Bat', capBowl: 'None',
        capStats: { matches: 28, runs: 1050, wickets: 0, highestScore: '112', battingAverage: '40.3', strikeRate: '155.8', economy: '0.0' }
      },
      {
        id: 'FR_AW', code: 'AW', name: 'Avanthi Warriors', dept: 'MBA & MCA', branch: 'Management',
        cap: 'Suresh Raina', vc: 'Ravindra Jadeja',
        fac: 'Dr. A. Srinivas', facMobile: '9848011231', color: '#10B981',
        capSpecialty: 'All-Rounder',
        capBat: 'Left Hand Bat', capBowl: 'Right-arm Off-Spin',
        capStats: { matches: 35, runs: 1380, wickets: 22, highestScore: '100*', battingAverage: '44.5', strikeRate: '144.2', economy: '6.7' }
      },
    ];

    const defaultFranchiseHash = await bcrypt.hash('Avanthi@123', 10);

    for (const f of defaultFranchises) {
      const logo = createCrispAvatar(f.code, f.color);
      const capStatsJson = JSON.stringify(f.capStats);
      targetDb.run(
        `INSERT INTO franchises (
          id, edition_id, name, logo_url, department, faculty_coordinator, faculty_branch, faculty_mobile,
          captain_name, vice_captain_name, captain_skill, captain_specialty, captain_batting_style, captain_bowling_style, captain_stats_json,
          matches_played, matches_won, matches_lost, titles_won, win_percentage,
          purse, active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          f.id, editionId, f.name, logo, f.dept, f.fac, f.branch, f.facMobile,
          f.cap, f.vc, 'All-Rounder', f.capSpecialty, f.capBat, f.capBowl, capStatsJson,
          12, 8, 4, 1, '67%',
          1000, 1, now
        ]
      );

      const username = f.code.toLowerCase();
      targetDb.run(
        `INSERT INTO users (id, username, email, password_hash, role, franchise_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`USER_${f.id}`, username, `${username}@avanthi.edu.in`, defaultFranchiseHash, 'FRANCHISE', f.id, now]
      );

      saveUserToCloudSql({
        id: `USER_${f.id}`,
        username,
        email: `${username}@avanthi.edu.in`,
        password_hash: defaultFranchiseHash,
        role: 'FRANCHISE',
        franchise_id: f.id,
        created_at: now,
      }).catch(() => {});

      saveFranchiseToCloudSql({
        id: f.id,
        edition_id: editionId,
        name: f.name,
        logo_url: logo,
        department: f.dept,
        faculty_coordinator: f.fac,
        faculty_branch: f.branch,
        faculty_mobile: f.facMobile,
        captain_name: f.cap,
        vice_captain_name: f.vc,
        captain_specialty: f.capSpecialty,
        captain_batting_style: f.capBat,
        captain_bowling_style: f.capBowl,
        captain_stats_json: capStatsJson,
        purse: 1000,
        active: 1,
      }).catch(() => {});

      seededFranchises++;
    }
  }

  saveDatabaseToDisk();
  return { franchisesCount: seededFranchises, playersCount: 0 };
}
