/**
 * The single icon-button language for the navbar action cluster.
 *
 * Theme, cart, and account each used to carry their own size, hover colour,
 * and focus treatment, so four adjacent controls read as four unrelated
 * widgets. They share this now.
 *
 * The hover state is a filled circular plate that scales up from nothing
 * (via the ::before layer) rather than an instant background swap — the
 * plate growing under the cursor is what makes the control feel responsive
 * instead of merely highlighted. `active:scale-95` gives the press a floor.
 *
 * Focus is a rounded ring: the global :focus-visible outline is a hard
 * square that clipped the corners of these round targets.
 */
export const navIconButton = [
  'group relative flex h-9 w-9 items-center justify-center rounded-full',
  'text-ink/70 dark:text-white/70',
  'transition-[color,transform] duration-200',
  'hover:text-ink dark:hover:text-white active:scale-95',
  'motion-reduce:transition-none motion-reduce:active:scale-100',
  // growing hover plate, painted behind the glyph. The inset ring gives it the
  // same hairline material as the preferences rail, so a hovered cart reads as
  // a plate lifting out of the header rather than a flat grey wash.
  'before:absolute before:inset-0 before:rounded-full before:bg-ink/[0.06]',
  'before:ring-1 before:ring-inset before:ring-ink/[0.05]',
  'before:scale-75 before:opacity-0 before:transition-all before:duration-200',
  'before:ease-[cubic-bezier(0.16,1,0.3,1)]',
  'hover:before:scale-100 hover:before:opacity-100',
  'dark:before:bg-white/[0.09] dark:before:ring-white/[0.07]',
  'motion-reduce:before:transition-none motion-reduce:before:scale-100',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:focus-visible:ring-offset-ink',
].join(' ');

/** Glyph sits above the hover plate. */
export const navIconGlyph = 'relative h-[19px] w-[19px]';
