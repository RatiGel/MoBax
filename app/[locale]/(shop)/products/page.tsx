'use client';

import { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SlidersHorizontal, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductCard } from '@/components/shop/ProductCard';
import {
  products,
  getParentCategories,
  getSubcategories,
  type CategorySlug,
} from '@/lib/mock-data';

export default function ProductsPage() {
  const locale = useLocale();
  const t = useTranslations('products');
  const tCat = useTranslations('categories');

  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | 'all'>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<CategorySlug>>(new Set());

  const parentCategories = getParentCategories();

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))),
    []
  );

  const filtered = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== 'all') {
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
  }, [selectedCategory, selectedBrand, sortBy]);

  function toggleParent(slug: CategorySlug) {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  const activeFilters = [
    selectedCategory !== 'all' && { key: 'category', label: tCat(selectedCategory) },
    selectedBrand !== 'all' && { key: 'brand', label: selectedBrand },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

      {/* Page header */}
      <div className="mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-8">
        <h1 className="font-display text-3xl font-bold text-neutral-950 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {t('showing', { count: filtered.length })}
        </p>
      </div>

      {/* Sort + mobile filter toggle */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-neutral-700 dark:text-neutral-300"
            >
              {f.label}
              <button
                onClick={() => {
                  if (f.key === 'category') setSelectedCategory('all');
                  if (f.key === 'brand') setSelectedBrand('all');
                }}
                className="text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {activeFilters.length > 0 && (
            <button
              onClick={() => { setSelectedCategory('all'); setSelectedBrand('all'); }}
              className="text-xs text-neutral-400 hover:text-neutral-950 dark:hover:text-white underline underline-offset-2"
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
            <SelectTrigger className="w-48 text-xs">
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

      <div className="flex gap-10">
        {/* Sidebar */}
        <aside className={`w-56 flex-shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>

          {/* Category tree */}
          <div className="mb-8">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-900 dark:text-neutral-100 mb-4">
              {t('category')}
            </h3>
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-primary text-white dark:bg-accent dark:text-primary font-medium'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
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
                    <div className="flex items-center">
                      <button
                        onClick={() => setSelectedCategory(parent.slug)}
                        className={`flex-1 text-left px-3 py-2 text-sm font-medium transition-colors ${
                          isParentActive || isSubActive
                            ? 'bg-primary text-white dark:bg-accent dark:text-primary'
                            : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {parentName}
                      </button>
                      <button
                        onClick={() => toggleParent(parent.slug)}
                        className={`px-2 py-2 transition-colors ${
                          isParentActive || isSubActive
                            ? 'bg-primary text-white dark:bg-accent dark:text-primary hover:bg-primary-dark dark:hover:bg-accent-dark'
                            : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>

                    {isExpanded && subs.length > 0 && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-neutral-200 dark:border-neutral-700 pl-2">
                        {subs.map((sub) => {
                          const subName = locale === 'ka' ? sub.nameKa : sub.nameEn;
                          return (
                            <button
                              key={sub.slug}
                              onClick={() => setSelectedCategory(sub.slug)}
                              className={`w-full text-left px-2 py-1.5 text-xs transition-colors ${
                                selectedCategory === sub.slug
                                  ? 'bg-accent/10 dark:bg-primary text-primary dark:text-accent font-semibold'
                                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
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
              <p className="font-medium text-neutral-700 dark:text-neutral-300 mb-6">
                {t('noResults')}
              </p>
              <Button
                variant="outline"
                onClick={() => { setSelectedCategory('all'); setSelectedBrand('all'); }}
              >
                {t('clearFilters')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
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
