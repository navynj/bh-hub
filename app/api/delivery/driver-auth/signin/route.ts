/**
 * GET /api/delivery/driver-auth/signin?app_scheme=bhdriver
 * Redirects to Google OAuth. redirect_uri is our callback URL (this server).
 * Add this callback URL to Google Console: https://YOUR_BH_HUB_DOMAIN/api/delivery/driver-auth/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const SESSION_COOKIE = 'bh_driver_oauth_state';

export async function GET(request: NextRequest) {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Server OAuth not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const appScheme = searchParams.get('app_scheme') ?? 'bhdriver';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const callbackUrl = `${baseUrl.replace(/\/$/, '')}/api/delivery/driver-auth/callback`;

  const state = randomBytes(16).toString('hex');
  const statePayload = JSON.stringify({ appScheme, state });
  const stateEncoded = Buffer.from(statePayload).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state: stateEncoded,
    access_type: 'offline',
    prompt: 'consent',
  });

  const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // Return HTML that redirects via JS so in-app browser doesn't infinite-reload on 302
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sign in</title></head><body><p>Redirecting to Google…</p><script>window.location.replace(${JSON.stringify(redirectUrl)});</script></body></html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
  res.cookies.set(SESSION_COOKIE, stateEncoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });
  return res;
}
