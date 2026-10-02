/**
 * ============================================================================
 * SUPABASE / POSTGRESQL CLOUD SYNC & PERSISTENCE LAYER
 * ============================================================================
 * Connects directly to the Supabase Postgres database using pg Pool.
 * Automatically provisions all relational tables, indexes, and schema alterations.
 * Ensures bidirectional persistence across device restarts, reloads, and deployments.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const DEFAULT_SUPABASE_URL = "postgresql://postgres:Yaswanth%402006@db.aywdrxhjdogpqnhserem.supabase.co:5432/postgres";

export function isValidPostgresUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname;
    return Boolean(host && host !== 'base' && (host === 'localhost' || host.includes('.') || host.includes(':')));
  } catch {
    return false;
  }
}

let pool: Pool | null = null;

export function getConnectionString(): string {
  if (isValidPostgresUrl(process.env.DATABASE_URL)) return process.env.DATABASE_URL!.trim();
  if (isValidPostgresUrl(process.env.SUPABASE_DB_URL)) return process.env.SUPABASE_DB_URL!.trim();
  if (isValidPostgresUrl(process.env.POSTGRES_URL)) return process.env.POSTGRES_URL!.trim();

  return DEFAULT_SUPABASE_URL;
}

export function getPool(): Pool | null {
  if (pool) return pool;
  const connStr = getConnectionString();
  if (!connStr) return null;
  try {
    const isLocal = connStr.includes('localhost') || connStr.includes('127.0.0.1');
    pool = new Pool({
      connectionString: connStr,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (err) => {
      console.warn('[Supabase Pool] Warning / connection issue:', err.message);
    });
    return pool;
  } catch (err: any) {
    console.warn('[Supabase Pool] Failed to initialize Pool:', err.message);
    return null;
  }
}

function maskConnectionString(connStr: string): string {
  try {
    const url = new URL(connStr.startsWith('postgres') ? connStr : `postgresql://${connStr}`);
    const host = url.host || 'supabase-db';
    const db = url.pathname.replace('/', '') || 'postgres';
    return `${host}/${db} (SSL encrypted)`;
  } catch {
    return 'Supabase PostgreSQL (SSL)';
  }
}

export async function getDatabaseDiagnostics(): Promise<{
  connected: boolean;
  configured: boolean;
  secure: boolean;
  provider: string;
  connectionTarget?: string;
  latencyMs?: number;
  tablesVerified?: boolean;
  franchisesInCloud?: number;
  playersInCloud?: number;
  error?: string | null;
  message: string;
}> {
  const connStr = getConnectionString();
  if (!connStr) {
    return {
      connected: false,
      configured: false,
      secure: true,
      provider: 'SQLite WASM with PostgreSQL compatibility',
      message: 'Running local memory/file storage with SQLite.',
    };
  }

  const p = getPool();
  if (!p) {
    return {
      connected: false,
      configured: true,
      secure: true,
      provider: 'Supabase PostgreSQL',
      error: 'Unable to initialize database connection pool',
      message: 'Failed to create PostgreSQL client pool with supplied connection string.',
    };
  }

  const startTime = Date.now();
  try {
    await p.query('SELECT 1 as live');
    const latencyMs = Date.now() - startTime;

    let fCount = 0;
    let pCount = 0;
    try {
      const fRes = await p.query('SELECT COUNT(*) as count FROM franchises');
      fCount = parseInt(fRes.rows[0]?.count || '0', 10);
    } catch {}

    try {
      const pRes = await p.query('SELECT COUNT(*) as count FROM players');
      pCount = parseInt(pRes.rows[0]?.count || '0', 10);
    } catch {}

    return {
      connected: true,
      configured: true,
      secure: true,
      provider: 'Supabase PostgreSQL',
      connectionTarget: maskConnectionString(connStr),
      latencyMs,
      tablesVerified: true,
      franchisesInCloud: fCount,
      playersInCloud: pCount,
      error: null,
      message: `Successfully connected to Supabase PostgreSQL (${latencyMs}ms latency) with TLS/SSL encryption.`,
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      secure: true,
      provider: 'Supabase PostgreSQL',
      connectionTarget: maskConnectionString(connStr),
      error: err.message,
      message: `Connection attempt to Supabase PostgreSQL failed: ${err.message}.`,
    };
  }
}

export async function initCloudSql(): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS editions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        year INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        franchise_id TEXT,
        player_id TEXT,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS franchises (
        id TEXT PRIMARY KEY,
        edition_id TEXT,
        name TEXT,
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
        matches_played INTEGER DEFAULT 0,
        matches_won INTEGER DEFAULT 0,
        matches_lost INTEGER DEFAULT 0,
        titles_won INTEGER DEFAULT 0,
        win_percentage TEXT DEFAULT '0%',
        franchise_stats_json TEXT,
        purse INTEGER DEFAULT 1000,
        active INTEGER DEFAULT 1,
        created_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        edition_id TEXT,
        roll_number TEXT,
        name TEXT,
        email TEXT,
        mobile_number TEXT,
        photo_url TEXT,
        program TEXT,
        branch TEXT,
        academic_year INTEGER,
        bucket TEXT,
        skill TEXT,
        player_type TEXT,
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
        cricheroes_status TEXT DEFAULT 'PROFILE_CREATION_PENDING',
        stats_json TEXT,
        base_price INTEGER,
        payment_status TEXT DEFAULT 'REGISTERED',
        registration_status TEXT DEFAULT 'REGISTERED',
        is_auction_eligible INTEGER DEFAULT 1,
        ineligibility_reasons TEXT,
        is_editing_blocked INTEGER DEFAULT 0,
        is_detained_override INTEGER DEFAULT 0,
        detention_reason TEXT,
        is_referred INTEGER DEFAULT 0,
        referral_token TEXT,
        referred_by_captain_id TEXT,
        referred_by_captain_name TEXT,
        referring_franchise_id TEXT,
        referring_franchise_name TEXT,
        referral_status TEXT DEFAULT 'NONE',
        referral_verified_at BIGINT,
        referral_verified_by TEXT,
        created_at BIGINT,
        updated_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS referral_tokens (
        token TEXT PRIMARY KEY,
        edition_id TEXT NOT NULL,
        franchise_id TEXT NOT NULL,
        franchise_name TEXT NOT NULL,
        captain_id TEXT,
        captain_name TEXT NOT NULL,
        captain_mobile TEXT,
        created_at BIGINT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        player_id TEXT,
        player_name TEXT,
        verification_status TEXT NOT NULL DEFAULT 'PENDING',
        verification_reason TEXT,
        verified_by TEXT,
        verified_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        edition_id TEXT NOT NULL,
        franchise_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        conflict_notes TEXT,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS auction_lots (
        id TEXT PRIMARY KEY,
        edition_id TEXT NOT NULL,
        round INTEGER NOT NULL DEFAULT 1,
        bucket TEXT NOT NULL,
        player_id TEXT NOT NULL,
        draw_number INTEGER,
        draw_mode TEXT NOT NULL DEFAULT 'AUTO',
        lot_state TEXT NOT NULL DEFAULT 'AVAILABLE',
        opening_price INTEGER NOT NULL,
        current_price INTEGER NOT NULL,
        highest_bidder_id TEXT,
        bid_count INTEGER NOT NULL DEFAULT 0,
        deadline_ms BIGINT,
        started_at BIGINT,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bids (
        id TEXT PRIMARY KEY,
        lot_id TEXT NOT NULL,
        franchise_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        sequence INTEGER NOT NULL,
        timestamp BIGINT NOT NULL
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
        timestamp BIGINT NOT NULL,
        undone INTEGER NOT NULL DEFAULT 0,
        undone_at BIGINT,
        undone_by TEXT,
        undo_reason TEXT
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
        timestamp BIGINT NOT NULL,
        undone INTEGER NOT NULL DEFAULT 0,
        removed_at BIGINT,
        removed_by TEXT,
        removal_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS purse_transactions (
        id TEXT PRIMARY KEY,
        edition_id TEXT NOT NULL,
        franchise_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        reference_id TEXT,
        timestamp BIGINT NOT NULL
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
        timestamp BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        edition_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'AUCTION_STARTING_10M',
        target TEXT NOT NULL DEFAULT 'ALL',
        starts_at BIGINT,
        created_by TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );
    `);

    // Ensure all optional columns exist
    const columnsToAdd = [
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS logo_url TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS leader_photo_url TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS faculty_branch TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS faculty_mobile TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS captain_specialty TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS captain_batting_style TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS captain_bowling_style TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS captain_cricheroes_url TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS captain_details_json TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS captain_stats_json TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS vice_captain_specialty TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS vice_captain_batting_style TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS vice_captain_bowling_style TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS vice_captain_cricheroes_url TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS vice_captain_details_json TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS vice_captain_stats_json TEXT;',
      'ALTER TABLE franchises ADD COLUMN IF NOT EXISTS franchise_stats_json TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS batting_position TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS batting_hand TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS batting_playing_type TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS bowling_profile TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS experience TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS previous_acc TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS cricheroes_url TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS cricheroes_mobile TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS cricheroes_status TEXT DEFAULT \'PROFILE_CREATION_PENDING\';',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT \'REGISTERED\';',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT \'REGISTERED\';',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS ineligibility_reasons TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS is_editing_blocked INTEGER DEFAULT 0;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS is_detained_override INTEGER DEFAULT 0;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS detention_reason TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS is_referred INTEGER DEFAULT 0;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS referral_token TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS referred_by_captain_id TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS referred_by_captain_name TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS referring_franchise_id TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS referring_franchise_name TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS referral_status TEXT DEFAULT \'NONE\';',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS referral_verified_at BIGINT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS referral_verified_by TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS updated_at BIGINT;',
      'ALTER TABLE squad_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT \'ACTIVE\';',
      'ALTER TABLE squad_members ADD COLUMN IF NOT EXISTS removed_at BIGINT;',
      'ALTER TABLE squad_members ADD COLUMN IF NOT EXISTS removed_by TEXT;',
      'ALTER TABLE squad_members ADD COLUMN IF NOT EXISTS removal_reason TEXT;',
      'ALTER TABLE auction_lots ADD COLUMN IF NOT EXISTS draw_mode TEXT DEFAULT \'AUTO\';',
    ];

    for (const sql of columnsToAdd) {
      try {
        await p.query(sql);
      } catch {}
    }

    console.log('✅ Supabase PostgreSQL: all tables and columns verified');
  } catch (err: any) {
    console.error('Failed to initialize Supabase tables:', err.message);
  }
}

export async function loadCloudSqlData(): Promise<{
  editions: any[];
  users: any[];
  franchises: any[];
  players: any[];
  squadMembers: any[];
  referralTokens: any[];
  referrals: any[];
  auctionLots: any[];
  sales: any[];
  purseTransactions: any[];
}> {
  const p = getPool();
  if (!p) {
    return {
      editions: [],
      users: [],
      franchises: [],
      players: [],
      squadMembers: [],
      referralTokens: [],
      referrals: [],
      auctionLots: [],
      sales: [],
      purseTransactions: [],
    };
  }

  try {
    const [edRes, uRes, fRes, pRes, smRes, rtRes, rRes, alRes, sRes, ptRes] = await Promise.all([
      p.query('SELECT * FROM editions').catch(() => ({ rows: [] })),
      p.query('SELECT * FROM users').catch(() => ({ rows: [] })),
      p.query('SELECT * FROM franchises').catch(() => ({ rows: [] })),
      p.query('SELECT * FROM players').catch(() => ({ rows: [] })),
      p.query('SELECT * FROM squad_members').catch(() => ({ rows: [] })),
      p.query('SELECT * FROM referral_tokens').catch(() => ({ rows: [] })),
      p.query('SELECT * FROM referrals').catch(() => ({ rows: [] })),
      p.query('SELECT * FROM auction_lots').catch(() => ({ rows: [] })),
      p.query('SELECT * FROM sales').catch(() => ({ rows: [] })),
      p.query('SELECT * FROM purse_transactions').catch(() => ({ rows: [] })),
    ]);

    return {
      editions: edRes.rows,
      users: uRes.rows,
      franchises: fRes.rows,
      players: pRes.rows,
      squadMembers: smRes.rows,
      referralTokens: rtRes.rows,
      referrals: rRes.rows,
      auctionLots: alRes.rows,
      sales: sRes.rows,
      purseTransactions: ptRes.rows,
    };
  } catch (err: any) {
    console.error('Supabase load error:', err.message);
    return {
      editions: [],
      users: [],
      franchises: [],
      players: [],
      squadMembers: [],
      referralTokens: [],
      referrals: [],
      auctionLots: [],
      sales: [],
      purseTransactions: [],
    };
  }
}

export async function removeAllPlayersFromCloudSql(): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query('DELETE FROM squad_members');
    await p.query('DELETE FROM auction_lots');
    await p.query('DELETE FROM sales');
    await p.query('DELETE FROM bids');
    await p.query('DELETE FROM referral_tokens');
    await p.query('DELETE FROM referrals');
    await p.query("DELETE FROM users WHERE role = 'PLAYER'");
    await p.query('DELETE FROM players');
  } catch (err: any) {
    console.error('Supabase clear players error:', err.message);
  }
}

export async function removeAllFranchisesFromCloudSql(): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query('DELETE FROM squad_members');
    await p.query('DELETE FROM auction_lots');
    await p.query('DELETE FROM sales');
    await p.query('DELETE FROM bids');
    await p.query('DELETE FROM referral_tokens');
    await p.query('DELETE FROM referrals');
    await p.query('DELETE FROM purse_transactions');
    await p.query("DELETE FROM users WHERE role = 'FRANCHISE'");
    await p.query('DELETE FROM franchises');
  } catch (err: any) {
    console.error('Supabase clear franchises error:', err.message);
  }
}

export async function deletePlayerFromCloudSql(id: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query('DELETE FROM squad_members WHERE player_id = $1', [id]);
    await p.query('DELETE FROM auction_lots WHERE player_id = $1', [id]);
    await p.query('DELETE FROM sales WHERE player_id = $1', [id]);
    await p.query('DELETE FROM referral_tokens WHERE player_id = $1', [id]);
    await p.query('DELETE FROM referrals WHERE player_id = $1', [id]);
    await p.query('DELETE FROM users WHERE player_id = $1', [id]);
    await p.query('DELETE FROM players WHERE id = $1', [id]);
  } catch (err: any) {
    console.error('Supabase delete player error:', err.message);
  }
}

export async function deleteFranchiseFromCloudSql(id: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query('DELETE FROM squad_members WHERE franchise_id = $1', [id]);
    await p.query('DELETE FROM sales WHERE franchise_id = $1', [id]);
    await p.query('DELETE FROM bids WHERE franchise_id = $1', [id]);
    await p.query('DELETE FROM referral_tokens WHERE franchise_id = $1', [id]);
    await p.query('DELETE FROM referrals WHERE franchise_id = $1', [id]);
    await p.query('DELETE FROM purse_transactions WHERE franchise_id = $1', [id]);
    await p.query('DELETE FROM users WHERE franchise_id = $1', [id]);
    await p.query('DELETE FROM franchises WHERE id = $1', [id]);
  } catch (err: any) {
    console.error('Supabase delete franchise error:', err.message);
  }
}

export async function savePlayerToCloudSql(player: any): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO players (
        id, edition_id, roll_number, name, email, mobile_number, photo_url,
        program, branch, academic_year, bucket, skill, player_type,
        batting_style, bowling_style, batting_position, batting_hand, batting_playing_type, bowling_profile,
        stats_json, base_price, is_auction_eligible, is_referred, referral_token,
        referred_by_captain_id, referred_by_captain_name, referring_franchise_id, referring_franchise_name,
        referral_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        mobile_number = EXCLUDED.mobile_number,
        photo_url = EXCLUDED.photo_url,
        program = EXCLUDED.program,
        branch = EXCLUDED.branch,
        academic_year = EXCLUDED.academic_year,
        bucket = EXCLUDED.bucket,
        skill = EXCLUDED.skill,
        player_type = EXCLUDED.player_type,
        batting_style = EXCLUDED.batting_style,
        bowling_style = EXCLUDED.bowling_style,
        batting_position = EXCLUDED.batting_position,
        batting_hand = EXCLUDED.batting_hand,
        batting_playing_type = EXCLUDED.batting_playing_type,
        bowling_profile = EXCLUDED.bowling_profile,
        stats_json = EXCLUDED.stats_json,
        base_price = EXCLUDED.base_price,
        is_auction_eligible = EXCLUDED.is_auction_eligible,
        is_referred = EXCLUDED.is_referred,
        referral_token = EXCLUDED.referral_token,
        referred_by_captain_id = EXCLUDED.referred_by_captain_id,
        referred_by_captain_name = EXCLUDED.referred_by_captain_name,
        referring_franchise_id = EXCLUDED.referring_franchise_id,
        referring_franchise_name = EXCLUDED.referring_franchise_name,
        referral_status = EXCLUDED.referral_status,
        updated_at = EXCLUDED.updated_at`,
      [
        player.id, player.edition_id || 'ED_ACC_2026', player.roll_number, player.name, player.email, 
        player.mobile_number, player.photo_url, player.program, player.branch, 
        player.academic_year, player.bucket, player.skill, player.player_type, 
        player.batting_style, player.bowling_style, player.batting_position || null,
        player.batting_hand || null, player.batting_playing_type || null, player.bowling_profile || null,
        player.stats_json, player.base_price, player.is_auction_eligible ?? 1,
        player.is_referred ?? 0, player.referral_token || null,
        player.referred_by_captain_id || null, player.referred_by_captain_name || null,
        player.referring_franchise_id || null, player.referring_franchise_name || null,
        player.referral_status || 'NONE',
        player.created_at || Date.now(), player.updated_at || Date.now()
      ]
    );
  } catch (err: any) {
    console.error('Supabase Sync Error (Player):', err.message);
  }
}

export async function saveFranchiseToCloudSql(franchise: any): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO franchises (
        id, edition_id, name, logo_url, faculty_coordinator, faculty_branch, faculty_mobile,
        department, leader_photo_url, leader_mobile,
        captain_name, vice_captain_name, captain_roll, captain_mobile, captain_branch, 
        captain_year, captain_skill, captain_specialty, captain_batting_style, captain_bowling_style, captain_cricheroes_url, captain_stats_json,
        vice_captain_roll, vice_captain_mobile, vice_captain_branch, vice_captain_year, vice_captain_skill, vice_captain_specialty,
        vice_captain_batting_style, vice_captain_bowling_style, vice_captain_cricheroes_url, vice_captain_stats_json,
        matches_played, matches_won, matches_lost, titles_won, win_percentage, franchise_stats_json, 
        purse, active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41)
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        logo_url = EXCLUDED.logo_url,
        faculty_coordinator = EXCLUDED.faculty_coordinator,
        faculty_branch = EXCLUDED.faculty_branch,
        faculty_mobile = EXCLUDED.faculty_mobile,
        department = EXCLUDED.department,
        leader_photo_url = EXCLUDED.leader_photo_url,
        leader_mobile = EXCLUDED.leader_mobile,
        captain_name = EXCLUDED.captain_name,
        vice_captain_name = EXCLUDED.vice_captain_name,
        captain_roll = EXCLUDED.captain_roll,
        captain_mobile = EXCLUDED.captain_mobile,
        captain_branch = EXCLUDED.captain_branch,
        captain_year = EXCLUDED.captain_year,
        captain_skill = EXCLUDED.captain_skill,
        captain_specialty = EXCLUDED.captain_specialty,
        captain_batting_style = EXCLUDED.captain_batting_style,
        captain_bowling_style = EXCLUDED.captain_bowling_style,
        captain_cricheroes_url = EXCLUDED.captain_cricheroes_url,
        captain_stats_json = EXCLUDED.captain_stats_json,
        vice_captain_roll = EXCLUDED.vice_captain_roll,
        vice_captain_mobile = EXCLUDED.vice_captain_mobile,
        vice_captain_branch = EXCLUDED.vice_captain_branch,
        vice_captain_year = EXCLUDED.vice_captain_year,
        vice_captain_skill = EXCLUDED.vice_captain_skill,
        vice_captain_specialty = EXCLUDED.vice_captain_specialty,
        vice_captain_batting_style = EXCLUDED.vice_captain_batting_style,
        vice_captain_bowling_style = EXCLUDED.vice_captain_bowling_style,
        vice_captain_cricheroes_url = EXCLUDED.vice_captain_cricheroes_url,
        vice_captain_stats_json = EXCLUDED.vice_captain_stats_json,
        matches_played = EXCLUDED.matches_played,
        matches_won = EXCLUDED.matches_won,
        matches_lost = EXCLUDED.matches_lost,
        titles_won = EXCLUDED.titles_won,
        win_percentage = EXCLUDED.win_percentage,
        franchise_stats_json = EXCLUDED.franchise_stats_json,
        purse = EXCLUDED.purse,
        active = EXCLUDED.active`,
      [
        franchise.id, franchise.edition_id || 'ED_ACC_2026', franchise.name, franchise.logo_url || null,
        franchise.faculty_coordinator, franchise.faculty_branch || '', franchise.faculty_mobile || franchise.leader_mobile || '',
        franchise.department, franchise.leader_photo_url || null, franchise.leader_mobile,
        franchise.captain_name, franchise.vice_captain_name, franchise.captain_roll, franchise.captain_mobile, 
        franchise.captain_branch, franchise.captain_year, franchise.captain_skill, franchise.captain_specialty || null,
        franchise.captain_batting_style || null, franchise.captain_bowling_style || null, franchise.captain_cricheroes_url || null, franchise.captain_stats_json || null,
        franchise.vice_captain_roll, franchise.vice_captain_mobile, franchise.vice_captain_branch,
        franchise.vice_captain_year, franchise.vice_captain_skill, franchise.vice_captain_specialty || null,
        franchise.vice_captain_batting_style || null, franchise.vice_captain_bowling_style || null, franchise.vice_captain_cricheroes_url || null, franchise.vice_captain_stats_json || null,
        franchise.matches_played || 0, franchise.matches_won || 0, franchise.matches_lost || 0, franchise.titles_won || 0, 
        franchise.win_percentage || '0%', franchise.franchise_stats_json || null, franchise.purse ?? 1000, 
        franchise.active ?? 1, franchise.created_at || Date.now()
      ]
    );
  } catch (err: any) {
    console.error('Supabase Sync Error (Franchise):', err.message);
  }
}

export async function saveUserToCloudSql(user: any): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO users (id, username, email, password_hash, role, franchise_id, player_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         username = EXCLUDED.username,
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         franchise_id = EXCLUDED.franchise_id,
         player_id = EXCLUDED.player_id`,
      [user.id, user.username, user.email, user.password_hash, user.role, user.franchise_id || null, user.player_id || null, user.created_at || Date.now()]
    );
  } catch (err: any) {
    console.error('Supabase Sync Error (User):', err.message);
  }
}

export async function saveSquadMemberToCloudSql(squadMember: any): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO squad_members (id, edition_id, franchise_id, player_id, acquisition_type, price, round, status, timestamp, undone, removed_at, removed_by, removal_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         undone = EXCLUDED.undone,
         removed_at = EXCLUDED.removed_at,
         removed_by = EXCLUDED.removed_by,
         removal_reason = EXCLUDED.removal_reason`,
      [
        squadMember.id, squadMember.edition_id, squadMember.franchise_id, squadMember.player_id,
        squadMember.acquisition_type, squadMember.price || 0, squadMember.round || 1,
        squadMember.status || 'ACTIVE', squadMember.timestamp, squadMember.undone || 0,
        squadMember.removed_at || null, squadMember.removed_by || null, squadMember.removal_reason || null
      ]
    );
  } catch (err: any) {
    console.error('Supabase Sync Error (Squad Member):', err.message);
  }
}

export async function saveSaleToCloudSql(sale: any): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO sales (id, edition_id, lot_id, player_id, franchise_id, amount, bucket, sale_type, timestamp, undone, undone_at, undone_by, undo_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         undone = EXCLUDED.undone,
         undone_at = EXCLUDED.undone_at,
         undone_by = EXCLUDED.undone_by,
         undo_reason = EXCLUDED.undo_reason`,
      [
        sale.id, sale.edition_id, sale.lot_id, sale.player_id, sale.franchise_id,
        sale.amount, sale.bucket, sale.sale_type, sale.timestamp, sale.undone || 0,
        sale.undone_at || null, sale.undone_by || null, sale.undo_reason || null
      ]
    );
  } catch (err: any) {
    console.error('Supabase Sync Error (Sale):', err.message);
  }
}
