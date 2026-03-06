/**
 * POST /api/delivery/driver-auth/token
 * Body: { idToken?: string } or { code: string, redirectUri: string } — Google from mobile app.
 * Returns: { token: string } — JWT for driver API (Authorization: Bearer <token>).
 */

import { issueDriverToken } from '@/lib/delivery/driver-auth';
import {
  parseBody,
  deliveryDriverAuthTokenPostSchema,
} from '@/lib/api/schemas';
import { prisma } from '@/lib/core/prisma';
import { NextResponse } from 'next/server';

async function getEmailFromGoogle(idToken: string): Promise<string> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) {
    const text = await res.text();
    console.error('Google tokeninfo error:', res.status, text);
    throw new Error('Invalid or expired Google sign-in');
  }
  const data = (await res.json()) as { email?: string };
  if (!data.email) throw new Error('Google account has no email');
  return data.email;
}

async function getEmailFromGoogleCode(
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<string> {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Server missing Google OAuth config');
  }
  const params: Record<string, string> = {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  };
  if (codeVerifier) params.code_verifier = codeVerifier;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Google token exchange error:', res.status, text);
    throw new Error('Invalid or expired sign-in');
  }
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error('No id_token in response');
  return getEmailFromGoogle(data.id_token);
}

export async function POST(request: Request) {
  const parsed = await parseBody(request, deliveryDriverAuthTokenPostSchema);
  if ('error' in parsed) return parsed.error;
  const { idToken, code, redirectUri, codeVerifier } = parsed.data;

  let email: string;
  try {
    if (idToken) {
      email = await getEmailFromGoogle(idToken);
    } else if (code && redirectUri) {
      email = await getEmailFromGoogleCode(code, redirectUri, codeVerifier);
    } else {
      return NextResponse.json(
        { error: 'Provide idToken or code+redirectUri' },
        { status: 400 },
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to verify sign-in';
    return NextResponse.json(
      { error: message },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: 'No account found for this email' },
      { status: 403 },
    );
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!driver) {
    return NextResponse.json(
      { error: 'You are not registered as a driver' },
      { status: 403 },
    );
  }

  try {
    const token = issueDriverToken(driver.id, user.id);
    return NextResponse.json({ token });
  } catch (e) {
    console.error('Driver token issue failed:', e);
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 },
    );
  }
}
