'use client';

import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { DashboardRefreshContext } from '../layout';
import { PaymentRow } from '@/lib/types';
import MetricCard from '@/components/MetricCard';
import StatusBadge from '@/components/StatusBadge';
import { CreditCard, CheckCircle2, AlertCircle, Banknote, Search } from 'lucide-react';

export default function PaymentsPage() {
  const { toast } = useAdminAuth();
  const { refreshKey } = useContext(DashboardRefreshContext);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/payments');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load payment records.');
      setPayments((data.rows || []) as PaymentRow[]);
    } catch (err: any) {
      toast(err.message || 'Failed to load payment records.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments, refreshKey]);

  // Metrics
  const totalCount = payments.length;
  const paidPayments = payments.filter((p) => p.status === 'paid');
  const totalCollectedPaise = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const failedCount = payments.filter((p) => p.status === 'failed').length;
  const cashCount = payments.filter((p) => (p.method || '').toLowerCase() === 'cash').length;

  const formatRupees = (paise: number) => {
    return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  };

  // Filtered
  const filteredPayments = payments.filter((p) => {
    const matchesStatus = !filterStatus || p.status === filterStatus;
    const bookingCode = (p.booking_code || '').toLowerCase();
    const gatewayId = (p.gateway_payment_id || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    return (
      matchesStatus &&
      (!query || bookingCode.includes(query) || gatewayId.includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">Payment Ledger</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Complete ledger of gateway transactions, payment methods, and financial statuses.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Payment Records"
          value={totalCount}
          subtext="All payment attempts"
          color="indigo"
          icon={<CreditCard className="w-5 h-5" />}
        />
        <MetricCard
          label="Total Revenue Collected"
          value={formatRupees(totalCollectedPaise)}
          subtext={`${paidPayments.length} paid transactions`}
          color="emerald"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <MetricCard
          label="Failed Payments"
          value={failedCount}
          subtext="Payment gateway errors"
          color="rose"
          icon={<AlertCircle className="w-5 h-5" />}
        />
        <MetricCard
          label="Cash Transactions"
          value={cashCount}
          subtext="Collected by driver"
          color="amber"
          icon={<Banknote className="w-5 h-5" />}
        />
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-white/10 bg-[#111120] overflow-hidden shadow-xl">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Transactions</span>
            <span className="text-xs text-zinc-400 font-medium">
              ({filteredPayments.length} record{filteredPayments.length !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#181830] border border-white/10 text-white text-xs font-medium outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="created">Created</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            <div className="relative flex-1 min-w-[160px] sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Booking code or payment ID..."
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
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 space-y-2">
            <CreditCard className="w-10 h-10 mx-auto opacity-30" />
            <div className="text-sm font-semibold">No payments found</div>
            <div className="text-xs text-zinc-400">Try adjusting your status filter.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-semibold uppercase tracking-wider text-[10px] bg-white/[0.02]">
                  <th className="py-3 px-5">Booking</th>
                  <th className="py-3 px-5">Amount</th>
                  <th className="py-3 px-5">Method</th>
                  <th className="py-3 px-5">Gateway</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredPayments.map((payment) => {
                  return (
                    <tr key={payment.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[11px] text-zinc-300 font-semibold">
                        {payment.booking_code}
                      </td>

                      <td className="py-3.5 px-5 font-bold text-white">
                        {formatRupees(payment.amount)}
                      </td>

                      <td className="py-3.5 px-5 uppercase text-[11px] font-semibold text-zinc-300">
                        {payment.method}
                      </td>

                      <td className="py-3.5 px-5 text-zinc-400 capitalize">{payment.gateway}</td>

                      <td className="py-3.5 px-5">
                        <StatusBadge status={payment.status} />
                      </td>

                      <td className="py-3.5 px-5 text-zinc-400 whitespace-nowrap">
                        {new Date(payment.created_at).toLocaleDateString('en-IN', {
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
