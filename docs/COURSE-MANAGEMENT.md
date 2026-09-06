# CAPACITY CONNECT — COURSE MANAGEMENT ARCHITECTURE

> **STATUS**: STAGE 2 COMPLETE & VERIFIED  
> **Domain Architecture**: Multi-Tenant Scoped Course Management + Nested Modules & Lessons + Role-Based Access Control (`ADMIN`, `TRAINER`, `TRAINEE`) + Non-blocking RAG Vector Indexing Integration.

---

## 1. Overview & Data Model

Course Management provides organizational capacity-building course structures within authoritative tenant boundaries (`organization_id`).

```text
Course (DRAFT / PUBLISHED / ARCHIVED)
  │
  ├── Module (order_index ASC)
  │     ├── Lesson (order_index ASC, Rich Markdown Body, Video URL)
  │     └── Lesson
  │
  └── Module
        └── Lesson
```

### Database Tables (`004_course_management.sql`)

1. **`courses`**:
   - `id`: UUID Primary Key
   - `organization_id`: UUID FK -> `organizations(id)`
   - `creator_id`: UUID FK -> `users(id)`
   - `title`: VARCHAR(255)
   - `description`: TEXT
   - `category`: VARCHAR(100)
   - `difficulty_level`: VARCHAR(20) (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`)
   - `status`: VARCHAR(20) (`DRAFT`, `PUBLISHED`, `ARCHIVED`)
   - `metadata`: JSONB
   - `created_at`, `updated_at`: TIMESTAMPTZ

2. **`course_modules`**:
   - `id`: UUID Primary Key
   - `course_id`: UUID FK -> `courses(id)` ON DELETE CASCADE
   - `title`: VARCHAR(255)
   - `description`: TEXT
   - `order_index`: INTEGER (UNIQUE per course)

3. **`course_lessons`**:
   - `id`: UUID Primary Key
   - `module_id`: UUID FK -> `course_modules(id)` ON DELETE CASCADE
   - `title`: VARCHAR(255)
   - `content_type`: VARCHAR(50) (e.g. `TEXT`, `VIDEO`)
   - `content_body`: TEXT (Markdown / Rich Text)
   - `video_url`: VARCHAR(500) (Optional resource link)
   - `duration_minutes`: INTEGER
   - `order_index`: INTEGER (UNIQUE per module)

---

## 2. Security & Multi-Tenant Authorization Rules

- **Authoritative Tenant Scoping**: All queries enforce `WHERE organization_id = req.user.organizationId` derived from the verified JWT token.
- **Nested Resource Security**: Module and lesson endpoints (`/courses/:courseId/modules`, `/courses/modules/:moduleId/lessons`) join back to `courses` and verify `course.organization_id = req.user.organizationId`.
- **Cross-Tenant Concealment**: Requests to access or modify resources belonging to another organization return `404 Not Found` to prevent leaking resource existence across tenants.
- **Role Permissions**:
  - **`ADMIN` / `TRAINER`**: Full CRUD permissions for courses, modules, lessons, and publishing workflow within their organization.
  - **`TRAINEE`**: Read-only access restricted strictly to **`PUBLISHED`** courses in their organization. Trainees cannot view `DRAFT` or `ARCHIVED` courses.

---

## 3. API Specification

```text
POST   /api/v1/courses                    # Create Course (ADMIN, TRAINER -> status DRAFT)
GET    /api/v1/courses                    # List Catalog (Paginated; PUBLISHED for TRAINEE, all for ADMIN/TRAINER)
GET    /api/v1/courses/:courseId          # Get Course Hierarchy (Course -> Modules -> Lessons)
PATCH  /api/v1/courses/:courseId          # Update Course Details (ADMIN, TRAINER)
POST   /api/v1/courses/:courseId/publish  # Publish Course & trigger RAG Indexing (ADMIN, TRAINER)
DELETE /api/v1/courses/:courseId          # Archive Course (ADMIN, TRAINER)

POST   /api/v1/courses/:courseId/modules  # Create Module (ADMIN, TRAINER)
PATCH  /api/v1/courses/modules/:moduleId  # Update Module (ADMIN, TRAINER)
DELETE /api/v1/courses/modules/:moduleId  # Delete Module (ADMIN, TRAINER)

POST   /api/v1/courses/modules/:moduleId/lessons # Create Lesson (ADMIN, TRAINER)
PATCH  /api/v1/courses/lessons/:lessonId         # Update Lesson (ADMIN, TRAINER)
DELETE /api/v1/courses/lessons/:lessonId         # Delete Lesson (ADMIN, TRAINER)
```

---

## 4. Publishing & Non-Blocking RAG Indexing Integration

### Validation Criteria
Before status is updated to `PUBLISHED`, the service validates:
1. Course exists and belongs to authoritative tenant.
2. Title and description are non-empty.
3. Course contains at least 1 module.
4. Course contains at least 1 lesson across its modules.

### RAG Vector Indexing Pipeline
When published:
1. The service constructs a canonical text document representing the course, modules, and lessons.
2. It generates text chunks (500-char blocks) and calls `HuggingFaceEmbeddingProvider` to produce 384-dimensional vector embeddings.
3. It stores the document in `documents` (`document_type = 'course_material'`) and chunks in `document_chunks` with `organization_id` preserved.
4. **Idempotency**: Existing document records for `course:{courseId}` are purged prior to insertion to prevent vector duplication.
5. **Non-Blocking Resilience**: If the embedding provider is offline or degraded, the course publication remains successful while raw text chunks are indexed safely for future vector generation.
