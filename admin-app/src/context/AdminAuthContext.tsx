'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AdminUser {
  email: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// Default Admin Credentials (kept here for display on the login screen).
export const DEFAULT_ADMIN_EMAIL = 'admin@mobilo.com';
export const DEFAULT_ADMIN_PASS = 'admin123';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check for an existing (signed, httpOnly) admin session cookie on load.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser({ email: data.email });
          setIsAuthenticated(true);
        }
      } finally {
        setIsInitializing(false);
      }
    })();
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || 'Authentication failed.');
    }

    setUser({ email: data.email });
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isInitializing,
        loginWithEmail,
        logout,
        toast,
        toasts,
        removeToast,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
