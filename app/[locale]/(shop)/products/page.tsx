'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { SlidersHorizontal, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductCard } from '@/components/shop/ProductCard';
import {
  products,
  brands as brandRegistry,
  getProductsByBrand,
  getBrandBySlug,
  getParentCategories,
  getSubcategories,
  getPopularProducts,
  type CategorySlug,
} from '@/lib/mock-data';

export default function ProductsPage() {
  // useSearchParams requires a Suspense boundary to avoid a CSR-bailout build error.
  return (
    <Suspense fallback={null}>
      <ProductsPageInner />
    </Suspense>
  );
}

function ProductsPageInner() {
  const locale = useLocale();
  const t = useTranslations('products');
  const tCat = useTranslations('categories');
  const searchParams = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | 'all'>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  // brandLanding = the brand chosen from the Brands menu (smart maker-OR-compat match)
  const [brandLanding, setBrandLanding] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<CategorySlug>>(new Set());

  // Sync filters from URL (?brand= / ?category=) — supports nav + home links.
  useEffect(() => {
    const brand = searchParams.get('brand');
    const category = searchParams.get('category');
    setBrandLanding(brand && getBrandBySlug(brand) ? brand : null);
    setSelectedCategory((category as CategorySlug) || 'all');
    setSelectedBrand('all');
  }, [searchParams]);

  const parentCategories = getParentCategories();

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))),
    []
  );

  const activeBrand = brandLanding ? getBrandBySlug(brandLanding) : null;

  const filtered = useMemo(() => {
    // Base set: a brand landing narrows to brand-associated products; else everything.
    let result = brandLanding ? getProductsByBrand(brandLanding) : [...products];

    if (selectedCategory === 'most-popular') {
      // Virtual category — top products ranked by review volume × rating.
      const popularIds = new Set(getPopularProducts().map((p) => p.id));
      result = result.filter((p) => popularIds.has(p.id));
    } else if (selectedCategory !== 'all') {
      const subs = getSubcategories(selectedCategory);
      if (subs.length > 0) {
        const subSlugs = subs.map((s) => s.slug);
        result = result.filter((p) => subSlugs.includes(p.category));
      } else {
        result = result.filter((p) => p.category === selectedCategory);
      }
    }

    if (selectedBrand !== 'all') result = result.filter((p) => p.brand === selectedBrand);

    switch (sortBy) {
      case 'priceAsc': result.sort((a, b) => a.price - b.price); break;
      case 'priceDesc': result.sort((a, b) => b.price - a.price); break;
      case 'popular': result.sort((a, b) => b.reviewCount - a.reviewCount); break;
    }
    return result;
  }, [brandLanding, selectedCategory, selectedBrand, sortBy]);

  function toggleParent(slug: CategorySlug) {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  const activeFilters = [
    activeBrand && { key: 'brandLanding', label: activeBrand.name },
    selectedCategory !== 'all' && { key: 'category', label: tCat(selectedCategory) },
    selectedBrand !== 'all' && { key: 'brand', label: selectedBrand },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-paper dark:bg-ink">

      {/* Page header */}
      <div className="mb-10 border-b border-border-light dark:border-border-dark pb-8">
        {activeBrand && (
          <p className="text-xs font-medium text-cobalt dark:text-cobalt-dark mb-2">
            {activeBrand.type === 'device'
              ? (locale === 'ka' ? 'აქსესუარები' : 'Accessories for')
              : (locale === 'ka' ? 'ბრენდი' : 'Brand')}
          </p>
        )}
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-display text-ink dark:text-white">
          {activeBrand ? activeBrand.name : t('title')}
        </h1>
        <p className="text-sm text-graphite mt-2">
          {t('showing', { count: filtered.length })}
        </p>
      </div>

      {/* Sort + mobile filter toggle */}
      <div className="flex items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full border border-border-light dark:border-border-dark px-3.5 py-1.5 text-graphite transition-colors"
            >
              {f.label}
              <button
                onClick={() => {
                  if (f.key === 'brandLanding') setBrandLanding(null);
                  if (f.key === 'category') setSelectedCategory('all');
                  if (f.key === 'brand') setSelectedBrand('all');
                }}
                className="text-graphite hover:text-ink dark:hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {activeFilters.length > 0 && (
            <button
              onClick={() => { setBrandLanding(null); setSelectedCategory('all'); setSelectedBrand('all'); }}
              className="text-xs text-graphite hover:text-ink dark:hover:text-white underline underline-offset-2 transition-colors"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            {t('filters')}
          </Button>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 text-xs rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('sortOptions.newest')}</SelectItem>
              <SelectItem value="priceAsc">{t('sortOptions.priceAsc')}</SelectItem>
              <SelectItem value="priceDesc">{t('sortOptions.priceDesc')}</SelectItem>
              <SelectItem value="popular">{t('sortOptions.popular')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-12">
        {/* Sidebar */}
        <aside className={`w-56 flex-shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>

          {/* Category tree */}
          <div className="mb-10">
            <h3 className="text-xs font-medium text-graphite mb-4">
              {t('category')}
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left rounded-full px-3.5 py-2 text-sm transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-ink text-white dark:bg-white dark:text-ink font-medium'
                    : 'text-graphite hover:bg-cloud-light dark:hover:bg-cloud-dark'
                }`}
              >
                {tCat('all')}
              </button>

              {parentCategories.map((parent) => {
                const subs = getSubcategories(parent.slug);
                const isExpanded = expandedParents.has(parent.slug);
                const parentName = locale === 'ka' ? parent.nameKa : parent.nameEn;
                const isParentActive = selectedCategory === parent.slug;
                const isSubActive = subs.some((s) => s.slug === selectedCategory);

                return (
                  <div key={parent.slug}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedCategory(parent.slug)}
                        className={`flex-1 text-left rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                          isParentActive || isSubActive
                            ? 'bg-ink text-white dark:bg-white dark:text-ink'
                            : 'text-ink dark:text-white hover:bg-cloud-light dark:hover:bg-cloud-dark'
                        }`}
                      >
                        {parentName}
                      </button>
                      {subs.length > 0 && (
                        <button
                          onClick={() => toggleParent(parent.slug)}
                          className={`rounded-full px-2 py-2 transition-colors ${
                            isParentActive || isSubActive
                              ? 'text-ink dark:text-white hover:bg-cloud-light dark:hover:bg-cloud-dark'
                              : 'text-graphite hover:bg-cloud-light dark:hover:bg-cloud-dark'
                          }`}
                        >
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />
                          }
                        </button>
                      )}
                    </div>

                    {isExpanded && subs.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-border-light dark:border-border-dark pl-3">
                        {subs.map((sub) => {
                          const subName = locale === 'ka' ? sub.nameKa : sub.nameEn;
                          return (
                            <button
                              key={sub.slug}
                              onClick={() => setSelectedCategory(sub.slug)}
                              className={`w-full text-left rounded-full px-3 py-1.5 text-xs transition-colors ${
                                selectedCategory === sub.slug
                                  ? 'bg-cobalt-soft text-cobalt dark:bg-cloud-dark dark:text-cobalt-dark font-medium'
                                  : 'text-graphite hover:bg-cloud-light dark:hover:bg-cloud-dark'
                              }`}
                            >
                              {subName}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Brand filter */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-900 dark:text-neutral-100 mb-4">
              {t('brand')}
            </h3>
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedBrand('all')}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  selectedBrand === 'all'
                    ? 'bg-primary text-white dark:bg-accent dark:text-primary font-medium'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {locale === 'ka' ? 'ყველა ბრენდი' : 'All Brands'}
              </button>
              {brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    selectedBrand === brand
                      ? 'bg-primary text-white dark:bg-accent dark:text-primary font-medium'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-5xl mb-6">🔍</p>
              <p className="font-medium text-graphite mb-6">
                {t('noResults')}
              </p>
              <Button
                variant="outline"
                className="rounded-full font-semibold"
                onClick={() => { setBrandLanding(null); setSelectedCategory('all'); setSelectedBrand('all'); }}
              >
                {t('clearFilters')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
