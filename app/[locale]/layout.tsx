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
import { getStoreTheme, themeOverrideCss } from '@/lib/theme';

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
  const theme = await getStoreTheme();
  const overrideCss = themeOverrideCss(theme);
  const branding = {
    storeName: theme.storeName,
    logoUrl: theme.logoUrl,
    announcement: theme.announcement,
  };

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
            <Navbar branding={branding} />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <CartDrawer />
          <ChatAssistant />
        </ThemeProvider>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
