# Stage 11 — Notifications & Enterprise Audit Trail Engine

## 1. Executive Summary

Stage 11 of **Capacity Connect** implements an event-driven notification engine and an immutable, multi-tenant enterprise audit trail for SIH 2026.

```text
Stage 11 does not use AI/ML or LLMs.
Notification copy uses deterministic templates.
PostgreSQL is authoritative.
Audit logs are strictly append-only and tamper-evident.
Notifications are user-scoped and tenant-isolated.
Stage 11 does not own Stage 0–10 domain data (it is an observer layer).
```

---

## 2. Event & Notification Architecture

Stage 11 integrates with the continuous learning loop by observing domain operations from Stages 1–10:

```text
                  CAPACITY CONNECT
                        │
             ┌──────────┴──────────┐
             │                     │
         STAGES 0–10           STAGE 11
       AUTHORITATIVE DATA       EVENT LAYER
             │                     │
             │               Domain Events
             │                     │
             └──────────┬──────────┘
                        ↓
               Internal Dispatcher
                        │
              ┌─────────┴─────────┐
              ↓                   ↓
       Notification Engine    Audit Engine
              │                   │
              ↓                   ↓
       notifications          audit_logs
              │                   │
              ↓                   ↓
       Notification Center   Admin Explorer
              │                   │
              └─────────┬─────────┘
                        ↓
                 Learning Loop
```

---

## 3. Transaction Consistency & Rollback Safety

For mandatory compliance operations (such as Certificate Issuance, Course Enrollment, and Trainer Sessions), Stage 11 executes notification and audit log insertion **inside the same PostgreSQL transaction** via `eventDispatcher.dispatchTransactional(event, client)`.

If the domain transaction fails or rolls back:
- Domain mutation rolls back.
- Notification row rolls back.
- Audit row rolls back.
- No partial or orphaned state can persist.

---

## 4. Database Schema (`013_notifications_and_audit.sql`)

### 4.1 `notifications` Table
- `id`: UUID Primary Key.
- `organization_id`: UUID Foreign Key -> `organizations(id)` ON DELETE CASCADE.
- `user_id`: UUID Foreign Key -> `users(id)` ON DELETE CASCADE.
- `type`: `VARCHAR(30)` checked against `('INFO', 'SUCCESS', 'WARNING', 'ACTION_REQUIRED', 'ACHIEVEMENT')`.
- `title`: `VARCHAR(255)`.
- `message`: `TEXT`.
- `link`: `VARCHAR(500)` nullable.
- `data`: `JSONB` containing deduplication event keys.
- `is_read`: `BOOLEAN DEFAULT FALSE`.
- `read_at`: `TIMESTAMPTZ` nullable.
- `created_at`: `TIMESTAMPTZ DEFAULT NOW()`.

**Check Constraint**: `((is_read = FALSE AND read_at IS NULL) OR (is_read = TRUE AND read_at IS NOT NULL))`

### 4.2 `audit_logs` Table
- `id`: UUID Primary Key.
- `organization_id`: UUID Foreign Key -> `organizations(id)` ON DELETE CASCADE.
- `actor_id`: UUID nullable -> `users(id)` ON DELETE SET NULL.
- `actor_email`: `VARCHAR(255)`.
- `actor_role`: `VARCHAR(50)`.
- `action`: `VARCHAR(100)`.
- `resource_type`: `VARCHAR(50)`.
- `resource_id`: `VARCHAR(255)`.
- `details`: `JSONB` with sanitized metadata (no passwords, tokens, or answer keys).
- `ip_address`: `VARCHAR(45)`.
- `user_agent`: `VARCHAR(255)`.
- `created_at`: `TIMESTAMPTZ DEFAULT NOW()`.

**Immutability Enforcement**: PostgreSQL trigger `trg_audit_logs_immutable` raises an exception on any `UPDATE` or `DELETE` statement.

---

## 5. API Endpoints & Role-Based Access Control

### 5.1 Notifications API (`/api/v1/notifications`)
- `GET /api/v1/notifications`: Paginated list of notifications for the authenticated user. (Roles: `TRAINEE`, `TRAINER`, `ADMIN`)
- `GET /api/v1/notifications/unread-count`: Fast unread count badge query. (Roles: `TRAINEE`, `TRAINER`, `ADMIN`)
- `PATCH /api/v1/notifications/:id/read`: Mark single notification as read. (Roles: `TRAINEE`, `TRAINER`, `ADMIN`)
- `PATCH /api/v1/notifications/mark-all-read`: Mark all unread notifications as read. (Roles: `TRAINEE`, `TRAINER`, `ADMIN`)
- `DELETE /api/v1/notifications/:id`: Delete a personal notification. (Roles: `TRAINEE`, `TRAINER`, `ADMIN`)

### 5.2 Audit API (`/api/v1/audit`)
- `GET /api/v1/audit`: Paginated, filterable audit log stream. (Roles: `ADMIN` only; `TRAINEE` and `TRAINER` receive 403)
- `GET /api/v1/audit/export`: Export audit logs as CSV or JSON with CSV formula injection protection. (Roles: `ADMIN` only)

---

## 6. Security, Privacy & Multi-Tenancy

1. **Server-Derived Context**: All user and organization identities are derived from cryptographically verified JWT tokens. Client overrides via query or body are strictly ignored.
2. **Data Sanitization**: Passwords, hashes, JWTs, refresh tokens, and test answer keys are stripped before logging to audit records.
3. **CSV Formula Injection Defense**: Any cell value starting with `=`, `+`, `-`, or `@` is escaped with a leading single quote (`'`).
4. **Near-Real-Time Strategy**: Frontend utilizes window focus events and a gentle 45-second polling interval for unread counts without introducing heavy WebSocket or broker infrastructure.
