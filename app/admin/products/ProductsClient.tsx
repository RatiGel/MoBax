'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({
    key: 'newest',
    dir: 'desc',
  });

  const [categories, setCategories] = useState<{ slug: string; nameEn: string }[]>([]);
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, category, sort]);

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
    if (status !== 'all') p.set('status', status);
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
    </div>
  );
}
