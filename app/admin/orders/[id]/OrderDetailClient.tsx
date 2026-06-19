'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Package } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge, PaymentBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/admin-fetch';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import type { OrderStatus, PaymentStatus, IOrderItem } from '@/models/Order';
import { ORDER_STATUSES } from '@/lib/validations';

interface AdminOrderDetail {
  _id: string;
  orderNumber: string;
  userId?: string;
  guestEmail?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  trackingNumber?: string;
  notes?: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  addressSnapshot: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    zipCode: string;
    country: string;
    phone: string;
  };
  items: IOrderItem[];
  createdAt: string;
  updatedAt: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderDetailClient({ id }: { id: string }) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<OrderStatus>('PENDING');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch<AdminOrderDetail>(`/api/admin/orders/${id}`);
        if (!active) return;
        setOrder(data);
        setStatus(data.status);
        setTrackingNumber(data.trackingNumber ?? '');
        setNotes(data.notes ?? '');
      } catch (e) {
        if (active) toast.error(e instanceof Error ? e.message : 'Failed to load order');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await apiFetch<AdminOrderDetail>(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          trackingNumber: trackingNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      setOrder(updated);
      setStatus(updated.status);
      setTrackingNumber(updated.trackingNumber ?? '');
      setNotes(updated.notes ?? '');
      toast.success('Order updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update order');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <Button asChild variant="ghost" className="gap-1 mb-4">
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" /> Back to orders
          </Link>
        </Button>
        <p className="text-neutral-500">Order not found.</p>
      </div>
    );
  }

  const addr = order.addressSnapshot;

  return (
    <div>
      <Button asChild variant="ghost" className="gap-1 mb-4">
        <Link href="/admin/orders">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
      </Button>

      <PageHeader
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.createdAt)}`}
      >
        <StatusBadge status={order.status} />
        <PaymentBadge status={order.paymentStatus} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item, i) => (
                <div key={`${item.productId}-${i}`} className="flex items-center gap-3">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      className="h-12 w-12 rounded object-cover border border-border-light dark:border-border-dark"
                    />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
                      <Package className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{item.nameSnapshot}</div>
                    <div className="text-xs text-neutral-500">
                      {formatPrice(item.priceSnapshot)} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-medium whitespace-nowrap">
                    {formatPrice(item.priceSnapshot * item.quantity)}
                  </div>
                </div>
              ))}

              <div className="border-t border-border-light dark:border-border-dark pt-4 space-y-1 text-sm">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
                  <span>Shipping</span>
                  <span>{formatPrice(order.shippingCost)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer + address */}
          <Card>
            <CardHeader>
              <CardTitle>Customer &amp; shipping</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-400 mb-1">
                  Customer
                </div>
                <div className="font-medium">
                  {addr.firstName} {addr.lastName}
                </div>
                {order.guestEmail && (
                  <div className="text-neutral-500">{order.guestEmail}</div>
                )}
                {order.userId && (
                  <div className="text-neutral-500">User: {order.userId}</div>
                )}
                <div className="text-neutral-500">{addr.phone}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-400 mb-1">
                  Address
                </div>
                <div className="text-neutral-600 dark:text-neutral-300">
                  {addr.address}
                  <br />
                  {addr.city}, {addr.zipCode}
                  <br />
                  {addr.country}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-400 mb-1">
                  Payment method
                </div>
                <div className="text-neutral-600 dark:text-neutral-300">
                  {order.paymentMethod}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status-change form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Update order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="order-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                  <SelectTrigger id="order-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tracking">Tracking number</Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. GE123456789"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Internal notes about this order…"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full gap-1">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </Button>

              <p className="text-xs text-neutral-400">
                Cancelling or refunding restores product stock automatically.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
