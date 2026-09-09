'use client';
import React from 'react';
import { SkillGapDistribution } from '@/lib/analytics.types';

const BUCKETS: SkillGapDistribution['gapBucket'][] = [
  '0', '1-24.99', '25-49.99', '50-74.99', '75-100'
];

const BUCKET_COLORS: Record<string, string> = {
  '0':        '#10b981',
  '1-24.99':  '#84cc16',
  '25-49.99': '#f59e0b',
  '50-74.99': '#f97316',
  '75-100':   '#e5383b',
};

const BUCKET_LABELS: Record<string, string> = {
  '0':        'No Gap',
  '1-24.99':  'Low',
  '25-49.99': 'Medium',
  '50-74.99': 'High',
  '75-100':   'Critical',
};

export default function SkillGapHeatmap({ distribution }: { distribution: SkillGapDistribution[] }) {
  if (distribution.length === 0) {
    return (
      <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 text-center text-[#b1a7a6] text-sm">
        <div className="text-3xl mb-2">🗺️</div>
        No skill gap distribution data yet.
      </div>
    );
  }

  // Group by competency
  const competencies = Array.from(
    new Map(distribution.map((d) => [d.competencyId, { id: d.competencyId, code: d.competencyCode, name: d.competencyName }])).values()
  );

  // Build lookup: competencyId → bucket → count
  const lookup = new Map<string, Map<string, number>>();
  for (const d of distribution) {
    if (!lookup.has(d.competencyId)) lookup.set(d.competencyId, new Map());
    lookup.get(d.competencyId)!.set(d.gapBucket, d.traineeCount);
  }

  const maxCount = Math.max(...distribution.map((d) => d.traineeCount), 1);

  return (
    <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 space-y-4">
      <h3 className="font-bold text-white text-base flex items-center gap-2">
        <span>🗺️</span> Skill Gap Heatmap
      </h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {BUCKETS.map((b) => (
          <div key={b} className="flex items-center gap-1.5 text-[11px] text-[#b1a7a6]">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: BUCKET_COLORS[b] }} />
            {BUCKET_LABELS[b]} ({b === '0' ? '0%' : `${b}%`})
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[#b1a7a6] font-semibold pb-2 pr-4 whitespace-nowrap">Competency</th>
              {BUCKETS.map((b) => (
                <th key={b} className="text-center text-[#b1a7a6] font-semibold pb-2 px-2 whitespace-nowrap">
                  {BUCKET_LABELS[b]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2b2d42]/30">
            {competencies.map((comp) => (
              <tr key={comp.id}>
                <td className="py-1.5 pr-4 font-mono text-[#f5f3f4] whitespace-nowrap">{comp.code}</td>
                {BUCKETS.map((b) => {
                  const count = lookup.get(comp.id)?.get(b) ?? 0;
                  const intensity = count > 0 ? 0.15 + (count / maxCount) * 0.85 : 0;
                  return (
                    <td key={b} className="px-2 py-1.5 text-center">
                      <div
                        className="w-full h-7 rounded flex items-center justify-center font-bold text-white text-[11px] transition-all"
                        style={{
                          backgroundColor: count > 0
                            ? `${BUCKET_COLORS[b]}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`
                            : '#0b090a',
                          border: count > 0 ? `1px solid ${BUCKET_COLORS[b]}40` : '1px solid #2b2d42',
                        }}
                      >
                        {count > 0 ? count : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
