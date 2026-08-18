'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BilingualField } from '@/components/admin/BilingualField';
import { SingleImageUploader } from '@/components/admin/SingleImageUploader';
import { SECTION_SCHEMAS, type SectionKind } from '@/lib/page-sections';

interface SectionEditorProps {
  kind: SectionKind;
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Optional fields get an explicit hint: blank is a valid choice there and the
 * storefront falls back to its built-in default, which isn't obvious from an
 * empty box alone.
 */
function fieldLabel(field: { label: string; optional?: boolean }): string {
  return field.optional ? `${field.label} — optional` : field.label;
}

/**
 * Typed per-kind form for a page section's `content`. Renders one control per
 * `SECTION_SCHEMAS[kind]` entry — bilingual fields via `BilingualField`, images
 * via `SingleImageUploader`, everything else via a plain Input/Switch.
 *
 * Any keys already in `content` that aren't part of this kind's schema (e.g.
 * hand-authored JSON, or leftovers from a prior kind) are preserved verbatim
 * on every change — this editor only ever touches the keys it renders.
 */
export function SectionEditor({ kind, content, onChange }: SectionEditorProps) {
  const schema = SECTION_SCHEMAS[kind];

  function set(key: string, value: unknown) {
    onChange({ ...content, [key]: value });
  }

  return (
    <div className="space-y-4">
      {schema.map((field) => {
        if (field.bilingual) {
          const enKey = `${field.key}En`;
          const kaKey = `${field.key}Ka`;
          return (
            <BilingualField
              key={field.key}
              id={`section-${field.key}`}
              label={fieldLabel(field)}
              variant={field.type === 'textarea' ? 'textarea' : 'text'}
              valueEn={asString(content[enKey])}
              valueKa={asString(content[kaKey])}
              onChangeEn={(v) => set(enKey, v)}
              onChangeKa={(v) => set(kaKey, v)}
            />
          );
        }

        switch (field.type) {
          case 'image':
            return (
              <div key={field.key} className="space-y-1.5">
                <Label>{fieldLabel(field)}</Label>
                <SingleImageUploader
                  value={asString(content[field.key])}
                  onChange={(url) => set(field.key, url)}
                  folder="content"
                />
              </div>
            );
          case 'url':
            return (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`section-${field.key}`}>{fieldLabel(field)}</Label>
                <Input
                  id={`section-${field.key}`}
                  type="url"
                  value={asString(content[field.key])}
                  onChange={(e) => set(field.key, e.target.value)}
                />
              </div>
            );
          case 'number':
            return (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`section-${field.key}`}>{fieldLabel(field)}</Label>
                <Input
                  id={`section-${field.key}`}
                  type="number"
                  value={typeof content[field.key] === 'number' ? (content[field.key] as number) : 0}
                  onChange={(e) => set(field.key, Number(e.target.value))}
                />
              </div>
            );
          case 'boolean':
            return (
              <div key={field.key} className="flex items-center gap-2">
                <Switch
                  id={`section-${field.key}`}
                  checked={Boolean(content[field.key])}
                  onCheckedChange={(v) => set(field.key, v)}
                />
                <Label htmlFor={`section-${field.key}`} className="cursor-pointer">
                  {field.label}
                </Label>
              </div>
            );
          case 'text':
          default:
            return (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`section-${field.key}`}>{fieldLabel(field)}</Label>
                <Input
                  id={`section-${field.key}`}
                  value={asString(content[field.key])}
                  onChange={(e) => set(field.key, e.target.value)}
                />
              </div>
            );
        }
      })}
    </div>
  );
}
