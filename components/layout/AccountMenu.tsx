'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import { User, LayoutDashboard, LogOut, Package, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { canSeeAdminPanel } from '@/lib/rbac';
import { navIconButton, navIconGlyph } from './navIcon';
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
        className={navIconButton}
        aria-label={ka ? 'შესვლა' : 'Log in'}
      >
        <User className={navIconGlyph} strokeWidth={1.75} />
      </Link>
    );
  }

  const { name, email, image } = session.user;
  const role = session.user.role as UserRole | undefined;
  const showAdmin = canSeeAdminPanel(email, role);
  const initial = (name || email || '?').trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      {/* Round focus ring, not the global square :focus-visible outline —
          that outline clipped the corners of the circular avatar. */}
      <DropdownMenuTrigger
        className="group flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none dark:focus-visible:ring-offset-ink"
        aria-label={ka ? 'ანგარიში' : 'Account'}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-8 w-8 rounded-full object-cover ring-1 ring-ink/10 transition-shadow group-hover:ring-2 group-hover:ring-cobalt/40 dark:ring-white/15"
          />
        ) : (
          /* Flat ink chip rather than a gradient: this direction spends colour
             on actions and state, and an avatar is neither. Avoids the contrast
             trap the old gradient had to work around — see CLAUDE.md. */
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-raised-light text-[0.8125rem] font-bold text-ink ring-1 ring-inset ring-hairline-light transition-colors group-hover:ring-cobalt dark:bg-raised-dark dark:text-white dark:ring-hairline-dark">
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

        <DropdownMenuItem asChild>
          <Link href={`/${locale}/account`} onClick={onNavigate} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            {ka ? 'ჩემი პროფილი' : 'My profile'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/account/orders`} onClick={onNavigate} className="cursor-pointer">
            <Package className="mr-2 h-4 w-4" />
            {ka ? 'შეკვეთები' : 'Orders'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/account/messages`} onClick={onNavigate} className="cursor-pointer">
            <MessageSquare className="mr-2 h-4 w-4" />
            {ka ? 'შეტყობინებები' : 'Messages'}
          </Link>
        </DropdownMenuItem>
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
