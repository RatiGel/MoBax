'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Boxes, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface InventoryItem {
  id: string;
  nameEn: string;
  nameKa: string;
  sku: string;
  image: string | null;
  stock: number;
  lowStockThreshold: number;
  slug: string;
}

type ListResponse = {
  items: InventoryItem[];
  total: number;
  lowCount: number;
  outCount: number;
};

type FilterValue = 'all' | 'low' | 'out';

const REASONS = [
  { value: 'restock', label: 'Restock' },
  { value: 'damage', label: 'Damage' },
  { value: 'correction', label: 'Correction' },
  { value: 'return', label: 'Return' },
] as const;

function stockStatus(item: InventoryItem): 'ok' | 'low' | 'out' {
  if (item.stock <= 0) return 'out';
  if (item.stock <= item.lowStockThreshold) return 'low';
  return 'ok';
}

function StockStatusBadge({ item }: { item: InventoryItem }) {
  const status = stockStatus(item);
  if (status === 'out') {
    return <Badge variant="destructive">Out</Badge>;
  }
  if (status === 'low') {
    // Amber, not cobalt — this badge carries dark text, so the white-text
    // contrast rule (CLAUDE.md) doesn't apply, but it must still read at AA
    // against its own background in both themes.
    return (
      <Badge className="border-transparent bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
        Low
      </Badge>
    );
  }
  return <Badge variant="success">OK</Badge>;
}

export function InventoryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterValue) || 'all';

  const [filter, setFilter] = useState<FilterValue>(
    initialFilter === 'low' || initialFilter === 'out' ? initialFilter : 'all'
  );
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [lowCount, setLowCount] = useState(0);
  const [outCount, setOutCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('restock');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ filter, page: String(page), limit: '20' });
      const data = await apiFetch<ListResponse>(`/api/admin/inventory?${q}`);
      setRows(data.items);
      setTotal(data.total);
      setLowCount(data.lowCount);
      setOutCount(data.outCount);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  function changeFilter(next: FilterValue) {
    setFilter(next);
    setPage(1);
    router.replace(next === 'all' ? '/admin/inventory' : `/admin/inventory?filter=${next}`);
  }

  function openAdjust(item: InventoryItem) {
    setAdjusting(item);
    setDelta('');
    setReason('restock');
    setNote('');
  }

  const parsedDelta = Number(delta);
  const hasValidDelta = delta.trim() !== '' && Number.isInteger(parsedDelta) && parsedDelta !== 0;
  const preview = adjusting && hasValidDelta ? adjusting.stock + parsedDelta : null;

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!adjusting) return;
    if (!hasValidDelta) {
      toast.error('Enter a non-zero whole number');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/admin/inventory', {
        method: 'POST',
        body: JSON.stringify({
          productId: adjusting.id,
          delta: parsedDelta,
          reason,
          note: note.trim() || undefined,
        }),
      });
      toast.success(`Stock adjusted for ${adjusting.nameEn}`);
      setAdjusting(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<InventoryItem>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image}
              alt=""
              className="h-9 w-9 rounded object-cover border border-border-light dark:border-border-dark bg-white"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
              <Boxes className="h-4 w-4" />
            </span>
          )}
          <span className="font-medium truncate max-w-[220px]">{p.nameEn}</span>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (p) => <span className="text-neutral-500">{p.sku}</span>,
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (p) => <span className="tabular-nums font-medium">{p.stock}</span>,
    },
    {
      key: 'threshold',
      header: 'Threshold',
      render: (p) => <span className="tabular-nums text-neutral-500">{p.lowStockThreshold}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StockStatusBadge item={p} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) => (
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={() => openAdjust(p)}>
            Adjust
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Inventory" description={`${total} product${total === 1 ? '' : 's'}`} />

      <div className="mb-4">
        <Tabs value={filter} onValueChange={(v) => changeFilter(v as FilterValue)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="low">Low ({lowCount})</TabsTrigger>
            <TabsTrigger value="out">Out ({outCount})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        loading={loading}
        page={page}
        total={total}
        onPageChange={setPage}
        emptyTitle="No products found"
        emptyDescription={
          filter === 'low'
            ? 'No products are at or below their low-stock threshold.'
            : filter === 'out'
              ? 'No products are out of stock.'
              : 'No products in the catalog yet.'
        }
      />

      <Dialog open={!!adjusting} onOpenChange={(o) => !o && setAdjusting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>{adjusting?.nameEn}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjust} className="space-y-4">
            <Field label="Delta" required hint="Positive to add, negative to remove (e.g. -3)">
              <Input
                type="number"
                step="1"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="e.g. -3"
              />
            </Field>

            <Field label="Reason" required>
              <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Note" hint="Optional">
              <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </Field>

            {adjusting && (
              <p
                className={cn(
                  'text-sm rounded-md border border-border-light dark:border-border-dark px-3 py-2',
                  preview != null && preview < 0
                    ? 'text-error'
                    : 'text-neutral-600 dark:text-neutral-300'
                )}
              >
                {adjusting.stock} {hasValidDelta ? (parsedDelta > 0 ? '+' : '') : ''}
                {hasValidDelta ? parsedDelta : '±…'} ={' '}
                <span className="font-semibold">
                  {preview != null ? preview : '?'}
                </span>
                {preview != null && preview < 0 && ' — would go below zero'}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdjusting(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !hasValidDelta || (preview != null && preview < 0)}
                className="signal-fill"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save adjustment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-error">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
