'use client';

import React, { useState, useEffect } from 'react';
import {
  RecommendationWithDetails,
  generateRecommendationsApi,
  fetchMyRecommendationsApi,
  dismissRecommendationApi,
  acceptRecommendationApi,
} from '../../lib/recommendations';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Sparkles, CheckCircle, XCircle, RefreshCw, BookOpen, Target, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface RecommendationsWidgetProps {
  onRecommendationAccepted?: (courseId: string) => void;
}

export const RecommendationsWidget: React.FC<RecommendationsWidgetProps> = ({
  onRecommendationAccepted,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const data = await fetchMyRecommendationsApi();
      setRecommendations(data);
    } catch (err: any) {
      console.error('Failed to fetch recommendations:', err);
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsRefreshing(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const data = await generateRecommendationsApi();
      setRecommendations(data);
      setSuccessMsg('Recommendations generated and refreshed successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to generate recommendations:', err);
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to generate recommendations');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAccept = async (id: string, courseId: string) => {
    try {
      setActionLoadingId(id);
      setErrorMsg(null);
      await acceptRecommendationApi(id);
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
      setSuccessMsg('Successfully accepted recommendation & enrolled in course!');
      if (onRecommendationAccepted) {
        onRecommendationAccepted(courseId);
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to accept recommendation:', err);
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to accept recommendation');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      setActionLoadingId(id);
      setErrorMsg(null);
      await dismissRecommendationApi(id);
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      console.error('Failed to dismiss recommendation:', err);
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to dismiss recommendation');
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  return (
    <Card
      title="Personalized Learning Recommendations"
      subtitle="Deterministic 60% Skill Gap + 25% Competency Mapping + 15% Completion Rate PostgreSQL Engine"
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerate}
          disabled={isRefreshing}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Generate / Refresh</span>
        </Button>
      }
    >
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-silver/60 text-xs flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-strawberry-red" />
          <span>Loading recommendations...</span>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="py-10 text-center bg-onyx/60 rounded-lg border border-dashed border-silver/20 p-6 space-y-3">
          <Sparkles className="w-8 h-8 text-strawberry-red mx-auto opacity-70" />
          <h4 className="text-sm font-semibold text-white">No active recommendations found</h4>
          <p className="text-xs text-silver/70 max-w-md mx-auto">
            Click 'Generate / Refresh' to calculate personalized course suggestions based on your target competency skill gaps and organizational trends.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={isRefreshing}
          >
            Generate Recommendations Now
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-xl bg-onyx border border-silver/10 hover:border-mahogany-red/40 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={rec.recommendation_type === 'PERSONALIZED' ? 'brand' : 'info'} size="sm">
                    {rec.recommendation_type === 'PERSONALIZED' ? 'PERSONALIZED FIT' : 'COLD START'}
                  </Badge>

                  <Badge variant="success" size="sm">
                    {Number(rec.match_score).toFixed(2)}% Match Score
                  </Badge>

                  {rec.competency_name && (
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50 flex items-center gap-1">
                      <Target className="w-3 h-3 text-purple-400" />
                      Target: {rec.competency_name} ({Number(rec.gap_percentage_addressed).toFixed(0)}% Gap)
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-strawberry-red shrink-0" />
                    {rec.course_title}
                  </h4>
                  <p className="text-xs text-silver/80 mt-1 line-clamp-2">{rec.course_description}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-carbon-black/90 border border-silver/10 text-xs text-silver/90 italic flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>"{rec.recommendation_reason}"</span>
                </div>
              </div>

              <div className="flex items-center gap-2 md:flex-col md:w-36 shrink-0 justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full justify-center flex items-center gap-1.5 shadow-lg"
                  onClick={() => handleAccept(rec.id, rec.course_id)}
                  disabled={actionLoadingId === rec.id}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Accept & Enroll</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center flex items-center gap-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-950/40"
                  onClick={() => handleDismiss(rec.id)}
                  disabled={actionLoadingId === rec.id}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Dismiss</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
