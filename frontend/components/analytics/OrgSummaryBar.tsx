'use client';
import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: string;
  accent?: string;
  sub?: string;
}

function KPICard({ label, value, icon, accent = '#e5383b', sub }: KPICardProps) {
  return (
    <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-5 flex flex-col gap-3 hover:border-[#a4161a]/60 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-white tabular-nums">{value}</div>
        <div className="text-xs font-semibold text-[#b1a7a6] uppercase tracking-widest mt-1">{label}</div>
        {sub && <div className="text-[11px] text-[#b1a7a6] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

interface OrgSummaryBarProps {
  totalTrainees: number;
  activeLearnersLast30Days: number;
  certificateCount: number;
  passRate: number;
  avgCompletionRate: number;
}

export default function OrgSummaryBar({
  totalTrainees,
  activeLearnersLast30Days,
  certificateCount,
  passRate,
  avgCompletionRate,
}: OrgSummaryBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <KPICard label="Total Trainees" value={totalTrainees} icon="👥" accent="#e5383b" />
      <KPICard
        label="Active Learners"
        value={activeLearnersLast30Days}
        icon="🔥"
        accent="#f97316"
        sub="Last 30 days"
      />
      <KPICard label="Certificates Issued" value={certificateCount} icon="🏆" accent="#10b981" />
      <KPICard
        label="Assessment Pass Rate"
        value={`${Number(passRate).toFixed(1)}%`}
        icon="📝"
        accent="#6366f1"
      />
      <KPICard
        label="Avg Completion Rate"
        value={`${Number(avgCompletionRate).toFixed(1)}%`}
        icon="📈"
        accent="#f59e0b"
        sub="In-progress enrollments"
      />
    </div>
  );
}
