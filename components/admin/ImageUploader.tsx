'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Star, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

interface UploadResult {
  url: string;
  publicId: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  async function uploadOne(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });

    let body: { success: boolean; data: UploadResult | null; error: string | null };
    try {
      body = await res.json();
    } catch {
      throw new Error(`Upload failed (${res.status})`);
    }
    if (!res.ok || !body.success || !body.data) {
      throw new Error(body.error || `Upload failed (${res.status})`);
    }
    return body.data.url;
  }

  async function handleFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const list = images.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} is too large. Max size is 5 MB.`);
        return false;
      }
      return true;
    });
    if (list.length === 0) return;

    setUploadingCount((c) => c + list.length);
    // Snapshot current value so concurrent uploads all append rather than clobber.
    const uploaded: string[] = [];
    await Promise.all(
      list.map(async (file) => {
        try {
          const url = await uploadOne(file);
          if (url) uploaded.push(url);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : `Failed to upload ${file.name}`);
        } finally {
          setUploadingCount((c) => c - 1);
        }
      })
    );
    if (uploaded.length > 0) {
      onChange([...value, ...uploaded]);
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  function setMain(idx: number) {
    if (idx === 0) return;
    const next = [...value];
    const [item] = next.splice(idx, 1);
    next.unshift(item);
    onChange(next);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-light dark:border-border-dark px-4 py-8 text-center transition-colors hover:border-accent',
          dragActive && 'border-accent bg-accent/5'
        )}
      >
        <ImagePlus className="h-6 w-6 text-neutral-400" />
        <div className="text-sm text-neutral-600 dark:text-neutral-300">
          <span className="font-medium text-accent">Click to upload</span> or drag & drop
        </div>
        <p className="text-xs text-neutral-500">PNG, JPG, WEBP — multiple allowed, max 5 MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {(value.length > 0 || uploadingCount > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {value.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="group relative aspect-square overflow-hidden rounded border border-border-light dark:border-border-dark"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />

              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>

              {i === 0 ? (
                <span className="absolute bottom-1 left-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  Main
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setMain(i)}
                  className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Set as main image"
                >
                  <Star className="h-2.5 w-2.5" /> Main
                </button>
              )}

              <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-full bg-black/60 p-1 text-white disabled:opacity-30"
                  aria-label="Move left"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  className="rounded-full bg-black/60 p-1 text-white disabled:opacity-30"
                  aria-label="Move right"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          {Array.from({ length: uploadingCount }).map((_, i) => (
            <div
              key={`uploading-${i}`}
              className="flex aspect-square items-center justify-center rounded border border-dashed border-border-light dark:border-border-dark text-neutral-400"
            >
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
