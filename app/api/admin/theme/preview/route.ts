import { NextRequest, NextResponse } from 'next/server';
import { draftMode } from 'next/headers';
import { getAdminSession } from '@/lib/admin-auth';
import { fail } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Enables Next's draft-mode cookie and redirects to the storefront with
 * ?theme=draft, so an admin can preview the unpublished theme_draft setting.
 *
 * Gated on getAdminSession() (non-throwing — an anonymous/expired session
 * gets a plain 401 here rather than a leaked preview) BEFORE calling
 * draftMode().enable(). enable() only runs in this Route Handler, never in
 * the shared storefront layout — that's what keeps the ISR cache honest for
 * every other request. See the long comment on getStoreTheme() in
 * lib/theme.ts for the full caching reasoning.
 */
export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return fail('Unauthorized', 401);

  const locale = req.nextUrl.searchParams.get('locale') === 'ka' ? 'ka' : 'en';
  draftMode().enable();

  return NextResponse.redirect(new URL(`/${locale}?theme=draft`, req.url));
}

/** Turns preview mode back off — "Exit preview" on the storefront / admin. */
export async function DELETE() {
  draftMode().disable();
  return NextResponse.json({ success: true, data: { disabled: true }, error: null });
}
