import { beforeEach, describe, expect, it } from 'vitest';

// localStorage מדומה לסביבת Node — לפני ייבוא מודולי האחסון.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}
(globalThis as Record<string, unknown>).localStorage = new MemoryStorage();

const { loadSettings, saveSettings, resetSettings } = await import('../storage/settingsStore');
const { DEFAULT_SETTINGS } = await import('../settings/defaults');
const { validateRules, validateSettings } = await import('../settings/validate');
const { exportPuzzleJson, importPuzzleJson } = await import('../storage/puzzleStore');
const { loadStats, recordGameFinished, resetStats } = await import('../storage/statsStore');
const { generateDecisivePuzzle } = await import('../challenge-generator/generate');
const { ALL_BUILTIN_COLORS } = await import('../settings/defaults');

beforeEach(() => {
  (globalThis.localStorage as unknown as MemoryStorage).clear();
});

describe('הגדרות — שמירה, טעינה ואימות', () => {
  it('טעינה ללא נתונים מחזירה ברירת מחדל', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('שמירה וטעינה מחזירות את אותן הגדרות', () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.rules.codeLength = 5;
    settings.display.theme = 'light';
    const errors = saveSettings(settings);
    expect(errors).toEqual([]);
    expect(loadSettings()).toEqual(settings);
  });

  it('הגדרות לא חוקיות אינן נשמרות ומוחזרות שגיאות', () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.rules.codeLength = 9; // מעל הגבול וגם מעל מספר הצבעים
    const errors = saveSettings(settings);
    expect(errors.length).toBeGreaterThan(0);
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('שילוב לא חוקי: רצף ארוך ממספר הצבעים ללא כפילויות', () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.rules.activeColorIds = settings.rules.activeColorIds.slice(0, 3);
    settings.rules.codeLength = 4;
    settings.rules.allowDuplicates = false;
    const errors = validateSettings(settings);
    expect(errors.some((e) => e.includes('צבעים חוזרים'))).toBe(true);
  });

  it('נתון פגום באחסון לא מפיל את הטעינה', () => {
    globalThis.localStorage.setItem('super-mastermind.settings.v1', '{not-json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('איפוס מחזיר ברירת מחדל', () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.rules.maxAttempts = 15;
    saveSettings(settings);
    expect(resetSettings()).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('validateRules פוסל ערכים מחוץ לתחום', () => {
    const bad = { ...DEFAULT_SETTINGS.rules, maxAttempts: 0 };
    expect(validateRules(bad, DEFAULT_SETTINGS.colors).length).toBeGreaterThan(0);
  });
});

describe('חידות — ייצוא וייבוא JSON', () => {
  it('ייצוא ואז ייבוא מחזירים חידה שקולה', () => {
    const puzzle = generateDecisivePuzzle(
      { difficulty: 'easy', requireUniqueSolution: false },
      ALL_BUILTIN_COLORS,
    );
    const json = exportPuzzleJson(puzzle);
    const imported = importPuzzleJson(json);
    expect(imported.rules).toEqual(puzzle.rules);
    expect(imported.history).toEqual(puzzle.history);
    expect(imported.secret).toEqual(puzzle.secret);
  });

  it('JSON פגום נדחה עם הודעה בעברית', () => {
    expect(() => importPuzzleJson('לא json')).toThrow('אינו JSON תקין');
  });

  it('חידה עם מבנה חסר נדחית', () => {
    expect(() => importPuzzleJson('{"version":1}')).toThrow();
    expect(() =>
      importPuzzleJson(JSON.stringify({ version: 1, rules: { codeLength: 4, allowDuplicates: false, activeColorIds: [] }, history: 'x' })),
    ).toThrow();
  });
});

describe('סטטיסטיקות', () => {
  it('רישום ניצחון מעדכן מונים ורצף', () => {
    resetStats();
    const entry = {
      version: 1,
      id: 'g1',
      finishedAt: new Date().toISOString(),
      rules: DEFAULT_SETTINGS.rules,
      colors: DEFAULT_SETTINGS.colors,
      secret: ['red', 'blue', 'green', 'yellow'],
      guesses: [{ guess: ['red', 'blue', 'green', 'yellow'], score: { bulls: 4, hits: 0 } }],
      won: true,
      durationSeconds: 45,
      hintsUsed: 0,
      score: 1000,
    };
    const stats = recordGameFinished(entry);
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.gamesWon).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.fastestWinSeconds).toBe(45);
    expect(loadStats()).toEqual(stats);
  });

  it('הפסד מאפס את רצף הניצחונות', () => {
    resetStats();
    const base = {
      version: 1,
      id: 'g2',
      finishedAt: new Date().toISOString(),
      rules: DEFAULT_SETTINGS.rules,
      colors: DEFAULT_SETTINGS.colors,
      secret: ['red', 'blue', 'green', 'yellow'],
      guesses: [],
      durationSeconds: 60,
      hintsUsed: 0,
      score: 0,
    };
    recordGameFinished({ ...base, id: 'w', won: true });
    const afterLoss = recordGameFinished({ ...base, id: 'l', won: false });
    expect(afterLoss.currentStreak).toBe(0);
    expect(afterLoss.bestStreak).toBe(1);
  });
});
