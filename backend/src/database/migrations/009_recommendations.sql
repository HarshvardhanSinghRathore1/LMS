-- Stage 7: Personalized Recommendations & Adaptive Learning Path Engine Schema
-- Migration 009_recommendations.sql

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES competencies(id) ON DELETE SET NULL,
  match_score NUMERIC(5,2) NOT NULL CHECK (match_score >= 0.00 AND match_score <= 100.00),
  gap_percentage_addressed NUMERIC(5,2) NOT NULL CHECK (gap_percentage_addressed >= 0.00 AND gap_percentage_addressed <= 100.00),
  recommendation_reason TEXT NOT NULL,
  recommendation_type VARCHAR(20) NOT NULL CHECK (recommendation_type IN ('PERSONALIZED', 'COLD_START')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'DISMISSED', 'ENROLLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_trainee_course UNIQUE (trainee_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_org_trainee ON recommendations (organization_id, trainee_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_trainee_status ON recommendations (trainee_id, status);
CREATE INDEX IF NOT EXISTS idx_recommendations_course ON recommendations (course_id);
