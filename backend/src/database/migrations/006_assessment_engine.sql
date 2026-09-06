-- ========================================================
-- MIGRATION: 006_assessment_engine.sql
-- DESCRIPTION: Stage 4 Assessment Engine & Automated Grading
-- ========================================================

-- 1. ASSESSMENTS TABLE
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    passing_score_percentage NUMERIC(5,2) NOT NULL DEFAULT 70.00 CHECK (passing_score_percentage >= 0.00 AND passing_score_percentage <= 100.00),
    time_limit_minutes INTEGER DEFAULT NULL CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
    max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts >= 1 AND max_attempts <= 50),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ASSESSMENT QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL DEFAULT 'MCQ' CHECK (question_type IN ('MCQ', 'TRUE_FALSE')),
    points INTEGER NOT NULL DEFAULT 10 CHECK (points > 0),
    order_index INTEGER NOT NULL CHECK (order_index >= 0),
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, order_index)
);

-- 3. ASSESSMENT SUBMISSIONS / ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS assessment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
    trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE RESTRICT,
    attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
    score_percentage NUMERIC(5,2) DEFAULT NULL CHECK (score_percentage IS NULL OR (score_percentage >= 0.00 AND score_percentage <= 100.00)),
    total_points_earned INTEGER DEFAULT 0 CHECK (total_points_earned >= 0),
    max_points_possible INTEGER DEFAULT 0 CHECK (max_points_possible >= 0),
    passed BOOLEAN DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED')),
    answers JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PERFORMANCE & TENANT INDEXES
CREATE INDEX IF NOT EXISTS idx_assessments_org_course ON assessments(organization_id, course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_org_status ON assessments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment ON assessment_questions(assessment_id, order_index);
CREATE INDEX IF NOT EXISTS idx_submissions_org_assessment ON assessment_submissions(organization_id, assessment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assessment_trainee ON assessment_submissions(assessment_id, trainee_id);
CREATE INDEX IF NOT EXISTS idx_submissions_trainee_status ON assessment_submissions(trainee_id, status);

-- 5. PARTIAL UNIQUE INDEX FOR SINGLE ACTIVE ATTEMPT PER ASSESSMENT & TRAINEE
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_attempt_unique 
ON assessment_submissions (assessment_id, trainee_id) 
WHERE status = 'IN_PROGRESS';
