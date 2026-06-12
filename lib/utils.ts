import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = 'GEL'): string {
  if (currency === 'GEL') return `₾${amount.toFixed(2)}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
