'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { navIconButton } from './navIcon';

/**
 * Single-button locale toggle.
 *
 * With exactly two locales a segmented control is the wrong instrument: it
 * spent ~112px — three times any other control in the action cluster — to
 * show one state the user already knows (the page they are reading) next to
 * one they can reach in a tap. It was the widest thing in the 68px row, and
 * on a 360px phone it crowded out the account avatar entirely.
 *
 * The button shows the language you would switch *to*, not the current one.
 * That makes the label and the action the same thing: tap "EN" and you get
 * English. Showing the active locale instead would read as a status display
 * and leave the tap target ambiguous.
 *
 * No flag emoji: they render as a different glyph on every OS, can't be
 * styled to match, and a flag is the wrong sign for a language anyway.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const target = locale === 'ka' ? 'en' : 'ka';
  // Full name in the accessible label — "EN" alone is not a language to a
  // screen reader, and the visible glyph is already the terse form.
  const targetName = target === 'en' ? 'English' : 'ქართული';

  function switchLocale() {
    const segments = pathname.split('/');
    segments[1] = target;
    // Carry the query across: `pathname` drops it, so switching language on a
    // filtered listing (/products?brand=apple) used to silently reset the
    // filters and drop the shopper on the unfiltered page.
    //
    // Read from `window.location` inside the handler rather than with
    // useSearchParams(). That hook opts every page containing this navbar out
    // of static prerendering unless it sits in a Suspense boundary — it broke
    // the build for all 22 storefront routes. A click handler only ever runs
    // in the browser, so there is nothing to bail out of.
    window.location.href = segments.join('/') + window.location.search;
  }

  return (
    <button
      onClick={switchLocale}
      className={navIconButton}
      lang={target}
      aria-label={`Switch to ${targetName}`}
      title={targetName}
    >
      {/* Tracking, not tabular-nums: these are letters. The tight leading keeps
          the two glyphs optically centred in the 36px circle. */}
      <span className="relative text-[11px] font-semibold leading-none tracking-[0.06em]">
        {target.toUpperCase()}
      </span>
    </button>
  );
}
