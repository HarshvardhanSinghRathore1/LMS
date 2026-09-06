'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import {
  Course,
  CourseModule,
  createCourseApi,
  addModuleApi,
  addLessonApi,
  publishCourseApi,
  fetchCourseByIdApi,
} from '../../../lib/courses';
import {
  BookOpen,
  Plus,
  ArrowLeft,
  CheckCircle,
  Layers,
  FileText,
  Video,
  Clock,
} from 'lucide-react';

export default function CreateCoursePage() {
  const router = useRouter();

  // Course Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [difficultyLevel, setDifficultyLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');

  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [isSubmittingCourse, setIsSubmittingCourse] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Module Form State
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [isAddingModule, setIsAddingModule] = useState(false);

  // Lesson Form State
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContentBody, setLessonContentBody] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonDurationMinutes, setLessonDurationMinutes] = useState(15);
  const [isAddingLesson, setIsAddingLesson] = useState(false);

  // Reload Active Course Hierarchy
  const refreshCourseHierarchy = async (courseId: string) => {
    try {
      const updated = await fetchCourseByIdApi(courseId);
      setActiveCourse(updated);
    } catch (err: any) {
      console.error('Failed to reload course hierarchy:', err);
    }
  };

  // Step 1: Create Course Draft
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title || !description) {
      setErrorMsg('Please enter course title and description.');
      return;
    }

    setIsSubmittingCourse(true);
    try {
      const course = await createCourseApi({
        title,
        description,
        category,
        difficultyLevel,
      });
      setActiveCourse(course);
      setSuccessMsg('Course draft created successfully! Next, add modules and lessons.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to create course draft.');
    } finally {
      setIsSubmittingCourse(false);
    }
  };

  // Step 2: Add Module
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !moduleTitle) return;

    setErrorMsg(null);
    setIsAddingModule(true);
    try {
      const orderIndex = (activeCourse.modules?.length || 0);
      await addModuleApi(activeCourse.id, {
        title: moduleTitle,
        description: moduleDescription,
        orderIndex,
      });
      setModuleTitle('');
      setModuleDescription('');
      setSuccessMsg('Module added successfully!');
      await refreshCourseHierarchy(activeCourse.id);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to add module.');
    } finally {
      setIsAddingModule(false);
    }
  };

  // Step 3: Add Lesson
  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId || !lessonTitle || !activeCourse) return;

    setErrorMsg(null);
    setIsAddingLesson(true);
    try {
      const targetModule = activeCourse.modules?.find((m) => m.id === selectedModuleId);
      const orderIndex = (targetModule?.lessons?.length || 0);

      await addLessonApi(selectedModuleId, {
        title: lessonTitle,
        contentType: 'TEXT',
        contentBody: lessonContentBody,
        videoUrl: lessonVideoUrl || null,
        durationMinutes: lessonDurationMinutes,
        orderIndex,
      });

      setLessonTitle('');
      setLessonContentBody('');
      setLessonVideoUrl('');
      setLessonDurationMinutes(15);
      setSelectedModuleId(null);
      setSuccessMsg('Lesson added successfully!');
      await refreshCourseHierarchy(activeCourse.id);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to add lesson.');
    } finally {
      setIsAddingLesson(false);
    }
  };

  // Step 4: Publish Course
  const handlePublishCourse = async () => {
    if (!activeCourse) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const published = await publishCourseApi(activeCourse.id);
      setActiveCourse(published);
      setSuccessMsg('🎉 Course published successfully and queued for RAG indexing!');
      setTimeout(() => {
        router.push(`/courses/${published.id}`);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to publish course.');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'TRAINER']}>
      <main className="min-h-screen bg-[var(--onyx)] text-[var(--white-smoke)] p-4 md:p-8 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-neutral-800 pb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/courses')}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 mb-2 font-mono"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Catalog
            </button>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-[var(--strawberry-red)]" />
              Course Builder
            </h1>
            <p className="text-xs text-[var(--silver)] mt-1 font-medium">
              Define course parameters, modules, lessons, and trigger multi-tenant RAG publishing
            </p>
          </div>

          {activeCourse && (
            <button
              onClick={handlePublishCourse}
              className="px-5 py-2.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Publish Course
            </button>
          )}
        </header>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-4 bg-red-950/40 border border-red-800 text-[var(--strawberry-red)] rounded-lg text-xs flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="font-bold hover:underline">Dismiss</button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center justify-between">
            <span>✅ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {/* STEP 1: COURSE INFORMATION FORM */}
        <section className="bg-[var(--carbon-black)] p-6 rounded-xl border border-neutral-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-neutral-800 pb-3">
            <span className="w-6 h-6 bg-[var(--dark-garnet)] text-[var(--strawberry-red)] rounded-full text-xs flex items-center justify-center font-bold">1</span>
            Basic Course Information
          </h2>

          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--silver)]">
                Course Title
              </label>
              <input
                type="text"
                required
                disabled={!!activeCourse}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Advanced AI System Architecture & RAG Pipelines"
                className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] disabled:opacity-60 rounded-lg px-4 py-2 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--silver)]">
                Course Description
              </label>
              <textarea
                rows={3}
                required
                disabled={!!activeCourse}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive description of learning objectives and competency outcomes..."
                className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] disabled:opacity-60 rounded-lg px-4 py-2 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--silver)]">
                  Category
                </label>
                <input
                  type="text"
                  required
                  disabled={!!activeCourse}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Software Engineering"
                  className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] disabled:opacity-60 rounded-lg px-4 py-2 text-sm text-white outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--silver)]">
                  Difficulty Level
                </label>
                <select
                  disabled={!!activeCourse}
                  value={difficultyLevel}
                  onChange={(e) => setDifficultyLevel(e.target.value as any)}
                  className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] disabled:opacity-60 rounded-lg px-4 py-2 text-sm text-white outline-none transition-colors"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>
            </div>

            {!activeCourse && (
              <button
                type="submit"
                disabled={isSubmittingCourse}
                className="py-2.5 px-6 bg-[var(--mahogany-red)] hover:bg-[var(--strawberry-red)] text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2"
              >
                {isSubmittingCourse ? 'Creating Draft...' : 'Save & Continue to Modules'}
              </button>
            )}
          </form>
        </section>

        {/* STEP 2: MODULE & LESSON BUILDER (Visible after course draft created) */}
        {activeCourse && (
          <div className="space-y-6">
            {/* ADD MODULE SECTION */}
            <section className="bg-[var(--carbon-black)] p-6 rounded-xl border border-neutral-800 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-neutral-800 pb-3">
                <span className="w-6 h-6 bg-[var(--dark-garnet)] text-[var(--strawberry-red)] rounded-full text-xs flex items-center justify-center font-bold">2</span>
                Add Course Module
              </h2>

              <form onSubmit={handleAddModule} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Module Title (e.g. Vector Database Fundamentals)"
                    value={moduleTitle}
                    onChange={(e) => setModuleTitle(e.target.value)}
                    className="bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-xs text-white outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Module Summary (Optional)"
                    value={moduleDescription}
                    onChange={(e) => setModuleDescription(e.target.value)}
                    className="bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-xs text-white outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAddingModule}
                  className="py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-[var(--strawberry-red)]" />
                  <span>Add Module</span>
                </button>
              </form>
            </section>

            {/* ADD LESSON SECTION */}
            {activeCourse.modules && activeCourse.modules.length > 0 && (
              <section className="bg-[var(--carbon-black)] p-6 rounded-xl border border-neutral-800 space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-neutral-800 pb-3">
                  <span className="w-6 h-6 bg-[var(--dark-garnet)] text-[var(--strawberry-red)] rounded-full text-xs flex items-center justify-center font-bold">3</span>
                  Add Lesson to Module
                </h2>

                <form onSubmit={handleAddLesson} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      required
                      value={selectedModuleId || ''}
                      onChange={(e) => setSelectedModuleId(e.target.value)}
                      className="bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-xs text-white outline-none"
                    >
                      <option value="">Select Target Module...</option>
                      {activeCourse.modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          Module: {m.title}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      required
                      placeholder="Lesson Title (e.g. HNSW Vector Indexing Explained)"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      className="bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="url"
                      placeholder="Video Resource URL (Optional, e.g. https://example.com/video.mp4)"
                      value={lessonVideoUrl}
                      onChange={(e) => setLessonVideoUrl(e.target.value)}
                      className="bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-xs text-white outline-none font-mono"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">Duration (mins):</span>
                      <input
                        type="number"
                        min="1"
                        value={lessonDurationMinutes}
                        onChange={(e) => setLessonDurationMinutes(parseInt(e.target.value, 10))}
                        className="bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-3 py-2 text-xs text-white outline-none w-24"
                      />
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    required
                    placeholder="Lesson Content Body (Markdown/Rich Text)..."
                    value={lessonContentBody}
                    onChange={(e) => setLessonContentBody(e.target.value)}
                    className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-xs text-white placeholder-neutral-500 outline-none"
                  />

                  <button
                    type="submit"
                    disabled={isAddingLesson || !selectedModuleId}
                    className="py-2 px-4 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-[var(--strawberry-red)]" />
                    <span>Add Lesson to Module</span>
                  </button>
                </form>
              </section>
            )}

            {/* LIVE COURSE STRUCTURE PREVIEW */}
            <section className="bg-[var(--carbon-black)] p-6 rounded-xl border border-neutral-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-2">
                <Layers className="w-4 h-4 text-[var(--strawberry-red)]" />
                Live Course Structure Preview
              </h3>

              {!activeCourse.modules || activeCourse.modules.length === 0 ? (
                <p className="text-xs text-neutral-500 font-mono">No modules added yet. Add a module above.</p>
              ) : (
                <div className="space-y-4">
                  {activeCourse.modules.map((module, mIdx) => (
                    <div key={module.id} className="bg-[var(--onyx)] p-4 rounded-lg border border-neutral-800 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-white">
                        <span>Module {mIdx + 1}: {module.title}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {module.lessons?.length || 0} Lessons
                        </span>
                      </div>
                      {module.description && <p className="text-xs text-[var(--silver)]">{module.description}</p>}

                      {/* Lessons List */}
                      {module.lessons && module.lessons.length > 0 && (
                        <div className="pl-4 border-l-2 border-neutral-800 space-y-2 pt-2">
                          {module.lessons.map((lesson, lIdx) => (
                            <div key={lesson.id} className="bg-[var(--carbon-black)] p-3 rounded text-xs space-y-1">
                              <div className="flex justify-between items-center font-semibold text-neutral-200">
                                <span className="flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                                  Lesson {lIdx + 1}: {lesson.title}
                                </span>
                                <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3" />
                                  {lesson.duration_minutes}m
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-400 line-clamp-1">{lesson.content_body}</p>
                              {lesson.video_url && (
                                <div className="text-[10px] text-blue-400 flex items-center gap-1 font-mono">
                                  <Video className="w-3 h-3" />
                                  <span>{lesson.video_url}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
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
