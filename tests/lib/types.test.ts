import { describe, it, expect } from 'vitest';
import type { Product, Category, Brand, CategorySlug } from '@/lib/types';

describe('lib/types', () => {
  it('describes a storefront product', () => {
    const p: Product = {
      id: '1', slug: 'x', nameEn: 'X', nameKa: 'X',
      descriptionEn: '', descriptionKa: '',
      price: 10, category: 'phone-cases' as CategorySlug, brand: 'Apple',
      images: [], inStock: true, rating: 0, reviewCount: 0, specs: {}, sku: 'S1',
    };
    expect(p.slug).toBe('x');
  });

  it('describes a brand with device/maker typing', () => {
    const b: Brand = { slug: 'apple', name: 'Apple', type: 'device', compatTerms: ['iPhone'] };
    expect(b.type).toBe('device');
  });

  it('describes a category', () => {
    const c: Category = {
      id: 'p1', slug: 'phone-cases' as CategorySlug,
      nameEn: 'Cases', nameKa: 'ქეისები', icon: '', image: '',
    };
    expect(c.nameKa).toBe('ქეისები');
  });
});
