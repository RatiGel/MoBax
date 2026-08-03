import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/shop/CartDrawer';
import { ChatAssistant } from '@/components/shop/ChatAssistant';
import { SessionProvider } from '@/components/SessionProvider';
import { HtmlLang } from '@/components/HtmlLang';
import { getStoreTheme, themeOverrideCss, getNavSettings, getFooterSettings, getTypography } from '@/lib/theme';
import { getParentCategories, getBrands, getBrandProductCounts, getDiscountedProducts } from '@/lib/catalog';

const locales = ['en', 'ka'];

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'MoBax — Mobile Accessories',
  description: 'Premium mobile accessories in Georgia — cases, chargers, cables and more',
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params: { locale } }: LocaleLayoutProps) {
  if (!locales.includes(locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();

  // Live store theme — admin-controlled colors + branding. The override block
  // recolors the brand CSS vars; branding flows to the Navbar as props.
  const [theme, typography] = await Promise.all([getStoreTheme(), getTypography()]);
  const overrideCss = themeOverrideCss(theme, typography);
  const branding = {
    storeName: theme.storeName,
    logoUrl: theme.logoUrl,
    announcement: theme.announcement,
  };

  // Navbar categories/brands — Navbar is a client component and cannot query
  // Mongoose itself, so the DB reads happen here and flow down as props.
  // Nav links and footer settings are also admin-managed (Settings: nav,
  // footer) and flow down the same way — both components render their own
  // hardcoded fallback content when the saved setting is empty.
  const [navCategories, navBrands, brandCounts, discountedProducts, navSettings, footerSettings] =
    await Promise.all([
      getParentCategories(),
      getBrands(),
      getBrandProductCounts(),
      getDiscountedProducts(),
      getNavSettings(),
      getFooterSettings(),
    ]);
  // Discounts is a virtual category: it only appears in nav when at least one
  // product currently qualifies, so an admin who clears every sale doesn't
  // leave a dead link pointing at an empty page.
  const showDiscounts = discountedProducts.length > 0;

  return (
    <SessionProvider>
      <HtmlLang locale={locale} />
      {overrideCss && <style id="store-theme" dangerouslySetInnerHTML={{ __html: overrideCss }} />}
      <NextIntlClientProvider locale={locale} messages={messages}>
        {/* Storefront opens light regardless of OS preference: the brand's
            product photography and cobalt accent are art-directed on paper
            white, and a dark first paint is not what a first-time shopper
            should meet. enableSystem is off so an OS dark preference doesn't
            silently override this; ThemeToggle still switches themes and the
            choice persists per visitor. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <div className="flex min-h-screen flex-col">
            <Navbar
              branding={branding}
              categories={navCategories}
              brands={navBrands}
              brandCounts={brandCounts}
              showDiscounts={showDiscounts}
              navLinks={navSettings.links}
            />
            <main className="flex-1">{children}</main>
            <Footer footerSettings={footerSettings} />
          </div>
          <CartDrawer />
          <ChatAssistant />
        </ThemeProvider>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
