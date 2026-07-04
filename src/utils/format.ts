import type { Score } from '../types';

/** מספר סודר בעברית עבור מיקום ברצף (1 = הראשון). */
export function hebrewOrdinal(n: number): string {
  const ordinals = ['הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי', 'השישי', 'השביעי', 'השמיני'];
  return ordinals[n - 1] ?? `מספר ${n}`;
}

/** תיאור נגיש של תוצאה: „2 בולים, פגיעה אחת”. */
export function formatScore(score: Score): string {
  const bullsText =
    score.bulls === 0 ? 'אפס בולים' : score.bulls === 1 ? 'בול אחד' : `${score.bulls} בולים`;
  const hitsText =
    score.hits === 0 ? 'אפס פגיעות' : score.hits === 1 ? 'פגיעה אחת' : `${score.hits} פגיעות`;
  return `${bullsText}, ${hitsText}`;
}

/** עיצוב משך זמן בשניות כ־mm:ss או hh:mm:ss. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** עיצוב תאריך־שעה מקומי בעברית. */
export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}
