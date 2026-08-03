'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Loader2, Save, ArrowUp, ArrowDown, HelpCircle, ChevronDown, Navigation, PanelBottom } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { SectionEditor } from '@/components/admin/SectionEditor';
import { BilingualField } from '@/components/admin/BilingualField';
import { SECTION_KINDS, emptyContent, type SectionKind } from '@/lib/page-sections';
import { apiFetch } from '@/lib/admin-fetch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PAGE_KEYS = ['home', 'about', 'faq', 'contact', 'privacy', 'terms'] as const;
type PageKey = (typeof PAGE_KEYS)[number];

const SECTION_TYPES = SECTION_KINDS;
type SectionType = SectionKind;

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

// Editor section keeps typed `content` plus a raw JSON mirror. The JSON
// string backs the "Edit as JSON" escape hatch and can hold invalid JSON
// transiently while the user types there, without throwing.
interface EditorSection {
  type: SectionType;
  content: Record<string, unknown>;
  contentJson: string;
  isVisible: boolean;
  order: number;
}

// FAQ items — stored under the `faq` setting, rendered on the storefront home
// page. Bilingual; array order is display order.
interface FaqItem {
  id: string;
  questionEn: string;
  questionKa: string;
  answerEn: string;
  answerKa: string;
}

function newFaqId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `faq-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

// Navigation — extra links appended after the storefront's built-in Services
// link (Setting: nav). `_id` is a local-only React key; stripped before save.
interface NavLinkRow {
  _id: string;
  labelEn: string;
  labelKa: string;
  href: string;
}

// Footer — extra columns appended after the storefront's built-in columns,
// plus social links and contact fields that each fall back to Footer's
// hardcoded content when left blank (Setting: footer). `_id`/link `_id`s are
// local-only React keys; stripped before save.
interface FooterLinkRow {
  _id: string;
  labelEn: string;
  labelKa: string;
  href: string;
}

interface FooterColumnRow {
  _id: string;
  titleEn: string;
  titleKa: string;
  links: FooterLinkRow[];
}

interface SocialRow {
  _id: string;
  platform: string;
  url: string;
}

interface FooterContact {
  phone: string;
  email: string;
  addressEn: string;
  addressKa: string;
}

function newId(prefix: string): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

function asContentRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toEditorSection(s: ApiSection): EditorSection {
  const content = asContentRecord(s.content);
  return {
    type: s.type,
    content,
    contentJson: JSON.stringify(content, null, 2),
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

  // Pending section-type change awaiting confirmation — content shapes
  // differ per kind, so switching type resets content and that's destructive
  // enough to confirm rather than silently discard hand-edited values.
  const [pendingTypeChange, setPendingTypeChange] = useState<{
    index: number;
    newType: SectionType;
  } | null>(null);

  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [loadingFaq, setLoadingFaq] = useState(true);
  const [savingFaq, setSavingFaq] = useState(false);

  const [navLinks, setNavLinks] = useState<NavLinkRow[]>([]);
  const [loadingNav, setLoadingNav] = useState(true);
  const [savingNav, setSavingNav] = useState(false);

  const [footerColumns, setFooterColumns] = useState<FooterColumnRow[]>([]);
  const [footerSocial, setFooterSocial] = useState<SocialRow[]>([]);
  const [footerContact, setFooterContact] = useState<FooterContact>({
    phone: '',
    email: '',
    addressEn: '',
    addressKa: '',
  });
  const [loadingFooter, setLoadingFooter] = useState(true);
  const [savingFooter, setSavingFooter] = useState(false);

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

  const loadFaq = useCallback(async () => {
    setLoadingFaq(true);
    try {
      const data = await apiFetch<{ settings: Record<string, unknown> }>(
        '/api/admin/settings'
      );
      const raw = data.settings?.faq;
      setFaq(Array.isArray(raw) ? (raw as FaqItem[]) : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load FAQ');
    } finally {
      setLoadingFaq(false);
    }
  }, []);

  const loadNav = useCallback(async () => {
    setLoadingNav(true);
    try {
      const data = await apiFetch<{ settings: Record<string, unknown> }>('/api/admin/settings');
      const raw = data.settings?.nav as { links?: Array<{ labelEn: string; labelKa: string; href: string }> } | undefined;
      const links = Array.isArray(raw?.links) ? raw.links : [];
      setNavLinks(links.map((l) => ({ _id: newId('nav'), labelEn: l.labelEn ?? '', labelKa: l.labelKa ?? '', href: l.href ?? '' })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load navigation');
    } finally {
      setLoadingNav(false);
    }
  }, []);

  const loadFooter = useCallback(async () => {
    setLoadingFooter(true);
    try {
      const data = await apiFetch<{ settings: Record<string, unknown> }>('/api/admin/settings');
      const raw = data.settings?.footer as
        | {
            columns?: Array<{ titleEn: string; titleKa: string; links: Array<{ labelEn: string; labelKa: string; href: string }> }>;
            social?: Array<{ platform: string; url: string }>;
            contact?: Partial<FooterContact>;
          }
        | undefined;
      const columns = Array.isArray(raw?.columns) ? raw.columns : [];
      setFooterColumns(
        columns.map((c) => ({
          _id: newId('col'),
          titleEn: c.titleEn ?? '',
          titleKa: c.titleKa ?? '',
          links: (c.links ?? []).map((l) => ({
            _id: newId('link'),
            labelEn: l.labelEn ?? '',
            labelKa: l.labelKa ?? '',
            href: l.href ?? '',
          })),
        }))
      );
      const social = Array.isArray(raw?.social) ? raw.social : [];
      setFooterSocial(social.map((s) => ({ _id: newId('social'), platform: s.platform ?? '', url: s.url ?? '' })));
      setFooterContact({
        phone: raw?.contact?.phone ?? '',
        email: raw?.contact?.email ?? '',
        addressEn: raw?.contact?.addressEn ?? '',
        addressKa: raw?.contact?.addressKa ?? '',
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load footer');
    } finally {
      setLoadingFooter(false);
    }
  }, []);

  useEffect(() => {
    loadList();
    loadFaq();
    loadNav();
    loadFooter();
  }, [loadList, loadFaq, loadNav, loadFooter]);

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

  /** Structured-editor changes are the source of truth; keep the JSON mirror in sync. */
  function updateSectionContent(index: number, next: Record<string, unknown>) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, content: next, contentJson: JSON.stringify(next, null, 2) } : s
      )
    );
  }

  /** JSON-textarea edits are the source of truth for that field; sync `content` when it parses. */
  function updateSectionJson(index: number, json: string) {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        try {
          const parsed = json.trim() === '' ? {} : JSON.parse(json);
          return { ...s, contentJson: json, content: asContentRecord(parsed) };
        } catch {
          // Invalid JSON mid-edit — keep showing what the user typed, don't touch `content` yet.
          return { ...s, contentJson: json };
        }
      })
    );
  }

  function requestTypeChange(index: number, newType: SectionType) {
    setPendingTypeChange({ index, newType });
  }

  function confirmTypeChange() {
    if (!pendingTypeChange) return;
    const { index, newType } = pendingTypeChange;
    const content = emptyContent(newType);
    setSections((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, type: newType, content, contentJson: JSON.stringify(content, null, 2) }
          : s
      )
    );
  }

  function addSection() {
    const content = emptyContent('text');
    setSections((prev) => [
      ...prev,
      {
        type: 'text',
        content,
        contentJson: JSON.stringify(content, null, 2),
        isVisible: true,
        order: prev.length,
      },
    ]);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    // The JSON mirror is kept in sync on every structured edit; the only way
    // it can still hold invalid JSON is via unparsed text left in the escape
    // hatch textarea. Guard for that up front and abort on the first error.
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

  function updateFaq<K extends keyof FaqItem>(index: number, key: K, val: FaqItem[K]) {
    setFaq((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: val } : f)));
  }

  function addFaq() {
    setFaq((prev) => [
      ...prev,
      { id: newFaqId(), questionEn: '', questionKa: '', answerEn: '', answerKa: '' },
    ]);
  }

  function removeFaq(index: number) {
    setFaq((prev) => prev.filter((_, i) => i !== index));
  }

  function moveFaq(index: number, dir: -1 | 1) {
    setFaq((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSaveFaq() {
    // Client-side guard: every item needs all four fields. The API re-validates.
    for (let i = 0; i < faq.length; i++) {
      const f = faq[i];
      if (!f.questionEn.trim() || !f.questionKa.trim() || !f.answerEn.trim() || !f.answerKa.trim()) {
        toast.error(`FAQ #${i + 1}: all four fields (EN/KA question & answer) are required`);
        return;
      }
    }

    setSavingFaq(true);
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ faq }),
      });
      toast.success('FAQ saved');
      loadFaq();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save FAQ');
    } finally {
      setSavingFaq(false);
    }
  }

  // --- Navigation ---

  function updateNavLink<K extends keyof Omit<NavLinkRow, '_id'>>(index: number, key: K, val: NavLinkRow[K]) {
    setNavLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [key]: val } : l)));
  }

  function addNavLink() {
    setNavLinks((prev) => [...prev, { _id: newId('nav'), labelEn: '', labelKa: '', href: '' }]);
  }

  function removeNavLink(index: number) {
    setNavLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveNavLink(index: number, dir: -1 | 1) {
    setNavLinks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSaveNav() {
    for (let i = 0; i < navLinks.length; i++) {
      const l = navLinks[i];
      if (!l.labelEn.trim() || !l.href.trim()) {
        toast.error(`Nav link #${i + 1}: English label and URL are required`);
        return;
      }
    }

    setSavingNav(true);
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          nav: { links: navLinks.map(({ labelEn, labelKa, href }) => ({ labelEn, labelKa, href })) },
        }),
      });
      toast.success('Navigation saved');
      loadNav();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save navigation');
    } finally {
      setSavingNav(false);
    }
  }

  // --- Footer ---

  function addFooterColumn() {
    setFooterColumns((prev) => [...prev, { _id: newId('col'), titleEn: '', titleKa: '', links: [] }]);
  }

  function removeFooterColumn(index: number) {
    setFooterColumns((prev) => prev.filter((_, i) => i !== index));
  }

  function moveFooterColumn(index: number, dir: -1 | 1) {
    setFooterColumns((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateFooterColumn<K extends keyof Omit<FooterColumnRow, '_id' | 'links'>>(
    index: number,
    key: K,
    val: FooterColumnRow[K]
  ) {
    setFooterColumns((prev) => prev.map((c, i) => (i === index ? { ...c, [key]: val } : c)));
  }

  function addFooterLink(colIndex: number) {
    setFooterColumns((prev) =>
      prev.map((c, i) =>
        i === colIndex ? { ...c, links: [...c.links, { _id: newId('link'), labelEn: '', labelKa: '', href: '' }] } : c
      )
    );
  }

  function removeFooterLink(colIndex: number, linkIndex: number) {
    setFooterColumns((prev) =>
      prev.map((c, i) => (i === colIndex ? { ...c, links: c.links.filter((_, j) => j !== linkIndex) } : c))
    );
  }

  function updateFooterLink<K extends keyof Omit<FooterLinkRow, '_id'>>(
    colIndex: number,
    linkIndex: number,
    key: K,
    val: FooterLinkRow[K]
  ) {
    setFooterColumns((prev) =>
      prev.map((c, i) =>
        i === colIndex
          ? { ...c, links: c.links.map((l, j) => (j === linkIndex ? { ...l, [key]: val } : l)) }
          : c
      )
    );
  }

  function addSocial() {
    setFooterSocial((prev) => [...prev, { _id: newId('social'), platform: '', url: '' }]);
  }

  function removeSocial(index: number) {
    setFooterSocial((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSocial<K extends keyof Omit<SocialRow, '_id'>>(index: number, key: K, val: SocialRow[K]) {
    setFooterSocial((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: val } : s)));
  }

  async function handleSaveFooter() {
    for (let i = 0; i < footerColumns.length; i++) {
      const c = footerColumns[i];
      if (!c.titleEn.trim()) {
        toast.error(`Footer column #${i + 1}: English title is required`);
        return;
      }
      for (let j = 0; j < c.links.length; j++) {
        const l = c.links[j];
        if (!l.labelEn.trim() || !l.href.trim()) {
          toast.error(`Footer column #${i + 1}, link #${j + 1}: English label and URL are required`);
          return;
        }
      }
    }
    for (let i = 0; i < footerSocial.length; i++) {
      const s = footerSocial[i];
      if (!s.platform.trim() || !s.url.trim()) {
        toast.error(`Social link #${i + 1}: platform and URL are required`);
        return;
      }
    }

    setSavingFooter(true);
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          footer: {
            columns: footerColumns.map(({ titleEn, titleKa, links }) => ({
              titleEn,
              titleKa,
              links: links.map(({ labelEn, labelKa, href }) => ({ labelEn, labelKa, href })),
            })),
            social: footerSocial.map(({ platform, url }) => ({ platform, url })),
            contact: footerContact,
          },
        }),
      });
      toast.success('Footer saved');
      loadFooter();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save footer');
    } finally {
      setSavingFooter(false);
    }
  }

  return (
    <div>
      <PageHeader title="Content" description="Manage storefront pages, navigation, footer, and their SEO." />

      <Tabs defaultValue="pages">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="nav" className="gap-1.5">
            <Navigation className="h-3.5 w-3.5" /> Navigation
          </TabsTrigger>
          <TabsTrigger value="footer" className="gap-1.5">
            <PanelBottom className="h-3.5 w-3.5" /> Footer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pages">
      <div className="flex justify-end mb-4">
        <Button className="gap-1" onClick={handleSave} disabled={saving || loadingPage}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save page
        </Button>
      </div>

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
                              onValueChange={(v) => requestTypeChange(i, v as SectionType)}
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

                        <SectionEditor
                          kind={s.type}
                          content={s.content}
                          onChange={(next) => updateSectionContent(i, next)}
                        />

                        <details className="group rounded-md border border-border-light dark:border-border-dark">
                          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
                            Edit as JSON
                          </summary>
                          <div className="space-y-1.5 border-t border-border-light p-3 dark:border-border-dark">
                            <Textarea
                              rows={6}
                              className="font-mono text-xs"
                              value={s.contentJson}
                              onChange={(e) => updateSectionJson(i, e.target.value)}
                              spellCheck={false}
                            />
                            <p className="text-[11px] text-neutral-500">
                              Escape hatch for keys the form above doesn&apos;t cover. Unknown keys
                              are preserved when saved.
                            </p>
                          </div>
                        </details>
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

      {/* ── Home FAQ manager ─────────────────────────────── */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" /> Home FAQ
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={addFaq}>
              <Plus className="h-4 w-4" /> Add question
            </Button>
            <Button size="sm" className="gap-1" onClick={handleSaveFaq} disabled={savingFaq || loadingFaq}>
              {savingFaq ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-neutral-500">
            Questions shown on the storefront home page. Order here is the display
            order. If empty, the site falls back to the built-in default FAQ.
          </p>
          {loadingFaq ? (
            <div className="flex items-center justify-center py-10 text-neutral-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : faq.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">
              No FAQ items. Add one — until then the storefront shows the default FAQ.
            </p>
          ) : (
            faq.map((f, i) => (
              <div
                key={f.id}
                className="space-y-3 rounded-lg border border-border-light p-4 dark:border-border-dark"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-500">#{i + 1}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Move up"
                      disabled={i === 0}
                      onClick={() => moveFaq(i, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Move down"
                      disabled={i === faq.length - 1}
                      onClick={() => moveFaq(i, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remove question"
                      onClick={() => removeFaq(i)}
                    >
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Question (EN)</Label>
                    <Input
                      value={f.questionEn}
                      onChange={(e) => updateFaq(i, 'questionEn', e.target.value)}
                      placeholder="English question"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Question (KA)</Label>
                    <Input
                      value={f.questionKa}
                      onChange={(e) => updateFaq(i, 'questionKa', e.target.value)}
                      placeholder="ქართული კითხვა"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Answer (EN)</Label>
                    <Textarea
                      rows={3}
                      value={f.answerEn}
                      onChange={(e) => updateFaq(i, 'answerEn', e.target.value)}
                      placeholder="English answer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Answer (KA)</Label>
                    <Textarea
                      rows={3}
                      value={f.answerKa}
                      onChange={(e) => updateFaq(i, 'answerKa', e.target.value)}
                      placeholder="ქართული პასუხი"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="nav">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" /> Extra nav links
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={addNavLink}>
                  <Plus className="h-4 w-4" /> Add link
                </Button>
                <Button size="sm" className="gap-1" onClick={handleSaveNav} disabled={savingNav || loadingNav}>
                  {savingNav ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save navigation
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-neutral-500">
                Links appended to the main nav after the built-in Services link, and to the mobile
                menu. The built-in links (Categories, Brands, Services) are never affected — this
                only adds to them.
              </p>
              {loadingNav ? (
                <div className="flex items-center justify-center py-10 text-neutral-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : navLinks.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-500">
                  No extra nav links. Add one to extend the storefront navigation.
                </p>
              ) : (
                navLinks.map((link, i) => (
                  <div
                    key={link._id}
                    className="space-y-3 rounded-lg border border-border-light p-4 dark:border-border-dark"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-500">#{i + 1}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="Move up" disabled={i === 0} onClick={() => moveNavLink(i, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Move down"
                          disabled={i === navLinks.length - 1}
                          onClick={() => moveNavLink(i, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Remove link" onClick={() => removeNavLink(i)}>
                          <Trash2 className="h-4 w-4 text-error" />
                        </Button>
                      </div>
                    </div>
                    <BilingualField
                      id={`nav-${link._id}`}
                      label="Label"
                      valueEn={link.labelEn}
                      valueKa={link.labelKa}
                      onChangeEn={(v) => updateNavLink(i, 'labelEn', v)}
                      onChangeKa={(v) => updateNavLink(i, 'labelKa', v)}
                    />
                    <div className="space-y-1.5">
                      <Label>URL</Label>
                      <Input
                        value={link.href}
                        onChange={(e) => updateNavLink(i, 'href', e.target.value)}
                        placeholder="/en/products or https://…"
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <PanelBottom className="h-5 w-5" /> Footer
                </CardTitle>
                <Button size="sm" className="gap-1" onClick={handleSaveFooter} disabled={savingFooter || loadingFooter}>
                  {savingFooter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save footer
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-neutral-500">
                  Everything below falls back to the storefront&apos;s built-in footer content,
                  field by field, whenever it&apos;s left empty — nothing disappears from the live
                  site before you save here.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Extra columns</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={addFooterColumn}>
                  <Plus className="h-4 w-4" /> Add column
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingFooter ? (
                  <div className="flex items-center justify-center py-10 text-neutral-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : footerColumns.length === 0 ? (
                  <p className="py-6 text-center text-sm text-neutral-500">
                    No extra footer columns. Add one to extend the built-in Shop / Company / Contact
                    columns.
                  </p>
                ) : (
                  footerColumns.map((col, i) => (
                    <div
                      key={col._id}
                      className="space-y-3 rounded-lg border border-border-light p-4 dark:border-border-dark"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-500">Column #{i + 1}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" title="Move up" disabled={i === 0} onClick={() => moveFooterColumn(i, -1)}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Move down"
                            disabled={i === footerColumns.length - 1}
                            onClick={() => moveFooterColumn(i, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Remove column" onClick={() => removeFooterColumn(i)}>
                            <Trash2 className="h-4 w-4 text-error" />
                          </Button>
                        </div>
                      </div>
                      <BilingualField
                        id={`footer-col-${col._id}`}
                        label="Column title"
                        valueEn={col.titleEn}
                        valueKa={col.titleKa}
                        onChangeEn={(v) => updateFooterColumn(i, 'titleEn', v)}
                        onChangeKa={(v) => updateFooterColumn(i, 'titleKa', v)}
                      />
                      <div className="space-y-3 pl-4 border-l border-border-light dark:border-border-dark">
                        {col.links.map((link, j) => (
                          <div key={link._id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-neutral-500">Link #{j + 1}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Remove link"
                                onClick={() => removeFooterLink(i, j)}
                              >
                                <Trash2 className="h-4 w-4 text-error" />
                              </Button>
                            </div>
                            <BilingualField
                              id={`footer-link-${link._id}`}
                              label="Label"
                              valueEn={link.labelEn}
                              valueKa={link.labelKa}
                              onChangeEn={(v) => updateFooterLink(i, j, 'labelEn', v)}
                              onChangeKa={(v) => updateFooterLink(i, j, 'labelKa', v)}
                            />
                            <div className="space-y-1.5">
                              <Label>URL</Label>
                              <Input
                                value={link.href}
                                onChange={(e) => updateFooterLink(i, j, 'href', e.target.value)}
                                placeholder="/en/products or https://…"
                              />
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => addFooterLink(i)}>
                          <Plus className="h-4 w-4" /> Add link
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Social links</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={addSocial}>
                  <Plus className="h-4 w-4" /> Add social link
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-neutral-500">
                  Replaces the built-in Instagram / Facebook / TikTok icons entirely when at least
                  one entry is saved. Platform name picks the icon (Instagram/Facebook get a
                  matching glyph; anything else gets a generic icon).
                </p>
                {footerSocial.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-500">
                    No social links saved — the built-in Instagram / Facebook / TikTok icons show.
                  </p>
                ) : (
                  footerSocial.map((s, i) => (
                    <div key={s._id} className="flex items-end gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Label>Platform</Label>
                        <Input
                          value={s.platform}
                          onChange={(e) => updateSocial(i, 'platform', e.target.value)}
                          placeholder="Instagram"
                        />
                      </div>
                      <div className="flex-[2] space-y-1.5">
                        <Label>URL</Label>
                        <Input
                          value={s.url}
                          onChange={(e) => updateSocial(i, 'url', e.target.value)}
                          placeholder="https://instagram.com/mobax.ge"
                        />
                      </div>
                      <Button variant="ghost" size="icon" title="Remove" onClick={() => removeSocial(i)}>
                        <Trash2 className="h-4 w-4 text-error" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      value={footerContact.phone}
                      onChange={(e) => setFooterContact((c) => ({ ...c, phone: e.target.value }))}
                      placeholder="+995 555 123 456"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      value={footerContact.email}
                      onChange={(e) => setFooterContact((c) => ({ ...c, email: e.target.value }))}
                      placeholder="hello@mobax.ge"
                    />
                  </div>
                </div>
                <BilingualField
                  id="footer-address"
                  label="Address"
                  valueEn={footerContact.addressEn}
                  valueKa={footerContact.addressKa}
                  onChangeEn={(v) => setFooterContact((c) => ({ ...c, addressEn: v }))}
                  onChangeKa={(v) => setFooterContact((c) => ({ ...c, addressKa: v }))}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={pendingTypeChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTypeChange(null);
        }}
        title="Change section type?"
        description="Switching type resets this section's content to match the new type's fields. Anything entered for the current type will be lost."
        confirmLabel="Change type"
        destructive
        onConfirm={confirmTypeChange}
      />
    </div>
  );
}
