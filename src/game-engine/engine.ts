import type { ColorId, GameRules, GuessRecord, Score } from '../types';
import { calculateScore } from './score';
import { generateSecret, type Rng } from './secret';
import { validateGuess } from './validateGuess';

export type GameStatus = 'playing' | 'won' | 'lost';

export interface SubmitResult {
  ok: boolean;
  error?: string;
  score?: Score;
  status?: GameStatus;
}

/**
 * מנוע משחק יחיד. הרצף הסודי שמור בתוך closure ואינו נחשף
 * דרך אובייקט המנוע אלא באמצעות reveal() בלבד (סיום משחק / מצב פיתוח).
 * המנוע אינו תלוי ב־React וניתן לבדיקה ישירה.
 */
export interface GameEngine {
  readonly rules: GameRules;
  submitGuess(guess: readonly ColorId[]): SubmitResult;
  getHistory(): GuessRecord[];
  getStatus(): GameStatus;
  attemptsUsed(): number;
  attemptsLeft(): number;
  /** ביטול הניחוש האחרון (אם מותר בחוקים והמשחק עדיין פעיל). */
  undoLastGuess(): boolean;
  /** חשיפת הרצף — לשימוש רק בסיום משחק או במצב פיתוח. */
  reveal(): ColorId[];
  /** סימון הפסד עקב תום הזמן. */
  forfeitByTimeout(): void;
}

export function createGameEngine(
  rules: GameRules,
  rng: Rng = Math.random,
  presetSecret?: ColorId[],
): GameEngine {
  const secret =
    presetSecret ?? generateSecret(rules.activeColorIds, rules.codeLength, rules.allowDuplicates, rng);
  const history: GuessRecord[] = [];
  let status: GameStatus = 'playing';

  return {
    rules,
    submitGuess(guess) {
      if (status !== 'playing') {
        return { ok: false, error: 'המשחק כבר הסתיים.' };
      }
      const error = validateGuess(guess, rules, history);
      if (error) return { ok: false, error };

      const score = calculateScore(secret, guess as ColorId[]);
      history.push({ guess: [...guess] as ColorId[], score });

      if (score.bulls === rules.codeLength) {
        status = 'won';
      } else if (history.length >= rules.maxAttempts) {
        status = 'lost';
      }
      return { ok: true, score, status };
    },
    getHistory: () => history.map((r) => ({ guess: [...r.guess], score: { ...r.score } })),
    getStatus: () => status,
    attemptsUsed: () => history.length,
    attemptsLeft: () => Math.max(0, rules.maxAttempts - history.length),
    undoLastGuess() {
      if (!rules.allowUndo || status !== 'playing' || history.length === 0) return false;
      history.pop();
      return true;
    },
    reveal: () => [...secret],
    forfeitByTimeout() {
      if (status === 'playing') status = 'lost';
    },
  };
}
