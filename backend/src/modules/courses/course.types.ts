export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface CourseLessonRecord {
  id: string;
  module_id: string;
  title: string;
  content_type: string;
  content_body: string;
  video_url: string | null;
  duration_minutes: number;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

export interface CourseModuleRecord {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  created_at: Date;
  updated_at: Date;
  lessons?: CourseLessonRecord[];
}

export interface CourseRecord {
  id: string;
  organization_id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: DifficultyLevel;
  status: CourseStatus;
  metadata: any;
  created_at: Date;
  updated_at: Date;
  creator_name?: string;
  modules_count?: number;
  lessons_count?: number;
  total_duration_minutes?: number;
  modules?: CourseModuleRecord[];
}

export interface CreateCourseInput {
  title: string;
  description: string;
  category?: string;
  difficultyLevel?: DifficultyLevel;
  metadata?: any;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string;
  category?: string;
  difficultyLevel?: DifficultyLevel;
  metadata?: any;
}

export interface CreateModuleInput {
  title: string;
  description?: string;
  orderIndex: number;
}

export interface UpdateModuleInput {
  title?: string;
  description?: string;
  orderIndex?: number;
}

export interface CreateLessonInput {
  title: string;
  contentType?: string;
  contentBody?: string;
  videoUrl?: string | null;
  durationMinutes?: number;
  orderIndex: number;
}

export interface UpdateLessonInput {
  title?: string;
  contentType?: string;
  contentBody?: string;
  videoUrl?: string | null;
  durationMinutes?: number;
  orderIndex?: number;
}

export interface CourseQueryParams {
  page?: number;
  limit?: number;
  status?: CourseStatus;
  category?: string;
  difficultyLevel?: DifficultyLevel;
  search?: string;
}
