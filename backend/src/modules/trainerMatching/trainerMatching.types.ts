export type ProficiencyLevel = 'ADVANCED' | 'EXPERT';
export type SessionStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';

export interface TrainerProfileRecord {
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
  created_at: Date;
  updated_at: Date;
  user_name?: string;
  user_email?: string;
}

export interface TrainerExpertiseRecord {
  id: string;
  organization_id: string;
  trainer_id: string;
  competency_id: string;
  proficiency_level: ProficiencyLevel;
  years_experience: number;
  created_at: Date;
  updated_at: Date;
  competency_code?: string;
  competency_name?: string;
}

export interface SessionRequestRecord {
  id: string;
  organization_id: string;
  trainee_id: string;
  trainer_id: string;
  competency_id: string | null;
  status: SessionStatus;
  topic: string;
  notes: string | null;
  requested_slot: Date | null;
  created_at: Date;
  updated_at: Date;
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

export interface TraineeSkillGapRecord {
  competency_id: string;
  competency_code: string;
  competency_name: string;
  target_score: number;
  current_score: number;
  gap_percentage: number;
}
