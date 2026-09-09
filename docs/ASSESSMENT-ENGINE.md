# CAPACITY CONNECT — ASSESSMENT ENGINE & AUTOMATED GRADING (STAGE 4)

## 1. Executive Summary

The **Assessment Engine** in Capacity Connect (SIH 2026 — PS 26075: Smart Education) delivers production-grade, multi-tenant assessment creation, question management, timed attempt tracking, and server-side automated grading.

Built as an integrated component of Capacity Connect’s modular monolith architecture, the Assessment Engine maintains absolute tenant isolation, strict role-based authorization (RBAC), and bulletproof answer key security.

---

## 2. Architectural Blueprint

```text
Frontend (Next.js 14 App Router / React / Tailwind)
    │
    ├── /assessments (Dashboard & Management Hub)
    ├── /assessments/[id]/take (Interactive Assessment Take Screen & Timer)
    └── /courses/[id] (Course Assessments Integration)
    ↓
REST API Routes (/api/v1/assessments)
    ↓
Middleware Stack (authenticate → enforceOrganizationContext → authorize)
    ↓
AssessmentController (Request parsing & response mapping)
    ↓
AssessmentService (Business logic, course validation, structural publish checks, attempt limits & timer expiration)
    ↓
AssessmentRepository (PostgreSQL pool queries, safe question projection & transactional atomic grading)
    ↓
PostgreSQL 16 (006_assessment_engine.sql)
```

---

## 3. Core Capabilities & Specifications

### 3.1 Assessment Lifecycle
Assessments transition through three controlled business states:
- `DRAFT`: Default state upon creation. Questions and details can be added, updated, or removed.
- `PUBLISHED`: Assessment is active and takeable by enrolled trainees. Question modifications are locked. Structural validation (minimum 1 question, positive points, valid options) is required prior to publishing.
- `ARCHIVED`: Assessment is hidden from trainees but preserved for historical score reports.

### 3.2 Question Data Model
- `MCQ` (Multiple Choice): Supports custom array of options with exactly one correct option identifier.
- `TRUE_FALSE`: Server-normalized boolean choice options (`true` or `false`).
- Deterministic Ordering: Guaranteed via `order_index` with unique index `(assessment_id, order_index)`.

### 3.3 Strict Answer Key Isolation
- **DTO Safety Guarantee**: All pre-submission API endpoints (`GET /assessments`, `GET /assessments/:id`, `POST /assessments/:id/start`) explicitly omit `correct_answer` fields when servicing `TRAINEE` requests.
- Answer keys are never serialized to the frontend or exposed via error logs/debug fields.

### 3.4 Attempt Engine & Server-Side Timer Security
- Configurable Attempt Limits (`max_attempts`, default 3).
- **Single Active Attempt Constraint**: Partial unique index `UNIQUE(assessment_id, trainee_id) WHERE status = 'IN_PROGRESS'` prevents concurrent duplicate active attempts.
- **Authoritative Server Timer**: Expiration is calculated server-side (`started_at + time_limit_minutes`). Frontend timer is purely decorative; submissions made after `expires_at` return `ATTEMPT_EXPIRED` (400) and are marked `EXPIRED`.

### 3.5 Automated Server-Side Grading Engine
- Atomic PostgreSQL transaction locks the attempt row (`FOR UPDATE`), verifies state, loads authoritative correct answers, and computes scores:
  $$\text{Score Percentage} = \text{ROUND}\left(\left(\frac{\text{Total Points Earned}}{\text{Max Points Possible}}\right) \times 100, 2\right)$$
- Evaluates `passed` state (`score_percentage >= passing_score_percentage`).
- Malicious client-supplied scores, points, passed flags, or foreign question IDs are strictly ignored.

---

## 4. Database Schema (Migration 006)

### `assessments`
```sql
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  passing_score_percentage NUMERIC(5,2) NOT NULL DEFAULT 70.00 CHECK (passing_score_percentage BETWEEN 0 AND 100),
  time_limit_minutes INT DEFAULT NULL CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
  max_attempts INT NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### `assessment_questions`
```sql
CREATE TABLE assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('MCQ', 'TRUE_FALSE')),
  points INT NOT NULL DEFAULT 10 CHECK (points > 0),
  order_index INT NOT NULL CHECK (order_index >= 0),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assessment_id, order_index)
);
```

### `assessment_submissions`
```sql
CREATE TABLE assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL CHECK (attempt_number >= 1),
  score_percentage NUMERIC(5,2) DEFAULT NULL CHECK (score_percentage IS NULL OR (score_percentage BETWEEN 0 AND 100)),
  total_points_earned INT NOT NULL DEFAULT 0 CHECK (total_points_earned >= 0),
  max_points_possible INT NOT NULL DEFAULT 0 CHECK (max_points_possible >= 0),
  passed BOOLEAN DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED')),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NULL,
  graded_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_active_attempt_unique ON assessment_submissions (assessment_id, trainee_id) WHERE status = 'IN_PROGRESS';
```

---

## 5. API Endpoints Reference

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/assessments` | `ADMIN`, `TRAINER` | Create a new draft assessment |
| `GET` | `/api/v1/assessments` | `ADMIN`, `TRAINER`, `TRAINEE` | List organization assessments (Trainees get published & enrolled courses only) |
| `GET` | `/api/v1/assessments/metrics/organization` | `ADMIN`, `TRAINER` | Get organization assessment statistics |
| `GET` | `/api/v1/assessments/:assessmentId` | `ADMIN`, `TRAINER`, `TRAINEE` | Get assessment details (Safe DTO for Trainees) |
| `PATCH` | `/api/v1/assessments/:assessmentId` | `ADMIN`, `TRAINER` | Update assessment parameters |
| `POST` | `/api/v1/assessments/:assessmentId/publish` | `ADMIN`, `TRAINER` | Publish assessment |
| `POST` | `/api/v1/assessments/:assessmentId/questions` | `ADMIN`, `TRAINER` | Add question to draft assessment |
| `PATCH` | `/api/v1/assessments/:assessmentId/questions/:questionId` | `ADMIN`, `TRAINER` | Update question |
| `DELETE` | `/api/v1/assessments/:assessmentId/questions/:questionId` | `ADMIN`, `TRAINER` | Delete question |
| `POST` | `/api/v1/assessments/:assessmentId/start` | `TRAINEE` | Start an attempt (Requires active course enrollment) |
| `POST` | `/api/v1/assessments/:assessmentId/attempts/:submissionId/submit` | `TRAINEE` | Submit answers for automated server-side grading |
| `GET` | `/api/v1/assessments/:assessmentId/results` | `ADMIN`, `TRAINER`, `TRAINEE` | View results (Trainee sees own; Admin/Trainer sees org results) |

---

## 6. Security & Multi-Tenancy Guarantee

- **JWT Organization Isolation**: Organization scope (`req.user.organizationId`) is enforced by middleware and injected directly into SQL queries.
- **Cross-Tenant Prevention**: Operations against non-existent or foreign tenant resources return `404 Not Found` to prevent resource probing.
- **Enrollment Validation**: Trainees can only attempt assessments for courses where `enrollment.status IN ('ENROLLED', 'IN_PROGRESS')`.

---

## 7. Automated Test Suite Results

The Stage 4 automated test suite (`scratch/stage4_test_suite.js`) validates all 26 requirement categories against a real PostgreSQL database and Express server instance:

```text
====================================================
📊 STAGE 4 TEST SUITE SUMMARY: 42 PASSED, 0 FAILED
====================================================
```
