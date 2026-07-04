import type { AppSettings, ColorDef, GameRules, PuzzleRules } from '../types';
import { LIMITS } from './defaults';

/**
 * אימות חוקי משחק מול רשימת הצבעים.
 * מחזיר רשימת הודעות שגיאה בעברית; רשימה ריקה = חוקי.
 */
export function validateRules(rules: GameRules, colors: ColorDef[]): string[] {
  const errors: string[] = [];
  const { codeLength, maxAttempts, activeColorIds, allowDuplicates, timeLimitSeconds } = rules;

  if (!Number.isInteger(codeLength) || codeLength < LIMITS.codeLength.min || codeLength > LIMITS.codeLength.max) {
    errors.push(`אורך הרצף חייב להיות מספר שלם בין ${LIMITS.codeLength.min} ל־${LIMITS.codeLength.max}.`);
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < LIMITS.maxAttempts.min || maxAttempts > LIMITS.maxAttempts.max) {
    errors.push(`מספר הניסיונות חייב להיות בין ${LIMITS.maxAttempts.min} ל־${LIMITS.maxAttempts.max}.`);
  }

  const knownIds = new Set(colors.map((c) => c.id));
  const unknown = activeColorIds.filter((id) => !knownIds.has(id));
  if (unknown.length > 0) {
    errors.push('נבחרו צבעים שאינם קיימים בפלטה.');
  }
  if (new Set(activeColorIds).size !== activeColorIds.length) {
    errors.push('אותו צבע מופיע פעמיים ברשימת הצבעים הפעילים.');
  }
  if (activeColorIds.length < LIMITS.colorCount.min) {
    errors.push(`נדרשים לפחות ${LIMITS.colorCount.min} צבעים פעילים.`);
  }
  if (activeColorIds.length > LIMITS.colorCount.max) {
    errors.push(`ניתן להפעיל עד ${LIMITS.colorCount.max} צבעים.`);
  }
  if (!allowDuplicates && activeColorIds.length < codeLength) {
    errors.push(
      `כאשר אסור להשתמש בצבעים חוזרים, מספר הצבעים הפעילים (${activeColorIds.length}) חייב להיות לפחות כאורך הרצף (${codeLength}).`,
    );
  }
  if (timeLimitSeconds !== null) {
    if (
      !Number.isInteger(timeLimitSeconds) ||
      timeLimitSeconds < LIMITS.timeLimitSeconds.min ||
      timeLimitSeconds > LIMITS.timeLimitSeconds.max
    ) {
      errors.push(`הגבלת הזמן חייבת להיות בין ${LIMITS.timeLimitSeconds.min} ל־${LIMITS.timeLimitSeconds.max} שניות.`);
    }
  }
  return errors;
}

/** אימות חוקי חידה (תת־קבוצה של חוקי משחק). */
export function validatePuzzleRules(rules: PuzzleRules, colors: ColorDef[]): string[] {
  const asGameRules: GameRules = {
    ...rules,
    maxAttempts: 1,
    timeLimitSeconds: null,
    showAnalysis: true,
    hintsEnabled: true,
    allowUndo: false,
    allowRepeatGuess: true,
    recommendationMode: 'none',
  };
  return validateRules(asGameRules, colors);
}

/** אימות רשימת צבעים (שמות, ערכים, כפילויות). */
export function validateColors(colors: ColorDef[]): string[] {
  const errors: string[] = [];
  if (new Set(colors.map((c) => c.id)).size !== colors.length) {
    errors.push('קיימים שני צבעים עם אותו מזהה פנימי.');
  }
  for (const c of colors) {
    if (!c.name.trim()) errors.push('קיים צבע ללא שם.');
    if (!/^#[0-9a-fA-F]{6}$/.test(c.hex)) errors.push(`ערך הצבע של „${c.name || c.id}” אינו תקין.`);
  }
  return errors;
}

/** אימות מלא של אובייקט הגדרות לפני שמירה. */
export function validateSettings(settings: AppSettings): string[] {
  return [...validateColors(settings.colors), ...validateRules(settings.rules, settings.colors)];
}
