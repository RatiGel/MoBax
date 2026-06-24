'use client';

import { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel: string;
  afterLabel: string;
  beforeAlt?: string;
  afterAlt?: string;
  /** Fired once when the user drags the slider past `threshold` toward the left and releases. */
  onDragPastLeft?: () => void;
  /** Percent (0–100) below which onDragPastLeft fires on release. Default 6. */
  threshold?: number;
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
  beforeAlt = 'Before',
  afterAlt = 'After',
  onDragPastLeft,
  threshold = 6,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50); // percent
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const positionRef = useRef(50);
  const firedRef = useRef(false);

  // Throttle position updates to one per animation frame for smooth dragging.
  const updatePosition = useCallback((clientX: number) => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      positionRef.current = pct;
      setPosition(pct);
    });
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      draggingRef.current = true;
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const onPointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (!firedRef.current && positionRef.current <= threshold) {
      firedRef.current = true;
      onDragPastLeft?.();
    }
  }, [threshold, onDragPastLeft]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setPosition((p) => {
          const next = Math.max(0, p - 4);
          positionRef.current = next;
          if (!firedRef.current && next <= threshold) {
            firedRef.current = true;
            onDragPastLeft?.();
          }
          return next;
        });
      }
      if (e.key === 'ArrowRight') {
        setPosition((p) => {
          const next = Math.min(100, p + 4);
          positionRef.current = next;
          return next;
        });
      }
    },
    [threshold, onDragPastLeft]
  );

  // Smooth easing applied only when not actively dragging (keyboard / release snap).
  const ease = dragging ? '' : 'transition-[clip-path] duration-200 ease-out';
  const easeLine = dragging ? '' : 'transition-[left] duration-200 ease-out';

  return (
    <div
      ref={containerRef}
      className="group relative w-full aspect-[2/1] overflow-hidden rounded-3xl select-none touch-none cursor-ew-resize bg-cloud-light dark:bg-cloud-dark"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* After image (base layer) */}
      <img src={afterSrc} alt={afterAlt} className="absolute inset-0 h-full w-full object-cover" draggable={false} />

      {/* Before image (clipped layer) */}
      <div
        className={`absolute inset-0 ${ease}`}
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img src={beforeSrc} alt={beforeAlt} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      </div>

      {/* Labels */}
      <span className="absolute top-5 left-5 bg-ink/85 backdrop-blur text-white text-xs font-medium px-3.5 py-1.5 rounded-full pointer-events-none">
        {beforeLabel}
      </span>
      <span className="absolute top-5 right-5 bg-ink/85 backdrop-blur text-white text-xs font-medium px-3.5 py-1.5 rounded-full pointer-events-none">
        {afterLabel}
      </span>

      {/* Divider line + handle */}
      <div
        className={`absolute top-0 bottom-0 w-px bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.25)] ${easeLine}`}
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <button
          type="button"
          aria-label="Drag to compare"
          role="slider"
          aria-valuenow={Math.round(position)}
          aria-valuemin={0}
          aria-valuemax={100}
          onKeyDown={onKeyDown}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white shadow-xl flex items-center justify-center text-ink ring-1 ring-black/5 transition-transform duration-200 hover:scale-105 active:scale-95 group-active:scale-95 focus:outline-none focus:ring-2 focus:ring-cobalt cursor-ew-resize"
        >
          <ChevronLeft className="h-4 w-4 -mr-1" strokeWidth={2.5} />
          <ChevronRight className="h-4 w-4 -ml-1" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
