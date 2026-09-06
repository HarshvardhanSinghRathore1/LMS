'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  Assessment,
  Question,
  Submission,
  fetchAssessmentByIdApi,
  startAttemptApi,
  submitAttemptApi,
} from '@/lib/assessments';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  FileText,
  Award,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export default function TakeAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const assessmentId = (params?.id as string) || '';
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const [loading, setLoading] = useState(true);
  const [startingAttempt, setStartingAttempt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<Submission | null>(null);

  // Timer Countdown state (seconds remaining)
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    async function loadAssessment() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch Assessment & Questions (Safe DTO without answer keys)
        const data = await fetchAssessmentByIdApi(assessmentId);
        setAssessment(data.assessment);
        setQuestions(data.questions);
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.error?.message || 'Failed to load assessment details');
      } finally {
        setLoading(false);
      }
    }

    if (assessmentId) loadAssessment();
  }, [assessmentId]);

  // Timer Effect
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const handleStartAttempt = async () => {
    try {
      setStartingAttempt(true);
      setErrorMsg(null);
      const attempt = await startAttemptApi(assessmentId);
      setSubmission(attempt);

      // Initialize Timer if expires_at is present
      if (attempt.expires_at) {
        const expiresTime = new Date(attempt.expires_at).getTime();
        const nowTime = new Date().getTime();
        const diffSecs = Math.max(0, Math.floor((expiresTime - nowTime) / 1000));
        setSecondsRemaining(diffSecs);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to start assessment attempt');
    } finally {
      setStartingAttempt(false);
    }
  };

  const handleOptionSelect = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission) return;

    if (!confirm('Are you sure you want to submit your assessment for automated grading?')) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const graded = await submitAttemptApi(assessmentId, submission.id, answers);
      setResultModal(graded);
      setSubmission(null);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to submit assessment attempt');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0b090a] text-[#f5f3f4] font-sans selection:bg-[#a4161a] selection:text-white">
        {/* Top Header Navigation */}
        <header className="border-b border-[#2b2b2b] bg-[#161a1d]/90 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => router.push('/assessments')}
              className="text-xs text-[#b1a7a6] hover:text-white flex items-center gap-1 font-mono"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Exit Assessment
            </button>

            {secondsRemaining !== null && (
              <div
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                  secondsRemaining < 60
                    ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>TIME REMAINING: {formatTimer(secondsRemaining)}</span>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-[#a4161a] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-[#b1a7a6] text-sm">Loading assessment environment...</p>
            </div>
          ) : errorMsg || !assessment ? (
            <div className="p-8 bg-[#161a1d] border border-red-900/50 rounded-2xl text-center space-y-3">
              <div className="text-red-400 font-bold text-lg">Error Loading Assessment</div>
              <p className="text-xs text-[#b1a7a6]">{errorMsg || 'Assessment unavailable.'}</p>
              <button
                onClick={() => router.push('/assessments')}
                className="px-4 py-2 bg-[#2b2b2b] text-white text-xs font-semibold rounded-lg"
              >
                Return to Assessments Hub
              </button>
            </div>
          ) : !submission ? (
            /* Pre-Attempt Start Hero Screen */
            <div className="bg-[#161a1d] border border-[#2b2b2b] rounded-2xl p-8 shadow-2xl space-y-6">
              <div className="space-y-2 border-b border-[#2b2b2b] pb-6">
                <span className="px-3 py-1 bg-[#2b2b2b] text-[#b1a7a6] text-xs font-semibold rounded-md">
                  {assessment.course_title || 'Course Assessment'}
                </span>
                <h1 className="text-3xl font-extrabold text-white mt-2">{assessment.title}</h1>
                <p className="text-sm text-[#b1a7a6] leading-relaxed">{assessment.description}</p>
              </div>

              {/* Assessment Parameters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-[#b1a7a6]">Questions</p>
                  <p className="text-xl font-black text-white mt-1">{questions.length}</p>
                </div>
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-[#b1a7a6]">Passing Score</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">{assessment.passing_score_percentage}%</p>
                </div>
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-[#b1a7a6]">Time Limit</p>
                  <p className="text-xl font-black text-amber-400 mt-1">
                    {assessment.time_limit_minutes ? `${assessment.time_limit_minutes} Mins` : 'Untimed'}
                  </p>
                </div>
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-[#b1a7a6]">Max Attempts</p>
                  <p className="text-xl font-black text-white mt-1">{assessment.max_attempts}</p>
                </div>
              </div>

              {/* Start Button CTA */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleStartAttempt}
                  disabled={startingAttempt}
                  className="px-8 py-3.5 bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-xl transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{startingAttempt ? 'Initializing Attempt...' : 'Begin Assessment Attempt'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Attempt Test Interface */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Attempt Banner */}
              <div className="bg-[#161a1d] p-4 rounded-xl border border-[#2b2b2b] flex items-center justify-between text-xs font-mono">
                <span>ATTEMPT #{submission.attempt_number} IN PROGRESS</span>
                <span className="text-emerald-400">
                  {Object.keys(answers).length} / {questions.length} Questions Answered
                </span>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-[#161a1d] border border-[#2b2b2b] rounded-2xl p-6 shadow-xl space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-base font-bold text-white flex items-start gap-2">
                        <span className="w-6 h-6 rounded-md bg-[#2b2b2b] text-[#e5383b] text-xs font-mono flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span>{q.question_text}</span>
                      </h3>
                      <span className="px-2.5 py-1 bg-[#0b090a] text-amber-400 text-xs font-mono rounded border border-[#2b2b2b] shrink-0">
                        {q.points} Points
                      </span>
                    </div>

                    {/* Question Options */}
                    <div className="space-y-2 pt-2">
                      {q.question_type === 'MCQ' ? (
                        q.options.map((opt, optIdx) => {
                          const isSelected = answers[q.id] === opt;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleOptionSelect(q.id, opt)}
                              className={`w-full p-3.5 rounded-xl text-left text-sm transition-all border flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#660708]/40 border-[#e5383b] text-white font-semibold'
                                  : 'bg-[#0b090a] hover:bg-[#2b2b2b]/50 border-[#2b2b2b] text-[#b1a7a6]'
                              }`}
                            >
                              <span>{opt}</span>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected ? 'border-[#e5383b] bg-[#e5383b]' : 'border-neutral-600'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        /* TRUE / FALSE Options */
                        <div className="grid grid-cols-2 gap-3">
                          {['true', 'false'].map((val) => {
                            const isSelected = String(answers[q.id]).toLowerCase() === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleOptionSelect(q.id, val)}
                                className={`p-4 rounded-xl text-center text-sm font-bold uppercase transition-all border ${
                                  isSelected
                                    ? 'bg-[#660708]/40 border-[#e5383b] text-white'
                                    : 'bg-[#0b090a] hover:bg-[#2b2b2b]/50 border-[#2b2b2b] text-[#b1a7a6]'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit CTA */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-500 hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-xl transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{submitting ? 'Grading Answers...' : 'Submit Assessment Answers'}</span>
                </button>
              </div>
            </form>
          )}
        </main>

        {/* Real-Time Automated Score & Pass/Fail Result Modal */}
        {resultModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#161a1d] border border-[#2b2b2b] rounded-2xl max-w-md w-full p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-200">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl shadow-inner border border-white/10"
                   style={{
                     backgroundColor: resultModal.passed ? 'rgba(6, 78, 59, 0.6)' : 'rgba(102, 7, 8, 0.6)',
                   }}>
                {resultModal.passed ? '🏆' : '❌'}
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white">
                  {resultModal.passed ? 'ASSESSMENT PASSED!' : 'ASSESSMENT FAILED'}
                </h2>
                <p className="text-xs text-[#b1a7a6]">Automated Server-Side Evaluation Result</p>
              </div>

              {/* Score Display Box */}
              <div className="bg-[#0b090a] p-6 rounded-xl border border-[#2b2b2b] space-y-3 font-mono">
                <div className="text-4xl font-black text-white">
                  {resultModal.score_percentage}%
                </div>
                <div className="text-xs text-[#b1a7a6]">
                  Earned {resultModal.total_points_earned} of {resultModal.max_points_possible} Total Points
                </div>
                <div className="pt-2 border-t border-[#2b2b2b] text-xs flex justify-between">
                  <span className="text-neutral-400">Passing Threshold:</span>
                  <span className="text-emerald-400 font-bold">{assessment?.passing_score_percentage}%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={() => router.push('/assessments')}
                  className="w-full py-3 bg-gradient-to-r from-[#660708] to-[#a4161a] text-white font-bold text-sm rounded-xl shadow transition-all"
                >
                  Return to Assessment Hub
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
