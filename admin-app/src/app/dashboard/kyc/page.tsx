'use client';

import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { DashboardRefreshContext } from '../layout';
import { DriverKycRow, KycStatus } from '@/lib/types';
import MetricCard from '@/components/MetricCard';
import StatusBadge from '@/components/StatusBadge';
import KycDrawer from '@/components/KycDrawer';
import ImageLightbox from '@/components/ImageLightbox';
import { FileCheck2, Clock, CheckCircle2, XCircle, Search, Eye, Check, X } from 'lucide-react';

export default function KycPage() {
  const { toast } = useAdminAuth();
  const { refreshKey, triggerRefresh, setPendingKycCount } = useContext(DashboardRefreshContext);

  const [kycRows, setKycRows] = useState<DriverKycRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected row for detail drawer & image lightbox
  const [selectedKyc, setSelectedKyc] = useState<DriverKycRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchKycData = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/kyc');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load KYC submissions.');

      const rows = (data.rows || []) as DriverKycRow[];
      setKycRows(rows);

      const pendingCount = rows.filter((r) => r.status === 'pending').length;
      setPendingKycCount(pendingCount);
    } catch (err: any) {
      toast(err.message || 'Failed to load KYC submissions.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast, setPendingKycCount]);

  useEffect(() => {
    fetchKycData();
  }, [fetchKycData, refreshKey]);

  // Actions
  const handleApprove = async (driverId: string) => {
    try {
      const res = await fetch(`/api/admin/kyc/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not approve KYC.');

      toast('Driver KYC approved successfully!', 'success');
      triggerRefresh();
    } catch (err: any) {
      toast(err.message || 'Could not approve KYC.', 'error');
    }
  };

  const handleReject = async (driverId: string, reason: string) => {
    try {
      const res = await fetch(`/api/admin/kyc/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', rejectionReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not reject KYC.');

      toast('Driver KYC rejected.', 'error');
      triggerRefresh();
    } catch (err: any) {
      toast(err.message || 'Could not reject KYC.', 'error');
    }
  };

  // Metrics
  const totalCount = kycRows.length;
  const pendingCount = kycRows.filter((r) => r.status === 'pending').length;
  const approvedCount = kycRows.filter((r) => r.status === 'approved').length;
  const rejectedCount = kycRows.filter((r) => r.status === 'rejected').length;

  // Filtered rows
  const filteredRows = kycRows.filter((r) => {
    const matchesStatus = !filterStatus || r.status === filterStatus;
    const name = (r.drivers?.full_name || r.full_name || '').toLowerCase();
    const phone = (r.drivers?.phone || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query) || phone.includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">KYC Review Queue</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Review and verify driver identity documents before they can go online and take trips.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Submissions"
          value={totalCount}
          subtext="All time"
          color="indigo"
          icon={<FileCheck2 className="w-5 h-5" />}
        />
        <MetricCard
          label="Pending Review"
          value={pendingCount}
          subtext="Awaiting action"
          color="amber"
          icon={<Clock className="w-5 h-5" />}
        />
        <MetricCard
          label="Approved"
          value={approvedCount}
          subtext="Verified drivers"
          color="emerald"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <MetricCard
          label="Rejected"
          value={rejectedCount}
          subtext="Requires resubmission"
          color="rose"
          icon={<XCircle className="w-5 h-5" />}
        />
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-white/10 bg-[#111120] overflow-hidden shadow-xl">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Submissions</span>
            <span className="text-xs text-zinc-400 font-medium">
              ({filteredRows.length} result{filteredRows.length !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#181830] border border-white/10 text-white text-xs font-medium outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="relative flex-1 min-w-[160px] sm:flex-initial">
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
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 space-y-2">
            <FileCheck2 className="w-10 h-10 mx-auto opacity-30" />
            <div className="text-sm font-semibold">No KYC submissions found</div>
            <div className="text-xs text-zinc-400">Try adjusting your filters or search query.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-semibold uppercase tracking-wider text-[10px] bg-white/[0.02]">
                  <th className="py-3 px-5">Driver</th>
                  <th className="py-3 px-5">Vehicle No.</th>
                  <th className="py-3 px-5">Ride Type</th>
                  <th className="py-3 px-5">Submitted</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredRows.map((row) => {
                  const name = row.drivers?.full_name || row.full_name || 'Unknown';
                  const phone = row.drivers?.phone || 'No phone';

                  return (
                    <tr
                      key={row.driver_id}
                      onClick={() => {
                        setSelectedKyc(row);
                        setIsDrawerOpen(true);
                      }}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/20 shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{name}</div>
                            <div className="text-[11px] text-zinc-400">{phone}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 font-semibold text-white">
                        {row.vehicle_number || '—'}
                      </td>

                      <td className="py-3.5 px-5 text-zinc-400 capitalize">
                        {row.drivers?.ride_type || '—'}
                      </td>

                      <td className="py-3.5 px-5 text-zinc-400 whitespace-nowrap">
                        {row.submitted_at
                          ? new Date(row.submitted_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>

                      <td className="py-3.5 px-5">
                        <StatusBadge status={row.status} />
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleApprove(row.driver_id)}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 transition-all"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedKyc(row);
                                  setIsDrawerOpen(true);
                                }}
                                className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold text-[11px] flex items-center gap-1 transition-all"
                              >
                                <X className="w-3 h-3" /> Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedKyc(row);
                                setIsDrawerOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 font-semibold text-[11px] flex items-center gap-1 transition-all"
                            >
                              <Eye className="w-3 h-3" /> View Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Drawer */}
      <KycDrawer
        kycRow={selectedKyc}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        onOpenImage={(url) => setLightboxUrl(url)}
      />

      {/* Image Lightbox */}
      <ImageLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
