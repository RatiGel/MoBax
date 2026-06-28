import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  title: 'MoBax — Mobile Accessories',
  description: 'Premium mobile accessories in Georgia',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Middleware injects x-pathname; derive the locale so <html lang> is correct
  // on the server's first paint (no font flash before hydration).
  const pathname = headers().get('x-pathname') ?? '';
  const lang = pathname.startsWith('/ka') ? 'ka' : 'en';

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className="min-h-screen bg-background-light text-[#111827] antialiased dark:bg-background-dark dark:text-[#F1F5F9] font-sans">
        {children}
      </body>
    </html>
  );
}
