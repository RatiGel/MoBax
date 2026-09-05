import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * robots.txt — the site previously served a 404 here, so crawlers had no
 * directives and no way to discover the sitemap.
 *
 * Account, checkout and cart pages are per-visitor and carry no search value;
 * /api and /admin are internal. Everything else is open.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/admin/',
          '/email-preview',
          '/en/account',
          '/ka/account',
          '/en/cart',
          '/ka/cart',
          '/en/checkout',
          '/ka/checkout',
          '/en/orders/',
          '/ka/orders/',
          '/en/login',
          '/ka/login',
          '/en/register',
          '/ka/register',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
