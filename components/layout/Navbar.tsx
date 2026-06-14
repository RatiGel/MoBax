'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ShoppingCart, Search, X, Menu, ChevronDown, User } from 'lucide-react';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useCartStore } from '@/lib/store';
import { getParentCategories } from '@/lib/mock-data';

export function Navbar() {
  const locale = useLocale();
  const t = useTranslations('nav');
  const tCat = useTranslations('categories');
  const tHome = useTranslations('home');
  const [announcementClosed, setAnnouncementClosed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { getItemCount, openCart } = useCartStore();
  const itemCount = getItemCount();
  const parentCategories = getParentCategories();
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '?');

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement Bar */}
      {!announcementClosed && (
        <div className="bg-primary-dark text-white text-xs py-2.5 px-4 text-center relative">
          <p className="pr-8">
            🚚{' '}
            {locale === 'ka'
              ? 'უფასო მიწოდება ₾100-ზე მეტი შეკვეთებზე თბილისში'
              : 'Free shipping on orders over ₾100 in Tbilisi'}
            {' · '}
            <Link
              href={`/${locale}/products`}
              className="underline underline-offset-2 hover:text-accent transition-colors"
            >
              {tHome('heroShop')}
            </Link>
          </p>
          <button
            onClick={() => setAnnouncementClosed(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-primary dark:bg-surface-dark border-b border-primary-dark dark:border-border-dark">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-6">

            {/* Logo */}
            <Link href={`/${locale}`} className="flex-shrink-0 flex items-center">
              <span className="font-display text-2xl font-bold text-white tracking-tight">
                Mo
              </span>
              <span className="font-display text-2xl font-bold text-accent tracking-tight">
                Bax
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
              <Link
                href={`/${locale}/products`}
                className={`text-sm font-medium text-white/80 hover:text-white transition-colors underline-offset-8 decoration-accent decoration-2 ${isActive(`/${locale}/products`) ? 'underline text-white' : 'hover:underline'}`}
              >
                {t('products')}
              </Link>

              {/* Categories mega-menu */}
              <div
                className="relative"
                onMouseEnter={() => setCategoriesOpen(true)}
                onMouseLeave={() => setCategoriesOpen(false)}
              >
                <button className="flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white hover:underline underline-offset-8 decoration-accent decoration-2 transition-colors py-6">
                  {locale === 'ka' ? 'კატეგორიები' : 'Categories'}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {categoriesOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-[640px] animate-slide-down">
                    <div className="bg-white dark:bg-surface-dark border border-neutral-200 dark:border-border-dark shadow-2xl">
                      <div className="grid grid-cols-3 gap-px bg-neutral-100 dark:bg-neutral-800">
                        {parentCategories.map((cat) => {
                          const catName = locale === 'ka' ? cat.nameKa : cat.nameEn;
                          return (
                            <Link
                              key={cat.id}
                              href={`/${locale}/products?category=${cat.slug}`}
                              className="flex items-center gap-3 p-4 bg-white dark:bg-surface-dark hover:bg-neutral-50 dark:hover:bg-primary group transition-colors"
                            >
                              <div>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-neutral-950 dark:group-hover:text-white">
                                  {catName}
                                </p>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                  {cat.productCount} {locale === 'ka' ? 'ნივთი' : 'items'}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                      <div className="p-3 bg-neutral-50 dark:bg-primary border-t border-neutral-100 dark:border-border-dark">
                        <Link
                          href={`/${locale}/products`}
                          className="text-xs font-semibold uppercase tracking-widest text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors flex items-center gap-1"
                        >
                          {locale === 'ka' ? 'ყველა კატეგორია →' : 'View all categories →'}
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1">
              <button
                className="h-10 w-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>

              <LocaleSwitcher />
              <ThemeToggle />

              <button
                onClick={openCart}
                className="relative h-10 w-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                aria-label={t('cart')}
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-primary">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              <div className="hidden md:flex items-center ml-1">
                <Link
                  href={`/${locale}/login`}
                  className="h-10 w-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  aria-label={t('login')}
                >
                  <User className="h-5 w-5" />
                </Link>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden h-10 w-10 flex items-center justify-center text-white/90"
                aria-label={t('menu')}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-surface-dark border-b border-neutral-200 dark:border-border-dark animate-fade-in">
          <div className="px-4 py-6 space-y-1">
            <Link
              href={`/${locale}`}
              className="block py-3 text-sm font-medium text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-neutral-800"
              onClick={() => setMobileOpen(false)}
            >
              {t('home')}
            </Link>
            <Link
              href={`/${locale}/products`}
              className="block py-3 text-sm font-medium text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-neutral-800"
              onClick={() => setMobileOpen(false)}
            >
              {t('products')}
            </Link>
            <div className="pt-2 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2 px-0">
                {locale === 'ka' ? 'კატეგორიები' : 'Categories'}
              </p>
              {parentCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${locale}/products?category=${cat.slug}`}
                  className="flex items-center gap-3 py-2.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {locale === 'ka' ? cat.nameKa : cat.nameEn}
                </Link>
              ))}
            </div>
            <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <Link
                href={`/${locale}/login`}
                className="flex-1 py-2.5 text-center text-xs font-semibold uppercase tracking-widest border border-primary dark:border-accent text-primary dark:text-accent hover:bg-accent/10 dark:hover:bg-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {t('login')}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="flex-1 py-2.5 text-center text-xs font-semibold uppercase tracking-widest bg-primary dark:bg-accent text-white dark:text-primary hover:bg-primary-dark dark:hover:bg-accent-dark transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {t('register')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
