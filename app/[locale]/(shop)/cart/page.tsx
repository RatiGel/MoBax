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
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 flex flex-col items-center text-center gap-4">
        <ShoppingBag className="h-20 w-20 text-neutral-300" />
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{t('empty')}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t('emptyDesc')}</p>
        <Button asChild>
          <Link href={`/${locale}/products`}>{t('continueShopping')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-8">{t('title')}</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const name = locale === 'ka' ? item.product.nameKa : item.product.nameEn;
            return (
              <div
                key={item.product.id}
                className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-border-dark dark:bg-surface-dark"
              >
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <Image src={item.product.images[0]} alt={name} fill className="object-cover" />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Link
                    href={`/${locale}/products/${item.product.slug}`}
                    className="font-medium text-neutral-900 dark:text-white hover:text-primary line-clamp-2"
                  >
                    {name}
                  </Link>
                  <p className="text-sm text-neutral-500">{item.product.brand}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center border border-neutral-300 dark:border-neutral-600 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-3 py-1.5 text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-accent">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-error hover:text-error/80 p-1"
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
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-border-dark dark:bg-surface-dark h-fit sticky top-24">
          <h2 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">Order Summary</h2>
          <div className="space-y-2 mb-4">
            {items.map((item) => {
              const name = locale === 'ka' ? item.product.nameKa : item.product.nameEn;
              return (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400 truncate max-w-[160px]">
                    {name} × {item.quantity}
                  </span>
                  <span className="font-medium">{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-neutral-200 dark:border-border-dark pt-4 flex justify-between font-bold text-lg">
            <span>{t('total')}</span>
            <span className="text-accent">{formatPrice(total)}</span>
          </div>
          <Button className="w-full mt-6" size="lg" asChild>
            <Link href={`/${locale}/checkout`}>{t('checkout')}</Link>
          </Button>
          <Button variant="outline" className="w-full mt-2" asChild>
            <Link href={`/${locale}/products`}>{t('continueShopping')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
