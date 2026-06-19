'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, FolderTree, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { apiFetch } from '@/lib/admin-fetch';
import { toast } from 'sonner';

export interface AdminCategory {
  _id: string;
  slug: string;
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  icon: string;
  image: string;
  parentSlug?: string | null;
  isActive: boolean;
  productCount: number;
}

type ListResponse = { categories: AdminCategory[]; total: number };

const NO_PARENT = '__none__';

interface FormValues {
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  slug: string;
  image: string;
  icon: string;
  parentSlug: string;
  isActive: boolean;
}

const EMPTY: FormValues = {
  nameEn: '',
  nameKa: '',
  descriptionEn: '',
  descriptionKa: '',
  slug: '',
  image: '',
  icon: '',
  parentSlug: NO_PARENT,
  isActive: true,
};

function fromCategory(c: AdminCategory): FormValues {
  return {
    nameEn: c.nameEn ?? '',
    nameKa: c.nameKa ?? '',
    descriptionEn: c.descriptionEn ?? '',
    descriptionKa: c.descriptionKa ?? '',
    slug: c.slug ?? '',
    image: c.image ?? '',
    icon: c.icon ?? '',
    parentSlug: c.parentSlug || NO_PARENT,
    isActive: c.isActive ?? true,
  };
}

export function CategoriesClient() {
  const [rows, setRows] = useState<AdminCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);

  // Dialog state. `editing` null + open = create; editing set = edit.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
      const data = await apiFetch<ListResponse>(`/api/admin/categories${q}`);
      setRows(data.categories);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setValues(EMPTY);
    setDialogOpen(true);
  }

  function openEdit(c: AdminCategory) {
    setEditing(c);
    setValues(fromCategory(c));
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await apiFetch(`/api/admin/categories/${toDelete._id}`, { method: 'DELETE' });
      toast.success(`Deleted “${toDelete.nameEn}”`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete category');
    } finally {
      setToDelete(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.nameEn.trim()) return toast.error('English name is required');
    if (!values.nameKa.trim()) return toast.error('Georgian name is required');

    const payload: Record<string, unknown> = {
      nameEn: values.nameEn.trim(),
      nameKa: values.nameKa.trim(),
      descriptionEn: values.descriptionEn,
      descriptionKa: values.descriptionKa,
      image: values.image.trim(),
      icon: values.icon.trim(),
      parentSlug: values.parentSlug === NO_PARENT ? null : values.parentSlug,
      isActive: values.isActive,
    };
    if (values.slug.trim()) payload.slug = values.slug.trim();

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/admin/categories/${editing._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Category updated');
      } else {
        await apiFetch('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Category created');
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  // Parent options: every category except the one being edited (no self-parenting).
  const parentOptions = rows.filter((c) => c._id !== editing?._id);

  const columns: Column<AdminCategory>[] = [
    {
      key: 'nameEn',
      header: 'Category',
      render: (c) => (
        <div className="flex items-center gap-3">
          {c.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.image}
              alt=""
              className="h-9 w-9 rounded object-cover border border-border-light dark:border-border-dark"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
              <FolderTree className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{c.nameEn}</div>
            <div className="text-xs text-neutral-500 truncate">{c.nameKa}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      className: 'text-neutral-500',
      render: (c) => c.slug,
    },
    {
      key: 'productCount',
      header: 'Products',
      render: (c) => <Badge variant="outline">{c.productCount ?? 0}</Badge>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (c) => (
        <Badge variant={c.isActive ? 'default' : 'secondary'}>
          {c.isActive ? 'Active' : 'Hidden'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(c)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setToDelete(c)}>
            <Trash2 className="h-4 w-4 text-error" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Categories" description={`${total} categor${total === 1 ? 'y' : 'ies'}`}>
        <Button className="gap-1" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New category
        </Button>
      </PageHeader>

      <div className="mb-4">
        <Input
          placeholder="Search name or slug…"
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
        emptyTitle="No categories found"
        emptyDescription="Create your first category to organize your catalog."
        emptyAction={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New category
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle>
            <DialogDescription>
              {editing ? editing.nameEn : 'Add a category to organize your catalog.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name (EN)" required>
                <Input value={values.nameEn} onChange={(e) => set('nameEn', e.target.value)} />
              </Field>
              <Field label="Name (KA)" required>
                <Input value={values.nameKa} onChange={(e) => set('nameKa', e.target.value)} />
              </Field>
            </div>

            <Field label="Description (EN)">
              <Textarea
                rows={2}
                value={values.descriptionEn}
                onChange={(e) => set('descriptionEn', e.target.value)}
              />
            </Field>
            <Field label="Description (KA)">
              <Textarea
                rows={2}
                value={values.descriptionKa}
                onChange={(e) => set('descriptionKa', e.target.value)}
              />
            </Field>

            <Field
              label="Slug"
              hint={editing ? undefined : 'Optional — auto-generated from English name'}
            >
              <Input
                value={values.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder="auto"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Image URL">
                <Input
                  value={values.image}
                  onChange={(e) => set('image', e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Icon" hint="Icon name or class">
                <Input value={values.icon} onChange={(e) => set('icon', e.target.value)} />
              </Field>
            </div>

            <Field label="Parent category">
              <Select value={values.parentSlug} onValueChange={(v) => set('parentSlug', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>None (top level)</SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-neutral-500">Visible on storefront</p>
              </div>
              <Switch checked={values.isActive} onCheckedChange={(v) => set('isActive', v)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save changes' : 'Create category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete category?"
        description={
          toDelete
            ? `“${toDelete.nameEn}” will be permanently removed. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
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
