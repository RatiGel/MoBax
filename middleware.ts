import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const locales = ['en', 'ka'];
const defaultLocale = 'en';

const protectedPaths = ['/checkout', '/account'];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

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
