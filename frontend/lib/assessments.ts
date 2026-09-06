import { apiClient, ApiSuccessResponse } from './api';

export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type QuestionType = 'MCQ' | 'TRUE_FALSE';
export type SubmissionStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';

export interface Assessment {
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
  created_at: string;
  updated_at: string;
  course_title?: string;
  creator_name?: string;
  questions_count?: number;
  total_points?: number;
}

export interface Question {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  order_index: number;
  options: any[];
  correct_answer?: any; // Only returned to Admin / Trainer
}

export interface Submission {
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
  started_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
  assessment_title?: string;
  trainee_name?: string;
}

export interface AssessmentMetrics {
  totalAssessments: number;
  publishedAssessments: number;
  totalAttempts: number;
  completedAttempts: number;
  passedAttempts: number;
  failedAttempts: number;
  averageScorePercentage: number;
  passRatePercentage: number;
}

export interface CreateAssessmentPayload {
  courseId: string;
  title: string;
  description?: string;
  passingScorePercentage?: number;
  timeLimitMinutes?: number | null;
  maxAttempts?: number;
}

export interface CreateQuestionPayload {
  questionText: string;
  questionType: QuestionType;
  points?: number;
  orderIndex: number;
  options: any[];
  correctAnswer: any;
}

// API Functions

export async function fetchAssessmentsApi(params?: {
  courseId?: string;
  status?: AssessmentStatus;
  page?: number;
  limit?: number;
}): Promise<{ assessments: Assessment[]; pagination: any }> {
  const res = await apiClient.get<ApiSuccessResponse<Assessment[]>>('/assessments', { params });
  return {
    assessments: res.data.data,
    pagination: (res.data as any).pagination || {},
  };
}

export async function fetchAssessmentByIdApi(
  assessmentId: string
): Promise<{ assessment: Assessment; questions: Question[] }> {
  const res = await apiClient.get<
    ApiSuccessResponse<{ assessment: Assessment; questions: Question[] }>
  >(`/assessments/${assessmentId}`);
  return res.data.data;
}

export async function createAssessmentApi(payload: CreateAssessmentPayload): Promise<Assessment> {
  const res = await apiClient.post<ApiSuccessResponse<Assessment>>('/assessments', payload);
  return res.data.data;
}

export async function updateAssessmentApi(
  assessmentId: string,
  payload: Partial<CreateAssessmentPayload>
): Promise<Assessment> {
  const res = await apiClient.patch<ApiSuccessResponse<Assessment>>(`/assessments/${assessmentId}`, payload);
  return res.data.data;
}

export async function publishAssessmentApi(assessmentId: string): Promise<Assessment> {
  const res = await apiClient.post<ApiSuccessResponse<Assessment>>(`/assessments/${assessmentId}/publish`);
  return res.data.data;
}

export async function addQuestionApi(
  assessmentId: string,
  payload: CreateQuestionPayload
): Promise<Question> {
  const res = await apiClient.post<ApiSuccessResponse<Question>>(`/assessments/${assessmentId}/questions`, payload);
  return res.data.data;
}

export async function startAttemptApi(assessmentId: string): Promise<Submission> {
  const res = await apiClient.post<ApiSuccessResponse<Submission>>(`/assessments/${assessmentId}/start`);
  return res.data.data;
}

export async function submitAttemptApi(
  assessmentId: string,
  submissionId: string,
  answers: Record<string, any>
): Promise<Submission> {
  const res = await apiClient.post<ApiSuccessResponse<Submission>>(
    `/assessments/${assessmentId}/attempts/${submissionId}/submit`,
    { answers }
  );
  return res.data.data;
}

export async function fetchMyResultsApi(assessmentId: string): Promise<Submission[]> {
  const res = await apiClient.get<ApiSuccessResponse<Submission[]>>(`/assessments/${assessmentId}/results`);
  return res.data.data;
}

export async function fetchAssessmentMetricsApi(): Promise<AssessmentMetrics> {
  const res = await apiClient.get<ApiSuccessResponse<AssessmentMetrics>>('/assessments/metrics/organization');
  return res.data.data;
}
