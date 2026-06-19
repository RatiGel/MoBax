'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/admin-fetch';
import { toast } from 'sonner';

interface Theme {
  primary: string;
  accent: string;
  storeName: string;
  logoUrl: string;
  announcement: string;
}

// Defaults mirror the live design tokens (tailwind.config.ts navy/amber).
const DEFAULTS: Theme = {
  primary: '#1E2D5A',
  accent: '#F5A623',
  storeName: 'MoBax',
  logoUrl: '',
  announcement: '',
};

function withDefaults(value: unknown): Theme {
  if (value && typeof value === 'object') {
    return { ...DEFAULTS, ...(value as Partial<Theme>) };
  }
  return { ...DEFAULTS };
}

export function ThemeClient() {
  const [theme, setTheme] = useState<Theme>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Theme>(key: K, val: Theme[K]) {
    setTheme((t) => ({ ...t, [key]: val }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ theme: unknown }>('/api/admin/theme');
      setTheme(withDefaults(data.theme));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load theme');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      await apiFetch('/api/admin/theme', {
        method: 'PATCH',
        body: JSON.stringify(theme),
      });
      toast.success('Theme saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Theme" description="Store branding and colors">
        <Button variant="outline" type="button" onClick={() => setTheme(DEFAULTS)} className="gap-1">
          <RotateCcw className="h-4 w-4" /> Reset to defaults
        </Button>
        <Button onClick={save} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Branding</CardTitle>
              <CardDescription>Store name, logo and announcement bar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Store name</Label>
                <Input value={theme.storeName} onChange={(e) => set('storeName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Logo URL</Label>
                <Input
                  value={theme.logoUrl}
                  onChange={(e) => set('logoUrl', e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Announcement bar text</Label>
                <Input
                  value={theme.announcement}
                  onChange={(e) => set('announcement', e.target.value)}
                  placeholder="Free shipping on orders over ₾100"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Colors</CardTitle>
              <CardDescription>Primary (navy) and accent (amber) brand tokens.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorField
                label="Primary"
                value={theme.primary}
                onChange={(v) => set('primary', v)}
              />
              <ColorField label="Accent" value={theme.accent} onChange={(v) => set('accent', v)} />
            </CardContent>
          </Card>
        </div>

        {/* Live preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden border border-border-light dark:border-border-dark">
                <div
                  className="px-4 py-3 text-white text-sm font-semibold"
                  style={{ backgroundColor: theme.primary }}
                >
                  <span style={{ color: '#fff' }}>{theme.storeName.slice(0, -2) || 'Mo'}</span>
                  <span style={{ color: theme.accent }}>{theme.storeName.slice(-2) || 'Bax'}</span>
                </div>
                {theme.announcement && (
                  <div
                    className="px-4 py-2 text-center text-xs text-white"
                    style={{ backgroundColor: theme.primary, filter: 'brightness(0.85)' }}
                  >
                    {theme.announcement}
                  </div>
                )}
                <div className="p-4 space-y-3 bg-white dark:bg-surface-dark">
                  <button
                    className="w-full rounded-md py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Primary button
                  </button>
                  <button
                    className="w-full rounded-md py-2 text-sm font-medium"
                    style={{ backgroundColor: theme.accent, color: theme.primary }}
                  >
                    Accent button
                  </button>
                  <p className="text-sm">
                    Price: <span style={{ color: theme.accent }} className="font-bold">₾129</span>
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                Saved to store settings. Wiring these tokens into the live storefront CSS is a
                follow-up; today they persist and preview here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-border-light dark:border-border-dark bg-transparent p-0.5"
          aria-label={`${label} color picker`}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
      </div>
    </div>
  );
}
