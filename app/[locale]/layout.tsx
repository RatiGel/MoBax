import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/shop/CartDrawer';
import { SessionProvider } from '@/components/SessionProvider';

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

  return (
    <SessionProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <CartDrawer />
        </ThemeProvider>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
