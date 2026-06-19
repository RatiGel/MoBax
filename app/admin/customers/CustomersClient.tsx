'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Eye } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/admin-fetch';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

interface AdminCustomer {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  isBlocked: boolean;
  image?: string;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

interface CustomerOrder {
  _id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

interface CustomerDetail {
  customer: AdminCustomer;
  orders: CustomerOrder[];
  orderCount: number;
  totalSpent: number;
}

type ListResponse = {
  customers: AdminCustomer[];
  total: number;
  page: number;
  limit: number;
};

const PAGE_SIZE = 20;

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function CustomersClient() {
  const [rows, setRows] = useState<AdminCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [blockSaving, setBlockSaving] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever the search changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (debouncedSearch) p.set('search', debouncedSearch);
    return p.toString();
  }, [page, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ListResponse>(`/api/admin/customers?${query}`);
      setRows(data.customers);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await apiFetch<CustomerDetail>(`/api/admin/customers/${id}`);
      setDetail(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load customer');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  function openDetail(id: string) {
    setSelectedId(id);
    loadDetail(id);
  }

  async function toggleBlocked(next: boolean) {
    if (!detail) return;
    setBlockSaving(true);
    try {
      const updated = await apiFetch<AdminCustomer>(
        `/api/admin/customers/${detail.customer._id}`,
        { method: 'PATCH', body: JSON.stringify({ isBlocked: next }) }
      );
      setDetail((d) => (d ? { ...d, customer: { ...d.customer, isBlocked: updated.isBlocked } } : d));
      setRows((prev) =>
        prev.map((r) => (r._id === updated._id ? { ...r, isBlocked: updated.isBlocked } : r))
      );
      toast.success(next ? 'Customer blocked' : 'Customer unblocked');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update customer');
    } finally {
      setBlockSaving(false);
    }
  }

  const columns: Column<AdminCustomer>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (c) => (
        <div className="min-w-0">
          <div className="font-medium truncate">
            {c.firstName} {c.lastName}
          </div>
          <div className="text-xs text-neutral-500 truncate">{c.email}</div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      className: 'text-neutral-500',
      render: (c) => formatDate(c.createdAt),
    },
    {
      key: 'orderCount',
      header: 'Orders',
      render: (c) => c.orderCount,
    },
    {
      key: 'totalSpent',
      header: 'Total spent',
      render: (c) => formatPrice(c.totalSpent),
    },
    {
      key: 'isBlocked',
      header: 'Status',
      render: (c) => (
        <Badge variant={c.isBlocked ? 'destructive' : 'success'}>
          {c.isBlocked ? 'Blocked' : 'Active'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => openDetail(c._id)}>
          <Eye className="h-4 w-4" /> View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${total} customer${total === 1 ? '' : 's'}`}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c._id}
        loading={loading}
        pageSize={PAGE_SIZE}
        page={page}
        total={total}
        onPageChange={setPage}
        emptyTitle="No customers found"
        emptyDescription="Customers will appear here once they register."
      />

      <Dialog
        open={!!selectedId}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedId(null);
            setDetail(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {detail ? `${detail.customer.firstName} ${detail.customer.lastName}` : 'Customer'}
            </DialogTitle>
            <DialogDescription>{detail?.customer.email}</DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="py-8 text-center text-sm text-neutral-500">Loading…</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md border border-border-light dark:border-border-dark p-3">
                  <div className="text-xs text-neutral-500">Joined</div>
                  <div className="font-medium">{formatDate(detail.customer.createdAt)}</div>
                </div>
                <div className="rounded-md border border-border-light dark:border-border-dark p-3">
                  <div className="text-xs text-neutral-500">Orders</div>
                  <div className="font-medium">{detail.orderCount}</div>
                </div>
                <div className="rounded-md border border-border-light dark:border-border-dark p-3">
                  <div className="text-xs text-neutral-500">Total spent</div>
                  <div className="font-medium">{formatPrice(detail.totalSpent)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border-light dark:border-border-dark p-3">
                <div>
                  <div className="text-sm font-medium">
                    {detail.customer.isBlocked ? 'Blocked' : 'Active'}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {detail.customer.isBlocked
                      ? 'This customer cannot sign in.'
                      : 'Toggle to block this customer from signing in.'}
                  </div>
                </div>
                <Switch
                  checked={detail.customer.isBlocked}
                  onCheckedChange={toggleBlocked}
                  disabled={blockSaving}
                  aria-label="Block customer"
                />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Recent orders</h3>
                {detail.orders.length === 0 ? (
                  <p className="text-sm text-neutral-500">No orders yet.</p>
                ) : (
                  <ul className="divide-y divide-border-light dark:divide-border-dark rounded-md border border-border-light dark:border-border-dark">
                    {detail.orders.map((o) => (
                      <li key={o._id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{o.orderNumber}</div>
                          <div className="text-xs text-neutral-500">{formatDate(o.createdAt)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{o.status}</Badge>
                          <span className="font-medium">{formatPrice(o.total)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
