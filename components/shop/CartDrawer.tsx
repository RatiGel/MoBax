'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export function CartDrawer() {
  const locale = useLocale();
  const t = useTranslations('cart');
  const { items, isCartOpen, closeCart, removeItem, updateQuantity, getTotal } = useCartStore();
  const total = getTotal();

  return (
    <Sheet open={isCartOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('title')}</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
            <p className="text-4xl">🛒</p>
            <p className="font-medium text-gray-700 dark:text-gray-300">{t('empty')}</p>
            <p className="text-sm text-gray-500">{t('emptyDesc')}</p>
            <Button variant="outline" onClick={closeCart} asChild>
              <Link href={`/${locale}/products`}>{t('continueShopping')}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
              {items.map((item) => {
                const name = locale === 'ka' ? item.product.nameKa : item.product.nameEn;
                return (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      <Image
                        src={item.product.images[0]}
                        alt={name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <p className="text-sm font-medium line-clamp-2 text-gray-900 dark:text-gray-100">{name}</p>
                      <p className="text-sm font-bold text-neutral-950 dark:text-white mt-1">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="rounded p-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="rounded p-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="ml-auto text-error hover:text-error/80"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-neutral-200 dark:border-border-dark px-6 py-4 space-y-4">
              <div className="flex justify-between text-base font-semibold">
                <span>{t('total')}</span>
                <span className="text-neutral-950 dark:text-white font-bold">{formatPrice(total)}</span>
              </div>
              <Button className="w-full" size="lg" asChild onClick={closeCart}>
                <Link href={`/${locale}/checkout`}>{t('checkout')}</Link>
              </Button>
              <Button variant="outline" className="w-full" onClick={closeCart} asChild>
                <Link href={`/${locale}/products`}>{t('continueShopping')}</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
