import type { ColorId, GuessRecord } from '../types';

export interface GuessRulesSubset {
  codeLength: number;
  allowDuplicates: boolean;
  activeColorIds: ColorId[];
  allowRepeatGuess: boolean;
}

/**
 * אימות ניחוש לפני שליחה.
 * מחזיר הודעת שגיאה בעברית, או null אם הניחוש חוקי.
 */
export function validateGuess(
  guess: readonly (ColorId | null)[],
  rules: GuessRulesSubset,
  history: readonly GuessRecord[] = [],
): string | null {
  if (guess.length !== rules.codeLength || guess.some((c) => c === null)) {
    return 'יש למלא את כל המקומות ברצף לפני שליחה.';
  }
  const full = guess as ColorId[];

  const active = new Set(rules.activeColorIds);
  if (full.some((c) => !active.has(c))) {
    return 'הניחוש כולל צבע שאינו פעיל במשחק הנוכחי.';
  }
  if (!rules.allowDuplicates && new Set(full).size !== full.length) {
    return 'לפי חוקי המשחק אסור להשתמש באותו צבע פעמיים.';
  }
  if (!rules.allowRepeatGuess) {
    const key = full.join(',');
    if (history.some((r) => r.guess.join(',') === key)) {
      return 'הניחוש הזה כבר נשלח. נסו ניחוש אחר.';
    }
  }
  return null;
}
