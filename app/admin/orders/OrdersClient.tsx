'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, Download } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatusBadge, PaymentBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { OrderStatus, PaymentStatus } from '@/models/Order';
import { ORDER_STATUSES } from '@/lib/validations';

export interface AdminOrder {
  _id: string;
  orderNumber: string;
  userId?: string;
  guestEmail?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: string;
}

type ListResponse = {
  orders: AdminOrder[];
  total: number;
  page: number;
  limit: number;
};

const PAGE_SIZE = 20;

const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function OrdersClient() {
  const [rows, setRows] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<'all' | OrderStatus>('all');
  const [payment, setPayment] = useState<'all' | PaymentStatus>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({
    key: 'newest',
    dir: 'desc',
  });

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, payment, from, to, sort]);

  const query = useMemo(() => {
    const p = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sort: sort.key,
      dir: sort.dir,
    });
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (status !== 'all') p.set('status', status);
    if (payment !== 'all') p.set('paymentStatus', payment);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return p.toString();
  }, [page, sort, debouncedSearch, status, payment, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ListResponse>(`/api/admin/orders?${query}`);
      setRows(data.orders);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<AdminOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      sortable: true,
      render: (o) => <span className="font-medium">{o.orderNumber}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => (
        <span className="text-neutral-600 dark:text-neutral-300">
          {o.guestEmail || o.userId || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      className: 'text-neutral-500',
      render: (o) => formatDate(o.createdAt),
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      render: (o) => formatPrice(o.total),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (o) => <PaymentBadge status={o.paymentStatus} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (o) => (
        <Button asChild variant="ghost" size="icon" title="View">
          <Link href={`/admin/orders/${o._id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  // Export honors the active filters (reuses the list query, minus pagination).
  function exportCsv() {
    const p = new URLSearchParams();
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (status !== 'all') p.set('status', status);
    if (payment !== 'all') p.set('paymentStatus', payment);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    window.open(`/api/admin/orders/export?${p.toString()}`, '_blank');
  }

  return (
    <div>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? '' : 's'}`}>
        <Button variant="outline" onClick={exportCsv} className="gap-1" disabled={total === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Search order #, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={payment} onValueChange={(v) => setPayment(v as typeof payment)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="sm:w-40"
          aria-label="From date"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="sm:w-40"
          aria-label="To date"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(o) => o._id}
        loading={loading}
        pageSize={PAGE_SIZE}
        page={page}
        total={total}
        onPageChange={setPage}
        sort={sort}
        onSortChange={setSort}
        emptyTitle="No orders found"
        emptyDescription="Try adjusting filters or date range."
      />
    </div>
  );
}
