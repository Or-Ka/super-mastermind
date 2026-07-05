import type { Score } from '../types';
import { formatScore } from '../utils/format';

interface ScorePegsProps {
  score: Score;
  codeLength: number;
  /** תצוגה קומפקטית (בלי טקסט) — הטקסט תמיד קיים כ־aria-label. */
  compact?: boolean;
}

/**
 * ייצוג גרפי + טקסטואלי של תוצאה:
 * עיגול מלא = בול, עיגול חלול = פגיעה. לא מסתמכים על צבע בלבד.
 */
export function ScorePegs({ score, codeLength, compact }: ScorePegsProps) {
  const text = formatScore(score);
  const empty = codeLength - score.bulls - score.hits;
  return (
    <span className="score" aria-label={text} title={text}>
      <span className="score__pegs" aria-hidden="true">
        {Array.from({ length: score.bulls }, (_, i) => (
          <span key={`b${i}`} className="score__peg score__peg--bull">●</span>
        ))}
        {Array.from({ length: score.hits }, (_, i) => (
          <span key={`h${i}`} className="score__peg score__peg--hit">○</span>
        ))}
        {Array.from({ length: Math.max(0, empty) }, (_, i) => (
          <span key={`e${i}`} className="score__peg score__peg--none">·</span>
        ))}
      </span>
      {!compact && <span className="score__text">{text}</span>}
    </span>
  );
}
