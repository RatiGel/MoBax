'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Tag, Gift } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { apiFetch } from '@/lib/admin-fetch';
import { formatPrice } from '@/lib/utils';
import type { DiscountType } from '@/models/Discount';
import { toast } from 'sonner';

// ---------- shared helpers ----------

/** Format an ISO date string for display (date only); '—' when unset. */
function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/** Convert an ISO date string to a value for <input type="date"> (yyyy-mm-dd). */
function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
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

// ===================================================================
// Discounts
// ===================================================================

interface AdminDiscount {
  _id: string;
  code: string;
  type: DiscountType;
  value: number;
  minOrderAmount: number;
  usageLimit?: number;
  usageCount: number;
  expiresAt?: string;
  isActive: boolean;
}

type DiscountListResponse = { discounts: AdminDiscount[]; total: number };

const DISCOUNT_TYPES: { value: DiscountType; label: string }[] = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed amount' },
];

interface DiscountForm {
  code: string;
  type: DiscountType;
  value: string;
  minOrderAmount: string;
  usageLimit: string;
  expiresAt: string;
  isActive: boolean;
}

const EMPTY_DISCOUNT: DiscountForm = {
  code: '',
  type: 'percentage',
  value: '',
  minOrderAmount: '0',
  usageLimit: '',
  expiresAt: '',
  isActive: true,
};

function fromDiscount(d: AdminDiscount): DiscountForm {
  return {
    code: d.code ?? '',
    type: d.type ?? 'percentage',
    value: String(d.value ?? ''),
    minOrderAmount: String(d.minOrderAmount ?? 0),
    usageLimit: d.usageLimit != null ? String(d.usageLimit) : '',
    expiresAt: toDateInput(d.expiresAt),
    isActive: d.isActive ?? true,
  };
}

function DiscountsTab() {
  const [rows, setRows] = useState<AdminDiscount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [toDelete, setToDelete] = useState<AdminDiscount | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDiscount | null>(null);
  const [values, setValues] = useState<DiscountForm>(EMPTY_DISCOUNT);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof DiscountForm>(key: K, val: DiscountForm[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<DiscountListResponse>('/api/admin/discounts');
      setRows(data.discounts);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load discount codes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setValues(EMPTY_DISCOUNT);
    setDialogOpen(true);
  }

  function openEdit(d: AdminDiscount) {
    setEditing(d);
    setValues(fromDiscount(d));
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await apiFetch(`/api/admin/discounts/${toDelete._id}`, { method: 'DELETE' });
      toast.success(`Deleted “${toDelete.code}”`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete discount');
    } finally {
      setToDelete(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.code.trim()) return toast.error('Code is required');
    if (values.value.trim() === '') return toast.error('Value is required');

    // applicableProducts / applicableCategories are intentionally omitted —
    // the API defaults them to empty arrays. Add a picker UI in a later iteration.
    const payload: Record<string, unknown> = {
      code: values.code.trim(),
      type: values.type,
      value: Number(values.value),
      minOrderAmount: Number(values.minOrderAmount || 0),
      isActive: values.isActive,
    };
    if (values.usageLimit.trim()) payload.usageLimit = Number(values.usageLimit);
    if (values.expiresAt) payload.expiresAt = values.expiresAt;

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/admin/discounts/${editing._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Discount updated');
      } else {
        await apiFetch('/api/admin/discounts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Discount created');
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save discount');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<AdminDiscount>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (d) => (
        <div className="flex items-center gap-2 font-medium">
          <Tag className="h-4 w-4 text-neutral-400" />
          {d.code}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (d) => (
        <Badge variant="outline">{d.type === 'percentage' ? 'Percentage' : 'Fixed'}</Badge>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (d) => (d.type === 'percentage' ? `${d.value}%` : formatPrice(d.value)),
    },
    {
      key: 'minOrderAmount',
      header: 'Min order',
      render: (d) => (d.minOrderAmount ? formatPrice(d.minOrderAmount) : '—'),
    },
    {
      key: 'usage',
      header: 'Usage',
      className: 'text-neutral-500',
      render: (d) => `${d.usageCount ?? 0}/${d.usageLimit ?? '∞'}`,
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      className: 'text-neutral-500',
      render: (d) => fmtDate(d.expiresAt),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (d) => (
        <Badge variant={d.isActive ? 'default' : 'secondary'}>
          {d.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (d) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(d)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setToDelete(d)}>
            <Trash2 className="h-4 w-4 text-error" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {total} code{total === 1 ? '' : 's'}
        </p>
        <Button className="gap-1" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New code
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(d) => d._id}
        loading={loading}
        emptyTitle="No discount codes yet"
        emptyDescription="Create a code customers can apply at checkout."
        emptyAction={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New code
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit discount code' : 'New discount code'}</DialogTitle>
            <DialogDescription>
              {editing ? editing.code : 'Create a code customers can apply at checkout.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Code" required hint="Stored uppercase">
                <Input
                  value={values.code}
                  onChange={(e) => set('code', e.target.value)}
                  placeholder="SUMMER10"
                />
              </Field>
              <Field label="Type" required>
                <Select value={values.type} onValueChange={(v) => set('type', v as DiscountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Value"
                required
                hint={values.type === 'percentage' ? 'Percent off (0–100)' : 'Amount off in ₾'}
              >
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.value}
                  onChange={(e) => set('value', e.target.value)}
                />
              </Field>
              <Field label="Minimum order amount" hint="0 for no minimum">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.minOrderAmount}
                  onChange={(e) => set('minOrderAmount', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Usage limit" hint="Leave blank for unlimited">
                <Input
                  type="number"
                  min={1}
                  step="1"
                  value={values.usageLimit}
                  onChange={(e) => set('usageLimit', e.target.value)}
                  placeholder="∞"
                />
              </Field>
              <Field label="Expires at" hint="Optional">
                <Input
                  type="date"
                  value={values.expiresAt}
                  onChange={(e) => set('expiresAt', e.target.value)}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-neutral-500">Customers can apply this code</p>
              </div>
              <Switch checked={values.isActive} onCheckedChange={(v) => set('isActive', v)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save changes' : 'Create code'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete discount code?"
        description={
          toDelete
            ? `“${toDelete.code}” will be permanently removed. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ===================================================================
// Promotions
// ===================================================================

interface AdminPromotion {
  _id: string;
  name: string;
  buyProductSlug: string;
  buyQty: number;
  getProductSlug: string;
  discountPercent: number;
  isActive: boolean;
  expiresAt?: string;
}

type PromotionListResponse = { promotions: AdminPromotion[]; total: number };

interface ProductOption {
  slug: string;
  nameEn: string;
}

interface PromotionForm {
  name: string;
  buyProductSlug: string;
  buyQty: string;
  getProductSlug: string;
  discountPercent: string;
  expiresAt: string;
  isActive: boolean;
}

const EMPTY_PROMOTION: PromotionForm = {
  name: '',
  buyProductSlug: '',
  buyQty: '1',
  getProductSlug: '',
  discountPercent: '',
  expiresAt: '',
  isActive: true,
};

function fromPromotion(p: AdminPromotion): PromotionForm {
  return {
    name: p.name ?? '',
    buyProductSlug: p.buyProductSlug ?? '',
    buyQty: String(p.buyQty ?? 1),
    getProductSlug: p.getProductSlug ?? '',
    discountPercent: String(p.discountPercent ?? ''),
    expiresAt: toDateInput(p.expiresAt),
    isActive: p.isActive ?? true,
  };
}

function PromotionsTab() {
  const [rows, setRows] = useState<AdminPromotion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<ProductOption[]>([]);

  const [toDelete, setToDelete] = useState<AdminPromotion | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPromotion | null>(null);
  const [values, setValues] = useState<PromotionForm>(EMPTY_PROMOTION);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof PromotionForm>(key: K, val: PromotionForm[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<PromotionListResponse>('/api/admin/promotions');
      setRows(data.promotions);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load product options once (public products endpoint).
  useEffect(() => {
    fetch('/api/products?limit=100')
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {});
  }, []);

  // Resolve a slug to its English name for table summaries.
  function nameForSlug(slug: string): string {
    return products.find((p) => p.slug === slug)?.nameEn ?? slug;
  }

  function openCreate() {
    setEditing(null);
    setValues(EMPTY_PROMOTION);
    setDialogOpen(true);
  }

  function openEdit(p: AdminPromotion) {
    setEditing(p);
    setValues(fromPromotion(p));
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await apiFetch(`/api/admin/promotions/${toDelete._id}`, { method: 'DELETE' });
      toast.success(`Deleted “${toDelete.name}”`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete promotion');
    } finally {
      setToDelete(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) return toast.error('Name is required');
    if (!values.buyProductSlug) return toast.error('Buy product is required');
    if (!values.getProductSlug) return toast.error('Get product is required');
    if (values.discountPercent.trim() === '') return toast.error('Discount percent is required');

    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      buyProductSlug: values.buyProductSlug,
      buyQty: Number(values.buyQty || 1),
      getProductSlug: values.getProductSlug,
      discountPercent: Number(values.discountPercent),
      isActive: values.isActive,
    };
    if (values.expiresAt) payload.expiresAt = values.expiresAt;

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/admin/promotions/${editing._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Promotion updated');
      } else {
        await apiFetch('/api/admin/promotions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Promotion created');
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save promotion');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<AdminPromotion>[] = [
    {
      key: 'name',
      header: 'Promotion',
      render: (p) => (
        <div className="flex items-center gap-2 font-medium">
          <Gift className="h-4 w-4 text-neutral-400" />
          {p.name}
        </div>
      ),
    },
    {
      key: 'deal',
      header: 'Deal',
      className: 'text-neutral-500',
      render: (p) =>
        `Buy ${p.buyQty}× ${nameForSlug(p.buyProductSlug)} → get ${nameForSlug(
          p.getProductSlug
        )}`,
    },
    {
      key: 'discountPercent',
      header: 'Discount',
      render: (p) => `${p.discountPercent}%`,
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      className: 'text-neutral-500',
      render: (p) => fmtDate(p.expiresAt),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (p) => (
        <Badge variant={p.isActive ? 'default' : 'secondary'}>
          {p.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(p)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setToDelete(p)}>
            <Trash2 className="h-4 w-4 text-error" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {total} promotion{total === 1 ? '' : 's'}
        </p>
        <Button className="gap-1" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New promotion
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p._id}
        loading={loading}
        emptyTitle="No promotions yet"
        emptyDescription="Create a buy-X-get-Y bundle deal."
        emptyAction={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New promotion
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit promotion' : 'New promotion'}</DialogTitle>
            <DialogDescription>
              {editing ? editing.name : 'Create a buy-X-get-Y bundle deal.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Name" required>
              <Input
                value={values.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Buy a case, get a screen protector 50% off"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Buy product" required>
                <Select
                  value={values.buyProductSlug}
                  onValueChange={(v) => set('buyProductSlug', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.slug} value={p.slug}>
                        {p.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Buy quantity" required>
                <Input
                  type="number"
                  min={1}
                  step="1"
                  value={values.buyQty}
                  onChange={(e) => set('buyQty', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Get product" required>
                <Select
                  value={values.getProductSlug}
                  onValueChange={(v) => set('getProductSlug', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.slug} value={p.slug}>
                        {p.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Discount percent" required hint="0–100">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="1"
                  value={values.discountPercent}
                  onChange={(e) => set('discountPercent', e.target.value)}
                />
              </Field>
            </div>

            <Field label="Expires at" hint="Optional">
              <Input
                type="date"
                value={values.expiresAt}
                onChange={(e) => set('expiresAt', e.target.value)}
              />
            </Field>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-neutral-500">Applied automatically at checkout</p>
              </div>
              <Switch checked={values.isActive} onCheckedChange={(v) => set('isActive', v)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save changes' : 'Create promotion'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete promotion?"
        description={
          toDelete
            ? `“${toDelete.name}” will be permanently removed. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ===================================================================
// Page shell with tabs
// ===================================================================

export function PricingClient() {
  return (
    <div>
      <PageHeader
        title="Pricing & Promotions"
        description="Manage discount codes and bundle promotions."
      />

      <Tabs defaultValue="discounts">
        <TabsList>
          <TabsTrigger value="discounts">Discount codes</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
        </TabsList>

        <TabsContent value="discounts" className="mt-6">
          <DiscountsTab />
        </TabsContent>

        <TabsContent value="promotions" className="mt-6">
          <PromotionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
