'use client';
import React from 'react';
import { EnrollmentSummary } from '@/lib/analytics.types';

const STATUSES: Array<{ key: keyof EnrollmentSummary; label: string; color: string }> = [
  { key: 'enrolled', label: 'ENROLLED', color: '#6366f1' },
  { key: 'inProgress', label: 'IN PROGRESS', color: '#f59e0b' },
  { key: 'completed', label: 'COMPLETED', color: '#10b981' },
  { key: 'dropped', label: 'DROPPED', color: '#e5383b' },
];

export default function EnrollmentFunnelChart({ enrollment }: { enrollment: EnrollmentSummary }) {
  const max = Math.max(enrollment.total, 1);

  return (
    <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <span>📊</span> Enrollment Funnel
        </h3>
        <span className="text-xs text-[#b1a7a6] font-mono">Total: {enrollment.total}</span>
      </div>

      <div className="space-y-3">
        {STATUSES.map(({ key, label, color }) => {
          const value = enrollment[key] as number;
          const pct = max > 0 ? Math.round((value / max) * 100) : 0;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#b1a7a6] tracking-widest">{label}</span>
                <span className="font-bold tabular-nums" style={{ color }}>
                  {value}
                </span>
              </div>
              <div className="h-3 rounded-full bg-[#0b090a] overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
