'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tag, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export interface AdminBrand {
  _id: string;
  name: string;
  logoUrl?: string;
}

type ListResponse = { brands: AdminBrand[]; total: number };

interface FormValues {
  name: string;
  logoUrl: string;
}

const EMPTY: FormValues = { name: '', logoUrl: '' };

export function BrandsClient() {
  const [rows, setRows] = useState<AdminBrand[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [toDelete, setToDelete] = useState<AdminBrand | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBrand | null>(null);
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
      const data = await apiFetch<ListResponse>(`/api/admin/brands${q}`);
      setRows(data.brands);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load brands');
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

  function openEdit(b: AdminBrand) {
    setEditing(b);
    setValues({ name: b.name ?? '', logoUrl: b.logoUrl ?? '' });
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await apiFetch(`/api/admin/brands/${toDelete._id}`, { method: 'DELETE' });
      toast.success(`Deleted “${toDelete.name}”`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete brand');
    } finally {
      setToDelete(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) return toast.error('Brand name is required');

    const payload = { name: values.name.trim(), logoUrl: values.logoUrl.trim() };

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/admin/brands/${editing._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Brand updated');
      } else {
        await apiFetch('/api/admin/brands', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Brand created');
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save brand');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<AdminBrand>[] = [
    {
      key: 'name',
      header: 'Brand',
      render: (b) => (
        <div className="flex items-center gap-3">
          {b.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.logoUrl}
              alt=""
              className="h-9 w-9 rounded object-contain border border-border-light dark:border-border-dark bg-white"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
              <Tag className="h-4 w-4" />
            </span>
          )}
          <span className="font-medium truncate">{b.name}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (b) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(b)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setToDelete(b)}>
            <Trash2 className="h-4 w-4 text-error" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Brands" description={`${total} brand${total === 1 ? '' : 's'}`}>
        <Button className="gap-1" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New brand
        </Button>
      </PageHeader>

      <div className="mb-4">
        <Input
          placeholder="Search brands…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(b) => b._id}
        loading={loading}
        emptyTitle="No brands found"
        emptyDescription="Create your first brand to assign to products."
        emptyAction={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New brand
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit brand' : 'New brand'}</DialogTitle>
            <DialogDescription>
              {editing ? editing.name : 'Add a brand to assign to products.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Name" required>
              <Input value={values.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Logo URL">
              <Input
                value={values.logoUrl}
                onChange={(e) => set('logoUrl', e.target.value)}
                placeholder="https://…"
              />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save changes' : 'Create brand'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete brand?"
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-error">*</span>}
      </Label>
      {children}
    </div>
  );
}
