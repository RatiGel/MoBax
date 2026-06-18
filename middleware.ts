import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const locales = ['en', 'ka'];
const defaultLocale = 'en';

const protectedPaths = ['/checkout', '/account'];

const ADMIN_ROLES = ['SUPER_ADMIN', 'STORE_MANAGER', 'CONTENT_EDITOR'];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Admin panel: non-locale, internal. Guard before locale logic.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    // Public admin routes (setup via invite token) must stay reachable.
    if (pathname.startsWith('/admin/setup')) return;

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = token?.role as string | undefined;
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
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

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
