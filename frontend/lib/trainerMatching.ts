import { apiClient, ApiSuccessResponse } from './api';

export type ProficiencyLevel = 'ADVANCED' | 'EXPERT';
export type SessionStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';

export interface TrainerProfile {
  id: string;
  organization_id: string;
  user_id: string;
  bio: string | null;
  headline: string | null;
  years_of_experience: number;
  hourly_capacity: number;
  average_rating: number;
  total_reviews: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

export interface TrainerExpertise {
  id: string;
  organization_id: string;
  trainer_id: string;
  competency_id: string;
  proficiency_level: ProficiencyLevel;
  years_experience: number;
  created_at: string;
  updated_at: string;
  competency_code?: string;
  competency_name?: string;
}

export interface SessionRequest {
  id: string;
  organization_id: string;
  trainee_id: string;
  trainer_id: string;
  competency_id: string | null;
  status: SessionStatus;
  topic: string;
  notes: string | null;
  requested_slot: string | null;
  created_at: string;
  updated_at: string;
  trainer_name?: string;
  trainee_name?: string;
  competency_name?: string;
  competency_code?: string;
}

export interface TrainerMatchFactorBreakdown {
  skillGapFit: number;
  ratingFactor: number;
  experienceFactor: number;
  capacityFactor: number;
  weightedSkillGapFit: number;
  weightedRatingFactor: number;
  weightedExperienceFactor: number;
  weightedCapacityFactor: number;
}

export interface PrimarySkillGap {
  competencyId: string;
  competencyCode: string;
  competencyName: string;
  gapPercentage: number;
}

export interface MatchedCompetency {
  competencyId: string;
  competencyCode: string;
  competencyName: string;
  gapPercentage: number;
  proficiencyLevel: ProficiencyLevel;
  expertiseStrength: number;
}

export interface TrainerMatchResult {
  trainerId: string;
  userId: string;
  trainerName: string;
  headline: string | null;
  bio: string | null;
  yearsOfExperience: number;
  hourlyCapacity: number;
  activeSessionsCount: number;
  remainingCapacity: number;
  averageRating: number;
  totalReviews: number;
  isAvailable: boolean;
  matchScore: number;
  skillGapFit: number;
  ratingFactor: number;
  experienceFactor: number;
  capacityFactor: number;
  primarySkillGap: PrimarySkillGap | null;
  matchedCompetencies: MatchedCompetency[];
  factorsBreakdown: TrainerMatchFactorBreakdown;
}

export async function getTrainerMatchesApi(params?: {
  competencyId?: string;
  limit?: number;
}): Promise<TrainerMatchResult[]> {
  const res = await apiClient.get<ApiSuccessResponse<TrainerMatchResult[]>>(
    '/trainer-matching/matches',
    { params }
  );
  return res.data.data;
}

export async function getTrainerProfileApi(): Promise<TrainerProfile | null> {
  const res = await apiClient.get<ApiSuccessResponse<TrainerProfile | null>>(
    '/trainer-matching/profile'
  );
  return res.data.data;
}

export async function createTrainerProfileApi(data: {
  headline?: string | null;
  bio?: string | null;
  yearsOfExperience?: number;
  hourlyCapacity?: number;
  isAvailable?: boolean;
}): Promise<TrainerProfile> {
  const res = await apiClient.post<ApiSuccessResponse<TrainerProfile>>(
    '/trainer-matching/profile',
    data
  );
  return res.data.data;
}

export async function updateTrainerProfileApi(data: {
  headline?: string | null;
  bio?: string | null;
  yearsOfExperience?: number;
  hourlyCapacity?: number;
  isAvailable?: boolean;
}): Promise<TrainerProfile> {
  const res = await apiClient.patch<ApiSuccessResponse<TrainerProfile>>(
    '/trainer-matching/profile',
    data
  );
  return res.data.data;
}

export async function getTrainerExpertiseApi(): Promise<TrainerExpertise[]> {
  const res = await apiClient.get<ApiSuccessResponse<TrainerExpertise[]>>(
    '/trainer-matching/profile/expertise'
  );
  return res.data.data;
}

export async function addTrainerExpertiseApi(data: {
  competencyId: string;
  proficiencyLevel: ProficiencyLevel;
  yearsExperience?: number;
}): Promise<TrainerExpertise> {
  const res = await apiClient.post<ApiSuccessResponse<TrainerExpertise>>(
    '/trainer-matching/profile/expertise',
    data
  );
  return res.data.data;
}

export async function removeTrainerExpertiseApi(competencyId: string): Promise<void> {
  await apiClient.delete(`/trainer-matching/profile/expertise/${competencyId}`);
}

export async function createSessionRequestApi(data: {
  trainerId: string;
  competencyId?: string | null;
  topic: string;
  notes?: string | null;
  requestedSlot?: string | null;
}): Promise<SessionRequest> {
  const res = await apiClient.post<ApiSuccessResponse<SessionRequest>>(
    '/trainer-matching/sessions',
    data
  );
  return res.data.data;
}

export async function getMySessionsApi(): Promise<SessionRequest[]> {
  const res = await apiClient.get<ApiSuccessResponse<SessionRequest[]>>(
    '/trainer-matching/my-sessions'
  );
  return res.data.data;
}

export async function getTrainerSessionsApi(): Promise<SessionRequest[]> {
  const res = await apiClient.get<ApiSuccessResponse<SessionRequest[]>>(
    '/trainer-matching/sessions'
  );
  return res.data.data;
}

export async function acceptSessionApi(sessionId: string): Promise<SessionRequest> {
  const res = await apiClient.post<ApiSuccessResponse<SessionRequest>>(
    `/trainer-matching/sessions/${sessionId}/accept`
  );
  return res.data.data;
}

export async function declineSessionApi(sessionId: string): Promise<SessionRequest> {
  const res = await apiClient.post<ApiSuccessResponse<SessionRequest>>(
    `/trainer-matching/sessions/${sessionId}/decline`
  );
  return res.data.data;
}

export async function completeSessionApi(sessionId: string): Promise<SessionRequest> {
  const res = await apiClient.post<ApiSuccessResponse<SessionRequest>>(
    `/trainer-matching/sessions/${sessionId}/complete`
  );
  return res.data.data;
}

export async function cancelSessionApi(sessionId: string): Promise<SessionRequest> {
  const res = await apiClient.post<ApiSuccessResponse<SessionRequest>>(
    `/trainer-matching/sessions/${sessionId}/cancel`
  );
  return res.data.data;
}
