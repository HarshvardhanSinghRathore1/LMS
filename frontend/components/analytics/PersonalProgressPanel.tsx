'use client';
import React from 'react';
import Link from 'next/link';

const links = [
  { href: '/my-learning', label: 'My Learning', icon: '📚', desc: 'View enrolled courses and lesson progress' },
  { href: '/competencies', label: 'Competencies', icon: '🎯', desc: 'View skill levels and gap analysis' },
  { href: '/recommendations', label: 'Recommendations', icon: '💡', desc: 'Browse personalized course suggestions' },
  { href: '/trainer-matching', label: 'Trainer Matching', icon: '🤝', desc: 'Connect with expert trainers' },
  { href: '/certificates', label: 'Certificates', icon: '🏆', desc: 'View and verify earned certificates' },
];

export default function PersonalProgressPanel() {
  return (
    <div className="bg-[#161a1d] rounded-xl border border-[#2b2d42] p-6 space-y-4">
      <h3 className="font-bold text-white text-base flex items-center gap-2">
        <span>🚀</span> Continue Your Learning Journey
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 bg-[#0b090a] rounded-lg px-4 py-3 border border-[#2b2d42] hover:border-[#a4161a]/60 transition-all group"
          >
            <span className="text-xl flex-shrink-0">{l.icon}</span>
            <div className="min-w-0">
              <div className="font-semibold text-white text-sm group-hover:text-[#e5383b] transition-colors">
                {l.label}
              </div>
              <div className="text-[11px] text-[#b1a7a6] truncate">{l.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
