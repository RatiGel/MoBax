'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Minus, Plus, Trash2, ShoppingBag, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const locale = useLocale();
  const t = useTranslations('cart');
  const { items, removeItem, updateQuantity } = useCartStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Default: all items selected. Prune selection as items leave the cart;
  // auto-select freshly added items.
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(items.map((i) => i.product.id));
      if (!initialized) {
        setInitialized(true);
        return ids;
      }
      const next = new Set(Array.from(prev).filter((id) => ids.has(id)));
      items.forEach((i) => {
        if (!prev.has(i.product.id)) next.add(i.product.id);
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

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

  const allSelected = selected.size === items.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.product.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeSelected() {
    selected.forEach((id) => removeItem(id));
    setSelected(new Set());
  }

  const selectedItems = items.filter((i) => selected.has(i.product.id));
  const totalCost = selectedItems.reduce(
    (sum, i) => sum + (i.product.originalPrice ?? i.product.price) * i.quantity,
    0
  );
  const orderTotal = selectedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const totalDiscount = totalCost - orderTotal;

  function handleCheckout(e: React.MouseEvent) {
    if (selectedItems.length === 0) {
      e.preventDefault();
      toast.error(t('selectItemsToCheckout'));
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display font-semibold tracking-display text-3xl text-ink dark:text-white mb-8">
        {t('title')}{' '}
        <span className="text-graphite text-xl font-normal">({t('items', { count: items.length })})</span>
      </h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface-light px-4 py-3 dark:border-border-dark dark:bg-surface-dark">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} id="select-all" />
            <label htmlFor="select-all" className="text-sm font-medium text-ink dark:text-white cursor-pointer">
              {t('selectAll')}
            </label>
            {selected.size > 0 && (
              <button
                onClick={removeSelected}
                className="ml-auto flex items-center gap-1.5 text-sm text-graphite hover:text-error transition-colors"
              >
                <Trash2 className="h-4 w-4" /> {t('remove')}
              </button>
            )}
          </div>

          {items.map((item) => {
            const name = locale === 'ka' ? item.product.nameKa : item.product.nameEn;
            const isSelected = selected.has(item.product.id);
            const hasDiscount =
              item.product.originalPrice && item.product.originalPrice > item.product.price;
            return (
              <div
                key={item.product.id}
                className="flex gap-4 rounded-2xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark"
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleOne(item.product.id)}
                  className="mt-1 self-start"
                />
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-cloud-light dark:bg-cloud-dark">
                  <Image src={item.product.images[0]} alt={name} fill className="object-cover" />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/${locale}/products/${item.product.slug}`}
                      className="font-medium text-ink dark:text-white hover:text-amber-ink line-clamp-2 transition-colors"
                    >
                      {name}
                    </Link>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-graphite hover:text-error p-1 transition-colors flex-shrink-0"
                      aria-label={t('remove')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
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
                    <div className="flex items-center gap-2">
                      {hasDiscount && (
                        <span className="text-sm text-graphite line-through tabular-nums">
                          {formatPrice(item.product.originalPrice! * item.quantity)}
                        </span>
                      )}
                      <span className="font-semibold text-amber-ink tabular-nums">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
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
          <div className="flex justify-between text-sm mb-4 pb-4 border-b border-border-light dark:border-border-dark">
            <span className="text-graphite">{t('items', { count: selectedItems.length })}</span>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-graphite">{t('totalCost')}:</span>
              <span className="font-medium text-ink dark:text-white tabular-nums">{formatPrice(totalCost)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-graphite">{t('totalDiscount')}:</span>
                <span className="font-medium text-error tabular-nums">-{formatPrice(totalDiscount)}</span>
              </div>
            )}
          </div>
          <div className="border-t border-border-light dark:border-border-dark pt-4 flex justify-between font-bold text-lg">
            <span className="text-ink dark:text-white">{t('orderTotal')}</span>
            <span className="text-ink dark:text-white tabular-nums">{formatPrice(orderTotal)}</span>
          </div>
          {/* Checkout takes the amber signal — it is the one action this page
              exists to drive. "Continue shopping" drops to a ghost so the two
              stop competing; they were near-equal weights before. */}
          <Button
            variant="accent"
            className="mt-6 w-full font-semibold"
            size="lg"
            disabled={selectedItems.length === 0}
            asChild
          >
            <Link href={`/${locale}/checkout`} onClick={handleCheckout}>
              {t('checkout')}
            </Link>
          </Button>
          <Button variant="ghost" className="mt-1.5 w-full font-medium" asChild>
            <Link href={`/${locale}/products`}>{t('continueShopping')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
