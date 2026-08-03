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

export interface NavLink {
  labelEn: string;
  labelKa: string;
  href: string;
}

export interface NavSettings {
  links: NavLink[];
}

/** Empty by default — Navbar renders its current hardcoded links until an admin adds any. */
export const NAV_DEFAULTS: NavSettings = { links: [] };

export interface FooterColumn {
  titleEn: string;
  titleKa: string;
  links: NavLink[];
}

export interface FooterSettings {
  columns: FooterColumn[];
  social: { platform: string; url: string }[];
  contact: { phone: string; email: string; addressEn: string; addressKa: string };
}

/** Empty by default — Footer renders its current hardcoded content until an admin saves any. */
export const FOOTER_DEFAULTS: FooterSettings = {
  columns: [],
  social: [],
  contact: { phone: '', email: '', addressEn: '', addressKa: '' },
};

/**
 * Only Inter and Space Grotesk are actually loaded by this app (see
 * app/globals.css's Google Fonts @import and the [lang='en'] font-family
 * rules) — deliberately narrower than an earlier draft of this feature that
 * listed Manrope, Sora, and Georgia. Those are not loaded anywhere in the
 * storefront, and adding a webfont to the critical path for an admin toggle
 * that may never get used is not worth the extra network request. Georgian
 * (`[lang='ka']`) always renders BPG Nino Mtavruli / Noto Sans Georgian
 * regardless of this setting — it has its own higher-specificity CSS rule
 * (see globals.css) and is intentionally not overridden here.
 */
export interface Typography {
  displayFont: 'Inter' | 'Space Grotesk';
  bodyFont: 'Inter' | 'System';
  scale: number; // 0.9 – 1.15, multiplies the base font size
}

export const TYPOGRAPHY_DEFAULTS: Typography = {
  displayFont: 'Space Grotesk',
  bodyFont: 'Inter',
  scale: 1,
};

const FONT_STACKS: Record<Typography['displayFont'] | Typography['bodyFont'], string> = {
  Inter: "'Inter', system-ui, sans-serif",
  'Space Grotesk': "'Space Grotesk', 'Inter', system-ui, sans-serif",
  System: 'system-ui, -apple-system, sans-serif',
};

/**
 * Clamp scale server-side to [0.9, 1.15]. `lib/theme.ts` runs on every page
 * render and the admin form is not the only possible writer to the Setting
 * document — an unclamped value (e.g. `scale: 5` written directly) would
 * make the live storefront unusable.
 */
function clampScale(n: unknown): number {
  const num = typeof n === 'number' && Number.isFinite(n) ? n : TYPOGRAPHY_DEFAULTS.scale;
  return Math.min(1.15, Math.max(0.9, num));
}

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
 * and dark (.dark) so the recolor follows the user's theme toggle. Also emits
 * --font-display / --font-body / --font-scale on :root when typography
 * differs from defaults (these are not theme-mode-dependent, so they only
 * need to land once, not duplicated into .dark).
 *
 * Returns null when both the theme and typography match defaults (nothing to
 * override — keep the static tokens from globals.css and avoid an empty
 * style tag).
 */
export function themeOverrideCss(theme: StoreTheme, typography?: Typography): string | null {
  const isThemeDefault =
    theme.primary.toLowerCase() === THEME_DEFAULTS.primary.toLowerCase() &&
    theme.accent.toLowerCase() === THEME_DEFAULTS.accent.toLowerCase();

  const typo = typography ?? TYPOGRAPHY_DEFAULTS;
  const scale = clampScale(typo.scale);
  const isTypographyDefault =
    typo.displayFont === TYPOGRAPHY_DEFAULTS.displayFont &&
    typo.bodyFont === TYPOGRAPHY_DEFAULTS.bodyFont &&
    scale === TYPOGRAPHY_DEFAULTS.scale;

  if (isThemeDefault && isTypographyDefault) return null;

  let css = '';
  if (!isThemeDefault) {
    css +=
      block(':root', deriveVars(theme.primary, theme.accent, 'light')) +
      block('.dark', deriveVars(theme.primary, theme.accent, 'dark'));
  }
  if (!isTypographyDefault) {
    css += block(':root', {
      '--font-display': FONT_STACKS[typo.displayFont],
      '--font-body': FONT_STACKS[typo.bodyFont],
      '--font-scale': String(scale),
    });
  }
  return css || null;
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

/**
 * Fetch saved nav links. Never throws — falls back to an empty list, which
 * tells Navbar to render its own hardcoded links rather than nothing.
 */
export async function getNavSettings(): Promise<NavSettings> {
  try {
    await connectDB();
    const setting = await Setting.findOne({ key: SETTING_KEYS.NAV }).lean();
    const value = setting?.value;
    if (value && typeof value === 'object' && Array.isArray((value as NavSettings).links)) {
      return { links: (value as NavSettings).links };
    }
  } catch (err) {
    console.error('[getNavSettings]', err);
  }
  return { ...NAV_DEFAULTS };
}

/**
 * Fetch saved footer settings. Never throws — falls back to empty columns,
 * which tells Footer to render its own hardcoded content rather than
 * anything disappearing before the settings are first saved.
 */
export async function getFooterSettings(): Promise<FooterSettings> {
  try {
    await connectDB();
    const setting = await Setting.findOne({ key: SETTING_KEYS.FOOTER }).lean();
    const value = setting?.value as Partial<FooterSettings> | undefined;
    if (value && typeof value === 'object') {
      return {
        columns: Array.isArray(value.columns) ? value.columns : [],
        social: Array.isArray(value.social) ? value.social : [],
        contact: { ...FOOTER_DEFAULTS.contact, ...(value.contact ?? {}) },
      };
    }
  } catch (err) {
    console.error('[getFooterSettings]', err);
  }
  return { ...FOOTER_DEFAULTS, contact: { ...FOOTER_DEFAULTS.contact } };
}

/**
 * Fetch saved typography, merged over defaults with scale clamped to
 * [0.9, 1.15]. Never throws — a DB hiccup falls back to defaults.
 */
export async function getTypography(): Promise<Typography> {
  try {
    await connectDB();
    const setting = await Setting.findOne({ key: SETTING_KEYS.TYPOGRAPHY }).lean();
    const value = setting?.value;
    if (value && typeof value === 'object') {
      const merged = { ...TYPOGRAPHY_DEFAULTS, ...(value as Partial<Typography>) };
      return { ...merged, scale: clampScale(merged.scale) };
    }
  } catch (err) {
    console.error('[getTypography]', err);
  }
  return { ...TYPOGRAPHY_DEFAULTS };
}
