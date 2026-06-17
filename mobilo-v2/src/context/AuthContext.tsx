// AuthContext - Supabase phone OTP auth.
//
// This is the single source of identity for the app. It uses Supabase's
// built-in phone auth (signInWithOtp / verifyOtp) so:
//   - Real users live in `auth.users` and the linked `public.profiles` row
//   - Sessions are JWTs persisted by the Supabase client (AsyncStorage adapter)
//   - RLS on `public.bookings` and `public.profiles` actually enforces ownership
//
// The public API (sendOtp / verifyOtp / logout / user / loading) is preserved
// so AuthScreen and ProfileScreen don't need any changes. The `sessionId`
// returned by sendOtp is now a non-secret placeholder; Supabase identifies
// the OTP request by phone number, not session id.

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabase, isSupabaseConfigured } from "../services/supabase";
import { AuthMode, AuthUser } from "../types/auth";

type SendResult = {
  sessionId: string;
  message: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  sendOtp: (payload: {
    mode: AuthMode;
    fullName?: string;
    phoneNumber: string;
  }) => Promise<SendResult>;
  verifyOtp: (payload: {
    mode: AuthMode;
    fullName?: string;
    phoneNumber: string;
    otp: string;
    sessionId: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Convert a 10-digit Indian mobile number to Supabase's E.164 format (+91...). */
function toE164(phoneNumber: string): string {
  const last10 = phoneNumber.replace(/\D/g, "").slice(-10);
  if (last10.length !== 10) {
    throw new Error("Enter a valid 10-digit phone number.");
  }
  return `+91${last10}`;
}

function formatPhoneDisplay(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return phoneNumber;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Build the app-facing AuthUser synchronously from the Supabase auth
 * session alone. No network calls - this is instant, so the app can render
 * immediately on launch. The display name comes from user_metadata (set at
 * sign-up); it gets upgraded later by fetchProfileName once the profile row
 * is read.
 */
function baseAuthUser(supaUser: User): AuthUser {
  const e164 = supaUser.phone ? `+${supaUser.phone.replace(/\D/g, "")}` : "";
  const phoneDigits = e164.replace(/\D/g, "").slice(-10);
  const fallbackName =
    (supaUser.user_metadata?.full_name as string | undefined) ?? "Mobilo Rider";

  return {
    id: supaUser.id,
    fullName: fallbackName,
    phoneNumber: phoneDigits || supaUser.phone || "",
    phoneDisplay: phoneDigits ? formatPhoneDisplay(phoneDigits) : e164,
    createdAt: supaUser.created_at,
    updatedAt: supaUser.updated_at,
    lastLoginAt: supaUser.last_sign_in_at ?? null,
  };
}

/**
 * Best-effort fetch of the canonical full name from the profiles row.
 * Returns null if it fails or there's nothing better than what we already
 * have. Runs in the background - never blocks the loading gate.
 */
async function fetchProfileName(userId: string): Promise<string | null> {
  try {
    const client = getSupabase();
    const { data, error } = await client
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle<Pick<ProfileRow, "full_name">>();
    if (!error && data?.full_name) {
      return data.full_name;
    }
  } catch {
    // best-effort
  }
  return null;
}

/**
 * Detects the "Invalid Refresh Token" family of errors. These happen when
 * the persisted session in AsyncStorage references a refresh token the
 * server no longer recognizes (rotated, expired, or wiped server-side).
 * The only safe recovery is to clear the dead session so the user re-auths.
 */
function isInvalidRefreshTokenError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return /refresh token not found|invalid refresh token|already used/i.test(
    message
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from existing session and subscribe to auth changes.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const client = getSupabase();

    // Enrich the display name from the profiles row without blocking.
    const enrichName = (userId: string) => {
      fetchProfileName(userId).then((name) => {
        if (!mounted || !name) return;
        setUser((prev) =>
          prev && prev.id === userId && prev.fullName !== name
            ? { ...prev, fullName: name }
            : prev
        );
      });
    };

    (async () => {
      try {
        const {
          data: { session },
        } = await client.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          // Set the user synchronously from the session (no network), so
          // the loading gate clears immediately. The name is refined after.
          setUser(baseAuthUser(session.user));
          enrichName(session.user.id);
        }
      } catch (error) {
        // A dead refresh token throws here. Clear the stale session so the
        // app falls back to the auth screen instead of being stuck in a
        // half-authenticated state.
        if (isInvalidRefreshTokenError(error)) {
          try {
            await client.auth.signOut();
          } catch {
            // ignore - we're already clearing local state below
          }
          if (mounted) setUser(null);
        }
        // otherwise ignore - fall through to clearing the loading gate
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = client.auth.onAuthStateChange(
      async (event, session: Session | null) => {
        if (!mounted) return;
        // The SDK emits TOKEN_REFRESHED on success; on a failed background
        // refresh it surfaces a null session (and may log an error). Treat
        // any session-less state as signed-out.
        if (session?.user) {
          setUser(baseAuthUser(session.user));
          enrichName(session.user.id);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      sendOtp: async ({ mode, fullName, phoneNumber }) => {
        if (!isSupabaseConfigured) {
          throw new Error(
            "Auth backend is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
          );
        }
        const phone = toE164(phoneNumber);
        const client = getSupabase();

        const { error } = await client.auth.signInWithOtp({
          phone,
          options: {
            // Sign-up: pass full_name via user_metadata; the
            // handle_new_user() trigger reads this to seed the profile row.
            // shouldCreateUser must be true for first-time sign-up; for
            // sign-in we keep it true as well so the OTP will succeed
            // even if the user is registering for the first time on the
            // sign-in tab. RLS still scopes everything by auth.uid().
            shouldCreateUser: true,
            data:
              mode === "signUp" && fullName
                ? { full_name: fullName }
                : undefined,
          },
        });

        if (error) {
          throw new Error(error.message || "Could not send OTP.");
        }

        return {
          // Supabase identifies the OTP request by phone number, not a
          // session id. Returning a stable placeholder keeps AuthScreen's
          // existing API happy.
          sessionId: phone,
          message: `OTP sent to ${formatPhoneDisplay(phoneNumber)}.`,
        };
      },

      verifyOtp: async ({ mode, fullName, phoneNumber, otp }) => {
        if (!isSupabaseConfigured) {
          throw new Error(
            "Auth backend is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
          );
        }
        const phone = toE164(phoneNumber);
        const code = otp.replace(/\D/g, "");
        if (code.length < 4) {
          throw new Error("Enter the OTP we sent you.");
        }

        const client = getSupabase();
        const { data, error } = await client.auth.verifyOtp({
          phone,
          token: code,
          type: "sms",
        });

        if (error || !data.user) {
          throw new Error(error?.message || "Incorrect OTP. Try again.");
        }

        // For sign-up, ensure the profile row reflects the latest name. The
        // trigger seeds it, but if the user changed the name between sending
        // and verifying the OTP, mirror the latest value.
        if (mode === "signUp" && fullName && fullName.trim().length > 0) {
          try {
            await client
              .from("profiles")
              .update({ full_name: fullName.trim() })
              .eq("id", data.user.id);
          } catch {
            // best-effort; the trigger has already created the row.
          }
        }

        // onAuthStateChange will populate `user`, no manual setUser needed.
      },

      logout: async () => {
        if (!isSupabaseConfigured) {
          setUser(null);
          return;
        }
        try {
          await getSupabase().auth.signOut();
        } catch {
          // ignore - state will reset via onAuthStateChange
        }
        setUser(null);
      },
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
