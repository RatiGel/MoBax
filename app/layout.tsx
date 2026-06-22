import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MoBax — Mobile Accessories',
  description: 'Premium mobile accessories in Georgia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background-light text-[#111827] antialiased dark:bg-background-dark dark:text-[#F1F5F9] font-sans">
        {children}
      </body>
    </html>
  );
}
