'use client';

import React, { useState, useEffect } from 'react';
import { PathwayData, PathwayStep, fetchAdaptivePathwayApi } from '../../lib/recommendations';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CheckCircle2, Circle, PlayCircle, Award, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface LearningPathwayProps {
  courseId?: string;
}

export const LearningPathway: React.FC<LearningPathwayProps> = ({ courseId }) => {
  const [pathway, setPathway] = useState<PathwayData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPathway = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const data = await fetchAdaptivePathwayApi(courseId);
      setPathway(data);
    } catch (err: any) {
      console.error('Failed to load adaptive pathway:', err);
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to load adaptive pathway');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPathway();
  }, [courseId]);

  if (isLoading) {
    return (
      <Card title="Adaptive Learning Path">
        <div className="py-10 text-center text-silver/60 text-xs flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-strawberry-red" />
          <span>Building adaptive learning path...</span>
        </div>
      </Card>
    );
  }

  if (errorMsg || !pathway) {
    return (
      <Card title="Adaptive Learning Path">
        <div className="p-4 bg-carbon-black/60 rounded-lg border border-silver/10 text-xs text-silver/70 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
          <p>{errorMsg || 'No active course selected for pathway visualizer.'}</p>
        </div>
      </Card>
    );
  }

  const completedCount = pathway.steps.filter((s) => s.completed).length;
  const progressPercent = pathway.steps.length > 0 ? Math.round((completedCount / pathway.steps.length) * 100) : 0;

  return (
    <Card
      title={`Adaptive Learning Path: ${pathway.course.title}`}
      subtitle="Sequential module & lesson progression prioritized for incomplete skill gaps"
      action={
        <Badge variant={progressPercent === 100 ? 'success' : 'brand'} size="sm">
          {progressPercent}% Path Progress ({completedCount}/{pathway.steps.length})
        </Badge>
      }
    >
      {/* Progress Bar */}
      <div className="mb-6 space-y-1.5">
        <div className="flex justify-between text-xs text-silver/80">
          <span>Curriculum Progress</span>
          <span className="font-mono font-semibold">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full bg-onyx rounded-full overflow-hidden border border-silver/10">
          <div
            className="h-full bg-gradient-to-r from-mahogany-red via-mahogany-red-2 to-strawberry-red transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Pathway Steps List */}
      <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-silver/10">
        {pathway.steps.map((step) => (
          <div
            key={`${step.type}-${step.step}`}
            className={`relative flex items-start gap-4 p-3.5 rounded-lg border transition-all ${
              step.completed
                ? 'bg-onyx/90 border-emerald-900/40 text-silver/80'
                : 'bg-carbon-black border-silver/20 hover:border-mahogany-red/40 shadow-sm'
            }`}
          >
            <div className="z-10 shrink-0 mt-0.5">
              {step.completed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-950" />
              ) : (
                <Circle className="w-5 h-5 text-strawberry-red fill-onyx" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-silver/60">
                  Step {step.step} • {step.type}
                </span>
                {step.completed ? (
                  <Badge variant="success" size="sm">COMPLETED</Badge>
                ) : (
                  <Badge variant="warning" size="sm">INCOMPLETE</Badge>
                )}
              </div>

              <h5 className="text-xs font-semibold text-white flex items-center gap-2">
                {step.type === 'LESSON' ? (
                  <BookOpen className="w-3.5 h-3.5 text-silver/70" />
                ) : (
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                )}
                {step.title}
              </h5>
            </div>

            <div className="shrink-0 self-center">
              <Link
                href="/my-learning"
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  step.completed
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-silver'
                    : 'bg-mahogany-red hover:bg-strawberry-red text-white shadow-md'
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>{step.completed ? 'Review' : 'Continue'}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
