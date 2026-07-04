import type { ColorId } from '../types';
import type { Rng } from '../game-engine/secret';

/**
 * גודל מרחב האפשרויות הכולל:
 * עם כפילויות — n^L, ללא כפילויות — n·(n-1)·…·(n-L+1).
 */
export function totalSpaceSize(colorCount: number, codeLength: number, allowDuplicates: boolean): number {
  if (allowDuplicates) return Math.pow(colorCount, codeLength);
  if (colorCount < codeLength) return 0;
  let total = 1;
  for (let i = 0; i < codeLength; i++) total *= colorCount - i;
  return total;
}

/**
 * מנייה עצלה (generator) של כל הרצפים האפשריים.
 * הצרכן יכול לעצור בכל שלב — לא נבנה מערך ענק בזיכרון.
 */
export function* enumerateAllCodes(
  colors: readonly ColorId[],
  codeLength: number,
  allowDuplicates: boolean,
): Generator<ColorId[]> {
  const current: ColorId[] = new Array(codeLength);
  const used = new Set<ColorId>();

  function* recurse(position: number): Generator<ColorId[]> {
    if (position === codeLength) {
      yield [...current];
      return;
    }
    for (const color of colors) {
      if (!allowDuplicates && used.has(color)) continue;
      current[position] = color;
      used.add(color);
      yield* recurse(position + 1);
      used.delete(color);
    }
  }

  yield* recurse(0);
}

/** הגרלת רצף חוקי אקראי אחיד מתוך מרחב האפשרויות. */
export function randomCode(
  colors: readonly ColorId[],
  codeLength: number,
  allowDuplicates: boolean,
  rng: Rng = Math.random,
): ColorId[] {
  if (allowDuplicates) {
    return Array.from({ length: codeLength }, () => colors[Math.floor(rng() * colors.length)]);
  }
  const pool = [...colors];
  const code: ColorId[] = [];
  for (let i = 0; i < codeLength; i++) {
    const idx = Math.floor(rng() * pool.length);
    code.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return code;
}
