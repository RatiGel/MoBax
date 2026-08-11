import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/utils';
import { CreateProductSchema, UpdateProductSchema, CreateCategorySchema } from '@/lib/validations';

/**
 * Regression coverage for admin-entered product slugs.
 *
 * The shipped bug: the create route only called slugify() when the slug field
 * was blank, and the update route never called it at all. An admin who typed a
 * name into the Slug field got it stored verbatim — "IPhone 16 Pro Max Case" —
 * and since the storefront resolves /products/[slug] by exact match, every one
 * of those products 404'd. Normalization now lives in the schema so no route
 * can bypass it.
 */

const product = {
  nameEn: 'Test',
  nameKa: 'ტესტი',
  price: 10,
  sku: 'SKU-1',
  categorySlug: 'chargers',
  brand: 'Apple',
};

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('IPhone 16 Pro Max Case')).toBe('iphone-16-pro-max-case');
  });

  it('collapses punctuation and trims stray hyphens', () => {
    // The real value that broke: parentheses left a trailing hyphen before.
    expect(slugify('USB-C to Lightning Cable (1 m)')).toBe('usb-c-to-lightning-cable-1-m');
  });

  it('collapses runs of separators into one hyphen', () => {
    expect(slugify('A   ///  B')).toBe('a-b');
  });

  it('strips diacritics rather than dropping the letter', () => {
    expect(slugify('Café Crème')).toBe('cafe-creme');
  });

  it('returns empty string when nothing ASCII-alphanumeric remains', () => {
    // Georgian-only names must not silently produce a slug.
    expect(slugify('ყურსასმენი')).toBe('');
    expect(slugify('!!!')).toBe('');
  });

  it('is idempotent — re-slugifying a slug is a no-op', () => {
    const once = slugify('Google 30W Power Charger Type-C');
    expect(slugify(once)).toBe(once);
  });
});

describe('CreateProductSchema slug normalization', () => {
  it('normalizes a messy admin-typed slug instead of storing it verbatim', () => {
    const r = CreateProductSchema.parse({ ...product, slug: 'IPhone 16 Pro Max Case' });
    expect(r.slug).toBe('iphone-16-pro-max-case');
  });

  it('leaves the slug undefined when omitted so the route can derive it', () => {
    const r = CreateProductSchema.parse(product);
    expect(r.slug).toBeUndefined();
  });

  it('rejects a slug that normalizes to nothing', () => {
    const r = CreateProductSchema.safeParse({ ...product, slug: '!!!' });
    expect(r.success).toBe(false);
  });
});

describe('UpdateProductSchema slug normalization', () => {
  it('normalizes on update — the path that previously never slugified at all', () => {
    const r = UpdateProductSchema.parse({ slug: 'Google 30W Power Charger Type-C' });
    expect(r.slug).toBe('google-30w-power-charger-type-c');
  });

  it('still omits untouched keys, so normalization did not break toUpdateSchema', () => {
    const r = UpdateProductSchema.parse({ stock: 5 });
    expect(Object.keys(r)).toEqual(['stock']);
  });
});

describe('CreateCategorySchema slug normalization', () => {
  it('normalizes category slugs too', () => {
    const r = CreateCategorySchema.parse({
      nameEn: 'Power Banks',
      nameKa: 'დამტენები',
      slug: 'Power Banks',
    });
    expect(r.slug).toBe('power-banks');
  });
});
