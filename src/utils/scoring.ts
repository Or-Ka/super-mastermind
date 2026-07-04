import type { GameRules } from '../types';
import { totalSpaceSize } from '../solver/enumerate';

export interface ScoreInput {
  rules: GameRules;
  won: boolean;
  attemptsUsed: number;
  durationSeconds: number;
  hintsUsed: number;
}

/** עלות רמז בנקודות. */
export const HINT_PENALTY = 75;

/**
 * חישוב ניקוד משחק.
 *
 * הנוסחה:
 * - בסיס לפי קושי: log2 של גודל מרחב האפשרויות × 100
 *   (מרחב גדול יותר = משחק קשה יותר = יותר נקודות).
 * - בונוס על ניסיונות שנחסכו: 50 נקודות לכל ניסיון שנותר.
 * - בונוס זמן: עד 200 נקודות למשחק מהיר (דועך אחרי 3 דקות).
 * - קנס רמזים: 75 נקודות לרמז.
 * - הפסד = 0 נקודות.
 */
export function calculateGameScore(input: ScoreInput): number {
  if (!input.won) return 0;
  const { rules } = input;
  const space = totalSpaceSize(rules.activeColorIds.length, rules.codeLength, rules.allowDuplicates);
  const base = Math.round(Math.log2(Math.max(2, space)) * 100);
  const attemptsBonus = Math.max(0, rules.maxAttempts - input.attemptsUsed) * 50;
  const timeBonus = Math.max(0, Math.round(200 * (1 - Math.min(input.durationSeconds, 180) / 180)));
  const hintPenalty = input.hintsUsed * HINT_PENALTY;
  return Math.max(0, base + attemptsBonus + timeBonus - hintPenalty);
}
