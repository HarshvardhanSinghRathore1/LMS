-- ========================================================
-- MIGRATION: 005_enrollment_progress.sql
-- DESCRIPTION: Stage 3 Enrollment & Lesson Progress Tracking
-- ========================================================

-- 1. COURSE ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED')),
    progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (progress_percentage >= 0.00 AND progress_percentage <= 100.00),
    completed_lessons_count INTEGER NOT NULL DEFAULT 0 CHECK (completed_lessons_count >= 0),
    total_lessons_count INTEGER NOT NULL DEFAULT 0 CHECK (total_lessons_count >= 0),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, trainee_id)
);

-- 2. LESSON PROGRESS TABLE
CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(enrollment_id, lesson_id)
);

-- 3. INDEXES FOR MULTI-TENANT & TRAINEE PROGRESS LOOKUPS
CREATE INDEX IF NOT EXISTS idx_course_enrollments_org_trainee ON course_enrollments(organization_id, trainee_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_status ON course_enrollments(course_id, status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_trainee_status ON course_enrollments(trainee_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment_id ON lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_trainee_id ON lesson_progress(trainee_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
