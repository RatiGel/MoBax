'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Package, CheckCircle2, Truck, Clock, XCircle, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/utils';
import { STORE_LOCATION } from '@/lib/store-location';

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
  deliveryMethod?: 'pickup' | 'instant' | 'nextday' | 'regional';
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
  const locale = useLocale();
  const isKa = locale === 'ka';
  const queryEmail = searchParams.get('email') ?? '';
  const justPaid = searchParams.get('paid') === '1';

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
      {justPaid ? (
        <div className="mb-8 flex flex-col items-center gap-3 rounded-2xl border border-success/30 bg-success/5 px-6 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-9 w-9" />
          </span>
          <h1 className="font-display font-semibold tracking-display text-2xl text-ink dark:text-white">
            {isKa ? 'შეკვეთა მიღებულია' : 'Order received'}
          </h1>
          <p className="max-w-md text-sm text-graphite">
            {isKa
              ? 'თქვენი გადახდა წარმატებით დასრულდა. შეკვეთა მუშავდება — დეტალები გამოგიგზავნით ელფოსტაზე.'
              : "Your payment went through and your order is being processed. We've emailed you the details."}
          </p>
          <p className="text-xs text-graphite">
            {isKa ? 'შეკვეთა' : 'Order'} #{id.slice(-8).toUpperCase()}
          </p>
        </div>
      ) : (
        <>
          <h1 className="font-display font-semibold tracking-display text-3xl text-ink dark:text-white mb-1">
            {isKa ? 'შეკვეთის თვალყურის დევნება' : 'Track your order'}
          </h1>
          <p className="text-sm text-graphite mb-8">
            {isKa ? 'შეკვეთა' : 'Order'} #{id.slice(-8).toUpperCase()}
          </p>
        </>
      )}

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
            className="sm:max-w-xs rounded-xl"
          />
          <Button type="submit" className="rounded-full font-semibold" disabled={loading}>
            {loading ? 'Looking up…' : 'Find order'}
          </Button>
        </form>
      )}

      {tried && error && (
        <div className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">
          {error}. Check the email matches the one used at checkout.
        </div>
      )}

      {order && (
        <div className="space-y-8">
          {/* Status timeline — hidden on the post-payment success view (the
              "Order received" hero already conveys the state); shown on the
              track-order lookup so returning buyers see progress. */}
          {!justPaid && (cancelled ? (
            <div className="flex items-center gap-3 rounded-2xl border border-error/30 bg-error/5 p-4">
              <XCircle className="h-6 w-6 text-error" />
              <div>
                <p className="font-medium text-ink dark:text-white">Order {order.status.toLowerCase()}</p>
                <p className="text-sm text-graphite">
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
                          ? 'bg-cobalt text-white'
                          : 'bg-cloud-light text-graphite dark:bg-cloud-dark'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`mt-2 text-xs ${done ? 'font-medium text-ink dark:text-white' : 'text-graphite'}`}
                    >
                      {step.charAt(0) + step.slice(1).toLowerCase()}
                    </span>
                  </li>
                );
              })}
            </ol>
          ))}

          {order.trackingNumber && (
            <div className="rounded-2xl border border-border-light dark:border-border-dark p-4 text-sm">
              <span className="text-graphite">Tracking number: </span>
              <span className="font-medium text-ink dark:text-white">{order.trackingNumber}</span>
            </div>
          )}

          {/* Store pickup — where and when to collect, plus a map to open in Maps. */}
          {order.deliveryMethod === 'pickup' && (
            <div className="overflow-hidden rounded-2xl border border-border-light dark:border-border-dark">
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-cobalt dark:text-cobalt-dark" />
                  <div>
                    <p className="font-medium text-ink dark:text-white">
                      {isKa ? 'აიღეთ ჩვენი მაღაზიიდან' : 'Pick up from our store'}
                    </p>
                    <p className="text-sm text-graphite">
                      {isKa ? STORE_LOCATION.addressKa : STORE_LOCATION.addressEn}
                    </p>
                    <p className="mt-1 text-[11px] text-error">
                      {isKa ? STORE_LOCATION.hoursKa : STORE_LOCATION.hoursEn}
                    </p>
                  </div>
                </div>
                <a
                  href={STORE_LOCATION.mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1 text-sm font-semibold text-cobalt hover:underline dark:text-cobalt-dark"
                >
                  {isKa ? 'გახსენით რუკაზე' : 'Open in Maps'}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <iframe
                title={isKa ? 'მაღაზიის მდებარეობა' : 'Store location'}
                src={STORE_LOCATION.embedSrc}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="h-64 w-full border-0"
              />
            </div>
          )}

          {/* Items */}
          <div className="rounded-2xl border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark overflow-hidden">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cloud-light dark:bg-cloud-dark text-graphite">
                    <Package className="h-5 w-5" />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-ink dark:text-white">{item.nameSnapshot}</p>
                  <p className="text-sm text-graphite">
                    {item.quantity} × {formatPrice(item.priceSnapshot)}
                  </p>
                </div>
                <span className="font-medium text-ink dark:text-white tabular-nums">
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
            <div className="flex justify-between border-t border-border-light dark:border-border-dark pt-2 text-base font-semibold text-ink dark:text-white">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </div>
            <p className="pt-2 text-graphite">
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
    <div className="flex justify-between text-graphite">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
