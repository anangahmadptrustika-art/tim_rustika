import type { Difficulty, ScoringConfig } from '@prisma/client';
import { calendarDaysBetween } from './datetime';

/**
 * Rustika Scoring Engine
 * ----------------------
 * Deterministic, pure functions that compute the points awarded for a task and
 * whether a compensation obligation is triggered. Kept side-effect free so it
 * can be unit-tested and reused by the API, cron jobs, and the seed script.
 *
 * Formula:
 *   adjustedBase   = round(basePoints * difficultyMultiplier * weight)
 *   earlyBonus     = min(daysEarly  * earlyBonusPerDay,  earlyBonusCap)
 *   latePenalty    = min(daysLate   * latePenaltyPerDay, latePenaltyCap)
 *   netPoints      = adjustedBase + earlyBonus - latePenalty
 */

export interface ScoreInput {
  basePoints: number;
  difficulty: Difficulty;
  weight: number;
  deadline: Date;
  completedAt: Date;
  config: ScoringConfig;
}

export interface ScoreBreakdown {
  adjustedBase: number;
  difficultyMultiplier: number;
  weight: number;
  daysEarly: number;
  daysLate: number;
  earlyBonus: number;
  latePenalty: number;
  netPoints: number;
  wasLate: boolean;
  // compensation
  compensationRequired: boolean;
  requiredWorkdays: number;
  pointsToRestore: number;
}

export function difficultyMultiplier(difficulty: Difficulty, config: ScoringConfig): number {
  switch (difficulty) {
    case 'TRIVIAL':
      return config.multTrivial;
    case 'EASY':
      return config.multEasy;
    case 'MEDIUM':
      return config.multMedium;
    case 'HARD':
      return config.multHard;
    case 'CRITICAL':
      return config.multCritical;
    default:
      return 1;
  }
}

export function computeScore(input: ScoreInput): ScoreBreakdown {
  const { basePoints, difficulty, weight, deadline, completedAt, config } = input;

  const mult = difficultyMultiplier(difficulty, config);
  const adjustedBase = Math.round(basePoints * mult * weight);

  // Positive => early, negative => late.
  const delta = calendarDaysBetween(deadline, completedAt); // completedAt - deadline
  const daysLate = Math.max(0, delta);
  const daysEarly = Math.max(0, -delta);

  const earlyBonus = Math.min(daysEarly * config.earlyBonusPerDay, config.earlyBonusCap);
  const latePenalty = Math.min(daysLate * config.latePenaltyPerDay, config.latePenaltyCap);

  const netPoints = adjustedBase + earlyBonus - latePenalty;
  const wasLate = daysLate > 0;

  const compensationRequired = daysLate >= config.compensationThresholdDays;
  const requiredWorkdays = compensationRequired
    ? Math.ceil(daysLate * config.compensationDaysPerLateDay)
    : 0;
  // Penalty becomes recoverable once the compensation is verified.
  const pointsToRestore = compensationRequired ? latePenalty : 0;

  return {
    adjustedBase,
    difficultyMultiplier: mult,
    weight,
    daysEarly,
    daysLate,
    earlyBonus,
    latePenalty,
    netPoints,
    wasLate,
    compensationRequired,
    requiredWorkdays,
    pointsToRestore,
  };
}

/** Convert a point total to rupiah using the active conversion rate. */
export function pointsToRupiah(points: number, rupiahPerPoint: number): number {
  return Math.max(0, points) * rupiahPerPoint;
}
