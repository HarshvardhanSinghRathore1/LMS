-- 017_nullable_tutor_conversation_course_id.sql
-- Allow AI Tutor conversations without specific course_id for general study assistant questions

ALTER TABLE ai_tutor_conversations ALTER COLUMN course_id DROP NOT NULL;
