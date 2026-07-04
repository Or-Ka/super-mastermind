import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '../settings/defaults';
import { validateSettings } from '../settings/validate';
import { loadJson, saveJson, STORAGE_KEYS } from './local';

/**
 * טעינת הגדרות מהאחסון המקומי.
 * הגדרות פגומות או לא חוקיות מוחלפות בברירת המחדל —
 * עדיף אתחול נקי מקריסה של האפליקציה.
 */
export function loadSettings(): AppSettings {
  const stored = loadJson<AppSettings | null>(STORAGE_KEYS.settings, null);
  if (!stored || stored.version !== SETTINGS_VERSION) return structuredClone(DEFAULT_SETTINGS);
  const merged: AppSettings = {
    ...structuredClone(DEFAULT_SETTINGS),
    ...stored,
    rules: { ...DEFAULT_SETTINGS.rules, ...stored.rules },
    display: { ...DEFAULT_SETTINGS.display, ...stored.display },
  };
  if (validateSettings(merged).length > 0) return structuredClone(DEFAULT_SETTINGS);
  return merged;
}

/** שמירת הגדרות. מחזיר שגיאות אימות אם ההגדרות אינן חוקיות (ולא שומר). */
export function saveSettings(settings: AppSettings): string[] {
  const errors = validateSettings(settings);
  if (errors.length > 0) return errors;
  saveJson(STORAGE_KEYS.settings, settings);
  return [];
}

export function resetSettings(): AppSettings {
  const fresh = structuredClone(DEFAULT_SETTINGS);
  saveJson(STORAGE_KEYS.settings, fresh);
  return fresh;
}
