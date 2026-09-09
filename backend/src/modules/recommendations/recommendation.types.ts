export type RecommendationType = 'PERSONALIZED' | 'COLD_START';

export type RecommendationStatus = 'ACTIVE' | 'DISMISSED' | 'ENROLLED';

export interface RecommendationRecord {
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
  created_at: Date;
  updated_at: Date;
}

export interface RecommendationWithDetails extends RecommendationRecord {
  course_title: string;
  course_description: string;
  course_category: string;
  course_difficulty: string;
  competency_code?: string | null;
  competency_name?: string | null;
}

export interface CandidateCompetency {
  competencyId: string;
  code: string;
  name: string;
  weight: number;
  targetScorePercentage: number;
  currentScorePercentage: number;
  gapPercentage: number;
}

export interface CandidateCourse {
  courseId: string;
  title: string;
  description: string;
  category: string;
  difficultyLevel: string;
  organizationId: string;
  status: string;
  mappedCompetencies: CandidateCompetency[];
  eligibleEnrollments: number;
  completedEnrollments: number;
  completionRateFactor: number;
}

export interface CandidateEvaluation {
  course: CandidateCourse;
  recommendationType: RecommendationType;
  primaryCompetency: CandidateCompetency | null;
  skillGapFactor: number;
  competencyMappingFactor: number;
  completionRateFactor: number;
  recommendationScore: number;
  recommendationReason: string;
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
