export interface CompetencySnapshot {
  competencyId: string;
  code: string;
  name: string;
  proficiency: 'ADVANCED' | 'EXPERT';
  scorePercentage: number;
}

export interface CertificateRecord {
  id: string;
  organization_id: string;
  enrollment_id: string;
  trainee_id: string;
  course_id: string;
  certificate_code: string;
  verification_hash: string;
  final_score_percentage: number;
  competencies_achieved: CompetencySnapshot[];
  issued_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CertificateWithDetails {
  id: string;
  organization_id: string;
  enrollment_id: string;
  trainee_id: string;
  course_id: string;
  certificate_code: string;
  verification_hash: string;
  final_score_percentage: number;
  competencies_achieved: CompetencySnapshot[];
  issued_at: Date;
  created_at: Date;
  updated_at: Date;
  trainee_name?: string;
  course_title?: string;
  organization_name?: string;
}

export interface CompletionVerificationResult {
  eligible: boolean;
  enrollmentCompleted: boolean;
  progressComplete: boolean;
  allMandatoryLessonsComplete: boolean;
  allAssessmentsPassed: boolean;
  finalScorePercentage: number;
  totalLessonsCount: number;
  completedLessonsCount: number;
  publishedAssessmentsCount: number;
  passedAssessmentsCount: number;
  failedCriteria: string[];
}

export interface PublicCertificateVerificationResponse {
  valid: boolean;
  certificate: {
    certificateCode: string;
    traineeName: string;
    courseTitle: string;
    organizationName: string;
    finalScorePercentage: number;
    competenciesAchieved: CompetencySnapshot[];
    issuedAt: string;
    verificationHash: string;
  } | null;
}
