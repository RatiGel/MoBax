'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ShoppingCart, Minus, Plus, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/shop/StarRating';
import { ProductCard } from '@/components/shop/ProductCard';
import { ReviewSection } from '@/components/shop/ReviewSection';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface ProductDetailClientProps {
  product: Product;
  related: Product[];
}

export function ProductDetailClient({ product, related }: ProductDetailClientProps) {
  const locale = useLocale();
  const t = useTranslations('product');
  const tP = useTranslations('products');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem, openCart } = useCartStore();

  const name = locale === 'ka' ? product.nameKa : product.nameEn;
  const description = locale === 'ka' ? product.descriptionKa : product.descriptionEn;
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.originalPrice!) * 100)
    : 0;

  function handleAddToCart() {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    openCart();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-paper dark:bg-ink">

      {/* Breadcrumb */}
      <div className="mb-10">
        <Link
          href={`/${locale}/products`}
          className="inline-flex items-center gap-1.5 text-sm text-graphite hover:text-cobalt dark:hover:text-cobalt-dark transition-colors font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tP('title')}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-14 lg:grid-cols-2">

        {/* ── Image Gallery ─────────────────────────── */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-cloud-light dark:bg-cloud-dark">
            <Image
              src={product.images[selectedImage]}
              alt={name}
              fill
              className="object-cover"
              priority
            />
            {/* Badges */}
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              {product.isNew && (
                <span className="bg-cobalt text-white text-[10px] font-medium px-3 py-1 rounded-full">
                  {tP('new')}
                </span>
              )}
              {hasDiscount && (
                <span className="bg-cobalt text-white text-[10px] font-medium px-3 py-1 rounded-full">
                  -{discountPct}%
                </span>
              )}
            </div>
          </div>

          {product.images.length > 1 && (
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 transition-all ${
                    selectedImage === i
                      ? 'border-cobalt dark:border-cobalt-dark'
                      : 'border-border-light dark:border-border-dark hover:border-cobalt/50'
                  }`}
                >
                  <Image src={img} alt={`${name} ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product Info ──────────────────────────── */}
        <div className="space-y-7">
          <div>
            <p className="text-xs font-medium text-cobalt dark:text-cobalt-dark mb-3">
              {product.brand}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-display text-ink dark:text-white leading-tight">
              {name}
            </h1>
            <div className="mt-4">
              <StarRating rating={product.rating} reviewCount={product.reviewCount} />
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-4 py-6 border-t border-b border-border-light dark:border-border-dark">
            <span className="text-4xl font-bold text-ink dark:text-white">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-xl text-graphite line-through">
                  {formatPrice(product.originalPrice!)}
                </span>
                <span className="text-sm font-semibold text-cobalt dark:text-cobalt-dark">
                  Save {discountPct}%
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2">
            {product.inStock ? (
              <>
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">
                  {t('inStock')}
                </span>
              </>
            ) : (
              <span className="text-sm font-medium text-graphite">
                {t('outOfStock')}
              </span>
            )}
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {description}
          </p>

          {/* Quantity + Add to cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-12 px-4 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-5 text-sm font-semibold min-w-[3rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="h-12 px-4 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button
              className="flex-1 h-12 text-xs font-bold uppercase tracking-[0.15em]"
              onClick={handleAddToCart}
              disabled={!product.inStock || added}
            >
              {added ? (
                <>✓ {locale === 'ka' ? 'დაემატა!' : 'Added!'}</>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {t('addToCart')}
                </>
              )}
            </Button>
          </div>

          {/* SKU */}
          <p className="text-[11px] text-neutral-400 uppercase tracking-widest">
            SKU: {product.sku}
          </p>

          {/* Specs */}
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-900 dark:text-neutral-100 mb-5">
              {t('specs')}
            </h2>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="flex px-5 py-3.5 bg-white dark:bg-surface-dark">
                  <span className="w-40 text-xs text-neutral-500 dark:text-neutral-500 flex-shrink-0 uppercase tracking-wider">
                    {key}
                  </span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews */}
      <ReviewSection productSlug={product.slug} />

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-24 pt-12 border-t border-neutral-200 dark:border-neutral-800">
          <h2 className="font-display text-2xl font-bold text-neutral-950 dark:text-white mb-10">
            {t('relatedProducts')}
          </h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
