import { useState } from 'react';
import { loadStats, resetStats } from '../storage/statsStore';
import { formatDuration } from '../utils/format';
import { ConfirmDialog } from '../components/Modal';

/** מסך סטטיסטיקות מקומיות. */
export function StatsScreen() {
  const [stats, setStats] = useState(() => loadStats());
  const [confirmReset, setConfirmReset] = useState(false);

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const avgAttempts =
    stats.gamesWon > 0 ? (stats.totalAttemptsInWins / stats.gamesWon).toFixed(1) : '—';

  const cards: { label: string; value: string }[] = [
    { label: 'משחקים', value: String(stats.gamesPlayed) },
    { label: 'ניצחונות', value: String(stats.gamesWon) },
    { label: 'אחוז הצלחה', value: `${winRate}%` },
    { label: 'רצף ניצחונות נוכחי', value: String(stats.currentStreak) },
    { label: 'רצף הניצחונות הטוב ביותר', value: String(stats.bestStreak) },
    { label: 'ממוצע ניסיונות לניצחון', value: avgAttempts },
    {
      label: 'הניצחון המהיר ביותר',
      value: stats.fastestWinSeconds !== null ? formatDuration(stats.fastestWinSeconds) : '—',
    },
    {
      label: 'המשחק הקשה ביותר שנפתר',
      value:
        stats.hardestSolvedSpace !== null
          ? `${stats.hardestSolvedSpace.toLocaleString('he-IL')} אפשרויות`
          : '—',
    },
    { label: 'חידות „ניחוש מכריע” שנפתרו', value: `${stats.decisiveSolved} מתוך ${stats.decisivePlayed}` },
    { label: 'ניקוד מצטבר', value: stats.totalScore.toLocaleString('he-IL') },
  ];

  return (
    <div className="stats">
      <div className="screen-header">
        <h2>סטטיסטיקות</h2>
        <div className="screen-header__actions">
          <button className="btn btn--danger" onClick={() => setConfirmReset(true)}>איפוס סטטיסטיקות</button>
        </div>
      </div>

      <div className="stats__grid">
        {cards.map((card) => (
          <div key={card.label} className="stat-card">
            <span className="stat-card__value">{card.value}</span>
            <span className="stat-card__label">{card.label}</span>
          </div>
        ))}
      </div>

      {confirmReset && (
        <ConfirmDialog
          title="איפוס סטטיסטיקות"
          message="כל הסטטיסטיקות יימחקו לצמיתות. להמשיך?"
          confirmLabel="איפוס"
          danger
          onConfirm={() => {
            setStats(resetStats());
            setConfirmReset(false);
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}
