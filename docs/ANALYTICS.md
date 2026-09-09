# Stage 10 — Organization-Wide Analytics & Executive Dashboard

## 1. Executive Architecture Summary

Stage 10 of **Capacity Connect** implements an enterprise-grade, deterministic organization-wide analytics and executive dashboard system for SIH 2026.

```text
Analytics metrics are 100% deterministic SQL aggregations.
Analytics does not use AI/ML, LLMs, or vector scoring.
PostgreSQL is authoritative.
Analytics is read-only with respect to Stage 0–9 domain tables.
```

The system aggregates authoritative PostgreSQL data across Enrollments (Stage 3), Assessments (Stage 4), Competencies & Skill Gaps (Stage 5), AI Recommendations (Stage 7), Trainer Matching (Stage 8), and Certificates (Stage 9) into executive dashboards, leaderboards, skill gap heatmaps, and trainee personal summaries.

---

## 2. Continuous Learning Loop Integration

Stage 10 closes the executive and managerial insight loop:

```text
LEARN (Stage 3)
  ↓
ASSESS (Stage 4)
  ↓
MEASURE COMPETENCY (Stage 5)
  ↓
IDENTIFY SKILL GAP (Stage 5)
  ↓
RECOMMEND COURSE (Stage 7)
  ↓
ENROLL (Stage 3)
  ↓
MATCH TRAINER (Stage 8)
  ↓
REQUEST SESSION (Stage 8)
  ↓
SESSION COMPLETED (Stage 8)
  ↓
VERIFY & ISSUE CERTIFICATE (Stage 9)
  ↓
STAGE 10: AGGREGATE METRICS & EXECUTIVE DASHBOARD
  ↓
ADMIN / TRAINER ACTIONABLE INSIGHTS
```

---

## 3. Database Schema & Snapshot Architecture

### 3.1 Migration `012_analytics.sql`

```sql
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_org_snapshot UNIQUE (organization_id, snapshot_type)
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_org
  ON analytics_snapshots (organization_id, snapshot_type, expires_at);
```

### 3.2 Performance & Cache Semantics

- **Read-Through TTL Cache**: When a dashboard request arrives:
  1. The database checks `analytics_snapshots` for a non-expired record (`expires_at > NOW()`).
  2. If found, cached JSONB data is returned in **< 5ms**.
  3. If missing or expired, a full deterministic SQL aggregation is computed in parallel, upserted via `ON CONFLICT (organization_id, snapshot_type) DO UPDATE`, and returned in **< 150ms**.
- **Admin Invalidation**: Admins can explicitly invalidate cached snapshots via `POST /analytics/invalidate-snapshot`.

---

## 4. Analytics Endpoints & Role-Based Access Control

| Endpoint | Method | Allowed Roles | Description |
|---|---|---|---|
| `/api/v1/analytics/org-dashboard` | GET | `ADMIN`, `TRAINER` | Full organization executive KPIs, funnel, pass rates, competency coverage, trainer stats. |
| `/api/v1/analytics/trainee-summary` | GET | `TRAINEE`, `TRAINER`, `ADMIN` | Personal learner summary (enrolled, completed, certs, avg score, skill gaps, sessions). |
| `/api/v1/analytics/course-leaderboard` | GET | `ADMIN`, `TRAINER` | Top courses by completion rate, enrollment count, and average score. |
| `/api/v1/analytics/trainee-leaderboard` | GET | `ADMIN` | Top trainees by certificates, completion count, and average score. |
| `/api/v1/analytics/skill-gap-distribution` | GET | `ADMIN`, `TRAINER` | Organization-wide competency matrix gap distribution and heatmap data. |
| `/api/v1/analytics/invalidate-snapshot` | POST | `ADMIN` | Manually evicts the organization's cached snapshot. |

---

## 5. Metric Calculations & Determinism

### 5.1 Enrollment Funnel & Rates
- **Total Enrollments**: `COUNT(*)` from `enrollments WHERE organization_id = $1`
- **Active Learners (30d)**: Distinct users with lesson progress or assessment attempts in the last 30 days.
- **Average Completion Rate**: `COALESCE(AVG(progress_percentage), 0)`

### 5.2 Assessment & Competency Metrics
- **Assessment Pass Rate**: `(COUNT(passed = true) / COUNT(attempts)) * 100`
- **Average Score**: `COALESCE(AVG(percentage_score), 0)`
- **Competency Coverage**: `(COUNT(DISTINCT measured_trainees) / total_trainees) * 100`

### 5.3 Zero-Data Safety
All SQL aggregations use `COALESCE`, `NULLIF`, and `ROUND` to guarantee:
- Zero division is mathematically prevented.
- Empty organizations or fresh trainees return valid numerical zeros (`0`), empty arrays `[]`, and clean schemas with no `null`, `undefined`, or `NaN` errors.

---

## 6. Multi-Tenant Security Guarantees

1. **Server-Derived Tenant Identity**: `organization_id` is strictly extracted from the cryptographically verified JWT (`req.user.organizationId`). Any client body or query parameter containing `organizationId` or `traineeId` is completely ignored.
2. **Strict RBAC Enforcement**: Trainees cannot query org dashboards, course leaderboards, trainee leaderboards, or skill gap distributions. Trainers are barred from trainee leaderboards and snapshot invalidation.
3. **Tenant Isolation**: All queries join against or filter strictly by `organization_id = $1`. Cross-tenant data leakage is structurally impossible.
