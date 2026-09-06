# Capacity Connect — Stage 3: Enrollment & Progress Tracking Architecture

## 1. Overview & Architecture Vision

Stage 3 implements production-oriented **Course Enrollment & Lesson Progress Tracking** for Capacity Connect.

The enrollment and progress subsystem empowers `TRAINEE` users to discover and enroll in published organizational courses, track lesson completion in real time with visual feedback, automatically compute exact course completion percentages via database transactions, and allow `ADMIN` and `TRAINER` users to monitor tenant-isolated learning progress metrics.

```text
TRAINEE → POST /api/v1/enrollments (Course ID)
              ↓
      Validate Publication & Multi-Tenant Scoping (req.user.organizationId)
              ↓
      Database Unique Constraint Check (course_id, trainee_id)
              ↓
      Insert Record (status: ENROLLED, progress: 0.00%)
              ↓
TRAINEE → POST /api/v1/enrollments/:id/lessons/:lessonId/complete
              ↓
      PostgreSQL Transaction (BEGIN -> FOR UPDATE enrollment -> Upsert lesson_progress -> Recalculate % -> COMMIT)
              ↓
      Status Update (ENROLLED -> IN_PROGRESS -> COMPLETED @ 100.00%)
```

---

## 2. Enrollment Lifecycle State Engine

An enrollment follows a deterministic state machine managed entirely by the server:

```text
              [PUBLISHED COURSE]
                      │
                      ▼
               ┌──────────────┐
               │   ENROLLED   │  (progress = 0.00%)
               └──────┬───────┘
                      │
            First Lesson Completed
                      │
                      ▼
               ┌──────────────┐
               │ IN_PROGRESS  │  (0.00% < progress < 100.00%)
               └──────┬───────┘
                      │
            All Lessons Completed
                      │
                      ▼
               ┌──────────────┐
               │  COMPLETED   │  (progress = 100.00%, completed_at set)
               └──────────────┘

        [ Any Active State ] ──( Drop Action )──► ┌──────────────┐
                                                  │   DROPPED    │ (Terminal State)
                                                  └──────────────┘
```

1. **`ENROLLED`**: Initial state when a trainee enrolls. `progress_percentage = 0.00`, `completed_lessons_count = 0`.
2. **`IN_PROGRESS`**: Triggered automatically when `0 < completed_lessons_count < total_lessons_count`. `completed_at` remains `NULL`.
3. **`COMPLETED`**: Triggered automatically when `completed_lessons_count === total_lessons_count` (`total > 0`). Sets `completed_at = CURRENT_TIMESTAMP` and progress to `100.00%`.
4. **`DROPPED`**: Trainee chooses to drop the course. Dropped enrollments preserve historical records but block any further progress updates.

---

## 3. Database Schema & Multi-Tenant Isolation (`005_enrollment_progress.sql`)

### `course_enrollments` Table
```sql
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
```

### `lesson_progress` Table
```sql
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
```

---

## 4. Security & Isolation Guarantees

1. **Authoritative Organization Scoping**: All queries derive tenant identity strictly from `req.user.organizationId` in the verified JWT.
2. **Authoritative Trainee Identity**: Client payloads submitting `traineeId` or `organizationId` are ignored or rejected. The server injects `req.user.id`.
3. **Cross-Tenant Concealment**: Requests to access courses or enrollments in another organization return `404 Not Found`.
4. **Cross-Course Lesson Protection**: Every lesson progress update verifies inside a transaction that `lesson.module.course_id === enrollment.course_id`.
5. **Race-Condition Duplicate Defense**: `UNIQUE(course_id, trainee_id)` at the database level guarantees atomic duplicate protection under high concurrency.

---

## 5. API Reference

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/enrollments` | `TRAINEE` | Enroll in a published course |
| `GET` | `/api/v1/enrollments` | `TRAINEE` | List current trainee's enrollments |
| `GET` | `/api/v1/enrollments/:id` | `TRAINEE`, `ADMIN`, `TRAINER` | Fetch detailed enrollment and lesson progress |
| `POST` | `/api/v1/enrollments/:id/lessons/:lessonId/complete` | `TRAINEE` | Mark lesson completed & recalculate % |
| `POST` | `/api/v1/enrollments/:id/lessons/:lessonId/uncomplete` | `TRAINEE` | Mark lesson uncompleted & recalculate % |
| `POST` | `/api/v1/enrollments/:id/drop` | `TRAINEE` | Drop course enrollment |
| `GET` | `/api/v1/enrollments/metrics/organization` | `ADMIN`, `TRAINER` | Fetch organization learning progress metrics |

---

## 6. Verification Results

Automated test suite (`scratch/stage3_test_suite.js`):

- **Health Checks & Regression**: 2/2 Passed
- **Authentication Setup**: 3/3 Passed
- **Course Creation & Publication**: 3/3 Passed
- **Trainee Enrollment & Progress Calculation**: 4/4 Passed
- **Duplicate & Draft Course Defense**: 2/2 Passed
- **Completion & Uncompletion State Transitions**: 2/2 Passed
- **Dropped Enrollment Progress Shielding**: 2/2 Passed
- **Tenant Isolation & Security Immunity**: 3/3 Passed

**Total: 21 / 21 Tests Passed (100% Success Rate).**
