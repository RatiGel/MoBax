'use client';

import { useEffect } from 'react';

/**
 * Syncs <html lang> to the active locale. The root layout can't read the
 * locale param, so it ships lang="ka" by default; this corrects it per route
 * (e.g. /en → lang="en") so locale-scoped font rules apply correctly.
 */
export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
