import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  loading,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {value}
              </p>
            )}
            {hint && !loading && <p className="text-xs text-neutral-400">{hint}</p>}
          </div>
          {Icon && (
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                accent
                  ? 'bg-accent/15 text-accent'
                  : 'bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent'
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
