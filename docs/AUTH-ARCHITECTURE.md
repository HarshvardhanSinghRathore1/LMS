# CAPACITY CONNECT — AUTHENTICATION & RBAC ARCHITECTURE

> **STATUS**: STAGE 1 COMPLETE & VERIFIED  
> **Security Standards**: JWT Access Tokens + HttpOnly Refresh Token Rotation + SHA-256 Token Session Hashing + Multi-Tenant Scoping + RBAC (ADMIN, TRAINER, TRAINEE).

---

## 1. Request Security & Authorization Lifecycle

```text
Incoming Request
      │
      ▼
Request ID Middleware (X-Request-ID Header)
      │
      ▼
JWT Authentication Middleware (src/middleware/authenticate.ts)
      │  (Verifies Bearer Token / Cookie, checks expiration, algorithm = HS256)
      ▼
Organization Context Middleware (src/middleware/organizationContext.ts)
      │  (Locks req.user.organizationId as authoritative tenant context)
      ▼
RBAC Authorization Middleware (src/middleware/authorize.ts)
      │  (Enforces role permissions: ADMIN, TRAINER, TRAINEE)
      ▼
Controller ──► Service ──► Repository ──► PostgreSQL
```

---

## 2. JWT Architecture & Token Specifications

### 2.1 Access Token (Short-Lived)
- **Lifetime**: 15 minutes (`JWT_ACCESS_EXPIRES_IN=15m`)
- **Transport**: `Authorization: Bearer <accessToken>` header or memory state
- **Claims Payload**:
  ```json
  {
    "sub": "user-uuid",
    "organizationId": "organization-uuid",
    "role": "TRAINEE",
    "type": "access",
    "iat": 1725615000,
    "exp": 1725615900
  }
  ```

### 2.2 Refresh Token (Long-Lived & Rotated)
- **Lifetime**: 7 days (`JWT_REFRESH_EXPIRES_IN=7d`)
- **Transport**: `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth`, `Secure` (production) cookie named `cc_refresh_token`
- **Claims Payload**:
  ```json
  {
    "sub": "user-uuid",
    "tokenFamilyId": "family-uuid",
    "type": "refresh",
    "iat": 1725615000,
    "exp": 1726219800
  }
  ```

---

## 3. Refresh Token Session Tracking & Reuse Detection

To prevent token theft and replay attacks, raw refresh tokens are **never stored in PostgreSQL**.

```text
Raw Refresh Token ──► SHA-256 Hash ──► refresh_tokens.token_hash
```

### Refresh Token Rotation Lifecycle:
1. When a client requests `POST /api/v1/auth/refresh`, the SHA-256 hash of the incoming cookie token is looked up in `refresh_tokens`.
2. **Token Reuse Detection**: If a presented token is found with `revoked_at IS NOT NULL`, a security breach is detected. **The entire token family (`token_family_id`) is immediately revoked**, invalidating all compromised sessions (`REFRESH_TOKEN_REUSE_DETECTED`).
3. **Normal Rotation**: If valid, the old token is marked `revoked_at = CURRENT_TIMESTAMP`, and a new refresh token (sharing the same `token_family_id`) and access token are issued.

---

## 4. Multi-Tenant Security & Organization Context

- **Authoritative Source**: The backend derives the user's organization strictly from `req.user.organizationId` embedded in the cryptographically verified JWT token.
- **Client Override Rejection**: Any client-supplied `organizationId` parameter in request bodies, query strings, or URL parameters is explicitly ignored by `enforceOrganizationContext` middleware.
- **`pgvector` Tenant Isolation**: All vector similarity queries continue enforcing `WHERE organization_id = req.user.organizationId`.

---

## 5. Role-Based Access Control (RBAC)

Supported Roles:
- **`ADMIN`**: Full administrative access across organizational users, system analytics, and global setup.
- **`TRAINER`**: Course creation, module management, assessment publishing, MCQ review.
- **`TRAINEE`**: Course enrollment, learning progress, assessment attempts, AI assistant.

Public registration (`POST /api/v1/auth/register`) enforces `role = 'TRAINEE'` automatically. Public users CANNOT self-assign `ADMIN` or `TRAINER` roles. Bootstrap Admin users are provisioned via controlled CLI seed script (`npm run seed:admin`).

---

## 6. Security Checklist Status

- [x] Passwords hashed with `bcryptjs` (12 rounds)
- [x] No plaintext passwords or password hashes in logs or API responses
- [x] Timing-safe login credentials evaluation against dummy bcrypt hashes
- [x] Access token short-lived (15 min); Refresh token rotated on every use
- [x] Refresh tokens stored as SHA-256 hashes with token family reuse detection
- [x] Refresh cookies configured with `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth`
- [x] Strict JWT algorithm restriction (`HS256`)
- [x] Server-side multi-tenant organization context enforced on all protected routes
- [x] Dedicated authentication rate limiting (20 attempts per 15 min)
- [x] 401 (Unauthenticated) vs 403 (Forbidden) status codes strictly distinguished
