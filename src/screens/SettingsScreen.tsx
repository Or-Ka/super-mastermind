import { useMemo, useState } from 'react';
import type { AppSettings, ColorDef, GameRules } from '../types';
import { DIFFICULTY_PRESETS, DEFAULT_SETTINGS, LIMITS } from '../settings/defaults';
import { validateSettings } from '../settings/validate';
import { totalSpaceSize } from '../solver/enumerate';
import { SYMBOL_POOL } from '../utils/color';
import { ConfirmDialog } from '../components/Modal';
import { ColorPeg } from '../components/ColorPeg';

interface SettingsScreenProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => string[];
  onBack: () => void;
}

/** מסך ההגדרות — חוקי משחק, תבניות קושי, פלטת צבעים, תצוגה ונגישות. */
export function SettingsScreen({ settings, onSave, onBack }: SettingsScreenProps) {
  const [draft, setDraft] = useState<AppSettings>(() => structuredClone(settings));
  const [errors, setErrors] = useState<string[]>([]);
  const [savedNote, setSavedNote] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const updateRules = (patch: Partial<GameRules>) => {
    setDraft((prev) => ({
      ...prev,
      rules: { ...prev.rules, ...patch },
      difficultyPreset: 'custom',
    }));
    setSavedNote(false);
  };

  const updateDisplay = (patch: Partial<AppSettings['display']>) => {
    setDraft((prev) => ({ ...prev, display: { ...prev.display, ...patch } }));
    setSavedNote(false);
  };

  const applyPreset = (presetId: (typeof DIFFICULTY_PRESETS)[number]['id']) => {
    const preset = DIFFICULTY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDraft((prev) => ({
      ...prev,
      rules: { ...prev.rules, ...preset.rules },
      difficultyPreset: preset.id,
    }));
    setSavedNote(false);
  };

  const toggleColorActive = (colorId: string) => {
    setDraft((prev) => {
      const active = prev.rules.activeColorIds.includes(colorId)
        ? prev.rules.activeColorIds.filter((id) => id !== colorId)
        : [...prev.rules.activeColorIds, colorId];
      return { ...prev, rules: { ...prev.rules, activeColorIds: active }, difficultyPreset: 'custom' };
    });
    setSavedNote(false);
  };

  const updateColor = (colorId: string, patch: Partial<ColorDef>) => {
    setDraft((prev) => ({
      ...prev,
      colors: prev.colors.map((c) => (c.id === colorId ? { ...c, ...patch } : c)),
    }));
    setSavedNote(false);
  };

  const addColor = () => {
    const id = `custom-${Date.now()}`;
    const usedSymbols = new Set(draft.colors.map((c) => c.symbol));
    const symbol = SYMBOL_POOL.find((s) => !usedSymbols.has(s)) ?? '?';
    setDraft((prev) => ({
      ...prev,
      colors: [...prev.colors, { id, name: 'צבע חדש', hex: '#888888', symbol, builtin: false }],
      rules: { ...prev.rules, activeColorIds: [...prev.rules.activeColorIds, id] },
      difficultyPreset: 'custom',
    }));
    setSavedNote(false);
  };

  const deleteColor = (colorId: string) => {
    setDraft((prev) => ({
      ...prev,
      colors: prev.colors.filter((c) => c.id !== colorId),
      rules: {
        ...prev.rules,
        activeColorIds: prev.rules.activeColorIds.filter((id) => id !== colorId),
      },
      difficultyPreset: 'custom',
    }));
    setSavedNote(false);
  };

  const resetColors = () => {
    setDraft((prev) => ({
      ...prev,
      colors: structuredClone(DEFAULT_SETTINGS.colors),
      rules: { ...prev.rules, activeColorIds: DEFAULT_SETTINGS.rules.activeColorIds },
      difficultyPreset: 'custom',
    }));
    setSavedNote(false);
  };

  const save = () => {
    const validation = validateSettings(draft);
    setErrors(validation);
    if (validation.length > 0) return;
    const saveErrors = onSave(draft);
    setErrors(saveErrors);
    if (saveErrors.length === 0) setSavedNote(true);
  };

  const spaceSize = useMemo(
    () =>
      totalSpaceSize(draft.rules.activeColorIds.length, draft.rules.codeLength, draft.rules.allowDuplicates),
    [draft.rules],
  );

  return (
    <div className="settings">
      <div className="screen-header">
        <h2>הגדרות</h2>
        <div className="screen-header__actions">
          <button className="btn btn--primary" onClick={save}>שמירה</button>
          <button className="btn" onClick={onBack}>חזרה למשחק</button>
          <button className="btn btn--danger" onClick={() => setConfirmReset(true)}>איפוס לברירת מחדל</button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="error-box" role="alert">
          <strong>לא ניתן לשמור — יש לתקן את השגיאות הבאות:</strong>
          <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
      {savedNote && errors.length === 0 && (
        <p className="success-note" role="status">ההגדרות נשמרו. הן יחולו על המשחק הבא.</p>
      )}

      <section className="settings__section">
        <h3>רמות קושי מוכנות</h3>
        <div className="presets">
          {DIFFICULTY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={`preset ${draft.difficultyPreset === preset.id ? 'preset--active' : ''}`}
              onClick={() => applyPreset(preset.id)}
              title={preset.description}
            >
              <span className="preset__name">{preset.name}</span>
              <span className="preset__desc">{preset.description}</span>
            </button>
          ))}
          <div className={`preset preset--static ${draft.difficultyPreset === 'custom' ? 'preset--active' : ''}`}>
            <span className="preset__name">מותאם אישית</span>
            <span className="preset__desc">נקבע אוטומטית כששינית ערך ידנית</span>
          </div>
        </div>
      </section>

      <section className="settings__section">
        <h3>חוקי המשחק</h3>
        <div className="fields">
          <label className="field">
            אורך הרצף הסודי
            <input
              type="number"
              min={LIMITS.codeLength.min}
              max={LIMITS.codeLength.max}
              value={draft.rules.codeLength}
              onChange={(e) => updateRules({ codeLength: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            מספר ניסיונות מרבי
            <input
              type="number"
              min={LIMITS.maxAttempts.min}
              max={LIMITS.maxAttempts.max}
              value={draft.rules.maxAttempts}
              onChange={(e) => updateRules({ maxAttempts: Number(e.target.value) })}
            />
          </label>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={draft.rules.allowDuplicates}
              onChange={(e) => updateRules({ allowDuplicates: e.target.checked })}
            />
            מותר להשתמש באותו צבע יותר מפעם אחת
          </label>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={draft.rules.timeLimitSeconds !== null}
              onChange={(e) => updateRules({ timeLimitSeconds: e.target.checked ? 300 : null })}
            />
            הגבלת זמן משחק
          </label>
          {draft.rules.timeLimitSeconds !== null && (
            <label className="field">
              זמן מרבי (שניות)
              <input
                type="number"
                min={LIMITS.timeLimitSeconds.min}
                max={LIMITS.timeLimitSeconds.max}
                step={30}
                value={draft.rules.timeLimitSeconds}
                onChange={(e) => updateRules({ timeLimitSeconds: Number(e.target.value) })}
              />
            </label>
          )}
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={draft.rules.showAnalysis}
              onChange={(e) => updateRules({ showAnalysis: e.target.checked })}
            />
            הצגת ניתוח לוגי בזמן המשחק
          </label>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={draft.rules.hintsEnabled}
              onChange={(e) => updateRules({ hintsEnabled: e.target.checked })}
            />
            הצגת רמזים
          </label>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={draft.rules.allowUndo}
              onChange={(e) => updateRules({ allowUndo: e.target.checked })}
            />
            אפשרות לביטול ניחוש
          </label>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={draft.rules.allowRepeatGuess}
              onChange={(e) => updateRules({ allowRepeatGuess: e.target.checked })}
            />
            אפשרות לנחש ניחוש שכבר בוצע
          </label>
          <label className="field">
            סוג המלצת ניחוש
            <select
              value={draft.rules.recommendationMode}
              onChange={(e) => updateRules({ recommendationMode: e.target.value as GameRules['recommendationMode'] })}
            >
              <option value="possible">ניחוש מתוך הפתרונות האפשריים</option>
              <option value="max-reduction">ניחוש שממקסם צמצום אפשרויות</option>
              <option value="random">ניחוש אקראי חוקי</option>
              <option value="none">ללא המלצה</option>
            </select>
          </label>
        </div>
        <p className="settings__hint">
          גודל מרחב האפשרויות בהגדרות הנוכחיות: {spaceSize.toLocaleString('he-IL')} רצפים.
        </p>
      </section>

      <section className="settings__section">
        <h3>פלטת הצבעים ({draft.rules.activeColorIds.length} פעילים)</h3>
        <div className="color-editor">
          {draft.colors.map((color) => (
            <div key={color.id} className="color-row">
              <input
                type="checkbox"
                checked={draft.rules.activeColorIds.includes(color.id)}
                onChange={() => toggleColorActive(color.id)}
                title="צבע פעיל במשחק"
                aria-label={`הפעלת ${color.name}`}
              />
              <ColorPeg color={color} size="md" showSymbol={draft.display.showSymbols} />
              <input
                type="text"
                className="color-row__name"
                value={color.name}
                onChange={(e) => updateColor(color.id, { name: e.target.value })}
                aria-label="שם הצבע"
              />
              <input
                type="color"
                value={color.hex}
                onChange={(e) => updateColor(color.id, { hex: e.target.value })}
                title="בחירת גוון"
                aria-label={`גוון של ${color.name}`}
              />
              {!color.builtin && (
                <button className="btn btn--icon btn--danger" onClick={() => deleteColor(color.id)} title="מחיקת צבע מותאם">
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="helper-row">
          <button className="btn" onClick={addColor}>הוספת צבע חדש</button>
          <button className="btn" onClick={resetColors}>החזרת צבעי ברירת המחדל</button>
        </div>
      </section>

      <section className="settings__section">
        <h3>תצוגה ונגישות</h3>
        <div className="fields">
          <label className="field">
            ערכת נושא
            <select
              value={draft.display.theme}
              onChange={(e) => updateDisplay({ theme: e.target.value as 'light' | 'dark' })}
            >
              <option value="dark">כהה</option>
              <option value="light">בהירה</option>
            </select>
          </label>
          <label className="field">
            גודל ממשק
            <select
              value={String(draft.display.uiScale)}
              onChange={(e) => updateDisplay({ uiScale: Number(e.target.value) })}
            >
              <option value="0.85">קטן</option>
              <option value="1">רגיל</option>
              <option value="1.15">גדול</option>
            </select>
          </label>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={draft.display.animations}
              onChange={(e) => updateDisplay({ animations: e.target.checked })}
            />
            אנימציות
          </label>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={draft.display.sounds}
              onChange={(e) => updateDisplay({ sounds: e.target.checked })}
            />
            צלילים
          </label>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={draft.display.showColorNames}
              onChange={(e) => updateDisplay({ showColorNames: e.target.checked })}
            />
            הצגת שמות הצבעים
          </label>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={draft.display.showSymbols}
              onChange={(e) => updateDisplay({ showSymbols: e.target.checked })}
            />
            הצגת סמלים בנוסף לצבעים
          </label>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={draft.display.colorBlindMode}
              onChange={(e) => updateDisplay({ colorBlindMode: e.target.checked, showSymbols: true })}
            />
            מצב נגיש לעיוורון צבעים (מאלץ סמלים)
          </label>
        </div>
      </section>

      {confirmReset && (
        <ConfirmDialog
          title="איפוס הגדרות"
          message="כל ההגדרות יחזרו לברירת המחדל, כולל הצבעים המותאמים אישית. להמשיך?"
          confirmLabel="איפוס"
          danger
          onConfirm={() => {
            setConfirmReset(false);
            setDraft(structuredClone(DEFAULT_SETTINGS));
            setErrors([]);
            setSavedNote(false);
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}
