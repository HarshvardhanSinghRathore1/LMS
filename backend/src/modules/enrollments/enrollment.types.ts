export type EnrollmentStatus = 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED';

export interface CourseEnrollmentRecord {
  id: string;
  organization_id: string;
  course_id: string;
  trainee_id: string;
  status: EnrollmentStatus;
  progress_percentage: number;
  completed_lessons_count: number;
  total_lessons_count: number;
  enrolled_at: Date;
  completed_at: Date | null;
  updated_at: Date;
}

export interface LessonProgressRecord {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  trainee_id: string;
  is_completed: boolean;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CourseEnrollmentWithCourse extends CourseEnrollmentRecord {
  course_title: string;
  course_description: string;
  category: string;
  difficulty_level: string;
  creator_name?: string;
}

export interface OrganizationEnrollmentMetrics {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  droppedEnrollments: number;
  averageProgressPercentage: number;
}
