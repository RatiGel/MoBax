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
    // Sits on the light/dark navbar surface, not a dark bar — so the states use
    // theme tokens. The previous white-on-paper inactive state measured 1.04:1
    // and the navy-on-cobalt active state 2.57:1; both failed AA badly.
    <div className="flex items-center gap-1 rounded-lg border border-border-light dark:border-border-dark p-0.5">
      {(['en', 'ka'] as const).map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            onClick={() => switchLocale(code)}
            aria-current={active ? 'true' : undefined}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-[#2E5BFF] text-white'
                : 'text-graphite hover:text-ink dark:hover:text-white hover:bg-cloud-light dark:hover:bg-cloud-dark'
            }`}
          >
            <span aria-hidden>{code === 'en' ? '🇬🇧' : '🇬🇪'}</span>
            <span>{code.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
