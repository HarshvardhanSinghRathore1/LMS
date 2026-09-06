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
import {
  CourseEnrollment,
  LessonProgress,
  enrollInCourseApi,
  fetchMyEnrollmentsApi,
  fetchEnrollmentByIdApi,
  markLessonCompleteApi,
  markLessonUncompleteApi,
} from '../../../lib/enrollments';
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
  GraduationCap,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { Assessment, fetchAssessmentsApi } from '../../../lib/assessments';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const courseId = (params?.id as string) || '';
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [togglingLessonId, setTogglingLessonId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const isManagementAllowed = user?.role === 'ADMIN' || user?.role === 'TRAINER';
  const isTrainee = user?.role === 'TRAINEE';

  const loadCourseAndEnrollment = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch Course Hierarchy
      const fetched = await fetchCourseByIdApi(courseId);
      setCourse(fetched);
      if (fetched.modules && fetched.modules.length > 0) {
        setExpandedModuleId(fetched.modules[0].id);
      }

      // 2. Fetch Course Assessments
      try {
        const assRes = await fetchAssessmentsApi({ courseId });
        setAssessments(assRes.assessments);
      } catch (e) {
        console.error('Failed to load course assessments', e);
      }

      // 3. If Trainee, fetch enrollment status
      if (user?.role === 'TRAINEE') {
        try {
          const myEnrollments = await fetchMyEnrollmentsApi({ limit: 100 });
          const existing = myEnrollments.enrollments.find((e) => e.course_id === courseId);
          if (existing) {
            setEnrollment(existing);
            // Fetch detailed lesson progress for this enrollment
            const detail = await fetchEnrollmentByIdApi(existing.id);
            setEnrollment(detail.enrollment);
            const progressRecord: Record<string, boolean> = {};
            detail.lessonProgress.forEach((lp) => {
              progressRecord[lp.lesson_id] = lp.is_completed;
            });
            setLessonProgressMap(progressRecord);
          }
        } catch (e) {
          console.error('Failed to load trainee enrollment', e);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Course not found or access forbidden.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) loadCourseAndEnrollment();
  }, [courseId, user?.role]);

  const handleEnroll = async () => {
    try {
      setIsEnrolling(true);
      setErrorMsg(null);
      const newEnrollment = await enrollInCourseApi(courseId);
      setEnrollment(newEnrollment);
      setStatusMsg('🎉 Successfully enrolled in course!');
      loadCourseAndEnrollment();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to enroll in course');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleToggleLesson = async (lessonId: string, currentCompleted: boolean) => {
    if (!enrollment) return;
    try {
      setTogglingLessonId(lessonId);
      if (currentCompleted) {
        const res = await markLessonUncompleteApi(enrollment.id, lessonId);
        setEnrollment(res.enrollment);
        setLessonProgressMap((prev) => ({ ...prev, [lessonId]: false }));
      } else {
        const res = await markLessonCompleteApi(enrollment.id, lessonId);
        setEnrollment(res.enrollment);
        setLessonProgressMap((prev) => ({ ...prev, [lessonId]: true }));
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update lesson progress');
    } finally {
      setTogglingLessonId(null);
    }
  };

  const handlePublish = async () => {
    try {
      await publishCourseApi(courseId);
      setStatusMsg('Course published successfully!');
      loadCourseAndEnrollment();
    } catch (err: any) {
      setStatusMsg(`Publish Failed: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  const handleArchive = async () => {
    try {
      await archiveCourseApi(courseId);
      setStatusMsg('Course archived.');
      loadCourseAndEnrollment();
    } catch (err: any) {
      setStatusMsg(`Archive Failed: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[var(--onyx)] text-[var(--white-smoke)] p-4 md:p-8 max-w-5xl mx-auto space-y-8">
        {/* Navigation Top */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/courses')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Course Catalog
          </button>
          {isTrainee && (
            <button
              onClick={() => router.push('/my-learning')}
              className="text-xs text-[var(--strawberry-red)] hover:underline flex items-center gap-1 font-bold"
            >
              <GraduationCap className="w-4 h-4" />
              Go to My Learning
            </button>
          )}
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

                {/* Trainee Enrollment / Progress Hero Widget */}
                {isTrainee && (
                  <div className="flex items-center gap-3">
                    {!enrollment ? (
                      <button
                        onClick={handleEnroll}
                        disabled={isEnrolling || course.status !== 'PUBLISHED'}
                        className="px-6 py-2.5 bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isEnrolling ? 'Enrolling...' : 'Enroll Now'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 bg-[#0b090a] px-4 py-2 rounded-xl border border-neutral-800">
                        <span className="text-xs font-bold text-emerald-400">
                          {enrollment.status === 'COMPLETED' ? '✓ Course Completed' : `Status: ${enrollment.status}`}
                        </span>
                        <div className="w-24 bg-neutral-800 h-2 rounded-full overflow-hidden border border-neutral-700">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-[#e5383b] h-full transition-all duration-300"
                            style={{ width: `${enrollment.progress_percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-mono font-bold text-white">
                          {enrollment.progress_percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Modules & Lessons Structure Accordion */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[var(--strawberry-red)]" />
                Course Curriculum & Lessons
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
                            {module.lessons.map((lesson, lIdx) => {
                              const isCompleted = !!lessonProgressMap[lesson.id];
                              const isToggling = togglingLessonId === lesson.id;

                              return (
                                <div
                                  key={lesson.id}
                                  className={`p-4 rounded-lg border transition-all ${
                                    isCompleted
                                      ? 'bg-[#161a1d] border-emerald-800/60'
                                      : 'bg-[var(--carbon-black)] border-neutral-800'
                                  }`}
                                >
                                  <div className="flex justify-between items-center font-bold text-xs text-white">
                                    <div className="flex items-center gap-3">
                                      {/* Interactive Lesson Checkbox for Enrolled Trainees */}
                                      {isTrainee && enrollment && enrollment.status !== 'DROPPED' ? (
                                        <button
                                          onClick={() => handleToggleLesson(lesson.id, isCompleted)}
                                          disabled={isToggling}
                                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                                            isCompleted
                                              ? 'bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300'
                                              : 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300'
                                          }`}
                                          title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                                        >
                                          {isToggling ? (
                                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                          ) : isCompleted ? (
                                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                                          ) : (
                                            <Square className="w-4 h-4 text-neutral-400" />
                                          )}
                                          <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
                                        </button>
                                      ) : (
                                        <FileText className="w-4 h-4 text-[var(--strawberry-red)] shrink-0" />
                                      )}
                                      <span className={isCompleted ? 'line-through text-neutral-400' : ''}>
                                        Lesson {lIdx + 1}: {lesson.title}
                                      </span>
                                    </div>

                                    <span className="text-[11px] text-amber-400 flex items-center gap-1 font-mono">
                                      <Clock className="w-3.5 h-3.5" />
                                      {lesson.duration_minutes}m
                                    </span>
                                  </div>

                                  {/* Lesson Text Body */}
                                  {lesson.content_body && (
                                    <div className="mt-2 text-xs text-[var(--silver)] leading-relaxed bg-[var(--onyx)] p-3 rounded border border-neutral-800/50 whitespace-pre-line font-sans">
                                      {lesson.content_body}
                                    </div>
                                  )}

                                  {/* Optional Video URL Metadata */}
                                  {lesson.video_url && (
                                    <div className="pt-2">
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
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Course Assessments Section */}
            <section className="space-y-4 pt-6 border-t border-neutral-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[var(--strawberry-red)]" />
                Course Assessments
              </h2>

              {assessments.length === 0 ? (
                <div className="p-6 bg-[var(--carbon-black)] rounded-xl border border-neutral-800 text-center text-xs text-neutral-500 font-mono">
                  No published assessments currently available for this course.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assessments.map((ass) => (
                    <div
                      key={ass.id}
                      className="bg-[var(--carbon-black)] border border-neutral-800 p-4 rounded-xl space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-white text-sm">{ass.title}</h3>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            Passing: {ass.passing_score_percentage}%
                          </span>
                        </div>
                        {ass.description && (
                          <p className="text-xs text-[var(--silver)] mt-1">{ass.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-neutral-400">
                          <span>Max Attempts: {ass.max_attempts}</span>
                          <span>Time Limit: {ass.time_limit_minutes ? `${ass.time_limit_minutes}m` : 'Untimed'}</span>
                        </div>
                      </div>

                      {isTrainee && enrollment && enrollment.status !== 'DROPPED' && (
                        <button
                          onClick={() => router.push(`/assessments/${ass.id}/take`)}
                          className="w-full py-2 bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckSquare className="w-4 h-4" />
                          <span>Take Assessment</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
