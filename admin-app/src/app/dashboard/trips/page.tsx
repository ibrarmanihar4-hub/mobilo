'use client';

import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { DashboardRefreshContext } from '../layout';
import { TripRow } from '@/lib/types';
import MetricCard from '@/components/MetricCard';
import StatusBadge from '@/components/StatusBadge';
import { Navigation, CheckCircle2, Radio, XCircle, IndianRupee, Search, Ban } from 'lucide-react';

export default function TripsPage() {
  const { toast } = useAdminAuth();
  const { refreshKey, triggerRefresh } = useContext(DashboardRefreshContext);

  const [trips, setTrips] = useState<TripRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTrips = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/trips');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load trips.');
      setTrips((data.rows || []) as TripRow[]);
    } catch (err: any) {
      toast(err.message || 'Failed to load trips.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips, refreshKey]);

  const handleCancelTrip = async (tripId: string) => {
    if (!confirm('Cancel this pending trip? The rider will be notified.')) return;

    try {
      const res = await fetch(`/api/admin/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not cancel trip.');

      toast('Trip cancelled by admin.', 'info');
      triggerRefresh();
    } catch (err: any) {
      toast(err.message || 'Could not cancel trip.', 'error');
    }
  };

  // Metrics
  const totalCount = trips.length;
  const completedCount = trips.filter((t) => t.status === 'completed').length;
  const activeCount = trips.filter((t) =>
    ['assigned', 'arriving', 'ongoing'].includes(t.status)
  ).length;
  const cancelledCount = trips.filter((t) => t.status === 'cancelled').length;
  const gmv = trips
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.fare || 0), 0);

  // Filtered
  const filteredTrips = trips.filter((t) => {
    const matchesStatus = !filterStatus || t.status === filterStatus;
    const bookingCode = (t.booking_code || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    return matchesStatus && (!query || bookingCode.includes(query));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">Trip Ledger</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Real-time record of all direct ride requests, driver assignments, and trip lifecycles.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          label="Total Trips"
          value={totalCount}
          subtext="All ride requests"
          color="indigo"
          icon={<Navigation className="w-5 h-5" />}
        />
        <MetricCard
          label="Completed"
          value={completedCount}
          subtext="Finished rides"
          color="emerald"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <MetricCard
          label="Active Now"
          value={activeCount}
          subtext="Assigned or ongoing"
          color="sky"
          icon={<Radio className="w-5 h-5" />}
        />
        <MetricCard
          label="Cancelled"
          value={cancelledCount}
          subtext="Rider/driver/admin"
          color="rose"
          icon={<XCircle className="w-5 h-5" />}
        />
        <MetricCard
          label="Total GMV"
          value={`₹${gmv.toLocaleString('en-IN')}`}
          subtext="Completed fare sum"
          color="emerald"
          icon={<IndianRupee className="w-5 h-5" />}
        />
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-white/10 bg-[#111120] overflow-hidden shadow-xl">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Trip Records</span>
            <span className="text-xs text-zinc-400 font-medium">
              ({filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#181830] border border-white/10 text-white text-xs font-medium outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="requested">Requested</option>
              <option value="assigned">Assigned</option>
              <option value="arriving">Arriving</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Booking code..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[#181830] border border-white/10 text-white text-xs font-medium outline-none focus:border-indigo-500 w-48 focus:w-60 transition-all"
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
        ) : filteredTrips.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 space-y-2">
            <Navigation className="w-10 h-10 mx-auto opacity-30" />
            <div className="text-sm font-semibold">No trips found</div>
            <div className="text-xs text-zinc-400">Try adjusting your status filter.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-semibold uppercase tracking-wider text-[10px] bg-white/[0.02]">
                  <th className="py-3 px-5">Booking</th>
                  <th className="py-3 px-5">Ride Type</th>
                  <th className="py-3 px-5">Route</th>
                  <th className="py-3 px-5">Fare</th>
                  <th className="py-3 px-5">Assigned Driver</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Requested Time</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredTrips.map((trip) => {
                  return (
                    <tr key={trip.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[11px] text-zinc-300 font-semibold">
                        {trip.booking_code}
                      </td>

                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {trip.ride_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 max-w-[220px]">
                        <div
                          className="truncate text-white font-medium text-xs"
                          title={`${trip.pickup_name} → ${trip.drop_name}`}
                        >
                          {trip.pickup_name} → {trip.drop_name}
                        </div>
                      </td>

                      <td className="py-3.5 px-5 font-bold text-white">₹{trip.fare}</td>

                      <td className="py-3.5 px-5 text-zinc-300">
                        {trip.drivers?.full_name || (
                          <span className="text-zinc-500 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        <StatusBadge status={trip.status} />
                      </td>

                      <td className="py-3.5 px-5 text-zinc-400 whitespace-nowrap">
                        {new Date(trip.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        {trip.status === 'requested' && (
                          <button
                            onClick={() => handleCancelTrip(trip.id)}
                            className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold text-[11px] inline-flex items-center gap-1 transition-all"
                          >
                            <Ban className="w-3 h-3" /> Cancel
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
