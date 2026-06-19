'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface SearchResult {
  slug: string;
  nameEn: string;
  nameKa: string;
  price: number;
  image: string;
  brand: string;
}

export function SearchBar({ onNavigate }: { onNavigate?: () => void }) {
  const locale = useLocale();
  const t = useTranslations('search');
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced fetch.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&locale=${locale}`);
        const data = await res.json();
        setResults(Array.isArray(data.products) ? data.products.slice(0, 5) : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, locale]);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery('');
    onNavigate?.();
    router.push(href);
  }

  function submit() {
    const q = query.trim();
    if (!q) return;
    go(`/${locale}/search?q=${encodeURIComponent(q)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && results[active]) {
        go(`/${locale}/products/${results[active].slug}`);
      } else {
        submit();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('placeholder')}
          aria-label={t('title')}
          className="h-9 w-full rounded-full border border-white/20 bg-white/10 pl-9 pr-9 text-sm text-white placeholder:text-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl dark:border-border-dark dark:bg-surface-dark">
          {loading && results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">{t('noResults')}</p>
          ) : (
            <ul>
              {results.map((r, i) => {
                const name = locale === 'ka' ? r.nameKa : r.nameEn;
                return (
                  <li key={r.slug}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(`/${locale}/products/${r.slug}`)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        active === i
                          ? 'bg-neutral-100 dark:bg-primary'
                          : 'hover:bg-neutral-50 dark:hover:bg-primary/60'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.image}
                        alt={name}
                        className="h-10 w-10 flex-shrink-0 rounded object-cover bg-neutral-100"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {name}
                        </span>
                        <span className="block text-xs text-neutral-400">{r.brand}</span>
                      </span>
                      <span className="flex-shrink-0 text-sm font-semibold text-accent">
                        {formatPrice(r.price)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            onClick={submit}
            className="block w-full border-t border-neutral-100 bg-neutral-50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-neutral-600 hover:text-neutral-950 dark:border-border-dark dark:bg-primary dark:text-neutral-300 dark:hover:text-white"
          >
            {t('seeAll')} →
          </button>
        </div>
      )}
    </div>
  );
}
