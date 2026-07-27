'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASS } from '@/context/AdminAuthContext';
import { CarTaxiFront, LogIn, AlertCircle, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isInitializing, loginWithEmail, toast } = useAdminAuth();

  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState(DEFAULT_ADMIN_PASS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard/kyc');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await loginWithEmail(email, password);
      toast('Signed in successfully!', 'success');
      router.replace('/dashboard/kyc');
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Please check your email and password.';
      setErrorMessage(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070711] text-white">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#070711]">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.15),transparent)] pointer-events-none" />

      <div className="w-full max-w-md bg-[#111120] border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Brand logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <CarTaxiFront className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">Mobilo</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            Admin Portal
          </span>
        </div>

        <h1 className="text-xl font-extrabold text-white tracking-tight">Sign in to Admin</h1>
        <p className="text-xs text-zinc-400 mt-1 mb-6 leading-relaxed">
          Enter your admin credentials to access the management dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mobilo.com"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#181830] border border-white/10 text-white text-xs font-medium outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#181830] border border-white/10 text-white text-xs font-medium outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign in to Dashboard
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
