/** בחירת צבע טקסט (שחור/לבן) לפי בהירות הרקע — לנגישות הסמלים על הפגים. */
export function contrastColor(hex: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return '#000000';
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 145 ? '#1a1a1a' : '#ffffff';
}

/** סמלים פנויים לצבעים מותאמים אישית. */
export const SYMBOL_POOL = ['♠', '♦', '☾', '☀', '❖', '✤', '⬟', '✧', '☘', '⚑', '✜', '❄'];
