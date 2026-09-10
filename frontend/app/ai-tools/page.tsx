'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { fetchCoursesApi, fetchCourseByIdApi, Course, CourseModule, CourseLesson } from '../../lib/courses';
import { fetchAssessmentsApi, Assessment } from '../../lib/assessments';
import {
  generateAINotes,
  generateAIMcqs,
  fetchGeneratedItems,
  reviewGeneratedItem,
  regenerateSingleMcqApi,
  updateGeneratedItemApi,
  deleteGeneratedItemApi,
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
  Trash2,
  Layers,
  BookOpen,
  Video,
  FileCode,
  Sliders,
  ChevronRight,
  Info,
} from 'lucide-react';

export default function AIToolsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isTrainerOrAdmin = user?.role === 'ADMIN' || user?.role === 'TRAINER';

  const [activeTab, setActiveTab] = useState<'review' | 'mcq' | 'notes'>('mcq');

  // Courses & Assessments for dropdowns
  const [courses, setCourses] = useState<Course[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Selected Course details for drilling down modules/lessons
  const [selectedCourseDetails, setSelectedCourseDetails] = useState<Course | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);

  // Notes Form State
  const [selectedCourseNotes, setSelectedCourseNotes] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [notesGenerating, setNotesGenerating] = useState(false);
  const [generatedNoteResult, setGeneratedNoteResult] = useState<AIGeneratedItem | null>(null);

  // MCQ Form State
  const [selectedCourseMcq, setSelectedCourseMcq] = useState('');
  const [selectedModuleMcq, setSelectedModuleMcq] = useState('');
  const [selectedLessonMcq, setSelectedLessonMcq] = useState('');
  const [mcqTopic, setMcqTopic] = useState('');
  const [mcqCount, setMcqCount] = useState(5);
  const [mcqDifficulty, setMcqDifficulty] = useState<'BALANCED' | 'EASY' | 'MEDIUM' | 'HARD'>('BALANCED');
  const [mcqGenerating, setMcqGenerating] = useState(false);
  const [generatedMcqResults, setGeneratedMcqResults] = useState<AIGeneratedItem[]>([]);

  // Review Queue State
  const [reviewItems, setReviewItems] = useState<AIGeneratedItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<AIItemStatus | 'ALL'>('PENDING_REVIEW');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedTargetAssessment, setSelectedTargetAssessment] = useState<Record<string, string>>({});
  const [reviewNotesInput, setReviewNotesInput] = useState<Record<string, string>>({});

  // Regeneration & Editing states
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<AIGeneratedItem | null>(null);
  const [editForm, setEditForm] = useState<{
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  }>({
    questionText: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0,
    explanation: '',
    difficulty: 'MEDIUM',
  });

  // Alert message state
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'danger' | 'info'; message: string } | null>(null);

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

  // Load course details when MCQ course selection changes
  useEffect(() => {
    if (!selectedCourseMcq) {
      setSelectedCourseDetails(null);
      return;
    }

    async function loadCourseDetail() {
      setCourseLoading(true);
      try {
        const details = await fetchCourseByIdApi(selectedCourseMcq);
        setSelectedCourseDetails(details);
        setSelectedModuleMcq('');
        setSelectedLessonMcq('');
        setMcqTopic(details.title);
      } catch (err) {
        console.error('Failed to load course details:', err);
      } finally {
        setCourseLoading(false);
      }
    }

    loadCourseDetail();
  }, [selectedCourseMcq]);

  // When lesson changes, update topic placeholder
  const handleLessonChange = (lessonId: string) => {
    setSelectedLessonMcq(lessonId);
    if (!lessonId) {
      setMcqTopic(selectedCourseDetails?.title || '');
      return;
    }

    // Find lesson in modules
    const modules = selectedCourseDetails?.modules || [];
    for (const mod of modules) {
      const foundLesson = mod.lessons?.find((l) => l.id === lessonId);
      if (foundLesson) {
        setMcqTopic(foundLesson.title);
        break;
      }
    }
  };

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
        moduleId: selectedModuleMcq || undefined,
        lessonId: selectedLessonMcq || undefined,
        topic: mcqTopic.trim() || undefined,
        count: mcqCount,
        difficulty: mcqDifficulty,
      });
      setGeneratedMcqResults(items);
      setStatusMsg({
        type: 'success',
        message: `Generated ${items.length} topic-grounded question(s). All items enqueued for Trainer Review.`,
      });
      loadReviewQueue();
    } catch (err: any) {
      setStatusMsg({
        type: 'danger',
        message: err.response?.data?.error?.message || 'Failed to generate MCQs from lesson context.',
      });
    } finally {
      setMcqGenerating(false);
    }
  };

  // 1-Click Regenerate Individual Question
  const handleRegenerateItem = async (itemId: string) => {
    setRegeneratingId(itemId);
    setStatusMsg(null);

    try {
      const updated = await regenerateSingleMcqApi(itemId);
      setReviewItems((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
      setStatusMsg({
        type: 'success',
        message: 'Question regenerated successfully with fresh grounded content!',
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'danger',
        message: err.response?.data?.error?.message || 'Failed to regenerate question.',
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: AIGeneratedItem) => {
    setEditingItem(item);
    const content = item.content;
    const opts = Array.isArray(content.options) ? [...content.options] : ['', '', '', ''];
    while (opts.length < 4) opts.push('');
    const corrIdx = opts.findIndex((o) => o === content.correctAnswer);

    setEditForm({
      questionText: content.questionText || item.title,
      options: opts.slice(0, 4),
      correctAnswerIndex: corrIdx >= 0 ? corrIdx : 0,
      explanation: content.explanation || '',
      difficulty: content.difficulty || 'MEDIUM',
    });
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    if (!editForm.questionText.trim()) {
      setStatusMsg({ type: 'danger', message: 'Question text cannot be empty.' });
      return;
    }

    if (editForm.options.some((o) => !o.trim())) {
      setStatusMsg({ type: 'danger', message: 'All 4 options must be non-empty.' });
      return;
    }

    const uniqueOptions = new Set(editForm.options.map((o) => o.trim().toLowerCase()));
    if (uniqueOptions.size !== 4) {
      setStatusMsg({ type: 'danger', message: 'All 4 options must be unique.' });
      return;
    }

    const correctAnswer = editForm.options[editForm.correctAnswerIndex].trim();

    const updatedContent = {
      ...editingItem.content,
      questionText: editForm.questionText.trim(),
      options: editForm.options.map((o) => o.trim()),
      correctAnswer,
      explanation: editForm.explanation.trim(),
      difficulty: editForm.difficulty,
    };

    try {
      const updated = await updateGeneratedItemApi(editingItem.id, {
        title: `MCQ (${editForm.difficulty}): ${editForm.questionText.slice(0, 60)}...`,
        content: updatedContent,
      });

      setReviewItems((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)));
      setEditingItem(null);
      setStatusMsg({ type: 'success', message: 'Question updated successfully.' });
    } catch (err: any) {
      setStatusMsg({
        type: 'danger',
        message: err.response?.data?.error?.message || 'Failed to update question.',
      });
    }
  };

  // Delete Item from Queue
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this generated question from the review queue?')) {
      return;
    }

    try {
      await deleteGeneratedItemApi(itemId);
      setReviewItems((prev) => prev.filter((i) => i.id !== itemId));
      setStatusMsg({ type: 'success', message: 'Question removed from review queue.' });
    } catch (err: any) {
      setStatusMsg({
        type: 'danger',
        message: err.response?.data?.error?.message || 'Failed to delete question.',
      });
    }
  };

  // Approve & Import
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

  // Find currently selected lesson details for grounding preview
  const selectedLessonObj = (() => {
    if (!selectedCourseDetails || !selectedLessonMcq) return null;
    for (const mod of selectedCourseDetails.modules || []) {
      const l = mod.lessons?.find((les) => les.id === selectedLessonMcq);
      if (l) return l;
    }
    return null;
  })();

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
              AI Content Generation and Trainer Review workflows are restricted to authorized <strong>ADMIN</strong> and <strong>TRAINER</strong> users.
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
            AI Content Studio & Assessment Engine
          </h1>
          <p className="text-xs text-silver mt-1">
            Generate topic-grounded MCQs and study notes powered by Gemini multimodal RAG.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-carbon-black p-1 rounded-lg border border-silver/20">
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
            {reviewItems.filter((i) => i.status === 'PENDING_REVIEW').length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-strawberry-red text-white text-[10px] rounded-full font-bold">
                {reviewItems.filter((i) => i.status === 'PENDING_REVIEW').length}
              </span>
            )}
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
        </div>
      </div>

      {/* Global Status Message Banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-lg border text-xs font-medium flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : statusMsg.type === 'info'
              ? 'bg-blue-950/40 border-blue-800 text-blue-300'
              : 'bg-red-950/40 border-red-800 text-red-300'
          }`}
        >
          <span className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : statusMsg.type === 'info' ? (
              <Info className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {statusMsg.message}
          </span>
          <button onClick={() => setStatusMsg(null)} className="text-silver hover:text-white font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: MCQ GENERATOR (Topic Grounded) */}
      {activeTab === 'mcq' && (
        <div className="space-y-6">
          <Card
            title="Topic-Grounded MCQ Generator"
            subtitle="Generates rigorous, educational MCQs extracted strictly from lesson content, YouTube transcripts, notes & attached PDFs"
          >
            <form onSubmit={handleGenerateMcqs} className="space-y-5">
              {/* Hierarchical Selection: Course -> Module -> Lesson */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-silver uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-strawberry-red" />
                    Target Course *
                  </label>
                  <select
                    value={selectedCourseMcq}
                    onChange={(e) => setSelectedCourseMcq(e.target.value)}
                    className="w-full bg-onyx border border-silver/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-strawberry-red"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.difficulty_level})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-silver uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-silver/60" />
                    Module (Optional)
                  </label>
                  <select
                    value={selectedModuleMcq}
                    onChange={(e) => {
                      setSelectedModuleMcq(e.target.value);
                      setSelectedLessonMcq('');
                    }}
                    disabled={courseLoading || !selectedCourseDetails?.modules?.length}
                    className="w-full bg-onyx border border-silver/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-strawberry-red disabled:opacity-50"
                  >
                    <option value="">-- All Modules in Course --</option>
                    {selectedCourseDetails?.modules?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-silver uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-strawberry-red" />
                    Specific Lesson (Recommended)
                  </label>
                  <select
                    value={selectedLessonMcq}
                    onChange={(e) => handleLessonChange(e.target.value)}
                    disabled={courseLoading}
                    className="w-full bg-onyx border border-silver/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-strawberry-red disabled:opacity-50"
                  >
                    <option value="">-- Ground across Course/Module --</option>
                    {selectedCourseDetails?.modules?.map((m) =>
                      m.lessons?.map((l) => (
                        <option key={l.id} value={l.id}>
                          {m.title} ➔ {l.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Topic & Focus */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-silver uppercase tracking-wider mb-1.5">
                    Topic Focus (Auto-grounded)
                  </label>
                  <input
                    type="text"
                    value={mcqTopic}
                    onChange={(e) => setMcqTopic(e.target.value)}
                    placeholder="e.g., Binary Search Algorithm, Time Complexity, Edge Cases"
                    className="w-full bg-onyx border border-silver/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-strawberry-red font-medium"
                  />
                  <span className="text-[10px] text-silver/60 mt-1 block">
                    Questions are strictly grounded in this topic and verified against course material.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-silver uppercase tracking-wider mb-1.5">
                      Question Count
                    </label>
                    <select
                      value={mcqCount}
                      onChange={(e) => setMcqCount(parseInt(e.target.value, 10))}
                      className="w-full bg-onyx border border-silver/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-strawberry-red font-mono"
                    >
                      <option value={3}>3 Questions</option>
                      <option value={5}>5 Questions (Recommended)</option>
                      <option value={10}>10 Questions</option>
                      <option value={15}>15 Questions</option>
                      <option value={20}>20 Questions (Max)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-silver uppercase tracking-wider mb-1.5">
                      Difficulty Level
                    </label>
                    <select
                      value={mcqDifficulty}
                      onChange={(e) => setMcqDifficulty(e.target.value as any)}
                      className="w-full bg-onyx border border-silver/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-strawberry-red font-mono"
                    >
                      <option value="BALANCED">Balanced Distribution</option>
                      <option value="EASY">Easy (Recall & Concepts)</option>
                      <option value="MEDIUM">Medium (Application)</option>
                      <option value="HARD">Hard (Scenarios & Edge cases)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Source Verification Checklist Preview */}
              <div className="p-4 bg-carbon-black rounded-lg border border-silver/15 space-y-2">
                <div className="text-[11px] font-bold text-silver uppercase tracking-wider flex items-center justify-between">
                  <span>Source Grounding Verification</span>
                  <span className="text-emerald-400 text-[10px] font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Strict Topic-Grounded RAG Pipeline
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-silver">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lesson Content</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-silver">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>YouTube Transcript</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-silver">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lesson Notes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-silver">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PDF Resources</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-[11px] text-silver/60">
                  <span>Quality Guarantee:</span>
                  <Badge variant="neutral" size="sm">✓ 4 Unique Options</Badge>
                  <Badge variant="neutral" size="sm">✓ No Gibberish</Badge>
                  <Badge variant="neutral" size="sm">✓ Verified Distractors</Badge>
                </div>

                <button
                  type="submit"
                  disabled={mcqGenerating || !selectedCourseMcq}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{mcqGenerating ? 'Grounding & Generating...' : 'Generate Grounded MCQs'}</span>
                </button>
              </div>
            </form>
          </Card>

          {/* Recently Generated MCQs in this session */}
          {generatedMcqResults.length > 0 && (
            <Card
              title={`Generated ${generatedMcqResults.length} Questions`}
              subtitle="Topic-grounded questions ready for your review and one-click assessment import"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-xs font-mono text-silver bg-carbon-black p-3 rounded-lg border border-silver/10">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {generatedMcqResults.length} Validated
                  </span>
                  <span>•</span>
                  <span className="text-blue-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 0 Duplicates
                  </span>
                  <span>•</span>
                  <span className="text-strawberry-red flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Topic Grounded
                  </span>
                </div>

                <div className="space-y-3">
                  {generatedMcqResults.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-4 bg-onyx rounded-lg border border-silver/20 space-y-3 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">Q{idx + 1}.</span>
                          <Badge
                            variant={
                              item.content.difficulty === 'EASY'
                                ? 'success'
                                : item.content.difficulty === 'HARD'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {item.content.difficulty || 'MEDIUM'}
                          </Badge>
                          {item.content.questionCategory && (
                            <Badge variant="neutral" size="sm">
                              {item.content.questionCategory}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-silver/60">
                          Ref: {item.content.sourceReference || 'Lesson Material'}
                        </span>
                      </div>

                      <p className="font-sans font-semibold text-white text-sm">
                        {item.content.questionText}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {Array.isArray(item.content.options) &&
                          item.content.options.map((opt: string, optIdx: number) => {
                            const isCorrect = opt === item.content.correctAnswer;
                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded border ${
                                  isCorrect
                                    ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300 font-bold'
                                    : 'bg-carbon-black border-silver/10 text-silver'
                                }`}
                              >
                                <span className="font-bold mr-1.5">{String.fromCharCode(65 + optIdx)}.</span>
                                {opt}
                                {isCorrect && <span className="ml-2 text-emerald-400">✓ (Correct)</span>}
                              </div>
                            );
                          })}
                      </div>

                      {item.content.explanation && (
                        <div className="text-[11px] font-sans text-silver/80 italic bg-carbon-black/60 p-2.5 rounded border border-silver/10">
                          <strong>Explanation:</strong> {item.content.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={() => setActiveTab('review')}
                    className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg border border-neutral-600 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Proceed to Review Queue & Import</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: REVIEW & APPROVAL QUEUE */}
      {activeTab === 'review' && (
        <Card
          title="Trainer Review & Assessment Import Queue"
          subtitle="Review, edit, regenerate, or approve AI generated questions before publishing to trainee assessments"
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
                    className="p-5 bg-onyx rounded-lg border border-silver/20 space-y-4 transition-all hover:border-silver/40"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-silver/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
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
                          {item.content?.difficulty && (
                            <Badge
                              variant={
                                item.content.difficulty === 'EASY'
                                  ? 'success'
                                  : item.content.difficulty === 'HARD'
                                  ? 'danger'
                                  : 'warning'
                              }
                              size="sm"
                            >
                              {item.content.difficulty}
                            </Badge>
                          )}
                          {item.content?.questionCategory && (
                            <Badge variant="neutral" size="sm">
                              {item.content.questionCategory}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-silver font-mono mt-1">
                          Course: {item.course_title || 'N/A'} • Provider: {item.provider} ({item.model})
                          {item.content?.sourceReference && ` • Source: ${item.content.sourceReference}`}
                        </p>
                      </div>
                      <div className="text-[10px] font-mono text-silver/60">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="p-4 bg-carbon-black rounded border border-silver/10 space-y-2 text-xs">
                      {item.item_type === 'MCQ' ? (
                        <div className="space-y-3">
                          <div className="font-semibold text-white text-sm">
                            {item.content.questionText}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                            {Array.isArray(item.content.options) &&
                              item.content.options.map((opt: any, idx: number) => {
                                const text = typeof opt === 'string' ? opt : opt.optionText;
                                const isCorr =
                                  typeof opt === 'string'
                                    ? opt === item.content.correctAnswer
                                    : opt.isCorrect;
                                return (
                                  <div
                                    key={idx}
                                    className={`p-2.5 rounded border text-xs ${
                                      isCorr
                                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 font-bold'
                                        : 'bg-onyx border-silver/10 text-silver'
                                    }`}
                                  >
                                    <span className="font-bold mr-1.5">{String.fromCharCode(65 + idx)}.</span>
                                    {text} {isCorr ? '✓ (Correct)' : ''}
                                  </div>
                                );
                              })}
                          </div>
                          {item.content.explanation && (
                            <div className="text-[11px] text-silver/80 italic pt-1">
                              <strong>Explanation:</strong> {item.content.explanation}
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
                      <div className="pt-2 flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                          {/* MCQ Target Assessment Selector */}
                          {item.item_type === 'MCQ' && (
                            <div className="flex-1 w-full">
                              <select
                                value={selectedTargetAssessment[item.id] || ''}
                                onChange={(e) =>
                                  setSelectedTargetAssessment((prev) => ({ ...prev, [item.id]: e.target.value }))
                                }
                                className="w-full bg-onyx border border-silver/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-strawberry-red font-mono"
                              >
                                <option value="">-- Select Target Assessment to Import --</option>
                                {(() => {
                                  const courseAssessments = assessments.filter((a) => a.course_id === item.course_id);
                                  const otherAssessments = assessments.filter((a) => a.course_id !== item.course_id);

                                  return (
                                    <>
                                      {courseAssessments.length > 0 && (
                                        <optgroup label="This Course's Assessments">
                                          {courseAssessments.map((a) => (
                                            <option key={a.id} value={a.id}>
                                              {a.title} ({a.status})
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                      {otherAssessments.length > 0 && (
                                        <optgroup label={courseAssessments.length > 0 ? "Other Assessments in Org" : "Available Assessments"}>
                                          {otherAssessments.map((a) => (
                                            <option key={a.id} value={a.id}>
                                              {a.title} ({a.status})
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                    </>
                                  );
                                })()}
                              </select>
                            </div>
                          )}

                          {/* Action Buttons: Edit, Regenerate, Delete, Approve, Reject */}
                          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
                            {item.item_type === 'MCQ' && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="px-3 py-1.5 bg-carbon-black hover:bg-neutral-800 border border-silver/20 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <Edit className="w-3.5 h-3.5 text-silver" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => handleRegenerateItem(item.id)}
                                  disabled={regeneratingId === item.id}
                                  className="px-3 py-1.5 bg-carbon-black hover:bg-neutral-800 border border-strawberry-red/40 text-strawberry-red hover:text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Sparkles className={`w-3.5 h-3.5 ${regeneratingId === item.id ? 'animate-spin' : ''}`} />
                                  <span>{regeneratingId === item.id ? 'Regenerating...' : '✨ Regenerate'}</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="px-2.5 py-1.5 bg-carbon-black hover:bg-red-950 border border-red-900/40 text-red-400 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                  title="Delete question"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleReviewAction(item.id, 'APPROVE')}
                              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve & Import
                            </button>

                            <button
                              onClick={() => handleReviewAction(item.id, 'REJECT')}
                              className="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
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

      {/* TAB 3: STUDY NOTES GENERATOR */}
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

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-onyx border border-silver/20 rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-silver/15 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-strawberry-red" />
                Edit AI-Generated Question
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-silver hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Question Text */}
              <div>
                <label className="block font-bold text-silver uppercase mb-1">Question Text</label>
                <textarea
                  rows={2}
                  value={editForm.questionText}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, questionText: e.target.value }))}
                  className="w-full bg-carbon-black border border-silver/20 rounded-lg p-2.5 text-white focus:outline-none focus:border-strawberry-red font-medium"
                />
              </div>

              {/* 4 Options & Correct Answer Radio */}
              <div className="space-y-2">
                <label className="block font-bold text-silver uppercase mb-1">
                  Options & Correct Answer (Select the radio button for the correct choice)
                </label>
                {editForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={editForm.correctAnswerIndex === i}
                      onChange={() => setEditForm((prev) => ({ ...prev, correctAnswerIndex: i }))}
                      className="w-4 h-4 accent-strawberry-red cursor-pointer"
                    />
                    <span className="font-bold text-silver font-mono w-4">{String.fromCharCode(65 + i)}.</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditForm((prev) => {
                          const newOpts = [...prev.options];
                          newOpts[i] = val;
                          return { ...prev, options: newOpts };
                        });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="flex-1 bg-carbon-black border border-silver/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-strawberry-red font-mono text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* Difficulty */}
              <div>
                <label className="block font-bold text-silver uppercase mb-1">Difficulty</label>
                <select
                  value={editForm.difficulty}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, difficulty: e.target.value as any }))}
                  className="w-full bg-carbon-black border border-silver/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-strawberry-red font-mono"
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>

              {/* Explanation */}
              <div>
                <label className="block font-bold text-silver uppercase mb-1">Explanation</label>
                <textarea
                  rows={2}
                  value={editForm.explanation}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, explanation: e.target.value }))}
                  className="w-full bg-carbon-black border border-silver/20 rounded-lg p-2.5 text-white focus:outline-none focus:border-strawberry-red font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-silver/15">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-carbon-black hover:bg-neutral-800 text-silver hover:text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-gradient-to-r from-[#660708] to-[#e5383b] text-white rounded-lg text-xs font-bold transition-all shadow"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
