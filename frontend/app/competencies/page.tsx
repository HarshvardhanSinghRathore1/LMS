'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import {
  Competency,
  TraineeCompetency,
  OrganizationSkillGapMatrix,
  ProficiencyLevel,
  fetchCompetenciesApi,
  createCompetencyApi,
  mapCourseToCompetencyApi,
  fetchMyCompetencyGapsApi,
  fetchOrganizationSkillGapMatrixApi,
} from '../../lib/competencies';
import { Course, fetchCoursesApi } from '../../lib/courses';
import {
  Award,
  BookOpen,
  ArrowLeft,
  Plus,
  Layers,
  Sparkles,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Users,
  Target,
  Grid,
} from 'lucide-react';

export default function CompetencyDashboardPage() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Trainee State
  const [traineeGaps, setTraineeGaps] = useState<TraineeCompetency[]>([]);

  // Admin/Trainer State
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [matrix, setMatrix] = useState<OrganizationSkillGapMatrix | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<'FRAMEWORK' | 'MATRIX'>('FRAMEWORK');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Technology');
  const [targetScore, setTargetScore] = useState(75);
  const [description, setDescription] = useState('');

  // Mapping Form State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [weight, setWeight] = useState(1.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManagementAllowed = user?.role === 'ADMIN' || user?.role === 'TRAINER';
  const isTrainee = user?.role === 'TRAINEE';

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (isTrainee) {
        const gaps = await fetchMyCompetencyGapsApi();
        setTraineeGaps(gaps);
      }

      if (isManagementAllowed) {
        const compRes = await fetchCompetenciesApi({ limit: 100 });
        setCompetencies(compRes.competencies);

        try {
          const matrixRes = await fetchOrganizationSkillGapMatrixApi();
          setMatrix(matrixRes);
        } catch (e) {
          console.error('Failed to load matrix', e);
        }

        try {
          const courseRes = await fetchCoursesApi({ limit: 100 });
          setCourses(courseRes.courses);
        } catch (e) {
          console.error('Failed to load courses', e);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to load competency workspace data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const handleCreateCompetency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await createCompetencyApi({
        code,
        name,
        category,
        targetScorePercentage: Number(targetScore),
        description,
      });
      setStatusMsg(`🎉 Competency '${code}' created successfully!`);
      setShowCreateModal(false);
      setCode('');
      setName('');
      setDescription('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to create competency');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMapCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMapModal || !selectedCourseId) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await mapCourseToCompetencyApi(showMapModal, {
        courseId: selectedCourseId,
        weight: Number(weight),
      });
      setStatusMsg('🎉 Course mapped to competency successfully!');
      setShowMapModal(null);
      setSelectedCourseId('');
      setWeight(1.0);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to map course to competency');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProficiencyBadge = (level: ProficiencyLevel) => {
    switch (level) {
      case 'EXPERT':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-950 text-purple-300 border border-purple-800">🔮 EXPERT</span>;
      case 'ADVANCED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">⚡ ADVANCED</span>;
      case 'INTERMEDIATE':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-amber-950 text-amber-300 border border-amber-800">📌 INTERMEDIATE</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-neutral-900 text-neutral-400 border border-neutral-700">🌱 NOVICE</span>;
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[var(--onyx)] text-[var(--white-smoke)] p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <Link href="/" className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 font-mono mb-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Award className="w-8 h-8 text-[var(--strawberry-red)]" />
              Competency Engine & Skill Gap Analysis
            </h1>
            <p className="text-xs md:text-sm text-[var(--silver)] mt-1">
              70% Assessment Performance + 30% Course Lesson Progress Evaluated Real-Time Strategy
            </p>
          </div>

          {isManagementAllowed && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Competency</span>
              </button>
            </div>
          )}
        </div>

        {/* Status / Error Alerts */}
        {statusMsg && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex justify-between items-center">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg(null)} className="font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-950/40 border border-red-800 text-red-300 text-xs rounded-xl flex justify-between items-center">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="p-16 text-center text-xs text-neutral-400 space-y-3">
            <div className="w-10 h-10 border-4 border-[var(--strawberry-red)] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p>Evaluating competency scores & skill gap matrices...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* TRAINEE VIEW */}
            {isTrainee && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-[var(--strawberry-red)]" />
                    My Evaluated Competencies & Skill Gaps
                  </h2>
                  <span className="text-xs font-mono text-neutral-400">
                    Calculated from your course progress & assessment submissions
                  </span>
                </div>

                {traineeGaps.length === 0 ? (
                  <div className="p-12 bg-[var(--carbon-black)] border border-neutral-800 rounded-2xl text-center space-y-3">
                    <Award className="w-12 h-12 text-neutral-600 mx-auto" />
                    <h3 className="text-lg font-bold text-white">No Evaluated Competencies Yet</h3>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto">
                      Enroll in mapped courses, complete lessons, and submit assessments to evaluate your organizational competencies.
                    </p>
                    <Link
                      href="/courses"
                      className="inline-block mt-2 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      Browse Mapped Courses
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {traineeGaps.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[var(--carbon-black)] border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded bg-neutral-800 text-neutral-300">
                              {item.competency_code}
                            </span>
                            {getProficiencyBadge(item.proficiency_level)}
                          </div>

                          <div>
                            <h3 className="text-lg font-bold text-white">{item.competency_name}</h3>
                            <span className="text-xs text-neutral-400 font-mono">{item.category || 'General'}</span>
                          </div>
                        </div>

                        {/* Metrics Bar */}
                        <div className="space-y-3 pt-4 border-t border-neutral-800 font-mono">
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-400">Current Evaluated Score:</span>
                            <span className="font-bold text-white">{item.current_score_percentage}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-400">Target Benchmark:</span>
                            <span className="font-bold text-amber-400">{item.target_score_percentage}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-400">Remaining Skill Gap:</span>
                            <span
                              className={`font-bold ${
                                Number(item.gap_percentage) === 0 ? 'text-emerald-400' : 'text-[var(--strawberry-red)]'
                              }`}
                            >
                              {item.gap_percentage}%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className={`h-full transition-all duration-500 ${
                                Number(item.gap_percentage) === 0
                                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                                  : 'bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b]'
                              }`}
                              style={{ width: `${item.current_score_percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ADMIN / TRAINER MANAGEMENT VIEW */}
            {isManagementAllowed && (
              <section className="space-y-6">
                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                  <button
                    onClick={() => setActiveTab('FRAMEWORK')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                      activeTab === 'FRAMEWORK'
                        ? 'bg-[var(--mahogany-red)] text-white shadow'
                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Competency Framework ({competencies.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('MATRIX')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                      activeTab === 'MATRIX'
                        ? 'bg-[var(--mahogany-red)] text-white shadow'
                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                    <span>Organization Skill Gap Matrix</span>
                  </button>
                </div>

                {/* TAB 1 — COMPETENCY FRAMEWORK */}
                {activeTab === 'FRAMEWORK' && (
                  <div className="space-y-4">
                    {competencies.length === 0 ? (
                      <div className="p-12 bg-[var(--carbon-black)] border border-neutral-800 rounded-2xl text-center space-y-3">
                        <Award className="w-12 h-12 text-neutral-600 mx-auto" />
                        <h3 className="text-lg font-bold text-white">No Competencies Defined</h3>
                        <p className="text-xs text-neutral-400 max-w-md mx-auto">
                          Define organizational competencies and map them to course curricula to evaluate skill gaps automatically.
                        </p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="px-4 py-2 bg-[var(--mahogany-red)] text-white font-bold text-xs rounded-xl"
                        >
                          Create First Competency
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {competencies.map((comp) => (
                          <div
                            key={comp.id}
                            className="bg-[var(--carbon-black)] border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded bg-neutral-800 text-neutral-300">
                                  {comp.code}
                                </span>
                                <span className="text-xs font-mono text-amber-400 font-semibold">
                                  Target: {comp.target_score_percentage}%
                                </span>
                              </div>

                              <h3 className="text-lg font-bold text-white">{comp.name}</h3>
                              {comp.description && (
                                <p className="text-xs text-neutral-400 leading-relaxed">{comp.description}</p>
                              )}
                            </div>

                            <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                              <span className="text-xs text-neutral-400 font-mono">
                                {comp.mapped_courses_count || 0} Mapped Courses
                              </span>
                              <button
                                onClick={() => setShowMapModal(comp.id)}
                                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Map Course</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2 — ORGANIZATION SKILL GAP MATRIX */}
                {activeTab === 'MATRIX' && matrix && (
                  <div className="space-y-6">
                    {/* Summary Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div className="bg-[var(--carbon-black)] p-4 rounded-xl border border-neutral-800">
                        <p className="text-[11px] text-neutral-400 font-mono">Total Competencies</p>
                        <p className="text-2xl font-black text-white mt-1">{matrix.summary.totalCompetencies}</p>
                      </div>
                      <div className="bg-[var(--carbon-black)] p-4 rounded-xl border border-neutral-800">
                        <p className="text-[11px] text-neutral-400 font-mono">Trainees Evaluated</p>
                        <p className="text-2xl font-black text-amber-400 mt-1">{matrix.summary.totalTraineesEvaluated}</p>
                      </div>
                      <div className="bg-[var(--carbon-black)] p-4 rounded-xl border border-neutral-800">
                        <p className="text-[11px] text-neutral-400 font-mono">Avg Org Skill Gap</p>
                        <p className="text-2xl font-black text-[var(--strawberry-red)] mt-1">
                          {matrix.summary.averageGapPercentage}%
                        </p>
                      </div>
                      <div className="bg-[var(--carbon-black)] p-4 rounded-xl border border-neutral-800">
                        <p className="text-[11px] text-neutral-400 font-mono">Novice Count</p>
                        <p className="text-2xl font-black text-neutral-400 mt-1">{matrix.summary.noviceCount}</p>
                      </div>
                      <div className="bg-[var(--carbon-black)] p-4 rounded-xl border border-neutral-800">
                        <p className="text-[11px] text-neutral-400 font-mono">Advanced Count</p>
                        <p className="text-2xl font-black text-emerald-400 mt-1">{matrix.summary.advancedCount}</p>
                      </div>
                      <div className="bg-[var(--carbon-black)] p-4 rounded-xl border border-neutral-800">
                        <p className="text-[11px] text-neutral-400 font-mono">Expert Count</p>
                        <p className="text-2xl font-black text-purple-400 mt-1">{matrix.summary.expertCount}</p>
                      </div>
                    </div>

                    {/* Matrix Heatmap Table */}
                    {matrix.trainees.length === 0 ? (
                      <div className="p-8 bg-[var(--carbon-black)] rounded-xl border border-neutral-800 text-center text-xs text-neutral-500 font-mono">
                        No evaluated trainee snapshot records available for matrix aggregation.
                      </div>
                    ) : (
                      <div className="bg-[var(--carbon-black)] border border-neutral-800 rounded-2xl overflow-x-auto shadow-2xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-neutral-800 bg-neutral-900/80 text-xs font-mono text-neutral-300 uppercase">
                              <th className="p-4 sticky left-0 bg-neutral-900">Trainee</th>
                              {matrix.competencies.map((comp) => (
                                <th key={comp.id} className="p-4 text-center min-w-[140px]">
                                  <div>{comp.code}</div>
                                  <div className="text-[10px] text-amber-400 lowercase font-normal">
                                    target: {comp.targetScorePercentage}%
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-800/60 text-xs font-mono">
                            {matrix.trainees.map((trainee) => (
                              <tr key={trainee.id} className="hover:bg-neutral-900/40">
                                <td className="p-4 font-bold text-white sticky left-0 bg-[var(--carbon-black)]">
                                  <div>{trainee.name}</div>
                                  <div className="text-[10px] text-neutral-400 font-normal">{trainee.email}</div>
                                </td>
                                {matrix.competencies.map((comp) => {
                                  const cell = trainee.competencies[comp.id];
                                  if (!cell) {
                                    return (
                                      <td key={comp.id} className="p-4 text-center text-neutral-600">
                                        -
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={comp.id} className="p-4 text-center space-y-1">
                                      <div className="font-bold text-white">{cell.currentScore}%</div>
                                      <div className="text-[10px]">
                                        {cell.gap === 0 ? (
                                          <span className="text-emerald-400 font-bold">✓ Gap 0%</span>
                                        ) : (
                                          <span className="text-red-400 font-bold">Gap {cell.gap}%</span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* MODAL 1 — CREATE COMPETENCY */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--carbon-black)] border border-neutral-800 w-full max-w-lg rounded-2xl p-6 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="text-lg font-bold text-white">Create Organizational Competency</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-neutral-400 hover:text-white font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCompetency} className="space-y-4 font-sans text-xs">
                <div>
                  <label className="block text-neutral-400 font-mono mb-1">Competency Code (e.g. COMP-NODE-JS)</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="COMP-JAVA-01"
                    className="w-full bg-[var(--onyx)] border border-neutral-800 rounded-lg p-3 text-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-mono mb-1">Competency Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Java Backend Microservices"
                    className="w-full bg-[var(--onyx)] border border-neutral-800 rounded-lg p-3 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 font-mono mb-1">Category</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[var(--onyx)] border border-neutral-800 rounded-lg p-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 font-mono mb-1">Target Score % (0-100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={targetScore}
                      onChange={(e) => setTargetScore(Number(e.target.value))}
                      className="w-full bg-[var(--onyx)] border border-neutral-800 rounded-lg p-3 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-400 font-mono mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Key concepts and technical skills required..."
                    className="w-full bg-[var(--onyx)] border border-neutral-800 rounded-lg p-3 text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[var(--mahogany-red)] text-white rounded-lg font-bold shadow"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Competency'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2 — MAP COURSE TO COMPETENCY */}
        {showMapModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--carbon-black)] border border-neutral-800 w-full max-w-md rounded-2xl p-6 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="text-lg font-bold text-white">Map Course to Competency</h3>
                <button onClick={() => setShowMapModal(null)} className="text-neutral-400 hover:text-white font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleMapCourse} className="space-y-4 font-sans text-xs">
                <div>
                  <label className="block text-neutral-400 font-mono mb-1">Select Mapped Course</label>
                  <select
                    required
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full bg-[var(--onyx)] border border-neutral-800 rounded-lg p-3 text-white"
                  >
                    <option value="">-- Choose Course --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 font-mono mb-1">Course Weight (Relative Importance)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full bg-[var(--onyx)] border border-neutral-800 rounded-lg p-3 text-white font-mono"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Normalized against total weight of all mapped courses.
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMapModal(null)}
                    className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedCourseId}
                    className="px-5 py-2 bg-[var(--mahogany-red)] text-white rounded-lg font-bold shadow"
                  >
                    {isSubmitting ? 'Mapping...' : 'Save Course Mapping'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
