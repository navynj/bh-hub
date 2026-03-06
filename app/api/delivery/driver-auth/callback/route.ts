/**
 * GET /api/delivery/driver-auth/callback?code=...&state=...
 * Google redirects here. Exchange code for user, issue driver JWT, redirect to app with token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { issueDriverToken } from '@/lib/delivery/driver-auth';
import { prisma } from '@/lib/core/prisma';

const SESSION_COOKIE = 'bh_driver_oauth_state';

async function getEmailFromGoogleCode(code: string, redirectUri: string): Promise<string> {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) throw new Error('Server OAuth not configured');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Google token exchange error:', res.status, text);
    throw new Error('Invalid or expired sign-in');
  }
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error('No id_token');

  const tokenRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(data.id_token)}`,
  );
  if (!tokenRes.ok) throw new Error('Invalid token');
  const tokenData = (await tokenRes.json()) as { email?: string };
  if (!tokenData.email) throw new Error('No email');
  return tokenData.email;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateEncoded = searchParams.get('state');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const callbackUrl = `${baseUrl.replace(/\/$/, '')}/api/delivery/driver-auth/callback`;

  const cookieStore = await cookies();
  const cookieState = cookieStore.get(SESSION_COOKIE)?.value;

  const failPage = (message: string) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in</title></head><body style="font-family:system-ui;padding:2rem;text-align:center;"><p>${message}</p><p style="color:#666;font-size:0.9rem">You can close this window.</p></body></html>`;
    const res = new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  };

  if (!code || !stateEncoded || stateEncoded !== cookieState) {
    return failPage('Sign-in failed. Please try again.');
  }

  let appScheme = 'bhdriver';
  try {
    const statePayload = JSON.parse(
      Buffer.from(stateEncoded, 'base64url').toString('utf8'),
    );
    appScheme = statePayload.appScheme ?? appScheme;
  } catch {
    // use default
  }

  let email: string;
  try {
    email = await getEmailFromGoogleCode(code, callbackUrl);
  } catch (e) {
    console.error('Driver auth callback error:', e);
    return failPage('Sign-in failed. Please try again.');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return failPage('No account found for this email.');
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!driver) {
    return failPage('You are not registered as a driver.');
  }

  let token: string;
  try {
    token = issueDriverToken(driver.id, user.id);
  } catch {
    return failPage('Sign-in failed. Please try again.');
  }

  const appRedirect = `${appScheme}://auth?token=${encodeURIComponent(token)}`;
  const res = NextResponse.redirect(appRedirect);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
