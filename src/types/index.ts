/**
 * טיפוסי הליבה של המשחק.
 * כל שאר המודולים (מנוע, Solver, ממשק) נשענים על הקובץ הזה בלבד.
 */

/** מזהה פנימי של צבע — אינו תלוי בשם המוצג למשתמש. */
export type ColorId = string;

/** הגדרת צבע בפלטה. */
export interface ColorDef {
  id: ColorId;
  /** שם בעברית המוצג למשתמש. */
  name: string;
  /** ערך צבע (hex). */
  hex: string;
  /** סמל נגישות — מוצג בנוסף לצבע (עיוורון צבעים). */
  symbol: string;
  /** האם זה צבע ברירת מחדל (לא ניתן למחיקה, רק להשבתה). */
  builtin: boolean;
}

export type RecommendationMode = 'possible' | 'max-reduction' | 'random' | 'none';

/** חוקי משחק מלאים. */
export interface GameRules {
  /** אורך הרצף הסודי. */
  codeLength: number;
  /** האם מותר לאותו צבע להופיע יותר מפעם אחת ברצף. */
  allowDuplicates: boolean;
  /** מספר ניסיונות מרבי. */
  maxAttempts: number;
  /** מזהי הצבעים הפעילים במשחק. */
  activeColorIds: ColorId[];
  /** הגבלת זמן בשניות, או null ללא הגבלה. */
  timeLimitSeconds: number | null;
  /** האם להציג את חלונית הניתוח הלוגי בזמן משחק. */
  showAnalysis: boolean;
  /** האם רמזים זמינים. */
  hintsEnabled: boolean;
  /** האם מותר לבטל את הניחוש האחרון. */
  allowUndo: boolean;
  /** האם מותר לחזור על ניחוש שכבר נשלח. */
  allowRepeatGuess: boolean;
  /** סוג ההמלצה של ה־Solver. */
  recommendationMode: RecommendationMode;
}

/** תוצאת ניחוש: בולים (מקום נכון) ופגיעות (צבע נכון, מקום שגוי). */
export interface Score {
  bulls: number;
  hits: number;
}

/** ניחוש שנשלח יחד עם התוצאה שלו. */
export interface GuessRecord {
  guess: ColorId[];
  score: Score;
}

export type DifficultyPresetId = 'easy' | 'normal' | 'hard' | 'expert' | 'custom';

export interface DisplaySettings {
  theme: 'light' | 'dark';
  /** 0.85 = קטן, 1 = רגיל, 1.15 = גדול */
  uiScale: number;
  animations: boolean;
  sounds: boolean;
  showColorNames: boolean;
  showSymbols: boolean;
  colorBlindMode: boolean;
}

/** כל ההגדרות הנשמרות מקומית. */
export interface AppSettings {
  version: number;
  rules: GameRules;
  display: DisplaySettings;
  colors: ColorDef[];
  difficultyPreset: DifficultyPresetId;
}

/** תוצאה של ניתוח מצב המשחק (מחושבת ב־Solver / Worker). */
export interface AnalysisResult {
  /** האם קיים לפחות פתרון אחד העקבי עם כל הניחושים. */
  consistent: boolean;
  /** מספר הפתרונות האפשריים (מדויק אם estimated=false). */
  possibleCount: number;
  /** האם המספר הוא הערכה סטטיסטית (מרחב גדול מדי לספירה מלאה). */
  estimated: boolean;
  /** גודל מרחב האפשרויות הכולל לפי החוקים. */
  totalSpace: number;
  /** האם נותר פתרון יחיד. */
  unique: boolean;
  /** דגימת פתרונות אפשריים (עד תקרה קבועה). */
  sampleSolutions: ColorId[][];
  /** נתוני הצמצום של הניחוש האחרון, אם קיים ניחוש. */
  lastGuessReduction: {
    before: number;
    after: number;
    eliminated: number;
    percent: number;
  } | null;
  /** האם ניתן בוודאות לפתור במסגרת הניסיונות שנותרו. */
  solvableInRemaining: 'yes' | 'unknown' | 'no';
  /** עובדות לוגיות לפי מיקום — משמשות לרמזים. */
  positionFacts: PositionFacts | null;
}

/** עובדות שנגזרות מקבוצת הפתרונות האפשריים. */
export interface PositionFacts {
  /** לכל מיקום — אילו צבעים עדיין אפשריים בו. */
  possibleColorsPerPosition: ColorId[][];
  /** צבעים שמופיעים בכל פתרון אפשרי (חייבים להופיע). */
  mustAppear: ColorId[];
  /** צבעים שאינם מופיעים באף פתרון אפשרי. */
  neverAppear: ColorId[];
  /** מיקומים שבהם הצבע כבר ידוע בוודאות. */
  fixedPositions: { position: number; colorId: ColorId }[];
}

/** חידה (בסיס גם ל"ניחוש מכריע" וגם לחידה ידנית). */
export interface Puzzle {
  version: number;
  id: string;
  name: string;
  createdAt: string;
  rules: PuzzleRules;
  history: GuessRecord[];
  /** הרצף הסודי — קיים רק בחידות שנוצרו אוטומטית. */
  secret?: ColorId[];
  /** הצבעים שבשימוש בחידה (עותק עצמאי, כדי שהחידה תהיה ניידת). */
  colors: ColorDef[];
}

/** חוקי חידה — תת־קבוצה של חוקי המשחק הרלוונטית לחידות. */
export interface PuzzleRules {
  codeLength: number;
  allowDuplicates: boolean;
  activeColorIds: ColorId[];
}

export type DecisiveDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface DecisiveOptions {
  difficulty: DecisiveDifficulty;
  /** האם לדרוש שנותר בדיוק פתרון אחד לפני הניחוש המכריע. */
  requireUniqueSolution: boolean;
}

/** רשומת משחק שהסתיימה — נשמרת בהיסטוריה. */
export interface GameHistoryEntry {
  version: number;
  id: string;
  finishedAt: string;
  rules: GameRules;
  colors: ColorDef[];
  secret: ColorId[];
  guesses: GuessRecord[];
  won: boolean;
  durationSeconds: number;
  hintsUsed: number;
  score: number;
}

/** סטטיסטיקות מצטברות. */
export interface Stats {
  version: number;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  totalAttemptsInWins: number;
  fastestWinSeconds: number | null;
  /** גודל מרחב האפשרויות של המשחק הקשה ביותר שנפתר. */
  hardestSolvedSpace: number | null;
  decisiveSolved: number;
  decisivePlayed: number;
  totalScore: number;
}

/** רמז שהופק ממערכת הרמזים. */
export interface Hint {
  level: 1 | 2 | 3;
  text: string;
}
