'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, Smartphone, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, NAV_GROUP_ORDER, type NavGroup } from './nav-config';
import { canAccessModule } from '@/lib/rbac';
import type { UserRole } from '@/models/User';
import { UnreadMessagesBadge } from './UnreadMessagesBadge';

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const items = NAV_ITEMS.filter((item) => canAccessModule(role, item.module));

  // Group the visible items, preserving section order and dropping empty groups
  // (a role may have no items in a section).
  const grouped = NAV_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <aside
      className={cn(
                'hidden md:flex flex-col border-r border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center gap-2.5 h-16 px-4 border-b border-border-light dark:border-border-dark">
        <span className="ink-fill flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <Smartphone className="h-5 w-5" />
        </span>
        {!collapsed && (
          <span className="font-display text-base font-semibold text-primary dark:text-white tracking-tight">
            MoBax Admin
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {grouped.map(({ group, items: groupItems }, gi) => (
          <NavSection key={group} group={group} collapsed={collapsed} first={gi === 0}>
            {groupItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    collapsed && 'justify-center px-0',
                    active
                      ? 'bg-cobalt/10 text-amber-ink'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  )}
                >
                  {/* Active indicator bar — clearer than a full fill, on-brand. */}
                  <span
                    className={cn(
                'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-cobalt transition-opacity',
                      active ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-amber-ink')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.href === '/admin/messages' && <UnreadMessagesBadge />}
                </Link>
              );
            })}
          </NavSection>
        ))}
      </nav>

      {/* View store — quick jump to the live storefront in a new tab. */}
      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        title={collapsed ? 'View store' : undefined}
        className={cn(
                'flex items-center gap-3 border-t border-border-light dark:border-border-dark px-4 py-3 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors',
          collapsed && 'justify-center px-0'
        )}
      >
        <ExternalLink className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span>View store</span>}
      </Link>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center h-11 border-t border-border-light dark:border-border-dark text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </aside>
  );
}

function NavSection({
  group,
  collapsed,
  first,
  children,
}: {
  group: NavGroup;
  collapsed: boolean;
  first: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(!first && 'mt-4')}>
      {collapsed ? (
        // Thin divider stands in for the section label when collapsed.
        !first && <div className="mx-3 mb-2 border-t border-border-light dark:border-border-dark" />
      ) : (
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          {group}
        </p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
