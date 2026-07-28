'use client';

import React from 'react';

type BadgeType =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'online'
  | 'offline'
  | 'on_trip'
  | 'requested'
  | 'assigned'
  | 'arriving'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
  | 'paid'
  | 'failed'
  | 'created'
  | 'refunded'
  | 'rider'
  | 'driver'
  | string;

interface StatusBadgeProps {
  status: BadgeType;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase();

  let styles = 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 dot-zinc-500';

  switch (normalized) {
    case 'pending':
    case 'requested':
    case 'refunded':
      styles = 'bg-amber-500/10 text-amber-400 border-amber-500/20 dot-amber-400';
      break;
    case 'approved':
    case 'online':
    case 'completed':
    case 'paid':
    case 'driver':
      styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 dot-emerald-400';
      break;
    case 'rejected':
    case 'cancelled':
    case 'failed':
      styles = 'bg-rose-500/10 text-rose-400 border-rose-500/20 dot-rose-400';
      break;
    case 'on_trip':
    case 'assigned':
    case 'arriving':
      styles = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 dot-indigo-400';
      break;
    case 'ongoing':
    case 'rider':
      styles = 'bg-sky-500/10 text-sky-400 border-sky-500/20 dot-sky-400';
      break;
    case 'offline':
    case 'created':
    default:
      styles = 'bg-zinc-800/60 text-zinc-400 border-zinc-700/40 dot-zinc-500';
      break;
  }

  const label = (status || 'none').replace('_', ' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide capitalize border ${styles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      {label}
    </span>
  );
}
