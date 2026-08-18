'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { OrderSummary } from '@/components/shop/OrderSummary';

type Order = {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  trackingNumber?: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  items: { nameSnapshot: string; priceSnapshot: number; quantity: number; image: string }[];
  createdAt: string;
};

export default function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const t = useTranslations('account');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) { setError(true); return; }
      const data = await res.json();
      setOrder(data.order);
    })();
  }, [id]);

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/account/orders`}
        className="inline-flex items-center gap-1 text-sm font-medium text-amber-ink hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('orderBackToList')}
      </Link>

      {error && <p className="text-sm text-error">{t('loading')}</p>}

      {order && (
        <>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink dark:text-white">
              {t('orderNumber')} {order.orderNumber}
            </h2>
            <p className="text-sm text-graphite">
              {new Date(order.createdAt).toLocaleDateString(locale === 'ka' ? 'ka-GE' : 'en-US')} ·{' '}
              {order.status.toLowerCase()}
            </p>
          </div>

          {order.trackingNumber && (
            <div className="rounded-2xl border border-border-light p-4 text-sm dark:border-border-dark">
              <span className="text-graphite">Tracking number: </span>
              <span className="font-medium text-ink dark:text-white">{order.trackingNumber}</span>
            </div>
          )}

          <OrderSummary
            items={order.items}
            subtotal={order.subtotal}
            shippingCost={order.shippingCost}
            total={order.total}
            paymentMethod={order.paymentMethod}
            paymentStatus={order.paymentStatus}
          />
        </>
      )}
    </div>
  );
}
