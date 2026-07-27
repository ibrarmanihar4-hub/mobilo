// Server-only Supabase client using the service role key. This bypasses
// Row Level Security entirely, so it must NEVER be imported from a 'use
// client' component or leaked into any client bundle. It should only be
// used inside Next.js Route Handlers (src/app/api/**) and other
// server-only code.

import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      'Server is missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Set SUPABASE_SERVICE_ROLE_KEY in .env.local (server-only, never expose to the browser).'
    );
  }

  if (cached) return cached;

  cached = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
