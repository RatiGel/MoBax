'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ShoppingCart, Star } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/mock-data';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const locale = useLocale();
  const t = useTranslations('products');
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const name = locale === 'ka' ? product.nameKa : product.nameEn;
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.originalPrice!) * 100)
    : 0;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addItem(product);
    openCart();
  }

  return (
    <Link href={`/${locale}/products/${product.slug}`} className="group block">
      <div>
        {/* Image container — product floats on cloud */}
        <div className="relative overflow-hidden rounded-2xl bg-cloud-light dark:bg-cloud-dark aspect-square transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-ink/5">
          <Image
            src={product.images[0]}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.isNew && (
              <span className="bg-ink/90 text-white text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-full backdrop-blur">
                {t('new')}
              </span>
            )}
            {/* Discount badge stays on the darker cobalt in both themes: the
                lifted dark-mode cobalt put white text at 3.63:1, under AA. */}
            {hasDiscount && (
              <span className="bg-[#2E5BFF] text-white text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-full">
                −{discountPct}%
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
              className="absolute bottom-3 left-3 right-3 bg-ink/90 dark:bg-white/90 text-white dark:text-ink text-xs font-semibold py-2.5 rounded-full opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur hover:bg-cobalt dark:hover:bg-cobalt hover:text-white motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {t('addToCart')}
            </button>
          )}
        </div>

        {/* Card body */}
        <div className="pt-3.5 pb-5 px-0.5">
          <p className="text-[11px] font-medium tracking-wide text-graphite mb-1">
            {product.brand}
          </p>
          <h3 className="text-sm font-medium text-ink dark:text-neutral-100 line-clamp-2 leading-snug mb-2">
            {name}
          </h3>

          <div className="flex items-center gap-1 mb-2.5">
            <Star className="h-3 w-3 fill-ink text-ink dark:fill-white dark:text-white flex-shrink-0" />
            <span className="text-xs font-medium text-graphite">{product.rating}</span>
            <span className="text-xs text-graphite/70">({product.reviewCount})</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-ink dark:text-white tabular-nums">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-graphite/70 line-through tabular-nums">
                {formatPrice(product.originalPrice!)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
