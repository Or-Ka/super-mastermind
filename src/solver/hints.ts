import type { AnalysisResult, ColorDef, Hint, PuzzleRules } from '../types';
import type { Rng } from '../game-engine/secret';
import { recommendGuess } from './recommend';
import type { GuessRecord } from '../types';
import { hebrewOrdinal } from '../utils/format';

/**
 * מערכת רמזים הדרגתית:
 * רמה 1 — עובדות כלליות (צבע חייב להופיע / לא מופיע / כמה פתרונות נותרו).
 * רמה 2 — עובדות מיקום (צבע לא יכול במקום מסוים / כמה אפשרויות במקום).
 * רמה 3 — ניחוש מומלץ מלא.
 */
export function generateHint(
  level: 1 | 2 | 3,
  analysis: AnalysisResult,
  rules: PuzzleRules,
  colors: ColorDef[],
  history: readonly GuessRecord[],
  rng: Rng = Math.random,
): Hint {
  const nameOf = (id: string) => colors.find((c) => c.id === id)?.name ?? id;
  const facts = analysis.positionFacts;

  if (level === 1) {
    if (facts && facts.neverAppear.length > 0) {
      const names = facts.neverAppear.map(nameOf);
      const text =
        names.length === 1
          ? `הצבע ${names[0]} אינו מופיע כלל בפתרון.`
          : `הצבעים ${names.join(', ')} אינם מופיעים כלל בפתרון.`;
      return { level, text };
    }
    if (facts && facts.mustAppear.length > 0) {
      const pick = facts.mustAppear[Math.floor(rng() * facts.mustAppear.length)];
      return { level, text: `הצבע ${nameOf(pick)} חייב להופיע ברצף.` };
    }
    return {
      level,
      text: analysis.estimated
        ? `נותרו בהערכה כ־${analysis.possibleCount.toLocaleString('he-IL')} רצפים אפשריים.`
        : `נותרו ${analysis.possibleCount.toLocaleString('he-IL')} רצפים אפשריים.`,
    };
  }

  if (level === 2) {
    if (facts) {
      // מעדיפים מיקום שנקבע בוודאות; אחריו — מיקום עם מעט אפשרויות.
      if (facts.fixedPositions.length > 0) {
        const f = facts.fixedPositions[0];
        return {
          level,
          text: `במקום ${hebrewOrdinal(f.position + 1)} נמצא בוודאות הצבע ${nameOf(f.colorId)}.`,
        };
      }
      let bestPos = -1;
      let bestSize = Infinity;
      facts.possibleColorsPerPosition.forEach((options, i) => {
        if (options.length > 1 && options.length < bestSize) {
          bestSize = options.length;
          bestPos = i;
        }
      });
      if (bestPos >= 0) {
        const excluded = rules.activeColorIds.filter(
          (c) => !facts.possibleColorsPerPosition[bestPos].includes(c),
        );
        if (excluded.length > 0 && bestSize > 3) {
          return {
            level,
            text: `הצבע ${nameOf(excluded[0])} אינו יכול להופיע במקום ${hebrewOrdinal(bestPos + 1)}.`,
          };
        }
        return {
          level,
          text: `במקום ${hebrewOrdinal(bestPos + 1)} קיימות רק ${bestSize} אפשרויות.`,
        };
      }
    }
    return { level, text: 'נסו לבחור ניחוש שיבדיל בין האפשרויות שנותרו.' };
  }

  // רמה 3 — ניחוש מומלץ.
  const rec = recommendGuess('max-reduction', rules, history, rng);
  if (rec) {
    return { level, text: `ניחוש מומלץ: ${rec.guess.map(nameOf).join(', ')}.` };
  }
  return { level, text: 'לא ניתן לחשב המלצה במצב הנוכחי.' };
}
