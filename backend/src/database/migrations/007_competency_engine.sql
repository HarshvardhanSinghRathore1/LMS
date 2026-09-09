-- Stage 5: Competency Engine & Skill Gap Analysis Schema
-- Migration 007_competency_engine.sql

-- 1. COMPETENCIES TABLE
CREATE TABLE IF NOT EXISTS competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  category VARCHAR(100) DEFAULT 'General',
  target_score_percentage NUMERIC(5,2) NOT NULL DEFAULT 75.00 CHECK (target_score_percentage BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_org_competency_code UNIQUE (organization_id, code)
);

-- 2. COURSE COMPETENCIES MAPPING TABLE
CREATE TABLE IF NOT EXISTS course_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  weight NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (weight > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_course_competency UNIQUE (course_id, competency_id)
);

-- 3. TRAINEE COMPETENCIES EVALUATION SNAPSHOT TABLE
CREATE TABLE IF NOT EXISTS trainee_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  current_score_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (current_score_percentage BETWEEN 0 AND 100),
  proficiency_level VARCHAR(20) NOT NULL DEFAULT 'NOVICE' CHECK (proficiency_level IN ('NOVICE', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
  gap_percentage NUMERIC(5,2) NOT NULL DEFAULT 75.00 CHECK (gap_percentage BETWEEN 0 AND 100),
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_trainee_competency UNIQUE (trainee_id, competency_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_competencies_org_code ON competencies (organization_id, code);
CREATE INDEX IF NOT EXISTS idx_course_competencies_org_course ON course_competencies (organization_id, course_id);
CREATE INDEX IF NOT EXISTS idx_course_competencies_course_comp ON course_competencies (course_id, competency_id);
CREATE INDEX IF NOT EXISTS idx_course_competencies_comp ON course_competencies (competency_id);
CREATE INDEX IF NOT EXISTS idx_trainee_competencies_org_trainee ON trainee_competencies (organization_id, trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainee_competencies_trainee_comp ON trainee_competencies (trainee_id, competency_id);
CREATE INDEX IF NOT EXISTS idx_trainee_competencies_comp ON trainee_competencies (competency_id);
