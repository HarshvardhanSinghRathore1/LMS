export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type VideoSourceType = 'YOUTUBE_VIDEO' | 'YOUTUBE_PLAYLIST' | 'UPLOADED';
export type TranscriptionStatus = 'PENDING' | 'PROCESSING' | 'TRANSCRIBING' | 'INDEXING' | 'READY' | 'FAILED';
export type ResourceIndexingStatus = 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';

export type NotesStatus = 'NOT_GENERATED' | 'GENERATING' | 'READY' | 'FAILED';

export interface LessonResourceRecord {
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
  created_at: Date;
  updated_at: Date;
}

export interface CourseLessonRecord {
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
  notes_status?: NotesStatus;
  notes_metadata?: any;
  duration_minutes: number;
  order_index: number;
  resources?: LessonResourceRecord[];
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
