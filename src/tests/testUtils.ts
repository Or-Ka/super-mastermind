import type { PuzzleRules } from '../types';

/** מחולל אקראיות דטרמיניסטי (mulberry32) לבדיקות שחוזרות על עצמן. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const COLORS_6 = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'];
export const COLORS_8 = [...COLORS_6, 'cyan', 'pink'];

export function makeRules(overrides: Partial<PuzzleRules> = {}): PuzzleRules {
  return {
    codeLength: 4,
    allowDuplicates: false,
    activeColorIds: COLORS_8,
    ...overrides,
  };
}
