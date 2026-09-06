import { apiClient, ApiSuccessResponse } from './api';

export type EnrollmentStatus = 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED';

export interface CourseEnrollment {
  id: string;
  organization_id: string;
  course_id: string;
  trainee_id: string;
  status: EnrollmentStatus;
  progress_percentage: number;
  completed_lessons_count: number;
  total_lessons_count: number;
  enrolled_at: string;
  completed_at: string | null;
  updated_at: string;
  course_title?: string;
  course_description?: string;
  category?: string;
  difficulty_level?: string;
  creator_name?: string;
}

export interface LessonProgress {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  trainee_id: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMetrics {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  droppedEnrollments: number;
  averageProgressPercentage: number;
}

export async function enrollInCourseApi(courseId: string): Promise<CourseEnrollment> {
  const res = await apiClient.post<ApiSuccessResponse<CourseEnrollment>>('/enrollments', { courseId });
  return res.data.data;
}

export async function fetchMyEnrollmentsApi(params?: {
  status?: EnrollmentStatus;
  page?: number;
  limit?: number;
}): Promise<{ enrollments: CourseEnrollment[]; pagination: any }> {
  const res = await apiClient.get<ApiSuccessResponse<CourseEnrollment[]>>('/enrollments', { params });
  return {
    enrollments: res.data.data,
    pagination: (res.data as any).pagination || {},
  };
}

export async function fetchEnrollmentByIdApi(
  enrollmentId: string
): Promise<{ enrollment: CourseEnrollment; lessonProgress: LessonProgress[] }> {
  const res = await apiClient.get<ApiSuccessResponse<{ enrollment: CourseEnrollment; lessonProgress: LessonProgress[] }>>(
    `/enrollments/${enrollmentId}`
  );
  return res.data.data;
}

export async function markLessonCompleteApi(
  enrollmentId: string,
  lessonId: string
): Promise<{ enrollment: CourseEnrollment; lessonProgress: LessonProgress }> {
  const res = await apiClient.post<ApiSuccessResponse<{ enrollment: CourseEnrollment; lessonProgress: LessonProgress }>>(
    `/enrollments/${enrollmentId}/lessons/${lessonId}/complete`
  );
  return res.data.data;
}

export async function markLessonUncompleteApi(
  enrollmentId: string,
  lessonId: string
): Promise<{ enrollment: CourseEnrollment; lessonProgress: LessonProgress }> {
  const res = await apiClient.post<ApiSuccessResponse<{ enrollment: CourseEnrollment; lessonProgress: LessonProgress }>>(
    `/enrollments/${enrollmentId}/lessons/${lessonId}/uncomplete`
  );
  return res.data.data;
}

export async function dropEnrollmentApi(enrollmentId: string): Promise<CourseEnrollment> {
  const res = await apiClient.post<ApiSuccessResponse<CourseEnrollment>>(`/enrollments/${enrollmentId}/drop`);
  return res.data.data;
}

export async function fetchOrganizationMetricsApi(): Promise<OrganizationMetrics> {
  const res = await apiClient.get<ApiSuccessResponse<OrganizationMetrics>>('/enrollments/metrics/organization');
  return res.data.data;
}
