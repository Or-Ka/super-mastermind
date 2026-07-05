import type { ColorDef } from '../types';
import { contrastColor } from '../utils/color';

interface ColorPegProps {
  color: ColorDef | null;
  size?: 'sm' | 'md' | 'lg';
  showSymbol: boolean;
  showName?: boolean;
  selected?: boolean;
  onClick?: () => void;
  title?: string;
  /** תווית קיצור מקלדת (מוצגת בפלטה). */
  shortcut?: string;
}

/** פג צבע יחיד — עיגול צבעוני עם סמל נגישות אופציונלי. */
export function ColorPeg({ color, size = 'md', showSymbol, showName, selected, onClick, title, shortcut }: ColorPegProps) {
  const label = color ? color.name : 'ריק';
  const peg = (
    <span
      className={`peg peg--${size} ${color ? '' : 'peg--empty'} ${selected ? 'peg--selected' : ''} ${onClick ? 'peg--clickable' : ''}`}
      style={color ? { background: color.hex, color: contrastColor(color.hex) } : undefined}
      title={title ?? label}
      aria-label={label}
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {color && showSymbol ? color.symbol : ''}
      {shortcut && <span className="peg__shortcut">{shortcut}</span>}
    </span>
  );
  if (!showName || !color) return peg;
  return (
    <span className="peg-with-name">
      {peg}
      <span className="peg-with-name__label">{color.name}</span>
    </span>
  );
}
