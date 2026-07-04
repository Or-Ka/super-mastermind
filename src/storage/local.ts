/**
 * שכבת אחסון מקומית דקה מעל localStorage.
 * כל הנתונים נשמרים במחשב בלבד — אין שום תקשורת רשת.
 * ב־Electron הנתונים נשמרים בפרופיל המשתמש של האפליקציה.
 */

const PREFIX = 'super-mastermind.';

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // ערך פגום — מתעלמים וחוזרים לברירת המחדל במקום לקרוס.
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // חריגה ממכסת האחסון — לא עוצרים את המשחק בגלל שמירה.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export const STORAGE_KEYS = {
  settings: 'settings.v1',
  stats: 'stats.v1',
  gameHistory: 'game-history.v1',
  savedPuzzles: 'saved-puzzles.v1',
} as const;
