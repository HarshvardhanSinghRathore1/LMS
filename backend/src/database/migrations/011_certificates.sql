-- Migration 011: Course Completion Verification & Verified Certificate Generation Engine
-- Creates certificates table for cryptographically verifiable course completion credentials

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL UNIQUE REFERENCES course_enrollments(id) ON DELETE CASCADE,
  trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_code VARCHAR(50) NOT NULL UNIQUE,
  verification_hash VARCHAR(64) NOT NULL,
  final_score_percentage NUMERIC(5,2) NOT NULL CONSTRAINT chk_cert_score CHECK (final_score_percentage >= 0 AND final_score_percentage <= 100),
  competencies_achieved JSONB NOT NULL DEFAULT '[]'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_cert_hash_format CHECK (verification_hash ~ '^[0-9a-fA-F]{64}$')
);

-- Indexes for performance and public code resolution
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_certificates_org_trainee ON certificates(organization_id, trainee_id);
