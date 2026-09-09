'use client';
import React from 'react';
import { TraineeLeaderboardEntry } from '@/lib/analytics.types';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function TraineeLeaderboard({ trainees }: { trainees: TraineeLeaderboardEntry[] }) {
  if (trainees.length === 0) {
    return (
      <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 text-center text-[#b1a7a6] text-sm">
        <div className="text-3xl mb-2">👑</div>
        No trainee competency data yet.
      </div>
    );
  }

  function scoreColor(score: number) {
    if (score >= 75) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#e5383b';
  }

  return (
    <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <span>👑</span> Trainee Leaderboard
        </h3>
        <span className="text-[10px] px-2 py-1 rounded-full bg-[#660708]/50 text-[#e5383b] border border-[#a4161a]/40 font-bold uppercase tracking-widest">
          Admin Only
        </span>
      </div>

      <div className="space-y-2">
        {trainees.map((t, i) => (
          <div
            key={t.traineeId}
            className="flex items-center gap-3 bg-[#0b090a] rounded-lg px-4 py-3 border border-[#2b2d42] hover:border-[#a4161a]/40 transition-all"
          >
            <span className="text-lg w-7 text-center flex-shrink-0">
              {i < 3 ? MEDALS[i] : <span className="text-[#b1a7a6] font-mono text-sm">{i + 1}</span>}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm">{t.traineeName}</div>
              <div className="text-[11px] text-[#b1a7a6]">{t.competencyCount} competencies measured</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div
                className="text-sm font-bold tabular-nums"
                style={{ color: scoreColor(t.averageCompetencyScore) }}
              >
                {Number(t.averageCompetencyScore).toFixed(1)}%
              </div>
              <div className="text-[10px] text-[#b1a7a6]">avg score</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
