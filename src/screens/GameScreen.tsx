import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppSettings, ColorId, GameHistoryEntry, GuessRecord, Hint, AnalysisResult } from '../types';
import { createGameEngine, type GameEngine, type GameStatus } from '../game-engine/engine';
import { useSolverWorker } from '../hooks/useSolverWorker';
import { calculateGameScore } from '../utils/scoring';
import { addGameToHistory } from '../storage/historyStore';
import { recordGameFinished } from '../storage/statsStore';
import { formatDuration, formatScore } from '../utils/format';
import { sounds } from '../utils/sound';
import { PaletteBar } from '../components/PaletteBar';
import { GuessSlots } from '../components/GuessSlots';
import { ScorePegs } from '../components/ScorePegs';
import { ColorPeg } from '../components/ColorPeg';
import { AnalysisPanel } from '../components/AnalysisPanel';
import { Modal, ConfirmDialog } from '../components/Modal';
import type { Recommendation } from '../solver/recommend';

interface GameScreenProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenInstructions: () => void;
}

/** המסך הראשי — משחק בול פגיעה רגיל. */
export function GameScreen({ settings, onOpenSettings, onOpenInstructions }: GameScreenProps) {
  const solver = useSolverWorker();

  // חוקי המשחק "מוקפאים" ברגע התחלת משחק — שינוי הגדרות חל רק על משחק חדש.
  const [gameRules, setGameRules] = useState(settings.rules);
  const engineRef = useRef<GameEngine | null>(null);
  const [history, setHistory] = useState<GuessRecord[]>([]);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [slots, setSlots] = useState<(ColorId | null)[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(0);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [hints, setHints] = useState<Hint[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<ColorId[] | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const startRef = useRef(0);
  const recordedRef = useRef(false);

  const activeColors = useMemo(
    () => settings.colors.filter((c) => gameRules.activeColorIds.includes(c.id)),
    [settings.colors, gameRules],
  );
  const puzzleRules = useMemo(
    () => ({
      codeLength: gameRules.codeLength,
      allowDuplicates: gameRules.allowDuplicates,
      activeColorIds: gameRules.activeColorIds,
    }),
    [gameRules],
  );

  const startNewGame = useCallback((rules = settings.rules) => {
    engineRef.current = createGameEngine(rules);
    setGameRules(rules);
    setHistory([]);
    setStatus('playing');
    setSlots(Array(rules.codeLength).fill(null));
    setSelectedSlot(0);
    setError(null);
    setElapsed(0);
    setHints([]);
    setAnalysis(null);
    setRecommendation(null);
    setShowEndModal(false);
    setRevealedSecret(null);
    setFinalScore(0);
    startRef.current = Date.now();
    recordedRef.current = false;
  }, [settings.rules]);

  // משחק ראשון עם עליית המסך.
  useEffect(() => {
    if (!engineRef.current) startNewGame();
  }, [startNewGame]);

  const finishGame = useCallback(
    (finalStatus: GameStatus, currentHistory: GuessRecord[]) => {
      const engine = engineRef.current;
      if (!engine || recordedRef.current) return;
      recordedRef.current = true;
      const duration = Math.floor((Date.now() - startRef.current) / 1000);
      const won = finalStatus === 'won';
      const secret = engine.reveal();
      setFinalDuration(duration);
      const score = calculateGameScore({
        rules: gameRules,
        won,
        attemptsUsed: currentHistory.length,
        durationSeconds: duration,
        hintsUsed: hints.length,
      });
      setFinalScore(score);
      setRevealedSecret(secret);
      setShowEndModal(true);
      if (settings.display.sounds) (won ? sounds.win : sounds.lose)();
      const entry: GameHistoryEntry = {
        version: 1,
        id: `game-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        finishedAt: new Date().toISOString(),
        rules: gameRules,
        colors: settings.colors,
        secret,
        guesses: currentHistory,
        won,
        durationSeconds: duration,
        hintsUsed: hints.length,
        score,
      };
      addGameToHistory(entry);
      recordGameFinished(entry);
    },
    [gameRules, hints.length, settings.colors, settings.display.sounds],
  );

  // שעון משחק + אכיפת הגבלת זמן. הבדיקה רצה בתוך ה־callback של
  // ה־interval (אירוע חיצוני), ולא בגוף האפקט — למניעת רינדורים מדורגים.
  useEffect(() => {
    if (status !== 'playing') return;
    const limit = gameRules.timeLimitSeconds;
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(seconds);
      if (limit !== null && seconds >= limit) {
        const engine = engineRef.current;
        if (engine && engine.getStatus() === 'playing') {
          engine.forfeitByTimeout();
          setStatus('lost');
          finishGame('lost', engine.getHistory());
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [status, gameRules.timeLimitSeconds, finishGame]);

  // ניתוח לוגי אחרי כל שינוי בהיסטוריה.
  // חשוב: התלות היא בפונקציה היציבה solver.analyze ולא באובייקט solver
  // כולו — האובייקט מתחדש בכל רינדור (בגלל busy) והיה יוצר לולאה.
  const { analyze } = solver;
  useEffect(() => {
    if (!gameRules.showAnalysis) return;
    let stale = false;
    analyze(puzzleRules, history, gameRules.maxAttempts - history.length)
      .then((result) => {
        if (!stale) setAnalysis(result);
      })
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [history, puzzleRules, gameRules.showAnalysis, gameRules.maxAttempts, analyze]);

  const placeColor = useCallback(
    (colorId: ColorId) => {
      if (status !== 'playing') return;
      setError(null);
      setSlots((prev) => {
        const next = [...prev];
        const target = selectedSlot !== null && selectedSlot < next.length ? selectedSlot : next.indexOf(null);
        if (target === -1 || target === null) return prev;
        next[target] = colorId;
        // קידום הבחירה למקום הריק הבא.
        const nextEmpty = next.findIndex((s, i) => s === null && i > target);
        setSelectedSlot(nextEmpty !== -1 ? nextEmpty : next.indexOf(null) !== -1 ? next.indexOf(null) : null);
        return next;
      });
      if (settings.display.sounds) sounds.place();
    },
    [status, selectedSlot, settings.display.sounds],
  );

  const clearSlot = useCallback((index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setSelectedSlot(index);
  }, []);

  const clearRow = useCallback(() => {
    setSlots(Array(gameRules.codeLength).fill(null));
    setSelectedSlot(0);
    setError(null);
  }, [gameRules.codeLength]);

  const submitGuess = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || status !== 'playing') return;
    const result = engine.submitGuess(slots as ColorId[]);
    if (!result.ok) {
      setError(result.error ?? 'שגיאה');
      if (settings.display.sounds) sounds.error();
      return;
    }
    if (settings.display.sounds) sounds.submit();
    const newHistory = engine.getHistory();
    setHistory(newHistory);
    setSlots(Array(gameRules.codeLength).fill(null));
    setSelectedSlot(0);
    setError(null);
    setRecommendation(null);
    const newStatus = result.status ?? 'playing';
    setStatus(newStatus);
    if (newStatus !== 'playing') finishGame(newStatus, newHistory);
  }, [slots, status, gameRules.codeLength, settings.display.sounds, finishGame]);

  const undoGuess = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.undoLastGuess()) {
      setHistory(engine.getHistory());
      setError(null);
    }
  }, []);

  const { hint: requestHint, recommend } = solver;

  const askHint = useCallback(() => {
    const level = Math.min(3, hints.length + 1) as 1 | 2 | 3;
    requestHint(level, puzzleRules, history, gameRules.maxAttempts - history.length, settings.colors)
      .then((hint) => setHints((prev) => [...prev, hint]))
      .catch(() => setError('לא ניתן לחשב רמז כרגע.'));
  }, [hints.length, requestHint, puzzleRules, history, gameRules.maxAttempts, settings.colors]);

  const askRecommendation = useCallback(() => {
    recommend(gameRules.recommendationMode, puzzleRules, history)
      .then(setRecommendation)
      .catch(() => undefined);
  }, [recommend, gameRules.recommendationMode, puzzleRules, history]);

  // קיצורי מקלדת: ספרות לבחירת צבע, Enter לשליחה, Backspace למחיקה.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showEndModal || confirmNewGame) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      if (e.key === 'Enter') {
        if (!slots.includes(null)) submitGuess();
        return;
      }
      if (e.key === 'Backspace') {
        const lastFilled = slots.map((s, i) => (s !== null ? i : -1)).filter((i) => i >= 0).pop();
        if (lastFilled !== undefined) clearSlot(lastFilled);
        return;
      }
      if (e.key === 'Delete') {
        clearRow();
        return;
      }
      const digit = e.key === '0' ? 10 : parseInt(e.key, 10);
      if (!Number.isNaN(digit) && digit >= 1 && digit <= activeColors.length) {
        placeColor(activeColors[digit - 1].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [slots, activeColors, placeColor, submitGuess, clearSlot, clearRow, showEndModal, confirmNewGame]);

  const requestNewGame = useCallback(() => {
    if (status === 'playing' && history.length > 0) setConfirmNewGame(true);
    else startNewGame();
  }, [status, history.length, startNewGame]);

  const colorOf = (id: ColorId) => settings.colors.find((c) => c.id === id) ?? null;
  const disabledColorIds = useMemo(() => {
    if (gameRules.allowDuplicates) return undefined;
    return new Set(slots.filter((s): s is ColorId => s !== null));
  }, [slots, gameRules.allowDuplicates]);

  const timeDisplay =
    gameRules.timeLimitSeconds !== null
      ? `נותרו ${formatDuration(Math.max(0, gameRules.timeLimitSeconds - elapsed))}`
      : formatDuration(elapsed);

  return (
    <div className="game-layout">
      <section className="game-main">
        <div className="game-toolbar">
          <button className="btn btn--primary" onClick={requestNewGame}>משחק חדש</button>
          <button className="btn" onClick={onOpenSettings}>הגדרות</button>
          <button className="btn" onClick={onOpenInstructions}>הוראות</button>
          {import.meta.env.DEV && (
            <button
              className="btn btn--ghost"
              title="מצב פיתוח בלבד — לא קיים בגרסת Production"
              onClick={() => setRevealedSecret(engineRef.current?.reveal() ?? null)}
            >
              חשוף פתרון (DEV)
            </button>
          )}
        </div>

        <div className="status-bar" role="status">
          <span>ניסיון {Math.min(history.length + 1, gameRules.maxAttempts)} מתוך {gameRules.maxAttempts}</span>
          <span>נותרו {Math.max(0, gameRules.maxAttempts - history.length)} ניסיונות</span>
          <span>אורך רצף: {gameRules.codeLength}</span>
          <span>{activeColors.length} צבעים</span>
          <span>{gameRules.allowDuplicates ? 'כפילויות מותרות' : 'ללא כפילויות'}</span>
          <span className="status-bar__time" title="זמן משחק">⏱ {timeDisplay}</span>
        </div>

        {import.meta.env.DEV && revealedSecret && status === 'playing' && (
          <div className="dev-secret">
            פתרון (DEV): {revealedSecret.map((id, i) => (
              <ColorPeg key={i} color={colorOf(id)} size="sm" showSymbol={settings.display.showSymbols} />
            ))}
          </div>
        )}

        <div className="board">
          {history.map((record, index) => (
            <div key={index} className="board__row">
              <span className="board__index">{index + 1}</span>
              <div className="board__pegs">
                {record.guess.map((id, i) => (
                  <ColorPeg key={i} color={colorOf(id)} size="md" showSymbol={settings.display.showSymbols} />
                ))}
              </div>
              <ScorePegs score={record.score} codeLength={gameRules.codeLength} />
            </div>
          ))}

          {status === 'playing' && (
            <div className="board__row board__row--current">
              <span className="board__index">{history.length + 1}</span>
              <GuessSlots
                slots={slots}
                colors={settings.colors}
                showSymbols={settings.display.showSymbols}
                selectedIndex={selectedSlot}
                onSelectSlot={(i) => setSelectedSlot(i)}
                onClearSlot={clearSlot}
              />
              <div className="board__actions">
                <button
                  className="btn btn--primary"
                  onClick={submitGuess}
                  disabled={slots.includes(null)}
                  title={slots.includes(null) ? 'יש למלא את כל המקומות' : 'שליחת הניחוש (Enter)'}
                >
                  שליחה
                </button>
                <button className="btn" onClick={clearRow} title="ניקוי השורה (Delete)">נקה</button>
                {gameRules.allowUndo && history.length > 0 && (
                  <button className="btn" onClick={undoGuess} title="ביטול הניחוש האחרון">בטל ניחוש</button>
                )}
              </div>
            </div>
          )}
        </div>

        {error && <p className="error-message" role="alert">{error}</p>}

        {status === 'playing' && (
          <>
            <PaletteBar
              colors={activeColors}
              onPick={placeColor}
              showSymbols={settings.display.showSymbols || settings.display.colorBlindMode}
              showNames={settings.display.showColorNames}
              disabledColorIds={disabledColorIds}
            />
            <div className="helper-row">
              {gameRules.hintsEnabled && (
                <button className="btn" onClick={askHint} disabled={solver.busy}>
                  רמז ({hints.length} נוצלו)
                </button>
              )}
              {gameRules.recommendationMode !== 'none' && (
                <button className="btn" onClick={askRecommendation} disabled={solver.busy}>
                  הצג המלצה
                </button>
              )}
            </div>
            {hints.length > 0 && (
              <ul className="hints">
                {hints.map((hint, i) => (
                  <li key={i} className="hints__item">רמז {i + 1}: {hint.text}</li>
                ))}
              </ul>
            )}
            {recommendation && (
              <div className="recommendation">
                <span>{recommendation.reason}:</span>
                {recommendation.guess.map((id, i) => (
                  <ColorPeg key={i} color={colorOf(id)} size="sm" showSymbol={settings.display.showSymbols} />
                ))}
                <button className="btn btn--small" onClick={() => setSlots([...recommendation.guess])}>
                  מלא בשורה
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {gameRules.showAnalysis && (
        <AnalysisPanel analysis={analysis} busy={solver.busy} colors={settings.colors} hasGuesses={history.length > 0} />
      )}

      {confirmNewGame && (
        <ConfirmDialog
          title="להתחיל משחק חדש?"
          message="המשחק הנוכחי עדיין פעיל ויימחק. להמשיך?"
          confirmLabel="משחק חדש"
          danger
          onConfirm={() => {
            setConfirmNewGame(false);
            startNewGame();
          }}
          onCancel={() => setConfirmNewGame(false)}
        />
      )}

      {showEndModal && revealedSecret && (
        <Modal
          title={status === 'won' ? '🎉 ניצחון!' : 'המשחק הסתיים'}
          onClose={() => setShowEndModal(false)}
          footer={
            <>
              <button className="btn btn--primary" onClick={() => startNewGame(gameRules)}>
                משחק חדש באותן הגדרות
              </button>
              <button className="btn" onClick={onOpenSettings}>שינוי הגדרות</button>
              <button className="btn" onClick={() => setShowEndModal(false)}>סגירה</button>
            </>
          }
        >
          {status === 'won' ? (
            <p>מצאתם את הרצף הסודי ב־{history.length} ניסיונות!</p>
          ) : (
            <p>לא נורא — הרצף הסודי היה:</p>
          )}
          <div className="secret-reveal">
            {revealedSecret.map((id, i) => (
              <ColorPeg key={i} color={colorOf(id)} size="lg" showSymbol={settings.display.showSymbols} showName />
            ))}
          </div>
          <div className="summary">
            <p>סיכום המשחק:</p>
            <ul>
              <li>ניסיונות: {history.length} מתוך {gameRules.maxAttempts}</li>
              <li>זמן: {formatDuration(finalDuration)}</li>
              <li>רמזים: {hints.length}</li>
              {history.length > 0 && <li>הניחוש האחרון: {formatScore(history[history.length - 1].score)}</li>}
              <li>ניקוד: {finalScore.toLocaleString('he-IL')}</li>
            </ul>
          </div>
        </Modal>
      )}
    </div>
  );
}
