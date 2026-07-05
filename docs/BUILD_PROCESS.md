# יומן תהליך הבנייה — Super Mastermind (בול פגיעה)

מסמך זה מתעד את שלבי הבנייה בסדר כרונולוגי. לפרטי ארכיטקטורה ראו
[ARCHITECTURE.md](./ARCHITECTURE.md), להחלטות ממוספרות ראו [DECISIONS.md](./DECISIONS.md).

---

## שלב 0 — מצב הבסיס (2026-07-04)

### מה נמצא

- התיקייה `D:\Oriya\Projects\Super Mastermind` הייתה **ריקה לחלוטין** (למעט תיקיית `.claude`).
- לא היה מאגר Git, לא היו קובצי תיעוד, לא היו תלויות ולא היה קוד קודם.
- סביבה: Windows 11, Node v24.15.0, npm 11.12.1.

### מסקנה

אין ארכיטקטורה קיימת לשמר או לשפר — הפרויקט נבנה מאפס.
לא קיימות בעיות קודמות שיש לייחס למצב הבסיס.

### פעולות

- `git init -b main` ומעבר מיידי לענף `feature/mastermind-game`
  (בהתאם למדיניות: אין Commit ישירות ל־main).

---

## שלב 1 — הקמת שלד הפרויקט

### מטרה

תשתית Electron + React + TypeScript + Vite עם בדיקות (Vitest), Lint (ESLint)
ואריזה ל־Windows (electron-builder).

### מה בוצע

- `package.json` עם סקריפטים: `dev`, `build`, `typecheck`, `lint`, `test`, `dist:win`.
- `tsconfig.json` (renderer, strict) ו־`tsconfig.electron.json` (תהליך ראשי, CommonJS).
- `vite.config.ts` (כולל תצורת Vitest), `eslint.config.js` (flat config).
- `index.html` עם `lang="he" dir="rtl"` ו־CSP מקומי בלבד.
- התקנת תלויות. אין תלות בשירות חיצוני כלשהו בזמן ריצה.

### החלטות

- **CSS מסודר במקום Tailwind** — ראו ADR-002.
- **שני תהליכי קומפילציה נפרדים** (Vite ל־renderer, tsc ל־main) — פשוט ושקוף.

---

## שלב 2 — טיפוסי הליבה ומנוע המשחק

### מטרה

מנוע חישוב בולים/פגיעות עצמאי, ניתן לבדיקה ללא ממשק, עם רצף סודי מוגן.

### מה בוצע

- `src/types/index.ts` — כל טיפוסי הליבה (`GameRules`, `Score`, `Puzzle`, `AnalysisResult`...).
- `src/game-engine/score.ts` — `calculateScore` בשני שלבים (בולים, ואז פגיעות לפי
  שכיחות בשאריות) — מונע ספירה כפולה גם עם צבעים חוזרים.
- `src/game-engine/secret.ts` — הגרלת רצף חוקי (Fisher–Yates חלקי ללא כפילויות).
- `src/game-engine/validateGuess.ts` — אימות ניחוש מלא/חוקי/לא חוזר.
- `src/game-engine/engine.ts` — `createGameEngine`: הסוד שמור ב־closure ואינו נחשף
  אלא דרך `reveal()` (ראו ADR-003).
- `src/settings/defaults.ts` + `validate.ts` — צבעי ברירת מחדל, תבניות קושי, אימות הגדרות.

### בעיות שהתגלו

לא התגלו בעיות בשלב זה.

---

## שלב 3 — Solver, מחולל חידות ואחסון

### מטרה

מנוע ניתוח עצמאי: מנייה, סינון, המלצות, רמזים, בדיקת עקביות ומחולל חידות.

### מה בוצע

- `src/solver/enumerate.ts` — מנייה **עצלה** (generator) + `totalSpaceSize` + דגימה אקראית.
- `src/solver/analyze.ts` — `computePossibleSet`: מנייה מלאה עד 1,000,000 רצפים,
  ומעבר לכך דגימה של 60,000 והערכה סטטיסטית (`estimated=true`). ראו ADR-004, ADR-005.
- `src/solver/recommend.ts` — שלושה סוגי המלצה: מתוך הפתרונות, מינימקס צמצום־מרבי
  (בהשראת Knuth, עם תקרות), ואקראי חוקי.
- `src/solver/hints.ts` — רמזים הדרגתיים (3 רמות) מתוך עובדות המיקום.
- `src/solver/manual.ts` — אימות שורות חידה ידנית + איתור הניחוש הראשון שיוצר סתירה.
- `src/challenge-generator/generate.ts` — מחולל "ניחוש מכריע" עם 4 דרגות קושי,
  מצב פתרון־יחיד מובטח, ונפילה בטוחה לחידה אקראית עקבית. ראו ADR-006.
- `src/storage/*` — שכבת localStorage: הגדרות, סטטיסטיקות, היסטוריה, חידות שמורות,
  ייצוא/ייבוא JSON עם אימות מבנה.
- `src/workers/solver.worker.ts` — כל החישובים הכבדים ב־Web Worker (ADR-004).
- `src/utils/scoring.ts` — נוסחת ניקוד (בסיס לפי log2 של גודל המרחב + בונוסים - קנס רמזים).

### בדיקות שבוצעו

`npx vitest run` — **69 בדיקות, כולן עוברות**, כולל כל מקרי הקצה מהאפיון:
הדוגמה מהאפיון (1 בול, 2 פגיעות), כפילויות בקוד ובניחוש, ניחוש עם יותר מופעים
מהקוד, כל נכון/הכל במקום שגוי/שום דבר, אורכים משתנים, סתירות, פתרון יחיד,
חוסר פתרון, ייצוא/ייבוא, שמירת הגדרות.

### תוצאה

שכבת הלוגיקה שלמה ואינה תלויה ב־React כלל.

---

## שלב 4 — ממשק המשתמש המלא (2026-07-05)

### מטרה

כל מסכי האפליקציה בעברית מלאה וב־RTL, נגישים, בלי לוגיקה מתמטית ברכיבים.

### מה בוצע

- רכיבים: `ColorPeg`, `PaletteBar`, `GuessSlots`, `ScorePegs` (ציון גרפי+טקסט),
  `AnalysisPanel`, `Modal`/`ConfirmDialog`, `Collapsible`.
- מסכים: `GameScreen`, `SettingsScreen`, `DecisiveScreen`, `ManualScreen`,
  `StatsScreen`, `HistoryScreen` (כולל שחזור מהלך), `InstructionsModal`.
- `App.tsx` — ניווט, החלת ערכת נושא/גודל/אנימציות/צלילים; `styles.css` עם
  משתני עיצוב לשתי ערכות נושא.
- `electron/main.ts` — חלון יחיד, contextIsolation+sandbox, ללא תפריט וללא IPC.
- קיצורי מקלדת מלאים ואישורי פעולה הרסנית (משחק חדש, מחיקות, איפוסים).

### בעיות שהתגלו ופתרונן

1. **קונפליקט טיפוסים vite 6 ↔ vitest 2** (ה־vite הפנימי של vitest ישן) —
   נפתר בשדרוג ל־vitest 3.
2. **חוקי react-hooks החדשים (purity/refs/set-state-in-effect)** תפסו 6 בעיות
   אמיתיות: `Date.now()` ב־render, גישת ref ב־render, setState סינכרוני באפקטים —
   כולן תוקנו (משך סופי נשמר ב־state, אכיפת טיימר עברה ל־callback של interval).
3. **לולאת רינדור אינסופית** (נתפסה בבדיקה ידנית בדפדפן): אפקטים נתלו באובייקט
   `solver` שמתחדש בכל רינדור בגלל `busy`. תוקן — תלות בפונקציות היציבות בלבד.
   הלקח תועד ב־ARCHITECTURE.md.

### בדיקות

- typecheck / lint / build — נקיים; 69 בדיקות עוברות.
- אימות ידני בדפדפן מול שרת Vite: משחק מלא, ניתוח מתעדכן (288 רצפים, 83% צמצום),
  מצב „ניחוש מכריע” מייצר חידה תקינה. ראו טבלת הבדיקות ב־TESTING.md.

---

## שלב 5 — אריזה ל־Windows ותיעוד סופי (2026-07-05)

### מה בוצע

- `npm run dist:win` — הופקו `Super Mastermind 1.0.0.exe` (portable, ~71MB)
  ו־`Super Mastermind Setup 1.0.0.exe` (NSIS) תחת `release/`.
- בדיקת עשן לגרסה הארוזה: האפליקציה עולה עם כותרת עברית תקינה ונסגרת נקי.
- הושלמו ARCHITECTURE.md, TESTING.md, KNOWN_LIMITATIONS.md, PROJECT_STATUS.md,
  README.md.

### תוצאה

הפרויקט עומד בכל קריטריוני הקבלה. מצב עדכני ב־PROJECT_STATUS.md.
