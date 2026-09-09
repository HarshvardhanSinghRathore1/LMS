# Stage 8 — Intelligent Trainer Matching Engine Documentation

## 1. Purpose
Stage 8 of **Capacity Connect** connects Trainees with verified Trainers within the same organization using a **100% deterministic, explainable PostgreSQL-based matching engine**. 

**Explicit Statement:**
> **Stage 8 trainer matching is deterministic and does not use an LLM or vector similarity.**

---

## 2. Continuous-Learning Loop Integration
Stage 8 integrates seamlessly into the enterprise competency lifecycle:

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
TRAINER ACCEPTS (Stage 8)
  ↓
SESSION COMPLETED (Stage 8)
  ↓
LEARN AGAIN
```

---

## 3. Database Schema (`010_trainer_matching.sql`)

### 3.1 `trainer_profiles`
Stores trainer profile metadata and capacity parameters:
- `id`: `UUID PRIMARY KEY`
- `organization_id`: `UUID NOT NULL REFERENCES organizations(id)`
- `user_id`: `UUID NOT NULL UNIQUE REFERENCES users(id)`
- `bio`: `TEXT`
- `headline`: `VARCHAR(255)`
- `years_of_experience`: `INTEGER NOT NULL DEFAULT 0 CHECK (years_of_experience >= 0)`
- `hourly_capacity`: `INTEGER NOT NULL DEFAULT 10 CHECK (hourly_capacity >= 0)`
- `average_rating`: `NUMERIC(3,2) NOT NULL DEFAULT 5.00 CHECK (average_rating >= 0 AND average_rating <= 5)`
- `total_reviews`: `INTEGER NOT NULL DEFAULT 0 CHECK (total_reviews >= 0)`
- `is_available`: `BOOLEAN NOT NULL DEFAULT TRUE`

### 3.2 `trainer_competency_expertise`
Maps verified trainer expertise to competencies within the same organization:
- `id`: `UUID PRIMARY KEY`
- `organization_id`: `UUID NOT NULL REFERENCES organizations(id)`
- `trainer_id`: `UUID NOT NULL REFERENCES trainer_profiles(id)`
- `competency_id`: `UUID NOT NULL REFERENCES competencies(id)`
- `proficiency_level`: `VARCHAR(20) NOT NULL CHECK (proficiency_level IN ('ADVANCED', 'EXPERT'))`
- `years_experience`: `INTEGER NOT NULL DEFAULT 1 CHECK (years_experience >= 0)`
- `UNIQUE(trainer_id, competency_id)`

### 3.3 `trainer_session_requests`
Tracks 1-on-1 mentorship session lifecycle requests:
- `id`: `UUID PRIMARY KEY`
- `organization_id`: `UUID NOT NULL REFERENCES organizations(id)`
- `trainee_id`: `UUID NOT NULL REFERENCES users(id)`
- `trainer_id`: `UUID NOT NULL REFERENCES trainer_profiles(id)`
- `competency_id`: `UUID NULL REFERENCES competencies(id)`
- `status`: `VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED'))`
- `topic`: `VARCHAR(255) NOT NULL`
- `notes`: `TEXT NULL`
- `requested_slot`: `TIMESTAMPTZ NULL`

---

## 4. Deterministic Matching Formula (40 / 25 / 20 / 15)

The match score is strictly calculated using:

$$\text{MatchScore} = (\text{SkillGapFit} \times 0.40) + (\text{RatingFactor} \times 0.25) + (\text{ExperienceFactor} \times 0.20) + (\text{CapacityFactor} \times 0.15)$$

All factors are normalized to $[0, 100]$. Final scores are rounded to 2 decimal places.

### 4.1 Factor Breakdown
1. **Skill Gap Fit (40%)**:
   - Matches trainee positive skill gaps ($\text{gap} = \max(0, \text{target} - \text{current})$) from `trainee_competencies` against trainer mapped expertise (`ADVANCED` = 75, `EXPERT` = 100).
   - $\text{SkillGapFit} = \frac{\sum (\text{gapPercentage} \times \text{expertiseStrength})}{\sum \text{matchedGapPercentage}}$
2. **Rating Factor (25%)**:
   - $\text{RatingFactor} = \frac{\text{average\_rating}}{5} \times 100$
3. **Experience Factor (20%)**:
   - $\text{ExperienceFactor} = \frac{\min(\text{years\_of\_experience}, 10)}{10} \times 100$
4. **Capacity Factor (15%)**:
   - $\text{activeSessions} = \text{COUNT}(\text{PENDING} + \text{ACCEPTED})$
   - $\text{remainingCapacity} = \max(0, \text{hourly\_capacity} - \text{activeSessions})$
   - $\text{CapacityFactor} = \frac{\text{remainingCapacity}}{\text{hourly\_capacity}} \times 100$

### 4.2 Score Verification Example
Given:
- $\text{SkillGapFit} = 80 \Rightarrow 80 \times 0.40 = 32.0$
- $\text{RatingFactor} = 90 \Rightarrow 90 \times 0.25 = 22.5$
- $\text{ExperienceFactor} = 70 \Rightarrow 70 \times 0.20 = 14.0$
- $\text{CapacityFactor} = 100 \Rightarrow 100 \times 0.15 = 15.0$

**Total Match Score = 83.50**

---

## 5. Session State Machine & Concurrency Rules

### 5.1 Valid State Transitions
Only the following transitions are valid:

```text
PENDING
   ├──→ ACCEPTED (Trainer only)
   ├──→ DECLINED (Trainer only)
   └──→ CANCELLED (Trainee only)

ACCEPTED
   ├──→ COMPLETED (Trainer only)
   └──→ CANCELLED (Trainee/Trainer)
```

Terminal states (`DECLINED`, `COMPLETED`, `CANCELLED`) cannot transition and produce `HTTP 409 Conflict`.

### 5.2 Transaction Locking & Concurrency Protection
Session creation executes inside a PostgreSQL transaction using row locking:
```sql
BEGIN;
SELECT * FROM trainer_profiles 
WHERE id = $1 AND organization_id = $2 
FOR UPDATE OF trainer_profiles;

-- Count active PENDING + ACCEPTED sessions
-- Verify remaining capacity > 0
-- Check requested_slot conflict for active sessions
INSERT INTO trainer_session_requests ...;
COMMIT;
```

---

## 6. API Reference

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/trainer-matching/matches` | `TRAINEE` | Get ranked trainer matches for authenticated trainee |
| `POST` | `/api/v1/trainer-matching/sessions` | `TRAINEE` | Request a 1-on-1 session with a trainer |
| `GET` | `/api/v1/trainer-matching/my-sessions` | `TRAINEE` | List session requests created by trainee |
| `GET` | `/api/v1/trainer-matching/profile` | `TRAINER` | View trainer profile self-service |
| `POST` | `/api/v1/trainer-matching/profile` | `TRAINER` | Create trainer profile self-service |
| `PATCH` | `/api/v1/trainer-matching/profile` | `TRAINER` | Update trainer profile & capacity self-service |
| `GET` | `/api/v1/trainer-matching/profile/expertise` | `TRAINER` | View mapped competency expertise |
| `POST` | `/api/v1/trainer-matching/profile/expertise` | `TRAINER` | Add competency expertise (`ADVANCED`/`EXPERT`) |
| `DELETE` | `/api/v1/trainer-matching/profile/expertise/:id` | `TRAINER` | Delete mapped competency expertise |
| `GET` | `/api/v1/trainer-matching/sessions` | `TRAINER` | List incoming session requests for trainer |
| `POST` | `/api/v1/trainer-matching/sessions/:id/accept` | `TRAINER` | Accept a pending session request |
| `POST` | `/api/v1/trainer-matching/sessions/:id/decline` | `TRAINER` | Decline a pending session request |
| `POST` | `/api/v1/trainer-matching/sessions/:id/complete` | `TRAINER` | Mark an accepted session as completed |
| `POST` | `/api/v1/trainer-matching/sessions/:id/cancel` | `TRAINEE` / `TRAINER` | Cancel a pending or accepted session request |

---

## 7. Verification & Testing
Stage 8 is fully verified via `scratch/stage8_test_suite.js` executing 60+ assertions covering scoring exactness (83.50), state machine 409 rejections, PostgreSQL transaction locking, double-booking prevention, tenant security isolation, and Stages 1–7 regression tests.
