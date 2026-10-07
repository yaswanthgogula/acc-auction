/**
 * ============================================================================
 * ACC ACADEMIC CATEGORY LABELS & MAPPING UTILITIES
 * ============================================================================
 * Standard Category Mapping:
 * B1 -> 1st Year B.Tech
 * B2 -> 2nd Year B.Tech
 * B3 -> 3rd Year B.Tech
 * B4 -> 4th Year B.Tech
 * B5 -> Diploma - D
 * PG -> PG - P
 *
 * Auction Bucket Order (Requirement 1 - strictly fixed):
 * 1. 3rd Year B.Tech (B3)
 * 2. 4th Year B.Tech (B4)
 * 3. 2nd Year B.Tech (B2)
 * 4. Diploma (B5)
 * 5. PG (PG)
 * 6. 1st Year B.Tech (B1)
 *
 * Detained Rule (Requirement 3):
 * If a student is detained in their current academic year, they must be
 * placed into the previous year's bucket.
 * 3rd Year B.Tech + Detained = YES -> 2nd Year B.Tech (B2)
 * 4th Year B.Tech + Detained = YES -> 3rd Year B.Tech (B3)
 * 2nd Year B.Tech + Detained = YES -> 1st Year B.Tech (B1)
 */

export interface AcademicCategoryInfo {
  code: string;
  label: string;
  shortLabel: string;
  minQuota: number;
  color: string;
  description: string;
}

export const STRICT_BUCKET_AUCTION_ORDER = ['B3', 'B4', 'B2', 'B5', 'PG', 'B1'] as const;

export const ACADEMIC_CATEGORIES: Record<string, AcademicCategoryInfo> = {
  B3: {
    code: 'B3',
    label: '3rd Year B.Tech',
    shortLabel: '3rd Yr B.Tech',
    minQuota: 2,
    color: 'from-amber-600 to-yellow-400',
    description: 'Pre-final year undergraduates',
  },
  B4: {
    code: 'B4',
    label: '4th Year B.Tech',
    shortLabel: '4th Yr B.Tech',
    minQuota: 2,
    color: 'from-purple-600 to-violet-400',
    description: 'Final year senior undergraduates',
  },
  B2: {
    code: 'B2',
    label: '2nd Year B.Tech',
    shortLabel: '2nd Yr B.Tech',
    minQuota: 2,
    color: 'from-emerald-600 to-teal-400',
    description: 'Sophomore undergraduates',
  },
  B5: {
    code: 'B5',
    label: 'Diploma - D',
    shortLabel: 'Diploma - D',
    minQuota: 2,
    color: 'from-orange-600 to-rose-400',
    description: 'Polytechnic Diploma students',
  },
  PG: {
    code: 'PG',
    label: 'PG - P',
    shortLabel: 'PG - P',
    minQuota: 0,
    color: 'from-indigo-600 to-pink-500',
    description: 'Postgraduate students (MBA / MCA / M.Tech)',
  },
  B1: {
    code: 'B1',
    label: '1st Year B.Tech',
    shortLabel: '1st Yr B.Tech',
    minQuota: 2,
    color: 'from-blue-600 to-cyan-400',
    description: 'Freshmen undergraduates',
  },
};

export function formatAcademicCategory(bucketOrLabel: string | null | undefined): string {
  if (!bucketOrLabel) return 'PG - P';
  const clean = bucketOrLabel.trim();

  if (ACADEMIC_CATEGORIES[clean]) {
    return ACADEMIC_CATEGORIES[clean].label;
  }

  const upper = clean.toUpperCase();
  if (upper.includes('3RD') || upper === 'B3') return '3rd Year B.Tech';
  if (upper.includes('4TH') || upper === 'B4') return '4th Year B.Tech';
  if (upper.includes('2ND') || upper === 'B2') return '2nd Year B.Tech';
  if (upper.includes('DIPLOMA') || upper === 'B5') return 'Diploma - D';
  if (upper.includes('PG') || upper.includes('POST')) return 'PG - P';
  if (upper.includes('1ST') || upper === 'B1') return '1st Year B.Tech';

  return clean;
}

export function normalizeCategoryCode(input: string | null | undefined): string {
  if (!input) return 'PG';
  const clean = input.trim().toUpperCase();
  if (clean === 'B3' || clean.includes('3RD')) return 'B3';
  if (clean === 'B4' || clean.includes('4TH')) return 'B4';
  if (clean === 'B2' || clean.includes('2ND')) return 'B2';
  if (clean === 'B5' || clean.includes('DIPLOMA')) return 'B5';
  if (clean === 'PG' || clean.includes('POST')) return 'PG';
  if (clean === 'B1' || clean.includes('1ST')) return 'B1';
  return 'PG';
}

/**
 * Requirement 3: Detained student logic.
 * If a student is detained in their current academic year, they must be deduced to the lower bucket by 1.
 */
export function deriveEffectiveBucket(
  program: string,
  academicYear: number,
  isDetained: boolean
): {
  effectiveYear: number;
  originalBucket: string;
  effectiveBucket: string;
  label: string;
  originalLabel: string;
  isDeducted: boolean;
  deductionExplanation: string;
} {
  const progUpper = (program || '').toUpperCase();
  let effectiveYear = academicYear;

  // 1. Derive normal bucket without detention
  let normalBucket = 'PG';
  if (progUpper === 'DIPLOMA') {
    normalBucket = 'B5';
  } else if (progUpper === 'PG') {
    normalBucket = 'PG';
  } else {
    // Year >= 4 (4th/5th/6th, detained laterals, seniors) must not occupy UG B1–B4 quotas.
    if (academicYear === 1) normalBucket = 'B1';
    else if (academicYear === 2) normalBucket = 'B2';
    else if (academicYear === 3) normalBucket = 'B3';
    else if (academicYear >= 4) normalBucket = 'PG';
    else normalBucket = 'B1';
  }

  let effectiveBucket = normalBucket;
  let isDeducted = false;
  let deductionExplanation = 'Standard academic bucket assignment';

  // 2. If detained: deduce to the lower bucket by 1
  if (isDetained) {
    isDeducted = true;
    effectiveYear = Math.max(1, academicYear - 1);
    if (progUpper === 'DIPLOMA') {
      // Diploma detained moves to lower bucket B1
      effectiveBucket = 'B1';
      deductionExplanation = 'Detained student deduction: Moved from Diploma (B5) to lower bucket 1st Year (B1)';
    } else if (progUpper === 'PG') {
      effectiveBucket = 'B1';
      deductionExplanation = 'Detained student deduction: Moved from PG (PG) to lower bucket 1st Year (B1)';
    } else {
      if (effectiveYear === 1) effectiveBucket = 'B1';
      else if (effectiveYear === 2) effectiveBucket = 'B2';
      else if (effectiveYear === 3) effectiveBucket = 'B3';
      else if (effectiveYear >= 4) effectiveBucket = 'PG';
      else effectiveBucket = 'B1';
      deductionExplanation = `Detained student deduction: Deduced to lower bucket by 1 (${formatAcademicCategory(normalBucket)} ➔ ${formatAcademicCategory(effectiveBucket)})`;
    }
  }

  return {
    effectiveYear,
    originalBucket: normalBucket,
    effectiveBucket,
    label: formatAcademicCategory(effectiveBucket),
    originalLabel: formatAcademicCategory(normalBucket),
    isDeducted,
    deductionExplanation,
  };
}

export const ACADEMIC_CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'B3', label: '1. 3rd Year B.Tech' },
  { value: 'B4', label: '2. 4th Year B.Tech' },
  { value: 'B2', label: '3. 2nd Year B.Tech' },
  { value: 'B5', label: '4. Diploma - D' },
  { value: 'PG', label: '5. PG - P' },
  { value: 'B1', label: '6. 1st Year B.Tech' },
];
