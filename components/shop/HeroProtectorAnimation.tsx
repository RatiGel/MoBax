'use client';

import { useState, useEffect } from 'react';

export function HeroProtectorAnimation() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((n) => (n + 1) % 3), 2000);
    return () => clearInterval(id);
  }, []);

  const rings = [
    { size: 'w-64 h-64', delay: 'delay-0', opacity: 'opacity-20' },
    { size: 'w-80 h-80', delay: 'delay-150', opacity: 'opacity-10' },
    { size: 'w-96 h-96', delay: 'delay-300', opacity: 'opacity-5' },
  ];

  const features = ['Screen Protection', 'Drop Shield', 'Anti-Scratch'];

  return (
    <div className="relative flex items-center justify-center w-full h-full min-h-[420px]">
      {/* Pulsing rings */}
      {rings.map((r, i) => (
        <div
          key={i}
          className={`absolute rounded-full border border-white/30 ${r.size} ${r.opacity} animate-ping ${r.delay}`}
          style={{ animationDuration: '3s' }}
        />
      ))}

      {/* Phone mockup */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative">
          {/* Phone body */}
          <div className="w-36 h-64 rounded-[2.5rem] bg-gradient-to-b from-white/20 to-white/5 border-2 border-white/40 backdrop-blur-sm shadow-2xl flex flex-col items-center justify-center gap-3 px-4">
            {/* Notch */}
            <div className="absolute top-4 w-16 h-5 rounded-full bg-black/40" />

            {/* Screen content */}
            <div className="mt-6 w-full space-y-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-2 rounded-full bg-white/30"
                  style={{ width: `${[80, 60, 70][n - 1]}%` }}
                />
              ))}
            </div>

            {/* Shield icon center */}
            <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
            </div>

            {/* Bottom bar */}
            <div className="absolute bottom-4 w-10 h-1 rounded-full bg-white/40" />
          </div>

          {/* Case overlay — animated */}
          <div
            className="absolute inset-0 rounded-[2.5rem] border-4 border-white/60 transition-all duration-700"
            style={{
              boxShadow: '0 0 30px rgba(255,255,255,0.15)',
              opacity: 0.7 + active * 0.1,
            }}
          />
        </div>

        {/* Feature labels */}
        <div className="mt-8 flex flex-col items-center gap-2">
          {features.map((f, i) => (
            <div
              key={f}
              className={`text-xs font-semibold uppercase tracking-widest transition-all duration-500 ${
                active === i ? 'text-white opacity-100' : 'text-white/40 opacity-60'
              }`}
            >
              {active === i && (
                <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 align-middle" />
              )}
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
