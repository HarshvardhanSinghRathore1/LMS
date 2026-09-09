'use client';
import React from 'react';
import { TopSkillGap } from '@/lib/analytics.types';

export default function TopSkillGapsTable({ gaps }: { gaps: TopSkillGap[] }) {
  if (gaps.length === 0) {
    return (
      <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 text-center text-[#b1a7a6] text-sm">
        <div className="text-3xl mb-2">🎯</div>
        No skill gap data yet. Competencies will appear once trainees are assessed.
      </div>
    );
  }

  const maxGap = Math.max(...gaps.map((g) => g.averageGapPercentage), 1);

  function gapColor(pct: number) {
    if (pct >= 60) return '#e5383b';
    if (pct >= 30) return '#f59e0b';
    return '#10b981';
  }

  return (
    <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 space-y-4">
      <h3 className="font-bold text-white text-base flex items-center gap-2">
        <span>🎯</span> Top Skill Gaps
      </h3>
      <div className="space-y-3">
        {gaps.map((g, i) => (
          <div key={g.competencyId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[#b1a7a6] w-5 text-right">{i + 1}.</span>
                <span className="font-semibold text-white">{g.competencyName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2b2d42] text-[#b1a7a6] font-mono">
                  {g.competencyCode}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#b1a7a6]">{g.traineeCount} trainees</span>
                <span className="font-bold tabular-nums" style={{ color: gapColor(g.averageGapPercentage) }}>
                  {Number(g.averageGapPercentage).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-[#0b090a] overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{
                  width: `${(g.averageGapPercentage / maxGap) * 100}%`,
                  backgroundColor: gapColor(g.averageGapPercentage),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
