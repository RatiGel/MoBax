'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import { User, Package, MessageSquare, LogOut } from 'lucide-react';

export function AccountSidebar() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('account');

  const base = `/${locale}/account`;
  const items = [
    { href: base, label: t('navProfile'), icon: User, exact: true },
    { href: `${base}/orders`, label: t('navOrders'), icon: Package, exact: false },
    { href: `${base}/messages`, label: t('navMessages'), icon: MessageSquare, exact: false },
  ];

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:gap-1 sm:overflow-visible">
      {items.map(({ href, label, icon: Icon, exact }) => (
        <Link
          key={href}
          href={href}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
            isActive(href, exact)
              ? 'bg-cobalt text-white'
              : 'text-graphite hover:bg-cloud-light dark:hover:bg-cloud-dark'
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
      <button
        onClick={() => signOut({ callbackUrl: `/${locale}` })}
        className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error/10"
      >
        <LogOut className="h-4 w-4" />
        {t('signOut')}
      </button>
    </nav>
  );
}
