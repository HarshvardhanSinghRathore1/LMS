# Stage 9 — Course Completion Verification & Verified Certificate Generation Engine

## 1. Executive Architecture Summary

Stage 9 of **Capacity Connect** implements an enterprise-grade, deterministic course completion verification and cryptographically signed certificate issuance system for SIH 2026.

```text
Certificate eligibility is deterministic.
Certificate issuance does not use AI.
Certificate verification does not use AI.
PostgreSQL is authoritative.
```

The system verifies completion against authoritative PostgreSQL state, generates tamper-proof certificates with SHA-256 canonical digests, snapshots trainee competencies at issuance time, provides a trainee certificate vault, and exposes an unauthenticated public verification engine.

---

## 2. Continuous Learning Loop Integration

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
TRAINER ACCEPTS & SESSION COMPLETED (Stage 8)
  ↓
VERIFY COMPLETION CRITERIA (Stage 9)
  ↓
ISSUE VERIFIED CERTIFICATE (Stage 9)
  ↓
PUBLIC CERTIFICATE VERIFICATION (Stage 9)
  ↓
LEARN AGAIN
```

---

## 3. Authoritative Completion Criteria

A trainee is eligible for a certificate if and only if **all criteria pass**:

### Criterion A — Active Enrollment
- `enrollment.status = 'COMPLETED'`
- `enrollment.progress_percentage = 100.00`
- `enrollment.trainee_id` matching authenticated JWT context
- `enrollment.organization_id` matching authenticated JWT context

### Criterion B — Mandatory Lessons
- Every published lesson belonging to the course must have `lesson_progress.is_completed = true`.
- Zero-lesson courses do not qualify.

### Criterion C — Assessment Requirements
- For every published course-associated assessment, the trainee must have at least one submitted attempt with `score_percentage >= 70.00`.
- Evaluated against authoritative `assessment_submissions.score_percentage`.
- If the course has zero published assessments, assessment eligibility is satisfied.

---

## 4. Final Score Calculation

```text
final_score_percentage =
    average of the trainee's latest SUBMITTED attempt score
    across published assessments associated with the course
```

If the course has no published assessments:
```text
final_score_percentage = enrollment.progress_percentage (100.00)
```

Values are clamped to `[0, 100]` and rounded to 2 decimal places server-side.

---

## 5. Competency Snapshot

At certificate issuance time, Stage 5 authoritative competency ratings associated with the course where proficiency is `ADVANCED` or `EXPERT` (score $\ge 75\%$) are snapshotted into `certificates.competencies_achieved` (JSONB).

Historical certificate data is immutable; later competency score changes do not mutate existing certificates.

---

## 6. Certificate Code Format

Format:
```text
CERT-CC-YYYY-XXXXX
```
- Uppercase string
- `YYYY` derived from `issued_at` year
- `XXXXX` cryptographically generated 5-character alphanumeric random string
- Checked for database uniqueness; retry logic handles rare collisions.

---

## 7. SHA-256 Canonicalization

Verification hash is generated over the exact canonical pipe-delimited payload:
```text
organization_id|enrollment_id|trainee_id|course_id|certificate_code|issued_at
```
where `issued_at` is a canonical UTC ISO-8601 string (`toISOString()`).

Output is exactly 64 hexadecimal characters.

---

## 8. Certificate Immutability & Lifecycle

Once issued, certificate identity fields (`organization_id`, `enrollment_id`, `trainee_id`, `course_id`, `certificate_code`, `verification_hash`, `issued_at`, `final_score_percentage`, `competencies_achieved`) are strictly immutable. No generic update APIs exist.

Database constraint enforces `UNIQUE(enrollment_id)`.

---

## 9. Transactional Issuance & Concurrency Protection

Certificate issuance executes inside a PostgreSQL transaction:
1. `SELECT FOR UPDATE` on `course_enrollments` row matching enrollment ID, trainee ID, organization ID.
2. Evaluate deterministic completion criteria.
3. Check existing certificate (returns existing if already present).
4. Calculate final score & snapshot competencies.
5. Generate unique code and canonical SHA-256 digest.
6. `INSERT INTO certificates`.
7. `COMMIT`.

Concurrent requests block safely on the row lock and return the single issued certificate without duplication.

---

## 10. Tenant Isolation & Security Model

- All authenticated trainee endpoints derive `organization_id` from verified JWT context.
- Trainees from Organization A cannot view or issue certificates for Organization B (`404 Not Found`).
- Client body input override attempts (injecting `finalScorePercentage`, `certificateCode`, `traineeId`, `organizationId`) are stripped and rejected; all authoritative values are computed server-side.

---

## 11. Public Unauthenticated Verification

Endpoint:
```text
GET /api/v1/certificates/verify/:certificateCode
```
- Operates **WITHOUT JWT** or session requirements.
- Publicly verifies certificate existence and re-computes SHA-256 digest against canonical stored data.
- Rate-limited and protected against SQL injection.

### Public Privacy Boundary
Exposes only public credential data: `certificateCode`, `traineeName`, `courseTitle`, `organizationName`, `finalScorePercentage`, `issuedAt`, `verificationHash`, `competenciesAchieved`.

Never exposes email, phone, passwords, internal UUIDs, assessment answers, or trainer notes.

---

## 12. API Endpoints

### Trainee (Authenticated)
- `POST /api/v1/certificates/issue`: Issue certificate for eligible completed enrollment. Body: `{ "enrollmentId": "uuid" }`.
- `GET /api/v1/certificates/my-certificates`: Retrieve all certificates for authenticated trainee.
- `GET /api/v1/certificates/:id`: Retrieve specific certificate details by ID.

### Public (Unauthenticated)
- `GET /api/v1/certificates/verify/:certificateCode`: Public credential verification.

---

## 13. Database Schema

Migration `011_certificates.sql`:
```sql
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL UNIQUE REFERENCES course_enrollments(id) ON DELETE CASCADE,
    trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    certificate_code VARCHAR(50) NOT NULL UNIQUE,
    verification_hash VARCHAR(64) NOT NULL,
    final_score_percentage NUMERIC(5,2) NOT NULL,
    competencies_achieved JSONB NOT NULL DEFAULT '[]'::jsonb,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_cert_score CHECK (final_score_percentage >= 0 AND final_score_percentage <= 100),
    CONSTRAINT chk_cert_hash_format CHECK (verification_hash ~ '^[0-9a-fA-F]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_certificates_org_trainee ON certificates(organization_id, trainee_id);
```
