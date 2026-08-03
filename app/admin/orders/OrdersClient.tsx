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
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
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
  addressSnapshot?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    address?: string;
    city?: string;
    regionName?: string;
    idNumber?: string;
    country?: string;
    phone?: string;
  };
}

// Statuses whose bulk application restores product stock — must be called
// out in the confirmation dialog so nobody triggers it unaware.
const RESTOCKING_STATUSES: OrderStatus[] = ['CANCELLED', 'REFUNDED'];

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

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>('PROCESSING');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, payment, from, to, sort]);

  // Clear selection whenever the page, filter, or search changes — otherwise
  // a bulk action could hit rows the user can no longer see.
  useEffect(() => {
    setSelectedIds([]);
  }, [page, debouncedSearch, status, payment, from, to, sort]);

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
      render: (o) => {
        const addr = o.addressSnapshot;
        const name = [addr?.firstName, addr?.lastName].filter(Boolean).join(' ');
        const label = name || o.guestEmail || addr?.email || o.userId || '—';
        return <span className="text-neutral-600 dark:text-neutral-300">{label}</span>;
      },
    },
    {
      key: 'address',
      header: 'Shipping address',
      render: (o) => {
        const addr = o.addressSnapshot;
        if (!addr || (!addr.city && !addr.address)) {
          return <span className="text-neutral-400">—</span>;
        }
        const full = [addr.address, addr.city, addr.regionName, addr.country]
          .filter(Boolean)
          .join(', ');
        const street = addr.address ?? '';
        const truncatedStreet =
          street.length > 24 ? `${street.slice(0, 24)}…` : street;
        return (
          <span
            className="text-neutral-600 dark:text-neutral-300"
            title={full}
          >
            {addr.city ? `${addr.city} — ` : ''}
            {truncatedStreet}
          </span>
        );
      },
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

  async function applyBulkStatus() {
    const count = selectedIds.length;
    try {
      const res = await fetch('/api/admin/orders/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error);
        return;
      }
      toast.success(`Updated ${count} orders`);
      setSelectedIds([]);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update orders');
    }
  }

  const isRestocking = RESTOCKING_STATUSES.includes(bulkStatus);

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

      {/* Reserved-height slot: always present so the table below never shifts
          when the bar appears/disappears; only its contents toggle. */}
      <div className="mb-3 flex h-11 items-center gap-3 rounded-lg border border-border-light bg-neutral-50 px-3 dark:border-border-dark dark:bg-neutral-900/40">
        {selectedIds.length > 0 && (
          <>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              {selectedIds.length} order{selectedIds.length === 1 ? '' : 's'} selected
            </span>
            <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as OrderStatus)}>
              <SelectTrigger className="h-8 w-44">
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
            <Button
              size="sm"
              className="bg-[#2E5BFF] text-white hover:bg-[#2E5BFF]/90"
              onClick={() => setBulkConfirmOpen(true)}
            >
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </>
        )}
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
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(o) => o._id}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title={`Change ${selectedIds.length} order${selectedIds.length === 1 ? '' : 's'} to ${bulkStatus}?`}
        description={
          isRestocking
            ? `Setting these orders to ${bulkStatus} restores stock for every item in each order that isn't already cancelled or refunded. This cannot be undone automatically.`
            : `This updates the status for all ${selectedIds.length} selected order${selectedIds.length === 1 ? '' : 's'}.`
        }
        confirmLabel="Apply"
        destructive={isRestocking}
        onConfirm={applyBulkStatus}
      />
    </div>
  );
}
