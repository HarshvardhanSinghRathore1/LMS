'use client';

import React, { useState, useEffect } from 'react';
import {
  TrainerMatchResult,
  getTrainerMatchesApi,
  createSessionRequestApi,
  SessionRequest,
} from '../../lib/trainerMatching';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  UserCheck,
  Star,
  Clock,
  Award,
  Zap,
  Target,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Send,
  X,
  Briefcase,
} from 'lucide-react';

interface TrainerMatchingWidgetProps {
  onSessionCreated?: (session: SessionRequest) => void;
}

export const TrainerMatchingWidget: React.FC<TrainerMatchingWidgetProps> = ({
  onSessionCreated,
}) => {
  const [matches, setMatches] = useState<TrainerMatchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Session Request Modal State
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerMatchResult | null>(null);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [requestedSlot, setRequestedSlot] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const data = await getTrainerMatchesApi();
      setMatches(data);
    } catch (err: any) {
      console.error('Failed to fetch trainer matches:', err);
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to load trainer matches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const openRequestModal = (trainer: TrainerMatchResult) => {
    setSelectedTrainer(trainer);
    setSelectedCompetencyId(trainer.matchedCompetencies[0]?.competencyId || '');
    setTopic(
      trainer.primarySkillGap
        ? `1-on-1 Mentorship on ${trainer.primarySkillGap.competencyName}`
        : 'Skills Guidance & Mentorship'
    );
    setNotes('');
    setRequestedSlot('');
    setModalError(null);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) return;
    if (!topic.trim()) {
      setModalError('Topic is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError(null);

      const session = await createSessionRequestApi({
        trainerId: selectedTrainer.trainerId,
        competencyId: selectedCompetencyId || undefined,
        topic: topic.trim(),
        notes: notes.trim() || undefined,
        requestedSlot: requestedSlot ? new Date(requestedSlot).toISOString() : undefined,
      });

      setSuccessMsg(`Session request sent to ${selectedTrainer.trainerName}!`);
      setSelectedTrainer(null);
      if (onSessionCreated) onSessionCreated(session);
      await loadMatches(); // Refresh active capacity
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to create session request:', err);
      setModalError(err?.response?.data?.error?.message || 'Failed to send session request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Intelligent Trainer Matching
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Deterministic 4-factor match engine (40% Skill Gap, 25% Rating, 20% Experience, 15% Capacity)
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={loadMatches}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Matches
        </Button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{successMsg}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6 animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && matches.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <UserCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
            No Available Trainers Found
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            There are currently no active trainers with available capacity matching your organization.
          </p>
        </Card>
      )}

      {/* Trainer Cards List */}
      {!isLoading && matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map((trainer) => (
            <Card
              key={trainer.trainerId}
              className="p-6 flex flex-col justify-between hover:shadow-lg transition-shadow border border-slate-200 dark:border-slate-800"
            >
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {trainer.trainerName}
                      <Badge variant="success" size="sm">
                        Verified Trainer
                      </Badge>
                    </h3>
                    {trainer.headline && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                        {trainer.headline}
                      </p>
                    )}
                  </div>
                  {/* Match Score Badge */}
                  <div className="text-right flex-shrink-0">
                    <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg text-center">
                      <span className="block text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {trainer.matchScore.toFixed(1)}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                        Match Score
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {trainer.bio && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {trainer.bio}
                  </p>
                )}

                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-center text-xs">
                  <div>
                    <span className="block font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {trainer.averageRating.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Rating ({trainer.totalReviews})
                    </span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                      {trainer.yearsOfExperience} yrs
                    </span>
                    <span className="text-[10px] text-slate-500">Experience</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      {trainer.remainingCapacity}/{trainer.hourlyCapacity}
                    </span>
                    <span className="text-[10px] text-slate-500">Capacity Left</span>
                  </div>
                </div>

                {/* Primary Skill Gap */}
                {trainer.primarySkillGap && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-md text-xs">
                    <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1 mb-0.5">
                      <Target className="w-3.5 h-3.5" /> Target Skill Gap:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {trainer.primarySkillGap.competencyName} ({trainer.primarySkillGap.competencyCode}) —{' '}
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {trainer.primarySkillGap.gapPercentage}% Gap
                      </span>
                    </span>
                  </div>
                )}

                {/* Matched Competencies */}
                {trainer.matchedCompetencies.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-indigo-500" /> Matched Expertise:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {trainer.matchedCompetencies.map((comp) => (
                        <Badge
                          key={comp.competencyId}
                          variant={comp.proficiencyLevel === 'EXPERT' ? 'success' : 'info'}
                          size="sm"
                        >
                          {comp.competencyName} ({comp.proficiencyLevel})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4-Factor Score Breakdown */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Determinism Factors Breakdown
                  </span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Skill Gap Fit (40%):</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {trainer.skillGapFit.toFixed(0)} ({trainer.factorsBreakdown.weightedSkillGapFit.toFixed(1)} pts)
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Rating (25%):</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {trainer.ratingFactor.toFixed(0)} ({trainer.factorsBreakdown.weightedRatingFactor.toFixed(1)} pts)
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Experience (20%):</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {trainer.experienceFactor.toFixed(0)} ({trainer.factorsBreakdown.weightedExperienceFactor.toFixed(1)} pts)
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Capacity (15%):</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {trainer.capacityFactor.toFixed(0)} ({trainer.factorsBreakdown.weightedCapacityFactor.toFixed(1)} pts)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => openRequestModal(trainer)}
                >
                  <Send className="w-4 h-4" />
                  Request Session
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Session Request Modal */}
      {selectedTrainer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedTrainer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                Request Mentorship Session
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Target Trainer: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedTrainer.trainerName}</span>
              </p>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-300 rounded text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Competency
                </label>
                <select
                  value={selectedCompetencyId}
                  onChange={(e) => setSelectedCompetencyId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- General Mentorship / No Specific Competency --</option>
                  {selectedTrainer.matchedCompetencies.map((comp) => (
                    <option key={comp.competencyId} value={comp.competencyId}>
                      {comp.competencyName} ({comp.competencyCode}) — {comp.proficiencyLevel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Session Topic *
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Advanced Architecture Code Review"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe your current blocker or specific questions..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Requested Time Slot (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={requestedSlot}
                  onChange={(e) => setRequestedSlot(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedTrainer(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
