'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Package } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

type OrderRow = {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  itemCount: number;
  firstImage: string;
};

export default function AccountOrdersPage() {
  const locale = useLocale();
  const t = useTranslations('account');
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/orders');
      if (!res.ok) { setOrders([]); return; }
      const data = await res.json();
      setOrders(data.orders ?? []);
    })();
  }, []);

  if (orders === null) return <p className="text-sm text-graphite">{t('loading')}</p>;

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-border-light p-10 text-center dark:border-border-dark">
        <p className="text-graphite">{t('ordersEmpty')}</p>
        <Link href={`/${locale}/products`} className="mt-3 inline-block font-semibold text-cobalt hover:underline dark:text-cobalt-dark">
          {t('ordersShopLink')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-ink dark:text-white">{t('ordersHeading')}</h2>
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o._id}>
            <Link
              href={`/${locale}/account/orders/${o._id}`}
              className="flex items-center gap-4 rounded-2xl border border-border-light p-4 transition-colors hover:border-cobalt dark:border-border-dark"
            >
              {o.firstImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.firstImage} alt="" className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-cloud-light text-graphite dark:bg-cloud-dark">
                  <Package className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink dark:text-white">
                  {t('orderNumber')} {o.orderNumber}
                </p>
                <p className="text-sm text-graphite">
                  {new Date(o.createdAt).toLocaleDateString(locale === 'ka' ? 'ka-GE' : 'en-US')} ·{' '}
                  {t('orderItems', { count: o.itemCount })} · {o.status.toLowerCase()}
                </p>
              </div>
              <span className="font-semibold tabular-nums text-ink dark:text-white">
                {formatPrice(o.total)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
