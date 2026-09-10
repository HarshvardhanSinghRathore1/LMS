'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import {
  Course,
  createCourseApi,
  addModuleApi,
  addLessonApi,
  publishCourseApi,
  fetchCourseByIdApi,
  updateCourseApi,
  importYouTubePlaylistApi,
} from '../../../lib/courses';
import { CourseResourceUploader } from '../../../components/courses/CourseResourceUploader';
import {
  BookOpen,
  Plus,
  ArrowLeft,
  CheckCircle,
  Layers,
  FileText,
  Video,
  Clock,
  Youtube,
  Sparkles,
  ExternalLink,
  Edit2,
  Check,
  AlertTriangle,
  Play,
  UploadCloud,
  FileUp,
} from 'lucide-react';

export default function CreateCoursePage() {
  const router = useRouter();

  // Mode: 'CHOOSE' | 'MANUAL' | 'PLAYLIST_IMPORT' | 'REVIEW'
  const [creationMode, setCreationMode] = useState<'CHOOSE' | 'MANUAL' | 'PLAYLIST_IMPORT' | 'REVIEW'>('CHOOSE');

  // Course Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [difficultyLevel, setDifficultyLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');

  // Playlist Import Form State
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [duplicateCourseId, setDuplicateCourseId] = useState<string | null>(null);

  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [isSubmittingCourse, setIsSubmittingCourse] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manual Module Form State
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [isAddingModule, setIsAddingModule] = useState(false);

  // Manual Lesson Form State
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContentBody, setLessonContentBody] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonDurationMinutes, setLessonDurationMinutes] = useState(15);
  const [isAddingLesson, setIsAddingLesson] = useState(false);

  // Active Lesson for PDF Upload Modal in Review Screen
  const [activePdfLessonId, setActivePdfLessonId] = useState<string | null>(null);

  // Reload Active Course Hierarchy
  const refreshCourseHierarchy = async (courseId: string) => {
    try {
      const updated = await fetchCourseByIdApi(courseId);
      setActiveCourse(updated);
      setTitle(updated.title);
      setDescription(updated.description);
    } catch (err: any) {
      console.error('Failed to reload course hierarchy:', err);
    }
  };

  // --- PLAYLIST IMPORT HANDLER ---
  const handleImportPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setDuplicateCourseId(null);

    if (!playlistUrl.trim()) {
      setErrorMsg('Please enter a valid YouTube Playlist URL.');
      return;
    }

    setIsImporting(true);
    setImportProgress('Validating YouTube playlist URL...');

    try {
      setImportProgress('Querying YouTube metadata & videos...');
      const responseData = await importYouTubePlaylistApi({
        playlistUrl: playlistUrl.trim(),
        category,
        difficultyLevel,
      });

      if (responseData.duplicate && responseData.courseId) {
        setDuplicateCourseId(responseData.courseId);
        setErrorMsg('This playlist has already been imported into your organization.');
        setIsImporting(false);
        return;
      }

      const created = responseData.course;
      setActiveCourse(created);
      setTitle(created.title);
      setDescription(created.description);
      setSuccessMsg('🎉 YouTube playlist imported successfully! Review your course below before publishing.');
      setCreationMode('REVIEW');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to import playlist.';
      setErrorMsg(msg);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  // --- MANUAL STEP 1: CREATE COURSE DRAFT ---
  const handleCreateCourseManual = async (e: React.FormEvent) => {
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
      setCreationMode('MANUAL');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to create course draft.');
    } finally {
      setIsSubmittingCourse(false);
    }
  };

  // --- MANUAL STEP 2: ADD MODULE ---
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !moduleTitle) return;

    setErrorMsg(null);
    setIsAddingModule(true);
    try {
      const orderIndex = activeCourse.modules?.length || 0;
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

  // --- MANUAL STEP 3: ADD LESSON ---
  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId || !lessonTitle || !activeCourse) return;

    setErrorMsg(null);
    setIsAddingLesson(true);
    try {
      const targetModule = activeCourse.modules?.find((m) => m.id === selectedModuleId);
      const orderIndex = targetModule?.lessons?.length || 0;

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

  // --- PUBLISH COURSE ---
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

  // --- UPDATE COURSE METADATA (REVIEW MODE) ---
  const handleSaveCourseMetadata = async () => {
    if (!activeCourse) return;
    setErrorMsg(null);
    try {
      const updated = await updateCourseApi(activeCourse.id, {
        title,
        description,
        category,
        difficultyLevel,
      });
      setActiveCourse(updated);
      setSuccessMsg('Course details updated successfully.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update course details.');
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
              Create structured multimedia courses manually or import instantly from YouTube playlists.
            </p>
          </div>

          {activeCourse && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/courses/${activeCourse.id}`)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-semibold text-xs rounded-lg transition-colors"
              >
                View Course
              </button>
              <button
                type="button"
                onClick={handlePublishCourse}
                className="px-5 py-2.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Publish Course
              </button>
            </div>
          )}
        </header>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-4 bg-red-950/40 border border-red-800 text-[var(--strawberry-red)] rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[var(--strawberry-red)]" />
                {errorMsg}
              </span>
              <button onClick={() => setErrorMsg(null)} className="font-bold hover:underline">
                Dismiss
              </button>
            </div>
            {duplicateCourseId && (
              <button
                type="button"
                onClick={() => router.push(`/courses/${duplicateCourseId}`)}
                className="mt-2 px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Existing Course
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
            <span>✅ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* --- STEP 0: CHOOSE CREATION METHOD --- */}
        {creationMode === 'CHOOSE' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-white">How would you like to create your course?</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1: Manual Course Creation */}
              <div
                onClick={() => setCreationMode('MANUAL')}
                className="group p-6 bg-[var(--carbon-black)] border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60 rounded-2xl cursor-pointer transition-all duration-200 space-y-4 relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 group-hover:text-white transition-colors">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-[var(--strawberry-red)] transition-colors">
                    📚 Create Manually
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Build modules, write custom lesson content, and manually link video resources step-by-step.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="text-xs font-semibold text-neutral-300 group-hover:underline flex items-center gap-1">
                    Start manual builder →
                  </span>
                </div>
              </div>

              {/* Option 2: Import YouTube Playlist */}
              <div
                onClick={() => setCreationMode('PLAYLIST_IMPORT')}
                className="group p-6 bg-gradient-to-br from-red-950/30 to-neutral-900 border border-red-900/40 hover:border-red-600/60 rounded-2xl cursor-pointer transition-all duration-200 space-y-4 relative overflow-hidden shadow-lg shadow-red-950/20"
              >
                <div className="w-12 h-12 rounded-xl bg-red-900/40 border border-red-700/50 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                  <Youtube className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors flex items-center gap-2">
                    ▶ Import YouTube Playlist
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-900/60 text-red-300 border border-red-700/60">
                      Recommended
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Paste any YouTube playlist URL. Capacity Connect automatically creates the course, default module, and every lesson in exact sequence.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="text-xs font-semibold text-red-400 group-hover:underline flex items-center gap-1">
                    Import playlist now →
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- OPTION A: PLAYLIST IMPORT FORM --- */}
        {creationMode === 'PLAYLIST_IMPORT' && !activeCourse && (
          <section className="bg-[var(--carbon-black)] p-6 md:p-8 rounded-2xl border border-neutral-800 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-500">
                  <Youtube className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Import YouTube Playlist</h2>
                  <p className="text-xs text-neutral-400">
                    Enter the URL of a public YouTube playlist to generate a structured course
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreationMode('CHOOSE')}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Back to Options
              </button>
            </div>

            <form onSubmit={handleImportPlaylist} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--silver)]">
                  YouTube Playlist URL
                </label>
                <input
                  type="url"
                  required
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=PLlaN88a7y2_plecYoJxeQNnWHzzpQVJcU"
                  className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none transition-colors font-mono"
                />
                <p className="text-[11px] text-neutral-500">
                  Accepts playlist URLs with <code className="text-neutral-300">list=...</code> parameters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--silver)]">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Web Development"
                    className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--silver)]">
                    Difficulty Level
                  </label>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value as any)}
                    className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isImporting || !playlistUrl.trim()}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs md:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-950/40"
                >
                  {isImporting ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                      <span>{importProgress || 'Importing Playlist...'}</span>
                    </>
                  ) : (
                    <>
                      <Youtube className="w-4 h-4" />
                      <span>Import Playlist & Generate Course</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* --- OPTION B: MANUAL BUILDER FORM --- */}
        {creationMode === 'MANUAL' && !activeCourse && (
          <section className="bg-[var(--carbon-black)] p-6 rounded-xl border border-neutral-800 space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 bg-[var(--dark-garnet)] text-[var(--strawberry-red)] rounded-full text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Manual Course Information
              </h2>
              <button
                type="button"
                onClick={() => setCreationMode('CHOOSE')}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Back to Options
              </button>
            </div>

            <form onSubmit={handleCreateCourseManual} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--silver)]">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Advanced AI System Architecture"
                  className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--silver)]">
                  Course Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Comprehensive description of learning objectives..."
                  className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
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
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Software Engineering"
                    className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-sm text-white outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--silver)]">
                    Difficulty Level
                  </label>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value as any)}
                    className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-sm text-white outline-none transition-colors"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingCourse}
                className="py-2.5 px-6 bg-[var(--mahogany-red)] hover:bg-[var(--strawberry-red)] text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2"
              >
                {isSubmittingCourse ? 'Creating Draft...' : 'Save & Continue to Modules'}
              </button>
            </form>
          </section>
        )}

        {/* --- STEP 3: TRAINER REVIEW & EDIT SCREEN (Active after manual or playlist import) --- */}
        {activeCourse && (
          <div className="space-y-8">
            {/* Review Course Metadata */}
            <section className="bg-[var(--carbon-black)] p-6 rounded-2xl border border-neutral-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[var(--strawberry-red)]" />
                  Course Overview & Metadata
                </h3>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Status: {activeCourse.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-400">Course Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-400">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-neutral-400">Course Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveCourseMetadata}
                  className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-neutral-700"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Save Course Details
                </button>
              </div>
            </section>

            {/* Imported Modules & Lessons List */}
            <section className="bg-[var(--carbon-black)] p-6 rounded-2xl border border-neutral-800 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[var(--strawberry-red)]" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Course Curriculum & Lessons</h3>
                    <p className="text-[11px] text-neutral-400">
                      Review all imported lessons in sequence. Attach PDFs and configure notes for each lesson.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {activeCourse.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0} Lessons Total
                </span>
              </div>

              {activeCourse.modules && activeCourse.modules.length > 0 ? (
                <div className="space-y-6">
                  {activeCourse.modules.map((module, mIdx) => (
                    <div key={module.id} className="bg-[var(--onyx)] p-5 rounded-xl border border-neutral-800 space-y-4">
                      <div className="flex justify-between items-center text-xs font-bold text-white">
                        <span className="text-sm">{module.title}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {module.lessons?.length || 0} Lessons in Module
                        </span>
                      </div>

                      {/* Lessons List */}
                      {module.lessons && module.lessons.length > 0 ? (
                        <div className="space-y-3">
                          {module.lessons.map((lesson, lIdx) => (
                            <div
                              key={lesson.id}
                              className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-neutral-700 transition-colors"
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                                  {lIdx + 1}
                                </div>
                                <div className="space-y-1 min-w-0 flex-1">
                                  <h4 className="text-xs font-bold text-white truncate">{lesson.title}</h4>
                                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-400 font-mono">
                                    <span className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800/60 flex items-center gap-1">
                                      <Youtube className="w-3 h-3" />
                                      {lesson.video_source_type || 'YOUTUBE_VIDEO'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-400" />
                                      {lesson.duration_minutes || 5} mins
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Lesson Quick Actions */}
                              <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
                                <button
                                  type="button"
                                  onClick={() => setActivePdfLessonId(activePdfLessonId === lesson.id ? null : lesson.id)}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                                    activePdfLessonId === lesson.id
                                      ? 'bg-red-950 border-red-800 text-red-300'
                                      : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                                  }`}
                                >
                                  <FileUp className="w-3.5 h-3.5" />
                                  <span>{activePdfLessonId === lesson.id ? 'Close Resources' : 'Attach PDF'}</span>
                                </button>
                              </div>

                              {/* Collapsible PDF Uploader per lesson */}
                              {activePdfLessonId === lesson.id && (
                                <div className="w-full pt-3 mt-3 border-t border-neutral-800">
                                  <CourseResourceUploader
                                    courseId={activeCourse.id}
                                    lessonId={lesson.id}
                                    resources={lesson.resources || []}
                                    isTrainer={true}
                                    onUpdated={() => refreshCourseHierarchy(activeCourse.id)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-500 font-mono">No lessons in this module.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 font-mono">No modules created yet.</p>
              )}
            </section>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
