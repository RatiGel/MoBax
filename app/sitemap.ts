import type { MetadataRoute } from 'next';
import { getProducts, getCategories, getCategoryProductCounts } from '@/lib/catalog';
import { SITE_URL, LOCALES, absoluteUrl } from '@/lib/seo';

/**
 * XML sitemap — previously a 404, so the only way into the catalog was
 * following links, and most products were not linked from anywhere.
 *
 * Every entry is emitted once per locale with hreflang alternates, so Google
 * treats /ka and /en as translations rather than duplicates.
 *
 * Empty categories are deliberately excluded: submitting a category page with
 * no products invites a thin-content assessment across the whole set.
 */

export const revalidate = 3600;

function alternatesFor(path: string) {
  return {
    languages: {
      ka: absoluteUrl(`/ka${path}`),
      en: absoluteUrl(`/en${path}`),
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, counts] = await Promise.all([
    getProducts(),
    getCategories(),
    getCategoryProductCounts(),
  ]);

  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  // Static routes, highest priority first.
  const staticPaths: { path: string; priority: number; freq: 'daily' | 'weekly' | 'monthly' }[] = [
    { path: '', priority: 1, freq: 'daily' },
    { path: '/products', priority: 0.9, freq: 'daily' },
    { path: '/products/discounts', priority: 0.7, freq: 'daily' },
    { path: '/services', priority: 0.6, freq: 'monthly' },
  ];

  for (const { path, priority, freq } of staticPaths) {
    for (const locale of LOCALES) {
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: now,
        changeFrequency: freq,
        priority,
        alternates: alternatesFor(path),
      });
    }
  }

  // Category listings — only those that actually hold products.
  for (const category of categories) {
    if ((counts[category.slug] ?? 0) === 0) continue;
    const path = `/products?category=${category.slug}`;
    for (const locale of LOCALES) {
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: alternatesFor(path),
      });
    }
  }

  // Products.
  for (const product of products) {
    const path = `/products/${product.slug}`;
    for (const locale of LOCALES) {
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: alternatesFor(path),
      });
    }
  }

  return entries;
}
