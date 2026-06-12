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
      <div className="bg-white dark:bg-surface-dark">
        {/* Image container */}
        <div className="relative overflow-hidden bg-neutral-100 dark:bg-neutral-900 aspect-square">
          <Image
            src={product.images[0]}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.isNew && (
              <span className="bg-accent text-primary text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-1">
                {t('new')}
              </span>
            )}
            {hasDiscount && (
              <span className="bg-accent text-primary text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-1">
                -{discountPct}%
              </span>
            )}
          </div>

          {/* Out of stock overlay */}
          {!product.inStock && (
            <div className="absolute inset-0 flex items-end bg-white/30 dark:bg-black/40">
              <div className="w-full bg-neutral-950/80 py-2.5 text-center">
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
              className="absolute bottom-0 left-0 right-0 bg-primary dark:bg-accent text-white dark:text-primary text-[10px] font-bold uppercase tracking-[0.2em] py-3 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {t('addToCart')}
            </button>
          )}
        </div>

        {/* Card body */}
        <div className="pt-4 pb-5 px-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 mb-1.5">
            {product.brand}
          </p>
          <h3 className="text-sm font-medium text-primary dark:text-neutral-100 line-clamp-2 leading-5 mb-2.5">
            {name}
          </h3>

          <div className="flex items-center gap-1 mb-3">
            <Star className="h-3 w-3 fill-accent text-accent flex-shrink-0" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{product.rating}</span>
            <span className="text-xs text-neutral-400">({product.reviewCount})</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-accent">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-neutral-400 line-through">
                {formatPrice(product.originalPrice!)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
