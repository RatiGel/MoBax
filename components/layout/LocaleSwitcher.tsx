'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    window.location.href = segments.join('/');
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/25 p-0.5">
      <button
        onClick={() => switchLocale('en')}
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
