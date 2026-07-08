'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/admin-fetch';

const POLL_MS = 10000;

/** Total-unread pill for the Messages nav item. Polls the admin support API. */
export function UnreadMessagesBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apiFetch<{ totalUnread: number }>('/api/admin/support');
        if (!cancelled) setCount(data.totalUnread);
      } catch {
        /* silent */
      }
    };
    load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (count === 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary dark:bg-accent px-1.5 text-[11px] font-semibold text-white dark:text-primary">
      {count > 99 ? '99+' : count}
    </span>
  );
}
