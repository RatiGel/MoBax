/**
 * Live page content — bridge between the admin Content editor (which writes
 * `Page` docs) and the public storefront. Mirrors `lib/faq.ts`: never throws,
 * so a DB hiccup or an unsaved page falls back to `null` and the caller
 * renders its own hardcoded/i18n default instead of an empty page.
 *
 * Section `content` is stored as Mixed (see `models/Page.ts`), so everything
 * coming back here is untrusted JSON. `pickLocalized` is the only place that
 * decides how a bilingual pair collapses to one string for a given locale.
 */

import Page, { type PageKey, type SectionType } from '@/models/Page';
import { connectDB } from '@/lib/mongodb';

export interface PageSectionContent {
  type: SectionType;
  content: Record<string, unknown>;
  order: number;
}

function asContentRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Visible sections of a page, in display order. Returns `[]` when the page has
 * never been saved, has no visible sections, or on any error.
 */
export async function getPageSections(pageKey: PageKey): Promise<PageSectionContent[]> {
  try {
    await connectDB();
    const page = await Page.findOne({ pageKey }).lean();
    if (!page || !Array.isArray(page.sections)) return [];

    return page.sections
      .filter((s) => s.isVisible !== false)
      .map((s) => ({
        type: s.type,
        content: asContentRecord(s.content),
        order: typeof s.order === 'number' ? s.order : 0,
      }))
      .sort((a, b) => a.order - b.order);
  } catch (err) {
    console.error('[getPageSections]', err);
    return [];
  }
}

/** First visible section of a given kind, or `null` when the page has none. */
export async function getPageSection(
  pageKey: PageKey,
  type: SectionType
): Promise<Record<string, unknown> | null> {
  const sections = await getPageSections(pageKey);
  return sections.find((s) => s.type === type)?.content ?? null;
}

/**
 * Read a bilingual pair (`keyEn` / `keyKa`) for one locale.
 *
 * Falls back down a chain rather than showing a blank: the requested locale,
 * then English (admins are only required to fill the English side — see
 * `validateSection`), then `undefined` so the caller can use its own default.
 * Whitespace-only values count as absent, since an admin clearing a field
 * leaves `''` behind rather than removing the key.
 */
export function pickLocalized(
  content: Record<string, unknown> | null,
  key: string,
  locale: string
): string | undefined {
  if (!content) return undefined;

  const suffix = locale === 'ka' ? 'Ka' : 'En';
  const candidates = [content[`${key}${suffix}`], content[`${key}En`], content[key]];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
}

/** Read a non-bilingual string field, treating whitespace-only as absent. */
export function pickPlain(
  content: Record<string, unknown> | null,
  key: string
): string | undefined {
  if (!content) return undefined;
  const value = content[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export interface PageSeo {
  title: string;
  description: string;
}

/**
 * Saved SEO fields for a page (Admin → Content → SEO). Returns `null` when the
 * page was never saved or both fields are blank, so callers keep their own
 * default `<title>` rather than rendering an empty one.
 */
export async function getPageSeo(pageKey: PageKey): Promise<PageSeo | null> {
  try {
    await connectDB();
    const page = await Page.findOne({ pageKey }).lean();
    const title = typeof page?.seo?.title === 'string' ? page.seo.title.trim() : '';
    const description =
      typeof page?.seo?.description === 'string' ? page.seo.description.trim() : '';
    if (!title && !description) return null;
    return { title, description };
  } catch (err) {
    console.error('[getPageSeo]', err);
    return null;
  }
}
