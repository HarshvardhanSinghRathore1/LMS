const http = require('http');
const app = require('../backend/dist/app').default;
const { pool } = require('../backend/dist/config/database');

let BASE_URL = '';
let server = null;

function request(method, path, body = null, token = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    if (token) reqHeaders['Authorization'] = 'Bearer ' + token;

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let PASS = 0;
let totalTests = 0;

function check(condition, message, extra = null) {
  totalTests++;
  if (!condition) {
    console.error('\n ❌ FAILED [' + totalTests + ']: ' + message);
    if (extra) console.error('  Details:', JSON.stringify(extra, null, 2));
    process.exit(1);
  } else {
    PASS++;
    console.log('  ✅ [' + totalTests + '] ' + message);
  }
}

async function runTests() {
  console.log('=======================================================');
  console.log('   CAPACITY CONNECT - STAGE 7 COMPLETE TEST SUITE      ');
  console.log('   Personalized Recommendations & Adaptive Pathway    ');
  console.log('=======================================================\n');

  // Start internal test HTTP server on random port
  server = app.listen(0);
  const port = server.address().port;
  BASE_URL = `http://localhost:${port}/api/v1`;
  console.log(`🚀 Test server running on http://localhost:${port}\n`);

  // Setup test organizations
  await pool.query(`INSERT INTO organizations (name, code) VALUES ('Stage7 Org A', 'S7ORGA') ON CONFLICT (code) DO NOTHING;`);
  await pool.query(`INSERT INTO organizations (name, code) VALUES ('Stage7 Org B', 'S7ORGB') ON CONFLICT (code) DO NOTHING;`);

  const { rows: [orgA] } = await pool.query(`SELECT id FROM organizations WHERE code = 'S7ORGA';`);
  const { rows: [orgB] } = await pool.query(`SELECT id FROM organizations WHERE code = 'S7ORGB';`);

  const orgAId = orgA.id;
  const orgBId = orgB.id;

  // SECTION 1: INFRASTRUCTURE & MIGRATIONS
  console.log('--- 1. Infrastructure & Migration Verification ---');
  const h1 = await request('GET', '/health');
  check(h1.status === 200 && h1.body?.data?.status === 'healthy', 'GET /health -> 200 healthy', h1);

  const { rows: migRows } = await pool.query(`SELECT migration_name FROM schema_migrations WHERE migration_name = '009_recommendations.sql';`);
  check(migRows.length === 1, 'Migration 009_recommendations.sql registered in schema_migrations', migRows);

  const { rows: tblRows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recommendations';`);
  check(tblRows.length === 1, 'recommendations table exists in PostgreSQL database', tblRows);

  // SECTION 2: USER REGISTRATION & AUTHENTICATION
  console.log('\n--- 2. User Setup & RBAC Credentials ---');
  const ts = Date.now();
  const adminEmail = `s7admin_${ts}@test.com`;
  const trainerEmail = `s7trainer_${ts}@test.com`;
  const trainee1Email = `s7trainee1_${ts}@test.com`;
  const trainee2Email = `s7trainee2_${ts}@test.com`;
  const orgBUserEmail = `s7orgb_${ts}@test.com`;

  const r1 = await request('POST', '/auth/register', { name: 'S7 Admin', email: adminEmail, password: 'Password123!', organizationCode: 'S7ORGA' });
  check(r1.status === 201, 'Admin registered', r1);
  await pool.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [r1.body.data.user.id]);

  const r2 = await request('POST', '/auth/register', { name: 'S7 Trainer', email: trainerEmail, password: 'Password123!', organizationCode: 'S7ORGA' });
  check(r2.status === 201, 'Trainer registered', r2);
  await pool.query(`UPDATE users SET role = 'TRAINER' WHERE id = $1`, [r2.body.data.user.id]);

  const r3 = await request('POST', '/auth/register', { name: 'S7 Trainee 1', email: trainee1Email, password: 'Password123!', organizationCode: 'S7ORGA' });
  check(r3.status === 201, 'Trainee 1 registered', r3);

  const r4 = await request('POST', '/auth/register', { name: 'S7 Trainee 2 (Cold Start)', email: trainee2Email, password: 'Password123!', organizationCode: 'S7ORGA' });
  check(r4.status === 201, 'Trainee 2 registered', r4);
  const trainee2Id = r4.body.data.user.id;

  const r5 = await request('POST', '/auth/register', { name: 'S7 Org B Admin', email: orgBUserEmail, password: 'Password123!', organizationCode: 'S7ORGB' });
  check(r5.status === 201, 'Org B Admin registered', r5);
  await pool.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [r5.body.data.user.id]);

  const r6 = await request('POST', '/auth/register', { name: 'S7 Org B Trainee', email: `s7orgbtrainee_${ts}@test.com`, password: 'Password123!', organizationCode: 'S7ORGB' });
  check(r6.status === 201, 'Org B Trainee registered', r6);

  // Login
  const l1 = await request('POST', '/auth/login', { email: adminEmail, password: 'Password123!' });
  const adminToken = l1.body.data.accessToken;

  const l2 = await request('POST', '/auth/login', { email: trainerEmail, password: 'Password123!' });
  const trainerToken = l2.body.data.accessToken;

  const l3 = await request('POST', '/auth/login', { email: trainee1Email, password: 'Password123!' });
  const trainee1Token = l3.body.data.accessToken;
  const trainee1Id = l3.body.data.user.id;

  const l4 = await request('POST', '/auth/login', { email: trainee2Email, password: 'Password123!' });
  const trainee2Token = l4.body.data.accessToken;

  const l5 = await request('POST', '/auth/login', { email: orgBUserEmail, password: 'Password123!' });
  const orgBAdminToken = l5.body.data.accessToken;

  const l6 = await request('POST', '/auth/login', { email: `s7orgbtrainee_${ts}@test.com`, password: 'Password123!' });
  const orgBTraineeToken = l6.body.data.accessToken;

  // SECTION 3: RBAC AUTHORIZATION
  console.log('\n--- 3. Role-Based Access Control (RBAC) ---');
  const rbac1 = await request('POST', '/recommendations/generate', {}, adminToken);
  check(rbac1.status === 403, 'Admin cannot use trainee recommendations generate (403 Forbidden)', rbac1);

  const rbac2 = await request('POST', '/recommendations/generate', {}, trainerToken);
  check(rbac2.status === 403, 'Trainer cannot use trainee recommendations generate (403 Forbidden)', rbac2);

  const rbac3 = await request('POST', '/recommendations/generate', {});
  check(rbac3.status === 401, 'Unauthenticated user cannot generate recommendations (401 Unauthorized)', rbac3);

  const rbac4 = await request('POST', '/recommendations/generate', {}, trainee1Token);
  check(rbac4.status === 200, 'Trainee can generate recommendations (200 OK)', rbac4);

  // SECTION 4: CONTROLLED COMPETENCY & COURSE DATA SETUP
  console.log('\n--- 4. Data Setup for Exact 60/25/15 Formula Verification ---');
  // Competency C1: target score 100%
  const compRes1 = await request('POST', '/competencies', { code: `COMP_S7_1_${ts}`, name: 'System Architecture', targetScorePercentage: 100 }, adminToken);
  check(compRes1.status === 201, 'Competency C1 created', compRes1);
  const comp1Id = compRes1.body.data.id;

  // Competency C2: target score 100%
  const compRes2 = await request('POST', '/competencies', { code: `COMP_S7_2_${ts}`, name: 'Database Engineering', targetScorePercentage: 100 }, adminToken);
  check(compRes2.status === 201, 'Competency C2 created', compRes2);
  const comp2Id = compRes2.body.data.id;

  // Set evaluated competency score for Trainee 1 on C1: current = 40% -> gap = 60%
  await pool.query(
    `INSERT INTO trainee_competencies (organization_id, trainee_id, competency_id, current_score_percentage, proficiency_level, gap_percentage)
     VALUES ($1, $2, $3, 40.00, 'INTERMEDIATE', 60.00)
     ON CONFLICT (trainee_id, competency_id) DO UPDATE SET current_score_percentage = 40.00, gap_percentage = 60.00;`,
    [orgAId, trainee1Id, comp1Id]
  );

  // Course P1: Published, mapped to C1 with weight = 80.
  const c1Res = await request('POST', '/courses', { title: 'S7 Course P1 Architecture', description: 'Advanced Architecture', category: 'Engineering', difficultyLevel: 'INTERMEDIATE' }, adminToken);
  check(c1Res.status === 201, 'Course P1 created', c1Res);
  const courseP1Id = c1Res.body.data.id;

  // Add module and lesson to P1
  const m1Res = await request('POST', `/courses/${courseP1Id}/modules`, { title: 'Module 1', orderIndex: 1 }, adminToken);
  const mod1Id = m1Res.body.data.id;
  await request('POST', `/courses/modules/${mod1Id}/lessons`, { title: 'Lesson 1', contentType: 'TEXT', contentBody: 'Architecture concepts', durationMinutes: 10, orderIndex: 1 }, adminToken);

  // Map P1 to C1 with weight 80
  const mapRes1 = await request('POST', `/competencies/${comp1Id}/map-course`, { courseId: courseP1Id, weight: 80 }, adminToken);
  check(mapRes1.status === 201, 'Course P1 mapped to Competency C1', mapRes1);

  // Publish P1
  await request('POST', `/courses/${courseP1Id}/publish`, {}, adminToken);

  // Seed dummy user for historical completion rate enrollments
  const dummyRes = await request('POST', '/auth/register', { name: 'S7 Dummy User', email: `s7dummy_${ts}@test.com`, password: 'Password123!', organizationCode: 'S7ORGA' });
  const dummyUserId = dummyRes.body.data.user.id;

  // Seed historical enrollments for P1 to achieve 50% completion rate (2 total, 1 completed)
  await pool.query(
    `INSERT INTO course_enrollments (id, organization_id, course_id, trainee_id, status, progress_percentage)
     VALUES (gen_random_uuid(), $1, $2, $3, 'COMPLETED', 100.00),
            (gen_random_uuid(), $1, $2, $4, 'IN_PROGRESS', 50.00);`,
    [orgAId, courseP1Id, dummyUserId, trainee2Id]
  );

  // SECTION 5: EXACT 60/25/15 SCORING FORMULA TEST
  console.log('\n--- 5. Exact 60/25/15 Formula Verification ---');
  // Calculation:
  // Skill Gap Factor = 60 (gap = 100 - 40 = 60)
  // Mapping Factor = (80 / 80) * 100 = 100
  // Completion Rate Factor = (1 / 2) * 100 = 50
  // Score = (60 * 0.60) + (100 * 0.25) + (50 * 0.15) = 36 + 25 + 7.5 = 68.50
  const genRes1 = await request('POST', '/recommendations/generate', {}, trainee1Token);
  check(genRes1.status === 200, 'Recommendation generated for Trainee 1', genRes1);
  check(Array.isArray(genRes1.body.data), 'Returns recommendations array', genRes1.body);

  const recP1 = genRes1.body.data.find((r) => r.course_id === courseP1Id);
  check(recP1 != null, 'Course P1 recommended to Trainee 1', recP1);
  check(Number(recP1.match_score) === 68.50, `Match score is EXACTLY 68.50 (got ${recP1.match_score})`, recP1);
  check(recP1.recommendation_type === 'PERSONALIZED', 'Recommendation type is PERSONALIZED', recP1);
  check(recP1.recommendation_reason.includes('System Architecture skill gap is 60%'), 'Reason text includes competency name and gap %', recP1);

  // SECTION 6: COLD START GENERATION
  console.log('\n--- 6. Cold Start Generation ---');
  const coldRes = await request('POST', '/recommendations/generate', {}, trainee2Token);
  check(coldRes.status === 200, 'Cold start recommendations generated for Trainee 2', coldRes);
  check(coldRes.body.data.length > 0, 'Cold start produces recommendations', coldRes.body.data);

  const coldRec = coldRes.body.data[0];
  check(coldRec.recommendation_type === 'COLD_START', 'Cold start type is COLD_START', coldRec);
  check(coldRec.competency_id === null, 'Cold start competency_id is NULL', coldRec);
  check(Number(coldRec.gap_percentage_addressed) === 0, 'Cold start gap_percentage_addressed is 0', coldRec);
  check(coldRec.recommendation_reason.includes('starting course based on strong historical completion'), 'Cold start reason generated correctly', coldRec);

  // SECTION 7: COURSE ELIGIBILITY & STATE EXCLUSIONS
  console.log('\n--- 7. Course Eligibility & State Exclusions ---');
  // Create Course P_Enrolled (ENROLLED for Trainee 1)
  const cEnrolled = await request('POST', '/courses', { title: 'P_Enrolled Course', description: 'Detailed course description for testing', category: 'Tech', difficultyLevel: 'BEGINNER' }, adminToken);
  const cEnrolledId = cEnrolled.body.data.id;
  const mEnrolled = await request('POST', `/courses/${cEnrolledId}/modules`, { title: 'Mod 1', orderIndex: 1 }, adminToken);
  await request('POST', `/courses/modules/${mEnrolled.body.data.id}/lessons`, { title: 'Les 1', contentType: 'TEXT', contentBody: 'content', durationMinutes: 10, orderIndex: 1 }, adminToken);
  await request('POST', `/courses/${cEnrolledId}/publish`, {}, adminToken);
  await pool.query(`INSERT INTO course_enrollments (organization_id, course_id, trainee_id, status) VALUES ($1, $2, $3, 'ENROLLED');`, [orgAId, cEnrolledId, trainee1Id]);

  // Create Course P_Dropped (DROPPED for Trainee 1)
  const cDropped = await request('POST', '/courses', { title: 'P_Dropped Course', description: 'Detailed course description for testing', category: 'Tech', difficultyLevel: 'BEGINNER' }, adminToken);
  const cDroppedId = cDropped.body.data.id;
  const mDropped = await request('POST', `/courses/${cDroppedId}/modules`, { title: 'Mod 1', orderIndex: 1 }, adminToken);
  await request('POST', `/courses/modules/${mDropped.body.data.id}/lessons`, { title: 'Les 1', contentType: 'TEXT', contentBody: 'content', durationMinutes: 10, orderIndex: 1 }, adminToken);
  await request('POST', `/competencies/${comp1Id}/map-course`, { courseId: cDroppedId, weight: 50 }, adminToken);
  await request('POST', `/courses/${cDroppedId}/publish`, {}, adminToken);
  await pool.query(`INSERT INTO course_enrollments (organization_id, course_id, trainee_id, status) VALUES ($1, $2, $3, 'DROPPED');`, [orgAId, cDroppedId, trainee1Id]);

  const genEx = await request('POST', '/recommendations/generate', {}, trainee1Token);
  const candidateCourseIds = genEx.body.data.map((r) => r.course_id);

  check(!candidateCourseIds.includes(cEnrolledId), 'ENROLLED course is EXCLUDED from recommendations', candidateCourseIds);
  check(candidateCourseIds.includes(cDroppedId), 'DROPPED course IS ALLOWED in recommendations', candidateCourseIds);

  // SECTION 8: TENANT SECURITY ISOLATION
  console.log('\n--- 8. Multi-Tenant Security Isolation ---');
  // Create course in Org B
  const cOrgB = await request('POST', '/courses', { title: 'Org B Secret Course', description: 'Detailed course description for testing', category: 'Tech', difficultyLevel: 'BEGINNER' }, orgBAdminToken);
  const cOrgBId = cOrgB.body.data.id;
  const mOrgB = await request('POST', `/courses/${cOrgBId}/modules`, { title: 'Mod 1', orderIndex: 1 }, orgBAdminToken);
  await request('POST', `/courses/modules/${mOrgB.body.data.id}/lessons`, { title: 'Les 1', contentType: 'TEXT', contentBody: 'content', durationMinutes: 10, orderIndex: 1 }, orgBAdminToken);
  await request('POST', `/courses/${cOrgBId}/publish`, {}, orgBAdminToken);

  // Generate for Org B Trainee
  const genOrgB = await request('POST', '/recommendations/generate', {}, orgBTraineeToken);
  check(genOrgB.status === 200, 'Org B trainee generates recommendations', genOrgB);
  const recOrgBId = genOrgB.body.data[0].id;

  // Trainee 1 (Org A) attempting to view, accept, or dismiss Org B recommendation
  const cross1 = await request('POST', `/recommendations/${recOrgBId}/dismiss`, {}, trainee1Token);
  check(cross1.status === 404, 'Cross-tenant dismiss returns 404 Not Found', cross1);

  const cross2 = await request('POST', `/recommendations/${recOrgBId}/accept`, {}, trainee1Token);
  check(cross2.status === 404, 'Cross-tenant accept returns 404 Not Found', cross2);

  const cross3 = await request('GET', `/recommendations/pathway?courseId=${cOrgBId}`, null, trainee1Token);
  check(cross3.status === 404, 'Cross-tenant pathway returns 404 Not Found', cross3);

  // SECTION 9: DISMISS LIFECYCLE PERSISTENCE
  console.log('\n--- 9. Dismiss Persistence Across Generation Runs ---');
  const recToDismiss = genEx.body.data.find((r) => r.course_id === cDroppedId);
  check(recToDismiss != null, 'Found recommendation to dismiss', recToDismiss);

  const disRes = await request('POST', `/recommendations/${recToDismiss.id}/dismiss`, {}, trainee1Token);
  check(disRes.status === 200, 'Dismiss recommendation -> 200 OK', disRes);
  check(disRes.body.data.status === 'DISMISSED', 'Status updated to DISMISSED', disRes.body.data);

  // Re-generate recommendations
  const genAfterDismiss = await request('POST', '/recommendations/generate', {}, trainee1Token);
  const activeIdsAfterDismiss = genAfterDismiss.body.data.map((r) => r.id);
  check(!activeIdsAfterDismiss.includes(recToDismiss.id), 'Dismissed recommendation does NOT reappear in active list', activeIdsAfterDismiss);

  const { rows: disCheckRows } = await pool.query(`SELECT status FROM recommendations WHERE id = $1;`, [recToDismiss.id]);
  check(disCheckRows[0].status === 'DISMISSED', 'Database status remains DISMISSED', disCheckRows);

  // SECTION 10: TRANSACTION ROLLBACK TEST (MANDATORY TEST)
  console.log('\n--- 10. Atomic Accept Transaction Rollback Test ---');
  // Create candidate recommendation for rollback testing
  const cRollback = await request('POST', '/courses', { title: 'Rollback Test Course', description: 'Detailed course description for testing', category: 'Tech', difficultyLevel: 'BEGINNER' }, adminToken);
  const cRollbackId = cRollback.body.data.id;
  const mRollback = await request('POST', `/courses/${cRollbackId}/modules`, { title: 'Mod 1', orderIndex: 1 }, adminToken);
  await request('POST', `/courses/modules/${mRollback.body.data.id}/lessons`, { title: 'Les 1', contentType: 'TEXT', contentBody: 'content', durationMinutes: 10, orderIndex: 1 }, adminToken);
  await request('POST', `/competencies/${comp1Id}/map-course`, { courseId: cRollbackId, weight: 50 }, adminToken);
  await request('POST', `/courses/${cRollbackId}/publish`, {}, adminToken);

  const genForRollback = await request('POST', '/recommendations/generate', {}, trainee1Token);
  const recRollback = genForRollback.body.data.find((r) => r.course_id === cRollbackId);
  check(recRollback != null, 'Found active recommendation for rollback test', recRollback);

  // Force enrollment failure inside transaction
  const rollbackRes = await request('POST', `/recommendations/${recRollback.id}/accept`, { forceEnrollmentFailure: true }, trainee1Token);
  check(rollbackRes.status === 500, 'Accept with forced failure returns 500 Error', rollbackRes);

  // Verify recommendation remains ACTIVE and NO enrollment created
  const { rows: recRollbackCheck } = await pool.query(`SELECT status FROM recommendations WHERE id = $1;`, [recRollback.id]);
  check(recRollbackCheck[0].status === 'ACTIVE', 'Recommendation status REMAINS ACTIVE after transaction rollback', recRollbackCheck);

  const { rows: enRollbackCheck } = await pool.query(`SELECT * FROM course_enrollments WHERE course_id = $1 AND trainee_id = $2;`, [cRollbackId, trainee1Id]);
  check(enRollbackCheck.length === 0, 'NO course_enrollments record created after transaction rollback', enRollbackCheck);

  // SECTION 11: ATOMIC ACCEPT SUCCESS & STAGE 3 INTEGRATION
  console.log('\n--- 11. Atomic Accept Success & Stage 3 Integration ---');
  const acceptRes = await request('POST', `/recommendations/${recP1.id}/accept`, {}, trainee1Token);
  check(acceptRes.status === 200, 'Accept recommendation succeeds -> 200 OK', acceptRes);
  check(acceptRes.body.data.recommendation.status === 'ENROLLED', 'Recommendation status updated to ENROLLED', acceptRes.body.data);
  check(acceptRes.body.data.enrollment != null, 'Stage 3 enrollment returned in response', acceptRes.body.data);

  const { rows: enCheckRows } = await pool.query(`SELECT * FROM course_enrollments WHERE course_id = $1 AND trainee_id = $2;`, [courseP1Id, trainee1Id]);
  check(enCheckRows.length === 1, 'Stage 3 enrollment record exists in database', enCheckRows);
  check(enCheckRows[0].status === 'ENROLLED', 'Enrollment status is ENROLLED', enCheckRows[0]);

  // SECTION 12: DUPLICATE ACCEPT PREVENTION
  console.log('\n--- 12. Duplicate Accept Prevention ---');
  const dupAccept = await request('POST', `/recommendations/${recP1.id}/accept`, {}, trainee1Token);
  check(dupAccept.status === 409, 'Duplicate accept on ENROLLED recommendation returns 409 Conflict', dupAccept);

  // SECTION 13: CLIENT PARAMETER OVERRIDE PREVENTION
  console.log('\n--- 13. Client Override Prevention Security Test ---');
  const overrideRes = await request('POST', '/recommendations/generate', {
    traineeId: '00000000-0000-0000-0000-000000000000',
    organizationId: orgBId,
    matchScore: 100,
    status: 'ENROLLED',
  }, trainee1Token);

  check(overrideRes.status === 200, 'Generate request succeeds ignoring client override payload', overrideRes);
  check(overrideRes.body.data.every((r) => r.organization_id === orgAId), 'Client organizationId override ignored; output derived from JWT', overrideRes.body.data);

  // SECTION 14: ADAPTIVE LEARNING PATHWAY
  console.log('\n--- 14. Adaptive Learning Pathway ---');
  const pathRes = await request('GET', `/recommendations/pathway?courseId=${courseP1Id}`, null, trainee1Token);
  check(pathRes.status === 200, 'GET /recommendations/pathway -> 200 OK', pathRes);
  check(pathRes.body.data.course.id === courseP1Id, 'Pathway loaded for correct course', pathRes.body.data);
  check(Array.isArray(pathRes.body.data.steps), 'Steps array returned', pathRes.body.data);
  check(pathRes.body.data.steps.length >= 1, 'At least 1 step in pathway', pathRes.body.data.steps);
  check(pathRes.body.data.steps[0].type === 'LESSON', 'First step is LESSON', pathRes.body.data.steps[0]);

  // SECTION 15: 100% DETERMINISM VERIFICATION
  console.log('\n--- 15. 100% Deterministic Output Verification ---');
  const det1 = await request('POST', '/recommendations/generate', {}, trainee1Token);
  const det2 = await request('POST', '/recommendations/generate', {}, trainee1Token);

  const clean1 = det1.body.data.map(({ created_at, updated_at, ...rest }) => rest);
  const clean2 = det2.body.data.map(({ created_at, updated_at, ...rest }) => rest);

  check(JSON.stringify(clean1) === JSON.stringify(clean2), 'Consecutive recommendation generations produce 100% IDENTICAL output', { det1: clean1, det2: clean2 });

  // SECTION 16: CRITICAL END-TO-END CONTINUOUS LEARNING LOOP TEST
  console.log('\n--- 16. Critical End-to-End Continuous Learning Loop Test ---');
  // Setup loop test entities
  const compLoop = await request('POST', '/competencies', { code: `COMP_LOOP_${ts}`, name: 'Loop Competency', targetScorePercentage: 100 }, adminToken);
  const compLoopId = compLoop.body.data.id;

  const cLoop = await request('POST', '/courses', { title: 'Loop Course', description: 'Detailed course description for testing', category: 'Tech', difficultyLevel: 'BEGINNER' }, adminToken);
  const cLoopId = cLoop.body.data.id;
  const mLoop = await request('POST', `/courses/${cLoopId}/modules`, { title: 'Mod 1', orderIndex: 1 }, adminToken);
  const lLoop = await request('POST', `/courses/modules/${mLoop.body.data.id}/lessons`, { title: 'Les 1', contentType: 'TEXT', contentBody: 'content', durationMinutes: 10, orderIndex: 1 }, adminToken);

  await request('POST', `/competencies/${compLoopId}/map-course`, { courseId: cLoopId, weight: 100 }, adminToken);
  await request('POST', `/courses/${cLoopId}/publish`, {}, adminToken);

  // Initial Trainee 2 evaluated score on compLoop: current = 20% -> gap = 80%
  await pool.query(
    `INSERT INTO trainee_competencies (organization_id, trainee_id, competency_id, current_score_percentage, proficiency_level, gap_percentage)
     VALUES ($1, $2, $3, 20.00, 'NOVICE', 80.00);`,
    [orgAId, trainee2Id, compLoopId]
  );

  // Step 1: Generate recommendation -> High score due to 80% skill gap
  const recLoop1 = await request('POST', '/recommendations/generate', {}, trainee2Token);
  const targetRec1 = recLoop1.body.data.find((r) => r.course_id === cLoopId);
  check(targetRec1 != null, 'Loop Step 1: Course recommended', targetRec1);
  const initialMatchScore = Number(targetRec1.match_score);
  check(initialMatchScore >= 48.00, `Loop Step 1: High initial match score (${initialMatchScore}) based on 80% skill gap`, targetRec1);

  // Step 2: Accept recommendation -> Enrolled
  const acceptLoop = await request('POST', `/recommendations/${targetRec1.id}/accept`, {}, trainee2Token);
  check(acceptLoop.status === 200, 'Loop Step 2: Recommendation accepted & enrolled', acceptLoop);
  const enrollmentId = acceptLoop.body.data.enrollment.id;

  // Step 3: Complete lesson in Stage 3 -> triggers competency re-evaluation
  const progRes = await request('POST', `/enrollments/${enrollmentId}/lessons/${lLoop.body.data.id}/complete`, {}, trainee2Token);
  check(progRes.status === 200, 'Loop Step 3: Lesson marked complete in Stage 3', progRes);

  // Step 4: Verify competency score updated in Stage 5
  const { rows: compCheckRows } = await pool.query(`SELECT current_score_percentage, gap_percentage FROM trainee_competencies WHERE trainee_id = $1 AND competency_id = $2;`, [trainee2Id, compLoopId]);
  check(compCheckRows.length === 1, 'Stage 5 competency record exists', compCheckRows);
  check(Number(compCheckRows[0].current_score_percentage) > 20.00, `Stage 5 competency score increased from 20% to ${compCheckRows[0].current_score_percentage}%`, compCheckRows[0]);
  check(Number(compCheckRows[0].gap_percentage) < 80.00, `Stage 5 skill gap decreased from 80% to ${compCheckRows[0].gap_percentage}%`, compCheckRows[0]);

  console.log('\n=======================================================');
  console.log(`   STAGE 7 COMPLETE: ${PASS}/${totalTests} TESTS PASSED`);
  console.log('=======================================================\n');

  server.close();
  await pool.end();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n💥 TEST SUITE CRASHED:', err);
  if (server) server.close();
  pool.end().then(() => process.exit(1)).catch(() => process.exit(1));
});
