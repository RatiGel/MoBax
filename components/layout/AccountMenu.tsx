'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import { User, LayoutDashboard, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { canSeeAdminPanel } from '@/lib/rbac';
import type { UserRole } from '@/models/User';

/**
 * Session-aware account control in the storefront navbar.
 * - Logged out: a plain login icon → /login.
 * - Logged in: avatar + dropdown (Account, Orders, Sign out).
 *   Admin roles additionally see an "Admin panel" entry → /admin.
 */
export function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const locale = useLocale();
  const { data: session, status } = useSession();
  const ka = locale === 'ka';

  // While loading, render the neutral login icon to avoid layout shift.
  if (status !== 'authenticated' || !session?.user) {
    return (
      <Link
        href={`/${locale}/login`}
        onClick={onNavigate}
        className="h-10 w-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
        aria-label={ka ? 'შესვლა' : 'Log in'}
      >
        <User className="h-5 w-5" />
      </Link>
    );
  }

  const { name, email, image } = session.user;
  const role = session.user.role as UserRole | undefined;
  const showAdmin = canSeeAdminPanel(email, role);
  const initial = (name || email || '?').trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="h-10 w-10 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={ka ? 'ანგარიში' : 'Account'}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-8 w-8 rounded-full object-cover ring-2 ring-white/30"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-primary text-sm font-bold ring-2 ring-white/20">
            {initial}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-medium">{name || (ka ? 'ანგარიში' : 'Account')}</span>
          {email && <span className="truncate text-xs font-normal text-neutral-500">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {showAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin" onClick={onNavigate} className="cursor-pointer">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {ka ? 'ადმინ პანელი' : 'Admin panel'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem
          onClick={() => {
            onNavigate?.();
            signOut({ callbackUrl: `/${locale}` });
          }}
          className="cursor-pointer text-error focus:text-error"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {ka ? 'გასვლა' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
