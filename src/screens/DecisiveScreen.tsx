import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnalysisResult, AppSettings, ColorId, DecisiveDifficulty, Hint, Puzzle } from '../types';
import { useSolverWorker } from '../hooks/useSolverWorker';
import { isCandidateConsistent } from '../solver/analyze';
import { recordDecisiveResult } from '../storage/statsStore';
import { savePuzzle, exportPuzzleJson } from '../storage/puzzleStore';
import { downloadTextFile } from '../utils/download';
import { sounds } from '../utils/sound';
import { validateGuess } from '../game-engine/validateGuess';
import { PaletteBar } from '../components/PaletteBar';
import { GuessSlots } from '../components/GuessSlots';
import { ScorePegs } from '../components/ScorePegs';
import { ColorPeg } from '../components/ColorPeg';
import { AnalysisPanel } from '../components/AnalysisPanel';
import { Modal } from '../components/Modal';

interface DecisiveScreenProps {
  settings: AppSettings;
}

type DecisiveResult = 'win' | 'consistent-miss' | 'inconsistent-miss';

/**
 * מצב „ניחוש מכריע” — מוצגת היסטוריה מוכנה של ניחושים,
 * ולשחקן ניסיון אחד בלבד למצוא את הרצף הסודי.
 */
export function DecisiveScreen({ settings }: DecisiveScreenProps) {
  const solver = useSolverWorker();
  const [difficulty, setDifficulty] = useState<DecisiveDifficulty>('easy');
  const [requireUnique, setRequireUnique] = useState(true);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<(ColorId | null)[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(0);
  const [result, setResult] = useState<DecisiveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const recordedRef = useRef(false);
  const firstPuzzleRef = useRef(false);

  const puzzleColors = useMemo(() => puzzle?.colors ?? [], [puzzle]);
  const activeColors = useMemo(
    () => puzzleColors.filter((c) => puzzle?.rules.activeColorIds.includes(c.id)),
    [puzzleColors, puzzle],
  );

  // תלות בפונקציות היציבות של ה־Worker בלבד (לא באובייקט solver המתחדש).
  const { analyze, generatePuzzle, hint: requestHint } = solver;

  const newPuzzle = useCallback(() => {
    setLoading(true);
    setResult(null);
    setError(null);
    setAnalysis(null);
    setRemainingCount(null);
    setHints([]);
    recordedRef.current = false;
    generatePuzzle({ difficulty, requireUniqueSolution: requireUnique }, settings.colors)
      .then((generated) => {
        setPuzzle(generated);
        setSlots(Array(generated.rules.codeLength).fill(null));
        setSelectedSlot(0);
      })
      .catch(() => setError('יצירת החידה נכשלה. נסו שוב.'))
      .finally(() => setLoading(false));
  }, [generatePuzzle, difficulty, requireUnique, settings.colors]);

  // חידה ראשונה בכניסה למסך — נדחית ל־macrotask כדי לא לעדכן state
  // באופן סינכרוני בתוך גוף האפקט.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!firstPuzzleRef.current) {
        firstPuzzleRef.current = true;
        newPuzzle();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [newPuzzle]);

  // ניתוח אופציונלי (ניתן להסתרה עבור אתגר גדול יותר).
  useEffect(() => {
    if (!puzzle || !showAnalysis) return;
    let stale = false;
    analyze(puzzle.rules, puzzle.history, 1)
      .then((a) => {
        if (!stale) setAnalysis(a);
      })
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [puzzle, showAnalysis, analyze]);

  const placeColor = useCallback(
    (colorId: ColorId) => {
      if (!puzzle || result === 'win') return;
      setError(null);
      setSlots((prev) => {
        const next = [...prev];
        const target = selectedSlot !== null && selectedSlot < next.length ? selectedSlot : next.indexOf(null);
        if (target === -1 || target === null) return prev;
        next[target] = colorId;
        const nextEmpty = next.findIndex((s, i) => s === null && i > target);
        setSelectedSlot(nextEmpty !== -1 ? nextEmpty : next.indexOf(null) !== -1 ? next.indexOf(null) : null);
        return next;
      });
      if (settings.display.sounds) sounds.place();
    },
    [puzzle, result, selectedSlot, settings.display.sounds],
  );

  const submit = useCallback(() => {
    if (!puzzle || !puzzle.secret) return;
    const validationError = validateGuess(slots, {
      codeLength: puzzle.rules.codeLength,
      allowDuplicates: puzzle.rules.allowDuplicates,
      activeColorIds: puzzle.rules.activeColorIds,
      allowRepeatGuess: true,
    });
    if (validationError) {
      setError(validationError);
      if (settings.display.sounds) sounds.error();
      return;
    }
    const guess = slots as ColorId[];
    let outcome: DecisiveResult;
    if (guess.join(',') === puzzle.secret.join(',')) {
      outcome = 'win';
    } else if (isCandidateConsistent(guess, puzzle.history)) {
      outcome = 'consistent-miss';
    } else {
      outcome = 'inconsistent-miss';
    }
    setResult(outcome);
    if (settings.display.sounds) (outcome === 'win' ? sounds.win : sounds.lose)();
    // כל חידה נספרת בסטטיסטיקות פעם אחת — לפי הניסיון הראשון.
    if (!recordedRef.current) {
      recordedRef.current = true;
      recordDecisiveResult(outcome === 'win');
    }
  }, [puzzle, slots, settings.display.sounds]);

  const askHint = useCallback(() => {
    if (!puzzle) return;
    const level = Math.min(3, hints.length + 1) as 1 | 2 | 3;
    requestHint(level, puzzle.rules, puzzle.history, 1, puzzle.colors)
      .then((hint) => setHints((prev) => [...prev, hint]))
      .catch(() => setError('לא ניתן לחשב רמז כרגע.'));
  }, [puzzle, hints.length, requestHint]);

  const showRemaining = useCallback(() => {
    if (!puzzle) return;
    analyze(puzzle.rules, puzzle.history, 1)
      .then((a) => setRemainingCount(a.possibleCount))
      .catch(() => undefined);
  }, [puzzle, analyze]);

  const colorOf = (id: ColorId) => puzzleColors.find((c) => c.id === id) ?? null;
  const disabledColorIds = useMemo(() => {
    if (!puzzle || puzzle.rules.allowDuplicates) return undefined;
    return new Set(slots.filter((s): s is ColorId => s !== null));
  }, [slots, puzzle]);

  return (
    <div className="game-layout">
      <section className="game-main">
        <div className="screen-header">
          <h2>ניחוש מכריע</h2>
          <p className="screen-header__subtitle">
            לפניכם היסטוריית ניחושים מוכנה. יש לכם ניסיון אחד בלבד למצוא את הרצף הסודי.
          </p>
        </div>

        <div className="decisive-controls">
          <label className="field">
            דרגת קושי
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as DecisiveDifficulty)}>
              <option value="easy">קל (4 מתוך 6, ללא כפילויות)</option>
              <option value="medium">בינוני (4 מתוך 8, ללא כפילויות)</option>
              <option value="hard">קשה (5 מתוך 8, עם כפילויות)</option>
              <option value="expert">מומחה (5 מתוך 9, עם כפילויות)</option>
            </select>
          </label>
          <label className="field field--checkbox" title="כשמסומן — לחידה יש בדיוק פתרון אחד אפשרי">
            <input type="checkbox" checked={requireUnique} onChange={(e) => setRequireUnique(e.target.checked)} />
            חידה עם פתרון יחיד בלבד
          </label>
          <button className="btn btn--primary" onClick={newPuzzle} disabled={loading}>
            {loading ? 'יוצר חידה…' : 'חידה חדשה'}
          </button>
          <label className="field field--checkbox">
            <input type="checkbox" checked={showAnalysis} onChange={(e) => setShowAnalysis(e.target.checked)} />
            הצגת חלונית ניתוח
          </label>
        </div>

        {loading && <p className="loading-note">בונה חידה עקבית ומעניינת — זה עשוי לקחת מספר שניות…</p>}

        {puzzle && !loading && (
          <>
            <div className="board">
              {puzzle.history.map((record, index) => (
                <div key={index} className="board__row">
                  <span className="board__index">{index + 1}</span>
                  <div className="board__pegs">
                    {record.guess.map((id, i) => (
                      <ColorPeg key={i} color={colorOf(id)} size="md" showSymbol={settings.display.showSymbols} />
                    ))}
                  </div>
                  <ScorePegs score={record.score} codeLength={puzzle.rules.codeLength} />
                </div>
              ))}

              <div className="board__row board__row--current">
                <span className="board__index">{puzzle.history.length + 1}</span>
                <GuessSlots
                  slots={slots}
                  colors={puzzleColors}
                  showSymbols={settings.display.showSymbols}
                  selectedIndex={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                  onClearSlot={(i) =>
                    setSlots((prev) => {
                      const next = [...prev];
                      next[i] = null;
                      return next;
                    })
                  }
                  disabled={result === 'win'}
                />
                <div className="board__actions">
                  <button className="btn btn--primary" onClick={submit} disabled={slots.includes(null) || result === 'win'}>
                    ניחוש מכריע!
                  </button>
                  <button className="btn" onClick={() => setSlots(Array(puzzle.rules.codeLength).fill(null))}>
                    נקה
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="error-message" role="alert">{error}</p>}

            {result !== 'win' && (
              <PaletteBar
                colors={activeColors}
                onPick={placeColor}
                showSymbols={settings.display.showSymbols || settings.display.colorBlindMode}
                showNames={settings.display.showColorNames}
                disabledColorIds={disabledColorIds}
              />
            )}

            <div className="helper-row">
              <button className="btn" onClick={askHint} disabled={solver.busy}>רמז ({hints.length})</button>
              <button className="btn" onClick={showRemaining} disabled={solver.busy}>כמה פתרונות נותרו?</button>
              <button className="btn" onClick={() => savePuzzle(puzzle)}>שמור חידה</button>
              <button
                className="btn"
                onClick={() => downloadTextFile(`${puzzle.name}.json`, exportPuzzleJson(puzzle))}
              >
                ייצוא JSON
              </button>
            </div>

            {remainingCount !== null && (
              <p className="info-note">
                {remainingCount === 1
                  ? 'נותר פתרון אפשרי אחד בלבד.'
                  : `נותרו ${remainingCount.toLocaleString('he-IL')} פתרונות אפשריים.`}
              </p>
            )}

            {hints.length > 0 && (
              <ul className="hints">
                {hints.map((hint, i) => (
                  <li key={i} className="hints__item">רמז {i + 1}: {hint.text}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {showAnalysis && puzzle && (
        <AnalysisPanel analysis={analysis} busy={solver.busy} colors={puzzleColors} hasGuesses history={puzzle?.history ?? []} />
      )}

      {result && puzzle?.secret && (
        <Modal
          title={
            result === 'win'
              ? '🎯 פתרתם את החידה!'
              : result === 'consistent-miss'
                ? 'כמעט!'
                : 'לא הפעם'
          }
          onClose={() => setResult(null)}
          footer={
            <>
              {result !== 'win' && (
                <button className="btn btn--primary" onClick={() => setResult(null)}>נסו שוב</button>
              )}
              <button className="btn" onClick={newPuzzle}>חידה חדשה</button>
            </>
          }
        >
          {result === 'win' && (
            <>
              <p>מצאתם את הרצף הסודי בניחוש המכריע!</p>
              <div className="secret-reveal">
                {puzzle.secret.map((id, i) => (
                  <ColorPeg key={i} color={colorOf(id)} size="lg" showSymbol={settings.display.showSymbols} showName />
                ))}
              </div>
            </>
          )}
          {result === 'consistent-miss' && (
            <p>
              הניחוש שלכם עקבי עם כל הנתונים — אבל הוא אינו הרצף הסודי.
              {requireUnique
                ? ' בדקו שוב: קיים רק פתרון אחד שמתאים לכל הרמזים.'
                : ' בחידה זו נותרו כמה פתרונות אפשריים; נסו לבחור מחדש.'}
            </p>
          )}
          {result === 'inconsistent-miss' && (
            <p>הניחוש שלכם סותר את אחד הרמזים בהיסטוריה. בדקו שוב את הבולים והפגיעות של כל שורה.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
