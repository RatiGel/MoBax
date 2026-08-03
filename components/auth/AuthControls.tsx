'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Submit button.
 *
 * The fill is pinned to the literal #2E5BFF rather than `bg-cobalt`: dark mode
 * lifts the cobalt token to #5C7CFF, which puts white text at ~3.6:1 — under
 * the 4.5:1 floor. See the contrast note in CLAUDE.md.
 */
export function AuthSubmit({
  loading,
  loadingLabel,
  children,
}: {
  loading: boolean;
  loadingLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2E5BFF] text-[0.9375rem] font-medium text-white transition-colors hover:bg-[#2449CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-ink"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {loading ? loadingLabel : children}
    </button>
  );
}

/** Labelled rule between the credentials form and the OAuth path. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-border-light dark:bg-white/10" />
      <span className="text-xs text-graphite">{label}</span>
      <span className="h-px flex-1 bg-border-light dark:bg-white/10" />
    </div>
  );
}

/** Form-level failure (bad credentials, email taken). Icon + text, not colour alone. */
export function AuthAlert({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-error/25 bg-error/[0.06]',
        'px-3.5 py-2.5 text-[0.8125rem] text-error'
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

export function GoogleButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border-light bg-surface-light text-[0.9375rem] font-medium text-ink transition-colors hover:bg-cloud-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/[0.05] dark:focus-visible:ring-offset-ink"
    >
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      {label}
    </button>
  );
}
