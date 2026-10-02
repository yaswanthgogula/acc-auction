/**
 * ============================================================================
 * ACC ENGINES -- COMBINED SINGLE-FILE BUNDLE
 * ============================================================================
 * Source of truth: Official ACC Hackathon Problem Statement and domain pipelines
 * Combines AuctionPipeline, AuctionPortalEngine, RegistrationPipeline, DomainLogicPipeline
 */

import { formatAcademicCategory, normalizeCategoryCode } from '../utils/academicCategories';

export namespace AuctionPipeline {
  export const FRANCHISE_COUNT = 11;
  export const INITIAL_PURSE = 1000;
  export const MIN_AUCTION_PURCHASES = 15;
  export const MIN_SQUAD_SIZE = 18;
  export const MAX_SQUAD_SIZE = 22;
  export const RETAINED_PLAYERS = 2;
  export const MAX_REFERRED_PLAYERS = 5;
  export const BUCKET_MINIMUM = 2;

  export const MANDATORY_BUCKETS = ['B1', 'B2', 'B3', 'B4', 'B5'] as const;
  export type MandatoryBucket = typeof MANDATORY_BUCKETS[number];

  export const PG_BUCKET = 'PG';
  export type Bucket = MandatoryBucket | typeof PG_BUCKET | string;

  export const DRAW_ORDER_ROUND_1 = ['B3', 'B4', 'B2', 'B5', 'B1', 'PG'] as const;

  export const FIRST_BID_TIMER_SECONDS = 30;
  export const SUBSEQUENT_BID_TIMER_SECONDS = 20;
  export const FIRST_BID_TIMER_MS = FIRST_BID_TIMER_SECONDS * 1000;
  export const SUBSEQUENT_BID_TIMER_MS = SUBSEQUENT_BID_TIMER_SECONDS * 1000;

  export const ROUND_2_BASE_PRICE = 20;
  export const MIN_BASE_PRICE = 20;
  export const MAX_BASE_PRICE = 250;
  export const DIRECT_SIGNING_PRICE = 20;
  export const ALLOTMENT_PRICE = 20;
  export const SCOUTING_PRICE = 20;

  export enum PlayerLotState {
    AVAILABLE = 'AVAILABLE',
    CALLED = 'CALLED',
    IN_AUCTION = 'IN_AUCTION',
    SKIPPED = 'SKIPPED',
    SOLD = 'SOLD',
    UNSOLD = 'UNSOLD',
    ALLOTTED = 'ALLOTTED',
    CARRIED_TO_ROUND_2 = 'CARRIED_TO_ROUND_2',
  }

  export enum FranchiseParticipationState {
    IN_PLAY = 'IN_PLAY',
    PASSED = 'PASSED',
    BLOCKED = 'BLOCKED',
    NOT_ACTIVE = 'NOT_ACTIVE',
    NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  }

  export enum EventType {
    AUCTION_STARTED = 'AUCTION_STARTED',
    PLAYER_CALLED = 'PLAYER_CALLED',
    PLAYER_SKIPPED = 'PLAYER_SKIPPED',
    BID_PLACED = 'BID_PLACED',
    PLAYER_PASSED = 'PLAYER_PASSED',
    PLAYER_REENTERED = 'PLAYER_REENTERED',
    HAMMER_SALE = 'HAMMER_SALE',
    PLAYER_UNSOLD = 'PLAYER_UNSOLD',
    AUCTION_PAUSED = 'AUCTION_PAUSED',
    AUCTION_RESUMED = 'AUCTION_RESUMED',
    ADMIN_BID = 'ADMIN_BID',
    SALE_UNDO = 'SALE_UNDO',
    PLAYER_ALLOTTED = 'PLAYER_ALLOTTED',
    SCARCITY_WARNING = 'SCARCITY_WARNING',
    BUCKET_RELAXED = 'BUCKET_RELAXED',
    DIRECT_ASSIGNMENT = 'DIRECT_ASSIGNMENT',
  }

  export enum DrawMode {
    GUEST_MODE = 'GUEST_MODE',
    AUTO_MODE = 'AUTO_MODE',
  }

  export enum SaleType {
    HAMMER_SALE = 'HAMMER_SALE',
    ALLOTTED = 'ALLOTTED',
    DIRECT_ASSIGNMENT = 'DIRECT_ASSIGNMENT',
  }

  export interface Player {
    id: string;
    name: string;
    bucket: Bucket;
    basePrice: number;
    drawNumber?: number;
    lotState: PlayerLotState;
    ownerFranchiseId?: string | null;
    soldPrice?: number | null;
    saleType?: SaleType | null;
    editionId: string;
    isRetained?: boolean;
    isReferred?: boolean;
    skippedCount?: number;
    round: 1 | 2;
    originalBasePrice: number;
  }

  export interface Franchise {
    id: string;
    name: string;
    editionId: string;
    purse: number;
    auctionPurchasesCount: number;
    retainedCount: number;
    referredCount: number;
    squadPlayerIds: string[];
    bucketCounts: Record<string, number>;
    active: boolean;
    hasPassedCurrentLot: boolean;
  }

  export interface BidRecord {
    franchiseId: string;
    amount: number;
    timestamp: number;
    sequence: number;
  }

  export interface CurrentLot {
    player: Player;
    currentPrice: number;
    highestBidder: string | null;
    bidCount: number;
    bidHistory: BidRecord[];
    deadlineMs: number | null;
    startedAt: number;
    lastBidAt?: number;
    stateVersion: number;
  }

  export function getBidIncrement(currentPrice: number): number {
    if (currentPrice < 100) return 10;
    if (currentPrice < 200) return 20;
    return 30;
  }

  export function calculateNextLegalBid(currentPrice: number, hasBidder: boolean): number {
    if (!hasBidder) return currentPrice;
    return currentPrice + getBidIncrement(currentPrice);
  }

  export function validateBasePrice(price: number): boolean {
    return price >= MIN_BASE_PRICE && price <= MAX_BASE_PRICE;
  }

  export function calculateBucketNeeds(
    franchise: Franchise,
    bucketMinimums: Record<string, number> = {}
  ): { needsByBucket: Record<string, number>; totalMandatoryNeeds: number } {
    const needsByBucket: Record<string, number> = {};
    let totalMandatoryNeeds = 0;
    for (const rawBucket of MANDATORY_BUCKETS) {
      const bucket = normalizeCategoryCode(rawBucket);
      const minRequired = bucketMinimums[bucket] !== undefined ? bucketMinimums[bucket] : BUCKET_MINIMUM;
      const currentCount = franchise.bucketCounts[bucket] || 0;
      const need = Math.max(0, minRequired - currentCount);
      needsByBucket[bucket] = need;
      totalMandatoryNeeds += need;
    }
    return { needsByBucket, totalMandatoryNeeds };
  }

  export function calculateMaximumPermissibleBid(
    franchise: Franchise,
    targetPlayerBucket: Bucket,
    options?: { bucketMinimums?: Record<string, number>; minAuctionPurchases?: number; maxSquadSize?: number }
  ): number {
    const minPurchases = options?.minAuctionPurchases ?? MIN_AUCTION_PURCHASES;
    const maxSquad = options?.maxSquadSize ?? MAX_SQUAD_SIZE;
    const bucketMinimums = options?.bucketMinimums ?? {};

    const currentSquadSize = franchise.squadPlayerIds.length;
    if (currentSquadSize >= maxSquad) return 0;

    const normTargetBucket = normalizeCategoryCode(targetPlayerBucket);
    const { needsByBucket, totalMandatoryNeeds } = calculateBucketNeeds(franchise, bucketMinimums);
    const isMandatory = MANDATORY_BUCKETS.includes(normTargetBucket as any);
    const targetBucketNeed = isMandatory ? (needsByBucket[normTargetBucket] || 0) : 0;
    const satisfiesMandatory = targetBucketNeed > 0;

    const remainingMandatoryNeedsAfter = satisfiesMandatory
      ? totalMandatoryNeeds - 1
      : totalMandatoryNeeds;

    const purchasesAfter = franchise.auctionPurchasesCount + 1;
    const remainingTo15After = Math.max(0, minPurchases - purchasesAfter);

    if (currentSquadSize + 1 + remainingMandatoryNeedsAfter > maxSquad) return 0;

    const futurePurchasesNeeded = Math.max(remainingTo15After, remainingMandatoryNeedsAfter);
    const minimumFutureCost = futurePurchasesNeeded * MIN_BASE_PRICE;
    const maxBid = franchise.purse - minimumFutureCost;

    return Math.max(0, maxBid);
  }

  export function simulateGenericFeasibility(
    availableSlots: number,
    currentNeeds: Record<string, number>,
    playerCategory: string
  ) {
    if (availableSlots <= 0) {
      return {
        feasible: false,
        reason: 'No available slots remaining.',
        remainingSlotsAfter: 0,
        totalNeedsAfter: Object.values(currentNeeds).reduce((a, b) => a + Math.max(0, b), 0),
      };
    }
    const slotsAfter = availableSlots - 1;
    const needsAfter = { ...currentNeeds };
    const normCategory = normalizeCategoryCode(playerCategory);
    const currentNeed = needsAfter[normCategory] || 0;
    if (currentNeed > 0) {
      needsAfter[normCategory] = currentNeed - 1;
    }
    const totalNeedsAfter = Object.values(needsAfter).reduce((sum, n) => sum + Math.max(0, n), 0);
    if (slotsAfter < totalNeedsAfter) {
      return {
        feasible: false,
        reason: `Insufficient slots remaining (${slotsAfter}) to fulfill required mandatory bucket needs (${totalNeedsAfter}).`,
        remainingSlotsAfter: slotsAfter,
        totalNeedsAfter,
      };
    }
    return { feasible: true, remainingSlotsAfter: slotsAfter, totalNeedsAfter };
  }

  export function checkFranchiseFeasibility(
    franchise: Franchise,
    player: Player,
    bucketMinimums: Record<string, number> = {}
  ) {
    const currentSquadSize = franchise.squadPlayerIds.length;
    if (currentSquadSize >= MAX_SQUAD_SIZE) {
      return { feasible: false, reason: `Squad size limit of ${MAX_SQUAD_SIZE} reached.` };
    }
    if (player.isReferred && franchise.referredCount >= MAX_REFERRED_PLAYERS) {
      return { feasible: false, reason: `Max referred players limit of ${MAX_REFERRED_PLAYERS} reached.` };
    }
    const { needsByBucket } = calculateBucketNeeds(franchise, bucketMinimums);
    const remainingSquadSlots = MAX_SQUAD_SIZE - currentSquadSize;
    const squadFeasibility = simulateGenericFeasibility(remainingSquadSlots, needsByBucket, player.bucket);
    if (!squadFeasibility.feasible) return squadFeasibility;

    if (franchise.auctionPurchasesCount < MIN_AUCTION_PURCHASES) {
      const remainingTo15 = MIN_AUCTION_PURCHASES - franchise.auctionPurchasesCount;
      const auctionFeasibility = simulateGenericFeasibility(remainingTo15, needsByBucket, player.bucket);
      if (!auctionFeasibility.feasible) return auctionFeasibility;
    }
    return { feasible: true, remainingSlotsAfter: remainingSquadSlots - 1, totalNeedsAfter: squadFeasibility.totalNeedsAfter };
  }
}

export namespace RegistrationPipeline {
  export const ALLOWED_BASE_PRICES = [
    20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 230, 250
  ] as const;

  export const BTECH_BRANCHES: Record<string, { name: string; shortCode: string }> = {
    '02': { name: 'Electrical & Electronics Engineering', shortCode: 'EEE' },
    '03': { name: 'Mechanical Engineering', shortCode: 'ME' },
    '04': { name: 'Electronics & Communication Engineering', shortCode: 'ECE' },
    '05': { name: 'Computer Science & Engineering', shortCode: 'CSE' },
    '42': { name: 'Computer Science and Machine Learning', shortCode: 'CSM' },
    '44': { name: 'Computer Science and Data Science', shortCode: 'CSD' },
  };

  export const DIPLOMA_BRANCHES: Record<string, { name: string; shortCode: string }> = {
    CM: { name: 'Computer Engineering', shortCode: 'CM' },
    EC: { name: 'Electronics & Communication', shortCode: 'EC' },
    EE: { name: 'Electrical', shortCode: 'EE' },
    M: { name: 'Mechanical', shortCode: 'M' },
  };

  export const ROLL_PATTERNS = {
    BTECH_REGULAR: /^(\d{2})811A([0-9A-Z]{2})([0-9A-Z]{2})$/i,
    BTECH_LATERAL: /^(\d{2})815A([0-9A-Z]{2})([0-9A-Z]{2})$/i,
    DIPLOMA: /^(\d{2})597-([A-Z]+)-([0-9A-Z]{3})$/i,
  };

  export function getAcademicAdmissionYearFromDate(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    if (month > 7 || (month === 7 && day >= 1)) return year;
    return year - 1;
  }

  export function parseRollNumber(
    rawRoll: string,
    programType?: string,
    pgDetails?: { program: string; specialization: string; isVerified?: boolean }
  ) {
    const roll = (rawRoll || '').trim().toUpperCase();
    if (!roll) return { isValid: false, error: 'Roll number is required.' };

    if (programType === 'PG') {
      if (!pgDetails || !pgDetails.program || !pgDetails.specialization) {
        return { isValid: false, error: 'PG students must provide program and specialization.' };
      }
      const match = roll.match(/^(\d{2})/);
      const admissionYY = match ? parseInt(match[1], 10) : undefined;
      return {
        isValid: true,
        program: 'PG',
        admissionYY,
        admissionYear: admissionYY ? 2000 + admissionYY : undefined,
        branchCode: pgDetails.specialization,
        branchName: `${pgDetails.program} (${pgDetails.specialization})`,
      };
    }

    const regMatch = roll.match(ROLL_PATTERNS.BTECH_REGULAR);
    if (regMatch) {
      const admissionYY = parseInt(regMatch[1], 10);
      const branchCode = regMatch[2];
      const branch = BTECH_BRANCHES[branchCode];
      if (!branch) return { isValid: false, error: `Invalid B.Tech regular branch code '${branchCode}'.` };
      return {
        isValid: true,
        program: 'BTECH_REGULAR',
        admissionYY,
        admissionYear: 2000 + admissionYY,
        branchCode,
        branchName: branch.name,
      };
    }

    const latMatch = roll.match(ROLL_PATTERNS.BTECH_LATERAL);
    if (latMatch) {
      const admissionYY = parseInt(latMatch[1], 10);
      const branchCode = latMatch[2];
      const branch = BTECH_BRANCHES[branchCode];
      if (!branch) return { isValid: false, error: `Invalid B.Tech lateral branch code '${branchCode}'.` };
      return {
        isValid: true,
        program: 'BTECH_LATERAL',
        admissionYY,
        admissionYear: 2000 + admissionYY,
        branchCode,
        branchName: branch.name,
      };
    }

    const dipMatch = roll.match(ROLL_PATTERNS.DIPLOMA);
    if (dipMatch) {
      const admissionYY = parseInt(dipMatch[1], 10);
      const branchCode = dipMatch[2];
      const branch = DIPLOMA_BRANCHES[branchCode];
      if (!branch) return { isValid: false, error: `Invalid Diploma branch code '${branchCode}'.` };
      return {
        isValid: true,
        program: 'DIPLOMA',
        admissionYY,
        admissionYear: 2000 + admissionYY,
        branchCode,
        branchName: branch.name,
      };
    }

    return { isValid: false, error: `Malformed roll number format '${roll}'.` };
  }

  export function calculateAcademicYear(
    admissionYY: number,
    program: string,
    currentAcademicYear: number = 2026
  ): number {
    const currentYY = currentAcademicYear % 100;
    if (program === 'BTECH_REGULAR') return (currentYY - admissionYY) + 1;
    if (program === 'BTECH_LATERAL') return (currentYY - admissionYY) + 2;
    if (program === 'DIPLOMA') return (currentYY - admissionYY) + 1;
    return Math.max(1, (currentYY - admissionYY) + 1);
  }

  export function deriveBucket(program: string, derivedYear: number): string | null {
    if (program === 'PG') return null;
    if (program === 'DIPLOMA') return 'B5';
    if (program === 'BTECH_REGULAR' || program === 'BTECH_LATERAL') {
      if (derivedYear === 1) return 'B1';
      if (derivedYear === 2) return 'B2';
      if (derivedYear === 3) return 'B3';
      if (derivedYear === 4) return 'B4';
    }
    return null;
  }

  export function derivePlayerType(skills: {
    role?: string;
    skill?: string;
    playerType?: string;
    batting?: { enabled: boolean };
    bowling?: { enabled: boolean };
    wicketkeeper?: boolean;
    isFielderOnlyConfirmed?: boolean;
  } | string): string {
    if (typeof skills === 'string') {
      const s = skills.toUpperCase();
      if (s.includes('WICKET') || s.includes('KEEPER')) return 'Wicket-Keeper';
      if (s === 'BOWLER' || (s.includes('BOWL') && !s.includes('ALL'))) return 'Bowler';
      if (s === 'BATSMAN' || s === 'BATTER' || (s.includes('BAT') && !s.includes('ALL'))) return 'Batter';
      return 'All-Rounder';
    }

    const explicit = (skills?.playerType || skills?.role || skills?.skill || '').toUpperCase();
    if (explicit.includes('WICKET') || explicit.includes('KEEPER') || skills?.wicketkeeper) {
      return 'Wicket-Keeper';
    }
    if (explicit === 'BOWLER' || (explicit.includes('BOWL') && !explicit.includes('ALL'))) {
      return 'Bowler';
    }
    if (explicit === 'BATSMAN' || explicit === 'BATTER' || (explicit.includes('BAT') && !explicit.includes('ALL'))) {
      return 'Batter';
    }
    if (explicit.includes('ALL')) {
      return 'All-Rounder';
    }

    const isBatter = Boolean(skills?.batting?.enabled);
    const isBowler = Boolean(skills?.bowling?.enabled);
    const isWK = Boolean(skills?.wicketkeeper);

    if (isWK) return 'Wicket-Keeper';
    if (isBatter && isBowler) return 'All-Rounder';
    if (isBatter && !isBowler) return 'Batter';
    if (!isBatter && isBowler) return 'Bowler';
    if (skills?.isFielderOnlyConfirmed) return 'Fielder';
    return 'All-Rounder';
  }
}

export function parseAvanthiRollNumber(rawRoll: string) {
  const res = RegistrationPipeline.parseRollNumber(rawRoll);
  if (!res.isValid) {
    return { valid: false, error: res.error };
  }
  const derivedYear = res.admissionYY ? RegistrationPipeline.calculateAcademicYear(res.admissionYY, res.program || '') : 1;
  const bucket = RegistrationPipeline.deriveBucket(res.program || '', derivedYear) || 'PG';
  return {
    valid: true,
    branch: res.branchName || res.branchCode,
    program: res.program,
    academicYear: derivedYear,
    bucket,
    academicCategoryLabel: formatAcademicCategory(bucket),
  };
}
