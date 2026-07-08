'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Wrench, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SingleImageUploader } from '@/components/admin/SingleImageUploader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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

// Client-side shape mirroring IService (Mongoose Documents can't cross the server/client boundary).
export interface ServiceRow {
  _id: string;
  titleEn: string;
  titleKa: string;
  descriptionEn: string;
  descriptionKa: string;
  image: string;
  order: number;
  isActive: boolean;
}

interface PageContent {
  headingEn: string;
  headingKa: string;
  introEn: string;
  introKa: string;
  mapEmbedUrl: string;
  addressEn: string;
  addressKa: string;
}

interface FormValues {
  titleEn: string;
  titleKa: string;
  descriptionEn: string;
  descriptionKa: string;
  image: string;
  order: number;
  isActive: boolean;
}

const EMPTY_FORM: FormValues = {
  titleEn: '',
  titleKa: '',
  descriptionEn: '',
  descriptionKa: '',
  image: '',
  order: 0,
  isActive: true,
};

const EMPTY_PAGE: PageContent = {
  headingEn: '',
  headingKa: '',
  introEn: '',
  introKa: '',
  mapEmbedUrl: '',
  addressEn: '',
  addressKa: '',
};

function fromService(s: ServiceRow): FormValues {
  return {
    titleEn: s.titleEn ?? '',
    titleKa: s.titleKa ?? '',
    descriptionEn: s.descriptionEn ?? '',
    descriptionKa: s.descriptionKa ?? '',
    image: s.image ?? '',
    order: s.order ?? 0,
    isActive: s.isActive ?? true,
  };
}

export function ServicesClient() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Page content form.
  const [page, setPage] = useState<PageContent>(EMPTY_PAGE);
  const [pageLoading, setPageLoading] = useState(true);
  const [savingPage, setSavingPage] = useState(false);

  const [toDelete, setToDelete] = useState<ServiceRow | null>(null);

  // Dialog state. `editing` null + open = create; editing set = edit.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function setPageField<K extends keyof PageContent>(key: K, val: PageContent[K]) {
    setPage((p) => ({ ...p, [key]: val }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ services: ServiceRow[] }>('/api/admin/services');
      setServices(data.services);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPage = useCallback(async () => {
    setPageLoading(true);
    try {
      const data = await apiFetch<PageContent>('/api/admin/service-page');
      setPage({ ...EMPTY_PAGE, ...data });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load page content');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadPage();
  }, [load, loadPage]);

  function openCreate() {
    setEditing(null);
    setValues({ ...EMPTY_FORM, order: services.length });
    setDialogOpen(true);
  }

  function openEdit(s: ServiceRow) {
    setEditing(s);
    setValues(fromService(s));
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await apiFetch(`/api/admin/services/${toDelete._id}`, { method: 'DELETE' });
      toast.success(`Deleted "${toDelete.titleEn}"`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete service');
    } finally {
      setToDelete(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.titleEn.trim()) return toast.error('English title is required');
    if (!values.titleKa.trim()) return toast.error('Georgian title is required');

    const payload = {
      titleEn: values.titleEn.trim(),
      titleKa: values.titleKa.trim(),
      descriptionEn: values.descriptionEn,
      descriptionKa: values.descriptionKa,
      image: values.image.trim(),
      order: values.order,
      isActive: values.isActive,
    };

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/admin/services/${editing._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Service updated');
      } else {
        await apiFetch('/api/admin/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Service created');
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save service');
    } finally {
      setSaving(false);
    }
  }

  async function savePage() {
    setSavingPage(true);
    try {
      await apiFetch('/api/admin/service-page', {
        method: 'PUT',
        body: JSON.stringify(page),
      });
      toast.success('Page content saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save page content');
    } finally {
      setSavingPage(false);
    }
  }

  const columns: Column<ServiceRow>[] = [
    {
      key: 'titleEn',
      header: 'Service',
      render: (s) => (
        <div className="flex items-center gap-3">
          {s.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.image}
              alt=""
              className="h-9 w-9 rounded object-cover border border-border-light dark:border-border-dark"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
              <Wrench className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{s.titleEn}</div>
            <div className="text-xs text-neutral-500 truncate">{s.titleKa}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      className: 'text-neutral-500',
      render: (s) => s.order,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (s) => (
        <Badge variant={s.isActive ? 'default' : 'secondary'}>
          {s.isActive ? 'Active' : 'Hidden'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(s)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setToDelete(s)}>
            <Trash2 className="h-4 w-4 text-error" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Services" description={`${services.length} service${services.length === 1 ? '' : 's'}`}>
        <Button className="gap-1" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New service
        </Button>
      </PageHeader>

      {/* Page content */}
      <section className="mb-8 space-y-4 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-primary dark:text-white">Page content</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Heading, intro copy, and location shown on the storefront services page.
          </p>
        </div>

        {pageLoading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Heading (EN)">
                <Input value={page.headingEn} onChange={(e) => setPageField('headingEn', e.target.value)} />
              </Field>
              <Field label="Heading (KA)">
                <Input value={page.headingKa} onChange={(e) => setPageField('headingKa', e.target.value)} />
              </Field>
              <Field label="Intro (EN)">
                <Textarea rows={3} value={page.introEn} onChange={(e) => setPageField('introEn', e.target.value)} />
              </Field>
              <Field label="Intro (KA)">
                <Textarea rows={3} value={page.introKa} onChange={(e) => setPageField('introKa', e.target.value)} />
              </Field>
              <Field label="Map embed URL" hint="Must start with https://www.google.com/maps/embed">
                <Input
                  value={page.mapEmbedUrl}
                  onChange={(e) => setPageField('mapEmbedUrl', e.target.value)}
                  placeholder="https://www.google.com/maps/embed?..."
                />
              </Field>
              <div />
              <Field label="Address (EN)">
                <Input value={page.addressEn} onChange={(e) => setPageField('addressEn', e.target.value)} />
              </Field>
              <Field label="Address (KA)">
                <Input value={page.addressKa} onChange={(e) => setPageField('addressKa', e.target.value)} />
              </Field>
            </div>
            <Button onClick={savePage} disabled={savingPage}>
              {savingPage && <Loader2 className="h-4 w-4 animate-spin" />}
              Save page content
            </Button>
          </>
        )}
      </section>

      {/* Services list */}
      <DataTable
        columns={columns}
        rows={services}
        rowKey={(s) => s._id}
        loading={loading}
        emptyTitle="No services found"
        emptyDescription="Add your first service to show it on the storefront."
        emptyAction={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New service
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit service' : 'New service'}</DialogTitle>
            <DialogDescription>
              {editing ? editing.titleEn : 'Add a service to the storefront services page.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Title (EN)" required>
                <Input value={values.titleEn} onChange={(e) => set('titleEn', e.target.value)} />
              </Field>
              <Field label="Title (KA)" required>
                <Input value={values.titleKa} onChange={(e) => set('titleKa', e.target.value)} />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Image">
                <div className="space-y-2">
                  <SingleImageUploader value={values.image} onChange={(url) => set('image', url)} />
                  <Input
                    value={values.image}
                    onChange={(e) => set('image', e.target.value)}
                    placeholder="or paste an image URL"
                  />
                </div>
              </Field>
              <Field label="Order" hint="Lower numbers appear first">
                <Input
                  type="number"
                  value={values.order}
                  onChange={(e) => set('order', Number(e.target.value))}
                />
              </Field>
            </div>

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
                {editing ? 'Save changes' : 'Create service'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete service?"
        description={
          toDelete
            ? `"${toDelete.titleEn}" will be permanently removed. This cannot be undone.`
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
