import Link from 'next/link';

/**
 * Single centered column. No side panel, no card chrome, no ornament — the
 * form sits directly on the page background so nothing competes with the
 * fields. The only structure is vertical rhythm and one accent colour.
 */

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Bottom line: "Don't have an account? Register" */
  footerText: string;
  footerLinkLabel: string;
  footerHref: string;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footerText,
  footerLinkLabel,
  footerHref,
}: AuthShellProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-paper px-5 py-16 dark:bg-ink sm:py-24">
      <div className="w-full max-w-[22rem] animate-fade-up">
        <header className="mb-9">
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-display text-ink dark:text-white">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-graphite">{subtitle}</p>
        </header>

        {children}

        <p className="mt-8 text-center text-sm text-graphite">
          {footerText}{' '}
          <Link
            href={footerHref}
            className="font-medium text-amber-ink underline-offset-4 hover:underline"
          >
            {footerLinkLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
