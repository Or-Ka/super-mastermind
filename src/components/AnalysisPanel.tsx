import type { AnalysisResult, ColorDef } from '../types';
import { hebrewOrdinal } from '../utils/format';
import { Collapsible } from './Collapsible';

interface AnalysisPanelProps {
  analysis: AnalysisResult | null;
  busy: boolean;
  colors: ColorDef[];
  hasGuesses: boolean;
}

export function AnalysisPanel({ analysis, busy, colors, hasGuesses }: AnalysisPanelProps) {
  const nameOf = (id: string) => colors.find((c) => c.id === id)?.name ?? id;

  return (
    <aside className="analysis" aria-label="ניתוח מצב המשחק">
      <h3 className="analysis__title">
        ניתוח מצב המשחק
        {busy && <span className="analysis__busy" title="החישוב מתבצע ברקע">מחשב...</span>}
      </h3>

      {!analysis && !busy && <p className="analysis__line">אין עדיין נתונים לניתוח.</p>}
      {!analysis && busy && <p className="analysis__line">מנתח את מרחב האפשרויות...</p>}

      {analysis && (
        <>
          <p className="analysis__line analysis__line--strong">
            {analysis.estimated
              ? `נותרו בהערכה כ-${analysis.possibleCount.toLocaleString('he-IL')} רצפים אפשריים.`
              : analysis.possibleCount === 1
                ? 'נותר פתרון אפשרי אחד בלבד.'
                : `נותרו ${analysis.possibleCount.toLocaleString('he-IL')} רצפים אפשריים.`}
          </p>

          {!analysis.consistent ? (
            <p className="analysis__line analysis__line--error">
              קיימת סתירה בין תוצאות הניחושים, ולכן אין רצף שמתאים לכולן.
            </p>
          ) : (
            <p className="analysis__line">
              {analysis.estimated
                ? 'הנתונים נראים עקביים בבדיקה מדגמית.'
                : 'הנתונים עקביים, ועדיין קיים פתרון אפשרי.'}
            </p>
          )}

          {analysis.lastGuessReduction && hasGuesses && (
            <p className="analysis__line">
              {analysis.lastGuessReduction.eliminated > 0
                ? `הניחוש האחרון פסל ${analysis.lastGuessReduction.eliminated.toLocaleString('he-IL')} אפשרויות (${analysis.lastGuessReduction.percent}% מהאפשרויות שנותרו).`
                : 'הניחוש האחרון לא צמצם את מרחב האפשרויות.'}
            </p>
          )}

          <p className="analysis__line">
            {analysis.solvableInRemaining === 'yes' &&
              'ניתן להגיע בוודאות לפתרון במסגרת הניסיונות שנותרו.'}
            {analysis.solvableInRemaining === 'unknown' &&
              'לא ניתן להבטיח פתרון בניסיונות שנותרו - זה תלוי באיכות הניחושים.'}
            {analysis.solvableInRemaining === 'no' && 'לא נותרו מספיק ניסיונות לפתרון ודאי.'}
          </p>

          <p className="analysis__line analysis__line--muted">
            רמת ודאות הניתוח: {analysis.estimated ? 'מוערכת (מרחב גדול, נבדק מדגם)' : 'מדויקת (נבדקו כל הרצפים)'}.
            {' '}סך מרחב האפשרויות: {analysis.totalSpace.toLocaleString('he-IL')}.
          </p>

          {analysis.positionFacts && (
            <Collapsible title="עובדות לוגיות שנגזרו">
              <ul className="analysis__facts">
                {analysis.positionFacts.fixedPositions.map((f) => (
                  <li key={`fix-${f.position}`}>
                    במקום {hebrewOrdinal(f.position + 1)} נמצא בוודאות הצבע {nameOf(f.colorId)}.
                  </li>
                ))}

                {analysis.positionFacts.mustAppear.length > 0 && (
                  <li>צבעים שחייבים להופיע: {analysis.positionFacts.mustAppear.map(nameOf).join(', ')}.</li>
                )}

                {analysis.positionFacts.neverAppear.length > 0 && (
                  <li>צבעים שאינם מופיעים כלל: {analysis.positionFacts.neverAppear.map(nameOf).join(', ')}.</li>
                )}

                {analysis.positionFacts.possibleColorsPerPosition.map((options, i) =>
                  options.length > 1 && options.length <= 3 ? (
                    <li key={`pos-${i}`}>
                      במקום {hebrewOrdinal(i + 1)} קיימות רק {options.length} אפשרויות: {options.map(nameOf).join(', ')}.
                    </li>
                  ) : null,
                )}

                {analysis.positionFacts.fixedPositions.length === 0 &&
                  analysis.positionFacts.mustAppear.length === 0 &&
                  analysis.positionFacts.neverAppear.length === 0 && (
                    <li>לפי הנתונים הנוכחיים אי אפשר לקבוע עדיין צבע מסוים במקום כלשהו.</li>
                  )}
              </ul>
            </Collapsible>
          )}
        </>
      )}
    </aside>
  );
}
