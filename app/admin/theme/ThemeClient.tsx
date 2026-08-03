'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SingleImageUploader } from '@/components/admin/SingleImageUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/admin-fetch';
import { toast } from 'sonner';

interface Theme {
  primary: string;
  accent: string;
  storeName: string;
  logoUrl: string;
  announcement: string;
}

// Must mirror THEME_DEFAULTS in lib/theme.ts and the static tokens in
// globals.css — primary navy + cobalt accent. "Reset to defaults" pushes these,
// so a mismatch would recolor the live store on reset.
const DEFAULTS: Theme = {
  primary: '#1E2D5A',
  accent: '#2E5BFF',
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

// Typography — must mirror TYPOGRAPHY_DEFAULTS in lib/theme.ts. Only Inter
// and Space Grotesk are wired into app/globals.css's font-family rules and
// Google Fonts @import; this app deliberately does not load Manrope, Sora,
// or Georgia, so the enum here is narrower than an earlier draft of this
// feature that listed those. Georgian always renders its own typeface
// (BPG Nino Mtavruli / Noto Sans Georgian) regardless of this setting.
interface Typography {
  displayFont: 'Inter' | 'Space Grotesk';
  bodyFont: 'Inter' | 'System';
  scale: number;
}

const TYPOGRAPHY_DEFAULTS: Typography = {
  displayFont: 'Space Grotesk',
  bodyFont: 'Inter',
  scale: 1,
};

function withTypographyDefaults(value: unknown): Typography {
  if (value && typeof value === 'object') {
    const merged = { ...TYPOGRAPHY_DEFAULTS, ...(value as Partial<Typography>) };
    return { ...merged, scale: Math.min(1.15, Math.max(0.9, merged.scale)) };
  }
  return { ...TYPOGRAPHY_DEFAULTS };
}

export function ThemeClient() {
  const [theme, setTheme] = useState<Theme>(DEFAULTS);
  const [typography, setTypography] = useState<Typography>(TYPOGRAPHY_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrlMode, setLogoUrlMode] = useState(false);

  function set<K extends keyof Theme>(key: K, val: Theme[K]) {
    setTheme((t) => ({ ...t, [key]: val }));
  }

  function setTypo<K extends keyof Typography>(key: K, val: Typography[K]) {
    setTypography((t) => ({ ...t, [key]: val }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [themeData, settingsData] = await Promise.all([
        apiFetch<{ theme: unknown }>('/api/admin/theme'),
        apiFetch<{ settings: Record<string, unknown> }>('/api/admin/settings'),
      ]);
      setTheme(withDefaults(themeData.theme));
      setTypography(withTypographyDefaults(settingsData.settings?.typography));
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
      await Promise.all([
        apiFetch('/api/admin/theme', {
          method: 'PATCH',
          body: JSON.stringify(theme),
        }),
        apiFetch('/api/admin/settings', {
          method: 'PATCH',
          body: JSON.stringify({ typography }),
        }),
      ]);
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
      <PageHeader title="Theme" description="Store branding, colors, and typography">
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            setTheme(DEFAULTS);
            setTypography(TYPOGRAPHY_DEFAULTS);
          }}
          className="gap-1"
        >
          <RotateCcw className="h-4 w-4" /> Reset to defaults
        </Button>
        <Button onClick={save} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </PageHeader>

      <Tabs defaultValue="branding">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="branding">Branding &amp; Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
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
                    <div className="flex items-center justify-between">
                      <Label>Logo</Label>
                      <button
                        type="button"
                        onClick={() => setLogoUrlMode((m) => !m)}
                        className="text-xs font-medium text-accent underline-offset-2 hover:underline"
                      >
                        {logoUrlMode ? 'Upload instead' : 'Paste a URL instead'}
                      </button>
                    </div>
                    {logoUrlMode ? (
                      <Input
                        value={theme.logoUrl}
                        onChange={(e) => set('logoUrl', e.target.value)}
                        placeholder="https://…"
                      />
                    ) : (
                      <SingleImageUploader
                        value={theme.logoUrl}
                        onChange={(url) => set('logoUrl', url)}
                        folder="theme"
                      />
                    )}
                    <p className="text-xs text-neutral-500">
                      Upload an image, pick one from the media library, or paste an external URL
                      (e.g. a CDN-hosted logo).
                    </p>
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
                  <CardDescription>Primary (headers, buttons) and accent (links, highlights) brand colors. These recolor the live storefront.</CardDescription>
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
                  <ThemePreview theme={theme} typography={typography} />
                  <p className="mt-3 text-xs text-neutral-500">
                    Changes go live on the storefront after saving — primary &amp; accent recolor the
                    site, and store name, logo and announcement update the header. Hard-refresh the
                    store to see them.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="typography">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fonts</CardTitle>
                  <CardDescription>
                    Only Inter and Space Grotesk are loaded by this app — no other webfont ships to
                    the storefront. Georgian pages always use the built-in Georgian typeface
                    regardless of this setting.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Display font (headings)</Label>
                    <Select
                      value={typography.displayFont}
                      onValueChange={(v) => setTypo('displayFont', v as Typography['displayFont'])}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Space Grotesk">Space Grotesk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Body font</Label>
                    <Select
                      value={typography.bodyFont}
                      onValueChange={(v) => setTypo('bodyFont', v as Typography['bodyFont'])}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="System">System (device default)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Scale</CardTitle>
                  <CardDescription>
                    Multiplies the whole type scale. Clamped to 0.9–1.15 so a bad value can&apos;t
                    make the store unusable.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={0.9}
                      max={1.15}
                      step={0.01}
                      value={typography.scale}
                      onChange={(e) => setTypo('scale', Number(e.target.value))}
                      className="w-full accent-[#2E5BFF]"
                      aria-label="Type scale"
                    />
                    <span className="w-14 shrink-0 text-right text-sm font-mono tabular-nums">
                      {typography.scale.toFixed(2)}×
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live preview reflecting the font/scale choice */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ThemePreview theme={theme} typography={typography} />
                  <p className="mt-3 text-xs text-neutral-500">
                    Heading uses the display font; body copy uses the body font, both at the chosen
                    scale.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const FONT_STACKS: Record<Typography['displayFont'] | Typography['bodyFont'], string> = {
  Inter: "'Inter', system-ui, sans-serif",
  'Space Grotesk': "'Space Grotesk', 'Inter', system-ui, sans-serif",
  System: 'system-ui, -apple-system, sans-serif',
};

function ThemePreview({ theme, typography }: { theme: Theme; typography: Typography }) {
  return (
    <div
      className="rounded-lg overflow-hidden border border-border-light dark:border-border-dark"
      style={{ fontSize: `calc(1em * ${typography.scale})` }}
    >
      <div
        className="px-4 py-3 text-white text-sm font-semibold"
        style={{ backgroundColor: theme.primary, fontFamily: FONT_STACKS[typography.displayFont] }}
      >
        <span style={{ color: '#fff' }}>{theme.storeName.slice(0, -2) || 'Mo'}</span>
        <span style={{ color: theme.accent }}>{theme.storeName.slice(-2) || 'Bax'}</span>
      </div>
      {theme.announcement && (
        <div
          className="px-4 py-2 text-center text-xs text-white"
          style={{
            backgroundColor: theme.primary,
            filter: 'brightness(0.85)',
            fontFamily: FONT_STACKS[typography.bodyFont],
          }}
        >
          {theme.announcement}
        </div>
      )}
      <div
        className="p-4 space-y-3 bg-white dark:bg-surface-dark"
        style={{ fontFamily: FONT_STACKS[typography.bodyFont] }}
      >
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
