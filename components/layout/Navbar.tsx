'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import {
  ShoppingCart,
  X,
  Menu,
  ChevronDown,
  LayoutDashboard,
  User,
  Package,
  MessageSquare,
} from 'lucide-react';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { AccountMenu } from './AccountMenu';
import { navIconButton, navIconGlyph } from './navIcon';
import { SearchBar } from '@/components/shop/SearchBar';
import { useCartStore } from '@/lib/store';
import type { Category, Brand } from '@/lib/types';
import { canSeeAdminPanel } from '@/lib/rbac';
import type { UserRole } from '@/models/User';
import type { NavLink } from '@/lib/theme';

export interface NavbarBranding {
  storeName: string;
  logoUrl: string;
  announcement: string;
}

export function Navbar({
  branding,
  categories,
  brands,
  brandCounts,
  categoryCounts,
  showDiscounts,
  navLinks,
}: {
  branding?: NavbarBranding;
  categories: Category[];
  brands: Brand[];
  brandCounts: Record<string, number>;
  /** Category slug → live product count (see getCategoryProductCounts). */
  categoryCounts: Record<string, number>;
  /** Discounts is a virtual category — hidden entirely when nothing qualifies. */
  showDiscounts: boolean;
  /** Admin-managed extra nav links (Setting: nav). Empty/undefined → no extra links render. */
  navLinks?: NavLink[];
}) {
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
  const parentCategories = categories.filter((c) => c.slug !== 'most-popular');
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
              {/* Focus-within alongside hover so the panel is reachable by
                  keyboard, and Escape closes it — it was pointer-only before. */}
              <div
                className="relative"
                onMouseEnter={() => setBrandsOpen(true)}
                onMouseLeave={() => setBrandsOpen(false)}
                onFocusCapture={() => setBrandsOpen(true)}
                onBlurCapture={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setBrandsOpen(false);
                }}
                onKeyDown={(e) => e.key === 'Escape' && setBrandsOpen(false)}
              >
                <button
                  aria-expanded={brandsOpen}
                  onClick={() => setBrandsOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-ink dark:hover:text-white transition-colors py-6"
                >
                  {locale === 'ka' ? 'ბრენდები' : 'Brands'}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${brandsOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {brandsOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-[560px] animate-slide-down pt-2">
                    <div className="overflow-hidden rounded-2xl border border-border-light bg-surface-light shadow-2xl shadow-ink/10 dark:border-border-dark dark:bg-surface-dark">
                      {/* Two intents side by side rather than stacked: "which
                          phone do I own" and "whose accessory do I want" are
                          parallel questions, and the old stacked version buried
                          the makers below the fold of the panel. The divider
                          carries the split, so neither column needs a card. */}
                      <div className="grid grid-cols-2 divide-x divide-border-light dark:divide-border-dark">
                        {[
                          {
                            key: 'device',
                            label: locale === 'ka' ? 'მოწყობილობის მიხედვით' : 'Shop by device',
                            items: deviceBrands,
                          },
                          {
                            key: 'maker',
                            label: locale === 'ka' ? 'აქსესუარების ბრენდი' : 'Accessory brands',
                            items: makerBrands,
                          },
                        ].map((group) => (
                          <div key={group.key} className="p-2">
                            {/* No uppercase / letter-spacing here: Georgian is
                                a unicase script, so text-transform does nothing
                                but tracking visibly stretches it. Sentence case
                                at one weight reads correctly in both locales. */}
                            <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold text-graphite">
                              {group.label}
                            </p>
                            {group.items.map((b) => {
                              // Real catalog count, not a decorative number —
                              // it tells a shopper whether the link is worth a
                              // tap before they spend one.
                              const count = brandCounts[b.slug] ?? 0;
                              return (
                                <Link
                                  key={b.slug}
                                  href={`/${locale}/products?brand=${b.slug}`}
                                  className="group/brand flex items-baseline justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-cobalt-soft dark:hover:bg-cloud-dark"
                                >
                                  <span className="text-sm font-medium text-ink transition-colors group-hover/brand:text-cobalt dark:text-neutral-100 dark:group-hover/brand:text-cobalt-dark">
                                    {b.name}
                                  </span>
                                  <span className="shrink-0 text-xs tabular-nums text-graphite">
                                    {count}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      {/* Mirrors the Categories panel's footer so both menus
                          share one vocabulary. */}
                      <div className="border-t border-border-light bg-cloud-light p-3.5 dark:border-border-dark dark:bg-cloud-dark">
                        <Link
                          href={`/${locale}/products`}
                          className="flex items-center gap-1 text-xs font-semibold text-cobalt transition-opacity hover:opacity-70 dark:text-cobalt-dark"
                        >
                          {locale === 'ka' ? 'ყველა პროდუქტი →' : 'View all products →'}
                        </Link>
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
                                  {categoryCounts[cat.slug] ?? 0} {locale === 'ka' ? 'ნივთი' : 'items'}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                        {/* Discounts — virtual category, only ever shown when
                            at least one product currently qualifies. */}
                        {showDiscounts && (
                          <Link
                            href={`/${locale}/products/discounts`}
                            className="flex items-center gap-3 p-4 bg-surface-light dark:bg-surface-dark hover:bg-cobalt-soft dark:hover:bg-cloud-dark group transition-colors"
                          >
                            <div>
                              <p className="text-sm font-semibold text-ink dark:text-neutral-100 group-hover:text-cobalt dark:group-hover:text-cobalt-dark transition-colors">
                                {locale === 'ka' ? 'ფასდაკლებები' : 'Discounts'}
                              </p>
                              <p className="text-xs text-graphite mt-0.5">
                                {locale === 'ka' ? 'შეთავაზებები' : 'On sale now'}
                              </p>
                            </div>
                          </Link>
                        )}
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

              {/* Admin-managed extra links (Setting: nav) — appended after the
                  built-in Services link, never replacing it. */}
              {navLinks?.map((link, i) => (
                <Link
                  key={`${link.href}-${i}`}
                  href={link.href}
                  className={`py-6 text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'text-ink dark:text-white'
                      : 'text-graphite hover:text-ink dark:hover:text-white'
                  }`}
                >
                  {locale === 'ka' ? link.labelKa || link.labelEn : link.labelEn}
                </Link>
              ))}
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

              {/* Always visible. This was `hidden md:flex`, which left phones
                  with no account control at all — no avatar in the bar and no
                  profile links in the sheet either, so /account was
                  unreachable below 768px. It fits at 360px now that the locale
                  control is a single 36px button rather than a segmented pair. */}
              <div className="flex items-center">
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

            {/* Account links sit above the catalog, not below it: the admin
                panel and sign-out used to be the last thing in the sheet,
                past every brand and category, so reaching them meant
                scrolling the whole menu. */}
            {isAuthed && (
              <div className="mb-4 rounded-2xl border border-border-light bg-cloud-light/60 p-2 dark:border-border-dark dark:bg-cloud-dark/40">
                <div className="flex items-center gap-3 px-2 py-2">
                  {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-ink/10 dark:ring-white/15"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4B72FF] to-[#2E5BFF] text-sm font-bold text-white ring-1 ring-inset ring-white/15">
                      {(session?.user?.name || session?.user?.email || '?')
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink dark:text-neutral-100">
                      {session?.user?.name || (locale === 'ka' ? 'ანგარიში' : 'Account')}
                    </p>
                    {session?.user?.email && (
                      <p className="truncate text-xs text-graphite">{session.user.email}</p>
                    )}
                  </div>
                </div>
                <div className="mt-1 grid grid-cols-1">
                  {[
                    {
                      href: `/${locale}/account`,
                      icon: User,
                      label: locale === 'ka' ? 'ჩემი პროფილი' : 'My profile',
                    },
                    {
                      href: `/${locale}/account/orders`,
                      icon: Package,
                      label: locale === 'ka' ? 'შეკვეთები' : 'Orders',
                    },
                    {
                      href: `/${locale}/account/messages`,
                      icon: MessageSquare,
                      label: locale === 'ka' ? 'შეტყობინებები' : 'Messages',
                    },
                  ].map(({ href, icon: Icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-cobalt-soft dark:text-neutral-200 dark:hover:bg-cloud-dark"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-graphite" strokeWidth={1.75} />
                      <span className="break-words">{label}</span>
                    </Link>
                  ))}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-cobalt-soft dark:text-neutral-200 dark:hover:bg-cloud-dark"
                    >
                      <LayoutDashboard className="h-4 w-4 shrink-0 text-graphite" strokeWidth={1.75} />
                      <span className="break-words">
                        {locale === 'ka' ? 'ადმინ პანელი' : 'Admin panel'}
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Logged out: the sign-in pair used to live at the very bottom of
                the sheet, below every brand and category. It belongs with the
                account card's slot. */}
            {!isAuthed && (
              <div className="mb-4 flex gap-3">
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-full border border-border-light py-3 text-center text-sm font-semibold text-ink transition-colors hover:border-cobalt hover:text-cobalt dark:border-border-dark dark:text-white"
                >
                  {t('login')}
                </Link>
                <Link
                  href={`/${locale}/register`}
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-full bg-[#2E5BFF] py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {t('register')}
                </Link>
              </div>
            )}

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
            {navLinks?.map((link, i) => (
              <Link
                key={`${link.href}-${i}`}
                href={link.href}
                className="block py-3 text-sm font-medium text-ink dark:text-neutral-200 border-b border-border-light dark:border-border-dark break-words"
                onClick={() => setMobileOpen(false)}
              >
                {locale === 'ka' ? link.labelKa || link.labelEn : link.labelEn}
              </Link>
            ))}
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
              {showDiscounts && (
                <Link
                  href={`/${locale}/products/discounts`}
                  className="flex items-center gap-3 py-2.5 text-sm text-graphite hover:text-cobalt dark:hover:text-cobalt-dark transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {locale === 'ka' ? 'ფასდაკლებები' : 'Discounts'}
                </Link>
              )}
            </div>
            {/* Only sign-out remains at the bottom — admin panel, profile
                links and the logged-out login/register pair all moved to the
                top of the sheet. Destructive action stays out of the way. */}
            {isAuthed && (
              <div className="pt-4 border-t border-border-light dark:border-border-dark">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    signOut({ callbackUrl: `/${locale}` });
                  }}
                  className="w-full py-3 text-center text-sm font-semibold rounded-full border border-error text-error hover:bg-error/10 transition-colors"
                >
                  {locale === 'ka' ? 'გასვლა' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
