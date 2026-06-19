'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, Check, X, Trash2, BadgeCheck } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch } from '@/lib/admin-fetch';
import { toast } from 'sonner';

interface AdminReview {
  _id: string;
  productSlug: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

type ListResponse = {
  reviews: AdminReview[];
  total: number;
  page: number;
  limit: number;
};

type StatusFilter = 'pending' | 'approved' | 'all';

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${value} / 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={
            i < value ? 'h-3.5 w-3.5 fill-accent text-accent' : 'h-3.5 w-3.5 text-neutral-300'
          }
        />
      ))}
    </span>
  );
}

export function ReviewsClient() {
  const [rows, setRows] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [toDelete, setToDelete] = useState<AdminReview | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const query = useMemo(() => {
    const p = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      status,
    });
    if (debouncedSearch) p.set('search', debouncedSearch);
    return p.toString();
  }, [page, status, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ListResponse>(`/api/admin/reviews?${query}`);
      setRows(data.reviews);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  async function setApproved(id: string, isApproved: boolean) {
    try {
      await apiFetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isApproved }),
      });
      toast.success(isApproved ? 'Review approved' : 'Review rejected');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update review');
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await apiFetch(`/api/admin/reviews/${toDelete._id}`, { method: 'DELETE' });
      toast.success('Review deleted');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete review');
    }
  }

  const columns: Column<AdminReview>[] = [
    {
      key: 'productSlug',
      header: 'Product',
      render: (r) => <span className="font-medium">{r.productSlug}</span>,
    },
    {
      key: 'userName',
      header: 'User',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
          {r.userName}
          {r.isVerifiedPurchase && (
            <BadgeCheck className="h-3.5 w-3.5 text-success" aria-label="Verified purchase" />
          )}
        </span>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (r) => <Stars value={r.rating} />,
    },
    {
      key: 'title',
      header: 'Review',
      render: (r) => (
        <div className="max-w-xs">
          <p className="font-medium truncate">{r.title}</p>
          <p className="text-xs text-neutral-500 line-clamp-2">{r.body}</p>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      className: 'text-neutral-500',
      render: (r) => formatDate(r.createdAt),
    },
    {
      key: 'isApproved',
      header: 'Status',
      render: (r) =>
        r.isApproved ? (
          <Badge variant="success">Approved</Badge>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          {!r.isApproved ? (
            <Button
              variant="ghost"
              size="icon"
              title="Approve"
              onClick={() => setApproved(r._id, true)}
            >
              <Check className="h-4 w-4 text-success" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              title="Reject (unpublish)"
              onClick={() => setApproved(r._id, false)}
            >
              <X className="h-4 w-4 text-neutral-500" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            title="Delete"
            onClick={() => setToDelete(r)}
          >
            <Trash2 className="h-4 w-4 text-error" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Reviews" description={`${total} review${total === 1 ? '' : 's'}`} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search product, user, text…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r._id}
        loading={loading}
        pageSize={PAGE_SIZE}
        page={page}
        total={total}
        onPageChange={setPage}
        emptyTitle="No reviews found"
        emptyDescription="Reviews submitted by customers will appear here."
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete review?"
        description="This permanently removes the review and recomputes the product rating."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
