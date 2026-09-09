'use client';
import React from 'react';
import { TraineeSummaryMetrics } from '@/lib/analytics.types';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: string;
  accent?: string;
}

function KPICard({ label, value, icon, accent = '#e5383b' }: KPICardProps) {
  return (
    <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-5 flex flex-col gap-3 hover:border-[#a4161a]/60 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-white tabular-nums">{value}</div>
        <div className="text-xs font-semibold text-[#b1a7a6] uppercase tracking-widest mt-1">{label}</div>
      </div>
    </div>
  );
}

export default function PersonalSummaryBar({ summary }: { summary: TraineeSummaryMetrics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <KPICard label="Courses Enrolled" value={summary.coursesEnrolled} icon="📚" accent="#6366f1" />
      <KPICard label="Courses Completed" value={summary.coursesCompleted} icon="✅" accent="#10b981" />
      <KPICard label="Certificates Earned" value={summary.certificatesEarned} icon="🏆" accent="#f59e0b" />
      <KPICard
        label="Avg Assessment Score"
        value={`${Number(summary.averageAssessmentScore).toFixed(1)}%`}
        icon="📝"
        accent="#6366f1"
      />
      <KPICard label="Competencies Measured" value={summary.competenciesMeasured} icon="🎯" accent="#8b5cf6" />
      <KPICard label="Skill Gaps" value={summary.skillGapCount} icon="⚠️" accent="#e5383b" />
      <KPICard label="Trainer Sessions" value={summary.trainerSessions} icon="🤝" accent="#14b8a6" />
      <KPICard label="Active Recommendations" value={summary.activeRecommendations} icon="💡" accent="#f97316" />
    </div>
  );
}
