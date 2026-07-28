'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { RefreshCw, Menu } from 'lucide-react';

interface TopbarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onMenuClick?: () => void;
}

const CRUMB_TITLES: Record<string, string> = {
  '/dashboard/kyc': 'KYC Review',
  '/dashboard/drivers': 'Drivers',
  '/dashboard/customers': 'Customers',
  '/dashboard/trips': 'Trips',
  '/dashboard/payments': 'Payments',
  '/dashboard/routes': 'Routes',
};

export default function Topbar({ onRefresh, isRefreshing, onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const currentTitle = CRUMB_TITLES[pathname] || 'Dashboard';

  return (
    <header className="h-14 border-b border-white/10 bg-[#0d0d1a] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 md:hidden shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-xs text-zinc-400 min-w-0 truncate">
          <span className="hidden sm:inline">Mobilo Admin</span>
          <span className="hidden sm:inline text-zinc-400">/</span>
          <span className="font-semibold text-white truncate">{currentTitle}</span>
        </div>
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg border border-white/10 bg-[#181830] text-zinc-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </header>
  );
}
