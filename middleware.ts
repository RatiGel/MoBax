import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const locales = ['en', 'ka'];
const defaultLocale = 'ka';

const protectedPaths = ['/checkout', '/account'];

const ADMIN_ROLES = ['SUPER_ADMIN', 'STORE_MANAGER', 'CONTENT_EDITOR'];

// NextAuth v5 names its cookie `authjs.session-token` (https → `__Secure-` prefix),
// and the JWT salt must equal the cookie name. getToken's defaults assume the v4
// `next-auth.session-token` name, so we pass these explicitly or it can't decode.
const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

function getAuthToken(req: NextRequest) {
  const secureCookie =
    req.nextUrl.protocol === 'https:' ||
    (process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? '').startsWith('https:');
  const cookieName = secureCookie
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';
  return getToken({
    req,
    secret: AUTH_SECRET,
    secureCookie,
    cookieName,
    salt: cookieName,
  });
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Admin panel: non-locale, internal. Guard before locale logic.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    // Public admin routes (setup via invite token) must stay reachable.
    if (pathname.startsWith('/admin/setup')) return;

    const token = await getAuthToken(req);
    const role = token?.role as string | undefined;
    console.log('[mw/admin]', { path: pathname, hasToken: !!token, role, email: token?.email, keys: token ? Object.keys(token) : [] });
    if (!token || !role || !ADMIN_ROLES.includes(role)) {
      const loginUrl = new URL('/en/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return;
  }

  // Locale redirect
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    req.nextUrl.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(req.nextUrl);
  }

  // Auth protection
  const pathWithoutLocale = pathname.replace(/^\/(en|ka)/, '') || '/';
  const isProtected = protectedPaths.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`)
  );

  if (isProtected) {
    const token = await getAuthToken(req);

    if (!token) {
      const locale = locales.find((l) => pathname.startsWith(`/${l}`)) || defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
