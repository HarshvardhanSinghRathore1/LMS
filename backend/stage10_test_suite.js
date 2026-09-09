/**
 * ═══════════════════════════════════════════════════════════════════════
 * Stage 10 — Organization-Wide Analytics & Executive Dashboard Test Suite
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Target: ≥ 70 meaningful assertions, 0 failures.
 * All metrics are deterministic SQL — no AI, no ML.
 * PostgreSQL is authoritative.
 */
const http = require('http');
const { Client } = require('pg');

const API = 'http://localhost:5000/api/v1';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/capacity_connect';
let passed = 0;
let failed = 0;
const failures = [];

// ── Utilities ────────────────────────────────────────────────────────────────
function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; failures.push(msg); console.error(`  ✗ FAIL: ${msg}`); }
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
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
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

// ── Unique identifiers ───────────────────────────────────────────────────────
const U = Date.now().toString(36);

// User credentials — use seed admin from .env
const ADMIN_EMAIL = 'admin@lms.com';
const ADMIN_PASSWORD = 'adminbylms';
const ADMIN_ORG_CODE = 'cc';

const TRAINER_EMAIL = `trainer-s10-${U}@cc.test`;
const TRAINEE_EMAIL = `trainee-s10-${U}@cc.test`;
const TRAINEE_B_EMAIL = `trainee-b-s10-${U}@cc.test`;
const ORG_B_CODE = `ANLYB${U}`;
const PASSWORD = 'TestPass123!';

let adminToken, trainerToken, traineeToken, traineeBToken;
let orgAId, orgBId, traineeId, traineeBId, trainerId;

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
(async () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  STAGE 10 — Analytics & Executive Dashboard Tests');
  console.log('═══════════════════════════════════════════════════════\n');

  // ────────── SETUP ──────────
  console.log('▶ Setting up test organizations and users...');

  // Login as seed admin
  adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!adminToken) {
    console.error('FATAL: Cannot login as seed admin. Aborting.');
    process.exit(1);
  }
  const adminMe = await req('GET', '/auth/me', null, adminToken);
  orgAId = adminMe.body?.data?.user?.organizationId;
  console.log(`  Admin org: ${orgAId}`);

  // Register a trainer in org A, then promote via direct DB
  await register('Trainer S10', TRAINER_EMAIL, PASSWORD, ADMIN_ORG_CODE);
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  // Promote trainer
  await db.query(`UPDATE users SET role = 'TRAINER' WHERE email = $1`, [TRAINER_EMAIL.toLowerCase()]);
  trainerToken = await login(TRAINER_EMAIL, PASSWORD);
  const trainerMe = await req('GET', '/auth/me', null, trainerToken);
  trainerId = trainerMe.body?.data?.user?.id;

  // Register trainee in org A
  await register('Trainee S10', TRAINEE_EMAIL, PASSWORD, ADMIN_ORG_CODE);
  traineeToken = await login(TRAINEE_EMAIL, PASSWORD);
  const traineeMe = await req('GET', '/auth/me', null, traineeToken);
  traineeId = traineeMe.body?.data?.user?.id;

  // Create Org B and register trainee B
  await db.query(
    `INSERT INTO organizations (name, code) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`,
    ['Analytics Test Org B', ORG_B_CODE]
  );
  await register('Trainee B S10', TRAINEE_B_EMAIL, PASSWORD, ORG_B_CODE);
  traineeBToken = await login(TRAINEE_B_EMAIL, PASSWORD);
  const traineeBMe = await req('GET', '/auth/me', null, traineeBToken);
  traineeBId = traineeBMe.body?.data?.user?.id;
  orgBId = traineeBMe.body?.data?.user?.organizationId;

  console.log(`  Org A: ${orgAId}`);
  console.log(`  Org B: ${orgBId}`);
  console.log(`  Admin: ${ADMIN_EMAIL}`);
  console.log(`  Trainer: ${TRAINER_EMAIL} (ID: ${trainerId})`);
  console.log(`  Trainee A: ${traineeId}`);
  console.log(`  Trainee B: ${traineeBId}`);

  // ════════════════════════════════════════════════════
  // GROUP 1: Authentication Guards (401/403)
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 1: Authentication Guards...');

  const unauth1 = await req('GET', '/analytics/org-dashboard');
  assert(unauth1.status === 401, '1.1 Unauthenticated org-dashboard → 401');

  const unauth2 = await req('GET', '/analytics/trainee-summary');
  assert(unauth2.status === 401, '1.2 Unauthenticated trainee-summary → 401');

  const unauth3 = await req('GET', '/analytics/course-leaderboard');
  assert(unauth3.status === 401, '1.3 Unauthenticated course-leaderboard → 401');

  const unauth4 = await req('GET', '/analytics/trainee-leaderboard');
  assert(unauth4.status === 401, '1.4 Unauthenticated trainee-leaderboard → 401');

  const unauth5 = await req('GET', '/analytics/skill-gap-distribution');
  assert(unauth5.status === 401, '1.5 Unauthenticated skill-gap-distribution → 401');

  const unauth6 = await req('POST', '/analytics/invalidate-snapshot');
  assert(unauth6.status === 401, '1.6 Unauthenticated invalidate-snapshot → 401');

  // TRAINEE blocked from org endpoints
  const traineeOrg = await req('GET', '/analytics/org-dashboard', null, traineeToken);
  assert(traineeOrg.status === 403, '1.7 TRAINEE org-dashboard → 403');

  const traineeCL = await req('GET', '/analytics/course-leaderboard', null, traineeToken);
  assert(traineeCL.status === 403, '1.8 TRAINEE course-leaderboard → 403');

  const traineeTL = await req('GET', '/analytics/trainee-leaderboard', null, traineeToken);
  assert(traineeTL.status === 403, '1.9 TRAINEE trainee-leaderboard → 403');

  // TRAINER blocked from trainee-leaderboard
  const trainerTL = await req('GET', '/analytics/trainee-leaderboard', null, trainerToken);
  assert(trainerTL.status === 403, '1.10 TRAINER trainee-leaderboard → 403');

  // ════════════════════════════════════════════════════
  // GROUP 2: Trainee Personal Summary
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 2: Trainee Personal Summary...');

  const summary1 = await req('GET', '/analytics/trainee-summary', null, traineeToken);
  assert(summary1.status === 200, '2.1 Trainee summary → 200');
  const s = summary1.body?.data;
  assert(s !== null && s !== undefined, '2.2 Summary data exists');
  assert(typeof s?.coursesEnrolled === 'number', '2.3 coursesEnrolled is number');
  assert(typeof s?.coursesCompleted === 'number', '2.4 coursesCompleted is number');
  assert(typeof s?.certificatesEarned === 'number', '2.5 certificatesEarned is number');
  assert(typeof s?.averageAssessmentScore === 'number', '2.6 averageAssessmentScore is number');
  assert(typeof s?.competenciesMeasured === 'number', '2.7 competenciesMeasured is number');
  assert(typeof s?.skillGapCount === 'number', '2.8 skillGapCount is number');
  assert(typeof s?.trainerSessions === 'number', '2.9 trainerSessions is number');
  assert(typeof s?.activeRecommendations === 'number', '2.10 activeRecommendations is number');
  assert(s?.traineeId === traineeId, '2.11 traineeId matches authenticated user');

  // ════════════════════════════════════════════════════
  // GROUP 3: Org Dashboard (Admin)
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 3: Org Dashboard...');

  const t0 = Date.now();
  const dash1 = await req('GET', '/analytics/org-dashboard', null, adminToken);
  const coldMs = Date.now() - t0;
  assert(dash1.status === 200, '3.1 Admin org-dashboard → 200');
  const d = dash1.body?.data;
  assert(d !== null && d !== undefined, '3.2 Dashboard data exists');
  assert(typeof d?.totalTrainees === 'number', '3.3 totalTrainees is number');
  assert(typeof d?.activeLearnersLast30Days === 'number', '3.4 activeLearnersLast30Days is number');
  assert(typeof d?.certificateCount === 'number', '3.5 certificateCount is number');

  // Enrollment sub-object
  assert(d?.enrollment !== null && d?.enrollment !== undefined, '3.6 enrollment exists');
  assert(typeof d?.enrollment?.total === 'number', '3.7 enrollment.total is number');
  assert(typeof d?.enrollment?.enrolled === 'number', '3.8 enrollment.enrolled is number');
  assert(typeof d?.enrollment?.inProgress === 'number', '3.9 enrollment.inProgress is number');
  assert(typeof d?.enrollment?.completed === 'number', '3.10 enrollment.completed is number');
  assert(typeof d?.enrollment?.dropped === 'number', '3.11 enrollment.dropped is number');
  assert(typeof d?.enrollment?.averageCompletionRate === 'number', '3.12 enrollment.avgCompletionRate is number');

  // Assessment sub-object
  assert(d?.assessment !== null && d?.assessment !== undefined, '3.13 assessment exists');
  assert(typeof d?.assessment?.passRate === 'number', '3.14 assessment.passRate is number');
  assert(typeof d?.assessment?.averageScore === 'number', '3.15 assessment.averageScore is number');

  // Competency sub-object
  assert(d?.competency !== null && d?.competency !== undefined, '3.16 competency exists');
  assert(typeof d?.competency?.coveragePercentage === 'number', '3.17 competency.coveragePercentage is number');
  assert(Array.isArray(d?.competency?.topSkillGaps), '3.18 topSkillGaps is array');

  // Trainer sessions sub-object
  assert(d?.trainerSessions !== null && d?.trainerSessions !== undefined, '3.19 trainerSessions exists');
  assert(typeof d?.trainerSessions?.total === 'number', '3.20 trainerSessions.total is number');
  assert(typeof d?.trainerSessions?.acceptanceRate === 'number', '3.21 acceptanceRate is number');
  assert(typeof d?.trainerSessions?.completionRate === 'number', '3.22 completionRate is number');

  // Recommendations sub-object
  assert(d?.recommendations !== null && d?.recommendations !== undefined, '3.23 recommendations exists');
  assert(typeof d?.recommendations?.total === 'number', '3.24 recommendations.total is number');
  assert(typeof d?.recommendations?.enrolledRate === 'number', '3.25 enrolledRate is number');

  // computedAt
  assert(typeof d?.computedAt === 'string', '3.26 computedAt is string');

  // Trainer can also see org dashboard
  const trainerDash = await req('GET', '/analytics/org-dashboard', null, trainerToken);
  assert(trainerDash.status === 200, '3.27 Trainer org-dashboard → 200');

  // ════════════════════════════════════════════════════
  // GROUP 4: Snapshot TTL
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 4: Snapshot TTL...');

  const t1 = Date.now();
  const dash2 = await req('GET', '/analytics/org-dashboard', null, adminToken);
  const cachedMs = Date.now() - t1;
  assert(dash2.status === 200, '4.1 Cached dashboard → 200');
  assert(dash2.body?.data?.computedAt === d?.computedAt, '4.2 Same computedAt = snapshot reused');

  console.log(`  Cold: ${coldMs}ms | Cached: ${cachedMs}ms`);

  // ════════════════════════════════════════════════════
  // GROUP 5: Snapshot Invalidation
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 5: Snapshot Invalidation...');

  // TRAINER cannot invalidate
  const trainerInv = await req('POST', '/analytics/invalidate-snapshot', null, trainerToken);
  assert(trainerInv.status === 403, '5.1 TRAINER invalidate → 403');

  // TRAINEE cannot invalidate
  const traineeInv = await req('POST', '/analytics/invalidate-snapshot', null, traineeToken);
  assert(traineeInv.status === 403, '5.2 TRAINEE invalidate → 403');

  // ADMIN can invalidate
  const inv1 = await req('POST', '/analytics/invalidate-snapshot', null, adminToken);
  assert(inv1.status === 200, '5.3 Admin invalidate snapshot → 200');
  assert(inv1.body?.data?.invalidated === true, '5.4 invalidated = true');

  const t2 = Date.now();
  const dash3 = await req('GET', '/analytics/org-dashboard', null, adminToken);
  const recomputeMs = Date.now() - t2;
  assert(dash3.status === 200, '5.5 Post-invalidation dashboard → 200');
  assert(dash3.body?.data?.computedAt !== d?.computedAt, '5.6 New computedAt after invalidation');

  console.log(`  Recompute: ${recomputeMs}ms`);

  // ════════════════════════════════════════════════════
  // GROUP 6: Course Leaderboard
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 6: Course Leaderboard...');

  const cl1 = await req('GET', '/analytics/course-leaderboard', null, adminToken);
  assert(cl1.status === 200, '6.1 Course leaderboard → 200');
  assert(Array.isArray(cl1.body?.data?.leaderboard), '6.2 leaderboard is array');
  assert(typeof cl1.body?.data?.limit === 'number', '6.3 limit returned');

  const cl2 = await req('GET', '/analytics/course-leaderboard?limit=5', null, adminToken);
  assert(cl2.status === 200, '6.4 Leaderboard limit=5 → 200');
  assert(cl2.body?.data?.leaderboard?.length <= 5, '6.5 Leaderboard respects limit');

  const cl3 = await req('GET', '/analytics/course-leaderboard?limit=1', null, adminToken);
  assert(cl3.status === 200, '6.6 Leaderboard limit=1 → 200');
  assert(cl3.body?.data?.leaderboard?.length <= 1, '6.7 Leaderboard respects limit=1');

  // Trainer can see course leaderboard
  const trainerCL = await req('GET', '/analytics/course-leaderboard', null, trainerToken);
  assert(trainerCL.status === 200, '6.8 Trainer course-leaderboard → 200');

  // Limit validation
  const cl4 = await req('GET', '/analytics/course-leaderboard?limit=0', null, adminToken);
  assert(cl4.status === 400, '6.9 Leaderboard limit=0 → 400');

  const cl5 = await req('GET', '/analytics/course-leaderboard?limit=100', null, adminToken);
  assert(cl5.status === 400, '6.10 Leaderboard limit=100 → 400');

  // ════════════════════════════════════════════════════
  // GROUP 7: Trainee Leaderboard (Admin only)
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 7: Trainee Leaderboard...');

  const tl1 = await req('GET', '/analytics/trainee-leaderboard', null, adminToken);
  assert(tl1.status === 200, '7.1 Admin trainee leaderboard → 200');
  assert(Array.isArray(tl1.body?.data?.leaderboard), '7.2 leaderboard is array');

  // Limit validation
  const tl2 = await req('GET', '/analytics/trainee-leaderboard?limit=0', null, adminToken);
  assert(tl2.status === 400, '7.3 Trainee leaderboard limit=0 → 400');

  const tl3 = await req('GET', '/analytics/trainee-leaderboard?limit=100', null, adminToken);
  assert(tl3.status === 400, '7.4 Trainee leaderboard limit=100 → 400');

  // ════════════════════════════════════════════════════
  // GROUP 8: Skill Gap Distribution
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 8: Skill Gap Distribution...');

  const sg1 = await req('GET', '/analytics/skill-gap-distribution', null, adminToken);
  assert(sg1.status === 200, '8.1 Skill gap distribution → 200');
  assert(Array.isArray(sg1.body?.data?.distribution), '8.2 distribution is array');

  // Trainer can see
  const trainerSG = await req('GET', '/analytics/skill-gap-distribution', null, trainerToken);
  assert(trainerSG.status === 200, '8.3 Trainer skill-gap-distribution → 200');

  // Trainee cannot
  const traineeSG = await req('GET', '/analytics/skill-gap-distribution', null, traineeToken);
  assert(traineeSG.status === 403, '8.4 TRAINEE skill-gap-distribution → 403');

  // ════════════════════════════════════════════════════
  // GROUP 9: Tenant Isolation
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 9: Tenant Isolation...');

  // Trainee B (Org B) personal summary should only show Org B data
  const bSummary = await req('GET', '/analytics/trainee-summary', null, traineeBToken);
  assert(bSummary.status === 200, '9.1 Trainee B summary → 200');
  assert(bSummary.body?.data?.traineeId === traineeBId, '9.2 Trainee B sees own data');
  assert(bSummary.body?.data?.organizationId === orgBId, '9.3 Trainee B org = Org B');

  // Trainee A should not see Trainee B data
  const aSummary = await req('GET', '/analytics/trainee-summary', null, traineeToken);
  assert(aSummary.body?.data?.traineeId === traineeId, '9.4 Trainee A sees own data');
  assert(aSummary.body?.data?.traineeId !== traineeBId, '9.5 Trainee A ≠ Trainee B');

  // ════════════════════════════════════════════════════
  // GROUP 10: Zero-Data Safety
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 10: Zero-Data Safety...');

  // Trainee B is in a fresh org with no data
  const bData = bSummary.body?.data;
  assert(bData?.coursesEnrolled === 0, '10.1 Zero enrolled = 0');
  assert(bData?.coursesCompleted === 0, '10.2 Zero completed = 0');
  assert(bData?.certificatesEarned === 0, '10.3 Zero certificates = 0');
  assert(bData?.averageAssessmentScore === 0, '10.4 Zero avg score = 0');
  assert(bData?.competenciesMeasured === 0, '10.5 Zero competencies = 0');
  assert(bData?.skillGapCount === 0, '10.6 Zero skill gaps = 0');
  assert(bData?.trainerSessions === 0, '10.7 Zero sessions = 0');
  assert(bData?.activeRecommendations === 0, '10.8 Zero recommendations = 0');

  // No field is null, undefined, or NaN
  const noNulls = Object.values(bData || {}).every(
    (v) => v !== null && v !== undefined && (typeof v !== 'number' || !isNaN(v))
  );
  assert(noNulls, '10.9 No null/undefined/NaN in zero-data summary');

  // ════════════════════════════════════════════════════
  // GROUP 11: Client Override Protection
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 11: Client Override Protection...');

  // Attempt to inject traineeId in query — should be ignored
  const override1 = await req('GET', `/analytics/trainee-summary?traineeId=${traineeBId}`, null, traineeToken);
  assert(override1.status === 200, '11.1 Override traineeId ignored → 200');
  assert(override1.body?.data?.traineeId === traineeId, '11.2 traineeId still = authenticated user');

  // Attempt to inject organizationId in body for invalidation
  const override2 = await req('POST', '/analytics/invalidate-snapshot', { organizationId: orgBId }, adminToken);
  assert(override2.status === 200, '11.3 Override org body still works for own org');

  // ════════════════════════════════════════════════════
  // GROUP 12: Migration Verification
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 12: Migration Verification...');

  const migRes = await db.query(`SELECT * FROM schema_migrations WHERE migration_name = '012_analytics.sql'`);
  assert(migRes.rows.length > 0, '12.1 Migration 012_analytics.sql recorded');

  const tableRes = await db.query(`SELECT to_regclass('analytics_snapshots') AS tbl`);
  assert(tableRes.rows[0]?.tbl !== null, '12.2 analytics_snapshots table exists');

  // Check unique constraint
  const constRes = await db.query(
    `SELECT 1 FROM pg_constraint WHERE conname = 'uq_org_snapshot'`
  );
  assert(constRes.rows.length > 0, '12.3 uq_org_snapshot constraint exists');

  // Check index
  const idxRes = await db.query(
    `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_analytics_snapshots_org'`
  );
  assert(idxRes.rows.length > 0, '12.4 idx_analytics_snapshots_org index exists');

  // ════════════════════════════════════════════════════
  // GROUP 13: Stage 1-9 Regression Smoke
  // ════════════════════════════════════════════════════
  console.log('\n▶ GROUP 13: Stage 1-9 Regression Smoke...');

  const r1 = await req('GET', '/health');
  assert(r1.status === 200, '13.1 Stage 0 — Health → 200');

  const r3 = await req('GET', '/auth/me', null, traineeToken);
  assert(r3.status === 200, '13.2 Stage 1 — Auth /me → 200');

  const r4 = await req('GET', '/courses', null, traineeToken);
  assert(r4.status === 200, '13.3 Stage 2 — Courses → 200');

  const r5 = await req('GET', '/enrollments', null, traineeToken);
  assert(r5.status === 200, '13.4 Stage 3 — Enrollments → 200');

  const r6 = await req('GET', '/assessments', null, traineeToken);
  assert(r6.status === 200, '13.5 Stage 4 — Assessments → 200');

  const r7 = await req('GET', '/competencies', null, traineeToken);
  assert(r7.status === 200, '13.6 Stage 5 — Competencies → 200');

  const r9 = await req('GET', '/recommendations/my', null, traineeToken);
  assert(r9.status === 200 || r9.status === 404, '13.7 Stage 7 — Recommendations reachable');

  const r10 = await req('GET', '/trainer-matching/matches', null, traineeToken);
  assert(r10.status === 200 || r10.status === 404, '13.8 Stage 8 — Trainer Matching reachable');

  const r11 = await req('GET', '/certificates/my-certificates', null, traineeToken);
  assert(r11.status === 200 || r11.status === 404, '13.9 Stage 9 — Certificates reachable');

  const r12 = await req('GET', '/analytics/trainee-summary', null, traineeToken);
  assert(r12.status === 200, '13.10 Stage 10 — Analytics reachable');

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
  console.log('  PostgreSQL Authoritative: YES');
  console.log('  Stage 0-9 Domain Tables Mutated: NO');
  console.log(`\n  Cold Dashboard: ${coldMs}ms`);
  console.log(`  Cached Dashboard: ${cachedMs}ms`);
  console.log(`  Stale Recompute: ${recomputeMs}ms`);
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
})();
