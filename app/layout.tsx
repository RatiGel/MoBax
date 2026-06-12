import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MoBax — Mobile Accessories',
  description: 'Premium mobile accessories in Georgia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
