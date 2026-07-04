import type { GameHistoryEntry, Stats } from '../types';
import { totalSpaceSize } from '../solver/enumerate';
import { loadJson, saveJson, STORAGE_KEYS } from './local';

export const STATS_VERSION = 1;

export const EMPTY_STATS: Stats = {
  version: STATS_VERSION,
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalAttemptsInWins: 0,
  fastestWinSeconds: null,
  hardestSolvedSpace: null,
  decisiveSolved: 0,
  decisivePlayed: 0,
  totalScore: 0,
};

export function loadStats(): Stats {
  const stored = loadJson<Stats | null>(STORAGE_KEYS.stats, null);
  if (!stored || stored.version !== STATS_VERSION) return { ...EMPTY_STATS };
  return { ...EMPTY_STATS, ...stored };
}

export function saveStats(stats: Stats): void {
  saveJson(STORAGE_KEYS.stats, stats);
}

export function resetStats(): Stats {
  const fresh = { ...EMPTY_STATS };
  saveStats(fresh);
  return fresh;
}

/** עדכון סטטיסטיקות בסיום משחק רגיל. */
export function recordGameFinished(entry: GameHistoryEntry): Stats {
  const stats = loadStats();
  stats.gamesPlayed++;
  if (entry.won) {
    stats.gamesWon++;
    stats.currentStreak++;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    stats.totalAttemptsInWins += entry.guesses.length;
    if (stats.fastestWinSeconds === null || entry.durationSeconds < stats.fastestWinSeconds) {
      stats.fastestWinSeconds = entry.durationSeconds;
    }
    const space = totalSpaceSize(
      entry.rules.activeColorIds.length,
      entry.rules.codeLength,
      entry.rules.allowDuplicates,
    );
    if (stats.hardestSolvedSpace === null || space > stats.hardestSolvedSpace) {
      stats.hardestSolvedSpace = space;
    }
    stats.totalScore += entry.score;
  } else {
    stats.currentStreak = 0;
  }
  saveStats(stats);
  return stats;
}

/** עדכון סטטיסטיקות עבור חידת "ניחוש מכריע". */
export function recordDecisiveResult(solved: boolean): Stats {
  const stats = loadStats();
  stats.decisivePlayed++;
  if (solved) stats.decisiveSolved++;
  saveStats(stats);
  return stats;
}
