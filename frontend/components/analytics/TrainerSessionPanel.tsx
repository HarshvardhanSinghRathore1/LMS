'use client';
import React from 'react';
import { TrainerSessionMetrics } from '@/lib/analytics.types';

const STATUSES = [
  { key: 'pending' as const,   label: 'PENDING',   color: '#f59e0b' },
  { key: 'accepted' as const,  label: 'ACCEPTED',  color: '#6366f1' },
  { key: 'completed' as const, label: 'COMPLETED', color: '#10b981' },
  { key: 'declined' as const,  label: 'DECLINED',  color: '#e5383b' },
  { key: 'cancelled' as const, label: 'CANCELLED', color: '#6b7280' },
];

export default function TrainerSessionPanel({ sessions }: { sessions: TrainerSessionMetrics }) {
  const max = Math.max(sessions.total, 1);

  return (
    <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <span>🤝</span> Trainer Sessions
        </h3>
        <span className="text-xs text-[#b1a7a6] font-mono">Total: {sessions.total}</span>
      </div>

      <div className="space-y-2.5">
        {STATUSES.map(({ key, label, color }) => {
          const value = sessions[key];
          const pct = max > 0 ? Math.round((value / max) * 100) : 0;
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#b1a7a6] tracking-widest">{label}</span>
                <span className="font-bold tabular-nums" style={{ color }}>{value}</span>
              </div>
              <div className="h-2 rounded-full bg-[#0b090a] overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#2b2d42]/60">
        <div className="bg-[#0b090a] rounded-lg p-3 border border-[#2b2d42]">
          <div className="text-xs text-[#b1a7a6] uppercase tracking-widest">Acceptance Rate</div>
          <div className="text-lg font-bold text-[#6366f1] tabular-nums mt-1">
            {Number(sessions.acceptanceRate).toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#b1a7a6] mt-0.5">ACCEPTED / (PENDING+ACCEPTED+DECLINED)</div>
        </div>
        <div className="bg-[#0b090a] rounded-lg p-3 border border-[#2b2d42]">
          <div className="text-xs text-[#b1a7a6] uppercase tracking-widest">Completion Rate</div>
          <div className="text-lg font-bold text-[#10b981] tabular-nums mt-1">
            {Number(sessions.completionRate).toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#b1a7a6] mt-0.5">COMPLETED / (ACCEPTED+COMPLETED+CANCELLED)</div>
        </div>
      </div>
    </div>
  );
}
