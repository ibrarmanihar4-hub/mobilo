import 'server-only';
import { NextResponse } from 'next/server';
import { getVerifiedAdminSession } from './adminSession';

/**
 * Verifies the admin session cookie for a Route Handler. Returns a 401
 * response if missing/invalid, otherwise null (caller proceeds).
 */
export async function requireAdminSession(): Promise<NextResponse | null> {
  const session = await getVerifiedAdminSession();
  if (!session) {
    return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
  }
  return null;
}
