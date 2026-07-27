'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  FileCheck2,
  Car,
  Users,
  Navigation,
  CreditCard,
  LogOut,
  CarTaxiFront,
  Route,
} from 'lucide-react';

interface SidebarProps {
  pendingKycCount?: number;
}

export default function Sidebar({ pendingKycCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();

  const userEmail = user?.email || 'admin@mobilo.com';

  const navItems = [
    {
      group: 'Overview',
      items: [
        {
          name: 'KYC Review',
          href: '/dashboard/kyc',
          icon: FileCheck2,
          badge: pendingKycCount > 0 ? pendingKycCount : null,
        },
        {
          name: 'Drivers',
          href: '/dashboard/drivers',
          icon: Car,
        },
        {
          name: 'Customers',
          href: '/dashboard/customers',
          icon: Users,
        },
      ],
    },
    {
      group: 'Operations',
      items: [
        {
          name: 'Trips',
          href: '/dashboard/trips',
          icon: Navigation,
        },
        {
          name: 'Payments',
          href: '/dashboard/payments',
          icon: CreditCard,
        },
      ],
    },
    {
      group: 'Network',
      items: [
        {
          name: 'Routes',
          href: '/dashboard/routes',
          icon: Route,
        },
      ],
    },
  ];

  return (
    <aside className="w-60 bg-[#0d0d1a] border-r border-white/10 flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
      {/* Brand Logo Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <CarTaxiFront className="w-4 h-4" />
        </div>
        <span className="font-extrabold text-sm tracking-tight text-white">Mobilo</span>
        <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
          Admin
        </span>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 py-4 px-3 space-y-6">
        {navItems.map((section) => (
          <div key={section.group} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              {section.group}
            </div>
            {section.items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-500/15 text-white border border-indigo-500/30'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-indigo-400' : 'text-zinc-400'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Info & Sign out */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#111120] border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-white truncate">{userEmail}</div>
            <div className="text-[10px] text-zinc-400 truncate">Admin Active</div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 opacity-70" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
