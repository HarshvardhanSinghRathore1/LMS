# Stage 7 — Personalized Recommendations & Adaptive Learning Path Engine Documentation

## 1. Purpose

The Stage 7 Recommendation Engine provides enterprise-grade, deterministic personalized course recommendations and adaptive learning pathways for Capacity Connect. It closes the continuous-learning feedback loop by analyzing trainee skill gaps calculated in Stage 5, mapping course competencies, and considering historical completion rates.

> **CRITICAL ARCHITECTURAL DIRECTIVE**:
> Stage 7 recommendation scoring is 100% deterministic and calculated entirely from PostgreSQL LMS data. It does **NOT** use OpenAI, Gemini, Hugging Face, LangChain, Graphiti, RAG, or any probabilistic LLM-generated scoring or ranking.

---

## 2. Architecture

```text
                  PostgreSQL LMS Data
                          │
          ┌───────────────┴───────────────┐
          │                               │
     Stage 3                         Stage 4
 Enrollment / Progress             Assessments
          │                               │
          └───────────────┬───────────────┘
                          ↓
                       Stage 5
               Competency & Skill Gap
                          │
                          ↓
                       Stage 7
             Deterministic Recommendations
                          │
             ┌────────────┴────────────┐
             ↓                         ↓
       Ranked Courses            Adaptive Pathway
             │
             ↓
    Atomic Accept & Enroll
             │
             ↓
     Stage 3 Enrollment ──→ LEARN AGAIN
```

---

## 3. Database Schema

Migration `009_recommendations.sql` defines the `recommendations` table:

```sql
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES competencies(id) ON DELETE SET NULL,
  match_score NUMERIC(5,2) NOT NULL CHECK (match_score >= 0.00 AND match_score <= 100.00),
  gap_percentage_addressed NUMERIC(5,2) NOT NULL CHECK (gap_percentage_addressed >= 0.00 AND gap_percentage_addressed <= 100.00),
  recommendation_reason TEXT NOT NULL,
  recommendation_type VARCHAR(20) NOT NULL CHECK (recommendation_type IN ('PERSONALIZED', 'COLD_START')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'DISMISSED', 'ENROLLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_trainee_course UNIQUE (trainee_id, course_id)
);
```

---

## 4. Candidate Eligibility Rules

Candidate courses MUST satisfy:
- `course.organization_id = authenticated organizationId`
- `course.status = 'PUBLISHED'`

Trainee course state exclusions:
- **Excluded**: `ENROLLED`, `IN_PROGRESS`, `COMPLETED`
- **Allowed**: `DROPPED` or no prior enrollment record

Cross-tenant courses, draft courses, and archived courses are strictly excluded.

---

## 5. Deterministic 3-Factor Scoring Model

Every candidate course is evaluated against 3 normalized factors (0–100):

$$RecommendationScore = (SkillGapFactor \times 0.60) + (CompetencyMappingFactor \times 0.25) + (CompletionRateFactor \times 0.15)$$

1. **Skill Gap Factor (60% Weight)**:
   $$gapPercentage = \max(0, targetScorePercentage - currentScorePercentage)$$
   $$SkillGapFactor = \text{clamp}(gapPercentage, 0, 100)$$

2. **Competency Mapping Factor (25% Weight)**:
   $$CompetencyMappingFactor = \text{clamp}\left(\frac{courseCompetencyWeight}{maxRelevantMappingWeight} \times 100, 0, 100\right)$$

3. **Completion Rate Factor (15% Weight)**:
   $$CompletionRateFactor = \text{clamp}\left(\frac{completedEnrollments}{eligibleEnrollments} \times 100, 0, 100\right)$$
   *(Returns 0 if `eligibleEnrollments` = 0)*

---

## 6. Multi-Competency Selection & Tie-Breaking

For courses mapped to multiple competencies, the primary competency is selected using deterministic priority calculation:
$$\text{priority} = gapPercentage \times normalizedMappingWeight$$

Tie-Breaking Hierarchy:
1. Highest `priority` DESC
2. Highest `gapPercentage` DESC
3. Highest raw course competency `weight` DESC
4. Competency code ASC (`competency.code` ASC)

---

## 7. Cold-Start Behavior

If a trainee has no evaluated competency records in `trainee_competencies`:
- `recommendation_type = 'COLD_START'`
- `competency_id = NULL`
- `gap_percentage_addressed = 0`
- Ranked deterministically by: `CompletionRateFactor DESC`, `course.title ASC`, `course.id ASC`

---

## 8. Lifecycle & Terminal States

Recommendations follow a strict state transition model:

```text
               ┌──────────┐
               │  ACTIVE  │
               └────┬─────┘
                    │
         ┌──────────┴──────────┐
         ↓                     ↓
   ┌───────────┐         ┌───────────┐
   │ DISMISSED │         │ ENROLLED  │
   └───────────┘         └───────────┘
   (Terminal)            (Terminal)
```

- **ACTIVE**: Recommendation is active and will be refreshed when competency state changes.
- **DISMISSED**: User dismissed recommendation. Refresh will NEVER update or resurrect a `DISMISSED` record.
- **ENROLLED**: Recommendation accepted and course enrolled. Terminal state.

---

## 9. Atomic Accept & Enrollment

Accepting a recommendation (`POST /api/v1/recommendations/:id/accept`) runs inside a single PostgreSQL transaction:
1. `BEGIN`
2. Row-lock recommendation: `SELECT * FROM recommendations WHERE id = $1 AND trainee_id = $2 AND organization_id = $3 FOR UPDATE;`
3. Validate `status == 'ACTIVE'`.
4. Row-lock course: `SELECT * FROM courses WHERE id = rec.course_id AND organization_id = $3 FOR UPDATE;`
5. Delegate to Stage 3 enrollment creation using the same transaction client.
6. Update recommendation: `UPDATE recommendations SET status = 'ENROLLED', updated_at = NOW() WHERE id = rec.id;`
7. `COMMIT`

If any step fails, `ROLLBACK` is executed, preventing partial or inconsistent state.

---

## 10. Adaptive Learning Pathway Algorithm

`GET /api/v1/recommendations/pathway` returns structured pathway steps ordered deterministically:
1. Course modules sorted by `module.order_index ASC`.
2. Course lessons sorted by `lesson.order_index ASC`.
3. Assessments sorted deterministically (`assessment.title ASC, assessment.id ASC`).
4. Completed lessons marked `completed = true` based on Stage 3 lesson progress; completed assessments marked `completed = true` based on Stage 4 submissions.

---

## 11. API Endpoints

All endpoints require JWT authentication, organization tenant header/cookie, and `TRAINEE` role.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/recommendations/generate` | Generate or refresh active recommendations |
| `GET` | `/api/v1/recommendations/my` | List active recommendations for authenticated trainee |
| `POST` | `/api/v1/recommendations/:id/dismiss` | Dismiss an active recommendation |
| `POST` | `/api/v1/recommendations/:id/accept` | Atomically accept recommendation and enroll in course |
| `GET` | `/api/v1/recommendations/pathway` | Get adaptive step-by-step learning pathway |

---

## 12. Continuous Learning Loop

```text
LEARN ──→ ASSESS ──→ MEASURE COMPETENCY ──→ IDENTIFY SKILL GAP ──→ RECOMMEND ──→ ENROLL ──→ LEARN AGAIN
```

Stage 7 completes this loop by re-evaluating recommendations whenever Stage 4 assessment evaluation updates Stage 5 competency scores.
