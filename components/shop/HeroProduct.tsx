'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/types';

const ROTATE_MS = 2000;
// Under prefers-reduced-motion the slide is replaced by an instant cut, which
// reads as abrupt at 2s, so it gets a calmer cadence.
const ROTATE_MS_REDUCED = 5000;

/**
 * Hero product visual with an inline quick-add. Lets a shopper buy the
 * single highest-trust item straight from the homepage — shortest possible
 * path to cart — while the whole tile still links through to the PDP.
 *
 * Given more than one product it becomes a slide carousel that advances every
 * 2s and keeps advancing while hovered; the dots let a shopper jump straight to
 * a product instead. Motion rule (see CLAUDE.md): the first slide renders
 * visible and translated to 0 on the server, so the section is never blank if
 * the timer never runs — prerender, headless render, or a background tab all
 * still show a complete, buyable hero. Under prefers-reduced-motion it keeps
 * rotating but cuts between slides instead of sliding.
 */
export function HeroProduct({ products }: { products: Product[] }) {
  const locale = useLocale();
  const t = useTranslations('home');
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const slides = products.filter(Boolean);
  const canRotate = slides.length > 1;

  const [index, setIndex] = useState(0);
  // Only ever set from tab visibility. Rotation deliberately does NOT pause on
  // hover or focus: the hero should keep cycling while a shopper reads it, and
  // the dots stay clickable to jump to a product they want.
  const [hidden, setHidden] = useState(false);
  // Reduced motion is read after mount so SSR and the first client render
  // agree; until then we assume motion is allowed and simply don't animate,
  // because nothing has moved yet.
  const [reducedMotion, setReducedMotion] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Auto-advance. Runs continuously — including on hover — and stops only on a
  // hidden tab.
  //
  // prefers-reduced-motion deliberately does NOT stop it. Rotating through the
  // range IS the feature here, not decoration, so suppressing it outright left
  // the hero frozen on one product for every visitor with the OS setting on
  // (which is common — it looks like a broken carousel, not an accommodation).
  // Instead the transform transition is dropped, so slides cut instantly with
  // no sliding movement, at a slower cadence.
  useEffect(() => {
    if (!canRotate || hidden) return;

    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      reducedMotion ? ROTATE_MS_REDUCED : ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [canRotate, hidden, reducedMotion, slides.length]);

  // A background tab throttles timers and would otherwise queue up a burst of
  // advances on return; treat visibility as a stop signal instead. Seeded from
  // the current value so a tab that was already hidden at mount stays stopped.
  useEffect(() => {
    if (!canRotate) return;
    setHidden(document.hidden);
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [canRotate]);

  // Clamp if the product list shrinks under us (e.g. locale/data swap).
  useEffect(() => {
    setIndex((i) => (i >= slides.length ? 0 : i));
  }, [slides.length]);

  const goTo = useCallback((next: number) => {
    setIndex(next);
  }, []);

  if (slides.length === 0) return null;

  const active = slides[Math.min(index, slides.length - 1)];
  const activeName = locale === 'ka' ? active.nameKa : active.nameEn;

  function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!active.inStock) return;
    addItem(active);
    openCart();
  }

  return (
    <div className="animate-fade-up">
      <div className="group relative block">
        {/* Viewport. The track holds every slide side by side and shifts by
            whole viewport widths, so images never re-mount mid-transition. */}
        <div
          className="relative aspect-[4/5] sm:aspect-square overflow-hidden rounded-4xl bg-cloud-light dark:bg-cloud-dark"
          aria-roledescription={canRotate ? 'carousel' : undefined}
          aria-label={canRotate ? t('heroCarousel') : undefined}
        >
          <div
            ref={trackRef}
            className="flex h-full w-full transition-transform duration-700 ease-out motion-reduce:transition-none"
            style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
          >
            {slides.map((product, i) => {
              const name = locale === 'ka' ? product.nameKa : product.nameEn;
              return (
                <Link
                  key={product.id}
                  href={`/${locale}/products/${product.slug}`}
                  // Off-screen slides stay out of the tab order and the
                  // accessibility tree so keyboard and screen-reader users get
                  // exactly one hero product, matching what is on screen.
                  aria-hidden={i !== index}
                  tabIndex={i === index ? 0 : -1}
                  className="relative block h-full w-full shrink-0 grow-0 basis-full"
                >
                  <Image
                    src={product.images[0]}
                    alt={name}
                    fill
                    priority={i === 0}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Floating chip — name, price, one-tap add. Sits outside the track so
            it never slides; it swaps to the active product's details. */}
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-border-light/60 bg-surface-light/90 px-4 py-3 backdrop-blur dark:border-border-dark/60 dark:bg-surface-dark/90">
          <div className="min-w-0" aria-live="polite" aria-atomic>
            <p className="truncate text-sm font-semibold text-ink dark:text-white">{activeName}</p>
            <p className="text-sm font-medium text-graphite tabular-nums">{formatPrice(active.price)}</p>
          </div>
          <button
            type="button"
            onClick={quickAdd}
            disabled={!active.inStock}
            aria-label={`${t('heroShopFeatured')} — ${activeName}`}
            className="signal-fill inline-flex shrink-0 items-center gap-1.5 rounded-md px-4 py-2.5 text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-50 motion-reduce:active:scale-100"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('heroShopFeatured')}
          </button>
        </div>
      </div>

      {/* Dots. Below the image rather than over it, so they never overlap the
          quick-add chip or sit on unpredictable photo contrast. */}
      {canRotate && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {slides.map((product, i) => {
            const name = locale === 'ka' ? product.nameKa : product.nameEn;
            const current = i === index;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={name}
                aria-current={current ? 'true' : undefined}
                className={`h-2 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                  current
                    ? 'w-6 bg-cobalt'
                    : 'w-2 bg-border-light hover:bg-graphite dark:bg-border-dark dark:hover:bg-graphite'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
