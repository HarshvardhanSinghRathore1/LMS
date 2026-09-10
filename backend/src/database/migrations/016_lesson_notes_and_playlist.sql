-- ========================================================
-- MIGRATION: 016_lesson_notes_and_playlist.sql
-- DESCRIPTION: Stage 13 Lesson Notes Lifecycle & YouTube Playlist Import Metadata
-- ========================================================

-- 1. EXTEND COURSE_LESSONS TABLE FOR NOTES LIFECYCLE
ALTER TABLE course_lessons
    ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS notes_status VARCHAR(50) DEFAULT 'NOT_GENERATED',
    ADD COLUMN IF NOT EXISTS notes_metadata JSONB DEFAULT '{}';

-- 2. ADD CHECK CONSTRAINT FOR NOTES_STATUS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_lessons_notes_status'
    ) THEN
        ALTER TABLE course_lessons
            ADD CONSTRAINT chk_lessons_notes_status
            CHECK (notes_status IN ('NOT_GENERATED', 'GENERATING', 'READY', 'FAILED'));
    END IF;
END $$;

-- 3. INDEXES FOR NOTES STATUS
CREATE INDEX IF NOT EXISTS idx_course_lessons_notes_status ON course_lessons(notes_status);
