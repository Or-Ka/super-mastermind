import { describe, expect, it } from 'vitest';
import { calculateScore, isScoreShapeValid } from '../game-engine/score';

describe('calculateScore — חישוב בולים ופגיעות', () => {
  it('הדוגמה מהאפיון: בול אחד ושתי פגיעות', () => {
    // קוד: אדום, כחול, ירוק, צהוב | ניחוש: אדום, ירוק, סגול, כחול
    const score = calculateScore(
      ['red', 'blue', 'green', 'yellow'],
      ['red', 'green', 'purple', 'blue'],
    );
    expect(score).toEqual({ bulls: 1, hits: 2 });
  });

  it('כל הצבעים נכונים ובמקומות הנכונים', () => {
    expect(calculateScore(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'])).toEqual({ bulls: 4, hits: 0 });
  });

  it('כל הצבעים נכונים אך כולם במקומות שגויים', () => {
    expect(calculateScore(['a', 'b', 'c', 'd'], ['b', 'a', 'd', 'c'])).toEqual({ bulls: 0, hits: 4 });
  });

  it('אין אף צבע נכון', () => {
    expect(calculateScore(['a', 'b', 'c', 'd'], ['e', 'f', 'g', 'h'])).toEqual({ bulls: 0, hits: 0 });
  });

  it('קוד עם צבע כפול וניחוש עם צבע כפול', () => {
    // קוד: a a b c | ניחוש: a b a a
    // בול: מקום 0. שאריות קוד: [a,b,c], שאריות ניחוש: [b,a,a]
    // פגיעות: a→min(2,1)=1, b→min(1,1)=1 ⇒ 2
    expect(calculateScore(['a', 'a', 'b', 'c'], ['a', 'b', 'a', 'a'])).toEqual({ bulls: 1, hits: 2 });
  });

  it('ניחוש עם יותר מופעים של צבע מאשר בקוד — לא נספר פעמיים', () => {
    // קוד: a b c d | ניחוש: a a a a ⇒ בול אחד בלבד, אפס פגיעות
    expect(calculateScore(['a', 'b', 'c', 'd'], ['a', 'a', 'a', 'a'])).toEqual({ bulls: 1, hits: 0 });
  });

  it('קוד עם כפילויות וניחוש בלי — פגיעה אחת לכל מופע בקוד לכל היותר', () => {
    // קוד: a a a b | ניחוש: b a c d
    // בול: מקום 1. שאריות קוד: [a,a,b], שאריות ניחוש: [b,c,d]
    // פגיעות: b⇒1
    expect(calculateScore(['a', 'a', 'a', 'b'], ['b', 'a', 'c', 'd'])).toEqual({ bulls: 1, hits: 1 });
  });

  it('רצף באורך שונה מ־4', () => {
    expect(calculateScore(['a', 'b'], ['b', 'a'])).toEqual({ bulls: 0, hits: 2 });
    expect(
      calculateScore(['a', 'b', 'c', 'd', 'e', 'f'], ['a', 'b', 'c', 'd', 'e', 'f']),
    ).toEqual({ bulls: 6, hits: 0 });
  });

  it('זריקת שגיאה כשאורכי הרצפים שונים', () => {
    expect(() => calculateScore(['a', 'b'], ['a'])).toThrow();
  });
});

describe('isScoreShapeValid — צורת ציון אפשרית', () => {
  it('מקבל ציונים חוקיים', () => {
    expect(isScoreShapeValid({ bulls: 0, hits: 0 }, 4)).toBe(true);
    expect(isScoreShapeValid({ bulls: 4, hits: 0 }, 4)).toBe(true);
    expect(isScoreShapeValid({ bulls: 0, hits: 4 }, 4)).toBe(true);
    expect(isScoreShapeValid({ bulls: 2, hits: 2 }, 4)).toBe(true);
  });

  it('פוסל סכום גדול מאורך הרצף', () => {
    expect(isScoreShapeValid({ bulls: 3, hits: 2 }, 4)).toBe(false);
    expect(isScoreShapeValid({ bulls: 5, hits: 0 }, 4)).toBe(false);
    expect(isScoreShapeValid({ bulls: 0, hits: 5 }, 4)).toBe(false);
  });

  it('פוסל את המצב הבלתי אפשרי: אורך-1 בולים + פגיעה אחת', () => {
    expect(isScoreShapeValid({ bulls: 3, hits: 1 }, 4)).toBe(false);
  });

  it('פוסל ערכים שליליים ולא שלמים', () => {
    expect(isScoreShapeValid({ bulls: -1, hits: 0 }, 4)).toBe(false);
    expect(isScoreShapeValid({ bulls: 1.5, hits: 0 }, 4)).toBe(false);
  });
});
