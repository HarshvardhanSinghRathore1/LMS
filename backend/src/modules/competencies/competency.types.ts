export type ProficiencyLevel = 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface CompetencyRecord {
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

export interface CourseCompetencyRecord {
  id: string;
  organization_id: string;
  course_id: string;
  competency_id: string;
  weight: number;
  created_at: string;
  course_title?: string;
  competency_name?: string;
  competency_code?: string;
}

export interface TraineeCompetencyRecord {
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
  trainee_name?: string;
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
