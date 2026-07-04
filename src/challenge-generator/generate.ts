import type {
  ColorDef,
  ColorId,
  DecisiveDifficulty,
  DecisiveOptions,
  GuessRecord,
  Puzzle,
  PuzzleRules,
} from '../types';
import { calculateScore } from '../game-engine/score';
import { generateSecret, type Rng } from '../game-engine/secret';
import { computePossibleSet, isCandidateConsistent } from '../solver/analyze';
import { randomCode } from '../solver/enumerate';
import { ALL_BUILTIN_COLORS, DEFAULT_COLORS } from '../settings/defaults';

export const PUZZLE_VERSION = 1;

interface DifficultyProfile {
  rules: PuzzleRules;
  historyLength: number;
  /** יעד מספר הפתרונות שנותרו לפני הניחוש המכריע (כשלא נדרש פתרון יחיד). */
  targetRemaining: [number, number];
}

/** פרופילי הקושי של מצב "ניחוש מכריע". */
export function difficultyProfile(difficulty: DecisiveDifficulty): DifficultyProfile {
  const ids6 = DEFAULT_COLORS.slice(0, 6).map((c) => c.id);
  const ids8 = DEFAULT_COLORS.map((c) => c.id);
  const ids9 = ALL_BUILTIN_COLORS.map((c) => c.id);
  switch (difficulty) {
    case 'easy':
      return {
        rules: { codeLength: 4, allowDuplicates: false, activeColorIds: ids6 },
        historyLength: 6,
        targetRemaining: [1, 3],
      };
    case 'medium':
      return {
        rules: { codeLength: 4, allowDuplicates: false, activeColorIds: ids8 },
        historyLength: 7,
        targetRemaining: [1, 4],
      };
    case 'hard':
      return {
        rules: { codeLength: 5, allowDuplicates: true, activeColorIds: ids8 },
        historyLength: 8,
        targetRemaining: [1, 6],
      };
    case 'expert':
      return {
        rules: { codeLength: 5, allowDuplicates: true, activeColorIds: ids9 },
        historyLength: 8,
        targetRemaining: [1, 8],
      };
  }
}

/**
 * יצירת חידת "ניחוש מכריע".
 *
 * האלגוריתם:
 * 1. מגרילים רצף סודי.
 * 2. בכל שלב בוחרים ניחוש מתוך מספר מועמדים אקראיים (חלקם מתוך
 *    הפתרונות שעדיין אפשריים), ומעדיפים את המועמד שמצמצם את
 *    מרחב האפשרויות בצורה המעניינת ביותר — לא צמצום אפסי ולא
 *    קריסה מיידית לפתרון יחיד מוקדם מדי.
 * 3. אם נדרש פתרון יחיד — ממשיכים להוסיף ניחושים עד שנותר בדיוק
 *    פתרון אחד (הרצף הסודי עצמו מבטיח שתמיד נותר לפחות אחד).
 *
 * החידה תמיד עקבית כי כל הציונים מחושבים מול הסוד האמיתי.
 */
export function generateDecisivePuzzle(
  options: DecisiveOptions,
  colors: ColorDef[],
  rng: Rng = Math.random,
): Puzzle {
  const profile = difficultyProfile(options.difficulty);
  const rules = profile.rules;
  const maxRebuildAttempts = 8;

  for (let attempt = 0; attempt < maxRebuildAttempts; attempt++) {
    const puzzle = tryBuildPuzzle(options, profile, colors, rng);
    if (puzzle) return puzzle;
  }

  // נפילה בטוחה: בונים חידה בסיסית מניחושים אקראיים — עדיין עקבית תמיד.
  const secret = generateSecret(rules.activeColorIds, rules.codeLength, rules.allowDuplicates, rng);
  const history: GuessRecord[] = [];
  for (let i = 0; i < profile.historyLength; i++) {
    const guess = randomCode(rules.activeColorIds, rules.codeLength, rules.allowDuplicates, rng);
    history.push({ guess, score: calculateScore(secret, guess) });
  }
  return finalizePuzzle(rules, history, secret, colors, options.difficulty);
}

function tryBuildPuzzle(
  options: DecisiveOptions,
  profile: DifficultyProfile,
  colors: ColorDef[],
  rng: Rng,
): Puzzle | null {
  const { rules, historyLength, targetRemaining } = profile;
  const secret = generateSecret(rules.activeColorIds, rules.codeLength, rules.allowDuplicates, rng);
  const history: GuessRecord[] = [];
  const CANDIDATES_PER_STEP = 12;

  let remaining = computePossibleSet(rules, history, rng).count;

  for (let step = 0; step < historyLength; step++) {
    const isLastStep = step === historyLength - 1;
    let best: { guess: ColorId[]; after: number } | null = null;

    for (let c = 0; c < CANDIDATES_PER_STEP; c++) {
      // מחצית מהמועמדים נדגמים מתוך הפתרונות האפשריים כדי שההיסטוריה
      // תיראה כמו משחק אמיתי של שחקן סביר, והשאר אקראיים לגיוון.
      const fromPossible = c % 2 === 0;
      let guess: ColorId[];
      if (fromPossible) {
        const set = computePossibleSet(rules, history, rng);
        guess =
          set.samples.length > 0
            ? [...set.samples[Math.floor(rng() * set.samples.length)]]
            : randomCode(rules.activeColorIds, rules.codeLength, rules.allowDuplicates, rng);
      } else {
        guess = randomCode(rules.activeColorIds, rules.codeLength, rules.allowDuplicates, rng);
      }
      // הניחוש בהיסטוריה לא אמור להיות הסוד עצמו (אחרת החידה נגמרה).
      if (guess.join(',') === secret.join(',')) continue;
      if (history.some((h) => h.guess.join(',') === guess.join(','))) continue;

      const score = calculateScore(secret, guess);
      const after = computePossibleSet(rules, [...history, { guess, score }], rng).count;
      if (after < 1) continue; // לא אמור לקרות — הסוד תמיד עקבי.

      const target = isLastStep
        ? options.requireUniqueSolution
          ? 1
          : Math.max(targetRemaining[0], Math.min(targetRemaining[1], after))
        : Math.max(2, Math.ceil(remaining * 0.35));

      if (best === null || Math.abs(after - target) < Math.abs(best.after - target)) {
        best = { guess, after };
      }
    }

    if (!best) return null;
    history.push({ guess: best.guess, score: calculateScore(secret, best.guess) });
    remaining = best.after;
  }

  // דרישת "פתרון יחיד": מוסיפים ניחושים עד שנותר בדיוק אחד (בגבול סביר).
  if (options.requireUniqueSolution) {
    let guard = 6;
    while (remaining > 1 && guard-- > 0) {
      const set = computePossibleSet(rules, history, rng);
      const candidate = set.samples.find(
        (s) => s.join(',') !== secret.join(',') && !history.some((h) => h.guess.join(',') === s.join(',')),
      );
      if (!candidate) break;
      const score = calculateScore(secret, candidate);
      history.push({ guess: [...candidate], score });
      remaining = computePossibleSet(rules, history, rng).count;
    }
    if (remaining !== 1) return null;
  } else if (remaining < targetRemaining[0] || remaining > targetRemaining[1] * 3) {
    // חידה משעממת מדי או פתוחה מדי — ננסה שוב.
    return null;
  }

  // בדיקת שפיות אחרונה: הסוד באמת עקבי עם כל ההיסטוריה.
  if (!isCandidateConsistent(secret, history)) return null;

  return finalizePuzzle(rules, history, secret, colors, options.difficulty);
}

function finalizePuzzle(
  rules: PuzzleRules,
  history: GuessRecord[],
  secret: ColorId[],
  colors: ColorDef[],
  difficulty: DecisiveDifficulty,
): Puzzle {
  const difficultyNames: Record<DecisiveDifficulty, string> = {
    easy: 'קל',
    medium: 'בינוני',
    hard: 'קשה',
    expert: 'מומחה',
  };
  const usedColors = colors.filter((c) => rules.activeColorIds.includes(c.id));
  return {
    version: PUZZLE_VERSION,
    id: `puzzle-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name: `חידת ניחוש מכריע — ${difficultyNames[difficulty]}`,
    createdAt: new Date().toISOString(),
    rules,
    history,
    secret,
    colors: usedColors,
  };
}
