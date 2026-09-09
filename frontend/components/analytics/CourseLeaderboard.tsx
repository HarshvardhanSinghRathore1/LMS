'use client';
import React from 'react';
import { CourseLeaderboardEntry } from '@/lib/analytics.types';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function CourseLeaderboard({ courses }: { courses: CourseLeaderboardEntry[] }) {
  if (courses.length === 0) {
    return (
      <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 text-center text-[#b1a7a6] text-sm">
        <div className="text-3xl mb-2">🏆</div>
        No course completions yet.
      </div>
    );
  }

  return (
    <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 space-y-4">
      <h3 className="font-bold text-white text-base flex items-center gap-2">
        <span>🏆</span> Course Leaderboard
      </h3>
      <div className="space-y-2">
        {courses.map((c, i) => (
          <div
            key={c.courseId}
            className="flex items-center gap-3 bg-[#0b090a] rounded-lg px-4 py-3 border border-[#2b2d42] hover:border-[#a4161a]/40 transition-all"
          >
            <span className="text-lg w-7 text-center flex-shrink-0">
              {i < 3 ? MEDALS[i] : <span className="text-[#b1a7a6] font-mono text-sm">{i + 1}</span>}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm truncate">{c.courseTitle}</div>
              <div className="text-[11px] text-[#b1a7a6] flex gap-3 mt-0.5">
                <span>{c.enrollmentCount} enrolled</span>
                <span className="text-emerald-400">{c.completionCount} completed</span>
                <span>{c.certificateCount} certs</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div
                className="text-sm font-bold tabular-nums"
                style={{ color: c.completionRate >= 60 ? '#10b981' : c.completionRate >= 30 ? '#f59e0b' : '#e5383b' }}
              >
                {Number(c.completionRate).toFixed(0)}%
              </div>
              <div className="text-[10px] text-[#b1a7a6]">completion</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
