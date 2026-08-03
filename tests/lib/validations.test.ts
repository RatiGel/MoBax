import { describe, it, expect } from 'vitest';
import {
  CreateProductSchema,
  UpdateProductSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateBrandSchema,
  UpdateBrandSchema,
  CreateDiscountSchema,
  UpdateDiscountSchema,
  CreatePromotionSchema,
  UpdatePromotionSchema,
} from '@/lib/validations';

// Regression coverage for the silent-data-loss bug: Zod's `.partial()` makes
// keys optional but does NOT strip `.default(...)`, so an omitted key on a
// PATCH still gets defaulted back in — and the route `$set`s the whole parsed
// object, wiping real fields (descriptions, tags, isActive, etc.) with
// defaults. Each update schema below must be built via toUpdateSchema so a
// single-field input parses to exactly that one key, while create schemas
// must keep applying their defaults, and constraints must still reject bad
// input on the update path.

describe('lib/validations — update schemas do not reintroduce defaults', () => {
  it('UpdateProductSchema: single-field patch parses to exactly that key', () => {
    expect(Object.keys(UpdateProductSchema.parse({ stock: 5 }))).toEqual(['stock']);
  });

  it('CreateProductSchema: still applies defaults when optional fields are omitted', () => {
    const parsed = CreateProductSchema.parse({
      nameEn: 'Case',
      nameKa: 'ქეისი',
      price: 10,
      sku: 'SKU-1',
      categorySlug: 'phone-cases',
      brand: 'Apple',
    });
    expect(parsed.descriptionEn).toBe('');
    expect(parsed.descriptionKa).toBe('');
    expect(parsed.stock).toBe(0);
    expect(parsed.tags).toEqual([]);
    expect(parsed.variants).toEqual([]);
    expect(parsed.images).toEqual([]);
    expect(parsed.isActive).toBe(true);
    expect(parsed.isFeatured).toBe(false);
    expect(parsed.isNewProduct).toBe(false);
    expect(parsed.specs).toEqual({});
  });

  it('UpdateProductSchema: still rejects an over-long descriptionEn', () => {
    const result = UpdateProductSchema.safeParse({ descriptionEn: 'x'.repeat(5001) });
    expect(result.success).toBe(false);
  });

  it('UpdateProductSchema: still rejects a non-URL image', () => {
    const result = UpdateProductSchema.safeParse({ images: ['not-a-url'] });
    expect(result.success).toBe(false);
  });

  it('UpdateCategorySchema: single-field patch parses to exactly that key', () => {
    expect(Object.keys(UpdateCategorySchema.parse({ isActive: false }))).toEqual(['isActive']);
  });

  it('CreateCategorySchema: still applies defaults when optional fields are omitted', () => {
    const parsed = CreateCategorySchema.parse({ nameEn: 'Cases', nameKa: 'ქეისები' });
    expect(parsed.descriptionEn).toBe('');
    expect(parsed.descriptionKa).toBe('');
    expect(parsed.icon).toBe('');
    expect(parsed.image).toBe('');
    expect(parsed.isActive).toBe(true);
  });

  it('UpdateCategorySchema: still rejects a non-URL image', () => {
    const result = UpdateCategorySchema.safeParse({ image: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('UpdateBrandSchema: single-field patch parses to exactly that key', () => {
    expect(Object.keys(UpdateBrandSchema.parse({ compatTerms: ['iPhone'] }))).toEqual(['compatTerms']);
  });

  it('CreateBrandSchema: still applies defaults when optional fields are omitted', () => {
    const parsed = CreateBrandSchema.parse({ name: 'Apple' });
    expect(parsed.logoUrl).toBe('');
    expect(parsed.type).toBe('maker');
    expect(parsed.compatTerms).toEqual([]);
  });

  it('UpdateBrandSchema: still rejects an invalid enum value for type', () => {
    const result = UpdateBrandSchema.safeParse({ type: 'not-a-real-type' });
    expect(result.success).toBe(false);
  });

  it('UpdateBrandSchema: still rejects a non-URL logoUrl', () => {
    const result = UpdateBrandSchema.safeParse({ logoUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('UpdateDiscountSchema: single-field patch parses to exactly that key', () => {
    expect(Object.keys(UpdateDiscountSchema.parse({ isActive: false }))).toEqual(['isActive']);
  });

  it('CreateDiscountSchema: still applies defaults when optional fields are omitted', () => {
    const parsed = CreateDiscountSchema.parse({ code: 'SAVE10', type: 'percentage', value: 10 });
    expect(parsed.minOrderAmount).toBe(0);
    expect(parsed.isActive).toBe(true);
    expect(parsed.applicableProducts).toEqual([]);
    expect(parsed.applicableCategories).toEqual([]);
  });

  it('UpdateDiscountSchema: still rejects an invalid enum value for type', () => {
    const result = UpdateDiscountSchema.safeParse({ type: 'not-a-real-type' });
    expect(result.success).toBe(false);
  });

  it('UpdatePromotionSchema: single-field patch parses to exactly that key', () => {
    expect(Object.keys(UpdatePromotionSchema.parse({ buyQty: 3 }))).toEqual(['buyQty']);
  });

  it('CreatePromotionSchema: still applies defaults when optional fields are omitted', () => {
    const parsed = CreatePromotionSchema.parse({
      name: 'Buy one get one',
      buyProductSlug: 'case-a',
      getProductSlug: 'case-b',
      discountPercent: 50,
    });
    expect(parsed.buyQty).toBe(1);
    expect(parsed.isActive).toBe(true);
  });

  it('UpdatePromotionSchema: still rejects discountPercent above 100', () => {
    const result = UpdatePromotionSchema.safeParse({ discountPercent: 150 });
    expect(result.success).toBe(false);
  });
});
