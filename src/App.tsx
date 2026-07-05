import { useCallback, useEffect, useState } from 'react';
import type { AppSettings } from './types';
import { loadSettings, saveSettings } from './storage/settingsStore';
import { setSoundsEnabled } from './utils/sound';
import { GameScreen } from './screens/GameScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DecisiveScreen } from './screens/DecisiveScreen';
import { ManualScreen } from './screens/ManualScreen';
import { StatsScreen } from './screens/StatsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { InstructionsModal } from './screens/InstructionsModal';
import { DevStamp } from './components/DevStamp';

type ScreenId = 'game' | 'settings' | 'decisive' | 'manual' | 'stats' | 'history';

const NAV_ITEMS: { id: ScreenId; label: string; title: string }[] = [
  { id: 'game', label: 'משחק', title: 'משחק בול פגיעה רגיל' },
  { id: 'decisive', label: 'ניחוש מכריע', title: 'חידה עם ניסיון אחד בלבד' },
  { id: 'manual', label: 'חידה ידנית', title: 'בניית חידה משלכם ובדיקת עקביות' },
  { id: 'stats', label: 'סטטיסטיקות', title: 'נתוני המשחקים שלכם' },
  { id: 'history', label: 'היסטוריה', title: 'משחקים קודמים' },
  { id: 'settings', label: 'הגדרות', title: 'חוקים, צבעים, תצוגה ונגישות' },
];

/** רכיב השורש — ניווט בין מסכים והחלת הגדרות תצוגה גלובליות. */
export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [screen, setScreen] = useState<ScreenId>('game');
  const [showInstructions, setShowInstructions] = useState(false);

  // החלת ערכת נושא, גודל ממשק, אנימציות וצלילים.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.display.theme;
    root.dataset.animations = settings.display.animations ? 'on' : 'off';
    root.style.fontSize = `${settings.display.uiScale * 100}%`;
    setSoundsEnabled(settings.display.sounds);
  }, [settings.display]);

  const handleSaveSettings = useCallback((next: AppSettings): string[] => {
    const errors = saveSettings(next);
    if (errors.length === 0) setSettings(next);
    return errors;
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header__title">בול פגיעה</h1>
        <nav className="app-nav" aria-label="ניווט ראשי">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`app-nav__item ${screen === item.id ? 'app-nav__item--active' : ''}`}
              onClick={() => setScreen(item.id)}
              title={item.title}
            >
              {item.label}
            </button>
          ))}
          <button className="app-nav__item" onClick={() => setShowInstructions(true)} title="הוראות המשחק">
            הוראות
          </button>
        </nav>
      </header>

      <main className="app-main">
        {screen === 'game' && (
          <GameScreen
            settings={settings}
            onOpenSettings={() => setScreen('settings')}
            onOpenInstructions={() => setShowInstructions(true)}
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSave={handleSaveSettings}
            onBack={() => setScreen('game')}
          />
        )}
        {screen === 'decisive' && <DecisiveScreen settings={settings} />}
        {screen === 'manual' && <ManualScreen settings={settings} />}
        {screen === 'stats' && <StatsScreen />}
        {screen === 'history' && <HistoryScreen showSymbols={settings.display.showSymbols} />}
      </main>

      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
      <DevStamp />
    </div>
  );
}
