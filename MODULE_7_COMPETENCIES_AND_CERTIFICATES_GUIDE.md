# 📊 Module 7: Competency Mapping, Skill Gap Matrix & Digital Certificates

## 🌟 1. Overview & Purpose

Module 7 transforms **Capacity Connect** from a standard video-and-quiz LMS into an **Enterprise Talent Development & Skill Mastery Platform**.

It provides a closed-loop system for skill evaluation:
1. **For Trainees**: Tracks individual competency progress, pinpoints exact knowledge deficits, suggests targeted learning paths, and issues tamper-proof digital certificates upon course completion.
2. **For Admins & Trainers**: Delivers organization-wide skill gap heatmaps to identify workforce deficits, evaluate training ROI, and allocate resources effectively.
3. **For External Verifiers**: Provides a public QR-code certificate verification portal to guarantee credential authenticity without logging into the LMS.

---

## 🗺️ 2. End-to-End System Workflow

```text
               ┌────────────────────────────────────────────────────────┐
               │              1. Competency Taxonomy Setup              │
               │   Admin defines Skills, Categories & Target Levels     │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │             2. Course & Assessment Mapping             │
               │   Courses & Quizzes are tagged with Competencies       │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │          3. Trainee Completes Assessment/Quiz          │
               │   Backend calculates score & updates user proficiency  │
               └───────────────────────────┬────────────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
        ┌───────────────────────────────┐     ┌───────────────────────────────┐
        │  4A. Skill Gap Identification │     │   4B. Certificate Issuance    │
        │   Gap = Target - Current      │     │  Triggered if Score ≥ Passing │
        └───────────────┬───────────────┘     └───────────────┬───────────────┘
                        │                                     │
                        ▼                                     ▼
        ┌───────────────────────────────┐     ┌───────────────────────────────┐
        │ 5A. Org-Wide Heatmap Matrix & │     │  5B. Tamper-Proof QR & Code   │
        │ AI Smart Recommendations      │     │  Public Verification Portal   │
        └───────────────────────────────┘     └───────────────────────────────┘
```

---

## 🔍 3. Detailed Component Breakdown

### 🎯 Component A: Competency Taxonomy & Proficiency Scale

Skills are structured hierarchically under organizational categories (e.g., *Frontend Engineering, Cloud Infrastructure, Machine Learning, Database Optimization*).

Each competency uses a standard **5-Point Mastery Scale**:

| Level | Title | Description |
| :---: | :--- | :--- |
| **1** | **NOVICE** | Understands basic theoretical terminology and concepts. |
| **2** | **ADVANCED BEGINNER** | Can perform routine tasks with guidance and templates. |
| **3** | **COMPETENT** | Independently executes core operational workflows and problem-solving. |
| **4** | **PROFICIENT** | Capable of optimization, deep debugging, and handling edge cases. |
| **5** | **EXPERT** | Complete domain mastery, architectural leadership, and mentoring capability. |

---

### 🧮 Component B: Automated Scoring & Skill Gap Formulas

When a trainee submits an assessment:
1. **Raw Performance Calculation**:
   $$\text{Proficiency Score} = \left(\frac{\text{Points Earned for Competency}}{\text{Total Available Points for Competency}}\right) \times 5.0$$

2. **Skill Gap Formula**:
   $$\text{Skill Gap} = \max(0, \text{Target Proficiency} - \text{Current Proficiency})$$

3. **Status Classifications**:
   * 🟢 **MASTERED** ($\text{Gap} = 0$): Target proficiency achieved or exceeded.
   * 🟡 **MODERATE GAP** ($0.1 \le \text{Gap} \le 1.5$): Trainee has foundational knowledge but needs reinforcement.
   * 🔴 **CRITICAL DEFICIT** ($\text{Gap} > 1.5$): Major skill shortage requiring immediate remediation.

---

### 🗺️ Component C: Organization-Wide Skill Gap Matrix (Heatmap)

Accessible to **Admins** and **Trainers** at `/competencies`:

* **Workforce Overview**: Aggregates competency proficiencies across all registered users in the organization.
* **Heatmap Grid**: Visual color-coded table displaying:
  * Trainee Name / Department
  * Target vs. Current Proficiency per Skill
  * Percentage Coverage of organizational benchmarks
* **Strategic Training Insights**: Identifies organization-wide vulnerabilities (e.g., *"65% of engineers show a Critical Gap in Database Indexing"*).

---

### 💡 Component D: AI-Driven Smart Course Recommendations

Instead of static course catalogs, the recommendation engine continuously analyzes the trainee's active skill deficits:
1. Identifies all competencies marked **CRITICAL DEFICIT** or **MODERATE GAP**.
2. Queries the course catalog for courses tagged with those specific competency IDs.
3. Ranks recommendations by gap severity and prerequisites.
4. Renders a dedicated *"Recommended for Your Skill Gaps"* carousel on the Trainee Dashboard.

---

### 📜 Component E: Tamper-Proof Digital Certificates & QR Verification

When a trainee passes a course assessment with $\text{Score} \ge \text{passing\_score\_percentage}$ (e.g., 70%):

1. **Automatic Certificate Generation**:
   * Creates an immutable record in the `certificates` table.
   * Generates a unique, cryptographically random verification code (e.g., `CERT-CC-8F92-A1B4`).
2. **Public Verification Portal (`/verify-certificate/:certificateCode`)**:
   * Accessible publicly without requiring authentication or LMS login.
   * External verifiers (employers, LinkedIn viewers, certification boards) can scan the QR code to verify:
     * Student Full Name
     * Course Title & Issuing Organization
     * Issue Date & Final Score
     * List of Mastered Competencies
     * Cryptographic Authenticity Badge

---

## 🗄️ 4. Database Schema Reference

```sql
-- 1. COMPETENCIES TABLE
CREATE TABLE IF NOT EXISTS competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    target_proficiency INTEGER NOT NULL DEFAULT 3 CHECK (target_proficiency BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USER COMPETENCY SCORES TABLE
CREATE TABLE IF NOT EXISTS user_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    current_proficiency NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (current_proficiency BETWEEN 0.00 AND 5.00),
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, competency_id)
);

-- 3. CERTIFICATES TABLE
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    certificate_code VARCHAR(100) UNIQUE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}' -- Stores score, competencies mastered, signatures
);
```

---

## 🌐 5. API Endpoints Reference

### Competencies & Skill Gaps
* `GET /api/v1/competencies` — List organization competencies.
* `POST /api/v1/competencies` — Create new competency (Admin/Trainer).
* `GET /api/v1/competencies/my-gaps` — Get current trainee's skill gaps and proficiencies.
* `GET /api/v1/competencies/organization-matrix` — Retrieve organization-wide skill gap heatmap (Admin/Trainer).

### Digital Certificates
* `GET /api/v1/certificates/my-certificates` — Trainee lists earned certificates.
* `GET /api/v1/certificates/verify/:code` — Public endpoint to verify certificate authenticity.
* `GET /api/v1/certificates/:id/download` — Download printable certificate PDF.

---

## 📁 6. Source Code Directory Reference

| Component | File Path |
| :--- | :--- |
| **Competency Service** | [`backend/src/modules/competencies/competency.service.ts`](file:///c:/Users/Harshvardhan/OneDrive/Desktop/LMS/backend/src/modules/competencies/competency.service.ts) |
| **Competency Controller** | [`backend/src/modules/competencies/competency.controller.ts`](file:///c:/Users/Harshvardhan/OneDrive/Desktop/LMS/backend/src/modules/competencies/competency.controller.ts) |
| **Certificate Service** | [`backend/src/modules/certificates/certificate.service.ts`](file:///c:/Users/Harshvardhan/OneDrive/Desktop/LMS/backend/src/modules/certificates/certificate.service.ts) |
| **Certificate Controller** | [`backend/src/modules/certificates/certificate.controller.ts`](file:///c:/Users/Harshvardhan/OneDrive/Desktop/LMS/backend/src/modules/certificates/certificate.controller.ts) |
| **Frontend Competencies UI** | [`frontend/app/competencies/page.tsx`](file:///c:/Users/Harshvardhan/OneDrive/Desktop/LMS/frontend/app/competencies/page.tsx) |
| **Frontend Certificates UI** | [`frontend/app/certificates/page.tsx`](file:///c:/Users/Harshvardhan/OneDrive/Desktop/LMS/frontend/app/certificates/page.tsx) |
| **Public QR Verification Page** | [`frontend/app/verify-certificate/[certificateCode]/page.tsx`](file:///c:/Users/Harshvardhan/OneDrive/Desktop/LMS/frontend/app/verify-certificate/[certificateCode]/page.tsx) |
