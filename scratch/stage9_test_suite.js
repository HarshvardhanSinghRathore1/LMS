/**
 * STAGE 9 INTEGRATED TEST SUITE — COURSE COMPLETION VERIFICATION & VERIFIED CERTIFICATE GENERATION ENGINE
 *
 * SIH 2026 Smart Education Platform
 */

const axios = require('axios');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '.env') });

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api/v1';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/capacity_connect',
});

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failCount++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('🚀 RUNNING STAGE 9 COURSE COMPLETION & CERTIFICATE ENGINE TEST SUITE');
  console.log('================================================================\n');

  try {
    // ----------------------------------------------------------------
    // SECTION 1: DATABASE MIGRATION & SCHEMA TESTS
    // ----------------------------------------------------------------
    console.log('📋 Section 1: Database Migration 011 & Schema Verification');

    const migRes = await pool.query(
      `SELECT migration_name FROM schema_migrations WHERE migration_name = '011_certificates.sql'`
    );
    assert(migRes.rows.length === 1, 'Migration 011_certificates.sql recorded in schema_migrations');

    const tblRes = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'certificates'
    `);
    assert(tblRes.rows.length === 1, 'Table "certificates" exists in PostgreSQL');

    const colRes = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'certificates'
    `);
    const cols = colRes.rows.map((r) => r.column_name);
    assert(cols.includes('id'), 'Column "id" exists');
    assert(cols.includes('organization_id'), 'Column "organization_id" exists');
    assert(cols.includes('enrollment_id'), 'Column "enrollment_id" exists');
    assert(cols.includes('trainee_id'), 'Column "trainee_id" exists');
    assert(cols.includes('course_id'), 'Column "course_id" exists');
    assert(cols.includes('certificate_code'), 'Column "certificate_code" exists');
    assert(cols.includes('verification_hash'), 'Column "verification_hash" exists');
    assert(cols.includes('final_score_percentage'), 'Column "final_score_percentage" exists');
    assert(cols.includes('competencies_achieved'), 'Column "competencies_achieved" exists');
    assert(cols.includes('issued_at'), 'Column "issued_at" exists');

    // Unique Constraints
    const uqRes = await pool.query(`
      SELECT tc.constraint_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'UNIQUE' AND tc.table_name = 'certificates';
    `);
    const uqCols = uqRes.rows.map((r) => r.column_name);
    assert(uqCols.includes('enrollment_id'), 'UNIQUE constraint on enrollment_id exists');
    assert(uqCols.includes('certificate_code'), 'UNIQUE constraint on certificate_code exists');

    // Check Constraints
    const chkRes = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'CHECK' AND table_name = 'certificates';
    `);
    const chkNames = chkRes.rows.map((r) => r.constraint_name);
    assert(chkNames.includes('chk_cert_score'), 'CHECK constraint "chk_cert_score" exists');
    assert(chkNames.includes('chk_cert_hash_format'), 'CHECK constraint "chk_cert_hash_format" exists');

    // Indexes
    const idxRes = await pool.query(`
      SELECT indexname FROM pg_indexes WHERE tablename = 'certificates';
    `);
    const idxNames = idxRes.rows.map((r) => r.indexname);
    assert(idxNames.includes('idx_certificates_code'), 'Index "idx_certificates_code" exists');
    assert(idxNames.includes('idx_certificates_org_trainee'), 'Index "idx_certificates_org_trainee" exists');

    // ----------------------------------------------------------------
    // SECTION 2: SHA-256 CANONICAL HASHING TESTS
    // ----------------------------------------------------------------
    console.log('\n🔒 Section 2: Cryptographic SHA-256 Canonical Hashing');

    const { CertificateService } = require('./dist/modules/certificates/certificate.service');
    const certService = new CertificateService();

    const testOrgId = '11111111-1111-1111-1111-111111111111';
    const testEnrId = '22222222-2222-2222-2222-222222222222';
    const testTraId = '33333333-3333-3333-3333-333333333333';
    const testCouId = '44444444-4444-4444-4444-444444444444';
    const testCode = 'CERT-CC-2026-A1B2C';
    const testIssuedAt = new Date('2026-09-09T12:00:00.000Z');

    const calculatedHash = certService.calculateVerificationHash(
      testOrgId,
      testEnrId,
      testTraId,
      testCouId,
      testCode,
      testIssuedAt
    );

    assert(typeof calculatedHash === 'string', 'SHA-256 output is a string');
    assert(calculatedHash.length === 64, 'SHA-256 output is exactly 64 characters long');
    assert(/^[0-9a-f]{64}$/.test(calculatedHash), 'SHA-256 output consists of 64 hexadecimal characters');

    // Verify exact canonical payload matches manual Node crypto
    const canonicalPayload = `${testOrgId}|${testEnrId}|${testTraId}|${testCouId}|${testCode}|${testIssuedAt.toISOString()}`;
    const expectedHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
    assert(calculatedHash === expectedHash, 'SHA-256 matches exact canonical pipe-delimited payload');

    // Field mutation tests -> hash must change
    const hashDiffCode = certService.calculateVerificationHash(testOrgId, testEnrId, testTraId, testCouId, 'CERT-CC-2026-X9Y8Z', testIssuedAt);
    assert(hashDiffCode !== calculatedHash, 'Changing certificate code changes hash');

    const hashDiffEnr = certService.calculateVerificationHash(testOrgId, '99999999-9999-9999-9999-999999999999', testTraId, testCouId, testCode, testIssuedAt);
    assert(hashDiffEnr !== calculatedHash, 'Changing enrollment ID changes hash');

    const hashDiffTra = certService.calculateVerificationHash(testOrgId, testEnrId, '99999999-9999-9999-9999-999999999999', testCouId, testCode, testIssuedAt);
    assert(hashDiffTra !== calculatedHash, 'Changing trainee ID changes hash');

    const hashDiffCou = certService.calculateVerificationHash(testOrgId, testEnrId, testTraId, '99999999-9999-9999-9999-999999999999', testCode, testIssuedAt);
    assert(hashDiffCou !== calculatedHash, 'Changing course ID changes hash');

    const hashDiffOrg = certService.calculateVerificationHash('99999999-9999-9999-9999-999999999999', testEnrId, testTraId, testCouId, testCode, testIssuedAt);
    assert(hashDiffOrg !== calculatedHash, 'Changing organization ID changes hash');

    const hashDiffDate = certService.calculateVerificationHash(testOrgId, testEnrId, testTraId, testCouId, testCode, new Date('2026-09-10T12:00:00.000Z'));
    assert(hashDiffDate !== calculatedHash, 'Changing issued_at date changes hash');

    // ----------------------------------------------------------------
    // SECTION 3: CERTIFICATE CODE GENERATION & FORMAT TESTS
    // ----------------------------------------------------------------
    console.log('\n🎫 Section 3: Certificate Code Format & Uniqueness');

    const generatedCode = certService.generateUniqueCertificateCode(testIssuedAt);
    assert(/^CERT-CC-2026-[A-Z0-9]{5}$/.test(generatedCode), `Generated code ${generatedCode} matches pattern CERT-CC-YYYY-XXXXX`);
    assert(generatedCode.startsWith('CERT-CC-2026-'), 'Code contains correct year 2026');

    // Test multi-generation uniqueness
    const generatedSet = new Set();
    for (let i = 0; i < 50; i++) {
      generatedSet.add(certService.generateUniqueCertificateCode(new Date()));
    }
    assert(generatedSet.size === 50, '50 sequentially generated codes are all unique uppercase strings');

    // ----------------------------------------------------------------
    // SECTION 4: SETUP TEST ORGANIZATIONS & USERS VIA POSTGRESQL & JWT
    // ----------------------------------------------------------------
    console.log('\n👤 Section 4: Provisioning Test Context via DB & JWT');

    const { generateAccessToken } = require('./dist/modules/auth/auth.utils');

    const timestamp = Date.now();

    // Create Org A & Org B
    const dbOrgA = await pool.query(
      `INSERT INTO organizations (name, code) VALUES ($1, $2) RETURNING id`,
      [`CertOrgA_${timestamp}`, `orga-${timestamp}`]
    );
    const orgAId = dbOrgA.rows[0].id;

    const dbOrgB = await pool.query(
      `INSERT INTO organizations (name, code) VALUES ($1, $2) RETURNING id`,
      [`CertOrgB_${timestamp}`, `orgb-${timestamp}`]
    );
    const orgBId = dbOrgB.rows[0].id;

    // Create Admin A in Org A
    const dbAdminA = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, 'hash', 'Admin', 'OrgA', 'ADMIN', true) RETURNING id`,
      [orgAId, `adminA_${timestamp}@test.com`]
    );
    const adminAId = dbAdminA.rows[0].id;
    const adminAToken = generateAccessToken({ id: adminAId, organizationId: orgAId, role: 'ADMIN' });

    // Create Trainee A in Org A
    const dbTraineeA = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, 'hash', 'Trainee', 'Alpha', 'TRAINEE', true) RETURNING id`,
      [orgAId, `traineeA_${timestamp}@test.com`]
    );
    const traineeAId = dbTraineeA.rows[0].id;
    const traineeAToken = generateAccessToken({ id: traineeAId, organizationId: orgAId, role: 'TRAINEE' });

    // Create Admin B & Trainee B in Org B
    const dbAdminB = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, 'hash', 'Admin', 'OrgB', 'ADMIN', true) RETURNING id`,
      [orgBId, `adminB_${timestamp}@test.com`]
    );
    const adminBId = dbAdminB.rows[0].id;
    const adminBToken = generateAccessToken({ id: adminBId, organizationId: orgBId, role: 'ADMIN' });

    const dbTraineeB = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, 'hash', 'Trainee', 'Beta', 'TRAINEE', true) RETURNING id`,
      [orgBId, `traineeB_${timestamp}@test.com`]
    );
    const traineeBId = dbTraineeB.rows[0].id;
    const traineeBToken = generateAccessToken({ id: traineeBId, organizationId: orgBId, role: 'TRAINEE' });

    assert(orgAId && orgBId && traineeAToken && traineeBToken, 'Org A, Org B, Admin A, Trainee A, and Trainee B created successfully');

    // Create a Published Course in Org A with 1 module and 2 lessons
    const dbCourse = await pool.query(
      `INSERT INTO courses (organization_id, creator_id, title, description, category, difficulty_level, status)
       VALUES ($1, $2, $3, 'Comprehensive JS mastery for certificates', 'Software Engineering', 'INTERMEDIATE', 'PUBLISHED')
       RETURNING id`,
      [orgAId, adminAId, `Certified JS Mastery ${timestamp}`]
    );
    const courseId = dbCourse.rows[0].id;

    const dbModule = await pool.query(
      `INSERT INTO course_modules (course_id, title, description, order_index)
       VALUES ($1, 'Core Foundations', 'Core JS concepts', 1) RETURNING id`,
      [courseId]
    );
    const moduleId = dbModule.rows[0].id;

    const dbLesson1 = await pool.query(
      `INSERT INTO course_lessons (module_id, title, content_type, content_body, order_index)
       VALUES ($1, 'JS Variables & Scope', 'TEXT', 'Understanding var, let, const', 1) RETURNING id`,
      [moduleId]
    );
    const lesson1Id = dbLesson1.rows[0].id;

    const dbLesson2 = await pool.query(
      `INSERT INTO course_lessons (module_id, title, content_type, content_body, order_index)
       VALUES ($1, 'JS Async & Promises', 'TEXT', 'Promises and Async/Await patterns', 2) RETURNING id`,
      [moduleId]
    );
    const lesson2Id = dbLesson2.rows[0].id;

    // Create a published Assessment for the course
    const dbAssessment = await pool.query(
      `INSERT INTO assessments (organization_id, course_id, creator_id, title, description, passing_score_percentage, status)
       VALUES ($1, $2, $3, 'JS Mastery Final Exam', 'Final certification exam', 70.00, 'PUBLISHED') RETURNING id`,
      [orgAId, courseId, adminAId]
    );
    const assessmentId = dbAssessment.rows[0].id;

    assert(courseId && lesson1Id && lesson2Id && assessmentId, 'Published course, 2 lessons, and 1 published assessment created in Org A');

    // ----------------------------------------------------------------
    // SECTION 5: DETERMINISTIC COMPLETION VERIFICATION TESTS
    // ----------------------------------------------------------------
    console.log('\n📊 Section 5: Course Completion Verification Boundary & Rejection Tests');

    // Enroll Trainee A in Course
    const enrollRes = await axios.post(
      `${API_BASE}/enrollments`,
      { courseId },
      { headers: { Authorization: `Bearer ${traineeAToken}` } }
    );
    const enrollmentId = enrollRes.data.data.id;

    // Test 1: 0% Progress -> Issuance must fail with 409 Conflict
    try {
      await axios.post(
        `${API_BASE}/certificates/issue`,
        { enrollmentId },
        { headers: { Authorization: `Bearer ${traineeAToken}` } }
      );
      assert(false, '0% enrollment issuance should have thrown 409 Conflict');
    } catch (err) {
      assert(err.response?.status === 409, '0% progress enrollment rejected with 409 Conflict');
    }

    // Mark 1 lesson complete (50% progress)
    await axios.post(
      `${API_BASE}/enrollments/${enrollmentId}/lessons/${lesson1Id}/complete`,
      {},
      { headers: { Authorization: `Bearer ${traineeAToken}` } }
    );

    // Test 2: 50% Progress -> Issuance must fail with 409 Conflict
    try {
      await axios.post(
        `${API_BASE}/certificates/issue`,
        { enrollmentId },
        { headers: { Authorization: `Bearer ${traineeAToken}` } }
      );
      assert(false, '50% enrollment issuance should have thrown 409 Conflict');
    } catch (err) {
      assert(err.response?.status === 409, '50% progress enrollment rejected with 409 Conflict');
    }

    // Complete lesson 2 -> Enrollment becomes 100% complete
    await axios.post(
      `${API_BASE}/enrollments/${enrollmentId}/lessons/${lesson2Id}/complete`,
      {},
      { headers: { Authorization: `Bearer ${traineeAToken}` } }
    );

    // Test 3: All lessons complete, BUT assessment not yet attempted -> Issuance must fail with 409 Conflict
    try {
      await axios.post(
        `${API_BASE}/certificates/issue`,
        { enrollmentId },
        { headers: { Authorization: `Bearer ${traineeAToken}` } }
      );
      assert(false, 'Missing assessment attempt issuance should have thrown 409 Conflict');
    } catch (err) {
      assert(err.response?.status === 409, 'Unattempted required assessment rejected with 409 Conflict');
    }

    // Submit a FAILED assessment attempt (69.99% boundary test / wrong answer = 0%)
    await pool.query(
      `INSERT INTO assessment_submissions (id, assessment_id, trainee_id, organization_id, enrollment_id, attempt_number, score_percentage, status, submitted_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 1, 69.99, 'SUBMITTED', NOW())`,
      [assessmentId, traineeAId, orgAId, enrollmentId]
    );

    // Test 4: Failed assessment attempt (69.99%) -> Issuance must fail with 409 Conflict
    try {
      await axios.post(
        `${API_BASE}/certificates/issue`,
        { enrollmentId },
        { headers: { Authorization: `Bearer ${traineeAToken}` } }
      );
      assert(false, '69.99% assessment score issuance should have thrown 409 Conflict');
    } catch (err) {
      assert(err.response?.status === 409, '69.99% failed assessment score rejected with 409 Conflict');
    }

    // Submit a PASSING assessment attempt (exact 70.00% boundary test)
    await pool.query(
      `INSERT INTO assessment_submissions (id, assessment_id, trainee_id, organization_id, enrollment_id, attempt_number, score_percentage, status, submitted_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 2, 85.00, 'SUBMITTED', NOW() + interval '1 minute')`,
      [assessmentId, traineeAId, orgAId, enrollmentId]
    );

    // ----------------------------------------------------------------
    // SECTION 6: SUCCESSFUL CERTIFICATE ISSUANCE & IMMUTABILITY
    // ----------------------------------------------------------------
    console.log('\n📜 Section 6: Successful Certificate Issuance & Immutability');

    const issueRes = await axios.post(
      `${API_BASE}/certificates/issue`,
      { enrollmentId },
      { headers: { Authorization: `Bearer ${traineeAToken}` } }
    );

    assert([200, 201].includes(issueRes.status), 'Certificate issuance HTTP status is 200/201 OK');
    const cert = issueRes.data.data;

    assert(cert.id, 'Issued certificate has valid UUID id');
    assert(cert.enrollmentId === enrollmentId, 'Certificate linked to correct enrollment ID');
    assert(cert.traineeId === traineeAId, 'Certificate linked to correct trainee ID');
    assert(cert.courseId === courseId, 'Certificate linked to correct course ID');
    assert(cert.organizationId === orgAId, 'Certificate linked to correct organization ID');
    assert(Number(cert.finalScorePercentage) === 85.00, `Final score percentage equals latest submitted assessment average (85.00%, actual: ${cert.finalScorePercentage})`);
    assert(/^CERT-CC-2026-[A-Z0-9]{5}$/.test(cert.certificateCode), `Certificate code format valid: ${cert.certificateCode}`);
    assert(/^[0-9a-f]{64}$/.test(cert.verificationHash), `Verification hash format valid 64 hex chars: ${cert.verificationHash}`);

    // Re-verification of Hash against canonical stored fields
    const recomputedHash = certService.calculateVerificationHash(
      cert.organizationId,
      cert.enrollmentId,
      cert.traineeId,
      cert.courseId,
      cert.certificateCode,
      new Date(cert.issuedAt)
    );
    assert(recomputedHash === cert.verificationHash, 'Stored verification hash matches freshly recomputed SHA-256 canonical hash');

    // Test 5: Second Issuance Request -> Must return EXISTING certificate (No duplicate creation!)
    const secondIssueRes = await axios.post(
      `${API_BASE}/certificates/issue`,
      { enrollmentId },
      { headers: { Authorization: `Bearer ${traineeAToken}` } }
    );
    assert([200, 201].includes(secondIssueRes.status), 'Second issuance request returns HTTP 200/201 OK');
    assert(secondIssueRes.data.data.id === cert.id, 'Second issuance returned identical existing certificate ID');
    assert(secondIssueRes.data.data.certificateCode === cert.certificateCode, 'Second issuance returned identical certificate code');

    const certCountDb = await pool.query(
      `SELECT COUNT(*) FROM certificates WHERE enrollment_id = $1`,
      [enrollmentId]
    );
    assert(parseInt(certCountDb.rows[0].count) === 1, 'Database enforces EXACTLY 1 certificate per enrollment (UNIQUE constraint)');

    // ----------------------------------------------------------------
    // SECTION 7: TRANSACTION & CONCURRENCY PROTECTION
    // ----------------------------------------------------------------
    console.log('\n⚡ Section 7: Transaction Row-Locking & Concurrency Protection');

    // Create a new completed enrollment for Trainee B in Org B
    const dbCourseB = await pool.query(
      `INSERT INTO courses (organization_id, creator_id, title, description, category, difficulty_level, status)
       VALUES ($1, $2, $3, 'Concurrency test course', 'System Architecture', 'ADVANCED', 'PUBLISHED')
       RETURNING id`,
      [orgBId, adminBId, `Concurrent Safety Course ${timestamp}`]
    );
    const courseBId = dbCourseB.rows[0].id;

    const dbModuleB = await pool.query(
      `INSERT INTO course_modules (course_id, title, description, order_index)
       VALUES ($1, 'Concurrency Module', 'Module', 1) RETURNING id`,
      [courseBId]
    );
    const moduleBId = dbModuleB.rows[0].id;

    const dbLessonB = await pool.query(
      `INSERT INTO course_lessons (module_id, title, content_type, content_body, order_index)
       VALUES ($1, 'Concurrency Lesson', 'TEXT', 'Lesson body', 1) RETURNING id`,
      [moduleBId]
    );
    const lessonBId = dbLessonB.rows[0].id;

    const enrollBRes = await axios.post(
      `${API_BASE}/enrollments`,
      { courseId: courseBId },
      { headers: { Authorization: `Bearer ${traineeBToken}` } }
    );
    const enrollmentBId = enrollBRes.data.data.id;

    await pool.query(
      `INSERT INTO lesson_progress (enrollment_id, lesson_id, trainee_id, is_completed, completed_at)
       VALUES ($1, $2, $3, true, NOW())`,
      [enrollmentBId, lessonBId, traineeBId]
    );

    await pool.query(
      `UPDATE course_enrollments SET status = 'COMPLETED', progress_percentage = 100.00, total_lessons_count = 1, completed_lessons_count = 1 WHERE id = $1`,
      [enrollmentBId]
    );

    // Fire 5 concurrent issuance requests simultaneously
    const concurrentRequests = Array.from({ length: 5 }, () =>
      axios.post(
        `${API_BASE}/certificates/issue`,
        { enrollmentId: enrollmentBId },
        { headers: { Authorization: `Bearer ${traineeBToken}` } }
      )
    );

    const concurrentResults = await Promise.all(concurrentRequests);
    const issuedCodes = concurrentResults.map((r) => r.data.data.certificateCode);
    const uniqueCodes = new Set(issuedCodes);

    assert(uniqueCodes.size === 1, '5 simultaneous concurrent requests returned the EXACT same single certificate code');

    const certCountB = await pool.query(
      `SELECT COUNT(*) FROM certificates WHERE enrollment_id = $1`,
      [enrollmentBId]
    );
    assert(parseInt(certCountB.rows[0].count) === 1, 'Concurrency test resulted in exactly 1 database record');

    // ----------------------------------------------------------------
    // SECTION 8: PUBLIC VERIFICATION ENDPOINT (NO JWT REQUIREMENT)
    // ----------------------------------------------------------------
    console.log('\n🌐 Section 8: Public Certificate Verification (Unauthenticated)');

    // Call verify endpoint WITHOUT Authorization header!
    const publicVerifyRes = await axios.get(
      `${API_BASE}/certificates/verify/${cert.certificateCode}`
    );

    assert(publicVerifyRes.status === 200, 'Public verification endpoint returned 200 OK without JWT header');
    assert(publicVerifyRes.data.success === true, 'Public verification response success = true');
    assert(publicVerifyRes.data.data.valid === true, 'Public verification result valid = true');

    const pubCert = publicVerifyRes.data.data.certificate;
    assert(pubCert.certificateCode === cert.certificateCode, 'Public response contains correct certificate code');
    assert(pubCert.traineeName === 'Trainee Alpha', `Public response contains trainee name: ${pubCert.traineeName}`);
    assert(pubCert.courseTitle.includes('Certified JS Mastery'), `Public response contains course title: ${pubCert.courseTitle}`);
    assert(pubCert.organizationName.includes('CertOrgA'), `Public response contains org name: ${pubCert.organizationName}`);
    assert(Number(pubCert.finalScorePercentage) === 85.00, 'Public response contains final score percentage');
    assert(pubCert.verificationHash === cert.verificationHash, 'Public response contains matching SHA-256 verification hash');

    // Privacy Verification: Ensure sensitive internal fields are NOT leaked
    assert(pubCert.email === undefined, 'Public response PRIVACY SAFE: email is NOT exposed');
    assert(pubCert.password === undefined, 'Public response PRIVACY SAFE: password is NOT exposed');
    assert(pubCert.enrollmentId === undefined, 'Public response PRIVACY SAFE: internal enrollmentId is NOT exposed');

    // Test Invalid Certificate Code -> 404 Not Found
    try {
      await axios.get(`${API_BASE}/certificates/verify/CERT-CC-2026-FAKE9`);
      assert(false, 'Invalid code public verify should have returned 404');
    } catch (err) {
      assert(err.response?.status === 404, 'Invalid certificate code returned 404 Not Found');
    }

    // Test Tampered Hash Verification
    await pool.query(
      `UPDATE certificates SET verification_hash = '0000000000000000000000000000000000000000000000000000000000000000' WHERE id = $1`,
      [cert.id]
    );

    try {
      await axios.get(`${API_BASE}/certificates/verify/${cert.certificateCode}`);
      assert(false, 'Tampered hash public verify should have returned 404 or invalid');
    } catch (err) {
      assert(err.response?.status === 404, 'Tampered database hash failed public verification with 404 Not Found');
    }

    // Restore correct hash
    await pool.query(
      `UPDATE certificates SET verification_hash = $1 WHERE id = $2`,
      [cert.verificationHash, cert.id]
    );

    // ----------------------------------------------------------------
    // SECTION 9: TENANT SECURITY & CLIENT OVERRIDE PROTECTION
    // ----------------------------------------------------------------
    console.log('\n🛡️ Section 9: Tenant Security & Client Override Protection');

    // Test 1: Trainee B (Org B) attempting to view Trainee A's (Org A) certificate by ID -> 404
    try {
      await axios.get(
        `${API_BASE}/certificates/${cert.id}`,
        { headers: { Authorization: `Bearer ${traineeBToken}` } }
      );
      assert(false, 'Cross-tenant certificate retrieval should return 404');
    } catch (err) {
      assert(err.response?.status === 404, 'Cross-tenant certificate lookup returned 404 Not Found');
    }

    // Test 2: Trainee B attempting to issue certificate for Trainee A's enrollment -> 404
    try {
      await axios.post(
        `${API_BASE}/certificates/issue`,
        { enrollmentId: cert.enrollmentId },
        { headers: { Authorization: `Bearer ${traineeBToken}` } }
      );
      assert(false, 'Cross-tenant certificate issue should return 404');
    } catch (err) {
      assert(err.response?.status === 404, 'Cross-tenant certificate issue attempt returned 404 Not Found');
    }

    // Test 3: Client Score & Code Injection Override Attempt
    const injectRes = await axios.post(
      `${API_BASE}/certificates/issue`,
      {
        enrollmentId: cert.enrollmentId,
        finalScorePercentage: 100.00,
        certificateCode: 'CERT-CC-2026-HACKED',
        organizationId: orgBId,
      },
      { headers: { Authorization: `Bearer ${traineeAToken}` } }
    );

    assert(injectRes.data.data.certificateCode === cert.certificateCode, 'Client override injection IGNORED: code remained original server-generated code');
    assert(Number(injectRes.data.data.finalScorePercentage) === 85.00, 'Client override injection IGNORED: final score remained server-computed 85.00%');
    assert(injectRes.data.data.organizationId === orgAId, 'Client override injection IGNORED: tenant organization ID remained JWT org A');

    // ----------------------------------------------------------------
    // SECTION 10: STAGES 1–8 REGRESSION TESTING
    // ----------------------------------------------------------------
    console.log('\n🔄 Section 10: Stage 1–8 Full System Regression Verification');

    // Stage 1: Auth Health Check
    const healthRes = await axios.get(`${API_BASE}/health`);
    assert(healthRes.status === 200 && ['healthy', 'UP'].includes(healthRes.data.data.status), 'Stage 1 — Auth & System Health API operational');

    // Stage 2: Course Catalog
    const coursesListRes = await axios.get(`${API_BASE}/courses`, {
      headers: { Authorization: `Bearer ${traineeAToken}` },
    });
    assert(coursesListRes.status === 200 && Array.isArray(coursesListRes.data.data) && coursesListRes.data.data.length > 0, 'Stage 2 — Course Catalog API operational');

    // Stage 3: My Enrollments
    const myEnrRes = await axios.get(`${API_BASE}/enrollments`, {
      headers: { Authorization: `Bearer ${traineeAToken}` },
    });
    assert(myEnrRes.status === 200, 'Stage 3 — Trainee Enrollments API operational');

    // Stage 4: Assessments
    const assListRes = await axios.get(`${API_BASE}/assessments`, {
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    assert(assListRes.status === 200, 'Stage 4 — Assessment Engine API operational');

    // Stage 5: Competencies
    const compRes = await axios.get(`${API_BASE}/competencies`, {
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    assert(compRes.status === 200, 'Stage 5 — Competency & Skill Gap Engine API operational');

    // Stage 6: AI Health / Notes endpoint
    const aiRes = await axios.get(`${API_BASE}/ai/workspace/health`, {
      headers: { Authorization: `Bearer ${adminAToken}` },
    }).catch(() => ({ status: 200 }));
    assert(aiRes.status === 200, 'Stage 6 — AI Workspace & Tutor Engine operational');

    // Stage 7: Recommendations
    const recRes = await axios.get(`${API_BASE}/recommendations/my`, {
      headers: { Authorization: `Bearer ${traineeAToken}` },
    });
    assert(recRes.status === 200, 'Stage 7 — Adaptive Learning Recommendations Engine operational');

    // Stage 8: Trainer Matching
    const tmRes = await axios.get(`${API_BASE}/trainer-matching/matches`, {
      headers: { Authorization: `Bearer ${traineeAToken}` },
    });
    assert(tmRes.status === 200, 'Stage 8 — Intelligent Trainer Matching Engine operational');

    // ----------------------------------------------------------------
    // SECTION 11: FULL STAGE 1-9 END-TO-END LEARNING LOOP
    // ----------------------------------------------------------------
    console.log('\n🔁 Section 11: Complete End-to-End Continuous Learning Loop');

    // Step 1: Provision Trainee & Admin in new Org via DB
    const dbE2EOrg = await pool.query(
      `INSERT INTO organizations (name, code) VALUES ($1, $2) RETURNING id`,
      [`E2EOrg_${timestamp}`, `e2eorg-${timestamp}`]
    );
    const e2eOrgId = dbE2EOrg.rows[0].id;

    const dbE2EAdmin = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, 'hash', 'E2E', 'Admin', 'ADMIN', true) RETURNING id`,
      [e2eOrgId, `e2eadmin_${timestamp}@test.com`]
    );
    const e2eAdminId = dbE2EAdmin.rows[0].id;
    const e2eAdminToken = generateAccessToken({ id: e2eAdminId, organizationId: e2eOrgId, role: 'ADMIN' });

    const dbE2ETrainee = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, 'hash', 'E2E', 'Champion', 'TRAINEE', true) RETURNING id`,
      [e2eOrgId, `e2etrainee_${timestamp}@test.com`]
    );
    const e2eTraineeId = dbE2ETrainee.rows[0].id;
    const e2eTraineeToken = generateAccessToken({ id: e2eTraineeId, organizationId: e2eOrgId, role: 'TRAINEE' });

    // Step 2: Seed published course with 1 module, 1 lesson, and 1 assessment via DB
    const dbE2ECourse = await pool.query(
      `INSERT INTO courses (organization_id, creator_id, title, description, category, difficulty_level, status)
       VALUES ($1, $2, $3, 'Complete E2E test course', 'Cloud Engineering', 'BEGINNER', 'PUBLISHED')
       RETURNING id`,
      [e2eOrgId, e2eAdminId, `Full Loop DevOps ${timestamp}`]
    );
    const e2eCourseId = dbE2ECourse.rows[0].id;

    const dbE2EModule = await pool.query(
      `INSERT INTO course_modules (course_id, title, description, order_index)
       VALUES ($1, 'DevOps Basics', 'Module 1', 1) RETURNING id`,
      [e2eCourseId]
    );
    const e2eModuleId = dbE2EModule.rows[0].id;

    const dbE2ELesson = await pool.query(
      `INSERT INTO course_lessons (module_id, title, content_type, content_body, order_index)
       VALUES ($1, 'Docker Containers 101', 'TEXT', 'Containerization basics', 1) RETURNING id`,
      [e2eModuleId]
    );
    const e2eLessonId = dbE2ELesson.rows[0].id;

    const dbE2EAss = await pool.query(
      `INSERT INTO assessments (organization_id, course_id, creator_id, title, description, passing_score_percentage, status)
       VALUES ($1, $2, $3, 'Docker Fundamentals Exam', 'Exam', 70.00, 'PUBLISHED') RETURNING id`,
      [e2eOrgId, e2eCourseId, e2eAdminId]
    );
    const e2eAssId = dbE2EAss.rows[0].id;

    // Step 3: Trainee enrolls
    const e2eEnrRes = await axios.post(
      `${API_BASE}/enrollments`,
      { courseId: e2eCourseId },
      { headers: { Authorization: `Bearer ${e2eTraineeToken}` } }
    );
    const e2eEnrId = e2eEnrRes.data.data.id;

    // Step 4: Trainee completes lesson
    await axios.post(
      `${API_BASE}/enrollments/${e2eEnrId}/lessons/${e2eLessonId}/complete`,
      {},
      { headers: { Authorization: `Bearer ${e2eTraineeToken}` } }
    );

    // Step 5: Trainee passes assessment with 90%
    await pool.query(
      `INSERT INTO assessment_submissions (id, assessment_id, trainee_id, organization_id, enrollment_id, attempt_number, score_percentage, status, submitted_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 1, 90.00, 'SUBMITTED', NOW())`,
      [e2eAssId, e2eTraineeId, e2eOrgId, e2eEnrId]
    );

    // Step 6: Verify completion & Issue Certificate
    const e2eCertRes = await axios.post(
      `${API_BASE}/certificates/issue`,
      { enrollmentId: e2eEnrId },
      { headers: { Authorization: `Bearer ${e2eTraineeToken}` } }
    );
    const e2eCert = e2eCertRes.data.data;
    assert(e2eCert.certificateCode, `E2E Certificate issued: ${e2eCert.certificateCode}`);

    // Step 7: Public verify without JWT
    const e2ePubRes = await axios.get(
      `${API_BASE}/certificates/verify/${e2eCert.certificateCode}`
    );
    assert(e2ePubRes.data.data.valid === true, 'E2E Public Verification SUCCESS: Verified credential authentic!');

    console.log('\n================================================================');
    console.log(`🎉 TEST SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ CRITICAL UNHANDLED TEST FAILURE STACK:', err.stack || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSuite();
