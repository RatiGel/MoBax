'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Scroll-reveal wrapper. Fades + lifts children once as they enter the viewport.
 *
 * Content is VISIBLE BY DEFAULT and the reveal is a progressive enhancement:
 * the hidden state is only applied after JS confirms IntersectionObserver is
 * available and the element is still off-screen. Gating visibility on a
 * class/transition instead would strand the section blank anywhere the
 * observer never fires — prerender, headless/crawler renders, background tabs —
 * which is exactly how the featured-products grid shipped as an empty gap.
 *
 * Honors prefers-reduced-motion (renders static, no transform).
 * Keep it a leaf — wrap section content, not whole interactive trees.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // `armed` flips to true only once we know we can animate; until then the
  // element carries no transform/opacity at all, so SSR output is final.
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') return;

    // Already in view on mount (above the fold): leave it visible, no flash.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) return;

    setArmed(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' },
    );
    io.observe(el);

    // Safety net: if the observer somehow never fires (hidden tab that never
    // regains focus, exotic renderer), reveal anyway rather than stay blank.
    const failsafe = window.setTimeout(() => {
      setShown(true);
      io.disconnect();
    }, 2000);

    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  const hidden = armed && !shown;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? 'translateY(16px)' : 'none',
        transition: armed
          ? `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}s`
          : undefined,
        willChange: hidden ? 'opacity, transform' : undefined,
      }}
    >
      {children}
    </div>
  );
}
