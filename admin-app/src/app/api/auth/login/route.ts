import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, ADMIN_SESSION_COOKIE } from '@/lib/adminSession';

// Shared-password admin login. Matches the credential rules that were
// previously enforced client-side in AdminAuthContext, but now issues a
// signed, httpOnly session cookie that server-side API routes trust to
// use the Supabase service-role client on the admin's behalf.
const DEFAULT_ADMIN_EMAIL = 'admin@mobilo.com';
const DEFAULT_ADMIN_PASS = 'admin123';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '').trim();

  if (!email || !password) {
    return NextResponse.json(
      { message: 'Please provide both email and password.' },
      { status: 400 }
    );
  }

  const isValid =
    (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASS) ||
    (email.includes('admin') && password.length >= 6);

  if (!isValid) {
    return NextResponse.json(
      { message: 'Invalid email or password.' },
      { status: 401 }
    );
  }

  const token = createSessionToken(email);
  const response = NextResponse.json({ email });

  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60,
  });

  return response;
}
