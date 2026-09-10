# 🚀 Capacity Connect LMS — Complete End-to-End System Guide

Welcome to the comprehensive architectural and operational guide for **Capacity Connect**, an enterprise-grade, multi-tenant Learning Management System (LMS) with multimodal AI, pgvector RAG knowledge grounding, and automated assessment grading.

---

## 🏗️ 1. High-Level System Architecture

```text
                           ┌──────────────────────────────────────────────┐
                           │      Next.js 14 Modern Web Frontend          │
                           │  (Dashboard, Player, AI Studio, Assessments) │
                           └──────────────────────┬───────────────────────┘
                                                  │ HTTP / REST / JSON
                                                  ▼
                           ┌──────────────────────────────────────────────┐
                           │       Node.js + Express + TypeScript         │
                           │               API Backend                    │
                           ├──────────────────────────────────────────────┤
                           │  - Multi-Tenant Middleware (organization_id) │
                           │  - Role-Based Access Control (RBAC)          │
                           │  - AIProviderFactory (Google Gemini)         │
                           │  - Deterministic Validation Engine           │
                           │  - RAG Vector Retrieval Service              │
                           └──────────────┬───────────────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
   ┌─────────────────────────────┐                 ┌─────────────────────────────┐
   │    PostgreSQL Database      │                 │       Google Gemini API     │
   │  - Relational LMS Tables    │                 │  - Multimodal RAG Chat      │
   │  - pgvector (384d vectors)  │                 │  - Structured MCQ Engine    │
   │  - Audit Logs & Metrics     │                 │  - Lesson Notes Synthesizer │
   └─────────────────────────────┘                 └─────────────────────────────┘
```

---

## 👥 2. User Roles & Permission Matrix

| Role | Core Capabilities |
| :--- | :--- |
| **👑 ADMIN** | Manage organization users, view organization-wide skill gap matrices, inspect system audit logs, configure global AI providers, approve/publish courses and assessments. |
| **👨‍🏫 TRAINER** | Create/edit courses, import YouTube playlists, upload PDFs/videos, generate & review AI study notes and MCQs, schedule mentorship sessions, publish assessments. |
| **🎓 TRAINEE** | Enroll in courses, watch video lessons with synced notes, ask questions to the **Course AI Tutor**, take timed assessments, earn verified certificates, and track skill competencies. |

---

## 🔄 3. End-to-End Functional Modules & Flows

```text
                                  ┌─────────────────────────┐
                                  │   1. Organization &     │
                                  │   User Authentication   │
                                  └────────────┬────────────┘
                                               │
                                               ▼
                                  ┌─────────────────────────┐
                                  │  2. Course Studio &     │
                                  │  Playlist Auto-Import   │
                                  └────────────┬────────────┘
                                               │
                                               ▼
                                  ┌─────────────────────────┐
                                  │ 3. Automated Subtitles  │
                                  │ & AI Notes (Gemini)     │
                                  └────────────┬────────────┘
                                               │
                                               ▼
                                  ┌─────────────────────────┐
                                  │ 4. Vector Ingestion &   │
                                  │ RAG Knowledge Indexing  │
                                  └────────────┬────────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
          ┌───────────────────────────┐                 ┌───────────────────────────┐
          │   5. Trainee AI Tutor     │                 │   6. Topic-Grounded MCQ   │
          │   (Study & Chat Engine)   │                 │   Generation & Review     │
          └───────────────────────────┘                 └─────────────┬─────────────┘
                                                                      │
                                                                      ▼
                                                        ┌───────────────────────────┐
                                                        │  7. Assessments, Timers,  │
                                                        │  & Server-Side Grading    │
                                                        └─────────────┬─────────────┘
                                                                      │
                                                                      ▼
                                                        ┌───────────────────────────┐
                                                        │  8. Skill Gap Matrix &    │
                                                        │  Verified Certificates    │
                                                        └───────────────────────────┘
```

---

### 🔑 Module 1: Multi-Tenant Authentication & Security
* **Tenant Isolation**: Every user belongs to an `Organization` identified by a unique slug/code (e.g., `cc`).
* **JWT Tokens**: Login issues a signed Access Token containing `userId`, `role`, and `organizationId`.
* **Database Isolation**: Every query automatically scopes data with `WHERE organization_id = :orgId`. Cross-tenant data leakage is structurally impossible.

---

### 🎥 Module 2: Course Studio & YouTube Playlist Course Generator
* **Manual Course Creation**: Trainers organize material into **Courses ➔ Modules ➔ Lessons**.
* **1-Click YouTube Playlist Import**: 
  1. Trainer pastes any YouTube Playlist URL.
  2. The backend fetches playlist metadata via YouTube API.
  3. Automatically creates the complete course hierarchy: one ordered lesson for each video in the playlist with duration and description.
  4. Prevents duplicate phantom courses if the playlist was already imported.
* **Resource Attachments**: Trainers can upload accompanying PDF study materials and slides to any lesson.

---

### 📝 Module 3: Video Subtitles & AI Lesson Notes (English)
* **Caption Retrieval**: The system reads verified YouTube captions/subtitles directly for imported lessons.
* **Structured AI Notes Generation**:
  - Google Gemini digests the transcript.
  - Produces clean, structured English study notes: *Summary, Key Concepts, Code Snippets, Best Practices, and Review Questions*.
* **Zero-Fabrication Guardrail**: If a video lacks transcripts and materials, the system flags `NOT_GENERATED` rather than hallucinating fake content.

---

### 🧠 Module 4: Trainee AI Study Assistant (AI Tutor)
* **Hybrid Assistant Model**: Trainees can open the AI Tutor to ask **any** study question (e.g., *"Explain recursion like I am 10"* or *"What is the difference between TCP and UDP?"*).
* **Multimodal RAG Grounding**: If the question pertains to a course lesson, pgvector retrieves relevant transcript excerpts, notes, and PDF chunks to provide **source-attributed answers with clickable citations**.
* **Memory**: Multi-turn bounded memory retains context within a chat conversation.

---

### 🎯 Module 5: Topic-Grounded AI MCQ Generator & Trainer Review Hub
* **Strict Source Grounding**: Generates questions strictly based on the lesson's text, video transcripts, notes, and PDFs—not from the title alone.
* **Anti-Gibberish Validation Engine**:
  - Exactly 4 unique, plausible options.
  - Exactly 1 matching correct answer key.
  - Real educational explanations.
  - Difficulty distribution (`BALANCED`, `EASY`, `MEDIUM`, `HARD`).
  - Cognitive categories (`CONCEPTUAL`, `APPLICATION`, `SCENARIO`, `CODE`, `COMPARISON`).
  - Rejects duplicates using normalized Jaccard similarity.
* **Trainer Review Queue (`/ai-tools`)**:
  - `[✏️ Edit]`: Modify questions, options, or correct answer.
  - `[✨ Regenerate]`: 1-click replacement avoiding old question stems.
  - `[🗑️ Delete]`: Discard questions.
  - `[Approve & Import]`: Atomically import into live assessment questions.

---

### ⏱️ Module 6: Assessment Engine & Automated Grading
* **Timed Quizzes**: Support time limits, max attempt limits, and passing thresholds (e.g., 70%).
* **Answer-Key Security**: Trainees taking quizzes never receive `correct_answer` in the client response.
* **Authoritative Grading**: The backend evaluates answers upon submission, logs scores, calculates percentage, and determines pass/fail status.

---

### 📊 Module 7: Competency Mapping, Skill Gap Matrix & Certificates
* **Competency Tracking**: Links course outcomes to specific skill levels (e.g., *Frontend React, Database Optimization, Algorithms*).
* **Skill Gap Matrix**: Visual heatmaps show organizational skill proficiencies and areas needing improvement.
* **Smart Recommendations**: Suggests targeted courses based on trainee skill gaps.
* **Digital Certificates**:
  - Automatically issued upon passing course assessments.
  - Features unique verification codes and public QR-verification routes (`/verify-certificate/:code`).

---

### 🤝 Module 8: Trainer-Trainee Mentorship Matching
* Skill-based matching algorithm connects trainees needing assistance with expert trainers.
* Schedules mentorship sessions with status tracking and review feedback.

---

## 🗄️ 4. Data Entity Relationship Map

```text
Organizations (id, name, code)
  ├── Users (id, org_id, email, role: ADMIN | TRAINER | TRAINEE)
  ├── Courses (id, org_id, creator_id, title, status)
  │     ├── Course Modules (id, course_id, title, order_index)
  │     │     └── Course Lessons (id, module_id, title, video_url, transcript_text, notes)
  │     │           └── Lesson Resources (id, lesson_id, file_url, mime_type: PDF)
  │     └── Course Enrollments (id, course_id, trainee_id, status)
  ├── Documents & Document Chunks (id, org_id, content, embedding vector(384), metadata)
  ├── AI Generated Items (id, org_id, item_type: MCQ | STUDY_NOTES, status: PENDING_REVIEW | APPROVED)
  ├── Assessments (id, org_id, course_id, passing_score, max_attempts)
  │     ├── Assessment Questions (id, assessment_id, question_text, options, correct_answer)
  │     └── Assessment Submissions (id, assessment_id, trainee_id, score_percentage, status)
  ├── Certificates (id, org_id, course_id, trainee_id, certificate_code)
  └── Competencies & Skill Gaps (id, org_id, user_id, skill_name, proficiency_level)
```

---

## 🛠️ 5. Development & Execution Quick Reference

### Running Locally

```bash
# 1. Start Backend Server (Port 5000)
cd backend
npm run dev

# 2. Start Frontend App (Port 3000)
cd frontend
npm run dev
```

### Running Automated Test Suites

```bash
cd backend

# Test Stage 13: Video, Playlist Import, PDF & Notes RAG
node stage13_test_suite.js

# Test Stage 14: Trainee AI Tutor & General CS Assistant
node stage14_tutor_test_suite.js

# Test Stage 15: Topic-Grounded AI MCQ Generation & Review
node stage15_mcq_test_suite.js
```

---

## 🛡️ 6. Core Principles & Guarantees

1. **Quality Over Quantity**: If lesson materials only support 6 high-quality questions, the AI returns 6 valid questions instead of hallucinating 4 fake ones.
2. **Deterministic Verification**: AI proposes candidate content; deterministic TypeScript validation decides if it is acceptable.
3. **Human-in-the-Loop**: All AI-generated questions enter a review queue before ever being imported into student quizzes.
4. **Authoritative Security**: Client browsers are never trusted with answer keys, tenant IDs, or raw scoring.
