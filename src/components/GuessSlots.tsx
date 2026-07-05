import type { ColorDef, ColorId } from '../types';
import { ColorPeg } from './ColorPeg';

interface GuessSlotsProps {
  slots: (ColorId | null)[];
  colors: ColorDef[];
  showSymbols: boolean;
  selectedIndex: number | null;
  onSelectSlot: (index: number) => void;
  onClearSlot: (index: number) => void;
  disabled?: boolean;
}

/**
 * שורת הניחוש הנוכחית — מקומות שניתן ללחוץ עליהם כדי לבחור/להחליף,
 * ולחיצה ימנית (או כפתור המחיקה) מוחקת צבע בודד.
 */
export function GuessSlots({ slots, colors, showSymbols, selectedIndex, onSelectSlot, onClearSlot, disabled }: GuessSlotsProps) {
  const colorOf = (id: ColorId | null) => (id ? colors.find((c) => c.id === id) ?? null : null);
  return (
    <div className="slots" role="group" aria-label="הניחוש הנוכחי">
      {slots.map((slot, index) => (
        <span
          key={index}
          className={`slot ${selectedIndex === index ? 'slot--selected' : ''}`}
          onContextMenu={(e) => {
            e.preventDefault();
            if (!disabled && slot) onClearSlot(index);
          }}
        >
          <ColorPeg
            color={colorOf(slot)}
            size="lg"
            showSymbol={showSymbols}
            onClick={disabled ? undefined : () => onSelectSlot(index)}
            title={
              slot
                ? `מקום ${index + 1}: ${colorOf(slot)?.name}. לחיצה לבחירה, לחיצה ימנית למחיקה`
                : `מקום ${index + 1}: ריק. לחצו לבחירה ואז בחרו צבע`
            }
          />
        </span>
      ))}
    </div>
  );
}
