import { describe, expect, it } from 'vitest';
import { generateDecisivePuzzle } from '../challenge-generator/generate';
import { computePossibleSet, isCandidateConsistent } from '../solver/analyze';
import { ALL_BUILTIN_COLORS } from '../settings/defaults';
import { seededRng } from './testUtils';

describe('generateDecisivePuzzle — מחולל חידות "ניחוש מכריע"', () => {
  it('חידה קלה: עקבית, עם היסטוריה ולפחות פתרון אחד', () => {
    const puzzle = generateDecisivePuzzle(
      { difficulty: 'easy', requireUniqueSolution: false },
      ALL_BUILTIN_COLORS,
      seededRng(100),
    );
    expect(puzzle.history.length).toBeGreaterThanOrEqual(4);
    expect(puzzle.secret).toBeDefined();
    // הסוד עקבי עם כל ההיסטוריה
    expect(isCandidateConsistent(puzzle.secret!, puzzle.history)).toBe(true);
    // נותר לפחות פתרון אחד
    const remaining = computePossibleSet(puzzle.rules, puzzle.history);
    expect(remaining.count).toBeGreaterThanOrEqual(1);
  });

  it('מצב "פתרון יחיד": נותר בדיוק פתרון אחד והוא הסוד', () => {
    const puzzle = generateDecisivePuzzle(
      { difficulty: 'easy', requireUniqueSolution: true },
      ALL_BUILTIN_COLORS,
      seededRng(200),
    );
    const remaining = computePossibleSet(puzzle.rules, puzzle.history);
    expect(remaining.count).toBe(1);
    expect(remaining.samples[0]).toEqual(puzzle.secret);
  });

  it('חידה בינונית עם פתרון יחיד', () => {
    const puzzle = generateDecisivePuzzle(
      { difficulty: 'medium', requireUniqueSolution: true },
      ALL_BUILTIN_COLORS,
      seededRng(300),
    );
    const remaining = computePossibleSet(puzzle.rules, puzzle.history);
    expect(remaining.count).toBe(1);
  });

  it('אין ניחוש בהיסטוריה שהוא הסוד עצמו (בול מלא)', () => {
    const puzzle = generateDecisivePuzzle(
      { difficulty: 'medium', requireUniqueSolution: false },
      ALL_BUILTIN_COLORS,
      seededRng(400),
    );
    for (const record of puzzle.history) {
      expect(record.score.bulls).toBeLessThan(puzzle.rules.codeLength);
    }
  });

  it('חוקי החידה תואמים את פרופיל הקושי', () => {
    const puzzle = generateDecisivePuzzle(
      { difficulty: 'hard', requireUniqueSolution: false },
      ALL_BUILTIN_COLORS,
      seededRng(500),
    );
    expect(puzzle.rules.codeLength).toBe(5);
    expect(puzzle.rules.allowDuplicates).toBe(true);
    expect(puzzle.colors.length).toBe(puzzle.rules.activeColorIds.length);
  });
});
