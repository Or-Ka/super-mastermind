import type { ColorId, GuessRecord, PuzzleRules, RecommendationMode } from '../types';
import { calculateScore } from '../game-engine/score';
import type { Rng } from '../game-engine/secret';
import { computePossibleSet } from './analyze';
import { randomCode } from './enumerate';

/**
 * תקרות עבור אלגוריתם צמצום־מרבי (בהשראת Knuth):
 * מעבר לגדלים האלה עוברים אוטומטית להמלצה מתוך הפתרונות האפשריים,
 * כדי לשמור על זמן תגובה סביר גם בלי לחסום את הממשק.
 */
const MINIMAX_MAX_SOLUTIONS = 400;
const MINIMAX_EXTRA_CANDIDATES = 150;

export interface Recommendation {
  guess: ColorId[];
  /** האם הניחוש המומלץ הוא בעצמו פתרון אפשרי. */
  isPossibleSolution: boolean;
  /** תיאור קצר בעברית של סוג ההמלצה. */
  reason: string;
}

/**
 * ניחוש מומלץ לפי מצב המשחק וסוג ההמלצה שנבחר בהגדרות.
 * מחזיר null כאשר אין המלצה (mode='none') או שאין פתרונות.
 */
export function recommendGuess(
  mode: RecommendationMode,
  rules: PuzzleRules,
  history: readonly GuessRecord[],
  rng: Rng = Math.random,
): Recommendation | null {
  if (mode === 'none') return null;

  if (mode === 'random') {
    return {
      guess: randomCode(rules.activeColorIds, rules.codeLength, rules.allowDuplicates, rng),
      isPossibleSolution: false,
      reason: 'ניחוש אקראי חוקי',
    };
  }

  const possible = computePossibleSet(rules, history, rng);
  if (possible.samples.length === 0) return null;

  if (mode === 'possible' || possible.estimated || possible.count > MINIMAX_MAX_SOLUTIONS) {
    const guess = possible.samples[Math.floor(rng() * possible.samples.length)];
    return { guess: [...guess], isPossibleSolution: true, reason: 'ניחוש מתוך הפתרונות האפשריים' };
  }

  // mode === 'max-reduction' והמרחב קטן מספיק: מינימקס על גודל הקבוצה הגרועה ביותר.
  // המועמדים: כל הפתרונות האפשריים + דגימת ניחושים כלליים לאיסוף מידע.
  const solutions = possible.samples.slice(0, MINIMAX_MAX_SOLUTIONS);
  const candidates: { guess: ColorId[]; isPossible: boolean }[] = solutions.map((g) => ({
    guess: g,
    isPossible: true,
  }));
  for (let i = 0; i < MINIMAX_EXTRA_CANDIDATES; i++) {
    candidates.push({
      guess: randomCode(rules.activeColorIds, rules.codeLength, rules.allowDuplicates, rng),
      isPossible: false,
    });
  }

  let best: { guess: ColorId[]; isPossible: boolean; worst: number } | null = null;
  for (const candidate of candidates) {
    // חלוקת הפתרונות לפי התוצאה שכל אחד היה מחזיר לניחוש המועמד.
    const partition = new Map<string, number>();
    for (const solution of solutions) {
      const score = calculateScore(solution, candidate.guess);
      const key = `${score.bulls}:${score.hits}`;
      partition.set(key, (partition.get(key) ?? 0) + 1);
    }
    const worst = Math.max(...partition.values());
    if (
      best === null ||
      worst < best.worst ||
      (worst === best.worst && candidate.isPossible && !best.isPossible)
    ) {
      best = { ...candidate, worst };
    }
  }

  if (!best) return null;
  return {
    guess: [...best.guess],
    isPossibleSolution: best.isPossible,
    reason: best.isPossible
      ? 'ניחוש שממקסם צמצום והוא גם פתרון אפשרי'
      : 'ניחוש לאיסוף מידע — ממקסם צמצום אפשרויות',
  };
}
