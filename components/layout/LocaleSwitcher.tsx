'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';

/**
 * Segmented locale control with a sliding indicator.
 *
 * The indicator is one absolutely-positioned element that translates between
 * the two halves, rather than a background toggled on each button — the
 * movement is what tells you the two options are one switch, and it costs a
 * single transform instead of a cross-fade of two boxes.
 *
 * No flag emoji: they render as a different glyph on every OS, can't be
 * styled to match, and a flag is the wrong sign for a language anyway.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const codes = ['en', 'ka'] as const;
  const activeIndex = Math.max(0, codes.indexOf(locale as (typeof codes)[number]));

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    window.location.href = segments.join('/');
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="relative flex h-9 items-center rounded-full bg-ink/[0.05] p-[3px] dark:bg-white/[0.06]"
    >
      {/* Sliding indicator — a real surface, so the active locale reads as a
          raised chip rather than just darker text. */}
      <span
        aria-hidden
        className="absolute left-[3px] top-[3px] h-[30px] w-[calc(50%-3px)] rounded-full bg-surface-light shadow-[0_1px_2px_rgba(10,10,11,0.10),0_0_0_0.5px_rgba(10,10,11,0.04)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none dark:bg-white/[0.14] dark:shadow-none"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {codes.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            onClick={() => switchLocale(code)}
            aria-current={active ? 'true' : undefined}
            aria-label={code === 'en' ? 'English' : 'ქართული'}
            className={`relative z-10 flex h-[30px] w-[34px] items-center justify-center rounded-full text-[11px] font-semibold tracking-[0.06em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-1 focus-visible:ring-offset-paper dark:focus-visible:ring-offset-ink ${
              active
                ? 'text-ink dark:text-white'
                : 'text-graphite hover:text-ink dark:hover:text-white'
            }`}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
