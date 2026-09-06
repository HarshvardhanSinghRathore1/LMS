'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import {
  Course,
  fetchCourseByIdApi,
  publishCourseApi,
  archiveCourseApi,
} from '../../../lib/courses';
import { Badge } from '../../../components/ui/Badge';
import {
  BookOpen,
  ArrowLeft,
  Clock,
  Layers,
  FileText,
  Video,
  CheckCircle,
  Archive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const courseId = (params?.id as string) || '';
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  const isManagementAllowed = user?.role === 'ADMIN' || user?.role === 'TRAINER';

  const loadCourse = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const fetched = await fetchCourseByIdApi(courseId);
      setCourse(fetched);
      if (fetched.modules && fetched.modules.length > 0) {
        setExpandedModuleId(fetched.modules[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Course not found or access forbidden.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) loadCourse();
  }, [courseId]);

  const handlePublish = async () => {
    try {
      await publishCourseApi(courseId);
      setStatusMsg('Course published successfully!');
      loadCourse();
    } catch (err: any) {
      setStatusMsg(`Publish Failed: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  const handleArchive = async () => {
    try {
      await archiveCourseApi(courseId);
      setStatusMsg('Course archived.');
      loadCourse();
    } catch (err: any) {
      setStatusMsg(`Archive Failed: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[var(--onyx)] text-[var(--white-smoke)] p-4 md:p-8 max-w-5xl mx-auto space-y-8">
        {/* Navigation Top */}
        <div>
          <button
            onClick={() => router.push('/courses')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Course Catalog
          </button>
        </div>

        {/* Alerts */}
        {statusMsg && (
          <div className="p-3 bg-red-950/40 border border-red-800 text-[var(--strawberry-red)] text-xs rounded-lg flex justify-between items-center">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg(null)} className="font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
            <div className="w-8 h-8 border-4 border-[var(--strawberry-red)] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p>Loading course details...</p>
          </div>
        ) : errorMsg || !course ? (
          <div className="p-8 bg-[var(--carbon-black)] border border-red-900/50 rounded-xl text-center space-y-3">
            <div className="text-red-400 font-bold text-lg">404 / Access Denied</div>
            <p className="text-xs text-[var(--silver)]">{errorMsg || 'Course unavailable in your organization.'}</p>
            <button
              onClick={() => router.push('/courses')}
              className="px-4 py-2 bg-neutral-800 text-white text-xs font-semibold rounded-lg"
            >
              Return to Catalog
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Course Header Banner */}
            <section className="bg-[var(--carbon-black)] p-6 md:p-8 rounded-xl border border-neutral-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-neutral-800 text-neutral-200 rounded font-semibold uppercase">
                    {course.category}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded font-bold ${
                      course.difficulty_level === 'BEGINNER'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : course.difficulty_level === 'INTERMEDIATE'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    {course.difficulty_level}
                  </span>
                </div>

                {isManagementAllowed && (
                  <span
                    className={`px-3 py-1 rounded font-bold ${
                      course.status === 'PUBLISHED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : course.status === 'DRAFT'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    STATUS: {course.status}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-[var(--strawberry-red)] shrink-0" />
                  {course.title}
                </h1>
                <p className="text-sm text-[var(--silver)] mt-2 font-normal leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Stats Bar & Management Actions */}
              <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-xs text-neutral-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[var(--strawberry-red)]" />
                    {course.modules_count || 0} Modules ({course.lessons_count || 0} Lessons)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    {course.total_duration_minutes || 0} Minutes Total
                  </span>
                </div>

                {isManagementAllowed && (
                  <div className="flex items-center gap-2">
                    {course.status === 'DRAFT' && (
                      <button
                        onClick={handlePublish}
                        className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Publish Course</span>
                      </button>
                    )}
                    {course.status === 'PUBLISHED' && (
                      <button
                        onClick={handleArchive}
                        className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Archive className="w-4 h-4" />
                        <span>Archive Course</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Modules & Lessons Structure Accordion */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[var(--strawberry-red)]" />
                Course Curriculum & Modules
              </h2>

              {!course.modules || course.modules.length === 0 ? (
                <div className="p-8 bg-[var(--carbon-black)] rounded-xl border border-neutral-800 text-center text-xs text-neutral-500 font-mono">
                  No modules published in this course curriculum.
                </div>
              ) : (
                <div className="space-y-3">
                  {course.modules.map((module, mIdx) => {
                    const isExpanded = expandedModuleId === module.id;
                    return (
                      <div
                        key={module.id}
                        className="bg-[var(--carbon-black)] border border-neutral-800 rounded-xl overflow-hidden shadow-lg transition-all"
                      >
                        {/* Module Header Toggle */}
                        <button
                          onClick={() => setExpandedModuleId(isExpanded ? null : module.id)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-neutral-900/60 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span className="w-5 h-5 bg-neutral-800 text-[var(--strawberry-red)] rounded-full text-[10px] flex items-center justify-center font-bold">
                                {mIdx + 1}
                              </span>
                              <span>{module.title}</span>
                            </div>
                            {module.description && (
                              <p className="text-xs text-[var(--silver)] pl-7 line-clamp-1">
                                {module.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {module.lessons?.length || 0} Lessons
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-neutral-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-neutral-400" />
                            )}
                          </div>
                        </button>

                        {/* Module Lessons Content */}
                        {isExpanded && module.lessons && (
                          <div className="p-4 pt-0 border-t border-neutral-800/80 space-y-3 bg-[var(--onyx)]/60">
                            {module.lessons.map((lesson, lIdx) => (
                              <div
                                key={lesson.id}
                                className="bg-[var(--carbon-black)] p-4 rounded-lg border border-neutral-800 space-y-2"
                              >
                                <div className="flex justify-between items-center font-bold text-xs text-white">
                                  <span className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[var(--strawberry-red)] shrink-0" />
                                    Lesson {lIdx + 1}: {lesson.title}
                                  </span>
                                  <span className="text-[11px] text-amber-400 flex items-center gap-1 font-mono">
                                    <Clock className="w-3.5 h-3.5" />
                                    {lesson.duration_minutes}m
                                  </span>
                                </div>

                                {/* Lesson Text Body */}
                                {lesson.content_body && (
                                  <div className="text-xs text-[var(--silver)] leading-relaxed bg-[var(--onyx)] p-3 rounded border border-neutral-800/50 whitespace-pre-line font-sans">
                                    {lesson.content_body}
                                  </div>
                                )}

                                {/* Optional Video URL Metadata */}
                                {lesson.video_url && (
                                  <div className="pt-1">
                                    <a
                                      href={lesson.video_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline font-mono bg-blue-950/40 px-3 py-1.5 rounded border border-blue-900/50"
                                    >
                                      <Video className="w-3.5 h-3.5" />
                                      <span>Watch Resource Video: {lesson.video_url}</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
