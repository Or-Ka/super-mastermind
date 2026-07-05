import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const componentPath = fileURLToPath(new URL('../components/DevStamp.tsx', import.meta.url));
const stylesPath = fileURLToPath(new URL('../styles.css', import.meta.url));

describe('DevStamp', () => {
  it('renders the developer signature link with the tooltip GIF', () => {
    const tsx = readFileSync(componentPath, 'utf-8');
    expect(tsx).toContain('dev-stamp no-print');
    expect(tsx).toContain('dev by Orka');
    expect(tsx).toContain('https://github.com/Or-Ka');
    expect(tsx).toContain('src="./dev.gif"');
  });

  it('defines the fixed, print-hidden stamp styling', () => {
    const css = readFileSync(stylesPath, 'utf-8');
    expect(css).toContain('.dev-stamp {');
    expect(css).toContain('position: fixed');
    expect(css).toContain('z-index: 1300');
    expect(css).toContain('.dev-stamp-tooltip {');
    expect(css).toContain('@media print');
    expect(css).toContain('.no-print');
  });
});
