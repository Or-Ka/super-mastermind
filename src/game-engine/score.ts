import type { ColorId, Score } from '../types';

/**
 * חישוב בולים ופגיעות.
 *
 * האלגוריתם עובד בשני שלבים כדי למנוע ספירה כפולה של אותו צבע:
 * 1. ספירת התאמות מדויקות (בול) — צבע זהה באותו מיקום.
 * 2. עבור המיקומים שנותרו, ספירת פגיעות לפי שכיחות:
 *    לכל צבע, מספר הפגיעות הוא המינימום בין מספר המופעים שלו
 *    בשאריות הקוד לבין מספר המופעים שלו בשאריות הניחוש.
 *
 * כך צבע לעולם אינו נספר יותר פעמים ממספר הופעותיו בקוד הסודי,
 * גם כאשר מותרות כפילויות בקוד או בניחוש.
 */
export function calculateScore(secret: readonly ColorId[], guess: readonly ColorId[]): Score {
  if (secret.length !== guess.length) {
    throw new Error(`אורך הניחוש (${guess.length}) שונה מאורך הקוד (${secret.length})`);
  }

  let bulls = 0;
  const secretRemainder = new Map<ColorId, number>();
  const guessRemainder = new Map<ColorId, number>();

  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) {
      bulls++;
    } else {
      secretRemainder.set(secret[i], (secretRemainder.get(secret[i]) ?? 0) + 1);
      guessRemainder.set(guess[i], (guessRemainder.get(guess[i]) ?? 0) + 1);
    }
  }

  let hits = 0;
  for (const [colorId, count] of guessRemainder) {
    hits += Math.min(count, secretRemainder.get(colorId) ?? 0);
  }

  return { bulls, hits };
}

/** השוואת שתי תוצאות. */
export function scoresEqual(a: Score, b: Score): boolean {
  return a.bulls === b.bulls && a.hits === b.hits;
}

/**
 * בדיקה האם תוצאה מסוימת בכלל אפשרית עבור ניחוש נתון,
 * ללא תלות בקוד עצמו (משמש לאימות קלט ידני).
 */
export function isScoreShapeValid(score: Score, codeLength: number): boolean {
  const { bulls, hits } = score;
  if (!Number.isInteger(bulls) || !Number.isInteger(hits)) return false;
  if (bulls < 0 || hits < 0) return false;
  if (bulls > codeLength || hits > codeLength) return false;
  if (bulls + hits > codeLength) return false;
  // מצב בלתי אפשרי קלאסי: כל המיקומים נכונים חוץ מאחד, ועוד "פגיעה" —
  // אם codeLength-1 בולים, אי אפשר שתהיה פגיעה (אין לאן להזיז צבע בודד).
  if (bulls === codeLength - 1 && hits === 1) return false;
  return true;
}
