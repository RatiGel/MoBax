'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type RangePreset = '7d' | '30d' | '90d' | 'custom';

export interface DateRangeValue {
  preset: RangePreset;
  from?: string;
  to?: string;
}

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom' },
];

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-md border border-border-light dark:border-border-dark overflow-hidden">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange({ ...value, preset: p.value })}
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-colors',
              value.preset === p.value
                ? 'bg-primary text-white dark:bg-accent dark:text-primary'
                : 'bg-surface-light dark:bg-surface-dark text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={value.from ?? ''}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="w-auto"
          />
          <span className="text-neutral-400">→</span>
          <Input
            type="date"
            value={value.to ?? ''}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="w-auto"
          />
        </div>
      )}
    </div>
  );
}

/** Build query string for analytics endpoints from a range value. */
export function rangeToQuery(v: DateRangeValue): string {
  if (v.preset === 'custom' && v.from && v.to) {
    return `from=${v.from}&to=${v.to}`;
  }
  return `range=${v.preset === 'custom' ? '30d' : v.preset}`;
}
