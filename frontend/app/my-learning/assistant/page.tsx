'use client';

import React from 'react';
import { ContextualAIAssistant } from '../../../components/ai/ContextualAIAssistant';
import { LearnerContextProfile } from '../../../components/ai/LearnerContextProfile';
import { Bot, Sparkles, BookOpen, ShieldCheck, Database, Brain, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LearningAssistantPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Header Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <Link
            href="/my-learning"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Learning</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Multi-Stream Context Fusion Active</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-indigo-600/30">
                <Bot className="w-6 h-6" />
              </span>
              Contextual AI Learning Assistant
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Deterministic RAG grounded in course documents + authoritative persistent learner context.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-2xl backdrop-blur-md">
            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Retrieval Engine</div>
              <div className="text-xs font-bold text-indigo-400">pgvector 384d + Graphiti</div>
            </div>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Database className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Assistant (Left) + Learner Profile (Right) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Chat Assistant */}
        <div className="lg:col-span-2">
          <ContextualAIAssistant />
        </div>

        {/* Right 1 Col: Persistent Learner Context Profile */}
        <div className="space-y-6">
          <LearnerContextProfile />

          {/* Architecture Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              RAG Grounding Architecture
            </h4>
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-400 font-bold">1.</span>
                <span><strong>PostgreSQL Source of Truth:</strong> Grades, competencies, and enrollments remain authoritative.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-400 font-bold">2.</span>
                <span><strong>pgvector Cosine Search:</strong> Encodes queries with BAAI/bge-small-en-v1.5 and filters by organization & course.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-400 font-bold">3.</span>
                <span><strong>Persistent Facts:</strong> Temporal learner struggles and preferences adjust AI explanations automatically.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-400 font-bold">4.</span>
                <span><strong>Zero Fabrications:</strong> Responses cite exact retrieved chunks or gracefully indicate missing material.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
