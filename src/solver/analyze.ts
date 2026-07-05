import type { AnalysisResult, ColorId, GuessRecord, PositionFacts, PuzzleRules } from '../types';
import { calculateScore, scoresEqual } from '../game-engine/score';
import type { Rng } from '../game-engine/secret';
import { enumerateAllCodes, randomCode, totalSpaceSize } from './enumerate';

/**
 * תקרות חישוב:
 * עד EXACT_LIMIT רצפים — מנייה מלאה ותוצאה מדויקת.
 * מעבר לכך — דגימה אקראית והערכה סטטיסטית (estimated=true),
 * כדי לא לחסום את ה־Worker לזמן ארוך מדי.
 */
export const EXACT_LIMIT = 1_000_000;
export const SAMPLE_SIZE = 60_000;
/** כמה פתרונות לדוגמה נשמרים עבור התצוגה והרמזים. */
export const SAMPLE_KEEP = 200;

export interface PossibleSetResult {
  count: number;
  estimated: boolean;
  samples: ColorId[][];
  facts: PositionFacts | null;
}

/** האם רצף מועמד עקבי עם כל היסטוריית הניחושים. */
export function isCandidateConsistent(candidate: readonly ColorId[], history: readonly GuessRecord[]): boolean {
  for (const record of history) {
    if (!scoresEqual(calculateScore(candidate, record.guess), record.score)) return false;
  }
  return true;
}

/** בניית עובדות מיקום מתוך אוסף פתרונות (מלא או דגום). */
function buildFacts(
  solutions: ColorId[][],
  rules: PuzzleRules,
): PositionFacts | null {
  if (solutions.length === 0) return null;
  const perPosition: Set<ColorId>[] = Array.from({ length: rules.codeLength }, () => new Set());
  let mustAppear: Set<ColorId> | null = null;
  const everAppear = new Set<ColorId>();

  for (const sol of solutions) {
    const colorsInSol = new Set(sol);
    for (let i = 0; i < sol.length; i++) perPosition[i].add(sol[i]);
    for (const c of colorsInSol) everAppear.add(c);
    if (mustAppear === null) {
      mustAppear = colorsInSol;
    } else {
      const previous: ColorId[] = [...mustAppear];
      mustAppear = new Set(previous.filter((c) => colorsInSol.has(c)));
    }
  }

  const fixedPositions: { position: number; colorId: ColorId }[] = [];
  perPosition.forEach((set, position) => {
    if (set.size === 1) fixedPositions.push({ position, colorId: [...set][0] });
  });

  return {
    possibleColorsPerPosition: perPosition.map((s) => [...s]),
    mustAppear: [...(mustAppear ?? new Set<ColorId>())],
    neverAppear: rules.activeColorIds.filter((c) => !everAppear.has(c)),
    fixedPositions,
  };
}

/**
 * חישוב קבוצת הפתרונות האפשריים עבור היסטוריה נתונה.
 * במרחב קטן — מנייה מלאה; במרחב גדול — דגימה והערכה.
 */
export function computePossibleSet(
  rules: PuzzleRules,
  history: readonly GuessRecord[],
  rng: Rng = Math.random,
): PossibleSetResult {
  const total = totalSpaceSize(rules.activeColorIds.length, rules.codeLength, rules.allowDuplicates);

  if (total <= EXACT_LIMIT) {
    let count = 0;
    const samples: ColorId[][] = [];
    const allMatching: ColorId[][] = [];
    for (const candidate of enumerateAllCodes(rules.activeColorIds, rules.codeLength, rules.allowDuplicates)) {
      if (isCandidateConsistent(candidate, history)) {
        count++;
        if (samples.length < SAMPLE_KEEP) samples.push(candidate);
        // העובדות חייבות להיבנות מכל הפתרונות, לא רק מהדגימה —
        // אחרת רמז עלול להיות שגוי. שומרים עד תקרה בטוחה.
        if (allMatching.length < 50_000) allMatching.push(candidate);
      }
    }
    const factsExact = count <= 50_000;
    return {
      count,
      estimated: false,
      samples,
      facts: factsExact ? buildFacts(allMatching, rules) : null,
    };
  }

  // מרחב גדול: דגימה אקראית אחידה.
  let matches = 0;
  const samples: ColorId[][] = [];
  for (let i = 0; i < SAMPLE_SIZE; i++) {
    const candidate = randomCode(rules.activeColorIds, rules.codeLength, rules.allowDuplicates, rng);
    if (isCandidateConsistent(candidate, history)) {
      matches++;
      if (samples.length < SAMPLE_KEEP) samples.push(candidate);
    }
  }
  const estimatedCount = Math.round((matches / SAMPLE_SIZE) * total);
  return {
    count: matches === 0 ? 0 : Math.max(estimatedCount, matches),
    estimated: true,
    samples,
    // עובדות מדגימה חלקית עלולות להטעות — לא מדווחים עובדות במצב מוערך.
    facts: null,
  };
}

/**
 * ניתוח מלא של מצב המשחק: עקביות, מספר פתרונות, צמצום אחרון,
 * ויכולת פתרון במסגרת הניסיונות שנותרו.
 */
export function analyzeGameState(
  rules: PuzzleRules,
  history: readonly GuessRecord[],
  remainingAttempts: number,
  rng: Rng = Math.random,
): AnalysisResult {
  const total = totalSpaceSize(rules.activeColorIds.length, rules.codeLength, rules.allowDuplicates);
  const current = computePossibleSet(rules, history, rng);

  let lastGuessReduction: AnalysisResult['lastGuessReduction'] = null;
  if (history.length > 0) {
    const previous =
      history.length === 1
        ? { count: total, estimated: total > EXACT_LIMIT }
        : computePossibleSet(rules, history.slice(0, -1), rng);
    const before = previous.count;
    const after = current.count;
    const eliminated = Math.max(0, before - after);
    lastGuessReduction = {
      before,
      after,
      eliminated,
      percent: before > 0 ? Math.round((eliminated / before) * 100) : 0,
    };
  }

  const consistent = current.count > 0;
  let solvableInRemaining: AnalysisResult['solvableInRemaining'];
  if (!consistent) {
    solvableInRemaining = 'no';
  } else if (remainingAttempts <= 0) {
    solvableInRemaining = 'no';
  } else if (!current.estimated && current.count <= remainingAttempts) {
    // במקרה הגרוע ביותר אפשר פשוט לנחש את כל הפתרונות שנותרו אחד־אחד.
    solvableInRemaining = 'yes';
  } else {
    solvableInRemaining = 'unknown';
  }

  return {
    consistent,
    possibleCount: current.count,
    estimated: current.estimated,
    totalSpace: total,
    unique: !current.estimated && current.count === 1,
    sampleSolutions: current.samples,
    lastGuessReduction,
    solvableInRemaining,
    positionFacts: current.facts,
  };
}
