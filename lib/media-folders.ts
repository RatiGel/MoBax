// Standalone, zero-dependency module. Deliberately has no imports so it is
// safe to pull into both server code and 'use client' components — unlike
// models/Media.ts, which imports mongoose and would drag the Node-only
// mongodb driver into the browser bundle if imported from a client component.

export const MEDIA_FOLDERS = ['products', 'categories', 'services', 'content', 'theme'] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];
