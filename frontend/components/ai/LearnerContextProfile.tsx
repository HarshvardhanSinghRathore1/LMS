'use client';

import React, { useState, useEffect } from 'react';
import { ragApi, LearnerContextProfile as IProfile, ContextEntityType, LearnerContextFact } from '../../lib/rag';
import {
  Brain,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  BookMarked,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface LearnerContextProfileProps {
  userId?: string;
  className?: string;
  onFactAdded?: () => void;
}

export const LearnerContextProfile: React.FC<LearnerContextProfileProps> = ({
  userId,
  className = '',
  onFactAdded,
}) => {
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [entityType, setEntityType] = useState<ContextEntityType>('LEARNING_PREFERENCE');
  const [factText, setFactText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ragApi.getContextProfile(userId);
      setProfile(data);
    } catch (err: any) {
      console.error('Failed to load learner context profile:', err);
      setError(err?.response?.data?.message || 'Failed to load learner context facts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const handleCreateFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await ragApi.createContextFact({
        entityType,
        factText: factText.trim(),
        confidenceScore: 1.0,
        sourceEvent: 'MANUAL_LEARNER_PREFERENCE',
      });
      setFactText('');
      setIsAdding(false);
      await fetchProfile();
      if (onFactAdded) onFactAdded();
    } catch (err: any) {
      console.error('Failed to create fact:', err);
      setError(err?.response?.data?.message || 'Failed to save context fact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (factId: string) => {
    try {
      await ragApi.deactivateContextFact(factId);
      await fetchProfile();
      if (onFactAdded) onFactAdded();
    } catch (err: any) {
      console.error('Failed to deactivate fact:', err);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className={`p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl animate-pulse ${className}`}>
        <div className="h-6 w-48 bg-slate-800 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-slate-800/60 rounded-xl" />
          <div className="h-16 bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    );
  }

  const renderFactList = (
    facts: LearnerContextFact[],
    icon: React.ReactNode,
    title: string,
    badgeColor: string,
    emptyText: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {icon}
          <span>{title}</span>
          <span className="text-slate-500 font-normal">({facts.length})</span>
        </div>
      </div>

      {facts.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-1 pl-6">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {facts.map((fact) => (
            <div
              key={fact.id}
              className="group flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/80 transition-all duration-200"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 leading-relaxed font-medium">{fact.fact_text}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                  <span className={`px-1.5 py-0.5 rounded font-mono ${badgeColor}`}>
                    Confidence: {(fact.confidence_score * 100).toFixed(0)}%
                  </span>
                  {fact.source_event && (
                    <span className="text-slate-500">• {fact.source_event}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDeactivate(fact.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all"
                title="Deactivate Fact"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={`p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-2xl backdrop-blur-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Persistent Learner Context
              <Badge variant="success" size="sm">
                Authoritative
              </Badge>
            </h3>
            <p className="text-[11px] text-slate-400">Multi-stream temporal memory feeding Context Fusion</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProfile}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Refresh facts"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Context</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Fact Form */}
      {isAdding && (
        <form onSubmit={handleCreateFact} className="mt-4 p-3.5 rounded-xl bg-slate-800/80 border border-indigo-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Record New Context Fact
            </span>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as ContextEntityType)}
              className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="LEARNING_PREFERENCE">Learning Preference</option>
              <option value="STRUGGLE_CONCEPT">Struggle Concept</option>
              <option value="TARGET_COMPETENCY">Target Competency</option>
              <option value="PRIOR_KNOWLEDGE">Prior Knowledge</option>
            </select>
          </div>

          <textarea
            value={factText}
            onChange={(e) => setFactText(e.target.value)}
            placeholder="e.g. Prefers visual system diagrams and hands-on step-by-step code walkthroughs..."
            rows={2}
            className="w-full text-xs bg-slate-900/90 border border-slate-700 rounded-xl p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            required
          />

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(false)}
              className="text-xs py-1 h-7"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !factText.trim()}
              className="text-xs py-1 h-7 bg-indigo-600 hover:bg-indigo-500"
            >
              {isSubmitting ? 'Saving...' : 'Save Fact'}
            </Button>
          </div>
        </form>
      )}

      {/* Grouped Facts Sections */}
      <div className="mt-4 space-y-4">
        {renderFactList(
          profile?.struggles || [],
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          'Identified Struggles',
          'bg-amber-500/20 text-amber-300',
          'No struggle concepts identified yet (auto-populated on failed assessments).'
        )}

        {renderFactList(
          profile?.preferences || [],
          <Lightbulb className="w-3.5 h-3.5 text-sky-400" />,
          'Learning Preferences',
          'bg-sky-500/20 text-sky-300',
          'No custom learning preferences specified.'
        )}

        {renderFactList(
          profile?.competencies || [],
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          'Target Competencies',
          'bg-emerald-500/20 text-emerald-300',
          'No verified target competency facts.'
        )}

        {renderFactList(
          profile?.priorKnowledge || [],
          <BookMarked className="w-3.5 h-3.5 text-purple-400" />,
          'Prior Knowledge',
          'bg-purple-500/20 text-purple-300',
          'No prior knowledge baseline recorded.'
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tenant Scoped & Protected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span>Fused in RAG Prompt</span>
        </div>
      </div>
    </div>
  );
};
