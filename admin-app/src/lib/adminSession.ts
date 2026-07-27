// Server-only admin session helpers.
//
// The admin login is a shared-password gate (no per-admin Supabase Auth
// account), so we issue a signed, httpOnly session cookie on successful
// login instead of relying on a Supabase Auth session. All data-fetching
// API routes verify this cookie before using the service-role Supabase
// client, so RLS bypass is only ever reachable by a verified admin
// session, never directly from the browser.

import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'mbl_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not set in the server environment.');
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function createSessionToken(email: string): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  // Encode the payload as base64url FIRST, then append the signature with a
  // '.' separator. Email addresses can contain literal dots (e.g.
  // "admin@mobilo.com"), so splitting a raw "email.expiresAt.signature"
  // string by '.' is unsafe. Base64url never produces '.', so once the
  // payload itself is encoded, '.' is a safe, unambiguous separator for the
  // outer token structure.
  const payloadEncoded = Buffer.from(`${email}\u0000${expiresAt}`).toString('base64url');
  const signature = sign(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): { email: string } | null {
  if (!token) return null;

  try {
    const [payloadEncoded, signature] = token.split('.');
    if (!payloadEncoded || !signature) return null;

    const expectedSignature = sign(payloadEncoded);
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return null;
    }

    const decoded = Buffer.from(payloadEncoded, 'base64url').toString('utf8');
    const [email, expiresAtRaw] = decoded.split('\u0000');
    if (!email || !expiresAtRaw) return null;

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

    return { email };
  } catch {
    return null;
  }
}

/** Reads and verifies the admin session cookie in a Route Handler. */
export async function getVerifiedAdminSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}
