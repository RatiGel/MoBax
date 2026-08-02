'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import { ShoppingCart, X, Menu, ChevronDown, LayoutDashboard } from 'lucide-react';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { AccountMenu } from './AccountMenu';
import { navIconButton, navIconGlyph } from './navIcon';
import { SearchBar } from '@/components/shop/SearchBar';
import { useCartStore } from '@/lib/store';
import { getParentCategories, brands } from '@/lib/mock-data';
import { canSeeAdminPanel } from '@/lib/rbac';
import type { UserRole } from '@/models/User';

export interface NavbarBranding {
  storeName: string;
  logoUrl: string;
  announcement: string;
}

export function Navbar({ branding }: { branding?: NavbarBranding }) {
  const locale = useLocale();
  const t = useTranslations('nav');
  const tCat = useTranslations('categories');
  const tHome = useTranslations('home');
  const [announcementClosed, setAnnouncementClosed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const deviceBrands = brands.filter((b) => b.type === 'device');
  const makerBrands = brands.filter((b) => b.type === 'maker');
  const { getItemCount, openCart } = useCartStore();
  // Cart count comes from a localStorage-persisted store — defer to after mount
  // so server and first client render agree (avoids hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const itemCount = mounted ? getItemCount() : 0;
  const { data: session } = useSession();
  const isAuthed = !!session?.user;
  const isAdmin = canSeeAdminPanel(
    session?.user?.email,
    session?.user?.role as UserRole | undefined,
  );
  // "most-popular" is a /products filter, not a real category — keep it out of nav.
  const parentCategories = getParentCategories().filter((c) => c.slug !== 'most-popular');
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '?');

  // Branding from the admin Theme page (falls back to the built-in MoBax brand).
  const storeName = branding?.storeName?.trim() || 'MoBax';
  const logoUrl = branding?.logoUrl?.trim() || '/images/logo.png';
  // Split the wordmark so the trailing syllable picks up the accent color
  // (e.g. "Mo" + "Bax"). Used only when no logo image is set.
  const logoHead = storeName.length > 2 ? storeName.slice(0, -3) : storeName;
  const logoTail = storeName.length > 2 ? storeName.slice(-3) : '';
  const announcement = branding?.announcement?.trim() || '';

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement Bar */}
      {!announcementClosed && (
        <div className="bg-ink text-white text-xs py-2.5 px-4 text-center relative dark:bg-cloud-dark">
          <p className="pr-8">
            {announcement
              ? announcement
              : locale === 'ka'
                ? 'უფასო მიწოდება ₾100-ზე მეტი შეკვეთებზე თბილისში'
                : 'Free shipping on orders over ₾100 in Tbilisi'}
            {' · '}
            <Link
              href={`/${locale}/products`}
              className="text-cobalt-dark hover:text-white transition-colors font-medium underline-offset-2 hover:underline"
            >
              {tHome('heroShop')}
            </Link>
          </p>
          <button
            onClick={() => setAnnouncementClosed(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Header — translucent glass */}
      <div className="bg-paper/80 dark:bg-ink/80 backdrop-blur-xl border-b border-border-light dark:border-border-dark">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[68px] items-center justify-between gap-3 lg:gap-6">

            {/* Logo — admin logo image if set, else the wordmark */}
            <Link href={`/${locale}`} className="flex-shrink-0 flex items-center group">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={storeName} className="h-8 w-auto max-w-[160px] object-contain" />
              ) : (
                <span className="font-display text-2xl font-semibold tracking-display">
                  <span className="text-ink dark:text-white">{logoHead}</span>
                  <span className="text-cobalt dark:text-cobalt-dark">{logoTail}</span>
                </span>
              )}
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-7 flex-1 justify-center">
              {/* Brands mega-menu */}
              <div
                className="relative"
                onMouseEnter={() => setBrandsOpen(true)}
                onMouseLeave={() => setBrandsOpen(false)}
              >
                <button className="flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-ink dark:hover:text-white transition-colors py-6">
                  {locale === 'ka' ? 'ბრენდები' : 'Brands'}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${brandsOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {brandsOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-[420px] animate-slide-down pt-2">
                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-2xl shadow-ink/10 rounded-2xl overflow-hidden p-2">
                      <p className="px-3 pt-2 pb-1.5 text-[11px] font-medium tracking-wide text-graphite">
                        {locale === 'ka' ? 'მოწყობილობის ბრენდი' : 'Shop by device'}
                      </p>
                      <div className="grid grid-cols-2 gap-px">
                        {deviceBrands.map((b) => (
                          <Link
                            key={b.slug}
                            href={`/${locale}/products?brand=${b.slug}`}
                            className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink dark:text-neutral-100 hover:bg-cobalt-soft hover:text-cobalt dark:hover:bg-cloud-dark dark:hover:text-cobalt-dark transition-colors"
                          >
                            {b.name}
                          </Link>
                        ))}
                      </div>
                      <p className="px-3 pt-3 pb-1.5 text-[11px] font-medium tracking-wide text-graphite">
                        {locale === 'ka' ? 'აქსესუარების ბრენდი' : 'Accessory brands'}
                      </p>
                      <div className="grid grid-cols-2 gap-px">
                        {makerBrands.map((b) => (
                          <Link
                            key={b.slug}
                            href={`/${locale}/products?brand=${b.slug}`}
                            className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink dark:text-neutral-100 hover:bg-cobalt-soft hover:text-cobalt dark:hover:bg-cloud-dark dark:hover:text-cobalt-dark transition-colors"
                          >
                            {b.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Categories mega-menu */}
              <div
                className="relative"
                onMouseEnter={() => setCategoriesOpen(true)}
                onMouseLeave={() => setCategoriesOpen(false)}
              >
                <button className="flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-ink dark:hover:text-white transition-colors py-6">
                  {locale === 'ka' ? 'კატეგორიები' : 'Categories'}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {categoriesOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-[640px] animate-slide-down pt-2">
                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-2xl shadow-ink/10 rounded-2xl overflow-hidden">
                      <div className="grid grid-cols-3 gap-px bg-border-light dark:bg-border-dark">
                        {parentCategories.map((cat) => {
                          const catName = locale === 'ka' ? cat.nameKa : cat.nameEn;
                          return (
                            <Link
                              key={cat.id}
                              href={`/${locale}/products?category=${cat.slug}`}
                              className="flex items-center gap-3 p-4 bg-surface-light dark:bg-surface-dark hover:bg-cobalt-soft dark:hover:bg-cloud-dark group transition-colors"
                            >
                              <div>
                                <p className="text-sm font-semibold text-ink dark:text-neutral-100 group-hover:text-cobalt dark:group-hover:text-cobalt-dark transition-colors">
                                  {catName}
                                </p>
                                <p className="text-xs text-graphite mt-0.5">
                                  {cat.productCount} {locale === 'ka' ? 'ნივთი' : 'items'}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                      <div className="p-3.5 bg-cloud-light dark:bg-cloud-dark border-t border-border-light dark:border-border-dark">
                        <Link
                          href={`/${locale}/products`}
                          className="text-xs font-semibold text-cobalt dark:text-cobalt-dark hover:opacity-70 transition-opacity flex items-center gap-1"
                        >
                          {locale === 'ka' ? 'ყველა კატეგორია →' : 'View all categories →'}
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Services */}
              <Link
                href={`/${locale}/services`}
                className={`py-6 text-sm font-medium transition-colors ${
                  isActive(`/${locale}/services`)
                    ? 'text-ink dark:text-white'
                    : 'text-graphite hover:text-ink dark:hover:text-white'
                }`}
              >
                {locale === 'ka' ? 'სერვისები' : 'Services'}
              </Link>
            </nav>

            {/* Search (desktop) — min-w-0 so it absorbs the squeeze instead of
                pushing the action cluster past the viewport at ~768px. */}
            <div className="hidden md:block w-full min-w-0 max-w-xs flex-shrink">
              <SearchBar />
            </div>

            {/* Right Actions — two groups: preferences (language, theme) sit
                together inside one recessed rail; the things you act on (cart,
                account) float free to its right. A hairline divider was doing
                this job before, but a shared container is what actually makes
                the toggles read as settings rather than peers of the cart. */}
            <div className="flex flex-shrink-0 items-center gap-2">
              {/* The rail surface only appears at sm+; below that its padding
                  costs more width than the grouping is worth, so the two
                  controls stand alone. One instance either way — rendering the
                  pair twice would duplicate the language group in the a11y
                  tree. */}
              <div className="flex items-center gap-0.5 sm:rounded-full sm:bg-ink/[0.025] sm:p-0.5 sm:ring-1 sm:ring-inset sm:ring-ink/[0.05] dark:sm:bg-white/[0.03] dark:sm:ring-white/[0.07]">
                <LocaleSwitcher />
                <ThemeToggle />
              </div>

              <button
                onClick={openCart}
                className={navIconButton}
                aria-label={
                  itemCount > 0 ? `${t('cart')} (${itemCount})` : t('cart')
                }
              >
                <ShoppingCart className={navIconGlyph} strokeWidth={1.75} />
                {itemCount > 0 && (
                  /* Ring matches the navbar surface so the badge reads as a
                     cutout rather than a sticker overlapping the glyph.
                     Keyed on the count so React remounts it and the pop
                     keyframe replays on every add — the feedback for "it went
                     in the cart" is the badge moving, not just changing. */
                  <span
                    key={itemCount}
                    className="absolute -right-0.5 -top-0.5 z-10 flex h-[18px] min-w-[18px] animate-badge-pop items-center justify-center rounded-full bg-[#2E5BFF] px-[5px] text-[10px] font-bold leading-none tracking-tight text-white shadow-[0_1px_4px_rgba(46,91,255,0.45)] ring-2 ring-paper motion-reduce:animate-none dark:ring-ink"
                  >
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              <div className="hidden md:flex items-center">
                <AccountMenu />
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`${navIconButton} lg:hidden`}
                aria-label={t('menu')}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? (
                  <X className={navIconGlyph} strokeWidth={1.75} />
                ) : (
                  <Menu className={navIconGlyph} strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-paper dark:bg-ink border-b border-border-light dark:border-border-dark animate-fade-in">
          <div className="px-4 py-6 space-y-1">
            <div className="mb-4">
              <SearchBar onNavigate={() => setMobileOpen(false)} />
            </div>
            <Link
              href={`/${locale}`}
              className="block py-3 text-sm font-medium text-ink dark:text-neutral-200 border-b border-border-light dark:border-border-dark"
              onClick={() => setMobileOpen(false)}
            >
              {t('home')}
            </Link>
            <Link
              href={`/${locale}/products`}
              className="block py-3 text-sm font-medium text-ink dark:text-neutral-200 border-b border-border-light dark:border-border-dark"
              onClick={() => setMobileOpen(false)}
            >
              {locale === 'ka' ? 'ყველა პროდუქტი' : 'All products'}
            </Link>
            <Link
              href={`/${locale}/services`}
              className="block py-3 text-sm font-medium text-ink dark:text-neutral-200 border-b border-border-light dark:border-border-dark"
              onClick={() => setMobileOpen(false)}
            >
              {locale === 'ka' ? 'სერვისები' : 'Services'}
            </Link>
            <div className="pt-3 pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-graphite mb-2 px-0">
                {locale === 'ka' ? 'ბრენდები' : 'Brands'}
              </p>
              <div className="grid grid-cols-2 gap-x-2">
                {brands.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/${locale}/products?brand=${b.slug}`}
                    className="py-2.5 text-sm text-graphite hover:text-cobalt dark:hover:text-cobalt-dark transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="pt-3 pb-1 border-t border-border-light dark:border-border-dark">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-graphite mb-2 px-0">
                {locale === 'ka' ? 'კატეგორიები' : 'Categories'}
              </p>
              {parentCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${locale}/products?category=${cat.slug}`}
                  className="flex items-center gap-3 py-2.5 text-sm text-graphite hover:text-cobalt dark:hover:text-cobalt-dark transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {locale === 'ka' ? cat.nameKa : cat.nameEn}
                </Link>
              ))}
            </div>
            <div className="pt-4 border-t border-border-light dark:border-border-dark space-y-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-full bg-ink dark:bg-white text-white dark:text-ink hover:opacity-90 transition-opacity"
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {locale === 'ka' ? 'ადმინ პანელი' : 'Admin panel'}
                </Link>
              )}
              {isAuthed ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    signOut({ callbackUrl: `/${locale}` });
                  }}
                  className="w-full py-3 text-center text-sm font-semibold rounded-full border border-error text-error hover:bg-error/10 transition-colors"
                >
                  {locale === 'ka' ? 'გასვლა' : 'Sign out'}
                </button>
              ) : (
                <div className="flex gap-3">
                  <Link
                    href={`/${locale}/login`}
                    className="flex-1 py-3 text-center text-sm font-semibold rounded-full border border-border-light dark:border-border-dark text-ink dark:text-white hover:border-cobalt hover:text-cobalt transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('login')}
                  </Link>
                  <Link
                    href={`/${locale}/register`}
                    className="flex-1 py-3 text-center text-sm font-semibold rounded-full bg-cobalt text-white hover:bg-cobalt/90 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('register')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
