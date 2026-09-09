import { apiClient, ApiSuccessResponse } from './api';

export type RecommendationType = 'PERSONALIZED' | 'COLD_START';
export type RecommendationStatus = 'ACTIVE' | 'DISMISSED' | 'ENROLLED';

export interface RecommendationWithDetails {
  id: string;
  organization_id: string;
  trainee_id: string;
  course_id: string;
  competency_id: string | null;
  match_score: number;
  gap_percentage_addressed: number;
  recommendation_reason: string;
  recommendation_type: RecommendationType;
  status: RecommendationStatus;
  created_at: string;
  updated_at: string;
  course_title: string;
  course_description: string;
  course_category: string;
  course_difficulty: string;
  competency_code?: string | null;
  competency_name?: string | null;
}

export interface PathwayStep {
  step: number;
  type: 'LESSON' | 'ASSESSMENT';
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  assessmentId?: string;
  title: string;
  completed: boolean;
}

export interface PathwayData {
  course: {
    id: string;
    title: string;
    description: string;
    status: string;
  };
  steps: PathwayStep[];
}

export async function generateRecommendationsApi(): Promise<RecommendationWithDetails[]> {
  const res = await apiClient.post<ApiSuccessResponse<RecommendationWithDetails[]>>('/recommendations/generate');
  return res.data.data;
}

export async function fetchMyRecommendationsApi(): Promise<RecommendationWithDetails[]> {
  const res = await apiClient.get<ApiSuccessResponse<RecommendationWithDetails[]>>('/recommendations/my');
  return res.data.data;
}

export async function dismissRecommendationApi(recommendationId: string): Promise<any> {
  const res = await apiClient.post<ApiSuccessResponse<any>>(`/recommendations/${recommendationId}/dismiss`);
  return res.data.data;
}

export async function acceptRecommendationApi(recommendationId: string): Promise<{ recommendation: any; enrollment: any }> {
  const res = await apiClient.post<ApiSuccessResponse<{ recommendation: any; enrollment: any }>>(
    `/recommendations/${recommendationId}/accept`
  );
  return res.data.data;
}

export async function fetchAdaptivePathwayApi(courseId?: string): Promise<PathwayData> {
  const params = courseId ? { courseId } : {};
  const res = await apiClient.get<ApiSuccessResponse<PathwayData>>('/recommendations/pathway', { params });
  return res.data.data;
}
