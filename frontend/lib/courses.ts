import { apiClient, ApiSuccessResponse } from './api';

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type VideoSourceType = 'YOUTUBE_VIDEO' | 'YOUTUBE_PLAYLIST' | 'UPLOADED';
export type TranscriptionStatus = 'PENDING' | 'PROCESSING' | 'TRANSCRIBING' | 'INDEXING' | 'READY' | 'FAILED';
export type ResourceIndexingStatus = 'PENDING' | 'INDEXED' | 'FAILED' | 'SKIPPED';

export interface LessonResource {
  id: string;
  organization_id: string;
  course_id: string;
  lesson_id: string;
  title: string;
  resource_type: string;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  extracted_text?: string | null;
  indexing_status: ResourceIndexingStatus;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  content_type: string;
  content_body: string;
  video_url: string | null;
  video_source_type?: VideoSourceType | null;
  video_metadata?: any;
  transcription_status?: TranscriptionStatus;
  transcript_text?: string | null;
  transcript_metadata?: any;
  notes?: string | null;
  notes_status?: 'NOT_GENERATED' | 'GENERATING' | 'READY' | 'FAILED';
  notes_metadata?: any;
  duration_minutes: number;
  order_index: number;
  resources?: LessonResource[];
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

export async function createModuleApi(courseId: string, payload: CreateModulePayload): Promise<CourseModule> {
  const res = await apiClient.post<ApiSuccessResponse<CourseModule>>(`/courses/${courseId}/modules`, payload);
  return res.data.data;
}

export const addModuleApi = createModuleApi;

export async function updateModuleApi(moduleId: string, payload: Partial<CreateModulePayload>): Promise<CourseModule> {
  const res = await apiClient.patch<ApiSuccessResponse<CourseModule>>(`/courses/modules/${moduleId}`, payload);
  return res.data.data;
}

export async function deleteModuleApi(moduleId: string): Promise<void> {
  await apiClient.delete(`/courses/modules/${moduleId}`);
}

export async function createLessonApi(moduleId: string, payload: CreateLessonPayload): Promise<CourseLesson> {
  const res = await apiClient.post<ApiSuccessResponse<CourseLesson>>(`/courses/modules/${moduleId}/lessons`, payload);
  return res.data.data;
}

export const addLessonApi = createLessonApi;

export async function updateLessonApi(lessonId: string, payload: Partial<CreateLessonPayload>): Promise<CourseLesson> {
  const res = await apiClient.patch<ApiSuccessResponse<CourseLesson>>(`/courses/lessons/${lessonId}`, payload);
  return res.data.data;
}

export async function deleteLessonApi(lessonId: string): Promise<void> {
  await apiClient.delete(`/courses/lessons/${lessonId}`);
}

// --- STAGE 13 MULTIMEDIA & RESOURCE APIS ---

export async function setYouTubeVideoApi(courseId: string, lessonId: string, url: string): Promise<CourseLesson> {
  const res = await apiClient.post<ApiSuccessResponse<{ lesson: CourseLesson }>>(
    `/courses/${courseId}/lessons/${lessonId}/video/youtube`,
    { url }
  );
  return res.data.data.lesson;
}

export async function uploadLessonVideoApi(
  courseId: string,
  lessonId: string,
  formData: FormData,
  onUploadProgress?: (progressEvent: any) => void
): Promise<CourseLesson> {
  const res = await apiClient.post<ApiSuccessResponse<{ lesson: CourseLesson }>>(
    `/courses/${courseId}/lessons/${lessonId}/video/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }
  );
  return res.data.data.lesson;
}

export async function fetchLessonVideoApi(courseId: string, lessonId: string) {
  const res = await apiClient.get<ApiSuccessResponse<any>>(
    `/courses/${courseId}/lessons/${lessonId}/video`
  );
  return res.data.data;
}

export async function deleteLessonVideoApi(courseId: string, lessonId: string): Promise<CourseLesson> {
  const res = await apiClient.delete<ApiSuccessResponse<{ lesson: CourseLesson }>>(
    `/courses/${courseId}/lessons/${lessonId}/video`
  );
  return res.data.data.lesson;
}

export async function reprocessLessonVideoApi(courseId: string, lessonId: string): Promise<void> {
  await apiClient.post(`/courses/${courseId}/lessons/${lessonId}/video/reprocess`);
}

export async function uploadLessonResourceApi(
  courseId: string,
  lessonId: string,
  formData: FormData,
  onUploadProgress?: (progressEvent: any) => void
): Promise<LessonResource> {
  const res = await apiClient.post<ApiSuccessResponse<{ resource: LessonResource }>>(
    `/courses/${courseId}/lessons/${lessonId}/resources`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }
  );
  return res.data.data.resource;
}

export async function fetchLessonResourcesApi(courseId: string, lessonId: string): Promise<LessonResource[]> {
  const res = await apiClient.get<ApiSuccessResponse<{ resources: LessonResource[] }>>(
    `/courses/${courseId}/lessons/${lessonId}/resources`
  );
  return res.data.data.resources || [];
}

export async function deleteLessonResourceApi(courseId: string, lessonId: string, resourceId: string): Promise<void> {
  await apiClient.delete(`/courses/${courseId}/lessons/${lessonId}/resources/${resourceId}`);
}

export function getLessonVideoStreamUrl(courseId: string, lessonId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  return `${baseUrl}/courses/${courseId}/lessons/${lessonId}/video/stream`;
}

export function getLessonResourceDownloadUrl(courseId: string, lessonId: string, resourceId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  return `${baseUrl}/courses/${courseId}/lessons/${lessonId}/resources/${resourceId}/download`;
}

export async function fetchCourseMediaStatusApi(courseId: string) {
  const res = await apiClient.get<ApiSuccessResponse<any>>(`/courses/${courseId}/media-status`);
  return res.data.data;
}

export interface ImportPlaylistResponse {
  duplicate: boolean;
  courseId?: string;
  message: string;
  course: Course;
}

export async function importYouTubePlaylistApi(payload: {
  playlistUrl: string;
  category?: string;
  difficultyLevel?: DifficultyLevel;
}): Promise<ImportPlaylistResponse> {
  const res = await apiClient.post<ApiSuccessResponse<ImportPlaylistResponse>>(
    '/courses/import-playlist',
    payload
  );
  return res.data.data;
}

export async function generateLessonNotesApi(
  courseId: string,
  lessonId: string
): Promise<{ notes: string; notesStatus: string; notesMetadata: any }> {
  const res = await apiClient.post<
    ApiSuccessResponse<{ notes: string; notesStatus: string; notesMetadata: any }>
  >(`/courses/${courseId}/lessons/${lessonId}/notes/generate`);
  return res.data.data;
}

export async function updateLessonNotesApi(
  courseId: string,
  lessonId: string,
  notes: string
): Promise<{ notes: string; notes_status: string; notes_metadata: any }> {
  const res = await apiClient.put<
    ApiSuccessResponse<{ notes: string; notes_status: string; notes_metadata: any }>
  >(`/courses/${courseId}/lessons/${lessonId}/notes`, { notes });
  return res.data.data;
}

export async function fetchLessonNotesApi(
  courseId: string,
  lessonId: string
): Promise<{ notes: string | null; notes_status: string; notes_metadata: any }> {
  const res = await apiClient.get<
    ApiSuccessResponse<{ notes: string | null; notes_status: string; notes_metadata: any }>
  >(`/courses/${courseId}/lessons/${lessonId}/notes`);
  return res.data.data;
}

