'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageOff, Trash2, Loader2, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
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
import { toast } from 'sonner';

// Mirrors models/Media.ts MEDIA_FOLDERS/MediaFolder. Kept as a plain literal
// union here (not imported from the model) because that file pulls in
// mongoose — fine in API routes, but importing it from a 'use client'
// component drags the Node-only mongodb driver into the browser bundle and
// breaks webpack module resolution (net/fs/tls/etc. "module not found").
const MEDIA_FOLDERS = ['products', 'categories', 'services', 'content', 'theme'] as const;
type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export interface AdminMedia {
  _id: string;
  url: string;
  publicId: string;
  folder: MediaFolder;
  width: number;
  height: number;
  bytes: number;
  format: string;
  alt: string;
  createdAt: string;
}

type ListResponse = { items: AdminMedia[]; total: number };

const PAGE_SIZE = 24;

function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function MediaClient() {
  const [rows, setRows] = useState<AdminMedia[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [folder, setFolder] = useState<'all' | MediaFolder>('all');

  const [toDelete, setToDelete] = useState<AdminMedia | null>(null);
  const [usageCount, setUsageCount] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [altDraft, setAltDraft] = useState('');
  const [savingAlt, setSavingAlt] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, folder]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (folder !== 'all') params.set('folder', folder);

      const data = await apiFetch<ListResponse>(`/api/admin/media?${params.toString()}`);
      setRows(data.items);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, folder]);

  useEffect(() => {
    load();
  }, [load]);

  function requestDelete(item: AdminMedia) {
    setUsageCount(null);
    setToDelete(item);
  }

  // Thrown errors are swallowed by ConfirmDialog's handleConfirm (it only
  // resets its loading flag in `finally`), which is exactly what we want on
  // a 409: throwing keeps the dialog open so the "in use" message + "Delete
  // anyway" label can render, instead of the dialog closing as if it succeeded.
  async function performDelete(force: boolean) {
    if (!toDelete) return;
    const url = `/api/admin/media/${toDelete._id}${force ? '?force=true' : ''}`;
    const res = await fetch(url, { method: 'DELETE' });
    const body = await res.json().catch(() => null);

    if (res.status === 409) {
      const match = typeof body?.error === 'string' ? body.error.match(/In use by (\d+)/) : null;
      setUsageCount(match ? Number(match[1]) : 0);
      throw new Error(body?.error || 'In use');
    }
    if (!res.ok || !body?.success) {
      const message = body?.error || `Request failed (${res.status})`;
      toast.error(message);
      throw new Error(message);
    }

    toast.success('Image deleted');
    setToDelete(null);
    setUsageCount(null);
    load();
  }

  function startEditAlt(item: AdminMedia) {
    setEditingId(item._id);
    setAltDraft(item.alt ?? '');
  }

  function cancelEditAlt() {
    setEditingId(null);
    setAltDraft('');
  }

  async function saveAlt(item: AdminMedia) {
    setSavingAlt(true);
    try {
      await apiFetch(`/api/admin/media/${item._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ alt: altDraft }),
      });
      setRows((prev) => prev.map((r) => (r._id === item._id ? { ...r, alt: altDraft.trim() } : r)));
      setEditingId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update alt text');
    } finally {
      setSavingAlt(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Media" description={`${total} image${total === 1 ? '' : 's'}`} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search alt text or public ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={folder} onValueChange={(v) => setFolder(v as 'all' | MediaFolder)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All folders</SelectItem>
            {MEDIA_FOLDERS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title="No images found"
          description="Images you upload from Products, Categories, Services, Content, or Theme will show up here."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {rows.map((item) => (
              <div
                key={item._id}
                className="group relative flex flex-col overflow-hidden rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark"
              >
                <div className="relative aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.alt || ''}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <Badge
                    variant="secondary"
                    className="absolute left-1.5 top-1.5 capitalize shadow-sm"
                  >
                    {item.folder}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => requestDelete(item)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label="Delete image"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {item.width} × {item.height} · {formatBytes(item.bytes)}
                  </p>

                  {editingId === item._id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        autoFocus
                        value={altDraft}
                        onChange={(e) => setAltDraft(e.target.value)}
                        placeholder="Alt text…"
                        className="h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveAlt(item);
                          if (e.key === 'Escape') cancelEditAlt();
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => saveAlt(item)}
                        disabled={savingAlt}
                        aria-label="Save alt text"
                      >
                        {savingAlt ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={cancelEditAlt}
                        aria-label="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditAlt(item)}
                      className="truncate rounded px-1 py-0.5 text-left text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      title="Click to edit alt text"
                    >
                      {item.alt || <span className="italic text-neutral-400">Add alt text…</span>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {total > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-neutral-500">
                {total} item{total === 1 ? '' : 's'} · page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => {
          if (!o) {
            setToDelete(null);
            setUsageCount(null);
          }
        }}
        title="Delete image?"
        description={
          usageCount !== null
            ? usageCount > 0
              ? `This image is in use by ${usageCount} item${usageCount === 1 ? '' : 's'}. Delete anyway? This cannot be undone.`
              : 'This image will be permanently removed. This cannot be undone.'
            : 'This image will be permanently removed. This cannot be undone.'
        }
        confirmLabel={usageCount !== null && usageCount > 0 ? 'Delete anyway' : 'Delete'}
        destructive
        onConfirm={() => performDelete(usageCount !== null && usageCount > 0)}
      />
    </div>
  );
}
