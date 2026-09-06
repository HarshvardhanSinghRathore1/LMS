# Capacity Connect

> **Digital Capacity Building & Learning Management Platform**
> **SIH 2026 — PS 26075 | Theme: Smart Education**

Capacity Connect is an AI-powered organizational capacity-building and Learning Management Platform that connects Trainees, Trainers, and Administrators. Unlike generic LMS platforms with chatbots, Capacity Connect revolves around a continuous competency development loop:

```
  LEARN ──► ASSESS ──► MEASURE COMPETENCY ──► IDENTIFY SKILL GAP
    ▲                                                │
    │                                                ▼
  LEARN AGAIN ◄── CONNECT WITH TRAINER ◄── RECOMMEND LEARNING
```

---

## Current Development Stage

**STAGE 3 — ENROLLMENT & PROGRESS TRACKING (COMPLETE & VERIFIED)**

Stage 3 delivers production-oriented Course Enrollment & Lesson Progress Tracking, enabling Trainees to enroll in published courses within their organization, track lesson completion in real time with visual progress indicators, automatically compute course completion percentages via database transactions, and allow Administrators and Trainers to monitor organization-wide learning progress metrics.

### Completed Stages:
- **Stage 0**: Modular monolith foundation, Express API setup, PostgreSQL migration runner, dynamic health monitoring (`/api/v1/health`), request tracing (`X-Request-ID`), error middleware, enterprise dark design system.
- **Stage 0.5**: LangChain orchestration layer, multi-provider baseline (OpenAI, Gemini, Hugging Face), vector embedding benchmark suite (`docs/EMBEDDING-EVALUATION.md` selecting `BAAI/bge-small-en-v1.5` locked to 384d), `002_vector_foundation.sql` pgvector schema with HNSW index, Graphiti temporal context microservice integration, and `/api/v1/health/ai`.
- **Stage 1**: Authentication & RBAC baseline (`003_authentication.sql`, `bcryptjs` password hashing, JWT access token & HttpOnly refresh token rotation, token family tracking, reuse detection, `/auth/*` routes, admin seed script, client AuthContext & login/register pages).
- **Stage 2**: Course Management (`004_course_management.sql`, Course/Module/Lesson CRUD, status lifecycle `DRAFT` -> `PUBLISHED` -> `ARCHIVED`, publish validation, non-blocking RAG vector indexing integration, Course Catalog `/courses`, Course Builder `/courses/create`, Course Detail `/courses/[id]`).
- **Stage 3**: Course Enrollment & Lesson Progress Tracking (`005_enrollment_progress.sql`, `course_enrollments` & `lesson_progress` tables, duplicate protection `409 Conflict`, draft course shielding `400 Bad Request`, transactional progress recalculation engine, status engine `ENROLLED` -> `IN_PROGRESS` -> `COMPLETED` @ 100.00%, `DROPPED` lifecycle, organization metrics `/enrollments/metrics/organization`, Trainee Learning Workspace `/my-learning`, `docs/ENROLLMENT-PROGRESS.md`, 21/21 automated tests passed).

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Custom Enterprise Dark Theme)
- **Icons**: Lucide React
- **HTTP Client**: Axios with Credentials (`withCredentials: true`) & 401 Interceptor Queue
- **State Management**: React AuthContext Provider

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js (Modular Monolith)
- **Language**: TypeScript
- **Database**: PostgreSQL with pgvector extension & HNSW indexing
- **Authentication**: JWT (`jsonwebtoken`), `bcryptjs`, Cookie Parser (`cookie-parser`)
- **Validation**: Zod
- **Security**: Helmet, CORS with credentials, Express Rate Limit, UUID (`X-Request-ID`)

---

## Repository Structure

```text
capacity-connect/
├── README.md
├── docs/
│   ├── AI-ARCHITECTURE.md          # Stage 0.5 AI, RAG, & Graphiti Architecture
│   ├── EMBEDDING-EVALUATION.md     # Vector embedding model benchmark report
│   ├── AUTH-ARCHITECTURE.md        # Stage 1 Authentication & Security Architecture
│   ├── COURSE-MANAGEMENT.md        # Stage 2 Course Management Architecture
│   └── ENROLLMENT-PROGRESS.md      # Stage 3 Enrollment & Progress Tracking Architecture
├── backend/
│   ├── src/
│   │   ├── config/                 # Env validation (Zod) & DB Pool
│   │   ├── middleware/             # Request ID, Auth, Authorize, OrgContext, Error Handler
│   │   ├── utils/                  # ApiError & ApiResponse helpers
│   │   ├── database/               # Migration runner, seedAdmin, SQL migrations (001-005)
│   │   ├── modules/
│   │   │   ├── health/             # Health API
│   │   │   ├── ai/                 # AI Infrastructure & Health
│   │   │   ├── auth/               # Auth Domain
│   │   │   ├── courses/            # Course Domain
│   │   │   └── enrollments/        # Enrollment & Progress Domain
│   │   ├── app.ts                  # Express application setup
│   │   └── server.ts               # HTTP server & graceful shutdown
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── app/                        # Next.js App Router (layout, page, login, register, courses, my-learning)
    ├── components/
    │   ├── ui/                     # Enterprise UI design system primitives
    │   └── auth/                   # ProtectedRoute & Role-aware UI components
    ├── context/                    # AuthContext Provider
    ├── lib/                        # API client, Auth API, Course API & Enrollment API helpers
    ├── package.json
    └── tsconfig.json
```

---

## Quick Start & Setup

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL database

### 1. Backend Setup

```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env

# Configure .env with your DATABASE_URL, JWT_ACCESS_SECRET, and JWT_REFRESH_SECRET

# Run database migrations (001, 002, 003, 004, 005)
npm run migrate

# Bootstrap Administrator user
npm run seed:admin

# Start backend dev server
npm run dev
```

The backend server will run on `http://localhost:5000`.

### 2. Frontend Setup

```bash
cd frontend
npm install

# Start frontend dev server
npm run dev
```

The frontend application will run on `http://localhost:3000`.

---

## Key API Endpoints

### Authentication

```text
POST /api/v1/auth/register    # Register new TRAINEE user
POST /api/v1/auth/login       # Authenticate user & receive access token + HttpOnly cookie
POST /api/v1/auth/refresh     # Rotate refresh token & issue new access token
POST /api/v1/auth/logout      # Revoke refresh token & clear HttpOnly cookie
GET  /api/v1/auth/me          # Retrieve current authenticated user profile
```

### Course Management

```text
GET    /api/v1/courses                    # List Course Catalog
GET    /api/v1/courses/:courseId          # Get Course Hierarchy (Course -> Modules -> Lessons)
POST   /api/v1/courses                    # Create Course (ADMIN, TRAINER)
PATCH  /api/v1/courses/:courseId          # Update Course Details (ADMIN, TRAINER)
POST   /api/v1/courses/:courseId/publish  # Publish Course & trigger non-blocking RAG Indexing
DELETE /api/v1/courses/:courseId          # Archive Course (ADMIN, TRAINER)
```

### Enrollment & Progress Tracking

```text
POST   /api/v1/enrollments                                    # Enroll in published course (TRAINEE)
GET    /api/v1/enrollments                                    # List trainee's enrollments (TRAINEE)
GET    /api/v1/enrollments/:enrollmentId                      # Get enrollment & lesson progress details
POST   /api/v1/enrollments/:enrollmentId/lessons/:id/complete   # Mark lesson complete & recalculate % (TRAINEE)
POST   /api/v1/enrollments/:enrollmentId/lessons/:id/uncomplete # Mark lesson uncomplete & recalculate % (TRAINEE)
POST   /api/v1/enrollments/:enrollmentId/drop                 # Drop course enrollment (TRAINEE)
GET    /api/v1/enrollments/metrics/organization               # View organization progress metrics (ADMIN, TRAINER)
```

---

## Development Stage Roadmap

- **STAGE 0 — Foundation & Architecture** `[COMPLETE]`
- **STAGE 0.5 — AI / RAG Foundation** `[COMPLETE]`
- **STAGE 1 — Authentication & RBAC** `[COMPLETE]`
- **STAGE 2 — Course Management** `[COMPLETE]`
- **STAGE 3 — Enrollment & Progress** `[COMPLETE]`
- **STAGE 4 — Assessment Engine** `[NEXT]`
- **STAGE 5 — Competency Engine**
- **STAGE 6 — AI Features**
- **STAGE 7 — Personalized Recommendations**
- **STAGE 8 — Intelligent Trainer Matching**
- **STAGE 9 — Certificates**
- **STAGE 10 — Analytics**
- **STAGE 11 — Notifications & Audit**
- **STAGE 12 — Advanced RAG & Persistent Context**
- **STAGE 13 — Production Hardening**
