import { Package } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export type OrderSummaryItem = {
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  image: string;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-graphite">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function OrderSummary({
  items,
  subtotal,
  shippingCost,
  total,
  paymentMethod,
  paymentStatus,
}: {
  items: OrderSummaryItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
}) {
  return (
    <div className="space-y-8">
      <div className="divide-y divide-border-light overflow-hidden rounded-2xl border border-border-light dark:divide-border-dark dark:border-border-dark">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cloud-light text-graphite dark:bg-cloud-dark">
                <Package className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink dark:text-white">{item.nameSnapshot}</p>
              <p className="text-sm text-graphite">
                {item.quantity} × {formatPrice(item.priceSnapshot)}
              </p>
            </div>
            <span className="font-medium tabular-nums text-ink dark:text-white">
              {formatPrice(item.priceSnapshot * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-1 text-sm">
        <Row label="Subtotal" value={formatPrice(subtotal)} />
        <Row label="Shipping" value={shippingCost === 0 ? 'Free' : formatPrice(shippingCost)} />
        <div className="flex justify-between border-t border-border-light pt-2 text-base font-semibold text-ink dark:border-border-dark dark:text-white">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(total)}</span>
        </div>
        <p className="pt-2 text-graphite">
          Payment: {paymentMethod} · {paymentStatus.toLowerCase()}
        </p>
      </div>
    </div>
  );
}
