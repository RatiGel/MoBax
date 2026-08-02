'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { navIconButton } from './navIcon';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      className={navIconButton}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isDark}
    >
      {/* The two glyphs swap on a rotation, so the change reads as one object
          turning over rather than two icons cross-fading. The whole pair also
          nudges a few degrees on hover — a toggle should telegraph that it
          moves, otherwise it reads as another link next to the cart. */}
      <span className="relative flex h-[19px] w-[19px] items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-[18deg] motion-reduce:transition-none motion-reduce:group-hover:rotate-0">
        <Sun
          className="absolute h-[19px] w-[19px] rotate-0 scale-100 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] dark:-rotate-90 dark:scale-0 motion-reduce:transition-none"
          strokeWidth={1.75}
        />
        <Moon
          className="absolute h-[19px] w-[19px] rotate-90 scale-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] dark:rotate-0 dark:scale-100 motion-reduce:transition-none"
          strokeWidth={1.75}
        />
      </span>
    </button>
  );
}
