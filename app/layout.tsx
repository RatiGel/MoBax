import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MoBax — Mobile Accessories',
  description: 'Premium mobile accessories in Georgia',
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
