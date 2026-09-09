-- Migration 010: Intelligent Trainer Matching Engine
-- Creates trainer_profiles, trainer_competency_expertise, and trainer_session_requests

CREATE TABLE IF NOT EXISTS trainer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT NULL,
  headline VARCHAR(255) NULL,
  years_of_experience INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_trainer_exp CHECK (years_of_experience >= 0),
  hourly_capacity INTEGER NOT NULL DEFAULT 10 CONSTRAINT chk_trainer_capacity CHECK (hourly_capacity >= 0),
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 5.00 CONSTRAINT chk_trainer_rating CHECK (average_rating >= 0 AND average_rating <= 5),
  total_reviews INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_trainer_reviews CHECK (total_reviews >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trainer_competency_expertise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainer_profiles(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(20) NOT NULL CONSTRAINT chk_expertise_level CHECK (proficiency_level IN ('ADVANCED', 'EXPERT')),
  years_experience INTEGER NOT NULL DEFAULT 1 CONSTRAINT chk_expertise_years CHECK (years_experience >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_trainer_competency UNIQUE (trainer_id, competency_id)
);

CREATE TABLE IF NOT EXISTS trainer_session_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainer_profiles(id) ON DELETE CASCADE,
  competency_id UUID NULL REFERENCES competencies(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CONSTRAINT chk_session_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED')),
  topic VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  requested_slot TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for optimal querying and constraint enforcement
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_org_avail ON trainer_profiles(organization_id, is_available);
CREATE INDEX IF NOT EXISTS idx_trainer_expertise_trainer ON trainer_competency_expertise(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_expertise_comp ON trainer_competency_expertise(competency_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_org_trainee ON trainer_session_requests(organization_id, trainee_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_org_trainer ON trainer_session_requests(organization_id, trainer_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_active_slot ON trainer_session_requests(trainer_id, requested_slot) WHERE status IN ('PENDING', 'ACCEPTED');
