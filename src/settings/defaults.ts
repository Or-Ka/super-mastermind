import type { AppSettings, ColorDef, DifficultyPresetId, GameRules } from '../types';

/** שמונת צבעי ברירת המחדל — מובחנים היטב וכוללים סמל נגישות. */
export const DEFAULT_COLORS: ColorDef[] = [
  { id: 'red', name: 'אדום', hex: '#e53935', symbol: '●', builtin: true },
  { id: 'blue', name: 'כחול', hex: '#1e88e5', symbol: '▲', builtin: true },
  { id: 'green', name: 'ירוק', hex: '#43a047', symbol: '■', builtin: true },
  { id: 'yellow', name: 'צהוב', hex: '#fdd835', symbol: '★', builtin: true },
  { id: 'orange', name: 'כתום', hex: '#fb8c00', symbol: '◆', builtin: true },
  { id: 'purple', name: 'סגול', hex: '#8e24aa', symbol: '✚', builtin: true },
  { id: 'cyan', name: 'טורקיז', hex: '#00acc1', symbol: '✿', builtin: true },
  { id: 'pink', name: 'ורוד', hex: '#ec407a', symbol: '♥', builtin: true },
];

/** צבע נוסף שזמין לרמות הקושי הגבוהות (9 צבעים). */
export const EXTRA_COLOR: ColorDef = {
  id: 'brown', name: 'חום', hex: '#8d6e63', symbol: '✦', builtin: true,
};

export const ALL_BUILTIN_COLORS: ColorDef[] = [...DEFAULT_COLORS, EXTRA_COLOR];

export const DEFAULT_RULES: GameRules = {
  codeLength: 4,
  allowDuplicates: false,
  maxAttempts: 10,
  activeColorIds: DEFAULT_COLORS.map((c) => c.id),
  timeLimitSeconds: null,
  showAnalysis: true,
  hintsEnabled: true,
  allowUndo: false,
  allowRepeatGuess: false,
  recommendationMode: 'possible',
};

export interface DifficultyPreset {
  id: DifficultyPresetId;
  name: string;
  description: string;
  rules: Partial<GameRules>;
}

/**
 * תבניות קושי מוכנות. "מותאם אישית" אינו מופיע כאן —
 * הוא נקבע אוטומטית כשהמשתמש משנה ערך ידנית.
 */
export const DIFFICULTY_PRESETS: DifficultyPreset[] = [
  {
    id: 'easy',
    name: 'קל',
    description: 'רצף של 4 מתוך 6 צבעים, ללא כפילויות, 12 ניסיונות',
    rules: {
      codeLength: 4,
      allowDuplicates: false,
      maxAttempts: 12,
      activeColorIds: DEFAULT_COLORS.slice(0, 6).map((c) => c.id),
    },
  },
  {
    id: 'normal',
    name: 'רגיל',
    description: 'רצף של 4 מתוך 8 צבעים, ללא כפילויות, 10 ניסיונות',
    rules: {
      codeLength: 4,
      allowDuplicates: false,
      maxAttempts: 10,
      activeColorIds: DEFAULT_COLORS.map((c) => c.id),
    },
  },
  {
    id: 'hard',
    name: 'קשה',
    description: 'רצף של 5 מתוך 9 צבעים, עם כפילויות, 10 ניסיונות',
    rules: {
      codeLength: 5,
      allowDuplicates: true,
      maxAttempts: 10,
      activeColorIds: ALL_BUILTIN_COLORS.map((c) => c.id),
    },
  },
  {
    id: 'expert',
    name: 'מומחה',
    description: 'רצף של 6 מתוך 9 צבעים, עם כפילויות, 8 ניסיונות',
    rules: {
      codeLength: 6,
      allowDuplicates: true,
      maxAttempts: 8,
      activeColorIds: ALL_BUILTIN_COLORS.map((c) => c.id),
    },
  },
];

export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  version: SETTINGS_VERSION,
  rules: DEFAULT_RULES,
  display: {
    theme: 'dark',
    uiScale: 1,
    animations: true,
    sounds: true,
    showColorNames: true,
    showSymbols: true,
    colorBlindMode: false,
  },
  colors: ALL_BUILTIN_COLORS,
  difficultyPreset: 'normal',
};

/** גבולות קשיחים של המערכת — משמשים גם את מסך ההגדרות וגם את האימות. */
export const LIMITS = {
  codeLength: { min: 2, max: 8 },
  maxAttempts: { min: 1, max: 20 },
  colorCount: { min: 2, max: 16 },
  timeLimitSeconds: { min: 30, max: 3600 },
} as const;
