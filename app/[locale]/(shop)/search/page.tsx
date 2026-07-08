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
      <div className="mb-10 border-b border-border-light dark:border-border-dark pb-8">
        <h1 className="font-display font-semibold tracking-display text-3xl text-ink dark:text-white">
          {t('title')}
        </h1>
        {query && (
          <p className="text-sm text-graphite mt-1.5">{t('resultsFor', { query })}</p>
        )}
      </div>

      {!query ? (
        <div className="py-24 text-center text-graphite">
          <Search className="mx-auto mb-4 h-10 w-10" />
          <p className="text-sm">{t('prompt')}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square rounded-2xl bg-cloud-light dark:bg-cloud-dark" />
              <div className="mt-4 h-3 w-2/3 rounded bg-cloud-light dark:bg-cloud-dark" />
              <div className="mt-2 h-3 w-1/3 rounded bg-cloud-light dark:bg-cloud-dark" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="py-24 text-center">
          <p className="mb-6 text-5xl">🔍</p>
          <p className="font-medium text-graphite">{t('noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
          {results.map((p) => {
            const name = locale === 'ka' ? p.nameKa : p.nameEn;
            return (
              <Link
                key={p.slug}
                href={`/${locale}/products/${p.slug}`}
                className="group block"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-cloud-light dark:bg-cloud-dark transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-ink/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt={name}
                    className="h-full w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                  />
                </div>
                <div className="pt-3.5 pb-5 px-0.5">
                  <p className="mb-1 text-[11px] font-medium tracking-wide text-graphite">
                    {p.brand}
                  </p>
                  <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-snug text-ink dark:text-neutral-100">
                    {name}
                  </h3>
                  <span className="text-base font-semibold text-ink dark:text-white tabular-nums">{formatPrice(p.price)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
