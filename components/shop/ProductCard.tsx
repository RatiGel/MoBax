'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ShoppingCart, Star } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { discountPercent } from '@/lib/catalog-map';
import type { Product } from '@/lib/types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const locale = useLocale();
  const t = useTranslations('products');
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const name = locale === 'ka' ? product.nameKa : product.nameEn;
  // salePrice (the admin-managed, time-windowed Discounts mechanism) takes
  // precedence over the older originalPrice "was price" field when a product
  // somehow has both set — otherwise we'd stack two badges and two struck-
  // through prices on one card. isOnSale()/mapProduct() already only ever
  // populate salePrice when the sale is currently active, so this check alone
  // is enough to pick the right treatment.
  const onSale = product.salePrice !== undefined;
  const hasDiscount = !onSale && product.originalPrice && product.originalPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.originalPrice!) * 100)
    : 0;
  const salePct = onSale ? discountPercent(product) : 0;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addItem(product);
    openCart();
  }

  return (
    <Link href={`/${locale}/products/${product.slug}`} className="group block">
      <div>
        {/* Image container. A hairline-ruled panel rather than a floating
            rounded card: the direction structures the grid with rules, and
            the product photo — not the container — carries the colour. */}
        <div className="relative aspect-square overflow-hidden rounded-lg border border-hairline-light bg-panel-light transition-colors duration-200 group-hover:border-cobalt/50 dark:border-hairline-dark dark:bg-panel-dark">
          <Image
            src={product.images[0]}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />

          {/* Badges. "New" is a quiet outline — it's information, not an
              action — while a price cut earns the amber signal, since it's
              the one thing on a card worth interrupting the scan for.
              `signal-fill` owns the ink-on-amber contrast pairing. */}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {product.isNew && (
              <span className="rounded-sm bg-ink/75 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white backdrop-blur">
                {t('new')}
              </span>
            )}
            {/* The two price-cut badges are mutually exclusive — see the
                onSale precedence note above — so at most one renders. */}
            {hasDiscount && (
              <span className="signal-fill rounded-sm px-2 py-0.5 text-[10px] font-bold tabular-nums tracking-wide">
                −{discountPct}%
              </span>
            )}
            {onSale && (
              <span className="signal-fill rounded-sm px-2 py-0.5 text-[10px] font-bold tabular-nums tracking-wide">
                -{salePct}%
              </span>
            )}
          </div>

          {/* Out of stock overlay */}
          {!product.inStock && (
            <div className="absolute inset-0 flex items-end bg-paper/40 dark:bg-ink/50 backdrop-blur-[1px]">
              <div className="w-full bg-ink/85 py-2.5 text-center">
                <span className="text-white text-[10px] font-semibold uppercase tracking-[0.2em]">
                  {t('outOfStock')}
                </span>
              </div>
            </div>
          )}

          {/* Quick-add — slides up on hover */}
          {product.inStock && (
            <button
              onClick={handleAddToCart}
              aria-label={t('addToCart')}
              className="signal-fill absolute bottom-2 left-2 right-2 hidden translate-y-1 items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 motion-reduce:transition-none [@media(hover:hover)]:flex"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {t('addToCart')}
            </button>
          )}
        </div>

        {/* Card body */}
        <div className="px-0.5 pb-5 pt-3">
          <p className="mb-1 text-[11px] font-medium tracking-wide text-graphite">
            {product.brand}
          </p>
          <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-snug text-ink dark:text-neutral-100">
            {name}
          </h3>

          {/* Only show a rating once one exists. "0 (0)" reads as a BAD
              rating rather than "not yet reviewed", which actively costs
              trust on a catalogue where over half the items are new. */}
          {product.reviewCount > 0 && (
            <div className="mb-2.5 flex items-center gap-1">
              <Star className="h-3 w-3 flex-shrink-0 fill-star text-star" />
              <span className="text-xs font-medium text-ink dark:text-white tabular-nums">
                {product.rating}
              </span>
              <span className="text-xs text-graphite tabular-nums">({product.reviewCount})</span>
            </div>
          )}

          <div className="flex items-baseline gap-2">
            {onSale ? (
              <>
                <span className="text-base font-semibold tabular-nums text-amber-ink">
                  {formatPrice(product.salePrice!)}
                </span>
                <span className="text-sm text-graphite/70 line-through tabular-nums">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <>
                <span className="text-base font-semibold text-ink dark:text-white tabular-nums">
                  {formatPrice(product.price)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-graphite/70 line-through tabular-nums">
                    {formatPrice(product.originalPrice!)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
