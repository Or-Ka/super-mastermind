import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { Recommendation } from '../solver/recommend';
import type { ManualCheckResult } from '../solver/manual';
import type { SolverResponse } from '../workers/solver.worker';

/**
 * Hook לתקשורת עם ה־Solver Worker.
 * מנהל מיפוי id→Promise כך שכל קריאה מקבלת את התשובה הנכונה,
 * וחושף דגל busy להצגת "מחשב..." בממשק בלי להקפיא אותו.
 */
export function useSolverWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>());
  const idRef = useRef(0);
  const [busyCount, setBusyCount] = useState(0);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/solver.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event: MessageEvent<SolverResponse>) => {
      const { id } = event.data;
      const pending = pendingRef.current.get(id);
      if (!pending) return;
      pendingRef.current.delete(id);
      setBusyCount((n) => Math.max(0, n - 1));
      if (event.data.ok) pending.resolve(event.data.result);
      else pending.reject(new Error(event.data.error));
    };
    workerRef.current = worker;
    const pendingAtSetup = pendingRef.current;
    return () => {
      worker.terminate();
      pendingAtSetup.clear();
    };
  }, []);

  const request = useCallback(<T,>(payload: Record<string, unknown>): Promise<T> => {
    const worker = workerRef.current;
    if (!worker) return Promise.reject(new Error('ה־Worker אינו זמין'));
    const id = ++idRef.current;
    setBusyCount((n) => n + 1);
    return new Promise<T>((resolve, reject) => {
      pendingRef.current.set(id, { resolve: resolve as (v: unknown) => void, reject });
      worker.postMessage({ id, ...payload });
    });
  }, []);

  const analyze = useCallback(
    (rules: PuzzleRules, history: GuessRecord[], remainingAttempts: number) =>
      request<AnalysisResult>({ type: 'analyze', rules, history, remainingAttempts }),
    [request],
  );

  const recommend = useCallback(
    (mode: RecommendationMode, rules: PuzzleRules, history: GuessRecord[]) =>
      request<Recommendation | null>({ type: 'recommend', mode, rules, history }),
    [request],
  );

  const hint = useCallback(
    (level: 1 | 2 | 3, rules: PuzzleRules, history: GuessRecord[], remainingAttempts: number, colors: ColorDef[]) =>
      request<Hint>({ type: 'hint', level, rules, history, remainingAttempts, colors }),
    [request],
  );

  const checkManual = useCallback(
    (rules: PuzzleRules, history: GuessRecord[]) =>
      request<ManualCheckResult>({ type: 'checkManual', rules, history }),
    [request],
  );

  const generatePuzzle = useCallback(
    (options: DecisiveOptions, colors: ColorDef[]) =>
      request<Puzzle>({ type: 'generatePuzzle', options, colors }),
    [request],
  );

  return { analyze, recommend, hint, checkManual, generatePuzzle, busy: busyCount > 0 };
}
