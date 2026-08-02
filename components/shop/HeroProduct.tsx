'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/mock-data';

/**
 * Hero product visual with an inline quick-add. Lets a shopper buy the
 * single highest-trust item straight from the homepage — shortest possible
 * path to cart — while the whole tile still links through to the PDP.
 */
export function HeroProduct({ product }: { product: Product }) {
  const locale = useLocale();
  const t = useTranslations('home');
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const name = locale === 'ka' ? product.nameKa : product.nameEn;

  function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!product.inStock) return;
    addItem(product);
    openCart();
  }

  return (
    <Link
      href={`/${locale}/products/${product.slug}`}
      className="group relative block animate-fade-up"
    >
      <div className="relative aspect-[4/5] sm:aspect-square overflow-hidden rounded-4xl bg-cloud-light dark:bg-cloud-dark">
        <Image
          src={product.images[0]}
          alt={name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>

      {/* Floating chip — name, price, one-tap add */}
      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-border-light/60 bg-surface-light/90 px-4 py-3 backdrop-blur dark:border-border-dark/60 dark:bg-surface-dark/90">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink dark:text-white">{name}</p>
          <p className="text-sm font-medium text-graphite tabular-nums">{formatPrice(product.price)}</p>
        </div>
        <button
          onClick={quickAdd}
          disabled={!product.inStock}
          aria-label={t('heroShopFeatured')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#2E5BFF] px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#2E5BFF]/90 active:scale-[0.97] disabled:opacity-50 motion-reduce:active:scale-100"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('heroShopFeatured')}
        </button>
      </div>
    </Link>
  );
}
