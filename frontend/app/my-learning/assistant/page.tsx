'use client';

import React, { useState } from 'react';
import { AITutorChatbot } from '../../../components/ai/AITutorChatbot';
import { LearnerContextProfile } from '../../../components/ai/LearnerContextProfile';
import { Bot, Sparkles, ShieldCheck, Database, Brain, ArrowLeft, User, HelpCircle, Layers } from 'lucide-react';
import Link from 'next/link';

export default function LearningAssistantPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'profile'>('chat');

  return (
    <div className="min-h-screen bg-onyx text-slate-100 p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div>
        <div className="flex items-center justify-between">
          <Link
            href="/my-learning"
            className="flex items-center gap-1.5 text-xs font-semibold text-silver hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Learning</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-silver font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Gemini AI Tutor Active</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-silver/15 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-3">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-[#660708] via-[#a4161a] to-[#e5383b] text-white shadow-lg shadow-strawberry-red/20">
                <Bot className="w-5 h-5" />
              </span>
              AI Study Tutor & Learning Assistant
            </h1>
            <p className="mt-1 text-xs text-silver">
              Ask any question about your studies, explore computer science topics, or get course-grounded explanations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-carbon-black p-1 rounded-lg border border-silver/15">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'chat'
                    ? 'bg-[var(--mahogany-red)] text-white shadow-md'
                    : 'text-silver hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Tutor Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'profile'
                    ? 'bg-[var(--mahogany-red)] text-white shadow-md'
                    : 'text-silver hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Learning Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'chat' ? (
        <div className="space-y-4">
          <AITutorChatbot />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LearnerContextProfile />
          </div>

          {/* Architecture Card */}
          <div className="p-5 rounded-2xl bg-carbon-black border border-silver/15 space-y-3 font-mono text-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-silver flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              RAG Grounding & AI Architecture
            </h4>
            <div className="space-y-2 text-xs text-silver leading-relaxed font-sans">
              <div className="flex items-start gap-2">
                <span className="font-mono text-strawberry-red font-bold">1.</span>
                <span><strong>PostgreSQL Source of Truth:</strong> Grades, competencies, and enrollments remain strictly authoritative.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-strawberry-red font-bold">2.</span>
                <span><strong>pgvector Cosine Search:</strong> Searches transcript, lesson, and PDF chunks with organization-level tenant isolation.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-strawberry-red font-bold">3.</span>
                <span><strong>Google Gemini Engine:</strong> Powered by Gemini with bounded multi-turn conversation memory.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-strawberry-red font-bold">4.</span>
                <span><strong>Zero Fabrication:</strong> Cites exact retrieved source chunks or gracefully provides general educational reasoning.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
