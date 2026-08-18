import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The brand defaults live in three places that must agree:
 *
 *   1. `THEME_DEFAULTS` in lib/theme.ts   — what the server treats as "unset"
 *   2. `:root` in app/globals.css         — what the browser paints by default
 *   3. `DEFAULTS` in ThemeClient.tsx      — what "Reset to defaults" pushes
 *
 * A mismatch is silent and destructive: `themeOverrideCss` only emits an
 * override block when the saved theme differs from THEME_DEFAULTS, so if the
 * CSS says amber while THEME_DEFAULTS says cobalt, every page ships an
 * override that reverts the design. This bit us once during the Ink & Signal
 * migration, hence the test.
 */
const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

/**
 * Read THEME_DEFAULTS out of the source text rather than importing it:
 * `lib/theme.ts` pulls in the Mongo client, which throws without a live
 * MONGODB_URI and would make this a integration test instead of a unit one.
 */
function themeDefaults(): { primary: string; accent: string } {
  const src = read('lib/theme.ts');
  const block = src.match(/THEME_DEFAULTS[^=]*=\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  const pick = (key: string) =>
    block.match(new RegExp(`${key}:\\s*'(#[0-9A-Fa-f]{6})'`))?.[1] ?? '';
  return { primary: pick('primary'), accent: pick('accent') };
}

const THEME_DEFAULTS = themeDefaults();

function hexToChannels(hex: string): string {
  const n = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)).join(' ');
}

describe('brand default sync', () => {
  const css = read('app/globals.css');
  const client = read('app/admin/theme/ThemeClient.tsx');

  // Guard the guard: if lib/theme.ts is restructured so the regex above stops
  // matching, fail loudly here instead of silently comparing empty strings.
  it('can read THEME_DEFAULTS out of lib/theme.ts', () => {
    expect(THEME_DEFAULTS.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(THEME_DEFAULTS.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('globals.css :root matches THEME_DEFAULTS', () => {
    // First match is the light-mode :root block, which is the default surface.
    const cobalt = css.match(/--cobalt:\s*([\d ]+);/)?.[1].trim();
    const primary = css.match(/--primary:\s*([\d ]+);/)?.[1].trim();
    expect(cobalt).toBe(hexToChannels(THEME_DEFAULTS.accent));
    expect(primary).toBe(hexToChannels(THEME_DEFAULTS.primary));
  });

  it('the admin Reset-to-defaults values match THEME_DEFAULTS', () => {
    expect(client.match(/primary:\s*'(#[0-9A-Fa-f]{6})'/)?.[1]).toBe(THEME_DEFAULTS.primary);
    expect(client.match(/accent:\s*'(#[0-9A-Fa-f]{6})'/)?.[1]).toBe(THEME_DEFAULTS.accent);
  });
});

describe('contrast invariants', () => {
  // Relative luminance / contrast ratio per WCAG 2.1.
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a: number[], b: number[]) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const hex = (h: string) => {
    const n = h.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  };

  const INK = hex('#0B0B0D');
  const WHITE = hex('#FFFFFF');
  const amber = hex(THEME_DEFAULTS.accent);

  it('ink on the accent clears AA for body text', () => {
    expect(ratio(INK, amber)).toBeGreaterThanOrEqual(4.5);
  });

  // The whole reason `.signal-fill` exists. If someone "fixes" a button by
  // adding text-white back onto an amber fill, this is the rule they broke.
  it('white on the accent does NOT clear AA — never pair them', () => {
    expect(ratio(WHITE, amber)).toBeLessThan(4.5);
  });

  it('the light-mode amber text token clears AA on paper', () => {
    const amberInk = read('app/globals.css').match(/--amber-ink:\s*([\d ]+);/)?.[1].trim();
    const channels = amberInk!.split(/\s+/).map(Number);
    expect(ratio(channels, hex('#FAFAF8'))).toBeGreaterThanOrEqual(4.5);
  });

  it('the light-mode star token clears the 3:1 floor for graphics', () => {
    const star = read('app/globals.css').match(/--star:\s*([\d ]+);/)?.[1].trim();
    const channels = star!.split(/\s+/).map(Number);
    expect(ratio(channels, hex('#FAFAF8'))).toBeGreaterThanOrEqual(3);
  });
});
