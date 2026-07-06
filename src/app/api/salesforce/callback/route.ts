/**
 * Salesforce OAuth2 Callback — exchanges auth code for tokens, stores them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/sync/salesforce';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/settings?sf_error=${error}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?sf_error=no_code', req.url));
  }

  try {
    const token = await exchangeCodeForToken(code);

    // Store token in a cookie (in production, store in DB per user)
    const response = NextResponse.redirect(new URL('/settings?sf_connected=true', req.url));
    response.cookies.set('sf_token', JSON.stringify(token), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (e: any) {
    console.error('Salesforce OAuth error:', e);
    return NextResponse.redirect(new URL(`/settings?sf_error=${encodeURIComponent(e.message)}`, req.url));
  }
}
