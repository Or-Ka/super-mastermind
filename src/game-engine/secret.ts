import type { ColorId } from '../types';

export type Rng = () => number;

/** מספר שלם אקראי בטווח [0, max). */
function randomInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max);
}

/**
 * הגרלת רצף סודי חוקי.
 * ללא כפילויות — ערבוב חלקי (Fisher–Yates) של הצבעים הפעילים.
 * עם כפילויות — בחירה אקראית עצמאית לכל מיקום.
 */
export function generateSecret(
  activeColorIds: readonly ColorId[],
  codeLength: number,
  allowDuplicates: boolean,
  rng: Rng = Math.random,
): ColorId[] {
  if (codeLength < 1) throw new Error('אורך רצף לא חוקי');
  if (!allowDuplicates && activeColorIds.length < codeLength) {
    throw new Error('אין מספיק צבעים ליצירת רצף ללא כפילויות');
  }
  if (activeColorIds.length === 0) throw new Error('אין צבעים פעילים');

  if (allowDuplicates) {
    return Array.from({ length: codeLength }, () => activeColorIds[randomInt(rng, activeColorIds.length)]);
  }

  const pool = [...activeColorIds];
  const secret: ColorId[] = [];
  for (let i = 0; i < codeLength; i++) {
    const idx = randomInt(rng, pool.length);
    secret.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return secret;
}
