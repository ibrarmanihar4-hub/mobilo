// Supabase client for Mobilo.
//
// Configuration is read from Expo public environment variables so we can
// swap projects between dev/preview/prod without touching code.
//
// Set these in `.env` (and they get baked in at build time):
//   EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
//
// We use AsyncStorage for session persistence (the same store the rest of
// the app uses) instead of SecureStore to keep the native module footprint
// small. Sessions are JWTs scoped by RLS, so storage just needs to be
// app-private; we don't store long-term secrets here.

import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../types/database";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;

export type Supabase = SupabaseClient<Database>;

let cached: Supabase | null = null;

/**
 * Lazily create a typed Supabase client. Throws a clear error if the
 * project URL or anon key haven't been configured yet so the failure is
 * obvious in development rather than producing an opaque network error.
 */
export function getSupabase(): Supabase {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and " +
        "EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file."
    );
  }

  if (cached) return cached;

  cached = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return cached;
}
