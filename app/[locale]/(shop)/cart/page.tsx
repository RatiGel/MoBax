'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const locale = useLocale();
  const t = useTranslations('cart');
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();
  const total = getTotal();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 flex flex-col items-center text-center gap-4 bg-paper dark:bg-ink">
        <ShoppingBag className="h-16 w-16 text-graphite/50" />
        <h1 className="font-display font-semibold tracking-display text-2xl text-ink dark:text-white">{t('empty')}</h1>
        <p className="text-graphite">{t('emptyDesc')}</p>
        <Button className="rounded-full font-semibold" asChild>
          <Link href={`/${locale}/products`}>{t('continueShopping')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display font-semibold tracking-display text-3xl text-ink dark:text-white mb-8">{t('title')}</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const name = locale === 'ka' ? item.product.nameKa : item.product.nameEn;
            return (
              <div
                key={item.product.id}
                className="flex gap-4 rounded-2xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark"
              >
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-cloud-light dark:bg-cloud-dark">
                  <Image src={item.product.images[0]} alt={name} fill className="object-cover" />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Link
                    href={`/${locale}/products/${item.product.slug}`}
                    className="font-medium text-ink dark:text-white hover:text-cobalt dark:hover:text-cobalt-dark line-clamp-2 transition-colors"
                  >
                    {name}
                  </Link>
                  <p className="text-sm text-graphite">{item.product.brand}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center border border-border-light dark:border-border-dark rounded-full overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="px-3 py-1.5 text-graphite hover:bg-cloud-light dark:hover:bg-cloud-dark transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-3 py-1.5 text-sm font-medium text-ink dark:text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="px-3 py-1.5 text-graphite hover:bg-cloud-light dark:hover:bg-cloud-dark transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-ink dark:text-white tabular-nums">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-graphite hover:text-error p-1 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="rounded-2xl border border-border-light bg-surface-light p-6 dark:border-border-dark dark:bg-surface-dark h-fit sticky top-24">
          <h2 className="font-display font-semibold text-lg text-ink dark:text-white mb-4">
            {locale === 'ka' ? 'შეკვეთის შეჯამება' : 'Order summary'}
          </h2>
          <div className="space-y-2 mb-4">
            {items.map((item) => {
              const name = locale === 'ka' ? item.product.nameKa : item.product.nameEn;
              return (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-graphite truncate max-w-[160px]">
                    {name} × {item.quantity}
                  </span>
                  <span className="font-medium text-ink dark:text-white tabular-nums">{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border-light dark:border-border-dark pt-4 flex justify-between font-bold text-lg">
            <span className="text-ink dark:text-white">{t('total')}</span>
            <span className="text-ink dark:text-white tabular-nums">{formatPrice(total)}</span>
          </div>
          <Button className="w-full mt-6 rounded-full font-semibold" size="lg" asChild>
            <Link href={`/${locale}/checkout`}>{t('checkout')}</Link>
          </Button>
          <Button variant="outline" className="w-full mt-2 rounded-full font-semibold" asChild>
            <Link href={`/${locale}/products`}>{t('continueShopping')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
