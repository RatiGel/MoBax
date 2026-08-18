// Shared page-section schemas.
//
// `models/Page.ts` defines `sections[].type` as the enum below and stores
// `content` as Mixed — Mongoose does not validate its shape. This module is
// the single source of truth for what each section kind's `content` actually
// contains, so the admin editor (Task 19) and the storefront renderer read
// the same shape instead of drifting apart.
//
// Every bilingual field named `x` produces two content keys: `xEn` and `xKa`.
// Georgian is never required here — `validateSection` only rejects a missing
// *English* value, so a page can be drafted in one language and translated
// later. The UI-level nudge to fill in Georgian is `BilingualField`'s warning,
// not a validation error.

export const SECTION_KINDS = ['hero', 'text', 'banner', 'faq', 'grid'] as const;

export type SectionKind = (typeof SECTION_KINDS)[number];

export type SectionFieldType = 'text' | 'textarea' | 'image' | 'url' | 'number' | 'boolean';

export interface SectionFieldSpec {
  key: string;
  label: string;
  type: SectionFieldType;
  bilingual: boolean;
  /**
   * Optional fields may be left blank. The storefront falls back to its own
   * built-in default for these (see the hero fields below), so requiring them
   * would block a save for no benefit. Omitted means required.
   */
  optional?: boolean;
}

function isSectionKind(value: unknown): value is SectionKind {
  return typeof value === 'string' && (SECTION_KINDS as readonly string[]).includes(value);
}

export const SECTION_SCHEMAS: Record<SectionKind, SectionFieldSpec[]> = {
  hero: [
    { key: 'badge', label: 'Badge (small pill above heading)', type: 'text', bilingual: true, optional: true },
    { key: 'heading', label: 'Heading', type: 'text', bilingual: true },
    { key: 'subheading', label: 'Subheading', type: 'textarea', bilingual: true },
    { key: 'image', label: 'Image', type: 'image', bilingual: false },
    { key: 'rating', label: 'Rating shown next to stars (e.g. 4.8)', type: 'text', bilingual: false },
    { key: 'trust', label: 'Trust line (next to rating)', type: 'text', bilingual: true, optional: true },
    { key: 'ctaLabel', label: 'Primary button label', type: 'text', bilingual: true, optional: true },
    { key: 'ctaHref', label: 'Primary button link', type: 'url', bilingual: false },
    { key: 'ctaSecondaryLabel', label: 'Secondary button label', type: 'text', bilingual: true, optional: true },
    { key: 'ctaSecondaryHref', label: 'Secondary button link', type: 'url', bilingual: false },
  ],
  text: [{ key: 'body', label: 'Body', type: 'textarea', bilingual: true }],
  banner: [
    { key: 'heading', label: 'Heading', type: 'text', bilingual: true },
    { key: 'body', label: 'Body', type: 'textarea', bilingual: true },
    { key: 'image', label: 'Image', type: 'image', bilingual: false },
    { key: 'href', label: 'Link', type: 'url', bilingual: false },
  ],
  // The item list itself stays in the existing `faq` admin setting (lib/faq.ts)
  // — this section only carries an optional intro blurb above that list.
  faq: [{ key: 'intro', label: 'Intro', type: 'textarea', bilingual: true }],
  grid: [
    { key: 'heading', label: 'Heading', type: 'text', bilingual: true },
    { key: 'columns', label: 'Columns', type: 'number', bilingual: false },
    { key: 'showCategories', label: 'Show categories', type: 'boolean', bilingual: false },
  ],
};

/** Content keys a field spec contributes: bilingual fields expand to `${key}En` / `${key}Ka`. */
function contentKeys(field: SectionFieldSpec): string[] {
  return field.bilingual ? [`${field.key}En`, `${field.key}Ka`] : [field.key];
}

function defaultValue(type: SectionFieldType): unknown {
  switch (type) {
    case 'number':
      return 0;
    case 'boolean':
      return false;
    default:
      return '';
  }
}

export function emptyContent(kind: SectionKind): Record<string, unknown> {
  const schema = SECTION_SCHEMAS[kind];
  const content: Record<string, unknown> = {};
  for (const field of schema) {
    for (const key of contentKeys(field)) {
      content[key] = defaultValue(field.type);
    }
  }
  return content;
}

/** Is `value` present in the sense that matters for validation (non-empty string / any number / any boolean)? */
function isFilled(value: unknown, type: SectionFieldType): boolean {
  if (type === 'boolean' || type === 'number') return value !== undefined && value !== null;
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateSection(
  kind: SectionKind,
  content: unknown
): { ok: true } | { ok: false; errors: string[] } {
  if (!isSectionKind(kind)) {
    return { ok: false, errors: [`Unknown section kind: ${String(kind)}`] };
  }

  const record =
    content && typeof content === 'object' && !Array.isArray(content)
      ? (content as Record<string, unknown>)
      : {};

  const errors: string[] = [];
  const schema = SECTION_SCHEMAS[kind];

  for (const field of schema) {
    if (field.bilingual) {
      // Only the English side is required. Georgian is warned about in the
      // UI (BilingualField), never blocked here. Fields marked `optional` are
      // skipped entirely — the storefront has a fallback for them.
      if (field.optional) continue;
      const enKey = `${field.key}En`;
      if (!isFilled(record[enKey], field.type)) {
        errors.push(`${enKey} is required`);
      }
    } else {
      // Non-bilingual fields: image/url/text default to '' and are optional
      // (a hero can exist without an image yet); number/boolean always have
      // a concrete default so there is nothing to require.
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}
