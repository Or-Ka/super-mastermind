import type { Puzzle } from '../types';
import { PUZZLE_VERSION } from '../challenge-generator/generate';
import { loadJson, saveJson, STORAGE_KEYS } from './local';

const MAX_PUZZLES = 100;

export function loadSavedPuzzles(): Puzzle[] {
  return loadJson<Puzzle[]>(STORAGE_KEYS.savedPuzzles, []);
}

export function savePuzzle(puzzle: Puzzle): Puzzle[] {
  const rest = loadSavedPuzzles().filter((p) => p.id !== puzzle.id);
  const all = [puzzle, ...rest].slice(0, MAX_PUZZLES);
  saveJson(STORAGE_KEYS.savedPuzzles, all);
  return all;
}

export function deletePuzzle(id: string): Puzzle[] {
  const all = loadSavedPuzzles().filter((p) => p.id !== id);
  saveJson(STORAGE_KEYS.savedPuzzles, all);
  return all;
}

/** ייצוא חידה כמחרוזת JSON (לשמירה כקובץ). */
export function exportPuzzleJson(puzzle: Puzzle): string {
  return JSON.stringify(puzzle, null, 2);
}

/**
 * ייבוא חידה ממחרוזת JSON, כולל אימות מבנה בסיסי.
 * מחזיר את החידה או זורק Error עם הודעה בעברית.
 */
export function importPuzzleJson(json: string): Puzzle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('הקובץ אינו JSON תקין.');
  }
  const p = parsed as Partial<Puzzle>;
  if (typeof p !== 'object' || p === null) throw new Error('מבנה הקובץ אינו תקין.');
  if (p.version !== PUZZLE_VERSION) throw new Error('גרסת החידה אינה נתמכת.');
  if (
    !p.rules ||
    typeof p.rules.codeLength !== 'number' ||
    typeof p.rules.allowDuplicates !== 'boolean' ||
    !Array.isArray(p.rules.activeColorIds)
  ) {
    throw new Error('חוקי החידה חסרים או פגומים.');
  }
  if (!Array.isArray(p.history)) throw new Error('היסטוריית הניחושים חסרה.');
  for (const record of p.history) {
    if (
      !Array.isArray(record.guess) ||
      record.guess.length !== p.rules.codeLength ||
      typeof record.score?.bulls !== 'number' ||
      typeof record.score?.hits !== 'number'
    ) {
      throw new Error('אחד הניחושים בקובץ פגום.');
    }
  }
  if (!Array.isArray(p.colors) || p.colors.length === 0) throw new Error('רשימת הצבעים חסרה.');
  return {
    version: PUZZLE_VERSION,
    id: typeof p.id === 'string' ? p.id : `imported-${Date.now()}`,
    name: typeof p.name === 'string' ? p.name : 'חידה מיובאת',
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
    rules: p.rules,
    history: p.history,
    secret: Array.isArray(p.secret) ? p.secret : undefined,
    colors: p.colors,
  };
}
