'use client';

import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { DashboardRefreshContext } from '../layout';
import { ProfileRow } from '@/lib/types';
import MetricCard from '@/components/MetricCard';
import StatusBadge from '@/components/StatusBadge';
import { Users, UserCheck, UserPlus, Search } from 'lucide-react';

export default function CustomersPage() {
  const { toast } = useAdminAuth();
  const { refreshKey } = useContext(DashboardRefreshContext);

  const [customers, setCustomers] = useState<ProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load customer profiles.');
      setCustomers((data.rows || []) as ProfileRow[]);
    } catch (err: any) {
      toast(err.message || 'Failed to load customer profiles.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers, refreshKey]);

  // Metrics
  const totalCount = customers.length;
  const activeCount = customers.filter((c) => (c.tripCount || 0) > 0).length;
  const new7DaysCount = customers.filter(
    (c) => new Date(c.created_at) > new Date(Date.now() - 7 * 86400000)
  ).length;

  // Filtered
  const filteredCustomers = customers.filter((c) => {
    const name = (c.full_name || '').toLowerCase();
    const phone = (c.phone || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    return !query || name.includes(query) || phone.includes(query);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">Customer Directory</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Registered rider accounts, trip activity, and registration trends.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Total Riders"
          value={totalCount}
          subtext="Registered rider accounts"
          color="indigo"
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          label="Active Riders"
          value={activeCount}
          subtext="At least 1 completed trip"
          color="emerald"
          icon={<UserCheck className="w-5 h-5" />}
        />
        <MetricCard
          label="New (Last 7 Days)"
          value={new7DaysCount}
          subtext="Recent signups"
          color="sky"
          icon={<UserPlus className="w-5 h-5" />}
        />
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-white/10 bg-[#111120] overflow-hidden shadow-xl">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Rider Accounts</span>
            <span className="text-xs text-zinc-400 font-medium">
              ({filteredCustomers.length} rider{filteredCustomers.length !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="relative w-full sm:w-auto">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or phone..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-[#181830] border border-white/10 text-white text-xs font-medium outline-none focus:border-indigo-500 w-full sm:w-52 sm:focus:w-64 transition-all"
            />
          </div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 space-y-2">
            <Users className="w-10 h-10 mx-auto opacity-30" />
            <div className="text-sm font-semibold">No customers found</div>
            <div className="text-xs text-zinc-400">Try adjusting your search query.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-semibold uppercase tracking-wider text-[10px] bg-white/[0.02]">
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-5">Account Role</th>
                  <th className="py-3 px-5">Completed Trips</th>
                  <th className="py-3 px-5">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredCustomers.map((customer) => {
                  const name = customer.full_name || 'Rider';
                  const phone = customer.phone || 'No phone';

                  return (
                    <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-400 font-bold flex items-center justify-center text-xs border border-sky-500/20 shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{name}</div>
                            <div className="text-[11px] text-zinc-400">{phone}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <StatusBadge status={customer.role || 'rider'} />
                      </td>

                      <td className="py-3.5 px-5 font-bold text-white">
                        {customer.tripCount || 0}
                      </td>

                      <td className="py-3.5 px-5 text-zinc-400 whitespace-nowrap">
                        {new Date(customer.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
