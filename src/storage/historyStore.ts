import type { GameHistoryEntry } from '../types';
import { loadJson, saveJson, STORAGE_KEYS } from './local';

export const HISTORY_VERSION = 1;
/** תקרת רשומות בהיסטוריה — הישנות ביותר נמחקות אוטומטית. */
const MAX_ENTRIES = 200;

export function loadGameHistory(): GameHistoryEntry[] {
  return loadJson<GameHistoryEntry[]>(STORAGE_KEYS.gameHistory, []);
}

export function addGameToHistory(entry: GameHistoryEntry): GameHistoryEntry[] {
  const history = [entry, ...loadGameHistory()].slice(0, MAX_ENTRIES);
  saveJson(STORAGE_KEYS.gameHistory, history);
  return history;
}

export function deleteGameFromHistory(id: string): GameHistoryEntry[] {
  const history = loadGameHistory().filter((e) => e.id !== id);
  saveJson(STORAGE_KEYS.gameHistory, history);
  return history;
}

export function clearGameHistory(): void {
  saveJson(STORAGE_KEYS.gameHistory, []);
}
