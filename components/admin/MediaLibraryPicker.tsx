'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/admin-fetch';
import { EmptyState } from '@/components/admin/EmptyState';
import { toast } from 'sonner';
// MEDIA_FOLDERS/MediaFolder live in lib/media-folders.ts (a mongoose-free
// module) specifically so client components like this one can import them.
import { MEDIA_FOLDERS, type MediaFolder } from '@/lib/media-folders';

interface LibraryMedia {
  _id: string;
  url: string;
  folder: MediaFolder;
  width: number;
  height: number;
  alt: string;
}

type ListResponse = { items: LibraryMedia[]; total: number };

const PAGE_SIZE = 12;

/**
 * Compact paginated grid over /api/admin/media, used inside the Upload /
 * Library tabs of both ImageUploader and SingleImageUploader. Selecting an
 * image calls `onSelect(url)` — callers feed that straight into the SAME
 * onChange the upload path uses, so no new asset/Media document is created.
 */
export function MediaLibraryPicker({
  defaultFolder,
  onSelect,
}: {
  defaultFolder?: MediaFolder;
  onSelect: (url: string) => void;
}) {
  const [rows, setRows] = useState<LibraryMedia[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [folder, setFolder] = useState<'all' | MediaFolder>(defaultFolder ?? 'all');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

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
      toast.error(e instanceof Error ? e.message : 'Failed to load media library');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, folder]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search alt text or public ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs sm:max-w-[220px]"
        />
        <Select value={folder} onValueChange={(v) => setFolder(v as 'all' | MediaFolder)}>
          <SelectTrigger className="h-8 text-xs sm:w-36">
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
        <div className="flex items-center justify-center py-10 text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title="No images found"
          description="Upload an image first, or adjust your search."
        />
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {rows.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => onSelect(item.url)}
              title={item.alt || item.url}
              className="group relative aspect-square overflow-hidden rounded border border-border-light dark:border-border-dark transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.alt || ''} className="h-full w-full object-cover" />
              <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
            </button>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>
            {total} item{total === 1 ? '' : 's'} · page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
