import { apiClient, ApiSuccessResponse } from './api';

export interface CompetencySnapshot {
  competencyId: string;
  code: string;
  name: string;
  proficiency: 'ADVANCED' | 'EXPERT';
  scorePercentage: number;
}

export interface Certificate {
  id: string;
  organization_id: string;
  organizationId?: string;
  enrollment_id: string;
  enrollmentId?: string;
  trainee_id: string;
  traineeId?: string;
  course_id: string;
  courseId?: string;
  certificate_code: string;
  certificateCode?: string;
  verification_hash: string;
  verificationHash?: string;
  final_score_percentage: number;
  finalScorePercentage?: number;
  competencies_achieved: CompetencySnapshot[];
  competenciesAchieved?: CompetencySnapshot[];
  issued_at: string;
  issuedAt?: string;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  trainee_name?: string;
  traineeName?: string;
  course_title?: string;
  courseTitle?: string;
  organization_name?: string;
  organizationName?: string;
}

export type CertificateWithDetails = Certificate;

// Alias used by verify-certificate page
export type PublicCertificateVerificationResponse = PublicVerificationData;

export interface PublicVerificationData {
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

export async function issueCertificateApi(enrollmentId: string): Promise<Certificate> {
  const res = await apiClient.post<ApiSuccessResponse<Certificate>>('/certificates/issue', {
    enrollmentId,
  });
  return res.data.data;
}

export async function getMyCertificatesApi(): Promise<Certificate[]> {
  const res = await apiClient.get<ApiSuccessResponse<Certificate[]>>('/certificates/my-certificates');
  return res.data.data;
}

export async function getCertificateByIdApi(certificateId: string): Promise<Certificate> {
  const res = await apiClient.get<ApiSuccessResponse<Certificate>>(`/certificates/${certificateId}`);
  return res.data.data;
}

export async function verifyCertificatePublicApi(certificateCode: string): Promise<PublicVerificationData> {
  const res = await apiClient.get<ApiSuccessResponse<PublicVerificationData>>(
    `/certificates/verify/${encodeURIComponent(certificateCode.trim())}`
  );
  return res.data.data;
}
