import { useCallback, useMemo, useState } from 'react';
import type { AppSettings, ColorId, GuessRecord, Puzzle, PuzzleRules } from '../types';
import { useSolverWorker } from '../hooks/useSolverWorker';
import type { ManualCheckResult } from '../solver/manual';
import { validatePuzzleRules } from '../settings/validate';
import { PUZZLE_VERSION } from '../challenge-generator/generate';
import { loadSavedPuzzles, savePuzzle, deletePuzzle, exportPuzzleJson, importPuzzleJson } from '../storage/puzzleStore';
import { downloadTextFile, pickTextFile } from '../utils/download';
import { LIMITS } from '../settings/defaults';
import { ColorPeg } from '../components/ColorPeg';
import { ConfirmDialog } from '../components/Modal';

interface ManualScreenProps {
  settings: AppSettings;
}

interface ManualRow {
  guess: (ColorId | null)[];
  bulls: number;
  hits: number;
}

/**
 * מצב הזנת חידה ידנית — המשתמש בונה חידת בול פגיעה בעצמו,
 * בודק עקביות, רואה פתרונות, שומר/טוען ומייבא/מייצא JSON.
 */
export function ManualScreen({ settings }: ManualScreenProps) {
  const solver = useSolverWorker();
  const [codeLength, setCodeLength] = useState(4);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [activeColorIds, setActiveColorIds] = useState<ColorId[]>(
    settings.colors.slice(0, 8).map((c) => c.id),
  );
  const [rows, setRows] = useState<ManualRow[]>([{ guess: Array(4).fill(null), bulls: 0, hits: 0 }]);
  const [checkResult, setCheckResult] = useState<ManualCheckResult | null>(null);
  const [rulesErrors, setRulesErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [savedPuzzles, setSavedPuzzles] = useState<Puzzle[]>(() => loadSavedPuzzles());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [puzzleName, setPuzzleName] = useState('החידה שלי');

  const rules: PuzzleRules = useMemo(
    () => ({ codeLength, allowDuplicates, activeColorIds }),
    [codeLength, allowDuplicates, activeColorIds],
  );
  const activeColors = useMemo(
    () => settings.colors.filter((c) => activeColorIds.includes(c.id)),
    [settings.colors, activeColorIds],
  );
  const colorOf = (id: ColorId | null) => (id ? settings.colors.find((c) => c.id === id) ?? null : null);

  const setRowsForLength = (length: number) => {
    setCodeLength(length);
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        guess: Array.from({ length }, (_, i) => row.guess[i] ?? null),
      })),
    );
    setCheckResult(null);
  };

  const updateRow = (index: number, patch: Partial<ManualRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setCheckResult(null);
    setMessage(null);
  };

  const setRowColor = (rowIndex: number, slotIndex: number, colorId: ColorId | null) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;
        const guess = [...row.guess];
        guess[slotIndex] = colorId;
        return { ...row, guess };
      }),
    );
    setCheckResult(null);
  };

  const completeRows = (): GuessRecord[] | null => {
    const records: GuessRecord[] = [];
    for (const row of rows) {
      if (row.guess.some((g) => g === null)) return null;
      records.push({ guess: row.guess as ColorId[], score: { bulls: row.bulls, hits: row.hits } });
    }
    return records;
  };

  const { checkManual } = solver;

  const check = useCallback(() => {
    const errors = validatePuzzleRules(rules, settings.colors);
    setRulesErrors(errors);
    if (errors.length > 0) return;
    const records = completeRows();
    if (!records) {
      setMessage('יש למלא את כל הצבעים בכל השורות לפני הבדיקה.');
      return;
    }
    setMessage(null);
    checkManual(rules, records)
      .then(setCheckResult)
      .catch(() => setMessage('הבדיקה נכשלה.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules, rows, checkManual, settings.colors]);

  const buildPuzzle = (): Puzzle | null => {
    const records = completeRows();
    if (!records) {
      setMessage('יש למלא את כל הצבעים בכל השורות.');
      return null;
    }
    return {
      version: PUZZLE_VERSION,
      id: `manual-${Date.now()}`,
      name: puzzleName.trim() || 'חידה ידנית',
      createdAt: new Date().toISOString(),
      rules,
      history: records,
      colors: activeColors,
    };
  };

  const save = () => {
    const puzzle = buildPuzzle();
    if (!puzzle) return;
    setSavedPuzzles(savePuzzle(puzzle));
    setMessage(`החידה „${puzzle.name}” נשמרה.`);
  };

  const exportJson = () => {
    const puzzle = buildPuzzle();
    if (!puzzle) return;
    downloadTextFile(`${puzzle.name}.json`, exportPuzzleJson(puzzle));
  };

  const importJson = async () => {
    const content = await pickTextFile();
    if (content === null) return;
    try {
      const puzzle = importPuzzleJson(content);
      loadPuzzle(puzzle);
      setMessage(`החידה „${puzzle.name}” יובאה בהצלחה.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ייבוא נכשל.');
    }
  };

  const loadPuzzle = (puzzle: Puzzle) => {
    setCodeLength(puzzle.rules.codeLength);
    setAllowDuplicates(puzzle.rules.allowDuplicates);
    setActiveColorIds(puzzle.rules.activeColorIds);
    setRows(
      puzzle.history.map((record) => ({
        guess: [...record.guess],
        bulls: record.score.bulls,
        hits: record.score.hits,
      })),
    );
    setPuzzleName(puzzle.name);
    setCheckResult(null);
  };

  return (
    <div className="manual">
      <div className="screen-header">
        <h2>הזנת חידה ידנית</h2>
        <p className="screen-header__subtitle">
          בנו חידת בול פגיעה משלכם: הזינו ניחושים וציונים, ובדקו אם החידה עקבית וכמה פתרונות יש לה.
        </p>
      </div>

      <section className="settings__section">
        <h3>חוקי החידה</h3>
        <div className="fields">
          <label className="field">
            אורך הרצף
            <input
              type="number"
              min={LIMITS.codeLength.min}
              max={LIMITS.codeLength.max}
              value={codeLength}
              onChange={(e) => setRowsForLength(Number(e.target.value))}
            />
          </label>
          <label className="field field--checkbox">
            <input type="checkbox" checked={allowDuplicates} onChange={(e) => { setAllowDuplicates(e.target.checked); setCheckResult(null); }} />
            מותרות כפילויות
          </label>
        </div>
        <div className="chip-list">
          {settings.colors.map((color) => (
            <button
              key={color.id}
              className={`chip ${activeColorIds.includes(color.id) ? 'chip--active' : ''}`}
              onClick={() => {
                setActiveColorIds((prev) =>
                  prev.includes(color.id) ? prev.filter((id) => id !== color.id) : [...prev, color.id],
                );
                setCheckResult(null);
              }}
            >
              <ColorPeg color={color} size="sm" showSymbol={settings.display.showSymbols} />
              {color.name}
            </button>
          ))}
        </div>
        {rulesErrors.length > 0 && (
          <div className="error-box" role="alert">
            <ul>{rulesErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}
      </section>

      <section className="settings__section">
        <h3>ניחושים וציונים</h3>
        {rows.map((row, rowIndex) => {
          const rowError = checkResult?.rowErrors.find((e) => e.index === rowIndex);
          const isContradiction = checkResult?.firstContradictionIndex === rowIndex;
          return (
            <div key={rowIndex} className={`manual-row ${rowError || isContradiction ? 'manual-row--error' : ''}`}>
              <span className="board__index">{rowIndex + 1}</span>
              <div className="board__pegs">
                {row.guess.map((slot, slotIndex) => (
                  <select
                    key={slotIndex}
                    className="manual-row__color-select"
                    value={slot ?? ''}
                    style={slot ? { background: colorOf(slot)?.hex } : undefined}
                    onChange={(e) => setRowColor(rowIndex, slotIndex, e.target.value || null)}
                    aria-label={`מקום ${slotIndex + 1} בשורה ${rowIndex + 1}`}
                  >
                    <option value="">—</option>
                    {activeColors.map((color) => (
                      <option key={color.id} value={color.id}>{color.name}</option>
                    ))}
                  </select>
                ))}
              </div>
              <label className="manual-row__score">
                בולים
                <input
                  type="number"
                  min={0}
                  max={codeLength}
                  value={row.bulls}
                  onChange={(e) => updateRow(rowIndex, { bulls: Number(e.target.value) })}
                />
              </label>
              <label className="manual-row__score">
                פגיעות
                <input
                  type="number"
                  min={0}
                  max={codeLength}
                  value={row.hits}
                  onChange={(e) => updateRow(rowIndex, { hits: Number(e.target.value) })}
                />
              </label>
              <button
                className="btn btn--icon"
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== rowIndex))}
                disabled={rows.length === 1}
                title="מחיקת שורה"
              >
                🗑
              </button>
              {rowError && <p className="error-message">{rowError.error}</p>}
              {isContradiction && (
                <p className="error-message">
                  החל מהשורה הזו אין אף רצף שמתאים לכל הציונים — כאן נוצרת הסתירה.
                </p>
              )}
            </div>
          );
        })}
        <div className="helper-row">
          <button
            className="btn"
            onClick={() => setRows((prev) => [...prev, { guess: Array(codeLength).fill(null), bulls: 0, hits: 0 }])}
          >
            הוספת שורה
          </button>
          <button className="btn btn--primary" onClick={check} disabled={solver.busy}>
            {solver.busy ? 'בודק…' : 'בדיקת עקביות'}
          </button>
        </div>
      </section>

      {message && <p className="info-note" role="status">{message}</p>}

      {checkResult && (
        <section className="settings__section">
          <h3>תוצאת הבדיקה</h3>
          {checkResult.rowErrors.length > 0 && (
            <p className="error-message">קיימות שורות עם ציונים בלתי אפשריים — ראו הסימון האדום למעלה.</p>
          )}
          {checkResult.consistent ? (
            <>
              <p className="success-note">
                החידה עקבית. {checkResult.estimated
                  ? `נותרו בהערכה כ־${checkResult.possibleCount.toLocaleString('he-IL')} פתרונות.`
                  : checkResult.possibleCount === 1
                    ? 'קיים בדיוק פתרון אחד!'
                    : `קיימים ${checkResult.possibleCount.toLocaleString('he-IL')} פתרונות אפשריים.`}
              </p>
              {!checkResult.estimated && checkResult.possibleCount <= 50 && (
                <div className="solutions-list">
                  {checkResult.sampleSolutions.slice(0, 50).map((solution, i) => (
                    <div key={i} className="solutions-list__row">
                      {solution.map((id, j) => (
                        <ColorPeg key={j} color={colorOf(id)} size="sm" showSymbol={settings.display.showSymbols} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="error-message">
              קיימת סתירה בין תוצאות הניחושים, ולכן אין רצף שמתאים לכולן.
              {checkResult.firstContradictionIndex !== null &&
                ` הסתירה נוצרת בשורה ${checkResult.firstContradictionIndex + 1}.`}
            </p>
          )}
        </section>
      )}

      <section className="settings__section">
        <h3>שמירה, טעינה וייבוא</h3>
        <div className="helper-row">
          <label className="field">
            שם החידה
            <input type="text" value={puzzleName} onChange={(e) => setPuzzleName(e.target.value)} />
          </label>
          <button className="btn" onClick={save}>שמור חידה</button>
          <button className="btn" onClick={exportJson}>ייצוא JSON</button>
          <button className="btn" onClick={importJson}>ייבוא JSON</button>
        </div>
        {savedPuzzles.length > 0 && (
          <div className="saved-list">
            {savedPuzzles.map((saved) => (
              <div key={saved.id} className="saved-list__row">
                <span>{saved.name}</span>
                <span className="saved-list__meta">
                  {saved.rules.codeLength} מקומות · {saved.history.length} ניחושים
                </span>
                <button className="btn btn--small" onClick={() => loadPuzzle(saved)}>טעינה</button>
                <button
                  className="btn btn--small"
                  onClick={() => downloadTextFile(`${saved.name}.json`, exportPuzzleJson(saved))}
                >
                  ייצוא
                </button>
                <button className="btn btn--small btn--danger" onClick={() => setConfirmDelete(saved.id)}>
                  מחיקה
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {confirmDelete && (
        <ConfirmDialog
          title="מחיקת חידה"
          message="החידה תימחק לצמיתות. להמשיך?"
          confirmLabel="מחיקה"
          danger
          onConfirm={() => {
            setSavedPuzzles(deletePuzzle(confirmDelete));
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
