import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Per-page titles come from each route's generateMetadata(). This template
  // only applies to routes that set no title of their own (/admin), so the
  // storefront's researched titles are never suffixed twice.
  title: {
    default: 'MoBax — მობილურის აქსესუარები',
    template: '%s',
  },
  description: 'Premium mobile accessories in Georgia',
  // The mark is the amber bolt from the MoBax logo on brand navy — the wordmark
  // is unreadable below ~64px. app/icon.png and app/apple-icon.png are picked up
  // by convention; these entries add the legacy .ico and the sized PNGs.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Static default; ships lang="ka" before hydration. The client HtmlLang
  // component (rendered in app/[locale]/layout.tsx) corrects this to the
  // active locale on mount. Do NOT derive this from headers()/cookies() here
  // — reading either opts the entire route tree into dynamic rendering and
  // silently defeats the `revalidate = 60` ISR on the storefront pages
  // (this happened once already; see task-10-report.md).
  const lang = 'ka';

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className="min-h-screen bg-background-light text-[#111827] antialiased dark:bg-background-dark dark:text-[#F1F5F9] font-sans">
        {children}
      </body>
    </html>
  );
}
