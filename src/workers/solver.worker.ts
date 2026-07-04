/**
 * Web Worker לחישובים כבדים של ה־Solver ומחולל החידות.
 * כל החישובים רצים כאן כדי לא לחסום את ממשק המשתמש.
 * הפרוטוקול: כל בקשה נושאת id, וכל תשובה מוחזרת עם אותו id.
 */
import type {
  AnalysisResult,
  ColorDef,
  DecisiveOptions,
  GuessRecord,
  Hint,
  Puzzle,
  PuzzleRules,
  RecommendationMode,
} from '../types';
import { analyzeGameState } from '../solver/analyze';
import { recommendGuess, type Recommendation } from '../solver/recommend';
import { generateHint } from '../solver/hints';
import { checkManualPuzzle, type ManualCheckResult } from '../solver/manual';
import { generateDecisivePuzzle } from '../challenge-generator/generate';

export type SolverRequest =
  | { id: number; type: 'analyze'; rules: PuzzleRules; history: GuessRecord[]; remainingAttempts: number }
  | { id: number; type: 'recommend'; mode: RecommendationMode; rules: PuzzleRules; history: GuessRecord[] }
  | { id: number; type: 'hint'; level: 1 | 2 | 3; rules: PuzzleRules; history: GuessRecord[]; remainingAttempts: number; colors: ColorDef[] }
  | { id: number; type: 'checkManual'; rules: PuzzleRules; history: GuessRecord[] }
  | { id: number; type: 'generatePuzzle'; options: DecisiveOptions; colors: ColorDef[] };

export type SolverResponse =
  | { id: number; ok: true; result: AnalysisResult | Recommendation | null | Hint | ManualCheckResult | Puzzle }
  | { id: number; ok: false; error: string };

self.onmessage = (event: MessageEvent<SolverRequest>) => {
  const request = event.data;
  try {
    let result: AnalysisResult | Recommendation | null | Hint | ManualCheckResult | Puzzle;
    switch (request.type) {
      case 'analyze':
        result = analyzeGameState(request.rules, request.history, request.remainingAttempts);
        break;
      case 'recommend':
        result = recommendGuess(request.mode, request.rules, request.history);
        break;
      case 'hint': {
        const analysis = analyzeGameState(request.rules, request.history, request.remainingAttempts);
        result = generateHint(request.level, analysis, request.rules, request.colors, request.history);
        break;
      }
      case 'checkManual':
        result = checkManualPuzzle(request.rules, request.history);
        break;
      case 'generatePuzzle':
        result = generateDecisivePuzzle(request.options, request.colors);
        break;
    }
    const response: SolverResponse = { id: request.id, ok: true, result };
    self.postMessage(response);
  } catch (error) {
    const response: SolverResponse = {
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : 'שגיאה לא צפויה בחישוב',
    };
    self.postMessage(response);
  }
};
