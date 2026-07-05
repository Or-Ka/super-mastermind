import type { ColorDef } from '../types';
import { ColorPeg } from './ColorPeg';

interface PaletteBarProps {
  colors: ColorDef[];
  onPick: (colorId: string) => void;
  showSymbols: boolean;
  showNames: boolean;
  disabled?: boolean;
  /** צבעים שאסור לבחור שוב (במצב ללא כפילויות). */
  disabledColorIds?: Set<string>;
}

/**
 * פלטת הצבעים לבחירה. כל צבע מקבל קיצור מקלדת לפי מיקומו (1-9, 0, ...).
 */
export function PaletteBar({ colors, onPick, showSymbols, showNames, disabled, disabledColorIds }: PaletteBarProps) {
  return (
    <div className={`palette ${disabled ? 'palette--disabled' : ''}`} role="toolbar" aria-label="פלטת צבעים">
      {colors.map((color, index) => {
        const shortcut = index < 9 ? String(index + 1) : index === 9 ? '0' : '';
        const colorDisabled = disabled || disabledColorIds?.has(color.id);
        return (
          <div key={color.id} className={`palette__item ${colorDisabled ? 'palette__item--disabled' : ''}`}>
            <ColorPeg
              color={color}
              size="lg"
              showSymbol={showSymbols}
              onClick={colorDisabled ? undefined : () => onPick(color.id)}
              title={`${color.name}${shortcut ? ` (מקש ${shortcut})` : ''}`}
              shortcut={shortcut}
            />
            {showNames && <span className="palette__name">{color.name}</span>}
          </div>
        );
      })}
    </div>
  );
}
