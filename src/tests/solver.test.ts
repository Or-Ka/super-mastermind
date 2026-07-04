import { describe, expect, it } from 'vitest';
import { enumerateAllCodes, randomCode, totalSpaceSize } from '../solver/enumerate';
import { analyzeGameState, computePossibleSet, isCandidateConsistent } from '../solver/analyze';
import { recommendGuess } from '../solver/recommend';
import { calculateScore } from '../game-engine/score';
import { COLORS_6, COLORS_8, makeRules, seededRng } from './testUtils';

describe('totalSpaceSize — גודל מרחב האפשרויות', () => {
  it('עם כפילויות: n^L', () => {
    expect(totalSpaceSize(8, 4, true)).toBe(4096);
    expect(totalSpaceSize(6, 4, true)).toBe(1296);
  });
  it('ללא כפילויות: n!/(n-L)!', () => {
    expect(totalSpaceSize(8, 4, false)).toBe(8 * 7 * 6 * 5);
    expect(totalSpaceSize(4, 4, false)).toBe(24);
    expect(totalSpaceSize(3, 4, false)).toBe(0);
  });
});

describe('enumerateAllCodes — יצירת כל הרצפים', () => {
  it('מונה בדיוק את גודל המרחב, ללא כפילויות', () => {
    const all = [...enumerateAllCodes(COLORS_6, 3, false)];
    expect(all).toHaveLength(6 * 5 * 4);
    // אין רצף שחוזר פעמיים ואין צבע כפול בתוך רצף
    const keys = new Set(all.map((c) => c.join(',')));
    expect(keys.size).toBe(all.length);
    all.forEach((code) => expect(new Set(code).size).toBe(3));
  });

  it('מונה בדיוק את גודל המרחב, עם כפילויות', () => {
    const all = [...enumerateAllCodes(['a', 'b', 'c'], 3, true)];
    expect(all).toHaveLength(27);
  });
});

describe('computePossibleSet — סינון לפי היסטוריה', () => {
  it('היסטוריה ריקה = כל המרחב', () => {
    const result = computePossibleSet(makeRules(), []);
    expect(result.count).toBe(1680);
    expect(result.estimated).toBe(false);
  });

  it('סינון נכון: רק רצפים שמחזירים את אותו ציון בדיוק', () => {
    const rules = makeRules({ activeColorIds: COLORS_6 });
    const secret = ['red', 'blue', 'green', 'yellow'];
    const guess = ['red', 'green', 'purple', 'blue'];
    const history = [{ guess, score: calculateScore(secret, guess) }];
    const result = computePossibleSet(rules, history);
    // כל פתרון שנשאר חייב להחזיר בדיוק את אותו ציון
    for (const sol of result.samples) {
      expect(calculateScore(sol, guess)).toEqual(history[0].score);
    }
    // הסוד האמיתי עדיין בפנים
    expect(isCandidateConsistent(secret, history)).toBe(true);
    expect(result.count).toBeGreaterThan(0);
    expect(result.count).toBeLessThan(360);
  });

  it('זיהוי פתרון יחיד', () => {
    const rules = makeRules({ activeColorIds: ['a', 'b', 'c', 'd'], codeLength: 4 });
    const secret = ['a', 'b', 'c', 'd'];
    // ניחושים שמצמצמים ל־24 האפשרויות עד אחת
    const guesses = [
      ['b', 'a', 'd', 'c'],
      ['c', 'd', 'a', 'b'],
      ['d', 'c', 'b', 'a'],
      ['a', 'c', 'b', 'd'],
      ['a', 'b', 'd', 'c'],
      ['b', 'd', 'c', 'a'],
    ];
    const history = guesses.map((g) => ({ guess: g, score: calculateScore(secret, g) }));
    const result = computePossibleSet(rules, history);
    expect(result.count).toBe(1);
    expect(result.samples[0]).toEqual(secret);
  });

  it('זיהוי חוסר פתרון (נתונים סותרים)', () => {
    const rules = makeRules({ activeColorIds: COLORS_6 });
    // אותו ניחוש עם שני ציונים שונים — סתירה מובנית
    const history = [
      { guess: ['red', 'blue', 'green', 'yellow'], score: { bulls: 4, hits: 0 } },
      { guess: ['red', 'blue', 'green', 'yellow'], score: { bulls: 0, hits: 4 } },
    ];
    const result = computePossibleSet(rules, history);
    expect(result.count).toBe(0);
  });

  it('עובדות מיקום: צבעים שחייבים להופיע וצבעים שנפסלו', () => {
    const rules = makeRules({ activeColorIds: ['a', 'b', 'c', 'd', 'e'], codeLength: 4 });
    // ציון 0 בולים 0 פגיעות על ניחוש עם a,b,c,d ⇒ כל הפתרונות חייבים לכלול את e...
    // למעשה עם codeLength=4 מתוך 5 צבעים בלי a,b,c,d אין פתרון ללא כפילויות,
    // לכן נשתמש בניחוש חלקי יותר: ניחוש aabb לא חוקי בלי כפילויות — ניקח ציון אמיתי.
    const secret = ['b', 'c', 'd', 'e'];
    const guess = ['a', 'b', 'c', 'd'];
    const history = [{ guess, score: calculateScore(secret, guess) }]; // 0 בולים, 3 פגיעות
    const result = computePossibleSet(rules, history);
    expect(result.facts).not.toBeNull();
    // a לא יכול להופיע במקום הראשון (אחרת היה בול)
    expect(result.facts!.possibleColorsPerPosition[0]).not.toContain('a');
  });
});

describe('analyzeGameState — ניתוח מלא', () => {
  it('מדווח על צמצום אחרי ניחוש', () => {
    const rules = makeRules({ activeColorIds: COLORS_6 });
    const secret = ['red', 'blue', 'green', 'yellow'];
    const guess = ['red', 'green', 'purple', 'blue'];
    const history = [{ guess, score: calculateScore(secret, guess) }];
    const analysis = analyzeGameState(rules, history, 9);
    expect(analysis.consistent).toBe(true);
    expect(analysis.totalSpace).toBe(360);
    expect(analysis.lastGuessReduction).not.toBeNull();
    expect(analysis.lastGuessReduction!.before).toBe(360);
    expect(analysis.lastGuessReduction!.after).toBe(analysis.possibleCount);
    expect(analysis.lastGuessReduction!.percent).toBeGreaterThan(0);
  });

  it('מזהה מצב לא עקבי', () => {
    const rules = makeRules({ activeColorIds: COLORS_6 });
    const history = [
      { guess: ['red', 'blue', 'green', 'yellow'], score: { bulls: 4, hits: 0 } },
      { guess: ['red', 'blue', 'green', 'yellow'], score: { bulls: 0, hits: 4 } },
    ];
    const analysis = analyzeGameState(rules, history, 5);
    expect(analysis.consistent).toBe(false);
    expect(analysis.solvableInRemaining).toBe('no');
  });

  it('פתרון מובטח כשמספר הפתרונות עד מספר הניסיונות שנותרו', () => {
    const rules = makeRules({ activeColorIds: ['a', 'b', 'c', 'd'] });
    const analysis = analyzeGameState(rules, [], 24);
    expect(analysis.possibleCount).toBe(24);
    expect(analysis.solvableInRemaining).toBe('yes');
    const tight = analyzeGameState(rules, [], 3);
    expect(tight.solvableInRemaining).toBe('unknown');
  });

  it('מרחב ענק עובר להערכה בלי לקרוס', () => {
    const manyColors = Array.from({ length: 14 }, (_, i) => `c${i}`);
    const rules = makeRules({ activeColorIds: manyColors, codeLength: 6, allowDuplicates: true });
    // 14^6 = 7.5M > תקרת המנייה המדויקת
    const analysis = analyzeGameState(rules, [], 10, seededRng(5));
    expect(analysis.estimated).toBe(true);
    expect(analysis.possibleCount).toBeGreaterThan(0);
  });
});

describe('recommendGuess — המלצות', () => {
  const rules = makeRules({ activeColorIds: COLORS_6 });
  const secret = ['red', 'blue', 'green', 'yellow'];
  const history = [
    {
      guess: ['red', 'green', 'purple', 'blue'],
      score: calculateScore(secret, ['red', 'green', 'purple', 'blue']),
    },
  ];

  it('מצב "ללא המלצה" מחזיר null', () => {
    expect(recommendGuess('none', rules, history)).toBeNull();
  });

  it('המלצה מתוך הפתרונות האפשריים אכן עקבית עם ההיסטוריה', () => {
    const rec = recommendGuess('possible', rules, history, seededRng(9));
    expect(rec).not.toBeNull();
    expect(rec!.isPossibleSolution).toBe(true);
    expect(isCandidateConsistent(rec!.guess, history)).toBe(true);
  });

  it('המלצת צמצום מרבי מחזירה ניחוש חוקי', () => {
    const rec = recommendGuess('max-reduction', rules, history, seededRng(10));
    expect(rec).not.toBeNull();
    expect(rec!.guess).toHaveLength(4);
    expect(new Set(rec!.guess).size).toBe(4); // ללא כפילויות לפי החוקים
  });

  it('ניחוש אקראי חוקי מכבד את חוקי הכפילויות', () => {
    const rec = recommendGuess('random', rules, history, seededRng(11));
    expect(rec).not.toBeNull();
    expect(new Set(rec!.guess).size).toBe(rec!.guess.length);
  });
});

describe('randomCode — דגימה אקראית', () => {
  it('מכבד איסור כפילויות', () => {
    const rng = seededRng(20);
    for (let i = 0; i < 30; i++) {
      const code = randomCode(COLORS_8, 5, false, rng);
      expect(new Set(code).size).toBe(5);
    }
  });
});
