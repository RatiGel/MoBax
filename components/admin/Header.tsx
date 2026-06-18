'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { Menu, Sun, Moon, LogOut, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-config';
import { canAccessModule } from '@/lib/rbac';
import type { UserRole } from '@/models/User';

interface HeaderProps {
  role: UserRole;
  name: string;
  email: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  STORE_MANAGER: 'Store Manager',
  CONTENT_EDITOR: 'Content Editor',
  CUSTOMER: 'Customer',
};

export function Header({ role, name, email }: HeaderProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => canAccessModule(role, item.module));
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <header className="flex items-center justify-between h-16 px-4 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
      {/* Mobile nav */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="h-16 flex items-center px-4 border-b border-border-light dark:border-border-dark font-display text-lg font-semibold text-primary dark:text-white">
              MoBax Admin
            </div>
            <nav className="p-2 space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                      isActive(item.href)
                        ? 'bg-primary text-white dark:bg-accent dark:text-primary'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="h-4 w-4 hidden dark:block" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-medium dark:bg-accent dark:text-primary">
                {name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline text-sm font-medium">{name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{name}</div>
              <div className="text-xs text-neutral-500 font-normal">{email}</div>
              <div className="text-xs text-accent font-normal mt-0.5">{ROLE_LABELS[role]}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/en" target="_blank" className="cursor-pointer">
                <ExternalLink className="h-4 w-4 mr-2" /> View store
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-error focus:text-error"
              onClick={() => signOut({ callbackUrl: '/en/login' })}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
