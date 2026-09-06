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

**STAGE 0 — FOUNDATION ONLY**

Stage 0 establishes a production-grade modular monolith foundation with strict TypeScript types, PostgreSQL migration system, live health monitoring (`GET /api/v1/health`), security middleware, centralized Zod configuration, request tracing (`X-Request-ID`), and an enterprise dark design system.

Future stages (Auth, Courses, Assessments, AI features, RAG, Graphiti context) are architecturally prepared via interfaces and documentation, but NOT implemented in Stage 0.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Custom Enterprise Dark Theme)
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js (Modular Monolith)
- **Language**: TypeScript
- **Database**: PostgreSQL / Supabase
- **Driver & Pool**: `pg`
- **Validation**: Zod
- **Security**: Helmet, CORS, Express Rate Limit, UUID (`X-Request-ID`)

---

## Repository Structure

```text
capacity-connect/
├── README.md
├── .gitignore
├── docs/
│   └── AI-ARCHITECTURE.md          # Future AI, RAG, & Graphiti Architecture Specification
├── backend/
│   ├── src/
│   │   ├── config/                 # Env validation (Zod) & DB Pool
│   │   ├── middleware/             # Request ID, Logging, Error Handler, 404
│   │   ├── utils/                  # ApiError & ApiResponse helpers
│   │   ├── database/               # Migration runner & SQL migrations
│   │   ├── modules/health/         # Health API (Route -> Controller -> Service -> DB)
│   │   ├── providers/              # AI & Embedding provider interfaces
│   │   ├── app.ts                  # Express application setup
│   │   └── server.ts               # HTTP server & graceful shutdown
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── app/                        # Next.js App Router (layout, page, globals.css)
    ├── components/ui/              # Enterprise UI design system primitives
    ├── lib/                        # API client (Axios)
    ├── package.json
    ├── tailwind.config.ts
    └── tsconfig.json
```

---

## Quick Start & Setup

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL database (Local or Supabase)

### 1. Backend Setup

```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and supply your DATABASE_URL (e.g. postgresql://user:password@localhost:5432/capacity_connect)

# Run database migrations
npm run migrate

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

## API Health Check Endpoint

```http
GET /api/v1/health
```

### Healthy Response (`HTTP 200`):
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "capacity-connect-api",
    "database": "connected"
  },
  "message": "Capacity Connect API is healthy"
}
```

### Degraded Response (`HTTP 503`):
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_DEGRADED",
    "message": "Database connection unavailable",
    "details": null,
    "requestId": "8c6f-..."
  }
}
```

---

## Development Stage Roadmap

- **STAGE 0 — Foundation & Architecture** `[CURRENT]`
- **STAGE 0.5 — AI / RAG Foundation**
- **STAGE 1 — Authentication & RBAC**
- **STAGE 2 — Course Management**
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
