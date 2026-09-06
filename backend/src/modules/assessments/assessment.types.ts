export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type QuestionType = 'MCQ' | 'TRUE_FALSE';
export type SubmissionStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';

export interface AssessmentRecord {
  id: string;
  organization_id: string;
  course_id: string;
  creator_id: string;
  title: string;
  description: string;
  passing_score_percentage: number;
  time_limit_minutes: number | null;
  max_attempts: number;
  status: AssessmentStatus;
  created_at: Date;
  updated_at: Date;
  course_title?: string;
  creator_name?: string;
  questions_count?: number;
  total_points?: number;
}

export interface QuestionRecord {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  order_index: number;
  options: any[];
  correct_answer?: any; // Sensitive field - MUST BE OMITTED FOR TRAINEES
  created_at: Date;
  updated_at: Date;
}

export interface SafeQuestionDTO {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  order_index: number;
  options: any[];
}

export interface SubmissionRecord {
  id: string;
  organization_id: string;
  assessment_id: string;
  trainee_id: string;
  enrollment_id: string;
  attempt_number: number;
  score_percentage: number | null;
  total_points_earned: number;
  max_points_possible: number;
  passed: boolean | null;
  status: SubmissionStatus;
  answers: Record<string, any>;
  started_at: Date;
  expires_at: Date | null;
  submitted_at: Date | null;
  graded_at: Date | null;
  created_at: Date;
  updated_at: Date;
  assessment_title?: string;
  trainee_name?: string;
}

export interface OrganizationAssessmentMetrics {
  totalAssessments: number;
  publishedAssessments: number;
  totalAttempts: number;
  completedAttempts: number;
  passedAttempts: number;
  failedAttempts: number;
  averageScorePercentage: number;
  passRatePercentage: number;
}
