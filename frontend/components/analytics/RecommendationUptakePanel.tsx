'use client';
import React from 'react';
import { RecommendationMetrics } from '@/lib/analytics.types';

export default function RecommendationUptakePanel({ recommendations }: { recommendations: RecommendationMetrics }) {
  const segments = [
    { label: 'ACTIVE', value: recommendations.active, rate: recommendations.activeRate, color: '#6366f1' },
    { label: 'ENROLLED', value: recommendations.enrolled, rate: recommendations.enrolledRate, color: '#10b981' },
    { label: 'DISMISSED', value: recommendations.dismissed, rate: recommendations.dismissedRate, color: '#6b7280' },
  ];

  const total = recommendations.total || 1;

  // SVG donut segments
  const r = 40;
  const circ = 2 * Math.PI * r;
  let offset = circ / 4; // start from top

  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circ;
    const arc = { ...seg, dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <span>💡</span> Recommendation Uptake
        </h3>
        <span className="text-xs text-[#b1a7a6] font-mono">Total: {recommendations.total}</span>
      </div>

      <div className="flex items-center gap-8 justify-center py-2">
        {/* Donut */}
        <svg width={120} height={120} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#0b090a" strokeWidth="14" />
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth="14"
              strokeDasharray={`${a.dash} ${circ - a.dash}`}
              strokeDashoffset={-a.offset}
              className="transition-all duration-700"
            />
          ))}
          <text x="50" y="52" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
            {recommendations.total}
          </text>
          <text x="50" y="62" textAnchor="middle" fill="#b1a7a6" fontSize="7">
            TOTAL
          </text>
        </svg>

        {/* Legend */}
        <div className="space-y-3">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[#b1a7a6] w-20 font-semibold tracking-widest">{seg.label}</span>
              <span className="font-bold text-white tabular-nums w-8 text-right">{seg.value}</span>
              <span className="text-[#b1a7a6] tabular-nums">({Number(seg.rate).toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
