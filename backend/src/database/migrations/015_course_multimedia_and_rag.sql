-- ========================================================
-- MIGRATION: 015_course_multimedia_and_rag.sql
-- DESCRIPTION: Stage 13 Course Multimedia (YouTube, Uploaded Video STT, PDF Resources, & pgvector RAG)
-- ========================================================

-- 1. EXTEND COURSE_LESSONS TABLE FOR MULTIMEDIA & TRANSCRIPTION
ALTER TABLE course_lessons
    ADD COLUMN IF NOT EXISTS video_source_type VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS video_metadata JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS transcription_status VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS transcript_text TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS transcript_metadata JSONB DEFAULT '[]';

-- Add constraints if not existing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_lessons_video_source_type'
    ) THEN
        ALTER TABLE course_lessons
            ADD CONSTRAINT chk_lessons_video_source_type
            CHECK (video_source_type IS NULL OR video_source_type IN ('YOUTUBE_VIDEO', 'YOUTUBE_PLAYLIST', 'UPLOADED'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_lessons_transcription_status'
    ) THEN
        ALTER TABLE course_lessons
            ADD CONSTRAINT chk_lessons_transcription_status
            CHECK (transcription_status IS NULL OR transcription_status IN ('PENDING', 'PROCESSING', 'TRANSCRIBING', 'INDEXING', 'READY', 'FAILED'));
    END IF;
END $$;

-- 2. CREATE LESSON_RESOURCES TABLE FOR PDF ATTACHMENTS
CREATE TABLE IF NOT EXISTS lesson_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL DEFAULT 'PDF' CHECK (resource_type IN ('PDF', 'DOCUMENT', 'LINK')),
    file_url VARCHAR(1000) NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    extracted_text TEXT DEFAULT NULL,
    indexing_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (indexing_status IN ('PENDING', 'INDEXED', 'FAILED', 'SKIPPED')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. MULTI-TENANT & PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_lesson_resources_org_course_lesson ON lesson_resources(organization_id, course_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson_id ON lesson_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_indexing_status ON lesson_resources(indexing_status);
CREATE INDEX IF NOT EXISTS idx_course_lessons_transcription_status ON course_lessons(transcription_status);
