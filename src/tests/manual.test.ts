import { describe, expect, it } from 'vitest';
import { checkManualPuzzle, validateManualRow } from '../solver/manual';
import { calculateScore } from '../game-engine/score';
import { COLORS_6, makeRules } from './testUtils';

describe('validateManualRow — אימות שורה בחידה ידנית', () => {
  const rules = makeRules({ activeColorIds: COLORS_6 });

  it('שורה חוקית עוברת', () => {
    expect(validateManualRow(['red', 'blue', 'green', 'yellow'], { bulls: 1, hits: 2 }, rules)).toBeNull();
  });

  it('בולים מעל אורך הרצף נפסלים', () => {
    expect(validateManualRow(['red', 'blue', 'green', 'yellow'], { bulls: 5, hits: 0 }, rules)).toBeTruthy();
  });

  it('סכום בולים ופגיעות מעל אורך הרצף נפסל', () => {
    expect(validateManualRow(['red', 'blue', 'green', 'yellow'], { bulls: 2, hits: 3 }, rules)).toBeTruthy();
  });

  it('צבע לא פעיל נפסל', () => {
    expect(validateManualRow(['red', 'blue', 'green', 'pink'], { bulls: 0, hits: 0 }, rules)).toBeTruthy();
  });

  it('קוד ללא כפילויות: ניחוש עם צבע כפול לא יכול לקבל יותר התאמות ממספר הצבעים השונים', () => {
    const dupGuessRules = makeRules({ activeColorIds: COLORS_6, allowDuplicates: false });
    // ניחוש עם red כפול — רק 3 צבעים שונים, ולכן 4 התאמות בלתי אפשריות
    expect(
      validateManualRow(['red', 'red', 'blue', 'green'], { bulls: 2, hits: 2 }, dupGuessRules),
    ).toBeTruthy();
  });
});

describe('checkManualPuzzle — עקביות חידה ידנית', () => {
  const rules = makeRules({ activeColorIds: COLORS_6 });

  it('חידה עקבית: מדווח מספר פתרונות חיובי', () => {
    const secret = ['red', 'blue', 'green', 'yellow'];
    const guesses = [
      ['red', 'green', 'purple', 'blue'],
      ['orange', 'blue', 'yellow', 'green'],
    ];
    const history = guesses.map((g) => ({ guess: g, score: calculateScore(secret, g) }));
    const result = checkManualPuzzle(rules, history);
    expect(result.consistent).toBe(true);
    expect(result.possibleCount).toBeGreaterThan(0);
    expect(result.firstContradictionIndex).toBeNull();
  });

  it('חידה סותרת: מזהה את השורה שיוצרת את הסתירה', () => {
    const history = [
      { guess: ['red', 'blue', 'green', 'yellow'], score: { bulls: 4, hits: 0 } },
      { guess: ['red', 'blue', 'green', 'yellow'], score: { bulls: 0, hits: 4 } },
    ];
    const result = checkManualPuzzle(rules, history);
    expect(result.consistent).toBe(false);
    expect(result.possibleCount).toBe(0);
    expect(result.firstContradictionIndex).toBe(1);
  });

  it('שגיאות שורה מדווחות עם אינדקס', () => {
    const history = [
      { guess: ['red', 'blue', 'green', 'yellow'], score: { bulls: 3, hits: 1 } }, // בלתי אפשרי
    ];
    const result = checkManualPuzzle(rules, history);
    expect(result.rowErrors).toHaveLength(1);
    expect(result.rowErrors[0].index).toBe(0);
  });
});
