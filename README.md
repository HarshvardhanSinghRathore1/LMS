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

**STAGE 1 — AUTHENTICATION & RBAC (COMPLETE & VERIFIED)**

Stage 1 builds a production-oriented authentication, multi-tenant organization context, and role-based authorization control (RBAC) baseline supporting `ADMIN`, `TRAINER`, and `TRAINEE` roles.

### Completed Stages:
- **Stage 0**: Modular monolith foundation, Express API setup, PostgreSQL migration runner, dynamic health monitoring (`/api/v1/health`), request tracing (`X-Request-ID`), error middleware, enterprise dark design system.
- **Stage 0.5**: LangChain orchestration layer, multi-provider baseline (OpenAI, Gemini, Hugging Face), vector embedding benchmark suite (`docs/EMBEDDING-EVALUATION.md` selecting `BAAI/bge-small-en-v1.5` locked to 384d), `002_vector_foundation.sql` pgvector schema with HNSW index, Graphiti temporal context microservice integration, and `/api/v1/health/ai`.
- **Stage 1**: Authentication & RBAC baseline (`003_authentication.sql`, `bcryptjs` password hashing, JWT access token & HttpOnly refresh token rotation, token family tracking, reuse detection, `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/test/*` RBAC routes, admin seed script, client AuthContext & login/register pages).

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
- **Database**: PostgreSQL with pgvector extension & SHA-256 session tracking
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
│   └── AUTH-ARCHITECTURE.md        # Stage 1 Authentication & Security Architecture
├── backend/
│   ├── src/
│   │   ├── config/                 # Env validation (Zod) & DB Pool
│   │   ├── middleware/             # Request ID, Auth, Authorize, OrgContext, Error Handler
│   │   ├── utils/                  # ApiError & ApiResponse helpers
│   │   ├── database/               # Migration runner, seedAdmin, SQL migrations
│   │   ├── modules/
│   │   │   ├── health/             # Health API
│   │   │   ├── ai/                 # AI Infrastructure & Health
│   │   │   └── auth/               # Auth Route -> Controller -> Service -> Repository
│   │   ├── app.ts                  # Express application setup
│   │   └── server.ts               # HTTP server & graceful shutdown
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── app/                        # Next.js App Router (layout, page, login, register)
    ├── components/
    │   ├── ui/                     # Enterprise UI design system primitives
    │   └── auth/                   # ProtectedRoute & Role-aware UI components
    ├── context/                    # AuthContext Provider
    ├── lib/                        # API client & Auth API helpers
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

# Run database migrations (001, 002, 003)
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

## Authentication Endpoints

```text
POST /api/v1/auth/register    # Register new TRAINEE user
POST /api/v1/auth/login       # Authenticate user & receive access token + HttpOnly cookie
POST /api/v1/auth/refresh     # Rotate refresh token & issue new access token
POST /api/v1/auth/logout      # Revoke refresh token & clear HttpOnly cookie
GET  /api/v1/auth/me          # Retrieve current authenticated user profile
GET  /api/v1/auth/test/admin  # RBAC test endpoint requiring ADMIN role
GET  /api/v1/auth/test/trainer# RBAC test endpoint requiring TRAINER or ADMIN role
GET  /api/v1/auth/test/trainee# RBAC test endpoint requiring TRAINEE, TRAINER, or ADMIN role
```

---

## Development Stage Roadmap

- **STAGE 0 — Foundation & Architecture** `[COMPLETE]`
- **STAGE 0.5 — AI / RAG Foundation** `[COMPLETE]`
- **STAGE 1 — Authentication & RBAC** `[COMPLETE]`
- **STAGE 2 — Course Management** `[NEXT]`
- **STAGE 3 — Enrollment & Progress**
- **STAGE 4 — Assessment Engine**
- **STAGE 5 — Competency Engine**
- **STAGE 6 — AI Features**
- **STAGE 7 — Personalized Recommendations**
- **STAGE 8 — Intelligent Trainer Matching**
- **STAGE 9 — Certificates**
- **STAGE 10 — Analytics**
- **STAGE 11 — Notifications & Audit**
- **STAGE 12 — Advanced RAG & Persistent Context**
- **STAGE 13 — Production Hardening**
