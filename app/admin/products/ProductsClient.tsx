'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Package, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/admin-fetch';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

export interface AdminProduct {
  _id: string;
  slug: string;
  nameEn: string;
  nameKa: string;
  sku: string;
  price: number;
  stock: number;
  categorySlug: string;
  brand: string;
  isActive: boolean;
  isFeatured: boolean;
  images: string[];
  salePrice?: number;
  salePriceStart?: string | null;
  salePriceEnd?: string | null;
}

type SaleMode = 'percent' | 'fixed';

interface BulkSaleResponse {
  updated: number;
  skipped?: number;
}

/** Same rule as lib/catalog-map.ts isOnSale() — a sale must undercut price. */
function computeSalePreview(price: number, mode: SaleMode, value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (mode === 'percent' && value >= 100) return null;
  const salePrice = mode === 'percent' ? Math.round(price * (1 - value / 100) * 100) / 100 : value;
  return salePrice < price ? salePrice : null;
}

type ListResponse = {
  products: AdminProduct[];
  total: number;
  page: number;
  limit: number;
};

const PAGE_SIZE = 20;

export function ProductsClient() {
  const [rows, setRows] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'onSale'>('all');
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({
    key: 'newest',
    dir: 'desc',
  });

  const [categories, setCategories] = useState<{ slug: string; nameEn: string }[]>([]);
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [saleMode, setSaleMode] = useState<SaleMode>('percent');
  const [saleValue, setSaleValue] = useState('20');
  const [saleStartsAt, setSaleStartsAt] = useState('');
  const [saleEndsAt, setSaleEndsAt] = useState('');
  const [saleSaving, setSaleSaving] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, category, sort]);

  // Clear selection whenever the page, filter, or search changes — otherwise
  // a bulk action could hit rows the user can no longer see.
  useEffect(() => {
    setSelectedIds([]);
  }, [page, debouncedSearch, status, category, sort]);

  // Load category options once.
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sort: sort.key,
      dir: sort.dir,
    });
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (status === 'onSale') p.set('onSale', 'true');
    else if (status !== 'all') p.set('status', status);
    if (category !== 'all') p.set('category', category);
    return p.toString();
  }, [page, sort, debouncedSearch, status, category]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ListResponse>(`/api/admin/products?${query}`);
      setRows(data.products);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedRows = useMemo(
    () => rows.filter((p) => selectedIds.includes(p._id)),
    [rows, selectedIds],
  );
  const firstSelected = selectedRows[0];
  const salePreview =
    firstSelected != null
      ? computeSalePreview(firstSelected.price, saleMode, Number(saleValue))
      : null;

  function openSaleDialog() {
    setSaleMode('percent');
    setSaleValue('20');
    setSaleStartsAt('');
    setSaleEndsAt('');
    setSaleDialogOpen(true);
  }

  async function handleSetSale(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(saleValue);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid sale value');
      return;
    }
    if (saleMode === 'percent' && value >= 100) {
      toast.error('Percent must be below 100');
      return;
    }
    setSaleSaving(true);
    try {
      const data = await apiFetch<BulkSaleResponse>('/api/admin/products', {
        method: 'PATCH',
        body: JSON.stringify({
          ids: selectedIds,
          action: 'setSale',
          mode: saleMode,
          value,
          startsAt: saleStartsAt || undefined,
          endsAt: saleEndsAt || undefined,
        }),
      });
      const skipped = data.skipped ?? 0;
      if (skipped > 0) {
        toast.warning(
          `${data.updated} updated, ${skipped} skipped — the sale price was not below the current price`,
        );
      } else {
        toast.success(`${data.updated} product${data.updated === 1 ? '' : 's'} updated`);
      }
      setSaleDialogOpen(false);
      setSelectedIds([]);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set sale price');
    } finally {
      setSaleSaving(false);
    }
  }

  async function handleClearSale() {
    try {
      const data = await apiFetch<BulkSaleResponse>('/api/admin/products', {
        method: 'PATCH',
        body: JSON.stringify({ ids: selectedIds, action: 'clearSale' }),
      });
      toast.success(`Cleared sale on ${data.updated} product${data.updated === 1 ? '' : 's'}`);
      setSelectedIds([]);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to clear sale');
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await apiFetch(`/api/admin/products/${toDelete._id}`, { method: 'DELETE' });
      toast.success(`Archived “${toDelete.nameEn}”`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to archive product');
    } finally {
      setToDelete(null);
    }
  }

  const columns: Column<AdminProduct>[] = [
    {
      key: 'nameEn',
      header: 'Product',
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.images[0]}
              alt=""
              className="h-9 w-9 rounded object-cover border border-border-light dark:border-border-dark"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
              <Package className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{p.nameEn}</div>
            <div className="text-xs text-neutral-500 truncate">{p.brand}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      className: 'text-neutral-500',
      render: (p) => p.sku,
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      render: (p) => formatPrice(p.price),
    },
    {
      key: 'stock',
      header: 'Stock',
      sortable: true,
      render: (p) => (
        <Badge variant={p.stock === 0 ? 'destructive' : p.stock <= 10 ? 'secondary' : 'outline'}>
          {p.stock === 0 ? 'Out' : p.stock}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (p) => (
        <Badge variant={p.isActive ? 'default' : 'secondary'}>
          {p.isActive ? 'Active' : 'Archived'}
        </Badge>
      ),
    },
    {
      key: 'sale',
      header: 'Sale',
      render: (p) => {
        if (typeof p.salePrice !== 'number') {
          return <span className="text-neutral-400">—</span>;
        }
        const pct = p.price > 0 ? Math.round(((p.price - p.salePrice) / p.price) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{formatPrice(p.salePrice)}</span>
            <Badge className="signal-fill tabular-nums">-{pct}%</Badge>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon" title="Edit">
            <Link href={`/admin/products/${p._id}`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Archive"
            onClick={() => setToDelete(p)}
          >
            <Trash2 className="h-4 w-4 text-error" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Products" description={`${total} product${total === 1 ? '' : 's'}`}>
        <Button asChild className="gap-1">
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" /> New product
          </Link>
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search name, SKU, brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Archived</SelectItem>
            <SelectItem value="onSale">On sale</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reserved-height slot: always present so the table below never shifts
          when the bar appears/disappears; only its contents toggle. */}
      <div className="mb-3 flex h-11 items-center gap-3 rounded-lg border border-border-light bg-neutral-50 px-3 dark:border-border-dark dark:bg-neutral-900/40">
        {selectedIds.length > 0 && (
          <>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              {selectedIds.length} product{selectedIds.length === 1 ? '' : 's'} selected
            </span>
            <Button
              size="sm"
              className="signal-fill"
              onClick={openSaleDialog}
            >
              Set sale
            </Button>
            <Button size="sm" variant="outline" onClick={handleClearSale}>
              Clear sale
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
              Clear selection
            </Button>
          </>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p._id}
        loading={loading}
        pageSize={PAGE_SIZE}
        page={page}
        total={total}
        onPageChange={setPage}
        sort={sort}
        onSortChange={setSort}
        emptyTitle="No products found"
        emptyDescription="Try adjusting filters, or create your first product."
        emptyAction={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4" /> New product
            </Link>
          </Button>
        }
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(p) => p._id}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Archive product?"
        description={
          toDelete
            ? `“${toDelete.nameEn}” will be hidden from the storefront. You can reactivate it later.`
            : undefined
        }
        confirmLabel="Archive"
        destructive
        onConfirm={handleDelete}
      />

      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set sale price</DialogTitle>
            <DialogDescription>
              Applies to {selectedIds.length} selected product{selectedIds.length === 1 ? '' : 's'}.
              Products already selling below the computed sale price are skipped.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSetSale} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={saleMode} onValueChange={(v) => setSaleMode(v as SaleMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent off (%)</SelectItem>
                    <SelectItem value="fixed">Fixed sale price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{saleMode === 'percent' ? 'Percent off' : 'Sale price'}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={saleValue}
                  onChange={(e) => setSaleValue(e.target.value)}
                />
                <p className="text-xs text-neutral-500">
                  {saleMode === 'percent' ? 'Below 100' : 'In GEL, below the current price'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Starts at</Label>
                <Input
                  type="date"
                  value={saleStartsAt}
                  onChange={(e) => setSaleStartsAt(e.target.value)}
                />
                <p className="text-xs text-neutral-500">Optional — blank starts immediately</p>
              </div>
              <div className="space-y-1.5">
                <Label>Ends at</Label>
                <Input
                  type="date"
                  value={saleEndsAt}
                  onChange={(e) => setSaleEndsAt(e.target.value)}
                />
                <p className="text-xs text-neutral-500">Optional — blank never expires</p>
              </div>
            </div>

            {firstSelected && (
              <div className="rounded-lg border border-border-light dark:border-border-dark p-3 text-sm">
                <p className="text-neutral-500">Preview for “{firstSelected.nameEn}”</p>
                <p className="mt-1 font-medium">
                  {formatPrice(firstSelected.price)} →{' '}
                  {salePreview != null ? (
                    <span className="font-semibold tabular-nums text-amber-ink">{formatPrice(salePreview)}</span>
                  ) : (
                    <span className="text-error">not below current price</span>
                  )}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saleSaving}>
                {saleSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Apply sale
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
