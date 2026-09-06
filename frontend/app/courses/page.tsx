'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { Course, fetchCoursesApi, publishCourseApi, archiveCourseApi } from '../../lib/courses';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  BookOpen,
  Plus,
  Search,
  Clock,
  Layers,
  CheckCircle,
  Archive,
  ArrowRight,
  Filter,
} from 'lucide-react';

export default function CourseCatalogPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const isManagementAllowed = user?.role === 'ADMIN' || user?.role === 'TRAINER';

  const loadCourses = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchCoursesApi({
        search: searchTerm || undefined,
        difficultyLevel: (selectedDifficulty as any) || undefined,
      });
      setCourses(res.courses);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to load course catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [selectedDifficulty]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCourses();
  };

  const handlePublish = async (courseId: string) => {
    try {
      await publishCourseApi(courseId);
      setStatusMsg('Course published successfully!');
      loadCourses();
    } catch (err: any) {
      setStatusMsg(`Publish Failed: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  const handleArchive = async (courseId: string) => {
    try {
      await archiveCourseApi(courseId);
      setStatusMsg('Course archived.');
      loadCourses();
    } catch (err: any) {
      setStatusMsg(`Archive Failed: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[var(--onyx)] text-[var(--white-smoke)] p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-neutral-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="brand" size="md">STAGE 2 • COURSE MANAGEMENT</Badge>
              <Badge variant="neutral" size="md">ORG: {user?.organizationId}</Badge>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-[var(--strawberry-red)]" />
              Course Catalog
            </h1>
            <p className="text-sm text-[var(--silver)] mt-1 font-medium">
              Explore structured organizational capacity building courses and modules
            </p>
          </div>

          {isManagementAllowed && (
            <Link
              href="/courses/create"
              className="px-5 py-2.5 bg-[var(--mahogany-red)] hover:bg-[var(--strawberry-red)] text-white text-xs font-semibold rounded-lg shadow-lg transition-colors flex items-center gap-2 self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              Build New Course
            </Link>
          )}
        </header>

        {/* Status Alert */}
        {statusMsg && (
          <div className="p-3 bg-red-950/40 border border-red-800 text-[var(--strawberry-red)] text-xs rounded-lg flex justify-between items-center">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg(null)} className="font-bold text-white hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <section className="bg-[var(--carbon-black)] p-4 rounded-xl border border-neutral-800">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
              <input
                type="text"
                placeholder="Search courses by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-neutral-400" />
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-3 py-2 text-xs text-white outline-none"
              >
                <option value="">All Difficulty Levels</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-xs font-semibold text-white transition-colors"
              >
                Filter
              </button>
            </div>
          </form>
        </section>

        {/* Course Grid */}
        <section className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
              <div className="w-8 h-8 border-4 border-[var(--strawberry-red)] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p>Loading course catalog...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-6 bg-red-950/40 border border-red-800 rounded-lg text-xs text-[var(--strawberry-red)]">
              {errorMsg}
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 bg-[var(--carbon-black)] rounded-xl border border-neutral-800 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-neutral-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Courses Available</h3>
              <p className="text-xs text-[var(--silver)] max-w-sm mx-auto">
                {isManagementAllowed
                  ? 'No course records found in your organization. Click "Build New Course" to create the first course.'
                  : 'No published courses are currently available in your organization.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-[var(--carbon-black)] border border-neutral-800 hover:border-neutral-700 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded font-semibold uppercase">
                        {course.category}
                      </span>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            course.difficulty_level === 'BEGINNER'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : course.difficulty_level === 'INTERMEDIATE'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                        >
                          {course.difficulty_level}
                        </span>

                        {isManagementAllowed && (
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              course.status === 'PUBLISHED'
                                ? 'bg-emerald-950 text-emerald-300'
                                : course.status === 'DRAFT'
                                ? 'bg-amber-950 text-amber-300'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {course.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Course Title & Description */}
                    <div>
                      <h3 className="text-base font-bold text-white line-clamp-1">{course.title}</h3>
                      <p className="text-xs text-[var(--silver)] line-clamp-2 mt-1 font-normal">
                        {course.description}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Stats */}
                  <div className="space-y-3 pt-3 border-t border-neutral-800/80">
                    <div className="flex justify-between items-center text-xs text-neutral-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[var(--strawberry-red)]" />
                        {course.modules_count || 0} Modules ({course.lessons_count || 0} Lessons)
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {course.total_duration_minutes || 0}m
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Link
                        href={`/courses/${course.id}`}
                        className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg text-center transition-colors flex items-center justify-center gap-1"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>

                      {isManagementAllowed && course.status === 'DRAFT' && (
                        <button
                          onClick={() => handlePublish(course.id)}
                          title="Publish Course"
                          className="p-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Publish</span>
                        </button>
                      )}

                      {isManagementAllowed && course.status === 'PUBLISHED' && (
                        <button
                          onClick={() => handleArchive(course.id)}
                          title="Archive Course"
                          className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </ProtectedRoute>
  );
}
