import type { ColorDef } from '../types';
import { ColorPeg } from './ColorPeg';

interface PaletteBarProps {
  colors: ColorDef[];
  onPick: (colorId: string) => void;
  showSymbols: boolean;
  showNames: boolean;
  disabled?: boolean;
  disabledColorIds?: Set<string>;
  markedColorIds?: Set<string>;
  onToggleMark?: (colorId: string) => void;
}

export function PaletteBar({
  colors,
  onPick,
  showSymbols,
  showNames,
  disabled,
  disabledColorIds,
  markedColorIds,
  onToggleMark,
}: PaletteBarProps) {
  return (
    <div className={`palette ${disabled ? 'palette--disabled' : ''}`} role="toolbar" aria-label="פלטת צבעים">
      {colors.map((color, index) => {
        const shortcut = index < 9 ? String(index + 1) : index === 9 ? '0' : '';
        const isMarked = markedColorIds?.has(color.id) ?? false;
        const colorDisabled = disabled || disabledColorIds?.has(color.id) || isMarked;
        const title = `${color.name}${shortcut && !isMarked ? ` (מקש ${shortcut})` : ''}${
          isMarked ? ' - מסומן זמנית' : '. קליק ימני לסימון זמני'
        }`;

        return (
          <div
            key={color.id}
            className={`palette__item ${colorDisabled ? 'palette__item--disabled' : ''} ${isMarked ? 'palette__item--marked' : ''}`}
          >
            <ColorPeg
              color={color}
              size="lg"
              showSymbol={showSymbols}
              marked={isMarked}
              onClick={colorDisabled ? undefined : () => onPick(color.id)}
              onContextMenu={disabled ? undefined : () => onToggleMark?.(color.id)}
              title={title}
              shortcut={shortcut}
            />
            {showNames && <span className="palette__name">{color.name}</span>}
          </div>
        );
      })}
    </div>
  );
}
