# Capacity Connect — Stage 5 Competency Engine & Skill Gap Analysis

## 1. Executive Summary

**Stage 5 — Competency Engine & Skill Gap Analysis** adds production-oriented competency management, custom weighted course mappings, real-time 70/30 performance evaluations, and organization-wide skill gap matrix visualizations to **Capacity Connect** (SIH 2026 — Smart Education LMS).

All competencies, mappings, and evaluations are strictly multi-tenant isolated via `organization_id` derived exclusively from JWT authentication tokens (`req.user.organizationId`).

---

## 2. Core Architecture & Policy Rules

### 2.1 The 70/30 Performance Evaluation Formula

Competency performance evaluation is locked to the enterprise standard **70/30 policy**:

$$\text{CourseCompetencyScore} = (\text{AssessmentScore} \times 0.70) + (\text{LessonProgress} \times 0.30)$$

#### Fallback Rules:
1. **Both Components Present**: $\text{AssessmentScore} \times 0.70 + \text{LessonProgress} \times 0.30$
2. **Only Assessment Present**: $\text{AssessmentScore}$
3. **Only Lesson Progress Present**: $\text{LessonProgress}$
4. **Neither Present**: $0.00\%$

#### Multi-Course Competency Normalization:
When a competency $C$ is mapped to multiple courses $c_1, c_2, \dots, c_n$ with custom weights $w_1, w_2, \dots, w_n$:

$$\text{CurrentScorePercentage} = \frac{\sum_{i=1}^{n} (w_i \times \text{CourseCompetencyScore}(c_i))}{\sum_{i=1}^{n} w_i}$$

Score is clamped strictly between $0.00\%$ and $100.00\%$.

---

### 2.2 Proficiency Level Boundaries

| Score Range | Proficiency Level | Description |
| :--- | :--- | :--- |
| **0.00% – 39.99%** | `NOVICE` | Foundational or introductory comprehension |
| **40.00% – 69.99%** | `INTERMEDIATE` | Working operational competency |
| **70.00% – 89.99%** | `ADVANCED` | Independent capability and high proficiency |
| **90.00% – 100.00%** | `EXPERT` | Mastery level capability |

---

### 2.3 Skill Gap Formula

$$\text{GapPercentage} = \max(0, \text{TargetScorePercentage} - \text{CurrentScorePercentage})$$

---

### 2.4 Transactional Hook Guarantee

Competency scores are reevaluated **synchronously inside the SAME PostgreSQL transaction (`BEGIN ... COMMIT`)** during:
1. Assessment submission (`submitAndGradeAttempt` in `assessment.repository.ts`).
2. Lesson completion / uncompletion (`updateLessonProgressAndRecalculate` in `enrollment.repository.ts`).

---

## 3. Database Schema (`007_competency_engine.sql`)

```sql
-- 1. COMPETENCY CATALOG TABLE
CREATE TABLE IF NOT EXISTS competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(100) DEFAULT 'General',
    target_score_percentage DECIMAL(5, 2) NOT NULL DEFAULT 80.00 CHECK (target_score_percentage >= 0.00 AND target_score_percentage <= 100.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_competencies_org_code UNIQUE (organization_id, code)
);

-- 2. COURSE COMPETENCY MAPPING TABLE
CREATE TABLE IF NOT EXISTS course_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    weight DECIMAL(5, 2) NOT NULL DEFAULT 1.00 CHECK (weight > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_course_competencies_course_competency UNIQUE (course_id, competency_id)
);

-- 3. TRAINEE COMPETENCY EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS trainee_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    current_score_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00 CHECK (current_score_percentage >= 0.00 AND current_score_percentage <= 100.00),
    proficiency_level VARCHAR(20) NOT NULL DEFAULT 'NOVICE' CHECK (proficiency_level IN ('NOVICE', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
    gap_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00 CHECK (gap_percentage >= 0.00 AND gap_percentage <= 100.00),
    last_evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_trainee_competencies_trainee_competency UNIQUE (trainee_id, competency_id)
);
```

---

## 4. REST API Endpoints Summary

Base Path: `/api/v1/competencies`

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/my-gaps` | `TRAINEE` | Trainee views their own evaluated competencies & remaining skill gaps |
| `GET` | `/organization-matrix` | `ADMIN`, `TRAINER` | Admin/Trainer views organization skill gap matrix heatmap |
| `GET` | `/` | All Roles | List tenant competencies |
| `POST` | `/` | `ADMIN`, `TRAINER` | Create a new competency |
| `GET` | `/:id` | All Roles | Get competency details and mapped courses |
| `PATCH` | `/:id` | `ADMIN`, `TRAINER` | Update competency details |
| `POST` | `/:id/map-course` | `ADMIN`, `TRAINER` | Map course to competency with custom weight |
| `DELETE` | `/:id/map-course/:courseId` | `ADMIN`, `TRAINER` | Remove course mapping |

---

## 5. Security & Multi-Tenancy

1. **Authorization Scoping**: `req.user.organizationId` strictly enforces multi-tenant boundaries. Any cross-tenant attempt returns `404 Not Found`.
2. **Trainee Privacy**: `/my-gaps` strictly derives identity from the authenticated JWT token payload (`req.user.id`). Query parameter overrides (e.g. `?userId=other`) are completely ignored.
3. **Role Restrictions**: Trainees attempting to create, edit, or map competencies, or view organization-wide matrix, receive `403 Forbidden`.
