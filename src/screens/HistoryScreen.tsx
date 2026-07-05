import { useState } from 'react';
import type { GameHistoryEntry } from '../types';
import { clearGameHistory, deleteGameFromHistory, loadGameHistory } from '../storage/historyStore';
import { downloadTextFile } from '../utils/download';
import { formatDateTime, formatDuration } from '../utils/format';
import { ColorPeg } from '../components/ColorPeg';
import { ScorePegs } from '../components/ScorePegs';
import { Modal, ConfirmDialog } from '../components/Modal';

interface HistoryScreenProps {
  showSymbols: boolean;
}

/** מסך היסטוריית משחקים — צפייה, שחזור מהלך, מחיקה וייצוא. */
export function HistoryScreen({ showSymbols }: HistoryScreenProps) {
  const [history, setHistory] = useState<GameHistoryEntry[]>(() => loadGameHistory());
  const [viewing, setViewing] = useState<GameHistoryEntry | null>(null);
  const [replayStep, setReplayStep] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const colorOf = (entry: GameHistoryEntry, id: string) => entry.colors.find((c) => c.id === id) ?? null;

  const openReplay = (entry: GameHistoryEntry) => {
    setViewing(entry);
    setReplayStep(entry.guesses.length);
  };

  return (
    <div className="history">
      <div className="screen-header">
        <h2>היסטוריית משחקים</h2>
        {history.length > 0 && (
          <div className="screen-header__actions">
            <button className="btn btn--danger" onClick={() => setConfirmClear(true)}>מחיקת כל ההיסטוריה</button>
          </div>
        )}
      </div>

      {history.length === 0 && <p className="info-note">עדיין אין משחקים בהיסטוריה. שחקו משחק ראשון!</p>}

      <div className="history__list">
        {history.map((entry) => (
          <div key={entry.id} className={`history-row ${entry.won ? 'history-row--won' : 'history-row--lost'}`}>
            <span className="history-row__result">{entry.won ? '🏆 ניצחון' : 'הפסד'}</span>
            <span>{formatDateTime(entry.finishedAt)}</span>
            <span>{entry.guesses.length} ניסיונות</span>
            <span>{formatDuration(entry.durationSeconds)}</span>
            <span>ניקוד: {entry.score.toLocaleString('he-IL')}</span>
            <span className="history-row__actions">
              <button className="btn btn--small" onClick={() => openReplay(entry)}>צפייה</button>
              <button
                className="btn btn--small"
                onClick={() => downloadTextFile(`game-${entry.id}.json`, JSON.stringify(entry, null, 2))}
              >
                ייצוא
              </button>
              <button className="btn btn--small btn--danger" onClick={() => setConfirmDelete(entry.id)}>מחיקה</button>
            </span>
          </div>
        ))}
      </div>

      {viewing && (
        <Modal title={`שחזור משחק — ${formatDateTime(viewing.finishedAt)}`} onClose={() => setViewing(null)} wide>
          <p className="info-note">
            {viewing.rules.codeLength} מקומות · {viewing.rules.activeColorIds.length} צבעים ·{' '}
            {viewing.rules.allowDuplicates ? 'כפילויות מותרות' : 'ללא כפילויות'} ·{' '}
            {viewing.won ? 'הסתיים בניצחון' : 'הסתיים בהפסד'}
          </p>
          <div className="replay-controls">
            <button className="btn btn--small" onClick={() => setReplayStep((s) => Math.max(0, s - 1))} disabled={replayStep === 0}>
              ← אחורה
            </button>
            <span>מציג {replayStep} מתוך {viewing.guesses.length} ניחושים</span>
            <button
              className="btn btn--small"
              onClick={() => setReplayStep((s) => Math.min(viewing.guesses.length, s + 1))}
              disabled={replayStep === viewing.guesses.length}
            >
              קדימה →
            </button>
          </div>
          <div className="board">
            {viewing.guesses.slice(0, replayStep).map((record, index) => (
              <div key={index} className="board__row">
                <span className="board__index">{index + 1}</span>
                <div className="board__pegs">
                  {record.guess.map((id, i) => (
                    <ColorPeg key={i} color={colorOf(viewing, id)} size="md" showSymbol={showSymbols} />
                  ))}
                </div>
                <ScorePegs score={record.score} codeLength={viewing.rules.codeLength} />
              </div>
            ))}
          </div>
          {replayStep === viewing.guesses.length && (
            <>
              <p>הרצף הסודי:</p>
              <div className="secret-reveal">
                {viewing.secret.map((id, i) => (
                  <ColorPeg key={i} color={colorOf(viewing, id)} size="lg" showSymbol={showSymbols} showName />
                ))}
              </div>
            </>
          )}
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="מחיקת משחק"
          message="המשחק יימחק מההיסטוריה לצמיתות. להמשיך?"
          confirmLabel="מחיקה"
          danger
          onConfirm={() => {
            setHistory(deleteGameFromHistory(confirmDelete));
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmClear && (
        <ConfirmDialog
          title="מחיקת כל ההיסטוריה"
          message="כל המשחקים השמורים יימחקו לצמיתות. להמשיך?"
          confirmLabel="מחיקת הכול"
          danger
          onConfirm={() => {
            clearGameHistory();
            setHistory([]);
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
