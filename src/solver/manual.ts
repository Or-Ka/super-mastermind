import type { ColorId, GuessRecord, PuzzleRules, Score } from '../types';
import { isScoreShapeValid } from '../game-engine/score';
import type { Rng } from '../game-engine/secret';
import { computePossibleSet, type PossibleSetResult } from './analyze';

export interface ManualCheckResult {
  /** שגיאות מקומיות לכל שורה (צורת ציון בלתי אפשרית וכדומה). */
  rowErrors: { index: number; error: string }[];
  /** האם קיים פתרון העקבי עם כל השורות יחד. */
  consistent: boolean;
  possibleCount: number;
  estimated: boolean;
  sampleSolutions: ColorId[][];
  /**
   * האינדקס של הניחוש הראשון שממנו והלאה אין אף פתרון,
   * או null אם אין סתירה. משמש להסבר הסתירה למשתמש.
   */
  firstContradictionIndex: number | null;
}

/** בדיקות מקומיות לשורה בודדת, ללא תלות בשאר השורות. */
export function validateManualRow(
  guess: readonly ColorId[],
  score: Score,
  rules: PuzzleRules,
): string | null {
  if (guess.length !== rules.codeLength) return 'אורך הניחוש אינו תואם את אורך הרצף.';
  const active = new Set(rules.activeColorIds);
  if (guess.some((c) => !active.has(c))) return 'הניחוש כולל צבע שאינו פעיל בחידה.';
  if (!isScoreShapeValid(score, rules.codeLength)) {
    return 'הציון אינו אפשרי: סכום הבולים והפגיעות חייב להיות עד אורך הרצף, ולא ייתכן מצב של „כל הרצף נכון חוץ ממקום אחד” עם פגיעה.';
  }
  if (!rules.allowDuplicates) {
    // כשהקוד ללא כפילויות, צבע שמופיע בניחוש k פעמים תורם לכל היותר
    // התאמה אחת — לכן סך הבולים+פגיעות מוגבל במספר הצבעים השונים בניחוש.
    const distinct = new Set(guess).size;
    if (score.bulls + score.hits > distinct) {
      return 'הציון אינו אפשרי: כשהרצף הסודי ללא כפילויות, צבע חוזר בניחוש נספר פעם אחת לכל היותר.';
    }
  }
  return null;
}

/**
 * בדיקת עקביות מלאה של חידה ידנית.
 * אם קיימת סתירה — מאתרים את הניחוש הראשון שבו מרחב הפתרונות מתרוקן,
 * כדי להציג הסבר ממוקד ולא רק "יש סתירה".
 */
export function checkManualPuzzle(
  rules: PuzzleRules,
  history: readonly GuessRecord[],
  rng: Rng = Math.random,
): ManualCheckResult {
  const rowErrors: ManualCheckResult['rowErrors'] = [];
  history.forEach((record, index) => {
    const error = validateManualRow(record.guess, record.score, rules);
    if (error) rowErrors.push({ index, error });
  });

  const full: PossibleSetResult = computePossibleSet(rules, history, rng);

  let firstContradictionIndex: number | null = null;
  if (full.count === 0 && !full.estimated) {
    // חיפוש הקידומת הקצרה ביותר שכבר אין לה פתרון.
    for (let prefixLen = 1; prefixLen <= history.length; prefixLen++) {
      const prefixResult = computePossibleSet(rules, history.slice(0, prefixLen), rng);
      if (prefixResult.count === 0) {
        firstContradictionIndex = prefixLen - 1;
        break;
      }
    }
  }

  return {
    rowErrors,
    consistent: full.count > 0,
    possibleCount: full.count,
    estimated: full.estimated,
    sampleSolutions: full.samples,
    firstContradictionIndex,
  };
}
