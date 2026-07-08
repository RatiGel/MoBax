/**
 * Live store theme — the bridge between the admin Theme page and the public
 * storefront. The admin saves two brand hexes (primary + accent) plus branding
 * (store name, logo, announcement) to the THEME setting. This module reads that
 * setting on the server and derives the CSS-variable override block that the
 * storefront layout injects, so changing the theme in admin recolors the live
 * site without a redeploy.
 *
 * Colors are emitted as space-separated RGB CHANNELS ("46 91 255") to match the
 * Tailwind `rgb(var(--token) / <alpha-value>)` setup in tailwind.config.ts —
 * this keeps opacity modifiers (bg-cobalt/10) working.
 */

import Setting, { SETTING_KEYS } from '@/models/Setting';
import { connectDB } from '@/lib/mongodb';

export interface StoreTheme {
  primary: string;     // hex, e.g. #1E2D5A
  accent: string;      // hex, e.g. #2E5BFF
  storeName: string;
  logoUrl: string;
  announcement: string;
}

/** Mirrors the admin ThemeClient defaults and the static tokens in globals.css. */
export const THEME_DEFAULTS: StoreTheme = {
  primary: '#1E2D5A',
  accent: '#2E5BFF',
  storeName: 'MoBax',
  logoUrl: '',
  announcement: '',
};

type RGB = { r: number; g: number; b: number };

/** Parse #rgb / #rrggbb into channels. Returns null for anything unparseable. */
function parseHex(hex: string): RGB | null {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/** Mix a color toward white (amount>0) or black (amount<0); amount in [-1,1]. */
function shade({ r, g, b }: RGB, amount: number): RGB {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return {
    r: clamp(r + (target - r) * t),
    g: clamp(g + (target - g) * t),
    b: clamp(b + (target - b) * t),
  };
}

const channels = ({ r, g, b }: RGB) => `${r} ${g} ${b}`;

/**
 * Build the full set of brand CSS-var channels for one mode from the two base
 * hues. Light vs dark differ in how shades lean (dark mode lifts the accent and
 * darkens the soft tint) so contrast holds in both themes.
 */
function deriveVars(primaryHex: string, accentHex: string, mode: 'light' | 'dark') {
  const primary = parseHex(primaryHex) ?? parseHex(THEME_DEFAULTS.primary)!;
  const accent = parseHex(accentHex) ?? parseHex(THEME_DEFAULTS.accent)!;

  // In dark mode lift the accent so it reads on near-black surfaces.
  const accentBase = mode === 'dark' ? shade(accent, 0.25) : accent;
  const accentDark = shade(accent, 0.25);
  const accentSoft = mode === 'dark' ? shade(accent, -0.78) : shade(accent, 0.9);

  return {
    '--cobalt': channels(accentBase),
    '--cobalt-dark': channels(accentDark),
    '--cobalt-soft': channels(accentSoft),
    '--accent': channels(accentBase),
    '--accent-dark': channels(accentDark),
    '--accent-light': channels(accentSoft),
    '--primary': channels(primary),
    '--primary-dark': channels(shade(primary, -0.24)),
    '--primary-light': channels(shade(primary, 0.18)),
  };
}

const block = (selector: string, vars: Record<string, string>) =>
  `${selector}{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`;

/**
 * The CSS override string to inject in a <style> tag. Covers both light (:root)
 * and dark (.dark) so the recolor follows the user's theme toggle. Returns null
 * when the saved theme matches defaults (nothing to override — keep the static
 * tokens from globals.css and avoid an empty style tag).
 */
export function themeOverrideCss(theme: StoreTheme): string | null {
  const isDefault =
    theme.primary.toLowerCase() === THEME_DEFAULTS.primary.toLowerCase() &&
    theme.accent.toLowerCase() === THEME_DEFAULTS.accent.toLowerCase();
  if (isDefault) return null;

  return (
    block(':root', deriveVars(theme.primary, theme.accent, 'light')) +
    block('.dark', deriveVars(theme.primary, theme.accent, 'dark'))
  );
}

/**
 * Fetch the saved store theme, merged over defaults. Never throws — a DB hiccup
 * falls back to defaults so the storefront always renders.
 */
export async function getStoreTheme(): Promise<StoreTheme> {
  try {
    await connectDB();
    const setting = await Setting.findOne({ key: SETTING_KEYS.THEME }).lean();
    const value = setting?.value;
    if (value && typeof value === 'object') {
      return { ...THEME_DEFAULTS, ...(value as Partial<StoreTheme>) };
    }
  } catch (err) {
    console.error('[getStoreTheme]', err);
  }
  return { ...THEME_DEFAULTS };
}
