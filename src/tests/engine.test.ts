import { describe, expect, it } from 'vitest';
import { createGameEngine } from '../game-engine/engine';
import { generateSecret } from '../game-engine/secret';
import { validateGuess } from '../game-engine/validateGuess';
import type { GameRules } from '../types';
import { COLORS_6, COLORS_8, seededRng } from './testUtils';

function makeGameRules(overrides: Partial<GameRules> = {}): GameRules {
  return {
    codeLength: 4,
    allowDuplicates: false,
    maxAttempts: 10,
    activeColorIds: COLORS_8,
    timeLimitSeconds: null,
    showAnalysis: true,
    hintsEnabled: true,
    allowUndo: false,
    allowRepeatGuess: false,
    recommendationMode: 'possible',
    ...overrides,
  };
}

describe('generateSecret — יצירת רצף סודי חוקי', () => {
  it('ללא כפילויות: אורך נכון וכל הצבעים שונים ופעילים', () => {
    const rng = seededRng(42);
    for (let i = 0; i < 50; i++) {
      const secret = generateSecret(COLORS_8, 4, false, rng);
      expect(secret).toHaveLength(4);
      expect(new Set(secret).size).toBe(4);
      secret.forEach((c) => expect(COLORS_8).toContain(c));
    }
  });

  it('עם כפילויות: כל הצבעים פעילים', () => {
    const rng = seededRng(7);
    const secret = generateSecret(COLORS_6, 6, true, rng);
    expect(secret).toHaveLength(6);
    secret.forEach((c) => expect(COLORS_6).toContain(c));
  });

  it('שגיאה כשאין מספיק צבעים ללא כפילויות', () => {
    expect(() => generateSecret(['a', 'b'], 3, false)).toThrow();
  });
});

describe('validateGuess — אימות ניחוש', () => {
  const rules = makeGameRules();

  it('דוחה ניחוש חלקי', () => {
    expect(validateGuess(['red', null, 'blue', 'green'], rules)).toBeTruthy();
  });

  it('דוחה כפילות כשאסור', () => {
    expect(validateGuess(['red', 'red', 'blue', 'green'], rules)).toBeTruthy();
  });

  it('מקבל כפילות כשמותר', () => {
    const dupRules = makeGameRules({ allowDuplicates: true });
    expect(validateGuess(['red', 'red', 'blue', 'green'], dupRules)).toBeNull();
  });

  it('דוחה ניחוש שכבר נשלח כשהחזרה אסורה', () => {
    const history = [{ guess: ['red', 'blue', 'green', 'yellow'], score: { bulls: 0, hits: 0 } }];
    expect(validateGuess(['red', 'blue', 'green', 'yellow'], rules, history)).toBeTruthy();
    const repeatOk = makeGameRules({ allowRepeatGuess: true });
    expect(validateGuess(['red', 'blue', 'green', 'yellow'], repeatOk, history)).toBeNull();
  });

  it('דוחה צבע לא פעיל', () => {
    expect(validateGuess(['red', 'blue', 'green', 'notacolor'], rules)).toBeTruthy();
  });
});

describe('GameEngine — מהלך משחק מלא', () => {
  it('ניצחון כשמנחשים את הסוד', () => {
    const engine = createGameEngine(makeGameRules(), seededRng(1), ['red', 'blue', 'green', 'yellow']);
    const result = engine.submitGuess(['red', 'blue', 'green', 'yellow']);
    expect(result.ok).toBe(true);
    expect(result.score).toEqual({ bulls: 4, hits: 0 });
    expect(engine.getStatus()).toBe('won');
  });

  it('הפסד אחרי ניצול כל הניסיונות', () => {
    const rules = makeGameRules({ maxAttempts: 2, allowRepeatGuess: true });
    const engine = createGameEngine(rules, seededRng(1), ['red', 'blue', 'green', 'yellow']);
    engine.submitGuess(['red', 'blue', 'green', 'orange']);
    expect(engine.getStatus()).toBe('playing');
    engine.submitGuess(['red', 'blue', 'green', 'orange']);
    expect(engine.getStatus()).toBe('lost');
    expect(engine.reveal()).toEqual(['red', 'blue', 'green', 'yellow']);
  });

  it('חסימת ניחוש אחרי סיום המשחק', () => {
    const engine = createGameEngine(makeGameRules(), seededRng(1), ['red', 'blue', 'green', 'yellow']);
    engine.submitGuess(['red', 'blue', 'green', 'yellow']);
    const after = engine.submitGuess(['red', 'blue', 'green', 'orange']);
    expect(after.ok).toBe(false);
  });

  it('ביטול ניחוש עובד רק כשמותר', () => {
    const noUndo = createGameEngine(makeGameRules(), seededRng(2), ['red', 'blue', 'green', 'yellow']);
    noUndo.submitGuess(['red', 'blue', 'green', 'orange']);
    expect(noUndo.undoLastGuess()).toBe(false);

    const withUndo = createGameEngine(
      makeGameRules({ allowUndo: true }),
      seededRng(2),
      ['red', 'blue', 'green', 'yellow'],
    );
    withUndo.submitGuess(['red', 'blue', 'green', 'orange']);
    expect(withUndo.undoLastGuess()).toBe(true);
    expect(withUndo.attemptsUsed()).toBe(0);
  });

  it('מונה ניסיונות שנותרו', () => {
    const engine = createGameEngine(makeGameRules({ maxAttempts: 5 }), seededRng(3), ['red', 'blue', 'green', 'yellow']);
    expect(engine.attemptsLeft()).toBe(5);
    engine.submitGuess(['red', 'blue', 'green', 'orange']);
    expect(engine.attemptsLeft()).toBe(4);
  });
});
