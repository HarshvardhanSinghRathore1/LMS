'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RecommendationsWidget } from '../../components/recommendations/RecommendationsWidget';
import { LearningPathway } from '../../components/recommendations/LearningPathway';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Sparkles, Target, BookOpen, Layers, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function RecommendationsPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-onyx text-white p-4 md:p-8 space-y-8">
      {/* HEADER BAR */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-silver/10 pb-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-silver hover:text-strawberry-red transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-strawberry-red" />
            Personalized Recommendations &amp; Adaptive Learning Pathway
          </h1>
          <p className="text-xs text-silver mt-1">
            Stage 7 Continuous Learning Loop • Deterministic 60% Skill Gap + 25% Mapping + 15% Completion Rate Engine
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/my-learning"
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>My Learning Workspace</span>
          </Link>
        </div>
      </header>

      {/* CONTINUOUS LEARNING LOOP BANNER */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-silver">
            <span className="px-2 py-0.5 rounded bg-mahogany-red/30 text-strawberry-red border border-mahogany-red font-bold">
              LEARN
            </span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-mahogany-red/30 text-strawberry-red border border-mahogany-red font-bold">
              ASSESS
            </span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-mahogany-red/30 text-strawberry-red border border-mahogany-red font-bold">
              MEASURE COMPETENCY
            </span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-mahogany-red/30 text-strawberry-red border border-mahogany-red font-bold">
              IDENTIFY SKILL GAP
            </span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-strawberry-red text-white font-bold animate-pulse">
              RECOMMEND
            </span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-mahogany-red/30 text-strawberry-red border border-mahogany-red font-bold">
              ENROLL
            </span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
              LEARN AGAIN
            </span>
          </div>

          <Badge variant="brand" size="sm">
            STAGE 7 VERIFIED
          </Badge>
        </div>
      </Card>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: RECOMMENDATIONS WIDGET */}
        <section className="space-y-6">
          <RecommendationsWidget
            onRecommendationAccepted={(courseId) => setSelectedCourseId(courseId)}
          />
        </section>

        {/* RIGHT: ADAPTIVE LEARNING PATHWAY */}
        <section className="space-y-6">
          <LearningPathway courseId={selectedCourseId} />
        </section>
      </div>
    </div>
  );
}
