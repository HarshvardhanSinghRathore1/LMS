'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import {
  Course,
  CourseLesson,
  fetchCourseByIdApi,
  publishCourseApi,
  archiveCourseApi,
  getLessonResourceDownloadUrl,
} from '../../../lib/courses';
import {
  CourseEnrollment,
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
  CheckSquare,
  Square,
  Sparkles,
  Play,
  Download,
  Settings2,
  FileUp,
} from 'lucide-react';
import { Assessment, fetchAssessmentsApi } from '../../../lib/assessments';
import { AITutorDrawer } from '../../../components/ai/AITutorDrawer';
import { YouTubePlayer } from '../../../components/courses/YouTubePlayer';
import { VideoPlayer } from '../../../components/courses/VideoPlayer';
import { VideoSourceSelector } from '../../../components/courses/VideoSourceSelector';
import { CourseResourceUploader } from '../../../components/courses/CourseResourceUploader';
import { VideoProcessingStatus } from '../../../components/courses/VideoProcessingStatus';
import { LessonNotes } from '../../../components/courses/LessonNotes';
import { Citation } from '../../../lib/ai';

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
  const [selectedLesson, setSelectedLesson] = useState<CourseLesson | null>(null);
  const [videoTimestamp, setVideoTimestamp] = useState<number | undefined>(undefined);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [showTutor, setShowTutor] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

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
        if (!selectedLesson && fetched.modules[0].lessons && fetched.modules[0].lessons.length > 0) {
          setSelectedLesson(fetched.modules[0].lessons[0]);
        }
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

  const handleCitationClick = (citation: Citation) => {
    // 1. Locate and select lesson if citation contains lessonId
    if (citation.lessonId && course?.modules) {
      for (const mod of course.modules) {
        const found = mod.lessons?.find((l) => l.id === citation.lessonId);
        if (found) {
          setSelectedLesson(found);
          setExpandedModuleId(mod.id);
          break;
        }
      }
    }

    // 2. If timestamp is present, jump video
    if (citation.startTime !== undefined) {
      setVideoTimestamp(citation.startTime);
    }

    // 3. If resourceId is present, open PDF in new tab
    if (citation.resourceId && citation.lessonId) {
      const downloadUrl = getLessonResourceDownloadUrl(courseId, citation.lessonId, citation.resourceId);
      window.open(downloadUrl, '_blank');
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[var(--onyx)] text-[var(--white-smoke)] p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        {/* Navigation Top */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/courses')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 font-mono transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course Catalog
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTutor(true)}
              className="px-4 py-2 bg-gradient-to-r from-red-800 to-rose-600 hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI Tutor</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {isLoading ? (
          <div className="p-16 text-center text-xs text-neutral-400 space-y-3">
            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p>Loading course details & multimedia...</p>
          </div>
        ) : errorMsg || !course ? (
          <div className="p-8 bg-[var(--carbon-black)] border border-red-900/50 rounded-xl text-center space-y-3">
            <div className="text-red-400 font-bold text-lg">404 / Access Denied</div>
            <p className="text-xs text-neutral-400">{errorMsg || 'Course unavailable in your organization.'}</p>
            <button
              onClick={() => router.push('/courses')}
              className="px-4 py-2 bg-neutral-800 text-white text-xs font-semibold rounded-lg"
            >
              Return to Catalog
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Course Header Banner */}
            <section className="bg-slate-900/90 p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg font-semibold uppercase">
                    {course.category}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold ${
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
                    className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      course.status === 'PUBLISHED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : course.status === 'DRAFT'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    STATUS: {course.status}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-red-500 shrink-0" />
                  {course.title}
                </h1>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Stats Bar & Management Actions */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-red-500" />
                    {course.modules_count || 0} Modules ({course.lessons_count || 0} Lessons)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    {course.total_duration_minutes || 0} Minutes Total
                  </span>
                </div>

                {isManagementAllowed && (
                  <div className="flex items-center gap-2 flex-wrap">
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
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Archive className="w-4 h-4" />
                        <span>Archive Course</span>
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/ai-tools`)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-950 to-violet-900 hover:brightness-110 border border-purple-700/60 text-purple-300 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Generate AI Content</span>
                    </button>
                  </div>
                )}

                {/* Trainee Enrollment Progress */}
                {isTrainee && (
                  <div className="flex items-center gap-3">
                    {!enrollment ? (
                      <button
                        onClick={handleEnroll}
                        disabled={isEnrolling || course.status !== 'PUBLISHED'}
                        className="px-6 py-2.5 bg-gradient-to-r from-red-800 via-rose-700 to-red-600 hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isEnrolling ? 'Enrolling...' : 'Enroll Now'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                        <span className="text-xs font-bold text-emerald-400">
                          {enrollment.status === 'COMPLETED' ? '✓ Course Completed' : `Status: ${enrollment.status}`}
                        </span>
                        <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-red-500 h-full transition-all duration-300"
                            style={{ width: `${enrollment.progress_percentage}%` }}
                          />
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

            {/* AI Tutor Course Knowledge Monitoring (Trainers & Admins) */}
            {isManagementAllowed && (
              <VideoProcessingStatus courseId={courseId} />
            )}

            {/* FEATURED MULTIMEDIA LEARNING STAGE (Active Selected Lesson) */}
            {selectedLesson && (
              <section className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                      Active Multimedia Lesson
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">
                      {selectedLesson.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Mark Complete for Trainee */}
                    {isTrainee && enrollment && enrollment.status !== 'DROPPED' && (
                      <button
                        onClick={() => handleToggleLesson(selectedLesson.id, !!lessonProgressMap[selectedLesson.id])}
                        disabled={togglingLessonId === selectedLesson.id}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                          lessonProgressMap[selectedLesson.id]
                            ? 'bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300'
                            : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
                        }`}
                      >
                        {togglingLessonId === selectedLesson.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : lessonProgressMap[selectedLesson.id] ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                        <span>{lessonProgressMap[selectedLesson.id] ? 'Lesson Completed' : 'Mark as Complete'}</span>
                      </button>
                    )}

                    {/* Trainer Editor Toggle */}
                    {isManagementAllowed && (
                      <button
                        onClick={() => setEditingLessonId(editingLessonId === selectedLesson.id ? null : selectedLesson.id)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{editingLessonId === selectedLesson.id ? 'Close Editor' : 'Manage Media & PDFs'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 1. Dedicated Video Player */}
                {selectedLesson.video_source_type === 'YOUTUBE_VIDEO' ||
                selectedLesson.video_source_type === 'YOUTUBE_PLAYLIST' ||
                (selectedLesson.video_url && selectedLesson.video_url.includes('youtube')) ? (
                  <YouTubePlayer
                    embedUrl={selectedLesson.video_url || ''}
                    title={selectedLesson.title}
                    isPlaylist={selectedLesson.video_source_type === 'YOUTUBE_PLAYLIST'}
                  />
                ) : selectedLesson.video_source_type === 'UPLOADED' && selectedLesson.video_url ? (
                  <VideoPlayer
                    courseId={courseId}
                    lessonId={selectedLesson.id}
                    title={selectedLesson.title}
                    initialTimestamp={videoTimestamp}
                  />
                ) : null}

                {/* 2. Trainer Media & PDF Editor Sub-panel */}
                {isManagementAllowed && editingLessonId === selectedLesson.id && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
                    <VideoSourceSelector
                      courseId={courseId}
                      lessonId={selectedLesson.id}
                      currentLesson={selectedLesson}
                      onUpdated={(updated) => {
                        setSelectedLesson(updated);
                        loadCourseAndEnrollment();
                      }}
                    />
                    <CourseResourceUploader
                      courseId={courseId}
                      lessonId={selectedLesson.id}
                      resources={selectedLesson.resources || []}
                      isTrainer={true}
                      onUpdated={loadCourseAndEnrollment}
                    />
                  </div>
                )}

                {/* 3. Lesson Notes Component (Directly Underneath Video) */}
                <LessonNotes
                  courseId={courseId}
                  lessonId={selectedLesson.id}
                  notes={selectedLesson.notes || selectedLesson.content_body}
                  notesStatus={(selectedLesson as any).notes_status || 'NOT_GENERATED'}
                  notesMetadata={(selectedLesson as any).notes_metadata || {}}
                  isTrainerOrAdmin={isManagementAllowed}
                  onNotesUpdated={(updatedNotes, status, metadata) => {
                    setSelectedLesson({
                      ...selectedLesson,
                      notes: updatedNotes,
                      notes_status: status as any,
                      notes_metadata: metadata,
                    } as any);
                    loadCourseAndEnrollment();
                  }}
                />

                {/* 4. Lesson PDF Resources Display (Underneath Notes) */}
                {selectedLesson.resources && selectedLesson.resources.length > 0 && editingLessonId !== selectedLesson.id && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <span>📄</span> Attached Course Resources ({selectedLesson.resources.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedLesson.resources.map((res) => {
                        const downloadUrl = getLessonResourceDownloadUrl(courseId, selectedLesson.id, res.id);
                        return (
                          <a
                            key={res.id}
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 p-3.5 rounded-xl flex items-center justify-between gap-3 transition-all group shadow-md"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-400 transition-colors">
                                  {res.title}
                                </p>
                                <span className="text-[10px] text-slate-500">
                                  PDF Document • Click to View / Download
                                </span>
                              </div>
                            </div>
                            <Download className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Lesson Bottom Navigation Controls (Previous / Complete / Next) */}
                {(() => {
                  const allLessons: CourseLesson[] = course.modules?.flatMap((m) => m.lessons || []) || [];
                  const currentIndex = allLessons.findIndex((l) => l.id === selectedLesson.id);
                  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
                  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

                  return (
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => prevLesson && setSelectedLesson(prevLesson)}
                        disabled={!prevLesson}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <span>← Previous Lesson</span>
                      </button>

                      {isTrainee && enrollment && enrollment.status !== 'DROPPED' && (
                        <button
                          type="button"
                          onClick={() => handleToggleLesson(selectedLesson.id, !!lessonProgressMap[selectedLesson.id])}
                          disabled={togglingLessonId === selectedLesson.id}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                            lessonProgressMap[selectedLesson.id]
                              ? 'bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300'
                              : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50'
                          }`}
                        >
                          {togglingLessonId === selectedLesson.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : lessonProgressMap[selectedLesson.id] ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-white" />
                          )}
                          <span>{lessonProgressMap[selectedLesson.id] ? '✓ Lesson Completed' : 'Mark Lesson Complete'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => nextLesson && setSelectedLesson(nextLesson)}
                        disabled={!nextLesson}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <span>Next Lesson →</span>
                      </button>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* Modules & Lessons Structure Accordion */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-500" />
                Course Curriculum & Lessons
              </h2>

              {!course.modules || course.modules.length === 0 ? (
                <div className="p-8 bg-slate-900 rounded-2xl border border-slate-800 text-center text-xs text-slate-500 font-mono">
                  No modules published in this course curriculum.
                </div>
              ) : (
                <div className="space-y-3">
                  {course.modules.map((module, mIdx) => {
                    const isExpanded = expandedModuleId === module.id;
                    return (
                      <div
                        key={module.id}
                        className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all"
                      >
                        {/* Module Header Toggle */}
                        <button
                          onClick={() => setExpandedModuleId(isExpanded ? null : module.id)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-850 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span className="w-5 h-5 bg-slate-800 text-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                                {mIdx + 1}
                              </span>
                              <span>{module.title}</span>
                            </div>
                            {module.description && (
                              <p className="text-xs text-slate-400 pl-7 line-clamp-1">
                                {module.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-400 font-mono">
                              {module.lessons?.length || 0} Lessons
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {/* Module Lessons Content */}
                        {isExpanded && module.lessons && (
                          <div className="p-4 pt-0 border-t border-slate-800 space-y-2 bg-slate-950/50">
                            {module.lessons.map((lesson, lIdx) => {
                              const isCompleted = !!lessonProgressMap[lesson.id];
                              const isSelected = selectedLesson?.id === lesson.id;
                              const hasVideo = !!lesson.video_url;
                              const hasPdfs = lesson.resources && lesson.resources.length > 0;

                              return (
                                <div
                                  key={lesson.id}
                                  onClick={() => setSelectedLesson(lesson)}
                                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                    isSelected
                                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                                      : isCompleted
                                      ? 'bg-slate-900/60 border-emerald-900/40 hover:border-slate-700'
                                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white shadow'
                                        : hasVideo
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}>
                                      {hasVideo ? <Play className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                    </div>

                                    <div className="min-w-0">
                                      <p className={`text-xs font-semibold truncate ${
                                        isSelected ? 'text-white' : isCompleted ? 'text-slate-400' : 'text-slate-200'
                                      }`}>
                                        Lesson {lIdx + 1}: {lesson.title}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                                        <span>{lesson.duration_minutes || 5} min</span>
                                        {hasVideo && <span>• 📹 Video</span>}
                                        {hasPdfs && <span>• 📄 {lesson.resources?.length} PDF(s)</span>}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {isCompleted && (
                                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        Completed
                                      </span>
                                    )}
                                    {isSelected && (
                                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                        Active
                                      </span>
                                    )}
                                  </div>
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
            <section className="space-y-4 pt-6 border-t border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-red-500" />
                Course Assessments
              </h2>

              {assessments.length === 0 ? (
                <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-center text-xs text-slate-500 font-mono">
                  No published assessments currently available for this course.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assessments.map((ass) => (
                    <div
                      key={ass.id}
                      className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-white text-sm">{ass.title}</h3>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                            Passing: {ass.passing_score_percentage}%
                          </span>
                        </div>
                        {ass.description && (
                          <p className="text-xs text-slate-400 mt-1">{ass.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-slate-500">
                          <span>Max Attempts: {ass.max_attempts}</span>
                          <span>Time Limit: {ass.time_limit_minutes ? `${ass.time_limit_minutes}m` : 'Untimed'}</span>
                        </div>
                      </div>

                      {isTrainee && enrollment && enrollment.status !== 'DROPPED' && (
                        <button
                          onClick={() => router.push(`/assessments/${ass.id}/take`)}
                          className="w-full py-2 bg-gradient-to-r from-red-800 via-rose-700 to-red-600 hover:brightness-110 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
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

        {/* AI Tutor Drawer with Grounded Multimedia Citation Click-through */}
        {course && (
          <AITutorDrawer
            isOpen={showTutor}
            onClose={() => setShowTutor(false)}
            courseId={courseId}
            courseTitle={course.title}
            onCitationClick={handleCitationClick}
          />
        )}
      </main>
    </ProtectedRoute>
  );
}
