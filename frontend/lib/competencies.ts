import { apiClient, ApiSuccessResponse } from './api';

export type ProficiencyLevel = 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface Competency {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  target_score_percentage: number;
  created_at: string;
  updated_at: string;
  mapped_courses_count?: number;
}

export interface CourseCompetencyMapping {
  id: string;
  organization_id: string;
  course_id: string;
  competency_id: string;
  weight: number;
  created_at: string;
  course_title?: string;
}

export interface TraineeCompetency {
  id: string;
  organization_id: string;
  trainee_id: string;
  competency_id: string;
  current_score_percentage: number;
  proficiency_level: ProficiencyLevel;
  gap_percentage: number;
  last_evaluated_at: string;
  created_at: string;
  updated_at: string;
  competency_code?: string;
  competency_name?: string;
  target_score_percentage?: number;
  category?: string;
}

export interface OrganizationSkillGapMatrix {
  competencies: {
    id: string;
    code: string;
    name: string;
    targetScorePercentage: number;
    category: string;
  }[];
  trainees: {
    id: string;
    name: string;
    email: string;
    competencies: Record<
      string,
      {
        currentScore: number;
        proficiency: ProficiencyLevel;
        gap: number;
      }
    >;
  }[];
  summary: {
    totalCompetencies: number;
    totalTraineesEvaluated: number;
    averageGapPercentage: number;
    noviceCount: number;
    intermediateCount: number;
    advancedCount: number;
    expertCount: number;
  };
}

export interface CreateCompetencyPayload {
  code: string;
  name: string;
  description?: string;
  category?: string;
  targetScorePercentage?: number;
}

export interface MapCoursePayload {
  courseId: string;
  weight?: number;
}

// API Functions

export async function fetchCompetenciesApi(params?: {
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{ competencies: Competency[]; pagination: any }> {
  const res = await apiClient.get<ApiSuccessResponse<Competency[]>>('/competencies', { params });
  return {
    competencies: res.data.data,
    pagination: (res.data as any).pagination || {},
  };
}

export async function fetchCompetencyByIdApi(competencyId: string): Promise<Competency> {
  const res = await apiClient.get<ApiSuccessResponse<Competency>>(`/competencies/${competencyId}`);
  return res.data.data;
}

export async function createCompetencyApi(payload: CreateCompetencyPayload): Promise<Competency> {
  const res = await apiClient.post<ApiSuccessResponse<Competency>>('/competencies', payload);
  return res.data.data;
}

export async function updateCompetencyApi(
  competencyId: string,
  payload: Partial<CreateCompetencyPayload>
): Promise<Competency> {
  const res = await apiClient.patch<ApiSuccessResponse<Competency>>(`/competencies/${competencyId}`, payload);
  return res.data.data;
}

export async function mapCourseToCompetencyApi(
  competencyId: string,
  payload: MapCoursePayload
): Promise<CourseCompetencyMapping> {
  const res = await apiClient.post<ApiSuccessResponse<CourseCompetencyMapping>>(
    `/competencies/${competencyId}/map-course`,
    payload
  );
  return res.data.data;
}

export async function removeCourseMappingApi(
  competencyId: string,
  courseId: string
): Promise<void> {
  await apiClient.delete(`/competencies/${competencyId}/map-course/${courseId}`);
}

export async function fetchMyCompetencyGapsApi(): Promise<TraineeCompetency[]> {
  const res = await apiClient.get<ApiSuccessResponse<TraineeCompetency[]>>('/competencies/my-gaps');
  return res.data.data;
}

export async function fetchOrganizationSkillGapMatrixApi(): Promise<OrganizationSkillGapMatrix> {
  const res = await apiClient.get<ApiSuccessResponse<OrganizationSkillGapMatrix>>(
    '/competencies/organization-matrix'
  );
  return res.data.data;
}
