-- ========================================================
-- MIGRATION: 008_ai_features.sql
-- DESCRIPTION: Stage 6 AI-Assisted Content Generation & Course-Aware AI Tutor tables
-- ========================================================

-- 1. AI GENERATED ITEMS (Study Notes & MCQs for Trainer Review)
CREATE TABLE IF NOT EXISTS ai_generated_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('STUDY_NOTES', 'MCQ')),
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
    source_context JSONB,
    provider VARCHAR(50) NOT NULL DEFAULT 'fallback',
    model VARCHAR(100) NOT NULL DEFAULT 'local-fallback',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. AI TUTOR CONVERSATIONS (Course-Aware Chat Threads)
CREATE TABLE IF NOT EXISTS ai_tutor_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Course AI Assistant Thread',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_tutor_trainee_course UNIQUE (trainee_id, course_id)
);

-- 3. AI TUTOR MESSAGES (Multi-Turn Chat History & Grounded Citations)
CREATE TABLE IF NOT EXISTS ai_tutor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_tutor_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. EXTEND ASSESSMENT QUESTIONS FOR PREVENTING DUPLICATE AI MCQ IMPORTS
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS source_ai_generated_item_id UUID UNIQUE REFERENCES ai_generated_items(id) ON DELETE SET NULL;

-- 5. INDEXES FOR MULTI-TENANT QUERY OPTIMIZATION
CREATE INDEX IF NOT EXISTS idx_ai_generated_items_org_status ON ai_generated_items(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_generated_items_course ON ai_generated_items(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_conv_trainee_course ON ai_tutor_conversations(trainee_id, course_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_conv_time ON ai_tutor_messages(conversation_id, created_at ASC);
