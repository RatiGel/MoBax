'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Package, CheckCircle2, Truck, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/utils';

type OrderItem = {
  productId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  image: string;
};
type TrackedOrder = {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  trackingNumber?: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  items: OrderItem[];
  createdAt: string;
};

const FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const ICONS: Record<string, typeof Clock> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: CheckCircle2,
};

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={null}>
      <OrderTrackingInner />
    </Suspense>
  );
}

function OrderTrackingInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryEmail = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(queryEmail);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const lookup = useCallback(
    async (withEmail: string) => {
      setLoading(true);
      setError(null);
      setTried(true);
      try {
        const url =
          `/api/orders/${id}` + (withEmail ? `?email=${encodeURIComponent(withEmail)}` : '');
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Order not found');
        setOrder(data.order);
      } catch (e) {
        setOrder(null);
        setError(e instanceof Error ? e.message : 'Order not found');
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  // Auto-lookup when email is supplied via query (e.g. confirmation email link),
  // or for logged-in owners (no email needed — API checks the session).
  useEffect(() => {
    lookup(queryEmail);
  }, [lookup, queryEmail]);

  const cancelled = order && (order.status === 'CANCELLED' || order.status === 'REFUNDED');
  const currentStep = order ? FLOW.indexOf(order.status) : -1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-2xl font-semibold mb-1">Track your order</h1>
      <p className="text-sm text-neutral-500 mb-8">Order #{id.slice(-8).toUpperCase()}</p>

      {!order && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(email);
          }}
          className="flex flex-col sm:flex-row gap-2 mb-6"
        >
          <Input
            type="email"
            placeholder="Email used on the order"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sm:max-w-xs"
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Looking up…' : 'Find order'}
          </Button>
        </form>
      )}

      {tried && error && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {error}. Check the email matches the one used at checkout.
        </div>
      )}

      {order && (
        <div className="space-y-8">
          {/* Status timeline */}
          {cancelled ? (
            <div className="flex items-center gap-3 rounded-lg border border-error/30 bg-error/5 p-4">
              <XCircle className="h-6 w-6 text-error" />
              <div>
                <p className="font-medium">Order {order.status.toLowerCase()}</p>
                <p className="text-sm text-neutral-500">
                  Payment: {order.paymentStatus.toLowerCase()}
                </p>
              </div>
            </div>
          ) : (
            <ol className="flex items-center justify-between">
              {FLOW.map((step, i) => {
                const Icon = ICONS[step] ?? Clock;
                const done = i <= currentStep;
                return (
                  <li key={step} className="flex flex-1 flex-col items-center text-center">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        done
                          ? 'bg-primary text-white dark:bg-accent dark:text-primary'
                          : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`mt-2 text-xs ${done ? 'font-medium' : 'text-neutral-400'}`}
                    >
                      {step.charAt(0) + step.slice(1).toLowerCase()}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {order.trackingNumber && (
            <div className="rounded-lg border border-border-light dark:border-border-dark p-4 text-sm">
              <span className="text-neutral-500">Tracking number: </span>
              <span className="font-medium">{order.trackingNumber}</span>
            </div>
          )}

          {/* Items */}
          <div className="rounded-lg border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="h-12 w-12 rounded object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
                    <Package className="h-5 w-5" />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.nameSnapshot}</p>
                  <p className="text-sm text-neutral-500">
                    {item.quantity} × {formatPrice(item.priceSnapshot)}
                  </p>
                </div>
                <span className="font-medium">
                  {formatPrice(item.priceSnapshot * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <Row label="Subtotal" value={formatPrice(order.subtotal)} />
            <Row
              label="Shipping"
              value={order.shippingCost === 0 ? 'Free' : formatPrice(order.shippingCost)}
            />
            <div className="flex justify-between border-t border-border-light dark:border-border-dark pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
            <p className="pt-2 text-neutral-500">
              Payment: {order.paymentMethod} · {order.paymentStatus.toLowerCase()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
