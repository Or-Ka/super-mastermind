import type { AnalysisResult, ColorDef, GuessRecord } from '../types';
import { formatScore, hebrewOrdinal } from '../utils/format';
import { Collapsible } from './Collapsible';

interface AnalysisPanelProps {
  analysis: AnalysisResult | null;
  busy: boolean;
  colors: ColorDef[];
  hasGuesses: boolean;
  history: GuessRecord[];
}

export function AnalysisPanel({ analysis, busy, colors, hasGuesses, history }: AnalysisPanelProps) {
  const nameOf = (id: string) => colors.find((c) => c.id === id)?.name ?? id;
  const rowSummary = (record: GuessRecord, index: number) =>
    `שורה ${index + 1}: ${record.guess.map(nameOf).join(', ')} - ${formatScore(record.score)}`;

  const evidenceText = (conclusion: string) => {
    if (history.length === 0) return `הדרך: ${conclusion}.`;
    const evidenceIndexes = history.length <= 3 ? history.map((_, index) => index) : [0, 1, history.length - 1];
    const summaries = evidenceIndexes.map((index) => rowSummary(history[index], index)).join('; ');
    const omitted = history.length > evidenceIndexes.length ? `; ועוד ${history.length - evidenceIndexes.length} שורות` : '';
    return `הדרך: סיננתי את כל הרצפים האפשריים לפי ${summaries}${omitted}. ${conclusion}.`;
  };

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
                    <p className="analysis__why">
                      {evidenceText(
                        `אחרי הסינון, כל ${analysis.possibleCount.toLocaleString('he-IL')} הפתרונות שנשארו שמים את ${nameOf(f.colorId)} במקום ${hebrewOrdinal(f.position + 1)}`,
                      )}
                    </p>
                  </li>
                ))}

                {analysis.positionFacts.mustAppear.length > 0 && (
                  <li>
                    צבעים שחייבים להופיע: {analysis.positionFacts.mustAppear.map(nameOf).join(', ')}.
                    <p className="analysis__why">
                      {evidenceText('הצבעים האלה מופיעים בכל פתרון שנשאר')}
                    </p>
                  </li>
                )}

                {analysis.positionFacts.neverAppear.length > 0 && (
                  <li>
                    צבעים שאינם מופיעים כלל: {analysis.positionFacts.neverAppear.map(nameOf).join(', ')}.
                    <p className="analysis__why">
                      {evidenceText('אף פתרון שנשאר לא כולל את הצבעים האלה')}
                    </p>
                  </li>
                )}

                {analysis.positionFacts.possibleColorsPerPosition.map((options, i) =>
                  options.length > 1 && options.length <= 3 ? (
                    <li key={`pos-${i}`}>
                      במקום {hebrewOrdinal(i + 1)} קיימות רק {options.length} אפשרויות: {options.map(nameOf).join(', ')}.
                      <p className="analysis__why">
                        {evidenceText(`במקום ${hebrewOrdinal(i + 1)} לא נשארה שום אפשרות אחרת`)}
                      </p>
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
