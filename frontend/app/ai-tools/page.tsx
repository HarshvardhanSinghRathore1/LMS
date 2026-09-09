'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { fetchCoursesApi, Course } from '../../lib/courses';
import { fetchAssessmentsApi, Assessment } from '../../lib/assessments';
import {
  generateAINotes,
  generateAIMcqs,
  fetchGeneratedItems,
  reviewGeneratedItem,
  AIGeneratedItem,
  AIItemStatus,
} from '../../lib/ai';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Sparkles,
  FileText,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  Edit,
  ShieldCheck,
  Check,
  AlertTriangle,
} from 'lucide-react';

export default function AIToolsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isTrainerOrAdmin = user?.role === 'ADMIN' || user?.role === 'TRAINER';

  const [activeTab, setActiveTab] = useState<'notes' | 'mcq' | 'review'>('review');

  // Courses & Assessments for dropdowns
  const [courses, setCourses] = useState<Course[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Notes Form State
  const [selectedCourseNotes, setSelectedCourseNotes] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [notesGenerating, setNotesGenerating] = useState(false);
  const [generatedNoteResult, setGeneratedNoteResult] = useState<AIGeneratedItem | null>(null);

  // MCQ Form State
  const [selectedCourseMcq, setSelectedCourseMcq] = useState('');
  const [mcqCount, setMcqCount] = useState(3);
  const [mcqDifficulty, setMcqDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [mcqGenerating, setMcqGenerating] = useState(false);
  const [generatedMcqResults, setGeneratedMcqResults] = useState<AIGeneratedItem[]>([]);

  // Review Queue State
  const [reviewItems, setReviewItems] = useState<AIGeneratedItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<AIItemStatus | 'ALL'>('PENDING_REVIEW');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedTargetAssessment, setSelectedTargetAssessment] = useState<Record<string, string>>({});
  const [reviewNotesInput, setReviewNotesInput] = useState<Record<string, string>>({});

  // Alert message state
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

  useEffect(() => {
    async function initData() {
      try {
        const [cRes, aRes] = await Promise.all([fetchCoursesApi({ limit: 200 }), fetchAssessmentsApi({ limit: 200 })]);
        const cList = cRes.courses;
        const aList = aRes.assessments;
        setCourses(cList);
        setAssessments(aList);
        if (cList.length > 0) {
          setSelectedCourseNotes(cList[0].id);
          setSelectedCourseMcq(cList[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    if (isAuthenticated) {
      initData();
    }
  }, [isAuthenticated]);

  const loadReviewQueue = async () => {
    setReviewLoading(true);
    try {
      const items = await fetchGeneratedItems(
        filterStatus === 'ALL' ? undefined : { status: filterStatus }
      );
      setReviewItems(items);
    } catch (err: any) {
      console.error('Failed to load review items:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isTrainerOrAdmin) {
      loadReviewQueue();
    }
  }, [isAuthenticated, isTrainerOrAdmin, filterStatus]);

  const handleGenerateNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseNotes) return;
    setNotesGenerating(true);
    setStatusMsg(null);

    try {
      const item = await generateAINotes({
        courseId: selectedCourseNotes,
        customPrompt,
      });
      setGeneratedNoteResult(item);
      setStatusMsg({ type: 'success', message: 'Study notes successfully generated in PENDING_REVIEW status!' });
      loadReviewQueue();
    } catch (err: any) {
      setStatusMsg({ type: 'danger', message: err.response?.data?.error?.message || 'Failed to generate study notes.' });
    } finally {
      setNotesGenerating(false);
    }
  };

  const handleGenerateMcqs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseMcq) return;
    setMcqGenerating(true);
    setStatusMsg(null);

    try {
      const items = await generateAIMcqs({
        courseId: selectedCourseMcq,
        count: mcqCount,
        difficulty: mcqDifficulty,
      });
      setGeneratedMcqResults(items);
      setStatusMsg({ type: 'success', message: `Successfully generated ${items.length} MCQ item(s) in PENDING_REVIEW queue!` });
      loadReviewQueue();
    } catch (err: any) {
      setStatusMsg({ type: 'danger', message: err.response?.data?.error?.message || 'Failed to generate MCQs.' });
    } finally {
      setMcqGenerating(false);
    }
  };

  const handleReviewAction = async (itemId: string, action: 'APPROVE' | 'REJECT') => {
    setStatusMsg(null);
    const targetAssessmentId = selectedTargetAssessment[itemId];
    const notes = reviewNotesInput[itemId];

    if (action === 'APPROVE') {
      const item = reviewItems.find((i) => i.id === itemId);
      if (item?.item_type === 'MCQ' && !targetAssessmentId) {
        setStatusMsg({ type: 'danger', message: 'Please select a target assessment before approving an MCQ.' });
        return;
      }
    }

    try {
      const res = await reviewGeneratedItem(itemId, {
        action,
        targetAssessmentId,
        reviewNotes: notes,
      });

      setStatusMsg({
        type: 'success',
        message: action === 'APPROVE'
          ? 'MCQ approved and imported into assessment_questions!'
          : 'Generated item rejected.',
      });

      loadReviewQueue();
    } catch (err: any) {
      setStatusMsg({ type: 'danger', message: err.response?.data?.error?.message || 'Review action failed.' });
    }
  };

  if (authLoading || loadingInitial) {
    return (
      <div className="min-h-screen bg-onyx flex items-center justify-center text-silver font-mono text-xs">
        Loading AI Tools Workspace...
      </div>
    );
  }

  if (!isTrainerOrAdmin) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-4">
        <Card title="Access Restricted" subtitle="Trainer & Admin privileges required">
          <div className="p-6 bg-dark-garnet/30 border border-strawberry-red/50 rounded-lg text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-strawberry-red mx-auto" />
            <p className="text-xs text-silver">
              AI Content Generation and Trainer Review workflows are restricted to authorized **ADMIN** and **TRAINER** users.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-carbon-black hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg border border-neutral-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-silver/15 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs font-mono text-silver hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Dashboard
            </Link>
            <span className="text-silver/40">•</span>
            <span className="text-xs font-mono text-silver">AI Workspace</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-strawberry-red" />
            Stage 6 — AI-Assisted Content Generator & Review Hub
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-carbon-black p-1 rounded-lg border border-silver/20">
          <button
            onClick={() => setActiveTab('review')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'review'
                ? 'bg-[var(--mahogany-red)] text-white shadow-md'
                : 'text-silver hover:text-white hover:bg-onyx'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Review Queue
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'bg-[var(--mahogany-red)] text-white shadow-md'
                : 'text-silver hover:text-white hover:bg-onyx'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Notes Generator
          </button>
          <button
            onClick={() => setActiveTab('mcq')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'mcq'
                ? 'bg-[var(--mahogany-red)] text-white shadow-md'
                : 'text-silver hover:text-white hover:bg-onyx'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            MCQ Generator
          </button>
        </div>
      </div>

      {/* Global Status Message Banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-lg border text-xs font-medium flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-red-950/40 border-red-800 text-red-300'
          }`}
        >
          <span className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {statusMsg.message}
          </span>
          <button onClick={() => setStatusMsg(null)} className="text-silver hover:text-white font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: REVIEW & APPROVAL QUEUE */}
      {activeTab === 'review' && (
        <Card
          title="Trainer Review & Approval Queue"
          subtitle="AI-generated items must be human-reviewed before importing into live assessment questions"
        >
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-onyx p-3 rounded-lg border border-silver/15">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-silver font-semibold">Filter Status:</span>
                <div className="flex items-center gap-1">
                  {(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                        filterStatus === st
                          ? 'bg-[var(--strawberry-red)] text-white'
                          : 'bg-carbon-black text-silver hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={loadReviewQueue}
                disabled={reviewLoading}
                className="px-3 py-1.5 bg-carbon-black hover:bg-neutral-800 border border-neutral-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reviewLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Queue</span>
              </button>
            </div>

            {/* Item List */}
            {reviewItems.length === 0 ? (
              <div className="p-8 text-center bg-onyx rounded-lg border border-silver/15 space-y-2">
                <ShieldCheck className="w-8 h-8 text-silver/40 mx-auto" />
                <p className="text-xs text-silver font-mono">No AI generated items found in current filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 bg-onyx rounded-lg border border-silver/20 space-y-3 transition-all hover:border-silver/40"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-silver/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white">{item.title}</span>
                          <Badge
                            variant={
                              item.status === 'PENDING_REVIEW'
                                ? 'warning'
                                : item.status === 'APPROVED'
                                ? 'success'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {item.status}
                          </Badge>
                          <Badge variant="neutral" size="sm">{item.item_type}</Badge>
                        </div>
                        <p className="text-[11px] text-silver font-mono mt-0.5">
                          Course: {item.course_title} • Provider: {item.provider} ({item.model})
                        </p>
                      </div>
                      <div className="text-[10px] font-mono text-silver/60">
                        Generated: {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="p-4 bg-carbon-black rounded border border-silver/10 space-y-2 text-xs">
                      {item.item_type === 'MCQ' ? (
                        <div className="space-y-2">
                          <div className="font-semibold text-white">Q: {item.content.questionText}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                            {Array.isArray(item.content.options) &&
                              item.content.options.map((opt: any, idx: number) => {
                                const text = typeof opt === 'string' ? opt : opt.optionText;
                                const isCorr = typeof opt === 'string'
                                  ? opt === item.content.correctAnswer
                                  : opt.isCorrect;
                                return (
                                  <div
                                    key={idx}
                                    className={`p-2 rounded border text-[11px] ${
                                      isCorr
                                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 font-bold'
                                        : 'bg-onyx border-silver/10 text-silver'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + idx)}. {text} {isCorr ? '✓ (Correct)' : ''}
                                  </div>
                                );
                              })}
                          </div>
                          {item.content.explanation && (
                            <div className="text-[11px] text-silver/80 italic pt-1">
                              Explanation: {item.content.explanation}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2 text-silver">
                          <div className="font-bold text-white">{item.content.summary}</div>
                          <div className="whitespace-pre-wrap font-mono text-[11px] bg-onyx p-3 rounded border border-silver/10 max-h-48 overflow-y-auto">
                            {item.content.markdownNotes}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Review Actions if PENDING_REVIEW */}
                    {item.status === 'PENDING_REVIEW' && (
                      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                        {item.item_type === 'MCQ' && (
                          <div className="flex-1 w-full">
                            <select
                              value={selectedTargetAssessment[item.id] || ''}
                              onChange={(e) =>
                                setSelectedTargetAssessment((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                              className="w-full bg-carbon-black border border-silver/20 rounded px-3 py-1.5 text-xs text-white focus:outline-none"
                            >
                              <option value="">-- Select Target Published Assessment --</option>
                              {assessments
                                .filter((a) => a.course_id === item.course_id)
                                .map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.title} ({a.status})
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => handleReviewAction(item.id, 'APPROVE')}
                            className="flex-1 sm:flex-none px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve & Import
                          </button>
                          <button
                            onClick={() => handleReviewAction(item.id, 'REJECT')}
                            className="flex-1 sm:flex-none px-4 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* TAB 2: STUDY NOTES GENERATOR */}
      {activeTab === 'notes' && (
        <Card
          title="AI-Assisted Study Notes & Summary Generator"
          subtitle="Generate structured markdown study notes from lesson materials or course objectives"
        >
          <form onSubmit={handleGenerateNotes} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-silver uppercase tracking-wider mb-1">
                Select Target Course
              </label>
              <select
                value={selectedCourseNotes}
                onChange={(e) => setSelectedCourseNotes(e.target.value)}
                className="w-full bg-onyx border border-silver/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.difficulty_level})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-silver uppercase tracking-wider mb-1">
                Custom Focus Prompt (Optional)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Focus on asynchronous event loop microtasks and promise scheduling..."
                rows={3}
                className="w-full bg-onyx border border-silver/20 rounded-lg p-3 text-xs text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={notesGenerating || !selectedCourseNotes}
              className="px-5 py-2.5 bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{notesGenerating ? 'Generating Notes...' : 'Generate Study Notes'}</span>
            </button>
          </form>

          {generatedNoteResult && (
            <div className="mt-6 pt-6 border-t border-silver/15 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-silver uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Generated Notes Result (Status: PENDING_REVIEW)
                </h4>
                <Badge variant="warning" size="sm">PENDING REVIEW</Badge>
              </div>
              <div className="p-4 bg-onyx rounded-lg border border-silver/20 font-mono text-xs text-silver space-y-2">
                <div className="font-bold text-white text-sm">{generatedNoteResult.title}</div>
                <div className="whitespace-pre-wrap bg-carbon-black p-4 rounded border border-silver/10 max-h-60 overflow-y-auto">
                  {generatedNoteResult.content.markdownNotes}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: MCQ GENERATOR */}
      {activeTab === 'mcq' && (
        <Card
          title="AI-Assisted MCQ & Question Item Generator"
          subtitle="Generate structured multiple choice questions with options and explanations for trainer review"
        >
          <form onSubmit={handleGenerateMcqs} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-silver uppercase tracking-wider mb-1">
                  Target Course
                </label>
                <select
                  value={selectedCourseMcq}
                  onChange={(e) => setSelectedCourseMcq(e.target.value)}
                  className="w-full bg-onyx border border-silver/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-silver uppercase tracking-wider mb-1">
                  Question Count (1-10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={mcqCount}
                  onChange={(e) => setMcqCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-onyx border border-silver/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-silver uppercase tracking-wider mb-1">
                  Difficulty Level
                </label>
                <select
                  value={mcqDifficulty}
                  onChange={(e) => setMcqDifficulty(e.target.value as any)}
                  className="w-full bg-onyx border border-silver/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={mcqGenerating || !selectedCourseMcq}
              className="px-5 py-2.5 bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{mcqGenerating ? 'Generating MCQs...' : 'Generate MCQs'}</span>
            </button>
          </form>

          {generatedMcqResults.length > 0 && (
            <div className="mt-6 pt-6 border-t border-silver/15 space-y-4">
              <h4 className="text-xs font-bold text-silver uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Generated MCQs ({generatedMcqResults.length} Items Enqueued for Review)
              </h4>
              <div className="space-y-3">
                {generatedMcqResults.map((item, idx) => (
                  <div key={item.id} className="p-4 bg-onyx rounded-lg border border-silver/20 space-y-2 text-xs font-mono">
                    <div className="font-bold text-white">Item #{idx + 1}: {item.content.questionText}</div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {item.content.options.map((opt: string, i: number) => (
                        <div
                          key={i}
                          className={`p-2 rounded border ${
                            opt === item.content.correctAnswer
                              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 font-bold'
                              : 'bg-carbon-black border-silver/10 text-silver'
                          }`}
                        >
                          {opt} {opt === item.content.correctAnswer ? '✓' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </main>
  );
}
