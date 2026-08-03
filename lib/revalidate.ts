import { revalidatePath } from 'next/cache';

/**
 * Which storefront paths an admin change invalidates.
 *
 * Storefront pages are ISR at 60s, so without this an edit takes up to a minute
 * to appear. Centralised here so a new page only has to be added in one place.
 */
export type RevalidateScope = 'product' | 'category' | 'brand' | 'content' | 'theme';

const LOCALES = ['en', 'ka'] as const;

export function revalidateStorefront(scope: RevalidateScope, slug?: string): void {
  for (const locale of LOCALES) {
    switch (scope) {
      case 'product':
        revalidatePath(`/${locale}`);
        revalidatePath(`/${locale}/products`);
        revalidatePath(`/${locale}/products/discounts`);
        if (slug) revalidatePath(`/${locale}/products/${slug}`);
        break;
      case 'category':
      case 'brand':
        // Both appear in the Navbar, which lives in the locale layout.
        revalidatePath(`/${locale}`, 'layout');
        revalidatePath(`/${locale}/products`);
        break;
      case 'content':
      case 'theme':
        revalidatePath(`/${locale}`, 'layout');
        break;
    }
  }
}
