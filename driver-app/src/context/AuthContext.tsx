// Driver auth - Supabase phone OTP (same mechanism as the rider app).

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

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  sendOtp: (phoneNumber: string) => Promise<void>;
  verifyOtp: (phoneNumber: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toE164(phoneNumber: string): string {
  const last10 = phoneNumber.replace(/\D/g, "").slice(-10);
  if (last10.length !== 10) {
    throw new Error("Enter a valid 10-digit phone number.");
  }
  return `+91${last10}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const client = getSupabase();

    (async () => {
      try {
        const {
          data: { session },
        } = await client.auth.getSession();
        if (mounted && session?.user) setUser(session.user);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = client.auth.onAuthStateChange(
      (_event, session: Session | null) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
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
      sendOtp: async (phoneNumber) => {
        const phone = toE164(phoneNumber);
        const { error } = await getSupabase().auth.signInWithOtp({
          phone,
          options: { shouldCreateUser: true },
        });
        if (error) throw new Error(error.message || "Could not send OTP.");
      },
      verifyOtp: async (phoneNumber, otp) => {
        const phone = toE164(phoneNumber);
        const code = otp.replace(/\D/g, "");
        const { data, error } = await getSupabase().auth.verifyOtp({
          phone,
          token: code,
          type: "sms",
        });
        if (error || !data.user) {
          throw new Error(error?.message || "Incorrect OTP. Try again.");
        }
      },
      logout: async () => {
        try {
          await getSupabase().auth.signOut();
        } catch {
          // ignore
        }
        setUser(null);
      },
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider.");
  return ctx;
}
