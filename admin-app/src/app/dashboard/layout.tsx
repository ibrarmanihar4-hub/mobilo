'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export const DashboardRefreshContext = React.createContext<{
  refreshKey: number;
  triggerRefresh: () => void;
  pendingKycCount: number;
  setPendingKycCount: (count: number) => void;
}>({
  refreshKey: 0,
  triggerRefresh: () => {},
  pendingKycCount: 0,
  setPendingKycCount: () => {},
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitializing } = useAdminAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingKycCount, setPendingKycCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 600);
  }, []);

  // Fetch pending KYC count for sidebar badge
  useEffect(() => {
    if (!isAuthenticated) return;

    fetch('/api/admin/kyc/pending-count')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.count === 'number') setPendingKycCount(data.count);
      })
      .catch(() => {});
  }, [isAuthenticated, refreshKey]);

  // Auth guard
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isInitializing, router]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (isInitializing || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070711] text-white">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardRefreshContext.Provider
      value={{
        refreshKey,
        triggerRefresh,
        pendingKycCount,
        setPendingKycCount,
      }}
    >
      <div className="flex h-screen overflow-hidden bg-[#070711]">
        <Sidebar
          pendingKycCount={pendingKycCount}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar
            onRefresh={triggerRefresh}
            isRefreshing={isRefreshing}
            onMenuClick={() => setIsSidebarOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </DashboardRefreshContext.Provider>
  );
}
