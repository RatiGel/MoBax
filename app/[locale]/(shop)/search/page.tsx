'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface SearchResult {
  slug: string;
  nameEn: string;
  nameKa: string;
  price: number;
  image: string;
  brand: string;
}

export default function SearchPage() {
  // useSearchParams requires a Suspense boundary to avoid a CSR-bailout build error.
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const locale = useLocale();
  const t = useTranslations('search');
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&locale=${locale}`);
        const data = await res.json();
        if (!cancelled) setResults(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, locale]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-8">
        <h1 className="font-display text-3xl font-bold text-neutral-950 dark:text-white">
          {t('title')}
        </h1>
        {query && (
          <p className="text-sm text-neutral-500 mt-1">{t('resultsFor', { query })}</p>
        )}
      </div>

      {!query ? (
        <div className="py-24 text-center text-neutral-400">
          <Search className="mx-auto mb-4 h-10 w-10" />
          <p className="text-sm">{t('prompt')}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-neutral-100 dark:bg-neutral-900" />
              <div className="mt-4 h-3 w-2/3 bg-neutral-100 dark:bg-neutral-900" />
              <div className="mt-2 h-3 w-1/3 bg-neutral-100 dark:bg-neutral-900" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="py-24 text-center">
          <p className="mb-6 text-5xl">🔍</p>
          <p className="font-medium text-neutral-700 dark:text-neutral-300">{t('noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {results.map((p) => {
            const name = locale === 'ka' ? p.nameKa : p.nameEn;
            return (
              <Link
                key={p.slug}
                href={`/${locale}/products/${p.slug}`}
                className="group block"
              >
                <div className="relative aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt={name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="pt-4 pb-5">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                    {p.brand}
                  </p>
                  <h3 className="mb-2.5 line-clamp-2 text-sm font-medium leading-5 text-primary dark:text-neutral-100">
                    {name}
                  </h3>
                  <span className="text-base font-bold text-accent">{formatPrice(p.price)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
