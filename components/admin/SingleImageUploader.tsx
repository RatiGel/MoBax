'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SingleImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  /** Logical folder this upload belongs to — determines the Cloudinary
   * folder and the RBAC module checked server-side. Defaults to 'products'. */
  folder?: 'products' | 'categories' | 'services' | 'content' | 'theme';
}

interface UploadResult {
  url: string;
  publicId: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function SingleImageUploader({ value, onChange, folder }: SingleImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} is too large. Max size is 5 MB.`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);

    setUploading(true);
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      let body: { success: boolean; data: UploadResult | null; error: string | null };
      try {
        body = await res.json();
      } catch {
        throw new Error(`Upload failed (${res.status})`);
      }
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error || `Upload failed (${res.status})`);
      }
      onChange(body.data.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }

  if (value) {
    return (
      <div className="group relative aspect-video w-full max-w-xs overflow-hidden rounded border border-border-light dark:border-border-dark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Remove image"
        >
          <X className="h-3 w-3" />
        </button>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>
    );
  }

  return (
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
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-light dark:border-border-dark px-4 py-6 text-center transition-colors hover:border-accent',
        dragActive && 'border-accent bg-accent/5'
      )}
    >
      {uploading ? (
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      ) : (
        <>
          <ImagePlus className="h-6 w-6 text-neutral-400" />
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            <span className="font-medium text-accent">Click to upload</span> or drag & drop
          </div>
          <p className="text-xs text-neutral-500">PNG, JPG, WEBP — max 5 MB</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
