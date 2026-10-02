/**
 * ============================================================================
 * ACC PLAYER AUCTION PORTAL — FULL-STACK EXPRESS SERVER
 * ============================================================================
 * Runs on Port 3000. Mounts Vite middleware in dev mode.
 * Real SQL Relational Database + Server-Authoritative Live Auction Engine.
 */

import express, { Request, Response } from 'express';
import compression from 'compression';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();
import {
  initDatabase,
  queryAll,
  queryOne,
  execute,
  executeTransaction,
  resetSystemData,
  removeAllPlayers,
  removeAllFranchises,
  deleteSinglePlayer,
  deleteSingleFranchise,
} from './src/server/db';
import { auctionManager } from './src/server/auction-manager';
import { RegistrationPipeline, AuctionPipeline } from './src/engine/acc-combined-engines';
import { runOfficial31Tests } from './src/engine/test-runner';
import {
  savePlayerToCloudSql,
  saveFranchiseToCloudSql,
  saveUserToCloudSql,
  saveSquadMemberToCloudSql,
  getDatabaseDiagnostics,
} from './src/server/cloudsql-sync';
import { formatAcademicCategory } from './src/utils/academicCategories';

const PORT = 3000;
const app = express();

app.use(
  compression({
    threshold: 512,
    filter: (req, res) => {
      if (req.headers.accept === 'text/event-stream' || req.path === '/api/auction/events') {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

function generateFranchisePassword(teamName: string): string {
  const clean = teamName.replace(/[^a-zA-Z]/g, '').slice(0, 5) || 'ACC';
  const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  const randomDigits = Math.floor(100 + Math.random() * 900);
  return `${capitalized}@${randomDigits}`;
}

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    port: PORT,
    timestamp: Date.now(),
    edition: 'Avanthi Cricket Carnival (ACC)',
  });
});

app.get('/api/db/status', async (req: Request, res: Response) => {
  try {
    const diag = await getDatabaseDiagnostics();
    res.json({
      success: true,
      timestamp: Date.now(),
      ...diag,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tests/run', (req: Request, res: Response) => {
  try {
    const results = runOfficial31Tests();
    const passed = results.filter((r) => r.passed).length;
    res.json({
      success: true,
      total: results.length,
      passed,
      failed: results.length - passed,
      allPassed: passed === results.length,
      tests: results,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * AUTHENTICATION ROUTES
 * ============================================================================ */

app.post('/api/auth/register-admin', async (req: Request, res: Response) => {
  try {
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.actorRole;
    const actorId = (req.headers['x-user-id'] as string) || req.body?.actorId;

    const adminCountResult = queryOne("SELECT COUNT(*) as count FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN')");
    const existingAdminCount = adminCountResult?.count || 0;

    if (existingAdminCount > 0) {
      let isAuthorized = actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN';
      if (!isAuthorized && actorId) {
        const actor = queryOne('SELECT role FROM users WHERE id = ?', [actorId]);
        if (actor && (actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN')) {
          isAuthorized = true;
        }
      }
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: 'PERMISSION_DENIED: Only existing administrators can register or provision new admin accounts.',
        });
      }
    }

    const { username, email, password, confirmPassword, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Admin Username and Password are required.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match.',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = (email && email.trim().toLowerCase()) || `${cleanUsername}@avanthi.edu.in`;

    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Admin username must be at least 3 characters.',
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 4 characters long.',
      });
    }

    const existing = queryOne('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Username "${cleanUsername}" is already registered.`,
      });
    }

    const targetRole = role === 'OPERATOR' ? 'OPERATOR' : 'SUPER_ADMIN';
    const passwordHash = await bcrypt.hash(password, 10);
    const id = `USR_ADMIN_${Date.now()}`;
    const now = Date.now();

    execute(
      `INSERT INTO users (id, username, email, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, cleanUsername, cleanEmail, passwordHash, targetRole, now]
    );

    saveUserToCloudSql({
      id,
      username: cleanUsername,
      email: cleanEmail,
      password_hash: passwordHash,
      role: targetRole,
      created_at: now,
    }).catch(() => {});

    execute(
      `INSERT INTO audit_logs (id, actor, role, action, entity, entity_id, new_state, reason, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `AUDIT_${now}_ADMIN_REG`,
        cleanUsername,
        targetRole,
        'REGISTER_ADMIN',
        'USERS',
        id,
        JSON.stringify({ username: cleanUsername, email: cleanEmail, role: targetRole }),
        'Administrator account created through Admin Registration portal',
        now,
      ]
    );

    res.json({
      success: true,
      message: `Admin account '${cleanUsername}' registered successfully! You can now log in.`,
      user: {
        id,
        username: cleanUsername,
        email: cleanEmail,
        role: targetRole,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/admins', (req: Request, res: Response) => {
  try {
    const actorRole = (req.headers['x-user-role'] as string) || (req.query?.role as string);
    if (actorRole !== 'SUPER_ADMIN' && actorRole !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'PERMISSION_DENIED: Administrator access required.' });
    }
    const admins = queryAll("SELECT id, username, email, role, created_at FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'OPERATOR') ORDER BY created_at ASC");
    res.json({ success: true, admins });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username/ID and password required.' });
    }

    const cleanInput = username.trim().toLowerCase();

    const user = queryOne(
      `SELECT * FROM users
       WHERE LOWER(username) = ? OR LOWER(franchise_id) = ?`,
      [cleanInput, cleanInput]
    );

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials. User or Franchise not found.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid credentials. Password incorrect.' });
    }

    if (role === 'ADMIN') {
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'OPERATOR' && user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Account does not have Administrator privileges.' });
      }
    } else if (role && role !== user.role && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: `Account does not have ${role} privileges.` });
    }

    let franchiseDetails = null;
    if (user.franchise_id) {
      franchiseDetails = queryOne('SELECT * FROM franchises WHERE id = ?', [user.franchise_id]);
    }

    let playerDetails = null;
    if (user.player_id) {
      playerDetails = queryOne('SELECT * FROM players WHERE id = ?', [user.player_id]);
    } else if (user.role === 'PLAYER') {
      playerDetails = queryOne('SELECT * FROM players WHERE LOWER(roll_number) = ?', [cleanInput]);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        franchiseId: user.franchise_id,
        playerId: user.player_id,
        franchise: franchiseDetails,
        player: playerDetails,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * FRANCHISE ROUTES (Faculty Coordinator, Captain & Vice Captain Registration)
 * ============================================================================ */

app.get('/api/editions', (req: Request, res: Response) => {
  const editions = queryAll('SELECT * FROM editions ORDER BY year DESC, created_at DESC');
  res.json({ success: true, editions });
});

app.get('/api/franchises', (req: Request, res: Response) => {
  const edition = auctionManager.getActiveEdition();
  const editionId = (req.query.editionId as string) || (edition ? edition.id : '');
  const franchises = auctionManager.getFranchises(editionId);
  res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=20');
  res.json({ success: true, franchises });
});

// CREATE / REGISTER FRANCHISE
// Replaces Captain & Vice-Captain fields with: Name, Mobile, Role, and Stats based on role
app.post('/api/franchises', async (req: Request, res: Response) => {
  try {
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.role || (req.query?.role as string);
    const actorId = (req.headers['x-user-id'] as string) || req.body?.userId;
    const actorUsername = (req.headers['x-user-username'] as string) || req.body?.username || 'Admin';

    let isAuthorizedAdmin = actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN' || actorRole === 'OPERATOR';
    if (!isAuthorizedAdmin && actorId) {
      const user = queryOne('SELECT role, username FROM users WHERE id = ?', [actorId]);
      if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'OPERATOR')) {
        isAuthorizedAdmin = true;
      }
    }

    if (!isAuthorizedAdmin) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED: Only tournament administrators can register franchises, captains, and vice captains.',
      });
    }

    const {
      editionId,
      name,
      logoUrl,
      facultyCoordinator,
      facultyBranch,
      facultyMobile,
      department,
      leaderPhotoUrl,
      leaderMobile,
      customFranchiseId,
      customPassword,
      // Franchise Statistics
      matchesPlayed,
      matchesWon,
      matchesLost,
      titlesWon,
      winPercentage,
      franchiseStats,
      homeGround,
      highestScore,
      lowestDefended,
      totalRuns,
      totalWickets,
      pastRank,
      teamMotto,
      bestSeason,
      // CAPTAIN: Name, Mobile Number, Player Role, and Stats based on role
      captainName,
      captainMobile,
      captainRole,
      captainSkill,
      captainSpecialty,
      captainBattingStyle,
      captainBowlingStyle,
      captainStats,
      // VICE CAPTAIN: Name, Mobile Number, Player Role, and Stats based on role
      viceCaptainName,
      viceCaptainMobile,
      viceCaptainRole,
      viceCaptainSkill,
      viceCaptainSpecialty,
      viceCaptainBattingStyle,
      viceCaptainBowlingStyle,
      viceCaptainStats,
    } = req.body;

    const activeEd = auctionManager.getActiveEdition();
    const effectiveEditionId = editionId || (activeEd ? activeEd.id : 'ED_ACC_2026');

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Franchise name required.' });
    }

    const currentFranchises = queryAll('SELECT id FROM franchises WHERE edition_id = ?', [effectiveEditionId]);
    if (currentFranchises.length >= 11) {
      return res.status(400).json({ success: false, error: 'EXACTLY_11_FRANCHISES: Maximum 11 franchises allowed per edition.' });
    }

    const mPlayed = parseInt(matchesPlayed, 10) || 0;
    const mWon = parseInt(matchesWon, 10) || 0;
    const mLost = parseInt(matchesLost, 10) || Math.max(0, mPlayed - mWon);
    const tWon = parseInt(titlesWon, 10) || 0;
    const computedWinPct = winPercentage || (mPlayed > 0 ? `${Math.round((mWon / mPlayed) * 100)}%` : '0%');

    const resolvedCaptainRole = captainRole || captainSkill || 'All-Rounder';
    const resolvedCaptainSpecialty = captainSpecialty || `${resolvedCaptainRole} Captain`;
    const resolvedViceCaptainRole = viceCaptainRole || viceCaptainSkill || 'All-Rounder';
    const resolvedViceCaptainSpecialty = viceCaptainSpecialty || `${resolvedViceCaptainRole} Vice-Captain`;

    const captainStatsObj = {
      ...(captainStats || {}),
      role: resolvedCaptainRole,
      specialty: resolvedCaptainSpecialty,
      battingStyle: captainBattingStyle || captainStats?.battingStyle || 'Right Hand Bat',
      bowlingStyle: captainBowlingStyle || captainStats?.bowlingStyle || 'None',
      mobile: captainMobile || '',
    };
    const captainStatsJson = JSON.stringify(captainStatsObj);

    const viceCaptainStatsObj = {
      ...(viceCaptainStats || {}),
      role: resolvedViceCaptainRole,
      specialty: resolvedViceCaptainSpecialty,
      battingStyle: viceCaptainBattingStyle || viceCaptainStats?.battingStyle || 'Right Hand Bat',
      bowlingStyle: viceCaptainBowlingStyle || viceCaptainStats?.bowlingStyle || 'None',
      mobile: viceCaptainMobile || '',
    };
    const viceCaptainStatsJson = JSON.stringify(viceCaptainStatsObj);

    const resolvedFacultyBranch = facultyBranch || department || 'General';
    const resolvedFacultyMobile = facultyMobile || leaderMobile || '';

    const fullFranchiseStats = {
      ...(franchiseStats || {}),
      matchesPlayed: mPlayed,
      matchesWon: mWon,
      matchesLost: mLost,
      titlesWon: tWon,
      winPercentage: computedWinPct,
      homeGround: homeGround || franchiseStats?.homeGround || 'Avanthi Cricket Arena',
      highestScore: highestScore || franchiseStats?.highestScore || '-',
      lowestDefended: lowestDefended || franchiseStats?.lowestDefended || '-',
      totalRuns: totalRuns !== undefined ? Number(totalRuns) : (franchiseStats?.totalRuns || 0),
      totalWickets: totalWickets !== undefined ? Number(totalWickets) : (franchiseStats?.totalWickets || 0),
      bestSeason: bestSeason || franchiseStats?.bestSeason || '2025/2026',
      pastRank: pastRank || franchiseStats?.pastRank || 'Contender',
      teamMotto: teamMotto || franchiseStats?.teamMotto || '',
      captainStats: captainStatsObj,
      viceCaptainStats: viceCaptainStatsObj,
    };
    const franchiseStatsJson = JSON.stringify(fullFranchiseStats);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    let franchiseId = customFranchiseId?.trim().toUpperCase() || `FR-${randomSuffix}`;
    while (queryOne('SELECT id FROM franchises WHERE id = ?', [franchiseId])) {
      franchiseId = `FR-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let username = franchiseId.toLowerCase();
    const plainPassword = customPassword?.trim() || generateFranchisePassword(name);
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const now = Date.now();

    executeTransaction(() => {
      execute(
        `INSERT INTO franchises (
          id, edition_id, name, logo_url, faculty_coordinator, faculty_branch, faculty_mobile,
          department, leader_photo_url, leader_mobile,
          captain_name, vice_captain_name,
          captain_mobile, captain_skill, captain_specialty, captain_batting_style, captain_bowling_style, captain_stats_json,
          vice_captain_mobile, vice_captain_skill, vice_captain_specialty, vice_captain_batting_style, vice_captain_bowling_style, vice_captain_stats_json,
          matches_played, matches_won, matches_lost, titles_won, win_percentage, franchise_stats_json,
          purse, active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          franchiseId,
          effectiveEditionId,
          name.trim(),
          logoUrl || '',
          facultyCoordinator || '',
          resolvedFacultyBranch,
          resolvedFacultyMobile,
          department || '',
          leaderPhotoUrl || '',
          resolvedFacultyMobile,
          captainName ? captainName.trim() : null,
          viceCaptainName ? viceCaptainName.trim() : null,
          captainMobile ? captainMobile.trim() : null,
          resolvedCaptainRole,
          resolvedCaptainSpecialty,
          captainBattingStyle || null,
          captainBowlingStyle || null,
          captainStatsJson,
          viceCaptainMobile ? viceCaptainMobile.trim() : null,
          resolvedViceCaptainRole,
          resolvedViceCaptainSpecialty,
          viceCaptainBattingStyle || null,
          viceCaptainBowlingStyle || null,
          viceCaptainStatsJson,
          mPlayed,
          mWon,
          mLost,
          tWon,
          computedWinPct,
          franchiseStatsJson,
          1000,
          1,
          now,
        ]
      );

      execute(
        `INSERT INTO purse_transactions (id, edition_id, franchise_id, amount, balance_after, transaction_type, reference_id, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [`PTX_${now}_INIT`, effectiveEditionId, franchiseId, 1000, 1000, 'INITIAL_PURSE', 'SETUP', now]
      );

      execute(
        `INSERT INTO users (id, username, email, password_hash, role, franchise_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`USR_${franchiseId}`, username, `${username}@avanthi.edu.in`, passwordHash, 'FRANCHISE', franchiseId, now]
      );

      execute(
        `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, reason, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AUDIT_${now}_FRANCHISE_REG`,
          effectiveEditionId,
          actorUsername,
          actorRole || 'ADMIN',
          'REGISTER_FRANCHISE',
          'FRANCHISES',
          franchiseId,
          JSON.stringify({ name, franchiseId, captainName, captainRole: resolvedCaptainRole, viceCaptainName, viceCaptainRole: resolvedViceCaptainRole }),
          `Franchise created with Captain & Vice-Captain details (Name, Mobile, Role, and Stats based on role)`,
          now,
        ]
      );
    });

    saveUserToCloudSql({
      id: `USR_${franchiseId}`,
      username,
      email: `${username}@avanthi.edu.in`,
      password_hash: passwordHash,
      role: 'FRANCHISE',
      franchise_id: franchiseId,
      created_at: now,
    }).catch(() => {});

    saveFranchiseToCloudSql({
      id: franchiseId,
      edition_id: effectiveEditionId,
      name: name.trim(),
      faculty_coordinator: facultyCoordinator || '',
      faculty_branch: resolvedFacultyBranch,
      faculty_mobile: resolvedFacultyMobile,
      department: department || '',
      leader_mobile: resolvedFacultyMobile,
      captain_name: captainName || null,
      vice_captain_name: viceCaptainName || null,
      captain_mobile: captainMobile || null,
      captain_skill: resolvedCaptainRole,
      captain_specialty: resolvedCaptainSpecialty,
      captain_batting_style: captainBattingStyle || null,
      captain_bowling_style: captainBowlingStyle || null,
      captain_stats_json: captainStatsJson,
      vice_captain_mobile: viceCaptainMobile || null,
      vice_captain_skill: resolvedViceCaptainRole,
      vice_captain_specialty: resolvedViceCaptainSpecialty,
      vice_captain_batting_style: viceCaptainBattingStyle || null,
      vice_captain_bowling_style: viceCaptainBowlingStyle || null,
      vice_captain_stats_json: viceCaptainStatsJson,
      matches_played: mPlayed,
      matches_won: mWon,
      matches_lost: mLost,
      titles_won: tWon,
      win_percentage: computedWinPct,
      franchise_stats_json: franchiseStatsJson,
      purse: 1000,
      active: 1,
      created_at: now,
    }).catch(() => {});

    auctionManager.broadcast('STATE_UPDATED', { reason: 'FRANCHISE_CREATED', franchiseId });

    res.json({
      success: true,
      franchiseId,
      credentials: {
        franchiseId,
        username,
        password: plainPassword,
        name: name.trim(),
        department: department || '',
      },
      message: `Franchise '${name}' registered successfully! Captain & Vice-Captain profiles and stats recorded.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN CAPABILITY: REGENERATE BOTH NEW LOGIN ID AND PASSWORD FOR FRANCHISE LEADERS
app.post('/api/franchises/:id/regenerate-credentials', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.actorRole || 'SUPER_ADMIN';

    if (actorRole !== 'SUPER_ADMIN' && actorRole !== 'ADMIN' && actorRole !== 'OPERATOR') {
      return res.status(403).json({ success: false, error: 'PERMISSION_DENIED: Only administrators can regenerate franchise credentials.' });
    }

    const franchise = queryOne('SELECT * FROM franchises WHERE id = ?', [id]);
    if (!franchise) return res.status(404).json({ success: false, error: 'Franchise not found in database.' });

    // Generate new unique Franchise Login ID and strong password
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newUsername = `team_${randomSuffix}`;
    const newPassword = generateFranchisePassword(franchise.name);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = Date.now();

    let user = queryOne('SELECT * FROM users WHERE franchise_id = ?', [id]);

    executeTransaction(() => {
      if (user) {
        execute(
          `UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?`,
          [newUsername, `${newUsername}@avanthi.edu.in`, passwordHash, user.id]
        );
      } else {
        const newUserId = `USR_${id}_${Date.now()}`;
        execute(
          `INSERT INTO users (id, username, email, password_hash, role, franchise_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [newUserId, newUsername, `${newUsername}@avanthi.edu.in`, passwordHash, 'FRANCHISE', id, now]
        );
        user = { id: newUserId, username: newUsername };
      }

      execute(
        `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, reason, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AUDIT_${now}_REGEN_CRED`,
          franchise.edition_id,
          'Admin',
          'SUPER_ADMIN',
          'REGENERATE_FRANCHISE_CREDENTIALS',
          'FRANCHISE',
          id,
          JSON.stringify({ franchiseId: id, newUsername }),
          'Admin regenerated both new login ID and password for franchise leader',
          now,
        ]
      );
    });

    saveUserToCloudSql({
      id: user.id,
      username: newUsername,
      email: `${newUsername}@avanthi.edu.in`,
      password_hash: passwordHash,
      role: 'FRANCHISE',
      franchise_id: id,
    }).catch(() => {});

    res.json({
      success: true,
      credentials: {
        franchiseId: id,
        username: newUsername,
        password: newPassword,
        name: franchise.name,
      },
      message: `New Login ID ('${newUsername}') and Password ('${newPassword}') generated for franchise '${franchise.name}'.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CAPTAIN UPDATES / ENTERS THEIR OWN STATS & PROFILE ("WHAT THEY ARE")
app.put('/api/franchises/:id/captain-stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.actorRole;
    const actorFranchiseId = (req.headers['x-user-franchise-id'] as string) || req.body?.actorFranchiseId;
    const actorUsername = (req.headers['x-user-username'] as string) || req.body?.actor || 'Captain';

    const franchise = queryOne('SELECT * FROM franchises WHERE id = ?', [id]);
    if (!franchise) {
      return res.status(404).json({ success: false, error: 'Franchise not found.' });
    }

    const isAuthorized = actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN' || actorFranchiseId === id || actorRole === 'FRANCHISE';
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'PERMISSION_DENIED: Only the franchise captain or administrator can update captain stats.' });
    }

    const {
      captainName,
      captainRoll,
      captainMobile,
      captainBranch,
      captainYear,
      captainSkill,
      captainSpecialty,
      captainBattingStyle,
      captainBowlingStyle,
      captainCricheroesUrl,
      matches,
      runs,
      wickets,
      battingAverage,
      strikeRate,
      highestScore,
      economy,
      bestBowling,
      centuries,
      fifties,
      bio,
    } = req.body;

    const statsObj = {
      matches: matches !== undefined ? parseInt(matches, 10) : 0,
      runs: runs !== undefined ? parseInt(runs, 10) : 0,
      wickets: wickets !== undefined ? parseInt(wickets, 10) : 0,
      battingAverage: battingAverage || '0.0',
      strikeRate: strikeRate || '0.0',
      highestScore: highestScore || '-',
      economy: economy || '0.0',
      bestBowling: bestBowling || '-',
      centuries: centuries !== undefined ? parseInt(centuries, 10) : 0,
      fifties: fifties !== undefined ? parseInt(fifties, 10) : 0,
      specialty: captainSpecialty || captainSkill || 'Captain',
      bio: bio || '',
      battingStyle: captainBattingStyle || 'Right Hand Bat',
      bowlingStyle: captainBowlingStyle || 'None',
    };
    const captainStatsJson = JSON.stringify(statsObj);
    const now = Date.now();

    executeTransaction(() => {
      execute(
        `UPDATE franchises
         SET captain_name = COALESCE(?, captain_name),
             captain_roll = COALESCE(?, captain_roll),
             captain_mobile = COALESCE(?, captain_mobile),
             captain_branch = COALESCE(?, captain_branch),
             captain_year = COALESCE(?, captain_year),
             captain_skill = COALESCE(?, captain_skill),
             captain_specialty = COALESCE(?, captain_specialty),
             captain_batting_style = COALESCE(?, captain_batting_style),
             captain_bowling_style = COALESCE(?, captain_bowling_style),
             captain_cricheroes_url = COALESCE(?, captain_cricheroes_url),
             captain_stats_json = ?
         WHERE id = ?`,
        [
          captainName ? captainName.trim() : null,
          captainRoll ? captainRoll.trim().toUpperCase() : null,
          captainMobile ? captainMobile.trim() : null,
          captainBranch ? captainBranch.trim() : null,
          captainYear ? captainYear.toString() : null,
          captainSkill ? captainSkill.trim() : null,
          captainSpecialty ? captainSpecialty.trim() : null,
          captainBattingStyle ? captainBattingStyle.trim() : null,
          captainBowlingStyle ? captainBowlingStyle.trim() : null,
          captainCricheroesUrl ? captainCricheroesUrl.trim() : null,
          captainStatsJson,
          id,
        ]
      );

      execute(
        `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, reason, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AUDIT_${now}_CAP_STATS`,
          franchise.edition_id,
          actorUsername,
          'FRANCHISE',
          'UPDATE_CAPTAIN_STATS',
          'FRANCHISE',
          id,
          JSON.stringify({ captainName, captainSpecialty, stats: statsObj }),
          'Captain updated stats and role specialty profile',
          now,
        ]
      );
    });

    saveFranchiseToCloudSql({
      ...franchise,
      captain_name: captainName || franchise.captain_name,
      captain_specialty: captainSpecialty || franchise.captain_specialty,
      captain_stats_json: captainStatsJson,
    }).catch(() => {});

    auctionManager.broadcast('STATE_UPDATED', { reason: 'CAPTAIN_STATS_UPDATED', franchiseId: id });

    res.json({
      success: true,
      message: 'Captain stats and role profile updated successfully and are now visible to everyone!',
      captainStats: statsObj,
      captainSpecialty: captainSpecialty || franchise.captain_specialty,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/franchises/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.role || (req.query?.role as string);
    const actorId = (req.headers['x-user-id'] as string) || req.body?.userId || (req.query?.userId as string);
    const actorUsername = (req.headers['x-user-username'] as string) || req.body?.username || 'Admin';

    let isAuthorizedAdmin = actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN' || actorRole === 'OPERATOR';
    if (!isAuthorizedAdmin && actorId) {
      const user = queryOne('SELECT role, username FROM users WHERE id = ?', [actorId]);
      if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'OPERATOR')) {
        isAuthorizedAdmin = true;
      }
    }

    if (!isAuthorizedAdmin) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED: Only administrators have permission to delete franchises.',
      });
    }

    const franchise = queryOne('SELECT * FROM franchises WHERE id = ?', [id]);
    if (!franchise) {
      return res.status(404).json({ success: false, error: 'Franchise not found in database.' });
    }

    deleteSingleFranchise(id, actorUsername);
    auctionManager.broadcast('STATE_UPDATED', { reason: 'FRANCHISE_DELETED', franchiseId: id });

    res.json({
      success: true,
      message: `Franchise '${franchise.name}' was completely and permanently deleted from the database by Admin.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * PLAYER ROUTES (All Cricket Stats, Dynamic Batting & Bowling Profiles, Referrals)
 * ============================================================================ */

app.get('/api/players', (req: Request, res: Response) => {
  const edition = auctionManager.getActiveEdition();
  const editionId = (req.query.editionId as string) || (edition ? edition.id : 'ED_ACC_2026');
  const players = queryAll(
    `SELECT p.*, f.name as franchise_name, f.logo_url as franchise_logo
     FROM players p
     LEFT JOIN squad_members sm ON p.id = sm.player_id AND (sm.status = 'ACTIVE' OR sm.status IS NULL) AND sm.undone = 0
     LEFT JOIN franchises f ON sm.franchise_id = f.id
     WHERE (? = '' OR p.edition_id = ? OR p.edition_id IS NULL)
     ORDER BY p.roll_number ASC`,
    [editionId, editionId]
  );

  const mapped = players.map((p) => {
    let stats: any = {};
    try {
      if (p.stats_json) stats = JSON.parse(p.stats_json);
    } catch {}
    return {
      ...p,
      stats,
      academicCategoryLabel: formatAcademicCategory(p.bucket),
      batting_style: p.batting_style || p.batting_hand || stats.battingStyle || 'Right Hand Bat',
      bowling_style: p.bowling_style || p.bowling_profile || stats.bowlingStyle || 'None',
    };
  });

  res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=20');
  res.json({ success: true, players: mapped });
});

// REGISTER PLAYER
// Exactly displays and saves what player mentions during registration
// If referred player: NO base price, direct franchise squad assignment with price 0, exempt from auction pool
app.post('/api/players/register', async (req: Request, res: Response) => {
  try {
    const {
      editionId: rawEditionId,
      rollNumber,
      name,
      email,
      mobileNumber: rawMobileNumber,
      mobile,
      photoUrl,
      program,
      branch,
      role: rawRole,
      playerType: rawPlayerType,
      skill: rawSkill,
      battingPosition,
      battingHand,
      battingPlayingType,
      battingStyle: rawBattingStyle,
      bowlingProfile,
      bowlingStyle: rawBowlingStyle,
      bowlingType: rawBowlingType,
      isWicketkeeper,
      cricheroesLink,
      cricHeroesUrl: rawCricHeroesUrl,
      stats,
      basePrice: rawBasePrice,
      password,
      experience,
      previousAcc,
      referralToken,
    } = req.body;

    const editionId = rawEditionId || 'ED_ACC_2026';
    const mobileNumber = rawMobileNumber || mobile;

    if (!rollNumber || !name || !mobileNumber) {
      return res.status(400).json({ success: false, error: 'Roll number, Name, and Mobile number are mandatory.' });
    }

    if (!photoUrl) {
      return res.status(400).json({ success: false, error: 'MANDATORY_PHOTO: Player photograph is required to complete registration.' });
    }

    const cleanRoll = rollNumber.trim().toUpperCase();
    const cleanMobile = mobileNumber.replace(/[\s-+]/g, '');

    const dupRoll = queryOne('SELECT id FROM players WHERE edition_id = ? AND roll_number = ?', [editionId, cleanRoll]);
    if (dupRoll) {
      return res.status(400).json({ success: false, error: `DUPLICATE_ROLL: Roll number '${cleanRoll}' is already registered in this tournament.` });
    }

    const dupMobile = queryOne('SELECT id FROM players WHERE edition_id = ? AND mobile_number = ?', [editionId, cleanMobile]);
    if (dupMobile) {
      return res.status(400).json({ success: false, error: `DUPLICATE_MOBILE: Mobile number '${cleanMobile}' is already registered.` });
    }

    let isReferredPlayer = false;
    let validReferralRecord: any = null;

    if (referralToken && referralToken.trim()) {
      validReferralRecord = queryOne(
        `SELECT * FROM referral_tokens WHERE token = ? AND edition_id = ? AND status = 'ACTIVE'`,
        [referralToken.trim(), editionId]
      );
      if (validReferralRecord) {
        // Enforce maximum 5 referred players per franchise
        const referralCount = queryOne(
          `SELECT COUNT(*) as count FROM players WHERE referring_franchise_id = ? AND is_referred = 1`,
          [validReferralRecord.franchise_id]
        );
        if (referralCount && referralCount.count >= 5) {
          return res.status(400).json({
            success: false,
            error: 'Maximum 5 referred players reached for this franchise captain.',
          });
        }
        isReferredPlayer = true;
      }
    }

    // BASE PRICE RULE:
    // Referred players must NOT have a base price (base_price = NULL)
    // Normal players can have base price
    let resolvedBasePrice: number | null = null;
    if (isReferredPlayer) {
      resolvedBasePrice = null;
    } else if (rawBasePrice !== undefined && rawBasePrice !== null && rawBasePrice !== '') {
      const parsedBp = parseInt(rawBasePrice, 10);
      resolvedBasePrice = !isNaN(parsedBp) && parsedBp >= 20 ? parsedBp : 20;
    } else {
      resolvedBasePrice = null;
    }

    const parsed = RegistrationPipeline.parseRollNumber(cleanRoll, program);
    let derivedYear = 1;
    let derivedBucket: string | null = 'B1';
    let resolvedBranch = branch || 'General';

    if (parsed.isValid && parsed.admissionYY !== undefined) {
      derivedYear = RegistrationPipeline.calculateAcademicYear(parsed.admissionYY, parsed.program || 'BTECH_REGULAR', 2026);
      derivedBucket = RegistrationPipeline.deriveBucket(parsed.program || 'BTECH_REGULAR', derivedYear);
      resolvedBranch = parsed.branchName || resolvedBranch;
    }

    const chosenRole = (rawPlayerType || rawRole || rawSkill || '').toUpperCase();
    const isWk = chosenRole.includes('WICKET') || chosenRole.includes('KEEPER') || !!isWicketkeeper;
    const isBowl = (chosenRole === 'BOWLER' || (chosenRole.includes('BOWL') && !chosenRole.includes('ALL'))) && !isWk;
    const isBat = (chosenRole === 'BATSMAN' || chosenRole === 'BATTER' || (chosenRole.includes('BAT') && !chosenRole.includes('ALL'))) && !isWk;

    let resolvedSkill = 'ALL_ROUNDER';
    let resolvedPlayerType = 'All-Rounder';

    if (isWk) {
      resolvedSkill = 'WICKET_KEEPER';
      resolvedPlayerType = 'Wicket-Keeper';
    } else if (isBowl) {
      resolvedSkill = 'BOWLER';
      resolvedPlayerType = 'Bowler';
    } else if (isBat) {
      resolvedSkill = 'BATSMAN';
      resolvedPlayerType = 'Batter';
    } else {
      resolvedSkill = 'ALL_ROUNDER';
      resolvedPlayerType = 'All-Rounder';
    }

    const battingStyle = rawBattingStyle || battingHand || 'Right Hand Bat';
    const bowlingStyle = rawBowlingStyle || rawBowlingType || bowlingProfile || (isBat ? 'None' : 'Right-arm Medium');
    const cricHeroesUrl = cricheroesLink || rawCricHeroesUrl || '';

    const playerId = `PL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();

    const fullStats = {
      ...(stats || {}),
      battingStyle,
      bowlingStyle,
      battingPosition: battingPosition || stats?.battingPosition || null,
      battingHand: battingHand || stats?.battingHand || null,
      battingPlayingType: battingPlayingType || stats?.battingPlayingType || null,
      bowlingProfile: bowlingProfile || stats?.bowlingProfile || null,
    };
    const statsJson = JSON.stringify(fullStats);
    const passwordHash = await bcrypt.hash(password || 'player123', 10);
    const cleanEmail = email && email.trim() ? email.trim() : `${cleanRoll.toLowerCase()}@avanthi.edu.in`;

    const squadMemberId = `SQD_REF_${now}_${playerId}`;

    executeTransaction(() => {
      execute(
        `INSERT INTO players (
          id, edition_id, roll_number, name, email, mobile_number, photo_url,
          program, branch, academic_year, bucket, skill, player_type,
          batting_style, bowling_style, batting_position, batting_hand, batting_playing_type, bowling_profile,
          experience, previous_acc,
          cricheroes_url, cricheroes_mobile, cricheroes_status, stats_json, base_price,
          payment_status, registration_status, is_auction_eligible, is_editing_blocked,
          is_referred, referral_token, referred_by_captain_id, referred_by_captain_name,
          referring_franchise_id, referring_franchise_name, referral_status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          playerId,
          editionId,
          cleanRoll,
          name.trim(),
          cleanEmail,
          cleanMobile,
          photoUrl,
          parsed.program || program || 'BTECH_REGULAR',
          resolvedBranch,
          derivedYear,
          derivedBucket || 'B1',
          resolvedSkill,
          resolvedPlayerType,
          battingStyle,
          bowlingStyle,
          battingPosition || null,
          battingHand || null,
          battingPlayingType || null,
          bowlingProfile || null,
          experience || '',
          previousAcc || '',
          cricHeroesUrl || '',
          cleanMobile,
          'PROFILE_VERIFIED',
          statsJson,
          resolvedBasePrice,
          'REGISTERED',
          isReferredPlayer ? 'DIRECT_ASSIGNMENT' : 'REGISTERED',
          isReferredPlayer ? 0 : 1, // REFERRED PLAYERS MUST NOT ENTER AUCTION POOL
          0,
          isReferredPlayer ? 1 : 0,
          validReferralRecord ? validReferralRecord.token : null,
          validReferralRecord ? validReferralRecord.captain_id : null,
          validReferralRecord ? validReferralRecord.captain_name : null,
          validReferralRecord ? validReferralRecord.franchise_id : null,
          validReferralRecord ? validReferralRecord.franchise_name : null,
          isReferredPlayer ? 'APPROVED' : 'NONE',
          now,
          now,
        ]
      );

      // DIRECT FRANCHISE ASSIGNMENT:
      // After successful registration, the referred player must be directly assigned to the franchise
      // that referred them without any auction price / payment, consuming 0 purse!
      if (isReferredPlayer && validReferralRecord) {
        execute(
          `UPDATE referral_tokens
           SET player_id = ?, player_name = ?, status = 'USED', verification_status = 'APPROVED'
           WHERE token = ?`,
          [playerId, name.trim(), validReferralRecord.token]
        );

        execute(
          `INSERT INTO squad_members (id, edition_id, franchise_id, player_id, acquisition_type, price, round, status, timestamp, undone)
           VALUES (?, ?, ?, ?, 'DIRECT_ASSIGNMENT', 0, 1, 'ACTIVE', ?, 0)`,
          [squadMemberId, editionId, validReferralRecord.franchise_id, playerId, now]
        );

        execute(
          `INSERT INTO referrals (id, edition_id, franchise_id, player_id, status, created_at)
           VALUES (?, ?, ?, ?, 'APPROVED', ?)`,
          [`REF_${now}_${playerId}`, editionId, validReferralRecord.franchise_id, playerId, now]
        );
      }

      execute(
        `INSERT INTO users (id, username, email, password_hash, role, player_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`USR_${playerId}`, cleanRoll, cleanEmail, passwordHash, 'PLAYER', playerId, now]
      );

      execute(
        `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AUDIT_${now}`,
          editionId,
          name,
          'PLAYER',
          isReferredPlayer ? 'PLAYER_REGISTERED_VIA_REFERRAL' : 'PLAYER_REGISTERED',
          'PLAYER',
          playerId,
          JSON.stringify({
            roll: cleanRoll,
            bucket: derivedBucket,
            role: resolvedPlayerType,
            isReferred: isReferredPlayer,
            referralToken: validReferralRecord?.token || null,
            basePrice: resolvedBasePrice,
            directAssignment: isReferredPlayer ? validReferralRecord?.franchise_id : null,
          }),
          now,
        ]
      );
    });

    saveUserToCloudSql({
      id: `USR_${playerId}`,
      username: cleanRoll,
      email: cleanEmail,
      password_hash: passwordHash,
      role: 'PLAYER',
      player_id: playerId,
      created_at: now,
    }).catch(() => {});

    savePlayerToCloudSql({
      id: playerId,
      edition_id: editionId,
      roll_number: cleanRoll,
      name: name.trim(),
      email: cleanEmail,
      mobile_number: cleanMobile,
      photo_url: photoUrl,
      program: parsed.program || program || 'BTECH_REGULAR',
      branch: resolvedBranch,
      academic_year: derivedYear,
      bucket: derivedBucket || 'B1',
      skill: resolvedSkill,
      player_type: resolvedPlayerType,
      batting_style: battingStyle,
      bowling_style: bowlingStyle,
      batting_position: battingPosition || null,
      batting_hand: battingHand || null,
      batting_playing_type: battingPlayingType || null,
      bowling_profile: bowlingProfile || null,
      stats_json: statsJson,
      base_price: resolvedBasePrice || 0,
      is_auction_eligible: isReferredPlayer ? 0 : 1,
      is_referred: isReferredPlayer ? 1 : 0,
      referral_token: validReferralRecord ? validReferralRecord.token : null,
      referred_by_captain_id: validReferralRecord ? validReferralRecord.captain_id : null,
      referred_by_captain_name: validReferralRecord ? validReferralRecord.captain_name : null,
      referring_franchise_id: validReferralRecord ? validReferralRecord.franchise_id : null,
      referring_franchise_name: validReferralRecord ? validReferralRecord.franchise_name : null,
      referral_status: isReferredPlayer ? 'APPROVED' : 'NONE',
      created_at: now,
      updated_at: now,
    }).catch(() => {});

    if (isReferredPlayer && validReferralRecord) {
      saveSquadMemberToCloudSql({
        id: squadMemberId,
        edition_id: editionId,
        franchise_id: validReferralRecord.franchise_id,
        player_id: playerId,
        acquisition_type: 'DIRECT_ASSIGNMENT',
        price: 0,
        round: 1,
        status: 'ACTIVE',
        timestamp: now,
        undone: 0,
      }).catch(() => {});
    }

    auctionManager.broadcast('STATE_UPDATED', { reason: 'PLAYER_REGISTERED', playerId });

    res.json({
      success: true,
      playerId,
      derivedBucket,
      academicCategoryLabel: formatAcademicCategory(derivedBucket),
      playerType: resolvedPlayerType,
      skill: resolvedSkill,
      isReferred: isReferredPlayer,
      basePrice: resolvedBasePrice,
      message: isReferredPlayer
        ? `Referred player registered! Directly assigned to franchise '${validReferralRecord.franchise_name}'.`
        : 'Player successfully registered and saved to database!',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/players/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.role || (req.query?.role as string);
    const actorId = (req.headers['x-user-id'] as string) || req.body?.userId || (req.query?.userId as string);
    const actorUsername = (req.headers['x-user-username'] as string) || req.body?.username || 'Admin';

    let isAuthorizedAdmin = actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN' || actorRole === 'OPERATOR';
    if (!isAuthorizedAdmin && actorId) {
      const user = queryOne('SELECT role, username FROM users WHERE id = ?', [actorId]);
      if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'OPERATOR')) {
        isAuthorizedAdmin = true;
      }
    }

    if (!isAuthorizedAdmin) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED: Only administrators have permission to delete players.',
      });
    }

    const player = queryOne('SELECT * FROM players WHERE id = ?', [id]);
    if (!player) {
      return res.status(404).json({ success: false, error: 'Player not found in database.' });
    }

    deleteSinglePlayer(id, actorUsername);
    auctionManager.broadcast('STATE_UPDATED', { reason: 'PLAYER_DELETED', playerId: id });

    res.json({
      success: true,
      message: `Player '${player.name}' was completely and permanently deleted from the database by Admin.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/verify-player', (req: Request, res: Response) => {
  try {
    const { playerId, basePrice, isEligible, actor } = req.body;
    if (!playerId) return res.status(400).json({ success: false, error: 'Player ID is required.' });

    const player = queryOne('SELECT * FROM players WHERE id = ?', [playerId]);
    if (!player) return res.status(404).json({ success: false, error: 'Player not found.' });

    const newPayment = 'REGISTERED';
    const newCH = player.cricheroes_status || 'PROFILE_RESOLVED';
    const newBase = basePrice !== undefined ? parseInt(basePrice, 10) : player.base_price;
    const isAuctionEligible = isEligible !== undefined ? (isEligible ? 1 : 0) : 1;
    const now = Date.now();

    execute(
      `UPDATE players
       SET payment_status = ?, cricheroes_status = ?, base_price = ?, is_auction_eligible = ?, updated_at = ?
       WHERE id = ?`,
      [newPayment, newCH, newBase, isAuctionEligible, now, playerId]
    );

    savePlayerToCloudSql({
      ...player,
      base_price: newBase,
      is_auction_eligible: isAuctionEligible,
      updated_at: now,
    }).catch(() => {});

    execute(
      `INSERT INTO audit_logs (id, edition_id, actor, role, action, entity, entity_id, new_state, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `AUDIT_${now}`,
        player.edition_id,
        actor || 'SuperAdmin',
        'SUPER_ADMIN',
        'VERIFY_PLAYER',
        'PLAYER',
        playerId,
        JSON.stringify({ payment: newPayment, cricheroes: newCH, basePrice: newBase, eligible: isAuctionEligible }),
        now,
      ]
    );

    res.json({ success: true, isAuctionEligible });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * REFERRAL SYSTEM ROUTES
 * ============================================================================ */

app.post('/api/referrals/generate', async (req: Request, res: Response) => {
  try {
    const { franchiseId, captainName, captainId, captainMobile } = req.body;

    if (!franchiseId) {
      return res.status(400).json({ success: false, error: 'Franchise ID is required.' });
    }

    const franchise = queryOne('SELECT * FROM franchises WHERE id = ?', [franchiseId]);
    if (!franchise) {
      return res.status(404).json({ success: false, error: 'Franchise not found.' });
    }

    // Check 0–5 limit
    const activeReferralsCount = queryOne(
      `SELECT COUNT(*) as count FROM players WHERE referring_franchise_id = ? AND is_referred = 1`,
      [franchiseId]
    );

    if (activeReferralsCount && activeReferralsCount.count >= 5) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 5 referred players reached for this franchise.',
      });
    }

    const now = Date.now();
    const token = `REF_${franchise.id}_${Math.random().toString(36).substring(2, 8).toUpperCase()}_${Date.now()}`;
    const capName = captainName || franchise.captain_name || 'Franchise Captain';

    execute(
      `INSERT INTO referral_tokens (token, edition_id, franchise_id, franchise_name, captain_id, captain_name, captain_mobile, created_at, status, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'PENDING')`,
      [token, franchise.edition_id, franchise.id, franchise.name, captainId || franchise.captain_roll || franchise.id, capName, captainMobile || franchise.captain_mobile || '', now]
    );

    res.json({
      success: true,
      token,
      referralLink: `/player/register?ref=${token}`,
      franchiseId: franchise.id,
      franchiseName: franchise.name,
      captainName: capName,
      message: 'Referral link generated successfully! Share this link with your referred player.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/referrals/validate/:token', (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const referral = queryOne(
      `SELECT r.*, f.name as franchise_name, f.captain_name
       FROM referral_tokens r
       JOIN franchises f ON r.franchise_id = f.id
       WHERE r.token = ? AND r.status = 'ACTIVE'`,
      [token]
    );

    if (!referral) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: 'Invalid or expired referral link.',
      });
    }

    res.json({
      success: true,
      valid: true,
      token: referral.token,
      franchiseId: referral.franchise_id,
      franchiseName: referral.franchise_name,
      captainName: referral.captain_name || referral.captain_name,
      captainMobile: referral.captain_mobile || '',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN DEDICATED REFERRED PLAYERS SECTION
app.get('/api/admin/referrals', (req: Request, res: Response) => {
  try {
    const actorRole = (req.headers['x-user-role'] as string) || (req.query?.role as string);
    if (actorRole !== 'SUPER_ADMIN' && actorRole !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'PERMISSION_DENIED: Administrator access required.' });
    }

    // Details for Admin to cross-check: PLAYER -> REFERRED BY CAPTAIN -> FRANCHISE
    const referredPlayers = queryAll(
      `SELECT p.id as player_registration_id, p.name as player_name, p.roll_number, p.mobile_number, p.email,
              p.registration_status, p.is_referred, p.referral_token,
              p.referred_by_captain_name as captain_name, p.referring_franchise_name as franchise_name,
              p.referring_franchise_id as franchise_id, p.referral_status, p.bucket, p.player_type, p.created_at,
              p.stats_json, p.branch, p.program
       FROM players p
       WHERE p.is_referred = 1
       ORDER BY p.created_at DESC`
    );

    res.json({
      success: true,
      referredPlayers: referredPlayers.map((p) => {
        let stats = {};
        try {
          if (p.stats_json) stats = JSON.parse(p.stats_json);
        } catch {}
        return {
          ...p,
          stats,
          referral_source: p.referral_token ? `Referral Link (${p.referral_token})` : 'Captain Referral',
          academicCategoryLabel: formatAcademicCategory(p.bucket),
        };
      }),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * GUEST DRAW MODE ROUTES
 * ============================================================================ */

app.get('/api/auction/guest-draw-candidates', (req: Request, res: Response) => {
  try {
    const edition = auctionManager.getActiveEdition();
    const editionId = (req.query.editionId as string) || (edition ? edition.id : 'ED_ACC_2026');
    const candidates = auctionManager.getEligibleGuestDrawPlayers(editionId);
    res.json({ success: true, candidates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * SQUAD MANAGEMENT
 * ============================================================================ */

app.get('/api/franchise/:id/squad', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const franchise = queryOne('SELECT * FROM franchises WHERE id = ?', [id]);
    if (!franchise) return res.status(404).json({ success: false, error: 'Franchise not found.' });

    const activeSquad = queryAll(
      `SELECT sm.*, p.name as player_name, p.roll_number, p.photo_url, p.program, p.branch, p.bucket,
              p.player_type, p.mobile_number, p.batting_style, p.bowling_style, p.stats_json, p.is_referred
       FROM squad_members sm
       JOIN players p ON sm.player_id = p.id
       WHERE sm.franchise_id = ? AND (sm.status = 'ACTIVE' OR sm.status IS NULL) AND sm.undone = 0
       ORDER BY sm.timestamp ASC`,
      [id]
    );

    const removedSquad = queryAll(
      `SELECT sm.*, p.name as player_name, p.roll_number, p.photo_url, p.branch, p.bucket, p.player_type,
              sm.removed_at, sm.removed_by, sm.removal_reason
       FROM squad_members sm
       JOIN players p ON sm.player_id = p.id
       WHERE sm.franchise_id = ? AND (sm.status = 'REMOVED' OR sm.undone = 1)
       ORDER BY sm.removed_at DESC`,
      [id]
    );

    res.json({
      success: true,
      franchise: {
        id: franchise.id,
        name: franchise.name,
        purse: franchise.purse,
        captain_name: franchise.captain_name,
        captain_specialty: franchise.captain_specialty,
        vice_captain_name: franchise.vice_captain_name,
      },
      activeSquad: activeSquad.map((s) => ({
        ...s,
        academicCategoryLabel: formatAcademicCategory(s.bucket),
      })),
      removedSquad: removedSquad.map((s) => ({
        ...s,
        academicCategoryLabel: formatAcademicCategory(s.bucket),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/franchise/:id/squad/remove-player', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { playerId, reason } = req.body;
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.actorRole;
    const actorFranchiseId = (req.headers['x-user-franchise-id'] as string) || req.body?.actorFranchiseId;
    const actorUsername = (req.headers['x-user-username'] as string) || req.body?.actor || 'Captain';

    if (actorRole !== 'SUPER_ADMIN' && actorRole !== 'ADMIN' && actorFranchiseId !== id) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED: Captains can only manage players in their own franchise squad.',
      });
    }

    const result = await auctionManager.removeSquadMemberByCaptain({
      franchiseId: id,
      playerId,
      reason,
      actor: actorUsername,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/squads', (req: Request, res: Response) => {
  try {
    const edition = auctionManager.getActiveEdition();
    const editionId = (req.query.editionId as string) || (edition ? edition.id : 'ED_ACC_2026');

    const squads = queryAll(
      `SELECT sm.id as squad_member_id, sm.franchise_id, f.name as franchise_name, sm.player_id,
              p.name as player_name, p.roll_number, p.bucket, p.player_type, sm.acquisition_type, sm.price,
              sm.status, sm.timestamp, sm.removed_at, sm.removed_by, sm.removal_reason
       FROM squad_members sm
       JOIN franchises f ON sm.franchise_id = f.id
       JOIN players p ON sm.player_id = p.id
       WHERE sm.edition_id = ?
       ORDER BY sm.timestamp DESC`,
      [editionId]
    );

    res.json({
      success: true,
      squads: squads.map((s) => ({
        ...s,
        academicCategoryLabel: formatAcademicCategory(s.bucket),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * AUCTION FLOOR & CONTROL ROUTES
 * ============================================================================ */

app.get('/api/auction/state', (req: Request, res: Response) => {
  try {
    const edition = auctionManager.getActiveEdition();
    const editionId = (req.query.editionId as string) || (edition ? edition.id : '');
    const currentLot = auctionManager.getCurrentLot(editionId);
    const franchises = auctionManager.getFranchises(editionId);
    const scarcity = auctionManager.getScarcityReport(editionId);

    const franchiseWithMaxBid = franchises.map((f) => {
      let maxBid = 0;
      let bidAllowed = false;
      let blockedReason = '';

      if (currentLot) {
        const franchiseEngineModel: AuctionPipeline.Franchise = {
          id: f.id,
          name: f.name,
          editionId,
          purse: f.purse,
          auctionPurchasesCount: f.auctionPurchasesCount,
          retainedCount: f.retainedCount,
          referredCount: f.referredCount,
          squadPlayerIds: f.squad.map((s: any) => s.player_id),
          bucketCounts: f.bucketCounts,
          active: f.active === 1,
          hasPassedCurrentLot: false,
        };

        maxBid = AuctionPipeline.calculateMaximumPermissibleBid(franchiseEngineModel, currentLot.bucket);
        const nextLegal = AuctionPipeline.calculateNextLegalBid(currentLot.current_price, currentLot.bid_count > 0);

        if (f.purse < nextLegal) {
          blockedReason = `Insufficient purse (${f.purse}) for next legal bid (${nextLegal})`;
        } else if (nextLegal > maxBid) {
          blockedReason = `Exceeds max permissible bid (${maxBid}). Must reserve funds for mandatory bucket requirements.`;
        } else {
          const feasibility = AuctionPipeline.checkFranchiseFeasibility(franchiseEngineModel, {
            id: currentLot.player_id,
            name: currentLot.player_name,
            bucket: currentLot.bucket,
            basePrice: currentLot.opening_price,
            originalBasePrice: currentLot.opening_price,
            lotState: AuctionPipeline.PlayerLotState.IN_AUCTION,
            editionId,
            round: currentLot.round,
          });
          if (!feasibility.feasible) {
            blockedReason = feasibility.reason || 'Bucket feasibility constraint';
          } else {
            bidAllowed = true;
          }
        }
      }

      return {
        ...f,
        maxBid,
        bidAllowed,
        blockedReason,
      };
    });

    const soldCount = queryOne('SELECT COUNT(*) as c FROM auction_lots WHERE edition_id = ? AND lot_state = "SOLD"', [editionId])?.c || 0;
    const unsoldCount = queryOne('SELECT COUNT(*) as c FROM auction_lots WHERE edition_id = ? AND lot_state = "UNSOLD"', [editionId])?.c || 0;
    const upcomingPlayers = auctionManager.getUpcomingPlayers(editionId, 6);

    res.json({
      success: true,
      editionId,
      currentLot,
      upcomingPlayers,
      franchises: franchiseWithMaxBid,
      scarcity,
      soldCount,
      unsoldCount,
      viewerCount: auctionManager.getViewerCount(),
      serverTime: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auction/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = `CLIENT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  auctionManager.addSSEClient(clientId, res);

  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

  req.on('close', () => {
    auctionManager.removeSSEClient(clientId);
  });
});

app.post('/api/auction/bid', async (req: Request, res: Response) => {
  try {
    const { franchiseId, editionId, actor } = req.body;
    if (!franchiseId || !editionId) {
      return res.status(400).json({ success: false, error: 'Franchise ID and Edition ID required.' });
    }
    const result = await auctionManager.placeBid(franchiseId, editionId, actor);
    res.json({ success: true, lot: result.lot });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/pass', async (req: Request, res: Response) => {
  try {
    const { franchiseId, editionId } = req.body;
    const result = await auctionManager.passLot(franchiseId, editionId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/hammer', async (req: Request, res: Response) => {
  try {
    const { editionId, actor } = req.body;
    const result = await auctionManager.strikeHammer(editionId, actor);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/timer/adjust', async (req: Request, res: Response) => {
  try {
    const { seconds, editionId, actor } = req.body;
    const activeEd = editionId || auctionManager.getActiveEdition()?.id;
    if (!activeEd) return res.status(400).json({ success: false, error: 'Active edition required' });

    const result = await auctionManager.adjustTimer(parseInt(seconds, 10) || 10, activeEd, actor || 'Admin');
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/timer/reset', async (req: Request, res: Response) => {
  try {
    const { seconds, editionId, actor } = req.body;
    const activeEd = editionId || auctionManager.getActiveEdition()?.id;
    if (!activeEd) return res.status(400).json({ success: false, error: 'Active edition required' });

    const result = await auctionManager.resetTimer(parseInt(seconds, 10) || 30, activeEd, actor || 'Admin');
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/draw-next', async (req: Request, res: Response) => {
  try {
    const { editionId, mode, playerId, actor } = req.body;
    const lot = await auctionManager.drawNextPlayer(editionId, mode || 'AUTO', playerId, actor);
    res.json({ success: true, lot });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/skip', async (req: Request, res: Response) => {
  try {
    const { editionId, actor, reason } = req.body;
    const result = await auctionManager.skipLot(editionId, actor, reason);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/undo', async (req: Request, res: Response) => {
  try {
    const { saleId, reason, actor } = req.body;
    if (!saleId || !reason) {
      return res.status(400).json({ success: false, error: 'Sale ID and substantiating reason are strictly required for safe undo.' });
    }
    const result = await auctionManager.undoSale(saleId, reason, actor);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// BROADCAST AUCTION NOTICE (WITH CUSTOM TIME ALERT)
// Requirement 1: "in the existing system we already have the broadcast auction notice like sending alet auction starts in 10 min so i need to modify it as setting custom time alert so we can set the custome time.."
app.post('/api/auction/notify', async (req: Request, res: Response) => {
  try {
    const { editionId, type, title, message, target, startsInMinutes, actor } = req.body;
    const activeEd = editionId || auctionManager.getActiveEdition()?.id || 'ED_ACC_2026';

    const parsedMinutes = startsInMinutes !== undefined && !isNaN(parseInt(startsInMinutes, 10))
      ? parseInt(startsInMinutes, 10)
      : 10;

    const customTitle = title || `⚡ Live Auction Begins in ${parsedMinutes} Minute${parsedMinutes === 1 ? '' : 's'}!`;
    const customMessage = message || `The Avanthi Cricket Carnival Live Auction Floor is opening in ${parsedMinutes} minutes. All 11 franchises and registered players please assemble at the live floor.`;

    const notification = await auctionManager.sendAuctionNotification({
      editionId: activeEd,
      type: type || 'AUCTION_STARTING_CUSTOM',
      title: customTitle,
      message: customMessage,
      target: target || 'ALL',
      startsInMinutes: parsedMinutes,
      actor: actor || 'SuperAdmin',
    });

    res.json({ success: true, notification });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/auction/notifications', (req: Request, res: Response) => {
  try {
    const edition = auctionManager.getActiveEdition();
    const editionId = (req.query.editionId as string) || (edition ? edition.id : 'ED_ACC_2026');
    const notifications = auctionManager.getRecentNotifications(editionId);
    res.json({ success: true, notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/reset-system', (req: Request, res: Response) => {
  try {
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.role || (req.query?.role as string);
    const actorId = (req.headers['x-user-id'] as string) || req.body?.userId;
    const actorUsername = (req.headers['x-user-username'] as string) || req.body?.username || 'SuperAdmin';

    let isAuthorized = actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN';
    if (!isAuthorized && actorId) {
      const user = queryOne('SELECT role, username FROM users WHERE id = ?', [actorId]);
      if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED: Only administrators have permission to execute a system reset.',
      });
    }

    resetSystemData(actorUsername);
    auctionManager.broadcast('STATE_UPDATED', { reason: 'SYSTEM_RESET' });

    res.json({
      success: true,
      message: 'System reset completed successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const handleRemoveAllPlayers = (req: Request, res: Response) => {
  try {
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.role || (req.query?.role as string);
    const actorId = (req.headers['x-user-id'] as string) || req.body?.userId;
    const actorUsername = (req.headers['x-user-username'] as string) || req.body?.username || 'Admin';

    let isAuthorized = actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN';
    if (!isAuthorized && actorId) {
      const user = queryOne('SELECT role, username FROM users WHERE id = ?', [actorId]);
      if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED: Only administrators have permission to remove all players.',
      });
    }

    const result = removeAllPlayers(actorUsername);
    auctionManager.broadcast('STATE_UPDATED', { reason: 'ALL_PLAYERS_REMOVED', count: result.count });
    res.json({
      success: true,
      message: `Successfully deleted all ${result.count} players from database.`,
      count: result.count,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/admin/remove-all-players', handleRemoveAllPlayers);
app.delete('/api/players', handleRemoveAllPlayers);

const handleRemoveAllFranchises = (req: Request, res: Response) => {
  try {
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.role || (req.query?.role as string);
    const actorId = (req.headers['x-user-id'] as string) || req.body?.userId;
    const actorUsername = (req.headers['x-user-username'] as string) || req.body?.username || 'Admin';

    let isAuthorized = actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN';
    if (!isAuthorized && actorId) {
      const user = queryOne('SELECT role, username FROM users WHERE id = ?', [actorId]);
      if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED: Only administrators have permission to remove all franchises.',
      });
    }

    const result = removeAllFranchises(actorUsername);
    auctionManager.broadcast('STATE_UPDATED', { reason: 'ALL_FRANCHISES_REMOVED', count: result.count });
    res.json({
      success: true,
      message: `Successfully deleted all ${result.count} franchises from database.`,
      count: result.count,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/admin/remove-all-franchises', handleRemoveAllFranchises);
app.delete('/api/franchises', handleRemoveAllFranchises);

app.get('/api/audit/logs', (req: Request, res: Response) => {
  const edition = auctionManager.getActiveEdition();
  const editionId = (req.query.editionId as string) || (edition ? edition.id : '');
  const logs = queryAll('SELECT * FROM audit_logs WHERE edition_id = ? OR edition_id IS NULL ORDER BY timestamp DESC LIMIT 100', [editionId]);
  res.json({ success: true, logs });
});

async function startServer() {
  await initDatabase();

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`============================================================`);
    console.log(`ACC PLAYER AUCTION PORTAL SERVER RUNNING ON PORT ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`============================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
