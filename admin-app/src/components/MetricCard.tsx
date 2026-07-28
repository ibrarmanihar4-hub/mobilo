'use client';

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';
  icon?: React.ReactNode;
}

export default function MetricCard({
  label,
  value,
  subtext,
  color = 'indigo',
  icon,
}: MetricCardProps) {
  const colorMap = {
    indigo: {
      line: 'bg-indigo-500',
      text: 'text-indigo-400',
    },
    emerald: {
      line: 'bg-emerald-500',
      text: 'text-emerald-400',
    },
    amber: {
      line: 'bg-amber-500',
      text: 'text-amber-400',
    },
    rose: {
      line: 'bg-rose-500',
      text: 'text-rose-400',
    },
    sky: {
      line: 'bg-sky-500',
      text: 'text-sky-400',
    },
  };

  const activeColor = colorMap[color] || colorMap.indigo;

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#111120] p-5 shadow-sm transition-all hover:border-white/20">
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${activeColor.line}`} />
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {label}
        </div>
        {icon && <div className="text-zinc-500 opacity-60">{icon}</div>}
      </div>
      <div className={`mt-2 text-2xl font-extrabold tracking-tight ${activeColor.text}`}>
        {value}
      </div>
      {subtext && <div className="mt-1 text-[11px] text-zinc-400">{subtext}</div>}
    </div>
  );
}
