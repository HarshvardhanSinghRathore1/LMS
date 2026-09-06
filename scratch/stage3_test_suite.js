const API_BASE = 'http://localhost:5000/api/v1';

async function runStage3TestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING CAPACITY CONNECT — STAGE 3 AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, errorDetail = '') {
    if (condition) {
      console.log(`  ✅ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${message} ${errorDetail ? `[Detail: ${errorDetail}]` : ''}`);
      failed++;
    }
  }

  async function api(method, url, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${url}`, options);
    let data = null;
    try {
      data = await res.json();
    } catch (e) {}

    return { status: res.status, ok: res.ok, data };
  }

  try {
    // ----------------------------------------------------
    // TEST 1 — REGRESSION HEALTH CHECKS
    // ----------------------------------------------------
    console.log('--- TEST 1: REGRESSION HEALTH CHECKS ---');
    const healthRes = await api('GET', '/health');
    assert(healthRes.status === 200 && healthRes.data?.data?.status === 'healthy', 'GET /api/v1/health returns 200 OK');

    const aiHealthRes = await api('GET', '/health/ai');
    assert(aiHealthRes.status === 200 && aiHealthRes.data?.data?.status === 'healthy', 'GET /api/v1/health/ai returns 200 OK');

    // ----------------------------------------------------
    // TEST 2 — AUTHENTICATION & USER SETUP
    // ----------------------------------------------------
    console.log('\n--- TEST 2: AUTHENTICATION SETUP ---');
    const uniqueSuffix = Date.now().toString().slice(-5);

    // 1. Admin A Login (Org cc)
    const adminLoginRes = await api('POST', '/auth/login', {
      email: 'admin@lms.com',
      password: 'adminbylms',
    });
    const adminAToken = adminLoginRes.data?.data?.accessToken;
    const orgAId = adminLoginRes.data?.data?.user?.organizationId;
    assert(adminAToken && orgAId, 'Admin User Org A logged in & token acquired', JSON.stringify(adminLoginRes));

    // 2. Trainee A Registration in Org cc
    const traineeARes = await api('POST', '/auth/register', {
      name: 'Trainee User OrgA',
      email: `trainee.orga.${uniqueSuffix}@test.com`,
      password: 'Password123!',
      organizationCode: 'cc',
    });
    const traineeAToken = traineeARes.data?.data?.accessToken;
    const traineeAId = traineeARes.data?.data?.user?.id;
    assert(traineeAToken && traineeAId, 'Trainee User Org A registered & token acquired');

    // 3. Register Trainee B in Isolated Org B (ORG001)
    const traineeBRes = await api('POST', '/auth/register', {
      name: 'Trainee User OrgB',
      email: `trainee.orgb.${uniqueSuffix}@test.com`,
      password: 'Password123!',
      organizationCode: 'ORG001',
    });
    const traineeBToken = traineeBRes.data?.data?.accessToken;
    const orgBId = traineeBRes.data?.data?.user?.organizationId;
    assert(traineeBToken && orgBId && orgBId !== orgAId, 'Trainee User Org B registered in isolated tenant ORG001');

    // ----------------------------------------------------
    // TEST 3 — COURSE CREATION & PUBLICATION
    // ----------------------------------------------------
    console.log('\n--- TEST 3: COURSE CREATION & PUBLICATION ---');
    const courseRes = await api(
      'POST',
      '/courses',
      {
        title: `Stage 3 Test Course ${uniqueSuffix}`,
        description: 'Comprehensive capacity building course for Stage 3 validation.',
        category: 'Technology',
        difficultyLevel: 'INTERMEDIATE',
      },
      adminAToken
    );
    const courseId = courseRes.data?.data?.id;
    assert(courseRes.status === 201 && courseId, 'Published target course created as DRAFT');

    // Add Module
    const moduleRes = await api(
      'POST',
      `/courses/${courseId}/modules`,
      { title: 'Module 1: Foundations', description: 'Core principles', orderIndex: 1 },
      adminAToken
    );
    const moduleId = moduleRes.data?.data?.id;

    // Add Lesson 1
    const lesson1Res = await api(
      'POST',
      `/courses/modules/${moduleId}/lessons`,
      { title: 'Lesson 1.1: Introduction', contentType: 'TEXT', contentBody: 'Hello World', durationMinutes: 15, orderIndex: 1 },
      adminAToken
    );
    const lesson1Id = lesson1Res.data?.data?.id;

    // Add Lesson 2
    const lesson2Res = await api(
      'POST',
      `/courses/modules/${moduleId}/lessons`,
      { title: 'Lesson 1.2: Deep Dive', contentType: 'TEXT', contentBody: 'Advanced content', durationMinutes: 30, orderIndex: 2 },
      adminAToken
    );
    const lesson2Id = lesson2Res.data?.data?.id;
    assert(lesson1Id && lesson2Id, '2 Lessons created under Module 1');

    // Publish Course
    const publishRes = await api('POST', `/courses/${courseId}/publish`, {}, adminAToken);
    assert(publishRes.data?.data?.status === 'PUBLISHED', 'Course published successfully');

    // ----------------------------------------------------
    // TEST 4 — TRAINEE ENROLLMENT
    // ----------------------------------------------------
    console.log('\n--- TEST 4: TRAINEE ENROLLMENT ---');
    const enrollRes = await api('POST', '/enrollments', { courseId }, traineeAToken);
    const enrollment = enrollRes.data?.data;
    assert(
      enrollRes.status === 201 &&
        enrollment?.status === 'ENROLLED' &&
        Number(enrollment?.progress_percentage) === 0.00 &&
        enrollment?.total_lessons_count === 2 &&
        enrollment?.completed_lessons_count === 0,
      'Trainee A successfully enrolled in published course with 0% progress'
    );
    const enrollmentId = enrollment?.id;

    // ----------------------------------------------------
    // TEST 5 — DUPLICATE ENROLLMENT REJECTION
    // ----------------------------------------------------
    console.log('\n--- TEST 5: DUPLICATE ENROLLMENT REJECTION ---');
    const dupRes = await api('POST', '/enrollments', { courseId }, traineeAToken);
    assert(dupRes.status === 409, 'Duplicate enrollment correctly rejected with 409 Conflict');

    // ----------------------------------------------------
    // TEST 6 — DRAFT COURSE ENROLLMENT REJECTION
    // ----------------------------------------------------
    console.log('\n--- TEST 6: DRAFT COURSE ENROLLMENT REJECTION ---');
    const draftCourseRes = await api(
      'POST',
      '/courses',
      { title: 'Draft Only Course', description: 'Unpublished course', category: 'General' },
      adminAToken
    );
    const draftCourseId = draftCourseRes.data?.data?.id;

    const draftEnrollRes = await api('POST', '/enrollments', { courseId: draftCourseId }, traineeAToken);
    assert(draftEnrollRes.status === 400, 'Draft course enrollment correctly rejected with 400 Bad Request');

    // ----------------------------------------------------
    // TEST 7 — ENROLLMENT PRIVACY & TENANT ISOLATION
    // ----------------------------------------------------
    console.log('\n--- TEST 7: ENROLLMENT PRIVACY & ISOLATION ---');
    const privacyRes = await api('GET', `/enrollments/${enrollmentId}`, null, traineeBToken);
    assert(privacyRes.status === 404, 'Trainee B blocked from Trainee A enrollment with 404 Not Found', JSON.stringify(privacyRes));

    // ----------------------------------------------------
    // TEST 8 — LESSON COMPLETION & PROGRESS RECALCULATION
    // ----------------------------------------------------
    console.log('\n--- TEST 8: LESSON COMPLETION & RECALCULATION ---');
    const complete1Res = await api(
      'POST',
      `/enrollments/${enrollmentId}/lessons/${lesson1Id}/complete`,
      {},
      traineeAToken
    );
    const updatedEnrollment1 = complete1Res.data?.data?.enrollment;
    assert(
      complete1Res.status === 200 &&
        updatedEnrollment1?.completed_lessons_count === 1 &&
        Number(updatedEnrollment1?.progress_percentage) === 50.00 &&
        updatedEnrollment1?.status === 'IN_PROGRESS',
      'Lesson 1 completion updated progress to 50.00% and status to IN_PROGRESS'
    );

    // ----------------------------------------------------
    // TEST 9 — COURSE COMPLETION STATE (100%)
    // ----------------------------------------------------
    console.log('\n--- TEST 9: COURSE COMPLETION STATE (100%) ---');
    const complete2Res = await api(
      'POST',
      `/enrollments/${enrollmentId}/lessons/${lesson2Id}/complete`,
      {},
      traineeAToken
    );
    const completedEnrollment = complete2Res.data?.data?.enrollment;
    assert(
      complete2Res.status === 200 &&
        completedEnrollment?.completed_lessons_count === 2 &&
        Number(completedEnrollment?.progress_percentage) === 100.00 &&
        completedEnrollment?.status === 'COMPLETED' &&
        completedEnrollment?.completed_at !== null,
      'Lesson 2 completion updated progress to 100.00%, status to COMPLETED, and set completed_at timestamp',
      JSON.stringify(complete2Res)
    );

    // ----------------------------------------------------
    // TEST 10 — UNCOMPLETION REVERSAL
    // ----------------------------------------------------
    console.log('\n--- TEST 10: UNCOMPLETION REVERSAL ---');
    const uncompleteRes = await api(
      'POST',
      `/enrollments/${enrollmentId}/lessons/${lesson2Id}/uncomplete`,
      {},
      traineeAToken
    );
    const uncompletedEnrollment = uncompleteRes.data?.data?.enrollment;
    assert(
      uncompleteRes.status === 200 &&
        uncompletedEnrollment?.completed_lessons_count === 1 &&
        Number(uncompletedEnrollment?.progress_percentage) === 50.00 &&
        uncompletedEnrollment?.status === 'IN_PROGRESS' &&
        uncompletedEnrollment?.completed_at === null,
      'Lesson 2 uncompletion reversed status to IN_PROGRESS and cleared completed_at'
    );

    // ----------------------------------------------------
    // TEST 11 — DROPPING ENROLLMENT
    // ----------------------------------------------------
    console.log('\n--- TEST 11: DROPPING ENROLLMENT ---');
    const dropRes = await api('POST', `/enrollments/${enrollmentId}/drop`, {}, traineeAToken);
    assert(dropRes.data?.data?.status === 'DROPPED', 'Enrollment status updated to DROPPED');

    // Attempting lesson progress on dropped enrollment
    const droppedProgressRes = await api(
      'POST',
      `/enrollments/${enrollmentId}/lessons/${lesson1Id}/complete`,
      {},
      traineeAToken
    );
    assert(droppedProgressRes.status === 400, 'Lesson progress on dropped enrollment correctly rejected with 400 Bad Request');

    // ----------------------------------------------------
    // TEST 12 — CROSS-TENANT ENROLLMENT ATTEMPT
    // ----------------------------------------------------
    console.log('\n--- TEST 12: CROSS-TENANT ENROLLMENT ATTEMPT ---');
    const crossTenantRes = await api('POST', '/enrollments', { courseId }, traineeBToken);
    assert(crossTenantRes.status === 404, 'Cross-tenant course enrollment concealed with 404 Not Found');

    // ----------------------------------------------------
    // TEST 13 — CLIENT OVERRIDE & INJECTION IMMUNITY
    // ----------------------------------------------------
    console.log('\n--- TEST 13: CLIENT OVERRIDE IMMUNITY ---');
    const injectRes = await api(
      'POST',
      '/enrollments',
      {
        courseId,
        organizationId: orgBId,
        traineeId: 'fake-trainee-id',
        progressPercentage: 100,
        status: 'COMPLETED',
      },
      adminAToken
    );
    assert(injectRes.status !== 201, 'Non-trainee enrollment injection rejected');

    // ----------------------------------------------------
    // TEST 14 — ADMIN & TRAINER METRICS
    // ----------------------------------------------------
    console.log('\n--- TEST 14: ORGANIZATION METRICS ---');
    const metricsRes = await api('GET', '/enrollments/metrics/organization', null, adminAToken);
    const metrics = metricsRes.data?.data;
    assert(
      metricsRes.status === 200 &&
        metrics?.totalEnrollments >= 1 &&
        typeof metrics?.averageProgressPercentage === 'number',
      'Admin retrieved organization enrollment metrics successfully',
      JSON.stringify(metricsRes)
    );

    // Trainee forbidden from metrics
    const traineeMetricsRes = await api('GET', '/enrollments/metrics/organization', null, traineeAToken);
    assert(
      traineeMetricsRes.status === 403,
      'Trainee correctly blocked from organization metrics with 403 Forbidden',
      JSON.stringify(traineeMetricsRes)
    );

    console.log('\n====================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
  } catch (error) {
    console.error('CRITICAL UNHANDLED SUITE ERROR:', error);
  }
}

runStage3TestSuite();
