/**
 * ============================================================================
 * ACC PLAYER AUCTION PORTAL — FULL-STACK EXPRESS SERVER
 * ============================================================================
 * Runs on Port 3000. Mounts Vite middleware in dev mode.
 * Real SQL Relational Database + Server-Authoritative Live Auction Engine.
 * Implements the 11 strict modifications while preserving all baseline features.
 */

import express, { Request, Response } from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
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
import { formatAcademicCategory, deriveEffectiveBucket, STRICT_BUCKET_AUCTION_ORDER } from './src/utils/academicCategories';

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

// In-memory OTP storage for Two-Phase Registration (Requirement 9)
const activeOtps: Map<string, { code: string; expiresAt: number }> = new Map();

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
    activeSession: auctionManager.getActiveSession(),
    sessionState: auctionManager.getSessionState(),
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

app.get(['/supabase-db.zip', '/api/download/supabase-db.zip', '/api/download/db-zip'], (req: Request, res: Response) => {
  const filePath = path.resolve(process.cwd(), 'public', 'supabase-db.zip');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="supabase-db.zip"');
    return res.sendFile(filePath);
  }
  res.status(404).json({ success: false, error: 'File not found' });
});

app.get(['/acc-auction-updates.zip', '/api/download/all-updates-zip'], (req: Request, res: Response) => {
  const filePath = path.resolve(process.cwd(), 'public', 'acc-auction-updates.zip');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="acc-auction-updates.zip"');
    return res.sendFile(filePath);
  }
  res.status(404).json({ success: false, error: 'File not found' });
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
 * OTP VERIFICATION ROUTES (Requirement 9: Two-Phase Registration)
 * ============================================================================ */

app.post('/api/auth/send-otp', (req: Request, res: Response) => {
  try {
    const { mobile } = req.body;
    if (!mobile || mobile.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'A valid 10-digit mobile number is required.' });
    }
    const cleanMobile = mobile.replace(/[\s-+]/g, '');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    activeOtps.set(cleanMobile, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    res.json({
      success: true,
      message: `OTP sent successfully to ${cleanMobile}.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, error: 'Mobile number and OTP code required.' });
    }
    const cleanMobile = mobile.replace(/[\s-+]/g, '');
    const record = activeOtps.get(cleanMobile);

    if (!record) {
      return res.status(400).json({ success: false, error: 'No OTP requested for this mobile number or it has expired.' });
    }
    if (Date.now() > record.expiresAt) {
      activeOtps.delete(cleanMobile);
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }
    if (record.code !== otp.trim()) {
      return res.status(400).json({ success: false, error: 'Incorrect OTP code entered.' });
    }

    activeOtps.delete(cleanMobile);
    res.json({ success: true, message: 'Mobile number successfully verified with OTP.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * FORGOT PASSWORD WITH MOBILE OTP (Requirement 1)
 * ============================================================================ */

app.post('/api/auth/forgot-password/send-otp', (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ success: false, error: 'College Roll Number or Registered Mobile Number is required.' });
    }

    const cleanInput = identifier.trim().toLowerCase();
    const cleanMobile = identifier.replace(/[\s-+]/g, '');

    const player = queryOne(
      `SELECT * FROM players WHERE LOWER(roll_number) = ? OR mobile_number = ? LIMIT 1`,
      [cleanInput, cleanMobile]
    );

    if (!player) {
      return res.status(404).json({ success: false, error: 'No registered player found with this Roll Number or Mobile Number.' });
    }

    if (!player.mobile_number) {
      return res.status(400).json({ success: false, error: 'No mobile number associated with this player account.' });
    }

    const targetMobile = player.mobile_number;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    activeOtps.set(targetMobile, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    res.json({
      success: true,
      message: `Password reset OTP generated and sent to mobile ending in ...${targetMobile.slice(-4)}.`,
      mobile: targetMobile,
      playerName: player.name,
      rollNumber: player.roll_number,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/forgot-password/reset', async (req: Request, res: Response) => {
  try {
    const { identifier, mobile, newPassword, confirmPassword } = req.body;
    const targetIdentifier = (identifier || mobile || '').trim();
    if (!targetIdentifier || !newPassword) {
      return res.status(400).json({ success: false, error: 'College Roll Number or Mobile Number, and new password are required.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters long.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    const cleanInput = targetIdentifier.toLowerCase();
    const cleanMobile = targetIdentifier.replace(/[\s-+]/g, '');

    const player = queryOne(
      `SELECT * FROM players WHERE LOWER(roll_number) = ? OR mobile_number = ? LIMIT 1`,
      [cleanInput, cleanMobile]
    );

    if (!player) {
      return res.status(404).json({ success: false, error: 'No registered player found with this Roll Number or Mobile Number.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = Date.now();

    execute(
      `UPDATE users SET password_hash = ? WHERE player_id = ? OR LOWER(username) = ?`,
      [passwordHash, player.id, player.roll_number.toLowerCase()]
    );

    saveUserToCloudSql({
      id: `USR_${player.id}`,
      username: player.roll_number,
      password_hash: passwordHash,
      role: 'PLAYER',
      player_id: player.id,
      updated_at: now,
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Password successfully updated! You can now log in with your new password.',
      rollNumber: player.roll_number,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * AUTHENTICATION ROUTES (Google login completely removed - Requirement 4)
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
 * TWO-PHASE PLAYER REGISTRATION (Requirement 9, 3, 8)
 * ============================================================================ */

app.post('/api/players/register-phase1', async (req: Request, res: Response) => {
  try {
    const { name, rollNumber, mobileNumber, mobile, password, referralToken, isDetained } = req.body;
    const rawMobile = mobileNumber || mobile;

    if (!name || !rollNumber || !rawMobile || !password) {
      return res.status(400).json({ success: false, error: 'Player Name, Roll Number, Mobile Number, and Password are required.' });
    }

    const cleanRoll = rollNumber.trim().toUpperCase();
    const cleanMobile = rawMobile.replace(/[\s-+]/g, '');

    const dupRoll = queryOne('SELECT id FROM players WHERE roll_number = ?', [cleanRoll]);
    if (dupRoll) {
      return res.status(400).json({ success: false, error: `DUPLICATE_ROLL: Roll number '${cleanRoll}' is already registered.` });
    }

    const dupMobile = queryOne('SELECT id FROM players WHERE mobile_number = ?', [cleanMobile]);
    if (dupMobile) {
      return res.status(400).json({ success: false, error: `DUPLICATE_MOBILE: Mobile number '${cleanMobile}' is already registered.` });
    }

    let isReferredPlayer = false;
    let validReferralRecord: any = null;

    if (referralToken && referralToken.trim()) {
      validReferralRecord = queryOne(
        `SELECT * FROM referral_tokens WHERE token = ? AND status = 'ACTIVE'`,
        [referralToken.trim()]
      );
      if (validReferralRecord) {
        isReferredPlayer = true;
      }
    }

    const playerId = `PL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();
    const passwordHash = await bcrypt.hash(password, 10);
    const cleanEmail = `${cleanRoll.toLowerCase()}@avanthi.edu.in`;

    const detainedFlag = isDetained === true || isDetained === 1 || isDetained === '1';
    const parsed = RegistrationPipeline.parseRollNumber(cleanRoll);
    const derivedYear = parsed.admissionYY ? RegistrationPipeline.calculateAcademicYear(parsed.admissionYY, parsed.program || 'BTECH_REGULAR', 2026) : 1;
    const initialBucket = RegistrationPipeline.deriveBucket(parsed.program || 'BTECH_REGULAR', derivedYear, detainedFlag) || 'B1';

    executeTransaction(() => {
      execute(
        `INSERT INTO players (
          id, edition_id, roll_number, name, email, mobile_number, photo_url,
          program, branch, academic_year, bucket, skill, player_type,
          registration_phase, approval_status, is_auction_eligible, is_detained, auction_session,
          is_referred, referral_token, referred_by_captain_id, referred_by_captain_name,
          referring_franchise_id, referring_franchise_name, referral_status,
          payment_status, registration_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          playerId,
          'ED_ACC_2026',
          cleanRoll,
          name.trim(),
          cleanEmail,
          cleanMobile,
          '',
          parsed.program || 'BTECH_REGULAR',
          parsed.branchName || 'General',
          derivedYear,
          initialBucket,
          'ALL_ROUNDER',
          'All-Rounder',
          1,
          'PENDING',
          0,
          detainedFlag ? 1 : 0,
          1,
          isReferredPlayer ? 1 : 0,
          validReferralRecord ? validReferralRecord.token : null,
          validReferralRecord ? validReferralRecord.captain_id : null,
          validReferralRecord ? validReferralRecord.captain_name : null,
          validReferralRecord ? validReferralRecord.franchise_id : null,
          validReferralRecord ? validReferralRecord.franchise_name : null,
          isReferredPlayer ? 'PENDING_ADMIN_APPROVAL' : 'NONE',
          'REGISTERED',
          'PHASE_1_COMPLETE',
          now,
          now,
        ]
      );

      execute(
        `INSERT INTO users (id, username, email, password_hash, role, player_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`USR_${playerId}`, cleanRoll, cleanEmail, passwordHash, 'PLAYER', playerId, now]
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
      edition_id: 'ED_ACC_2026',
      roll_number: cleanRoll,
      name: name.trim(),
      email: cleanEmail,
      mobile_number: cleanMobile,
      registration_phase: 1,
      approval_status: 'PENDING',
      is_auction_eligible: 0,
      is_referred: isReferredPlayer ? 1 : 0,
      referral_token: validReferralRecord ? validReferralRecord.token : null,
      created_at: now,
      updated_at: now,
    }).catch(() => {});

    res.json({
      success: true,
      playerId,
      message: 'Phase 1 registration completed! Your account is created. Please log in to complete Phase 2 profile & cricket statistics.',
      user: {
        id: `USR_${playerId}`,
        username: cleanRoll,
        email: cleanEmail,
        role: 'PLAYER',
        playerId,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/players/submit-phase2', async (req: Request, res: Response) => {
  try {
    const {
      playerId,
      photoUrl,
      isDetained,
      playerType: rawPlayerType,
      role: rawRole,
      skill: rawSkill,
      battingPosition,
      battingHand,
      battingPlayingType,
      battingStyle: rawBattingStyle,
      bowlingProfile,
      bowlingStyle: rawBowlingStyle,
      stats,
      cricheroesLink,
      experience,
      previousAcc,
      basePrice: rawBasePrice,
    } = req.body;

    if (!playerId) {
      return res.status(400).json({ success: false, error: 'Player ID is required.' });
    }

    const player = queryOne('SELECT * FROM players WHERE id = ?', [playerId]);
    if (!player) {
      return res.status(404).json({ success: false, error: 'Player account not found.' });
    }

    if (!photoUrl) {
      return res.status(400).json({ success: false, error: 'Player photo is required to complete Phase 2.' });
    }

    const detainedFlag = isDetained === true || isDetained === 1 || isDetained === '1';
    const effective = deriveEffectiveBucket(player.program, player.academic_year, detainedFlag);

    const chosenRole = (rawPlayerType || rawRole || rawSkill || player.player_type || 'All-Rounder').toUpperCase();
    const isWk = chosenRole.includes('WICKET') || chosenRole.includes('KEEPER');
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
    }

    const battingStyle = rawBattingStyle || battingHand || 'Right Hand Bat';
    const bowlingStyle = rawBowlingStyle || bowlingProfile || (isBat ? 'None' : 'Right-arm Medium');
    const fullStats = {
      ...(stats || {}),
      battingStyle,
      bowlingStyle,
      battingPosition: battingPosition || null,
      battingHand: battingHand || null,
      battingPlayingType: battingPlayingType || null,
      bowlingProfile: bowlingProfile || null,
    };
    const statsJson = JSON.stringify(fullStats);

    let resolvedBasePrice: number | null = null;
    if (player.is_referred !== 1 && rawBasePrice !== undefined && rawBasePrice !== null && rawBasePrice !== '') {
      const parsedBp = parseInt(rawBasePrice, 10);
      resolvedBasePrice = !isNaN(parsedBp) && parsedBp >= 20 ? parsedBp : 20;
    }

    const now = Date.now();

    execute(
      `UPDATE players
       SET photo_url = ?, is_detained = ?, bucket = ?, skill = ?, player_type = ?,
           batting_style = ?, bowling_style = ?, batting_position = ?, batting_hand = ?, batting_playing_type = ?, bowling_profile = ?,
           stats_json = ?, cricheroes_url = ?, experience = ?, previous_acc = ?, base_price = ?,
           registration_phase = 2, approval_status = 'PENDING', is_auction_eligible = 0,
           registration_status = 'SUBMITTED_FOR_APPROVAL', updated_at = ?
       WHERE id = ?`,
      [
        photoUrl,
        detainedFlag ? 1 : 0,
        effective.effectiveBucket,
        resolvedSkill,
        resolvedPlayerType,
        battingStyle,
        bowlingStyle,
        battingPosition || null,
        battingHand || null,
        battingPlayingType || null,
        bowlingProfile || null,
        statsJson,
        cricheroesLink || '',
        experience || '',
        previousAcc || '',
        resolvedBasePrice,
        now,
        playerId,
      ]
    );

    savePlayerToCloudSql({
      ...player,
      photo_url: photoUrl,
      is_detained: detainedFlag ? 1 : 0,
      bucket: effective.effectiveBucket,
      skill: resolvedSkill,
      player_type: resolvedPlayerType,
      batting_style: battingStyle,
      bowling_style: bowlingStyle,
      stats_json: statsJson,
      registration_phase: 2,
      approval_status: 'PENDING',
      is_auction_eligible: 0,
      base_price: resolvedBasePrice,
      updated_at: now,
    }).catch(() => {});

    auctionManager.broadcast('STATE_UPDATED', { reason: 'PLAYER_PHASE2_SUBMITTED', playerId });

    res.json({
      success: true,
      message: 'Profile and cricket statistics submitted for Admin review. Your auction eligibility is pending approval.',
      effectiveBucket: effective.effectiveBucket,
      academicCategoryLabel: effective.label,
      isDetained: detainedFlag,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// EDIT PLAYER PROFILE (Requirement 7: Player edit option with restrictions)
app.put('/api/players/profile', async (req: Request, res: Response) => {
  try {
    const actorPlayerId = (req.headers['x-user-player-id'] as string) || req.body?.playerId;

    if (!actorPlayerId) {
      return res.status(401).json({ success: false, error: 'Player authentication required.' });
    }

    const player = queryOne('SELECT * FROM players WHERE id = ?', [actorPlayerId]);
    if (!player) {
      return res.status(404).json({ success: false, error: 'Player profile not found.' });
    }

    const {
      name,
      mobileNumber,
      email,
      photoUrl,
      isDetained,
      playerType,
      battingPosition,
      battingHand,
      battingPlayingType,
      bowlingProfile,
      cricheroesLink,
      experience,
      previousAcc,
      stats,
    } = req.body;

    const detainedFlag = isDetained !== undefined
      ? (isDetained === true || isDetained === 1 || isDetained === '1')
      : (player.is_detained === 1);

    const effective = deriveEffectiveBucket(player.program, player.academic_year, detainedFlag);

    const fullStats = {
      ...(stats || {}),
      battingStyle: battingHand || player.batting_style,
      bowlingStyle: bowlingProfile || player.bowling_style,
      battingPosition: battingPosition || player.batting_position,
      battingHand: battingHand || player.batting_hand,
      battingPlayingType: battingPlayingType || player.batting_playing_type,
      bowlingProfile: bowlingProfile || player.bowling_profile,
    };
    const statsJson = JSON.stringify(fullStats);
    const now = Date.now();

    execute(
      `UPDATE players
       SET name = COALESCE(?, name),
           mobile_number = COALESCE(?, mobile_number),
           email = COALESCE(?, email),
           photo_url = COALESCE(?, photo_url),
           is_detained = ?,
           bucket = ?,
           player_type = COALESCE(?, player_type),
           batting_position = COALESCE(?, batting_position),
           batting_hand = COALESCE(?, batting_hand),
           batting_playing_type = COALESCE(?, batting_playing_type),
           bowling_profile = COALESCE(?, bowling_profile),
           cricheroes_url = COALESCE(?, cricheroes_url),
           experience = COALESCE(?, experience),
           previous_acc = COALESCE(?, previous_acc),
           stats_json = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        mobileNumber ? mobileNumber.trim() : null,
        email ? email.trim() : null,
        photoUrl || null,
        detainedFlag ? 1 : 0,
        effective.effectiveBucket,
        playerType || null,
        battingPosition || null,
        battingHand || null,
        battingPlayingType || null,
        bowlingProfile || null,
        cricheroesLink || null,
        experience || null,
        previousAcc || null,
        statsJson,
        now,
        actorPlayerId,
      ]
    );

    const updated = queryOne('SELECT * FROM players WHERE id = ?', [actorPlayerId]);
    savePlayerToCloudSql(updated).catch(() => {});

    auctionManager.broadcast('STATE_UPDATED', { reason: 'PLAYER_PROFILE_UPDATED', playerId: actorPlayerId });

    res.json({
      success: true,
      message: 'Profile updated successfully and persisted to database.',
      player: {
        ...updated,
        academicCategoryLabel: formatAcademicCategory(updated.bucket),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * ADMIN APPROVAL WORKFLOW (Requirement 8)
 * ============================================================================ */

app.get('/api/admin/pending-approvals', (req: Request, res: Response) => {
  try {
    const pending = queryAll(
      `SELECT p.* FROM players p
       WHERE p.approval_status = 'PENDING'
       ORDER BY p.created_at DESC`
    );
    res.json({
      success: true,
      pending: pending.map((p) => ({
        ...p,
        academicCategoryLabel: formatAcademicCategory(p.bucket),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/approve-player', (req: Request, res: Response) => {
  try {
    const { playerId, status, rejectionReason, basePrice, session } = req.body;
    if (!playerId) return res.status(400).json({ success: false, error: 'Player ID required.' });

    const player = queryOne('SELECT * FROM players WHERE id = ?', [playerId]);
    if (!player) return res.status(404).json({ success: false, error: 'Player not found.' });

    const isApproved = status === 'APPROVED';
    const isAuctionEligible = isApproved && player.is_referred !== 1 ? 1 : 0;
    const now = Date.now();
    const assignedSession = session ? parseInt(session, 10) : (player.auction_session || 1);

    execute(
      `UPDATE players
       SET approval_status = ?,
           is_auction_eligible = ?,
           rejection_reason = ?,
           base_price = COALESCE(?, base_price),
           auction_session = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        status || 'APPROVED',
        isAuctionEligible,
        status === 'REJECTED' ? rejectionReason || 'Profile does not meet tournament criteria' : null,
        basePrice !== undefined ? parseInt(basePrice, 10) : player.base_price,
        assignedSession,
        now,
        playerId,
      ]
    );

    const updated = queryOne('SELECT * FROM players WHERE id = ?', [playerId]);
    savePlayerToCloudSql(updated).catch(() => {});

    auctionManager.broadcast('STATE_UPDATED', { reason: 'PLAYER_APPROVAL_STATUS_CHANGED', playerId, status });

    res.json({
      success: true,
      message: `Player '${player.name}' has been ${status}. Auction eligibility: ${isAuctionEligible ? 'ELIGIBLE' : 'INELIGIBLE'}.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * TWO AUCTION SESSIONS MANAGEMENT (Requirement 11)
 * ============================================================================ */

app.post('/api/admin/session/control', async (req: Request, res: Response) => {
  try {
    const { session, action, editionId, actor } = req.body;
    const edId = editionId || auctionManager.getActiveEdition()?.id || 'ED_ACC_2026';
    const targetSession = session === 2 ? 2 : 1;

    const result = await auctionManager.setAuctionSession(edId, targetSession, action || 'START', actor || 'SuperAdmin');
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/session/assign-players', (req: Request, res: Response) => {
  try {
    const { playerIds, session } = req.body;
    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return res.status(400).json({ success: false, error: 'List of player IDs required.' });
    }
    const targetSession = session === 2 ? 2 : 1;
    const now = Date.now();

    executeTransaction(() => {
      for (const pid of playerIds) {
        execute(
          `UPDATE players SET auction_session = ?, updated_at = ? WHERE id = ?`,
          [targetSession, now, pid]
        );
      }
    });

    auctionManager.broadcast('STATE_UPDATED', { reason: 'SESSION_ASSIGNMENTS_UPDATED', targetSession });

    res.json({
      success: true,
      message: `Successfully assigned ${playerIds.length} players to Session ${targetSession}.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * EXISTING FULL REGISTRATION (Supports 1-step or combined registration)
 * ============================================================================ */

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
      isDetained,
      battingPosition,
      battingHand,
      battingPlayingType,
      battingStyle: rawBattingStyle,
      bowlingProfile,
      bowlingStyle: rawBowlingStyle,
      isWicketkeeper,
      cricheroesLink,
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
    let resolvedBranch = branch || 'General';

    if (parsed.isValid && parsed.admissionYY !== undefined) {
      derivedYear = RegistrationPipeline.calculateAcademicYear(parsed.admissionYY, parsed.program || 'BTECH_REGULAR', 2026);
      resolvedBranch = parsed.branchName || resolvedBranch;
    }

    const detainedFlag = isDetained === true || isDetained === 1 || isDetained === '1';
    const effective = deriveEffectiveBucket(parsed.program || program || 'BTECH_REGULAR', derivedYear, detainedFlag);

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
    }

    const battingStyle = rawBattingStyle || battingHand || 'Right Hand Bat';
    const bowlingStyle = rawBowlingStyle || bowlingProfile || (isBat ? 'None' : 'Right-arm Medium');
    const cricHeroesUrl = cricheroesLink || '';

    const playerId = `PL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();

    const fullStats = {
      ...(stats || {}),
      battingStyle,
      bowlingStyle,
      battingPosition: battingPosition || null,
      battingHand: battingHand || null,
      battingPlayingType: battingPlayingType || null,
      bowlingProfile: bowlingProfile || null,
    };
    const statsJson = JSON.stringify(fullStats);
    const passwordHash = await bcrypt.hash(password || 'player123', 10);
    const cleanEmail = email && email.trim() ? email.trim() : `${cleanRoll.toLowerCase()}@avanthi.edu.in`;

    const randomIdentifier = `PLAYER ID: ${'ABCDEFGHJKLMNPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 24))}${Math.floor(1000 + Math.random() * 9000)}`;

    executeTransaction(() => {
      execute(
        `INSERT INTO players (
          id, edition_id, roll_number, name, email, mobile_number, photo_url,
          program, branch, academic_year, bucket, skill, player_type,
          batting_style, bowling_style, batting_position, batting_hand, batting_playing_type, bowling_profile,
          is_detained, registration_phase, approval_status, auction_session, random_identifier,
          experience, previous_acc, cricheroes_url, cricheroes_mobile, cricheroes_status, stats_json, base_price,
          payment_status, registration_status, is_auction_eligible, is_editing_blocked,
          is_referred, referral_token, referred_by_captain_id, referred_by_captain_name,
          referring_franchise_id, referring_franchise_name, referral_status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          effective.effectiveBucket,
          resolvedSkill,
          resolvedPlayerType,
          battingStyle,
          bowlingStyle,
          battingPosition || null,
          battingHand || null,
          battingPlayingType || null,
          bowlingProfile || null,
          detainedFlag ? 1 : 0,
          2,
          'PENDING',
          1,
          randomIdentifier,
          experience || '',
          previousAcc || '',
          cricHeroesUrl || '',
          cleanMobile,
          'PROFILE_VERIFIED',
          statsJson,
          resolvedBasePrice,
          'REGISTERED',
          isReferredPlayer ? 'DIRECT_ASSIGNMENT' : 'SUBMITTED_FOR_APPROVAL',
          0,
          0,
          isReferredPlayer ? 1 : 0,
          validReferralRecord ? validReferralRecord.token : null,
          validReferralRecord ? validReferralRecord.captain_id : null,
          validReferralRecord ? validReferralRecord.captain_name : null,
          validReferralRecord ? validReferralRecord.franchise_id : null,
          validReferralRecord ? validReferralRecord.franchise_name : null,
          isReferredPlayer ? 'PENDING_ADMIN_APPROVAL' : 'NONE',
          now,
          now,
        ]
      );

      if (isReferredPlayer && validReferralRecord) {
        execute(
          `UPDATE referral_tokens
           SET player_id = ?, player_name = ?, status = 'USED', verification_status = 'PENDING_ADMIN_APPROVAL'
           WHERE token = ?`,
          [playerId, name.trim(), validReferralRecord.token]
        );

        execute(
          `INSERT INTO referrals (id, edition_id, franchise_id, player_id, status, created_at)
           VALUES (?, ?, ?, ?, 'PENDING_ADMIN_APPROVAL', ?)`,
          [`REF_${now}_${playerId}`, editionId, validReferralRecord.franchise_id, playerId, now]
        );
      }

      execute(
        `INSERT INTO users (id, username, email, password_hash, role, player_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`USR_${playerId}`, cleanRoll, cleanEmail, passwordHash, 'PLAYER', playerId, now]
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
      bucket: effective.effectiveBucket,
      skill: resolvedSkill,
      player_type: resolvedPlayerType,
      is_detained: detainedFlag ? 1 : 0,
      registration_phase: 2,
      approval_status: 'PENDING',
      auction_session: 1,
      random_identifier: randomIdentifier,
      stats_json: statsJson,
      base_price: resolvedBasePrice || 0,
      is_auction_eligible: 0,
      is_referred: isReferredPlayer ? 1 : 0,
      referral_token: validReferralRecord ? validReferralRecord.token : null,
      created_at: now,
      updated_at: now,
    }).catch(() => {});

    auctionManager.broadcast('STATE_UPDATED', { reason: 'PLAYER_REGISTERED', playerId });

    res.json({
      success: true,
      playerId,
      derivedBucket: effective.effectiveBucket,
      academicCategoryLabel: effective.label,
      isDetained: detainedFlag,
      playerType: resolvedPlayerType,
      skill: resolvedSkill,
      isReferred: isReferredPlayer,
      basePrice: resolvedBasePrice,
      message: isReferredPlayer
        ? `Referred player registered! Directly assigned to franchise '${validReferralRecord.franchise_name}'.`
        : 'Player registered successfully. Pending Administrator approval before auction eligibility.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

/* ============================================================================
 * GUEST DRAW MODE (Requirement 5: Masked Identifiers)
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
 * FRANCHISE ROUTES
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
      captainName,
      captainMobile,
      captainRoll,
      captainRole,
      captainSkill,
      captainSpecialty,
      captainBattingStyle,
      captainBowlingStyle,
      captainStats,
      viceCaptainName,
      viceCaptainMobile,
      viceCaptainRoll,
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
      roll: captainRoll ? captainRoll.trim().toUpperCase() : (captainStats?.roll || ''),
      role: resolvedCaptainRole,
      specialty: resolvedCaptainSpecialty,
      battingStyle: captainBattingStyle || captainStats?.battingStyle || 'Right Hand Bat',
      bowlingStyle: captainBowlingStyle || captainStats?.bowlingStyle || 'None',
      mobile: captainMobile || '',
    };
    const captainStatsJson = JSON.stringify(captainStatsObj);

    const viceCaptainStatsObj = {
      ...(viceCaptainStats || {}),
      roll: viceCaptainRoll ? viceCaptainRoll.trim().toUpperCase() : (viceCaptainStats?.roll || ''),
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
          captain_name, vice_captain_name, captain_roll, vice_captain_roll,
          captain_mobile, captain_skill, captain_specialty, captain_batting_style, captain_bowling_style, captain_stats_json,
          vice_captain_mobile, vice_captain_skill, vice_captain_specialty, vice_captain_batting_style, vice_captain_bowling_style, vice_captain_stats_json,
          matches_played, matches_won, matches_lost, titles_won, win_percentage, franchise_stats_json,
          purse, active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          captainRoll ? captainRoll.trim().toUpperCase() : null,
          viceCaptainRoll ? viceCaptainRoll.trim().toUpperCase() : null,
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
      captain_stats_json: captainStatsJson,
      vice_captain_mobile: viceCaptainMobile || null,
      vice_captain_skill: resolvedViceCaptainRole,
      vice_captain_specialty: resolvedViceCaptainSpecialty,
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
      message: `Franchise '${name}' registered successfully!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/franchises/:id/regenerate-credentials', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.actorRole || 'SUPER_ADMIN';

    if (actorRole !== 'SUPER_ADMIN' && actorRole !== 'ADMIN' && actorRole !== 'OPERATOR') {
      return res.status(403).json({ success: false, error: 'PERMISSION_DENIED: Only administrators can regenerate franchise credentials.' });
    }

    const franchise = queryOne('SELECT * FROM franchises WHERE id = ?', [id]);
    if (!franchise) return res.status(404).json({ success: false, error: 'Franchise not found.' });

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
      }
    });

    res.json({
      success: true,
      credentials: {
        franchiseId: id,
        username: newUsername,
        password: newPassword,
        name: franchise.name,
      },
      message: `New Login ID ('${newUsername}') and Password generated for franchise '${franchise.name}'.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/franchises/:id/captain-stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const franchise = queryOne('SELECT * FROM franchises WHERE id = ?', [id]);
    if (!franchise) {
      return res.status(404).json({ success: false, error: 'Franchise not found.' });
    }

    const {
      captainName,
      captainRoll,
      captainMobile,
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
      specialty: captainSpecialty || 'Captain',
      bio: bio || '',
      battingStyle: captainBattingStyle || 'Right Hand Bat',
      bowlingStyle: captainBowlingStyle || 'None',
    };
    const captainStatsJson = JSON.stringify(statsObj);

    execute(
      `UPDATE franchises
       SET captain_name = COALESCE(?, captain_name),
           captain_roll = COALESCE(?, captain_roll),
           captain_mobile = COALESCE(?, captain_mobile),
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
        captainSpecialty ? captainSpecialty.trim() : null,
        captainBattingStyle ? captainBattingStyle.trim() : null,
        captainBowlingStyle ? captainBowlingStyle.trim() : null,
        captainCricheroesUrl ? captainCricheroesUrl.trim() : null,
        captainStatsJson,
        id,
      ]
    );

    saveFranchiseToCloudSql({
      ...franchise,
      captain_name: captainName || franchise.captain_name,
      captain_specialty: captainSpecialty || franchise.captain_specialty,
      captain_stats_json: captainStatsJson,
    }).catch(() => {});

    auctionManager.broadcast('STATE_UPDATED', { reason: 'CAPTAIN_STATS_UPDATED', franchiseId: id });

    res.json({
      success: true,
      message: 'Captain stats updated successfully and are now visible to everyone!',
      captainStats: statsObj,
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
      message: `Franchise '${franchise.name}' was permanently deleted from the database.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================================
 * REFERRAL SYSTEM (Captain Referrals - 0-5 players)
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
      captainName: referral.captain_name,
      captainMobile: referral.captain_mobile || '',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/referrals', (req: Request, res: Response) => {
  try {
    const actorRole = (req.headers['x-user-role'] as string) || (req.query?.role as string);
    if (actorRole !== 'SUPER_ADMIN' && actorRole !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'PERMISSION_DENIED: Administrator access required.' });
    }

    const referredPlayers = queryAll(
      `SELECT p.id as player_registration_id, p.name as player_name, p.roll_number, p.mobile_number, p.email,
              p.registration_status, p.is_referred, p.referral_token,
              p.referred_by_captain_name as captain_name, p.referring_franchise_name as franchise_name,
              p.referring_franchise_id as franchise_id, p.referral_status, p.bucket, p.player_type, p.created_at,
              p.stats_json, p.branch, p.program
       FROM players p
       WHERE p.is_referred = 1 OR (p.referral_status IS NOT NULL AND p.referral_status != 'NONE') OR p.referral_token IS NOT NULL
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

app.post('/api/admin/referrals/decide', (req: Request, res: Response) => {
  try {
    const { playerId, decision, basePrice } = req.body;

    if (!playerId || !decision) {
      return res.status(400).json({ success: false, error: 'Player ID and decision required.' });
    }

    const player = queryOne('SELECT * FROM players WHERE id = ?', [playerId]);
    if (!player) {
      return res.status(404).json({ success: false, error: 'Player not found.' });
    }

    const now = Date.now();
    const edId = player.edition_id || auctionManager.getActiveEdition()?.id || 'ED_ACC_2026';

    if (decision === 'ACCEPT_TO_SQUAD' || decision === 'ACCEPT') {
      const franchiseId = player.referring_franchise_id;
      if (!franchiseId) {
        return res.status(400).json({ success: false, error: 'No referring franchise assigned to this player.' });
      }

      const squadMemberId = `SQD_${now}_${player.id}`;
      executeTransaction(() => {
        execute(
          `INSERT INTO squad_members (id, edition_id, franchise_id, player_id, acquisition_type, price, round, status, timestamp, undone)
           VALUES (?, ?, ?, ?, 'DIRECT_ASSIGNMENT', 0, 1, 'ACTIVE', ?, 0)`,
          [squadMemberId, edId, franchiseId, player.id, now]
        );

        execute(
          `UPDATE players
           SET referral_status = 'APPROVED', approval_status = 'APPROVED', is_referred = 1, is_auction_eligible = 0, registration_status = 'APPROVED_SQUAD', updated_at = ?
           WHERE id = ?`,
          [now, player.id]
        );

        if (player.referral_token) {
          execute(
            `UPDATE referral_tokens SET status = 'USED', verification_status = 'APPROVED' WHERE token = ?`,
            [player.referral_token]
          );
        }
      });

      saveSquadMemberToCloudSql({
        id: squadMemberId,
        edition_id: edId,
        franchise_id: franchiseId,
        player_id: player.id,
        acquisition_type: 'DIRECT_ASSIGNMENT',
        price: 0,
        round: 1,
        status: 'ACTIVE',
        timestamp: now,
        undone: 0,
      }).catch(() => {});

      auctionManager.broadcast('STATE_UPDATED', { reason: 'REFERRAL_ACCEPTED_TO_SQUAD', playerId, franchiseId });

      return res.json({
        success: true,
        decision: 'ACCEPTED',
        message: `Referred player '${player.name}' was accepted by Admin and successfully added to ${player.referring_franchise_name || 'franchise'} squad for 0 Pts (Purse)!`,
      });
    } else {
      const resolvedBp = basePrice ? parseInt(basePrice, 10) : 20;
      executeTransaction(() => {
        execute(
          `UPDATE players
           SET referral_status = 'REJECTED_SENT_TO_AUCTION', is_referred = 0, base_price = ?, is_auction_eligible = 1, approval_status = 'APPROVED', registration_status = 'APPROVED_FOR_AUCTION', updated_at = ?
           WHERE id = ?`,
          [resolvedBp, now, player.id]
        );

        if (player.referral_token) {
          execute(
            `UPDATE referral_tokens SET status = 'REJECTED', verification_status = 'SENT_TO_AUCTION' WHERE token = ?`,
            [player.referral_token]
          );
        }
      });

      auctionManager.broadcast('STATE_UPDATED', { reason: 'REFERRAL_SENT_TO_AUCTION', playerId });

      return res.json({
        success: true,
        decision: 'SENT_TO_AUCTION',
        message: `Referral declined for '${player.name}'. Player has been assigned base price ${resolvedBp} Pts (Purse) and sent directly to the Live Auction pool!`,
      });
    }
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
 * AUCTION FLOOR & CONTROL ROUTES (Requirements 1, 2, 5, 6, 11)
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
      activeSession: auctionManager.getActiveSession(),
      sessionState: auctionManager.getSessionState(),
      customTimerAlert: auctionManager.getCustomTimerAlert(),
      isPaused: auctionManager.getIsPaused(),
      pausedRemainingMs: auctionManager.getPausedRemainingMs(),
      autoDrawMode: auctionManager.getAutoDrawMode(),
      currentDrawMode: auctionManager.getCurrentDrawMode(),
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
    if (!franchiseId) {
      return res.status(400).json({ success: false, error: 'Franchise ID is required to pass.' });
    }
    const activeEd = editionId || auctionManager.getActiveEdition()?.id || 'ED_ACC_2026';
    const franchise = queryOne(
      'SELECT id, name FROM franchises WHERE id = ? OR LOWER(custom_id) = ? OR LOWER(name) = ? LIMIT 1',
      [franchiseId, String(franchiseId).toLowerCase(), String(franchiseId).toLowerCase()]
    );
    const targetFranchiseId = franchise ? franchise.id : franchiseId;

    const lot = auctionManager.getCurrentLot(activeEd);
    if (!lot) {
      return res.status(400).json({ success: false, error: 'No active lot in auction.' });
    }

    if (lot.highest_bidder_id && lot.highest_bidder_id === targetFranchiseId) {
      return res.status(400).json({ success: false, error: 'Current winning bidder cannot pass.' });
    }

    const result = await auctionManager.passLot(targetFranchiseId, activeEd);
    auctionManager.broadcast('STATE_UPDATED', { reason: 'FRANCHISE_PASSED', franchiseId: targetFranchiseId });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/set-draw-mode', async (req: Request, res: Response) => {
  try {
    const { mode, actor } = req.body;
    const isAuto = mode === 'AUTO';
    const result = auctionManager.setAutoDrawMode(isAuto, mode || (isAuto ? 'AUTO' : 'GUEST'), actor || 'Admin');
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/auction/unsold-players', (req: Request, res: Response) => {
  try {
    const edition = auctionManager.getActiveEdition();
    const editionId = (req.query.editionId as string) || (edition ? edition.id : 'ED_ACC_2026');
    const unsoldPlayers = auctionManager.getUnsoldPlayers(editionId);
    res.json({ success: true, players: unsoldPlayers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/re-admit-unsold', async (req: Request, res: Response) => {
  try {
    const { playerId, editionId, actor } = req.body;
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.role;
    if (actorRole && actorRole !== 'SUPER_ADMIN' && actorRole !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'PERMISSION_DENIED: Only administrators can re-admit unsold players.' });
    }
    if (!playerId) {
      return res.status(400).json({ success: false, error: 'Player ID is required.' });
    }
    const activeEd = editionId || auctionManager.getActiveEdition()?.id || 'ED_ACC_2026';
    const result = await auctionManager.reAdmitUnsoldPlayer(activeEd, playerId, actor || 'Admin');
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/hammer', async (req: Request, res: Response) => {
  try {
    const { editionId, actor, action } = req.body;
    const activeEd = editionId || auctionManager.getActiveEdition()?.id || 'ED_ACC_2026';
    const result = await auctionManager.strikeHammer(activeEd, actor || 'Admin', action);
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
    const { editionId, mode, playerId, identifier, actor } = req.body;
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.role || (req.query?.role as string);
    const actorId = (req.headers['x-user-id'] as string) || req.body?.userId;

    const isSystemActor = actor === 'SystemTimer' || actor === 'SYSTEM_AUTO_TRANSITION';
    const isGuestMode = mode === 'GUEST';
    let isAuthorized = isGuestMode || isSystemActor || actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN' || actorRole === 'OPERATOR';

    if (!isAuthorized && actorId) {
      const user = queryOne('SELECT role FROM users WHERE id = ?', [actorId]);
      if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'OPERATOR')) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED: Only administrators have permission to start the auction or draw players.',
      });
    }

    const targetLotId = playerId || identifier;
    const lot = await auctionManager.drawNextPlayer(editionId, mode || 'AUTO', targetLotId, actor || actorRole || (isGuestMode ? 'Guest' : 'Admin'));
    res.json({ success: true, lot });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/draw', async (req: Request, res: Response) => {
  try {
    const { editionId, mode, playerId, identifier, actor } = req.body;
    const actorRole = (req.headers['x-user-role'] as string) || req.body?.role || (req.query?.role as string);
    const actorId = (req.headers['x-user-id'] as string) || req.body?.userId;

    const isSystemActor = actor === 'SystemTimer' || actor === 'SYSTEM_AUTO_TRANSITION';
    const isGuestMode = mode === 'GUEST';
    let isAuthorized = isGuestMode || isSystemActor || actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN' || actorRole === 'OPERATOR';

    if (!isAuthorized && actorId) {
      const user = queryOne('SELECT role FROM users WHERE id = ?', [actorId]);
      if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'OPERATOR')) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED: Only administrators have permission to start the auction or draw players.',
      });
    }

    const targetLotId = playerId || identifier;
    const lot = await auctionManager.drawNextPlayer(editionId, mode || 'AUTO', targetLotId, actor || actorRole || (isGuestMode ? 'Guest' : 'Admin'));
    res.json({ success: true, lot });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/toggle-pause', async (req: Request, res: Response) => {
  try {
    const { editionId, actor } = req.body;
    const activeEd = editionId || auctionManager.getActiveEdition()?.id || 'ED_ACC_2026';
    const result = await auctionManager.toggleAuctionPause(activeEd, actor || 'StageAdmin');
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/pause', async (req: Request, res: Response) => {
  try {
    const { editionId, actor } = req.body;
    const activeEd = editionId || auctionManager.getActiveEdition()?.id || 'ED_ACC_2026';
    if (!auctionManager.getIsPaused()) {
      const result = await auctionManager.toggleAuctionPause(activeEd, actor || 'StageAdmin');
      return res.json(result);
    }
    res.json({ success: true, isPaused: true, message: 'Auction is already paused.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auction/resume', async (req: Request, res: Response) => {
  try {
    const { editionId, actor } = req.body;
    const activeEd = editionId || auctionManager.getActiveEdition()?.id || 'ED_ACC_2026';
    if (auctionManager.getIsPaused()) {
      const result = await auctionManager.toggleAuctionPause(activeEd, actor || 'StageAdmin');
      return res.json(result);
    }
    res.json({ success: true, isPaused: false, message: 'Auction is already running.' });
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

/* ============================================================================
 * CUSTOM AUCTION TIMER ALERT (Requirement 2)
 * ============================================================================ */

app.post('/api/auction/custom-timer-alert', (req: Request, res: Response) => {
  try {
    const { durationSeconds, message } = req.body;
    const actor = (req.headers['x-user-username'] as string) || req.body?.actor || 'SuperAdmin';
    const seconds = durationSeconds ? parseInt(durationSeconds, 10) : 30;

    const alert = auctionManager.setCustomTimerAlert(seconds, message || 'Live Auction Starting Soon!', actor);
    res.json({ success: true, alert, message: `Custom auction timer alert set for ${seconds} seconds.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/auction/custom-timer-alert', (req: Request, res: Response) => {
  try {
    auctionManager.cancelCustomTimerAlert();
    res.json({ success: true, message: 'Custom timer alert cancelled.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auction/custom-timer-alert', (req: Request, res: Response) => {
  try {
    const alert = auctionManager.getCustomTimerAlert();
    res.json({ success: true, alert });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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

app.post('/api/admin/reset-system', async (req: Request, res: Response) => {
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

    await resetSystemData(actorUsername);
    auctionManager.resetAuctionState();
    auctionManager.broadcast('STATE_UPDATED', { reason: 'SYSTEM_RESET' });

    res.json({
      success: true,
      message: 'System reset completed successfully. The entire data (all players, franchises, bids, lots, sales, and squad members) has been completely deleted. You can now add fresh franchises and register fresh players.',
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
