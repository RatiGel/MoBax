'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPath = segments.join('/');
    startTransition(() => {
      router.replace(newPath);
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/25 p-0.5">
      <button
        onClick={() => switchLocale('en')}
        disabled={isPending}
        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
          locale === 'en'
            ? 'bg-accent text-primary'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
      <button
        onClick={() => switchLocale('ka')}
        disabled={isPending}
        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
          locale === 'ka'
            ? 'bg-accent text-primary'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <span>🇬🇪</span>
        <span>KA</span>
      </button>
    </div>
  );
}
