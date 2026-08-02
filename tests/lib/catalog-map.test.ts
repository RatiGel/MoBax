import { describe, it, expect } from 'vitest';
import { mapProduct, mapCategory, mapBrand, isOnSale, discountPercent } from '@/lib/catalog-map';

const baseDoc = {
  _id: '1',
  slug: 'iphone-case',
  nameEn: 'Case', nameKa: 'ქეისი',
  descriptionEn: 'd', descriptionKa: 'ღ',
  price: 100,
  sku: 'SKU1',
  stock: 5,
  categorySlug: 'phone-cases',
  brand: 'Apple',
  images: ['a.jpg'],
  isActive: true,
  isFeatured: true,
  isNewProduct: false,
  rating: 4.5,
  reviewCount: 10,
  specs: { Color: 'Black' },
};

describe('mapProduct', () => {
  it('maps a document to the storefront shape', () => {
    const p = mapProduct(baseDoc as never);
    expect(p.id).toBe('1');
    expect(p.category).toBe('phone-cases');
    expect(p.isFeatured).toBe(true);
    expect(p.specs).toEqual({ Color: 'Black' });
  });

  it('derives inStock from stock', () => {
    expect(mapProduct({ ...baseDoc, stock: 0 } as never).inStock).toBe(false);
    expect(mapProduct({ ...baseDoc, stock: 3 } as never).inStock).toBe(true);
  });

  it('renames isNewProduct to isNew', () => {
    expect(mapProduct({ ...baseDoc, isNewProduct: true } as never).isNew).toBe(true);
  });

  it('converts a Map of specs to a plain object', () => {
    const withMap = { ...baseDoc, specs: new Map([['Bluetooth', '5.0']]) };
    expect(mapProduct(withMap as never).specs).toEqual({ Bluetooth: '5.0' });
  });

  it('exposes salePrice only when the sale is active', () => {
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);
    expect(mapProduct({ ...baseDoc, salePrice: 80, salePriceEnd: future } as never).salePrice).toBe(80);
    expect(mapProduct({ ...baseDoc, salePrice: 80, salePriceEnd: past } as never).salePrice).toBeUndefined();
  });

  it('defaults missing optional fields rather than emitting undefined holes', () => {
    const sparse = { _id: '9', slug: 's', nameEn: 'N', nameKa: 'N', price: 1, sku: 'K', categorySlug: 'cables', brand: 'B' };
    const p = mapProduct(sparse as never);
    expect(p.images).toEqual([]);
    expect(p.specs).toEqual({});
    expect(p.rating).toBe(0);
    expect(p.descriptionEn).toBe('');
  });
});

describe('isOnSale', () => {
  const now = new Date('2026-08-02T12:00:00Z');

  it('is false with no salePrice', () => {
    expect(isOnSale({ price: 100 }, now)).toBe(false);
  });

  it('is false when salePrice is not below price', () => {
    expect(isOnSale({ price: 100, salePrice: 100 }, now)).toBe(false);
    expect(isOnSale({ price: 100, salePrice: 120 }, now)).toBe(false);
  });

  it('is true for an open-ended sale', () => {
    expect(isOnSale({ price: 100, salePrice: 80 }, now)).toBe(true);
  });

  it('respects the start date', () => {
    expect(isOnSale({ price: 100, salePrice: 80, salePriceStart: new Date('2026-08-03') }, now)).toBe(false);
    expect(isOnSale({ price: 100, salePrice: 80, salePriceStart: new Date('2026-08-01') }, now)).toBe(true);
  });

  it('respects the end date', () => {
    expect(isOnSale({ price: 100, salePrice: 80, salePriceEnd: new Date('2026-08-01') }, now)).toBe(false);
    expect(isOnSale({ price: 100, salePrice: 80, salePriceEnd: new Date('2026-08-03') }, now)).toBe(true);
  });

  it('treats a start exactly at now as already started', () => {
    expect(isOnSale({ price: 100, salePrice: 80, salePriceStart: now }, now)).toBe(true);
  });

  it('treats an end exactly at now as expired', () => {
    expect(isOnSale({ price: 100, salePrice: 80, salePriceEnd: now }, now)).toBe(false);
  });
});

describe('discountPercent', () => {
  it('rounds to a whole percent', () => {
    expect(discountPercent({ price: 100, salePrice: 75 } as never)).toBe(25);
    expect(discountPercent({ price: 29.99, salePrice: 19.99 } as never)).toBe(33);
  });

  it('is 0 with no sale', () => {
    expect(discountPercent({ price: 100 } as never)).toBe(0);
  });
});

describe('mapCategory / mapBrand', () => {
  it('maps a category, dropping a null parentSlug', () => {
    const c = mapCategory({ _id: 'x', slug: 'cables', nameEn: 'Cables', nameKa: 'კაბელები', icon: '🔌', image: 'i.jpg', parentSlug: null, productCount: 4 } as never);
    expect(c.parentSlug).toBeUndefined();
    expect(c.slug).toBe('cables');
  });

  it('maps a brand', () => {
    const b = mapBrand({ slug: 'apple', name: 'Apple', type: 'device', compatTerms: ['iPhone'] } as never);
    expect(b).toEqual({ slug: 'apple', name: 'Apple', type: 'device', compatTerms: ['iPhone'] });
  });
});
