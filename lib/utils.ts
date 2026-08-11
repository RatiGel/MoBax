import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = 'GEL'): string {
  if (currency === 'GEL') return `₾${amount.toFixed(2)}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

/**
 * Normalize a string into a URL-safe slug.
 *
 * Product URLs are `/[locale]/products/[slug]` and the storefront looks the
 * product up by this exact value, so anything that is not URL-safe here becomes
 * a 404 on the live site. Admin-entered slugs used to be stored verbatim, which
 * put values like "IPhone 16 Pro Max Case" in the database and 404'd every one
 * of those products.
 *
 * Strips diacritics, lowercases, turns any run of non-alphanumerics into a
 * single hyphen, and trims leading/trailing hyphens. Returns '' for input with
 * no ASCII-alphanumeric content (e.g. a purely Georgian name) — callers must
 * handle that rather than write an empty slug.
 */
export function slugify(str: string): string {
  return str
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // drop combining accent marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
