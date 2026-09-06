import { apiClient, ApiSuccessResponse } from './api';

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  content_type: string;
  content_body: string;
  video_url: string | null;
  duration_minutes: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  lessons?: CourseLesson[];
}

export interface Course {
  id: string;
  organization_id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: DifficultyLevel;
  status: CourseStatus;
  metadata?: any;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  modules_count?: number;
  lessons_count?: number;
  total_duration_minutes?: number;
  modules?: CourseModule[];
}

export interface CreateCoursePayload {
  title: string;
  description: string;
  category?: string;
  difficultyLevel?: DifficultyLevel;
}

export interface CreateModulePayload {
  title: string;
  description?: string;
  orderIndex: number;
}

export interface CreateLessonPayload {
  title: string;
  contentType?: string;
  contentBody?: string;
  videoUrl?: string | null;
  durationMinutes?: number;
  orderIndex: number;
}

export async function fetchCoursesApi(params?: {
  page?: number;
  limit?: number;
  status?: CourseStatus;
  category?: string;
  difficultyLevel?: DifficultyLevel;
  search?: string;
}): Promise<{ courses: Course[]; meta: any }> {
  const res = await apiClient.get<ApiSuccessResponse<Course[]>>('/courses', { params });
  return {
    courses: res.data.data,
    meta: (res.data as any).meta || {},
  };
}

export async function fetchCourseByIdApi(courseId: string): Promise<Course> {
  const res = await apiClient.get<ApiSuccessResponse<Course>>(`/courses/${courseId}`);
  return res.data.data;
}

export async function createCourseApi(payload: CreateCoursePayload): Promise<Course> {
  const res = await apiClient.post<ApiSuccessResponse<Course>>('/courses', payload);
  return res.data.data;
}

export async function updateCourseApi(courseId: string, payload: Partial<CreateCoursePayload>): Promise<Course> {
  const res = await apiClient.patch<ApiSuccessResponse<Course>>(`/courses/${courseId}`, payload);
  return res.data.data;
}

export async function publishCourseApi(courseId: string): Promise<Course> {
  const res = await apiClient.post<ApiSuccessResponse<Course>>(`/courses/${courseId}/publish`);
  return res.data.data;
}

export async function archiveCourseApi(courseId: string): Promise<Course> {
  const res = await apiClient.delete<ApiSuccessResponse<Course>>(`/courses/${courseId}`);
  return res.data.data;
}

// Module API
export async function addModuleApi(courseId: string, payload: CreateModulePayload): Promise<CourseModule> {
  const res = await apiClient.post<ApiSuccessResponse<CourseModule>>(`/courses/${courseId}/modules`, payload);
  return res.data.data;
}

export async function deleteModuleApi(moduleId: string): Promise<void> {
  await apiClient.delete(`/courses/modules/${moduleId}`);
}

// Lesson API
export async function addLessonApi(moduleId: string, payload: CreateLessonPayload): Promise<CourseLesson> {
  const res = await apiClient.post<ApiSuccessResponse<CourseLesson>>(`/courses/modules/${moduleId}/lessons`, payload);
  return res.data.data;
}

export async function deleteLessonApi(lessonId: string): Promise<void> {
  await apiClient.delete(`/courses/lessons/${lessonId}`);
}
