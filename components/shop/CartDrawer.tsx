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
      <SheetContent side="right" className="flex flex-col bg-paper dark:bg-ink">
        <SheetHeader>
          <SheetTitle className="font-display font-semibold tracking-display text-ink dark:text-white">{t('title')}</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6">
            <p className="text-5xl">🛒</p>
            <p className="font-medium text-graphite">{t('empty')}</p>
            <p className="text-sm text-graphite">{t('emptyDesc')}</p>
            <Button variant="outline" onClick={closeCart} asChild>
              <Link href={`/${locale}/products`}>{t('continueShopping')}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5">
              {items.map((item) => {
                const name = locale === 'ka' ? item.product.nameKa : item.product.nameEn;
                return (
                  <div key={item.product.id} className="flex gap-4">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-border-light dark:border-border-dark bg-cloud-light dark:bg-cloud-dark">
                      <Image
                        src={item.product.images[0]}
                        alt={name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <p className="text-sm font-medium line-clamp-2 text-ink dark:text-white">{name}</p>
                      <p className="text-sm font-bold text-ink dark:text-white mt-1">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="rounded-lg p-1 text-graphite hover:bg-cloud-light dark:hover:bg-cloud-dark"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm w-6 text-center text-ink dark:text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="rounded-lg p-1 text-graphite hover:bg-cloud-light dark:hover:bg-cloud-dark"
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

            <div className="border-t border-border-light dark:border-border-dark px-6 py-5 space-y-4">
              <div className="flex justify-between text-base font-semibold">
                <span className="text-ink dark:text-white">{t('total')}</span>
                <span className="text-ink dark:text-white font-bold">{formatPrice(total)}</span>
              </div>
              {/* Signal on checkout, quiet on the alternative — same hierarchy
                  as the cart page so the spine reads identically everywhere. */}
              <Button variant="accent" className="w-full font-semibold" size="lg" asChild onClick={closeCart}>
                <Link href={`/${locale}/checkout`}>{t('checkout')}</Link>
              </Button>
              <Button variant="ghost" className="w-full font-medium" onClick={closeCart} asChild>
                <Link href={`/${locale}/products`}>{t('continueShopping')}</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
