'use client';
import React from 'react';
import { AssessmentMetrics } from '@/lib/analytics.types';

function DonutRing({
  percentage,
  color,
  size = 100,
}: {
  percentage: number;
  color: string;
  size?: number;
}) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (percentage / 100) * circ;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#0b090a" strokeWidth="14" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text x="50" y="55" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
        {Math.round(percentage)}%
      </text>
    </svg>
  );
}

export default function AssessmentMetricsPanel({ assessment }: { assessment: AssessmentMetrics }) {
  return (
    <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 space-y-4">
      <h3 className="font-bold text-white text-base flex items-center gap-2">
        <span>📝</span> Assessment Metrics
      </h3>

      <div className="flex gap-8 items-center justify-center py-2">
        <div className="flex flex-col items-center gap-2">
          <DonutRing percentage={Number(assessment.passRate)} color="#10b981" />
          <span className="text-xs font-semibold text-[#b1a7a6] uppercase tracking-widest">Pass Rate</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <DonutRing percentage={Number(assessment.averageScore)} color="#6366f1" />
          <span className="text-xs font-semibold text-[#b1a7a6] uppercase tracking-widest">Avg Score</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2b2d42]/60">
        <div className="text-center">
          <div className="text-lg font-bold text-white tabular-nums">{assessment.totalSubmissions}</div>
          <div className="text-[10px] text-[#b1a7a6] uppercase tracking-widest">Total Submissions</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white tabular-nums">{assessment.gradedSubmissions}</div>
          <div className="text-[10px] text-[#b1a7a6] uppercase tracking-widest">Graded</div>
        </div>
      </div>
    </div>
  );
}
