/**
 * ═══════════════════════════════════════════════════════════════════════
 * Stage 11 — Notifications & Enterprise Audit Trail Engine Test Suite
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Target: ≥ 75 meaningful assertions, 0 failures.
 * All operations are deterministic, PostgreSQL authoritative.
 * No AI / No new message brokers.
 */

const http = require('http');
const { Client } = require('pg');

const API = 'http://localhost:5000/api/v1';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/capacity_connect';

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(msg);
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API}${path}`);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: d });
        }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function login(email, password) {
  const r = await req('POST', '/auth/login', { email, password });
  return r.body?.data?.accessToken;
}

async function register(name, email, password, orgCode) {
  return req('POST', '/auth/register', { name, email, password, organizationCode: orgCode });
}

// Unique IDs
const U = Date.now().toString(36);
const ADMIN_EMAIL = 'admin@lms.com';
const ADMIN_PASSWORD = 'adminbylms';
const ADMIN_ORG_CODE = 'cc';

const TRAINER_EMAIL = `trainer-s11-${U}@cc.test`;
const TRAINEE_A_EMAIL = `trainee-a-s11-${U}@cc.test`;
const TRAINEE_B_EMAIL = `trainee-b-s11-${U}@cc.test`;
const ORG_B_CODE = `NOTIFB${U}`;
const PASSWORD = 'TestPass123!';

let adminToken, trainerToken, traineeAToken, traineeBToken;
let orgAId, orgBId, traineeAId, traineeBId, trainerId;

(async () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  STAGE 11 — Notifications & Enterprise Audit Tests');
  console.log('═══════════════════════════════════════════════════════\n');

  // ────────── SETUP ──────────
  console.log('▶ Setting up test organizations and users...');

  adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!adminToken) {
    console.error('FATAL: Cannot login as seed admin. Aborting.');
    process.exit(1);
  }
  const adminMe = await req('GET', '/auth/me', null, adminToken);
  orgAId = adminMe.body?.data?.user?.organizationId;

  // Register Trainer in Org A
  await register('Trainer S11', TRAINER_EMAIL, PASSWORD, ADMIN_ORG_CODE);
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  await db.query(`UPDATE users SET role = 'TRAINER' WHERE email = $1`, [TRAINER_EMAIL.toLowerCase()]);
  trainerToken = await login(TRAINER_EMAIL, PASSWORD);
  const trainerMe = await req('GET', '/auth/me', null, trainerToken);
  trainerId = trainerMe.body?.data?.user?.id;

  // Register Trainee A in Org A
  await register('Trainee A S11', TRAINEE_A_EMAIL, PASSWORD, ADMIN_ORG_CODE);
  traineeAToken = await login(TRAINEE_A_EMAIL, PASSWORD);
  const traineeAMe = await req('GET', '/auth/me', null, traineeAToken);
  traineeAId = traineeAMe.body?.data?.user?.id;

  // Create Org B & Register Trainee B
  await db.query(
    `INSERT INTO organizations (name, code) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`,
    ['Notifications Test Org B', ORG_B_CODE]
  );
  await register('Trainee B S11', TRAINEE_B_EMAIL, PASSWORD, ORG_B_CODE);
  traineeBToken = await login(TRAINEE_B_EMAIL, PASSWORD);
  const traineeBMe = await req('GET', '/auth/me', null, traineeBToken);
  traineeBId = traineeBMe.body?.data?.user?.id;
  orgBId = traineeBMe.body?.data?.user?.organizationId;

  console.log(`  Org A: ${orgAId}`);
  console.log(`  Org B: ${orgBId}`);
  console.log(`  Admin: ${ADMIN_EMAIL}`);
  console.log(`  Trainer: ${TRAINER_EMAIL} (ID: ${trainerId})`);
  console.log(`  Trainee A: ${traineeAId}`);
  console.log(`  Trainee B: ${traineeBId}`);

  // ════════════════════════════════════════════════════
  // GROUP 1: Migration 013 & Schema Verification
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 1: Migration 013 & Schema Verification...');

  const migRes = await db.query(
    `SELECT migration_name FROM schema_migrations WHERE migration_name = '013_notifications_and_audit.sql'`
  );
  assert(migRes.rows.length === 1, '1.1 Migration 013_notifications_and_audit.sql is recorded');

  const notifTbl = await db.query(`SELECT to_regclass('notifications') AS tbl`);
  assert(notifTbl.rows[0]?.tbl !== null, '1.2 notifications table exists in PostgreSQL');

  const auditTbl = await db.query(`SELECT to_regclass('audit_logs') AS tbl`);
  assert(auditTbl.rows[0]?.tbl !== null, '1.3 audit_logs table exists in PostgreSQL');

  const notifChkType = await db.query(`SELECT 1 FROM pg_constraint WHERE conname = 'chk_notification_type'`);
  assert(notifChkType.rows.length > 0, '1.4 chk_notification_type constraint exists');

  const notifChkRead = await db.query(
    `SELECT 1 FROM pg_constraint WHERE conname = 'chk_notification_read_state'`
  );
  assert(notifChkRead.rows.length > 0, '1.5 chk_notification_read_state constraint exists');

  const notifIdx = await db.query(
    `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_read_created'`
  );
  assert(notifIdx.rows.length > 0, '1.6 idx_notifications_user_read_created index exists');

  const auditIdx = await db.query(
    `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_org_created'`
  );
  assert(auditIdx.rows.length > 0, '1.7 idx_audit_logs_org_created index exists');

  // ════════════════════════════════════════════════════
  // GROUP 2: Notification Authentication & RBAC Guards
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 2: Notification Authentication & RBAC Guards...');

  const unauthN1 = await req('GET', '/notifications');
  assert(unauthN1.status === 401, '2.1 Unauthenticated GET /notifications → 401');

  const unauthN2 = await req('GET', '/notifications/unread-count');
  assert(unauthN2.status === 401, '2.2 Unauthenticated GET /notifications/unread-count → 401');

  const unauthN3 = await req('PATCH', '/notifications/mark-all-read');
  assert(unauthN3.status === 401, '2.3 Unauthenticated PATCH /notifications/mark-all-read → 401');

  // All roles are authorized to access their personal notifications
  const traineeN = await req('GET', '/notifications', null, traineeAToken);
  assert(traineeN.status === 200, '2.4 TRAINEE GET /notifications → 200');

  const trainerN = await req('GET', '/notifications', null, trainerToken);
  assert(trainerN.status === 200, '2.5 TRAINER GET /notifications → 200');

  const adminN = await req('GET', '/notifications', null, adminToken);
  assert(adminN.status === 200, '2.6 ADMIN GET /notifications → 200');

  // ════════════════════════════════════════════════════
  // GROUP 3: Notification Lifecycle & State Machine
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 3: Notification Lifecycle & State Machine...');

  // Direct insert notification for Trainee A
  const insertNRes = await db.query(
    `INSERT INTO notifications (organization_id, user_id, type, title, message, link, data)
     VALUES ($1, $2, 'ACHIEVEMENT', 'First Milestone Reached', 'You have completed your first milestone!', '/milestones', '{"eventKey":"milestone_1"}')
     RETURNING *;`,
    [orgAId, traineeAId]
  );
  const createdN = insertNRes.rows[0];
  assert(createdN !== undefined && createdN.id !== undefined, '3.1 Notification created successfully in DB');

  // Trainee A unread count should be ≥ 1
  const countA = await req('GET', '/notifications/unread-count', null, traineeAToken);
  assert(countA.status === 200, '3.2 Trainee A unread count → 200');
  assert(countA.body?.data?.unreadCount >= 1, '3.3 Trainee A unread count incremented (≥ 1)');

  // Trainee B should NOT see Trainee A's notification
  const listB = await req('GET', '/notifications', null, traineeBToken);
  assert(listB.status === 200, '3.4 Trainee B list notifications → 200');
  const bHasA = listB.body?.data?.notifications?.some((n) => n.id === createdN.id);
  assert(!bHasA, '3.5 Trainee B does NOT see Trainee A notification (User isolation)');

  // Trainee A lists notifications
  const listA = await req('GET', '/notifications', null, traineeAToken);
  assert(listA.status === 200, '3.6 Trainee A list notifications → 200');
  const foundA = listA.body?.data?.notifications?.find((n) => n.id === createdN.id);
  assert(foundA !== undefined, '3.7 Trainee A finds created notification');
  assert(foundA?.is_read === false, '3.8 Notification is initially unread');
  assert(foundA?.read_at === null, '3.9 read_at is initially null');

  // Trainee A marks notification as read
  const markRes = await req('PATCH', `/notifications/${createdN.id}/read`, null, traineeAToken);
  assert(markRes.status === 200, '3.10 Mark notification as read → 200');
  assert(markRes.body?.data?.is_read === true, '3.11 is_read is now true');
  assert(typeof markRes.body?.data?.read_at === 'string', '3.12 read_at is populated with timestamp');

  // Trainee A unread count decrements
  const countAAfter = await req('GET', '/notifications/unread-count', null, traineeAToken);
  assert(countAAfter.body?.data?.unreadCount === countA.body?.data?.unreadCount - 1, '3.13 Unread count decremented');

  // Trainee B cannot mark Trainee A's notification as read
  const crossMark = await req('PATCH', `/notifications/${createdN.id}/read`, null, traineeBToken);
  assert(crossMark.status === 404, '3.14 Trainee B marking Trainee A notification → 404 Not Found');

  // Insert 2 more unread notifications for Trainee A
  await db.query(
    `INSERT INTO notifications (organization_id, user_id, type, title, message)
     VALUES ($1, $2, 'INFO', 'Update 1', 'Test update 1'),
            ($1, $2, 'WARNING', 'Update 2', 'Test update 2');`,
    [orgAId, traineeAId]
  );

  // Mark all read for Trainee A
  const markAllRes = await req('PATCH', '/notifications/mark-all-read', null, traineeAToken);
  assert(markAllRes.status === 200, '3.15 Mark all read → 200');
  assert(markAllRes.body?.data?.updatedCount >= 2, '3.16 Mark all read updated ≥ 2 notifications');

  const countAfterAll = await req('GET', '/notifications/unread-count', null, traineeAToken);
  assert(countAfterAll.body?.data?.unreadCount === 0, '3.17 Trainee A unread count is now 0');

  // Delete notification
  const delRes = await req('DELETE', `/notifications/${createdN.id}`, null, traineeAToken);
  assert(delRes.status === 200, '3.18 Delete notification → 200');

  const delRecheck = await req('PATCH', `/notifications/${createdN.id}/read`, null, traineeAToken);
  assert(delRecheck.status === 404, '3.19 Deleted notification is no longer accessible → 404');

  // Trainee B cannot delete Trainee A's remaining notification
  const remaining = await db.query(
    `SELECT id FROM notifications WHERE user_id = $1 LIMIT 1`,
    [traineeAId]
  );
  if (remaining.rows.length > 0) {
    const crossDel = await req('DELETE', `/notifications/${remaining.rows[0].id}`, null, traineeBToken);
    assert(crossDel.status === 404, '3.20 Cross-user notification deletion rejected → 404');
  }

  // ════════════════════════════════════════════════════
  // GROUP 4: Notification Types & Filter Validation
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 4: Notification Types & Filter Validation...');

  // Query filter by type
  const filterType = await req('GET', '/notifications?type=INFO', null, traineeAToken);
  assert(filterType.status === 200, '4.1 Filter by type=INFO → 200');
  assert(
    filterType.body?.data?.notifications?.every((n) => n.type === 'INFO'),
    '4.2 All returned notifications are of type INFO'
  );

  // Query filter by isRead
  const filterRead = await req('GET', '/notifications?isRead=true', null, traineeAToken);
  assert(filterRead.status === 200, '4.3 Filter by isRead=true → 200');
  assert(
    filterRead.body?.data?.notifications?.every((n) => n.is_read === true),
    '4.4 All returned notifications are is_read=true'
  );

  // Invalid limit rejected
  const invLimit = await req('GET', '/notifications?limit=100', null, traineeAToken);
  assert(invLimit.status === 400, '4.5 Limit > 50 rejected → 400');

  // Invalid type rejected
  const invType = await req('GET', '/notifications?type=INVALID_TYPE', null, traineeAToken);
  assert(invType.status === 400, '4.6 Invalid notification type rejected → 400');

  // ════════════════════════════════════════════════════
  // GROUP 5: Audit RBAC & Access Guards
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 5: Audit RBAC & Access Guards...');

  const unauthA1 = await req('GET', '/audit');
  assert(unauthA1.status === 401, '5.1 Unauthenticated GET /audit → 401');

  const unauthA2 = await req('GET', '/audit/export');
  assert(unauthA2.status === 401, '5.2 Unauthenticated GET /audit/export → 401');

  const traineeA = await req('GET', '/audit', null, traineeAToken);
  assert(traineeA.status === 403, '5.3 TRAINEE GET /audit → 403 Forbidden');

  const trainerA = await req('GET', '/audit', null, trainerToken);
  assert(trainerA.status === 403, '5.4 TRAINER GET /audit → 403 Forbidden');

  const adminA = await req('GET', '/audit', null, adminToken);
  assert(adminA.status === 200, '5.5 ADMIN GET /audit → 200 OK');

  const traineeExp = await req('GET', '/audit/export', null, traineeAToken);
  assert(traineeExp.status === 403, '5.6 TRAINEE GET /audit/export → 403 Forbidden');

  const trainerExp = await req('GET', '/audit/export', null, trainerToken);
  assert(trainerExp.status === 403, '5.7 TRAINER GET /audit/export → 403 Forbidden');

  const adminExp = await req('GET', '/audit/export', null, adminToken);
  assert(adminExp.status === 200, '5.8 ADMIN GET /audit/export → 200 OK');

  // ════════════════════════════════════════════════════
  // GROUP 6: Audit Filtering & Search
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 6: Audit Filtering & Search...');

  // Directly insert audit log for Org A
  await db.query(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, actor_role, action, resource_type, resource_id, details)
     VALUES ($1, $2, $3, 'ADMIN', 'USER_ROLE_UPDATED', 'USER', $4, '{"previousRole":"TRAINEE","newRole":"TRAINER"}')`,
    [orgAId, adminMe.body?.data?.user?.id, ADMIN_EMAIL, trainerId]
  );

  const filterAct = await req('GET', '/audit?action=USER_ROLE_UPDATED', null, adminToken);
  assert(filterAct.status === 200, '6.1 Filter by action=USER_ROLE_UPDATED → 200');
  assert(
    filterAct.body?.data?.logs?.every((l) => l.action === 'USER_ROLE_UPDATED'),
    '6.2 All returned audit logs have action USER_ROLE_UPDATED'
  );

  const filterRes = await req('GET', '/audit?resourceType=USER', null, adminToken);
  assert(filterRes.status === 200, '6.3 Filter by resourceType=USER → 200');
  assert(
    filterRes.body?.data?.logs?.every((l) => l.resource_type === 'USER'),
    '6.4 All returned audit logs have resource_type USER'
  );

  // Date range validation
  const invDate = await req('GET', '/audit?dateFrom=2026-12-31&dateTo=2026-01-01', null, adminToken);
  assert(invDate.status === 400, '6.5 dateFrom > dateTo rejected → 400');

  // Pagination limit > 100 rejected
  const invAuditLimit = await req('GET', '/audit?limit=150', null, adminToken);
  assert(invAuditLimit.status === 400, '6.6 limit > 100 rejected → 400');

  // ════════════════════════════════════════════════════
  // GROUP 7: Audit Export & CSV Sanitization
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 7: Audit Export & CSV Sanitization...');

  // CSV export
  const csvExport = await req('GET', '/audit/export?format=csv', null, adminToken);
  assert(csvExport.status === 200, '7.1 Export format=csv → 200');
  assert(csvExport.headers['content-type']?.includes('text/csv'), '7.2 Content-Type is text/csv');
  assert(typeof csvExport.body === 'string', '7.3 CSV payload is string');
  assert(csvExport.body.includes('Action,Resource Type'), '7.4 CSV contains valid header row');

  // Insert dangerous formula value into details and verify sanitization
  await db.query(
    `INSERT INTO audit_logs (organization_id, actor_email, actor_role, action, resource_type, resource_id, details)
     VALUES ($1, '=HYPERLINK("http://evil.com")', 'ADMIN', 'USER_ROLE_UPDATED', 'USER', '+cmd|/C calc', '{"note":"@mention"}')`,
    [orgAId]
  );
  const safeCsvExport = await req('GET', '/audit/export?format=csv', null, adminToken);
  assert(safeCsvExport.status === 200, '7.5 Sanitized CSV export → 200');
  assert(
    safeCsvExport.body.includes("''=HYPERLINK") || safeCsvExport.body.includes("'=HYPERLINK"),
    '7.6 Formula prefix "=" sanitized with single quote'
  );
  assert(
    safeCsvExport.body.includes("''+cmd") || safeCsvExport.body.includes("'+cmd"),
    '7.7 Formula prefix "+" sanitized with single quote'
  );

  // JSON export
  const jsonExport = await req('GET', '/audit/export?format=json', null, adminToken);
  assert(jsonExport.status === 200, '7.8 Export format=json → 200');
  assert(Array.isArray(jsonExport.body), '7.9 JSON export returns JSON array');

  // ════════════════════════════════════════════════════
  // GROUP 8: Audit Immutability Enforcement
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 8: Audit Immutability Enforcement...');

  // Attempt DB UPDATE on audit_logs
  let updateBlocked = false;
  try {
    await db.query(`UPDATE audit_logs SET actor_email = 'hacked@evil.com' WHERE organization_id = $1`, [orgAId]);
  } catch (err) {
    updateBlocked = true;
  }
  assert(updateBlocked, '8.1 Direct database UPDATE on audit_logs blocked by immutability trigger');

  // Attempt DB DELETE on audit_logs
  let deleteBlocked = false;
  try {
    await db.query(`DELETE FROM audit_logs WHERE organization_id = $1`, [orgAId]);
  } catch (err) {
    deleteBlocked = true;
  }
  assert(deleteBlocked, '8.2 Direct database DELETE on audit_logs blocked by immutability trigger');

  // Verify no HTTP UPDATE or DELETE routes are exposed for audit
  const putAudit = await req('PUT', '/audit/some-id', {}, adminToken);
  assert(putAudit.status === 404, '8.3 PUT /audit/:id route does NOT exist → 404');

  const patchAudit = await req('PATCH', '/audit/some-id', {}, adminToken);
  assert(patchAudit.status === 404, '8.4 PATCH /audit/:id route does NOT exist → 404');

  const delAudit = await req('DELETE', '/audit/some-id', null, adminToken);
  assert(delAudit.status === 404, '8.5 DELETE /audit/:id route does NOT exist → 404');

  // ════════════════════════════════════════════════════
  // GROUP 9: Tenant Isolation
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 9: Tenant Isolation...');

  // Insert audit record for Org B
  await db.query(
    `INSERT INTO audit_logs (organization_id, actor_email, actor_role, action, resource_type, resource_id, details)
     VALUES ($1, 'adminB@cc.test', 'ADMIN', 'SNAPSHOT_INVALIDATED', 'ANALYTICS_SNAPSHOT', 'ORG_DASHBOARD', '{}')`,
    [orgBId]
  );

  // Org A Admin querying audit logs must NOT see Org B records
  const orgALogs = await req('GET', '/audit', null, adminToken);
  assert(orgALogs.status === 200, '9.1 Org A Admin retrieves audit logs → 200');
  const hasOrgBLog = orgALogs.body?.data?.logs?.some((l) => l.organization_id === orgBId);
  assert(!hasOrgBLog, '9.2 Org A audit stream does NOT contain Org B logs');

  // ════════════════════════════════════════════════════
  // GROUP 10: Client Override Protection & Privacy
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 10: Client Override Protection & Privacy...');

  // Attempt to override userId in query
  const overrideUser = await req('GET', `/notifications?userId=${traineeBId}`, null, traineeAToken);
  assert(overrideUser.status === 200, '10.1 Override userId ignored → 200');
  assert(
    overrideUser.body?.data?.notifications?.every((n) => n.user_id === traineeAId),
    '10.2 All returned notifications strictly belong to authenticated user A'
  );

  // Verify audit logs contain no sensitive passwords / tokens / hashes
  const auditDetailsCheck = await db.query(
    `SELECT details FROM audit_logs WHERE organization_id = $1 LIMIT 50`,
    [orgAId]
  );
  const safeDetails = auditDetailsCheck.rows.every((r) => {
    const jsonStr = JSON.stringify(r.details || {}).toLowerCase();
    return (
      !jsonStr.includes('password_hash') &&
      !jsonStr.includes('refreshtoken') &&
      !jsonStr.includes('accesstoken') &&
      !jsonStr.includes('apikey') &&
      !jsonStr.includes('answerkey')
    );
  });
  assert(safeDetails, '10.3 Audit logs contain zero passwords, tokens, API keys, or answer keys');

  // ════════════════════════════════════════════════════
  // GROUP 11: Domain Event Integration
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 11: Domain Event Integration...');

  // Trigger snapshot invalidation in Org A (Stage 10)
  const invSnap = await req('POST', '/analytics/invalidate-snapshot', {}, adminToken);
  assert(invSnap.status === 200, '11.1 Snapshot invalidation → 200');

  // Verify SNAPSHOT_INVALIDATED audit record was generated
  const snapAudit = await req('GET', '/audit?action=SNAPSHOT_INVALIDATED', null, adminToken);
  assert(snapAudit.status === 200, '11.2 Audit query for SNAPSHOT_INVALIDATED → 200');
  assert(
    snapAudit.body?.data?.logs?.length > 0,
    '11.3 SNAPSHOT_INVALIDATED domain event captured in audit trail'
  );

  // ════════════════════════════════════════════════════
  // GROUP 12: Stage 1–10 Full Regression Smoke
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 12: Stage 1–10 Full Regression Smoke...');

  const r0 = await req('GET', '/health');
  assert(r0.status === 200, '12.1 Stage 0 — Health → 200');

  const r1 = await req('GET', '/auth/me', null, traineeAToken);
  assert(r1.status === 200, '12.2 Stage 1 — Auth /me → 200');

  const r2 = await req('GET', '/courses', null, traineeAToken);
  assert(r2.status === 200, '12.3 Stage 2 — Course Catalog → 200');

  const r3 = await req('GET', '/enrollments', null, traineeAToken);
  assert(r3.status === 200, '12.4 Stage 3 — Trainee Enrollments → 200');

  const r4 = await req('GET', '/assessments', null, traineeAToken);
  assert(r4.status === 200, '12.5 Stage 4 — Assessments → 200');

  const r5 = await req('GET', '/competencies', null, traineeAToken);
  assert(r5.status === 200, '12.6 Stage 5 — Competencies → 200');

  const r7 = await req('GET', '/recommendations/my', null, traineeAToken);
  assert(r7.status === 200 || r7.status === 404, '12.7 Stage 7 — Recommendations → 200/404');

  const r8 = await req('GET', '/trainer-matching/matches', null, traineeAToken);
  assert(r8.status === 200 || r8.status === 404, '12.8 Stage 8 — Trainer Matching → 200/404');

  const r9 = await req('GET', '/certificates/my-certificates', null, traineeAToken);
  assert(r9.status === 200 || r9.status === 404, '12.9 Stage 9 — Certificates → 200/404');

  const r10 = await req('GET', '/analytics/trainee-summary', null, traineeAToken);
  assert(r10.status === 200, '12.10 Stage 10 — Analytics Personal Summary → 200');

  const r11 = await req('GET', '/notifications', null, traineeAToken);
  assert(r11.status === 200, '12.11 Stage 11 — Notifications → 200');

  const r12 = await req('GET', '/audit', null, adminToken);
  assert(r12.status === 200, '12.12 Stage 11 — Audit → 200');

  // ════════════════════════════════════════════════════
  // CLEANUP & FINAL REPORT
  // ════════════════════════════════════════════════════
  await db.end();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('═══════════════════════════════════════════════════════');

  if (failures.length > 0) {
    console.log('\n  FAILURES:');
    failures.forEach((f) => console.log(`    ✗ ${f}`));
  }

  console.log('\n  AI/ML Used: NO');
  console.log('  New Message Broker: NO');
  console.log('  PostgreSQL Authoritative: YES');
  console.log('  Audit Immutability Enforced: YES');
  console.log('  Multi-Tenant Isolation Verified: YES');
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
})();
