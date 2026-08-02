'use client';

import * as React from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Auth-specific field. Taller and quieter than the shared shop `Input`:
 * the form is the whole page here, so the fields carry the layout.
 *
 * Errors are wired with aria-invalid + aria-describedby and rendered with an
 * icon, not colour alone — colour-only error state fails WCAG 1.4.1.
 */

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Rendered on the label row, right-aligned — e.g. "Forgot password?" */
  action?: React.ReactNode;
  /** Adds the show/hide toggle and drives the input type. */
  revealable?: boolean;
}

export const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, error, action, revealable, id, className, type, ...props }, ref) => {
    const [revealed, setRevealed] = React.useState(false);
    const autoId = React.useId();
    const fieldId = id ?? autoId;
    const errorId = `${fieldId}-error`;

    const resolvedType = revealable ? (revealed ? 'text' : 'password') : type;

    return (
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label
            htmlFor={fieldId}
            className="text-[0.8125rem] font-medium text-graphite"
          >
            {label}
          </label>
          {action}
        </div>

        <div className="relative">
          <input
            {...props}
            id={fieldId}
            ref={ref}
            type={resolvedType}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              'h-11 w-full rounded-lg border bg-surface-light px-3.5 text-[0.9375rem] text-ink transition-colors',
              'placeholder:text-graphite/50',
              /* Focus reads as the border going cobalt plus a tight halo,
                 rather than a detached offset ring — quieter, but still an
                 unmistakable keyboard target. */
              'focus:outline-none focus:border-cobalt focus:ring-4 focus:ring-cobalt/15',
              'dark:bg-white/[0.03] dark:text-white',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-error'
                : 'border-border-light hover:border-graphite/40 dark:border-white/10 dark:hover:border-white/20',
              revealable && 'pr-11',
              className
            )}
          />

          {revealable && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? 'Hide password' : 'Show password'}
              aria-pressed={revealed}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-graphite transition-colors hover:text-ink dark:hover:text-white"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>

        {error && (
          <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-xs text-error">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
    );
  }
);
AuthField.displayName = 'AuthField';
