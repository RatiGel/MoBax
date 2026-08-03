'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface BilingualFieldProps {
  /** Stable id prefix used to build unique ids for the EN/KA inputs and the warning. */
  id: string;
  /** Field label shown above each input, e.g. "Heading" — rendered as "Heading (EN)" / "Heading (KA)". */
  label: string;
  /** 'text' renders a single-line Input, 'textarea' a multi-line Textarea. */
  variant?: 'text' | 'textarea';
  valueEn: string;
  valueKa: string;
  onChangeEn: (value: string) => void;
  onChangeKa: (value: string) => void;
  className?: string;
}

/**
 * Side-by-side EN/KA input pair (stacked below `sm`) for editing bilingual
 * page-section content. Georgian is first-class per CLAUDE.md — when the
 * English side has content but Georgian is empty, a visible warning is shown
 * rather than silently letting an untranslated section ship. This never
 * blocks saving: a page can be drafted in English and translated later
 * (see `validateSection` in lib/page-sections.ts, which only requires EN).
 *
 * Contrast: the warning uses literal amber-800 text (#92400E) on an
 * amber-200 fill (#FDE68A) — ~7.5:1, comfortably above the 4.5:1 AA floor —
 * rather than a theme-driven color. It is deliberately NOT `bg-cobalt` or any
 * CSS-var-backed token: those are meant for the brand accent, which the
 * `/admin/theme` override can relift in dark mode (see CLAUDE.md's note that
 * the lifted dark-mode cobalt drops white text to ~3.6:1). A literal, fixed
 * amber pair renders identically in both themes, so its contrast never
 * depends on which theme — or which brand override — is active.
 */
export function BilingualField({
  id,
  label,
  variant = 'text',
  valueEn,
  valueKa,
  onChangeEn,
  onChangeKa,
  className,
}: BilingualFieldProps) {
  const showWarning = valueEn.trim().length > 0 && valueKa.trim().length === 0;
  const enId = `${id}-en`;
  const kaId = `${id}-ka`;
  const warningId = `${id}-ka-warning`;
  const Field = variant === 'textarea' ? Textarea : Input;

  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', className)}>
      <div className="space-y-1.5">
        <Label htmlFor={enId}>{label} (EN)</Label>
        <Field
          id={enId}
          value={valueEn}
          onChange={(e) => onChangeEn(e.target.value)}
          {...(variant === 'textarea' ? { rows: 3 } : {})}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={kaId}>{label} (KA)</Label>
        <Field
          id={kaId}
          value={valueKa}
          onChange={(e) => onChangeKa(e.target.value)}
          aria-describedby={showWarning ? warningId : undefined}
          aria-invalid={showWarning || undefined}
          className={showWarning ? 'border-amber-500 dark:border-amber-500' : undefined}
          {...(variant === 'textarea' ? { rows: 3 } : {})}
        />
        {showWarning && (
          <p
            id={warningId}
            role="alert"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
            style={{ backgroundColor: '#FDE68A', color: '#92400E' }}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Georgian translation missing
          </p>
        )}
      </div>
    </div>
  );
}
