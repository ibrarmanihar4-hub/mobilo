'use client';

import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { DashboardRefreshContext } from '../layout';
import { DriverRow } from '@/lib/types';
import MetricCard from '@/components/MetricCard';
import StatusBadge from '@/components/StatusBadge';
import { Car, Radio, Navigation, CheckCircle2, Search, Star, Ban } from 'lucide-react';

export default function DriversPage() {
  const { toast } = useAdminAuth();
  const { refreshKey, triggerRefresh } = useContext(DashboardRefreshContext);

  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDrivers = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/drivers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load drivers.');
      setDrivers((data.rows || []) as DriverRow[]);
    } catch (err: any) {
      toast(err.message || 'Failed to load drivers.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers, refreshKey]);

  const handleBlockDriver = async (driverId: string) => {
    if (!confirm('Force this driver offline? They will stop receiving trip offers.')) return;

    try {
      const res = await fetch(`/api/admin/drivers/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'offline' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not block driver.');

      toast('Driver has been set offline.', 'info');
      triggerRefresh();
    } catch (err: any) {
      toast(err.message || 'Could not block driver.', 'error');
    }
  };

  // Metrics
  const totalCount = drivers.length;
  const onlineCount = drivers.filter((d) => d.status === 'online').length;
  const onTripCount = drivers.filter((d) => d.status === 'on_trip').length;
  const verifiedCount = drivers.filter(
    (d) => d.driver_kyc && d.driver_kyc.status === 'approved'
  ).length;

  // Filtered
  const filteredDrivers = drivers.filter((d) => {
    const matchesStatus = !filterStatus || d.status === filterStatus;
    const name = d.full_name.toLowerCase();
    const phone = (d.phone || '').toLowerCase();
    const plate = (d.vehicle_plate || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query || name.includes(query) || phone.includes(query) || plate.includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">Driver Directory</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Monitor active drivers, vehicle details, live status, and verification state.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total Drivers"
          value={totalCount}
          subtext="Registered accounts"
          color="indigo"
          icon={<Car className="w-5 h-5" />}
        />
        <MetricCard
          label="Online Now"
          value={onlineCount}
          subtext="Available for trips"
          color="emerald"
          icon={<Radio className="w-5 h-5" />}
        />
        <MetricCard
          label="On Trip"
          value={onTripCount}
          subtext="Currently driving rider"
          color="sky"
          icon={<Navigation className="w-5 h-5" />}
        />
        <MetricCard
          label="KYC Verified"
          value={verifiedCount}
          subtext="Approved documents"
          color="emerald"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-white/10 bg-[#111120] overflow-hidden shadow-xl">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Driver List</span>
            <span className="text-xs text-zinc-400 font-medium">
              ({filteredDrivers.length} driver{filteredDrivers.length !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#181830] border border-white/10 text-white text-xs font-medium outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="online">Online</option>
              <option value="on_trip">On Trip</option>
              <option value="offline">Offline</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, phone, or plate..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[#181830] border border-white/10 text-white text-xs font-medium outline-none focus:border-indigo-500 w-52 focus:w-64 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 space-y-2">
            <Car className="w-10 h-10 mx-auto opacity-30" />
            <div className="text-sm font-semibold">No drivers found</div>
            <div className="text-xs text-zinc-400">Try adjusting your filters.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-semibold uppercase tracking-wider text-[10px] bg-white/[0.02]">
                  <th className="py-3 px-5">Driver</th>
                  <th className="py-3 px-5">Vehicle</th>
                  <th className="py-3 px-5">Rating</th>
                  <th className="py-3 px-5">KYC Status</th>
                  <th className="py-3 px-5">Online Status</th>
                  <th className="py-3 px-5">Joined</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredDrivers.map((driver) => {
                  const kycStatus = driver.driver_kyc?.status;

                  return (
                    <tr key={driver.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/20 shrink-0">
                            {driver.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{driver.full_name}</div>
                            <div className="text-[11px] text-zinc-400">
                              {driver.phone || 'No phone'} •{' '}
                              <span className="capitalize">{driver.ride_type}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-white">
                          {driver.vehicle_plate || '—'}
                        </div>
                        <div className="text-[11px] text-zinc-400">{driver.vehicle_label}</div>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="inline-flex items-center gap-1 font-bold text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{driver.rating}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        {kycStatus ? (
                          <StatusBadge status={kycStatus} />
                        ) : (
                          <span className="text-zinc-500 font-medium">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        <StatusBadge status={driver.status} />
                      </td>

                      <td className="py-3.5 px-5 text-zinc-400 whitespace-nowrap">
                        {new Date(driver.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        {driver.status !== 'offline' && (
                          <button
                            onClick={() => handleBlockDriver(driver.id)}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-zinc-300 hover:text-rose-400 font-semibold text-[11px] inline-flex items-center gap-1 transition-all"
                          >
                            <Ban className="w-3 h-3" /> Force Offline
                          </button>
                        )}
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
