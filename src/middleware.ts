import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public paths
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/plugins/') ||
    pathname.startsWith('/teams/') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.xml') ||
    pathname.endsWith('.zip') ||
    pathname.endsWith('.html') ||
    pathname.startsWith('/dossier')
  ) {
    return NextResponse.next();
  }

  // Check for session cookie (next-auth sets this)
  const sessionToken = request.cookies.get('next-auth.session-token')
    || request.cookies.get('__Secure-next-auth.session-token');

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // RBAC page-level checks happen client-side via the AppShell
  // (middleware can't decode JWT without the secret in edge runtime)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
