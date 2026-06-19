'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/admin-fetch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// MVP CMS: section `content` is edited as raw JSON in a textarea. A richer,
// per-section-type structured editor is future work.

const PAGE_KEYS = ['home', 'about', 'faq', 'contact', 'privacy', 'terms'] as const;
type PageKey = (typeof PAGE_KEYS)[number];

const SECTION_TYPES = ['hero', 'text', 'banner', 'faq', 'grid'] as const;
type SectionType = (typeof SECTION_TYPES)[number];

const PAGE_LABELS: Record<PageKey, string> = {
  home: 'Home',
  about: 'About',
  faq: 'FAQ',
  contact: 'Contact',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
};

interface ApiSection {
  type: SectionType;
  content: unknown;
  isVisible: boolean;
  order: number;
}

interface PageDoc {
  pageKey: PageKey;
  sections: ApiSection[];
  seo: { title: string; description: string };
  exists?: boolean;
}

// Editor section keeps content as a string so we can show invalid-JSON state
// without throwing while the user types.
interface EditorSection {
  type: SectionType;
  contentJson: string;
  isVisible: boolean;
  order: number;
}

function toEditorSection(s: ApiSection): EditorSection {
  return {
    type: s.type,
    contentJson: JSON.stringify(s.content ?? {}, null, 2),
    isVisible: s.isVisible,
    order: s.order,
  };
}

export function ContentClient() {
  const [pages, setPages] = useState<PageDoc[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [selected, setSelected] = useState<PageKey>('home');
  const [loadingPage, setLoadingPage] = useState(false);
  const [saving, setSaving] = useState(false);

  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [sections, setSections] = useState<EditorSection[]>([]);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await apiFetch<{ pages: PageDoc[] }>('/api/admin/pages');
      setPages(data.pages);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load pages');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadPage = useCallback(async (key: PageKey) => {
    setLoadingPage(true);
    try {
      const data = await apiFetch<PageDoc>(`/api/admin/pages/${key}`);
      setSeoTitle(data.seo?.title ?? '');
      setSeoDescription(data.seo?.description ?? '');
      setSections((data.sections ?? []).map(toEditorSection));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load page');
    } finally {
      setLoadingPage(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadPage(selected);
  }, [selected, loadPage]);

  function updateSection<K extends keyof EditorSection>(
    index: number,
    key: K,
    val: EditorSection[K]
  ) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [key]: val } : s))
    );
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      {
        type: 'text',
        contentJson: '{}',
        isVisible: true,
        order: prev.length,
      },
    ]);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    // Parse every section's JSON up front; abort the whole save on the first error.
    const parsedSections: ApiSection[] = [];
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      let content: unknown;
      try {
        content = s.contentJson.trim() === '' ? {} : JSON.parse(s.contentJson);
      } catch {
        toast.error(`Section ${i + 1}: invalid JSON in content`);
        return;
      }
      parsedSections.push({
        type: s.type,
        content,
        isVisible: s.isVisible,
        order: Number.isFinite(s.order) ? s.order : i,
      });
    }

    setSaving(true);
    try {
      await apiFetch(`/api/admin/pages/${selected}`, {
        method: 'PUT',
        body: JSON.stringify({
          sections: parsedSections,
          seo: { title: seoTitle, description: seoDescription },
        }),
      });
      toast.success(`${PAGE_LABELS[selected]} page saved`);
      loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save page');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Content" description="Manage storefront pages and their SEO.">
        <Button className="gap-1" onClick={handleSave} disabled={saving || loadingPage}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save page
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Page picker */}
        <nav className="flex flex-row flex-wrap gap-2 lg:flex-col">
          {PAGE_KEYS.map((key) => {
            const meta = pages.find((p) => p.pageKey === key);
            const active = key === selected;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  active
                    ? 'border-primary bg-primary/5 font-medium text-primary dark:text-white'
                    : 'border-border-light text-neutral-600 hover:bg-neutral-50 dark:border-border-dark dark:text-neutral-300 dark:hover:bg-neutral-800'
                )}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{PAGE_LABELS[key]}</span>
                {meta && !meta.exists && (
                  <span className="text-[10px] uppercase text-neutral-400">new</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Editor */}
        <div className="space-y-6">
          {loadingPage ? (
            <div className="flex items-center justify-center py-20 text-neutral-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>SEO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Meta title</Label>
                    <Input
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="Page title for search engines"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Meta description</Label>
                    <Textarea
                      rows={3}
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="Short description shown in search results"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle>Sections</CardTitle>
                  <Button variant="outline" size="sm" className="gap-1" onClick={addSection}>
                    <Plus className="h-4 w-4" /> Add section
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sections.length === 0 ? (
                    <p className="py-6 text-center text-sm text-neutral-500">
                      No sections yet. Add one to start building this page.
                    </p>
                  ) : (
                    sections.map((s, i) => (
                      <div
                        key={i}
                        className="space-y-3 rounded-lg border border-border-light p-4 dark:border-border-dark"
                      >
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="space-y-1.5">
                            <Label>Type</Label>
                            <Select
                              value={s.type}
                              onValueChange={(v) => updateSection(i, 'type', v as SectionType)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SECTION_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label>Order</Label>
                            <Input
                              type="number"
                              className="w-24"
                              value={s.order}
                              onChange={(e) =>
                                updateSection(i, 'order', Number(e.target.value))
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2 pb-2">
                            <Switch
                              checked={s.isVisible}
                              onCheckedChange={(v) => updateSection(i, 'isVisible', v)}
                            />
                            <Label className="cursor-default">Visible</Label>
                          </div>

                          <div className="ml-auto pb-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Remove section"
                              onClick={() => removeSection(i)}
                            >
                              <Trash2 className="h-4 w-4 text-error" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Content (JSON)</Label>
                          <Textarea
                            rows={6}
                            className="font-mono text-xs"
                            value={s.contentJson}
                            onChange={(e) => updateSection(i, 'contentJson', e.target.value)}
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {loadingList && (
        <p className="mt-2 text-xs text-neutral-400">Loading page list…</p>
      )}
    </div>
  );
}
