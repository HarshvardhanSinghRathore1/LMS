# Capacity Connect — Stage 6 AI Content Generation & Course-Aware Tutor Architecture

## 1. Executive Summary

**Stage 6 — AI Content Generation & Course-Aware Tutor** integrates generative AI content creation tools and a RAG-powered course tutor into **Capacity Connect** (SIH 2026 — Smart Education LMS).

- **AI Content Generation**: Trainers and Admins can auto-generate study notes and multiple-choice questions (MCQs) from course materials.
- **Review & Approval Queue**: Generated items enter a `PENDING_REVIEW` queue, enabling Admins/Trainers to review, edit, reject, or approve items. Approved MCQs are atomically imported into assessment question banks.
- **Course-Aware RAG AI Tutor**: Enrolled trainees get interactive, multi-turn AI chat assistance with RAG retrieval from indexed course lessons, returning inline Markdown responses with precise source citations.

All operations strictly enforce multi-tenant isolation (`organization_id`) and role-based access control (RBAC).

---

## 2. Core Architecture & Workflows

### 2.1 AI Content Generation Workflow
```
[Trainer / Admin]
       │
       ▼
 1. Request Generation (POST /ai/generate)
       │  (Extracts lesson/course text & calls LLM provider via LangChain)
       ▼
 2. Store in DB (ai_generated_items, status = 'PENDING_REVIEW')
       │
       ▼
 3. Review Queue (GET /ai/review-queue)
       │
  ┌────┴────────────────────────┐
  ▼                             ▼
[Approve MCQ]            [Reject Item]
(POST /ai/items/:id/approve)  (POST /ai/items/:id/reject)
  │                             │
  ▼                             ▼
Atomic insert into       status = 'REJECTED'
assessment_questions     (stored with review notes)
```

### 2.2 RAG AI Tutor Workflow
```
[Enrolled Trainee] ──► (POST /ai/tutor/chat { courseId, message, conversationId? })
                              │
                              ▼
                 1. Verify Enrollment & Tenant
                              │
                              ▼
                 2. Query HNSW Vector Index (pgvector)
                    (Top-k relevant lesson content chunks)
                              │
                              ▼
                 3. Multi-Turn LLM Synthesis (LangChain)
                    (Passes conversation history + context)
                              │
                              ▼
                 4. Persist User & Assistant Messages
                              │
                              ▼
                 5. Return { response, conversationId, citations }
```

---

## 3. Database Schema (`008_ai_features.sql`)

```sql
-- 1. AI GENERATED ITEMS (Study Notes & MCQs)
CREATE TABLE IF NOT EXISTS ai_generated_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('STUDY_NOTES', 'MCQ')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
    payload JSONB NOT NULL,
    review_notes TEXT,
    imported_question_id UUID REFERENCES assessment_questions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TUTOR CONVERSATIONS
CREATE TABLE IF NOT EXISTS tutor_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Tutor Session',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TUTOR MESSAGES
CREATE TABLE IF NOT EXISTS tutor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('USER', 'ASSISTANT')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. API Endpoints

### 4.1 Content Generation & Review Queue

- `POST /api/v1/ai/generate` — Generate Study Notes or MCQs (`ADMIN`, `TRAINER`).
- `GET /api/v1/ai/review-queue` — List pending AI generated items (`ADMIN`, `TRAINER`).
- `POST /api/v1/ai/items/:id/approve` — Approve item and atomically import MCQs into assessment bank (`ADMIN`, `TRAINER`).
- `POST /api/v1/ai/items/:id/reject` — Reject item with optional feedback notes (`ADMIN`, `TRAINER`).

### 4.2 RAG AI Tutor

- `POST /api/v1/ai/tutor/chat` — Interactive RAG query returns generated markdown answer with citations (`TRAINEE` enrolled, `ADMIN`, `TRAINER`).
- `GET /api/v1/ai/tutor/conversations` — List active tutor conversations for course (`TRAINEE`, `ADMIN`, `TRAINER`).

---

## 5. Verification & Test Results

The Stage 6 implementation was validated using `scratch/stage6_test_suite.js` covering **70 automated test assertions**:
- **Health & Integration**: `GET /health/ai` vector status & provider readiness.
- **RBAC Enforcement**: Trainees blocked from generation & review queue (`403 Forbidden`).
- **Generation Accuracy**: Structured JSON payload validation for notes and MCQs.
- **Review Lifecycle**: Approval, atomic import to question bank, rejection, duplicate import prevention.
- **RAG Tutor & Citations**: Multi-turn history preservation, course context retrieval, source citations array, enrollment shielding.
- **Multi-Tenant Isolation**: Cross-tenant generation, review, and chat strictly concealed (`404 Not Found`).
