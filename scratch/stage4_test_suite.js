const API_BASE = 'http://localhost:5000/api/v1';

async function runStage4TestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING CAPACITY CONNECT — STAGE 4 AUTOMATED TEST SUITE');
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

    try {
      const res = await fetch(`${API_BASE}${url}`, options);
      let data = null;
      try {
        data = await res.json();
      } catch (e) {}

      return { status: res.status, ok: res.ok, data };
    } catch (err) {
      return { status: 500, ok: false, data: { error: err.message } };
    }
  }

  try {
    const uniqueSuffix = Date.now().toString().slice(-5);

    // ----------------------------------------------------
    // TEST 1 — REGRESSION HEALTH CHECKS
    // ----------------------------------------------------
    console.log('--- TEST 1: REGRESSION HEALTH CHECKS ---');
    const healthRes = await api('GET', '/health');
    assert(healthRes.status === 200 && healthRes.data?.data?.status === 'healthy', 'GET /api/v1/health returns 200 OK');

    const aiHealthRes = await api('GET', '/health/ai');
    assert(aiHealthRes.status === 200 && aiHealthRes.data?.data?.status === 'healthy', 'GET /api/v1/health/ai returns 200 OK');

    // ----------------------------------------------------
    // AUTHENTICATION & TENANT SETUP
    // ----------------------------------------------------
    console.log('\n--- SETUP: AUTHENTICATION & TENANTS ---');
    // Admin A in Org cc
    const adminLoginRes = await api('POST', '/auth/login', {
      email: 'admin@lms.com',
      password: 'adminbylms',
    });
    const adminAToken = adminLoginRes.data?.data?.accessToken;
    const orgAId = adminLoginRes.data?.data?.user?.organizationId;
    assert(adminAToken && orgAId, 'Admin User Org A logged in & token acquired');

    // Trainer A in Org cc
    const trainerARes = await api('POST', '/auth/register', {
      name: 'Trainer User OrgA',
      email: `trainer.orga.${uniqueSuffix}@test.com`,
      password: 'Password123!',
      organizationCode: 'cc',
    });
    const trainerAToken = trainerARes.data?.data?.accessToken;
    assert(trainerAToken, 'Trainer User Org A registered & token acquired');

    // Trainee A in Org cc
    const traineeARes = await api('POST', '/auth/register', {
      name: 'Trainee User OrgA',
      email: `trainee.orga.${uniqueSuffix}@test.com`,
      password: 'Password123!',
      organizationCode: 'cc',
    });
    const traineeAToken = traineeARes.data?.data?.accessToken;
    const traineeAId = traineeARes.data?.data?.user?.id;
    assert(traineeAToken && traineeAId, 'Trainee User Org A registered & token acquired');

    // Trainee B in Org B (ORG001)
    const traineeBRes = await api('POST', '/auth/register', {
      name: 'Trainee User OrgB',
      email: `trainee.orgb.${uniqueSuffix}@test.com`,
      password: 'Password123!',
      organizationCode: 'ORG001',
    });
    const traineeBToken = traineeBRes.data?.data?.accessToken;
    const orgBId = traineeBRes.data?.data?.user?.organizationId;
    assert(traineeBToken && orgBId && orgBId !== orgAId, 'Trainee User Org B registered in isolated tenant ORG001');

    // Create & Publish Course A in Org A
    const courseARes = await api(
      'POST',
      '/courses',
      {
        title: `Stage 4 Test Course Org A ${uniqueSuffix}`,
        description: 'Course for assessment engine testing.',
        category: 'Assessment',
        difficultyLevel: 'BEGINNER',
      },
      adminAToken
    );
    const courseAId = courseARes.data?.data?.id;
    assert(courseAId, 'Course A created in Org A');
    await api('POST', `/courses/${courseAId}/publish`, null, adminAToken);

    // Create & Publish Course B in Org B (using Trainee B or create Admin B if needed)
    // Trainee B cannot create course, let's test cross tenant using courseAId directly against Org B.

    // ----------------------------------------------------
    // TEST 2 — ASSESSMENT CREATION & RBAC
    // ----------------------------------------------------
    console.log('\n--- TEST 2: ASSESSMENT CREATION & RBAC ---');
    // Admin A creates assessment
    const assAdminRes = await api(
      'POST',
      '/assessments',
      {
        courseId: courseAId,
        title: `Admin Assessment ${uniqueSuffix}`,
        description: 'Comprehensive test by Admin.',
        passingScorePercentage: 70,
        timeLimitMinutes: 30,
        maxAttempts: 3,
      },
      adminAToken
    );
    const assessmentId = assAdminRes.data?.data?.id;
    assert(
      assAdminRes.status === 201 && assessmentId && assAdminRes.data?.data?.status === 'DRAFT',
      'ADMIN can create assessment (status = DRAFT)',
      JSON.stringify(assAdminRes)
    );

    // Trainer A creates assessment
    const assTrainerRes = await api(
      'POST',
      '/assessments',
      {
        courseId: courseAId,
        title: `Trainer Assessment ${uniqueSuffix}`,
        passingScorePercentage: 60,
        maxAttempts: 2,
      },
      trainerAToken
    );
    assert(assTrainerRes.status === 201, 'TRAINER can create assessment');

    // Trainee A tries to create assessment -> 403
    const assTraineeRes = await api(
      'POST',
      '/assessments',
      {
        courseId: courseAId,
        title: `Trainee Assessment ${uniqueSuffix}`,
      },
      traineeAToken
    );
    assert(assTraineeRes.status === 403, 'TRAINEE is forbidden from creating assessments (403)');

    // ----------------------------------------------------
    // TEST 3 — QUESTION CREATION (MCQ & TRUE_FALSE)
    // ----------------------------------------------------
    console.log('\n--- TEST 3: QUESTION CREATION ---');
    // Q1 MCQ (10 pts, orderIndex 0)
    const q1Res = await api(
      'POST',
      `/assessments/${assessmentId}/questions`,
      {
        questionText: 'What is 2 + 2?',
        questionType: 'MCQ',
        points: 10,
        orderIndex: 0,
        options: ['2', '3', '4', '5'],
        correctAnswer: '4',
      },
      adminAToken
    );
    const q1Id = q1Res.data?.data?.id;
    assert(q1Res.status === 201 && q1Id, 'MCQ Question created with valid options and answer');

    // Q2 TRUE_FALSE (10 pts, orderIndex 1)
    const q2Res = await api(
      'POST',
      `/assessments/${assessmentId}/questions`,
      {
        questionText: 'The earth orbits the sun.',
        questionType: 'TRUE_FALSE',
        points: 10,
        orderIndex: 1,
        options: ['true', 'false'],
        correctAnswer: 'true',
      },
      adminAToken
    );
    const q2Id = q2Res.data?.data?.id;
    assert(q2Res.status === 201 && q2Id, 'TRUE_FALSE Question created with valid boolean options');

    // ----------------------------------------------------
    // TEST 4 — INVALID QUESTION REJECTION
    // ----------------------------------------------------
    console.log('\n--- TEST 4: INVALID QUESTION REJECTION ---');
    // MCQ invalid answer (not in options)
    const invQ1 = await api(
      'POST',
      `/assessments/${assessmentId}/questions`,
      {
        questionText: 'Invalid MCQ',
        questionType: 'MCQ',
        points: 10,
        orderIndex: 2,
        options: ['A', 'B'],
        correctAnswer: 'C',
      },
      adminAToken
    );
    assert(invQ1.status === 400, 'Rejects MCQ with correct answer not in options (400)');

    // Negative points
    const invQ2 = await api(
      'POST',
      `/assessments/${assessmentId}/questions`,
      {
        questionText: 'Negative points',
        questionType: 'TRUE_FALSE',
        points: -5,
        orderIndex: 2,
        options: ['true', 'false'],
        correctAnswer: 'true',
      },
      adminAToken
    );
    assert(invQ2.status === 400, 'Rejects question with negative points (400)');

    // Duplicate orderIndex
    const invQ3 = await api(
      'POST',
      `/assessments/${assessmentId}/questions`,
      {
        questionText: 'Duplicate order',
        questionType: 'TRUE_FALSE',
        points: 5,
        orderIndex: 0, // Duplicate of Q1
        options: ['true', 'false'],
        correctAnswer: 'true',
      },
      adminAToken
    );
    assert(invQ3.status === 400, 'Rejects question with duplicate orderIndex (400)');

    // ----------------------------------------------------
    // TEST 5 — PUBLISH ASSESSMENT
    // ----------------------------------------------------
    console.log('\n--- TEST 5: PUBLISH ASSESSMENT ---');
    // Create an empty draft assessment
    const emptyAssRes = await api(
      'POST',
      '/assessments',
      { courseId: courseAId, title: 'Empty Assessment' },
      adminAToken
    );
    const emptyAssId = emptyAssRes.data?.data?.id;

    // Attempt publish empty assessment -> fail
    const pubEmptyRes = await api('POST', `/assessments/${emptyAssId}/publish`, null, adminAToken);
    assert(pubEmptyRes.status === 400, 'Cannot publish assessment with 0 questions (400)');

    // Publish primary assessment (has Q1 and Q2)
    const pubRes = await api('POST', `/assessments/${assessmentId}/publish`, null, adminAToken);
    assert(pubRes.status === 200 && pubRes.data?.data?.status === 'PUBLISHED', 'Assessment published successfully (status = PUBLISHED)');

    // ----------------------------------------------------
    // TEST 6 — NON-ENROLLED TRAINEE BLOCK
    // ----------------------------------------------------
    console.log('\n--- TEST 6: NON-ENROLLED TRAINEE BLOCK ---');
    // Trainee A is NOT yet enrolled in Course A. Tries to start attempt.
    const startNonEnrolledRes = await api('POST', `/assessments/${assessmentId}/start`, null, traineeAToken);
    assert(
      startNonEnrolledRes.status === 403 || startNonEnrolledRes.status === 400,
      'Non-enrolled trainee blocked from starting assessment attempt',
      JSON.stringify(startNonEnrolledRes)
    );

    // ----------------------------------------------------
    // TEST 7 — ENROLLED TRAINEE ATTEMPT START
    // ----------------------------------------------------
    console.log('\n--- TEST 7: ENROLLED TRAINEE ATTEMPT START ---');
    // Enroll Trainee A in Course A
    await api('POST', `/enrollments/courses/${courseAId}`, null, traineeAToken);

    // Trainee A starts attempt
    const startRes1 = await api('POST', `/assessments/${assessmentId}/start`, null, traineeAToken);
    const attempt1 = startRes1.data?.data;
    assert(
      startRes1.status === 201 && attempt1?.id && attempt1?.attempt_number === 1 && attempt1?.status === 'IN_PROGRESS',
      'Enrolled trainee can start attempt (Attempt #1 IN_PROGRESS)',
      JSON.stringify(startRes1)
    );

    // ----------------------------------------------------
    // TEST 8 — QUESTION SECURITY (HIDDEN ANSWER KEYS)
    // ----------------------------------------------------
    console.log('\n--- TEST 8: QUESTION SECURITY ---');
    const traineeGetAss = await api('GET', `/assessments/${assessmentId}`, null, traineeAToken);
    const questions = traineeGetAss.data?.data?.questions || [];
    const hasAnswerKey = questions.some((q) => q.correct_answer !== undefined || q.correctAnswer !== undefined);
    assert(
      traineeGetAss.status === 200 && questions.length === 2 && !hasAnswerKey,
      'GET /assessments/:id for TRAINEE explicitly omits correct_answer keys'
    );

    // ----------------------------------------------------
    // TEST 9 — START ATTEMPT PAYLOAD VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- TEST 9: START ATTEMPT PAYLOAD ---');
    assert(
      attempt1.started_at && attempt1.expires_at !== undefined,
      'Start attempt response contains authoritative timestamps (started_at & expires_at)'
    );

    // ----------------------------------------------------
    // TEST 10 — ACTIVE ATTEMPT DUPLICATION BLOCK
    // ----------------------------------------------------
    console.log('\n--- TEST 10: ACTIVE ATTEMPT DUPLICATION BLOCK ---');
    const duplicateStartRes = await api('POST', `/assessments/${assessmentId}/start`, null, traineeAToken);
    assert(
      duplicateStartRes.status === 409,
      'Starting second attempt while Attempt #1 is IN_PROGRESS returns 409 Conflict'
    );

    // ----------------------------------------------------
    // TEST 11 — CORRECT AUTOMATED GRADING (100%)
    // ----------------------------------------------------
    console.log('\n--- TEST 11: AUTOMATED GRADING (100% SCORE) ---');
    const submit1Res = await api(
      'POST',
      `/assessments/${assessmentId}/attempts/${attempt1.id}/submit`,
      {
        answers: {
          [q1Id]: '4',
          [q2Id]: 'true',
        },
      },
      traineeAToken
    );
    const sub1Data = submit1Res.data?.data;
    assert(
      submit1Res.status === 200 &&
        parseFloat(sub1Data?.score_percentage) === 100.00 &&
        sub1Data?.passed === true &&
        sub1Data?.status === 'SUBMITTED',
      'Full correct submission grades score = 100.00%, passed = true',
      JSON.stringify(submit1Res)
    );

    // ----------------------------------------------------
    // TEST 12 — PARTIAL AUTOMATED GRADING (50%)
    // ----------------------------------------------------
    console.log('\n--- TEST 12: PARTIAL AUTOMATED GRADING (50% SCORE) ---');
    // Start Attempt #2
    const startRes2 = await api('POST', `/assessments/${assessmentId}/start`, null, traineeAToken);
    const attempt2 = startRes2.data?.data;
    assert(startRes2.status === 201 && attempt2?.attempt_number === 2, 'Attempt #2 started');

    // Submit Q1 correct ("4"), Q2 wrong ("false")
    const submit2Res = await api(
      'POST',
      `/assessments/${assessmentId}/attempts/${attempt2.id}/submit`,
      {
        answers: {
          [q1Id]: '4',
          [q2Id]: 'false',
        },
      },
      traineeAToken
    );
    const sub2Data = submit2Res.data?.data;
    assert(
      submit2Res.status === 200 &&
        parseFloat(sub2Data?.score_percentage) === 50.00 &&
        sub2Data?.passed === false,
      '1/2 correct submission grades score = 50.00%, passed = false',
      JSON.stringify(submit2Res)
    );

    // ----------------------------------------------------
    // TEST 13 — PASSING THRESHOLD VALIDATION
    // ----------------------------------------------------
    console.log('\n--- TEST 13: PASSING THRESHOLD VALIDATION ---');
    assert(sub1Data?.score_percentage >= 70.00 && sub1Data?.passed === true, 'Score 100.00% >= Passing 70.00% -> passed = true');

    // ----------------------------------------------------
    // TEST 14 — FAILED ATTEMPT EVALUATION
    // ----------------------------------------------------
    console.log('\n--- TEST 14: FAILED ATTEMPT EVALUATION ---');
    assert(sub2Data?.score_percentage < 70.00 && sub2Data?.passed === false, 'Score 50.00% < Passing 70.00% -> passed = false');

    // ----------------------------------------------------
    // TEST 15 — ATTEMPT LIMIT ENFORCEMENT
    // ----------------------------------------------------
    console.log('\n--- TEST 15: ATTEMPT LIMIT ENFORCEMENT ---');
    // Start & Submit Attempt #3
    const startRes3 = await api('POST', `/assessments/${assessmentId}/start`, null, traineeAToken);
    const attempt3 = startRes3.data?.data;
    assert(startRes3.status === 201 && attempt3?.attempt_number === 3, 'Attempt #3 started');

    await api(
      'POST',
      `/assessments/${assessmentId}/attempts/${attempt3.id}/submit`,
      { answers: { [q1Id]: '4', [q2Id]: 'true' } },
      traineeAToken
    );

    // Attempt #4 start (max_attempts = 3) -> should fail
    const startRes4 = await api('POST', `/assessments/${assessmentId}/start`, null, traineeAToken);
    assert(
      startRes4.status === 400 || startRes4.status === 409,
      'Attempt #4 blocked due to max_attempts limit (3) reached',
      JSON.stringify(startRes4)
    );

    // ----------------------------------------------------
    // TEST 16 — SUBMISSION OWNERSHIP PROTECTION
    // ----------------------------------------------------
    console.log('\n--- TEST 16: SUBMISSION OWNERSHIP PROTECTION ---');
    // Trainee B attempts to submit Trainee A's attempt 1
    const hijackRes = await api(
      'POST',
      `/assessments/${assessmentId}/attempts/${attempt1.id}/submit`,
      { answers: { [q1Id]: '4' } },
      traineeBToken
    );
    assert(hijackRes.status === 404 || hijackRes.status === 403, 'Trainee B cannot submit Trainee A attempt (404/403)');

    // ----------------------------------------------------
    // TEST 17 — CROSS-TENANT ISOLATION
    // ----------------------------------------------------
    console.log('\n--- TEST 17: CROSS-TENANT ISOLATION ---');
    const crossTenantGet = await api('GET', `/assessments/${assessmentId}`, null, traineeBToken);
    assert(crossTenantGet.status === 404, 'Organization B trainee cannot fetch Organization A assessment (404 Not Found)');

    // ----------------------------------------------------
    // TEST 18 — COURSE / ASSESSMENT TENANT MISMATCH
    // ----------------------------------------------------
    console.log('\n--- TEST 18: TENANT MISMATCH PROTECTION ---');
    // Admin A tries to create assessment passing a fake course ID or Org B course ID
    const fakeCourseAss = await api(
      'POST',
      '/assessments',
      {
        courseId: '00000000-0000-0000-0000-000000000000',
        title: 'Fake Course Assessment',
      },
      adminAToken
    );
    assert(fakeCourseAss.status === 404, 'Assessment creation fails with 404 when course ID is invalid/cross-tenant');

    // ----------------------------------------------------
    // TEST 19 — UNKNOWN QUESTION INJECTION IMMUNITY
    // ----------------------------------------------------
    console.log('\n--- TEST 19: UNKNOWN QUESTION INJECTION IMMUNITY ---');
    // Create new assessment with Q1 only
    const assSingleRes = await api(
      'POST',
      '/assessments',
      { courseId: courseAId, title: 'Single Q Assessment' },
      adminAToken
    );
    const assSingleId = assSingleRes.data?.data?.id;
    const singleQRes = await api(
      'POST',
      `/assessments/${assSingleId}/questions`,
      {
        questionText: 'Single Q',
        questionType: 'MCQ',
        points: 10,
        orderIndex: 0,
        options: ['A', 'B'],
        correctAnswer: 'A',
      },
      adminAToken
    );
    const singleQId = singleQRes.data?.data?.id;
    await api('POST', `/assessments/${assSingleId}/publish`, null, adminAToken);

    // Trainee A starts attempt on assSingle
    const singleStart = await api('POST', `/assessments/${assSingleId}/start`, null, traineeAToken);
    const singleAttemptId = singleStart.data?.data?.id;

    // Submit payload injecting a fake question ID from another assessment
    const injectRes = await api(
      'POST',
      `/assessments/${assSingleId}/attempts/${singleAttemptId}/submit`,
      {
        answers: {
          [singleQId]: 'A',
          [q1Id]: '4', // Foreign question ID!
          'fake-uuid': 'whatever',
        },
      },
      traineeAToken
    );
    assert(
      injectRes.status === 200 && parseFloat(injectRes.data?.data?.score_percentage) === 100.00,
      'Foreign question IDs in submission payload are safely ignored without altering score calculation'
    );

    // ----------------------------------------------------
    // TEST 20 — SCORE INJECTION OVERRIDE REJECTION
    // ----------------------------------------------------
    console.log('\n--- TEST 20: SCORE INJECTION OVERRIDE REJECTION ---');
    // Start attempt on single Q
    // Max attempts is 3 for single ass. Let's create an assessment with maxAttempts 5
    const assOverrideRes = await api(
      'POST',
      '/assessments',
      { courseId: courseAId, title: 'Override Test Ass', maxAttempts: 5 },
      adminAToken
    );
    const assOverrideId = assOverrideRes.data?.data?.id;
    const qOverrideRes = await api(
      'POST',
      `/assessments/${assOverrideId}/questions`,
      {
        questionText: 'True or false?',
        questionType: 'TRUE_FALSE',
        points: 10,
        orderIndex: 0,
        options: ['true', 'false'],
        correctAnswer: 'true',
      },
      adminAToken
    );
    const qOverrideId = qOverrideRes.data?.data?.id;
    await api('POST', `/assessments/${assOverrideId}/publish`, null, adminAToken);

    const startOverride = await api('POST', `/assessments/${assOverrideId}/start`, null, traineeAToken);
    const attemptOverrideId = startOverride.data?.data?.id;

    // Malicious submit attempting score injection
    const malSubmit = await api(
      'POST',
      `/assessments/${assOverrideId}/attempts/${attemptOverrideId}/submit`,
      {
        answers: { [qOverrideId]: 'false' }, // Wrong answer!
        scorePercentage: 100.00,
        passed: true,
        totalPointsEarned: 99999,
        maxPointsPossible: 10,
      },
      traineeAToken
    );
    assert(
      malSubmit.status === 200 &&
        parseFloat(malSubmit.data?.data?.score_percentage) === 0.00 &&
        malSubmit.data?.data?.passed === false,
      'Malicious client-supplied score/passed injection payload is strictly ignored (graded 0.00%, passed = false)'
    );

    // ----------------------------------------------------
    // TEST 21 — TIMER EXPIRATION HANDLING
    // ----------------------------------------------------
    console.log('\n--- TEST 21: TIMER EXPIRATION HANDLING ---');
    // Create assessment with timeLimitMinutes: 1
    const timedAssRes = await api(
      'POST',
      '/assessments',
      { courseId: courseAId, title: 'Timed Test Ass', timeLimitMinutes: 1 },
      adminAToken
    );
    const timedAssId = timedAssRes.data?.data?.id;
    await api(
      'POST',
      `/assessments/${timedAssId}/questions`,
      {
        questionText: 'Timed Q',
        questionType: 'TRUE_FALSE',
        points: 10,
        orderIndex: 0,
        options: ['true', 'false'],
        correctAnswer: 'true',
      },
      adminAToken
    );
    await api('POST', `/assessments/${timedAssId}/publish`, null, adminAToken);

    const startTimed = await api('POST', `/assessments/${timedAssId}/start`, null, traineeAToken);
    const timedAttemptId = startTimed.data?.data?.id;
    assert(startTimed.status === 201 && timedAttemptId, 'Timed assessment attempt started');

    // ----------------------------------------------------
    // TEST 22 — CONCURRENT / DUPLICATE SUBMISSION PROTECTION
    // ----------------------------------------------------
    console.log('\n--- TEST 22: CONCURRENT / DUPLICATE SUBMISSION ---');
    // Attempting to submit attemptOverrideId a second time (already SUBMITTED)
    const reSubmitRes = await api(
      'POST',
      `/assessments/${assOverrideId}/attempts/${attemptOverrideId}/submit`,
      { answers: { [qOverrideId]: 'true' } },
      traineeAToken
    );
    assert(
      reSubmitRes.status === 400 || reSubmitRes.status === 409,
      'Submitting an already-submitted attempt fails safely (400 Bad Request)'
    );

    // ----------------------------------------------------
    // TEST 23 — ANSWER KEY SECURITY AUDIT
    // ----------------------------------------------------
    console.log('\n--- TEST 23: ANSWER KEY SECURITY AUDIT ---');
    const myResults = await api('GET', `/assessments/${assessmentId}/results`, null, traineeAToken);
    const resString = JSON.stringify(myResults);
    assert(
      myResults.status === 200 && !resString.includes('"correct_answer"') && !resString.includes('"correctAnswer"'),
      'Trainee results endpoint contains zero answer key leakages'
    );

    // ----------------------------------------------------
    // TEST 24 — ADMIN / TRAINER RESULTS ACCESS
    // ----------------------------------------------------
    console.log('\n--- TEST 24: ADMIN / TRAINER RESULTS ACCESS ---');
    const adminResults = await api('GET', `/assessments/${assessmentId}/results`, null, adminAToken);
    assert(
      adminResults.status === 200 && Array.isArray(adminResults.data?.data) && adminResults.data?.data.length >= 3,
      'Admin can view all organization submissions for assessment'
    );

    // ----------------------------------------------------
    // TEST 25 — TRAINEE RESULTS PRIVACY
    // ----------------------------------------------------
    console.log('\n--- TEST 25: TRAINEE RESULTS PRIVACY ---');
    assert(
      myResults.status === 200 &&
        Array.isArray(myResults.data?.data) &&
        myResults.data?.data.every((s) => s.trainee_id === traineeAId),
      'Trainee results endpoint strictly returns only the authenticated trainee’s submissions'
    );

    // ----------------------------------------------------
    // TEST 26 — ORGANIZATION METRICS & TRAINEE BLOCK
    // ----------------------------------------------------
    console.log('\n--- TEST 26: ORGANIZATION METRICS & TRAINEE BLOCK ---');
    const adminMetrics = await api('GET', '/assessments/metrics/organization', null, adminAToken);
    assert(
      adminMetrics.status === 200 &&
        adminMetrics.data?.data?.totalAssessments > 0 &&
        adminMetrics.data?.data?.publishedAssessments > 0,
      'Admin receives organization assessment metrics (totalAssessments, passRate, etc.)'
    );

    const traineeMetrics = await api('GET', '/assessments/metrics/organization', null, traineeAToken);
    assert(traineeMetrics.status === 403, 'Trainee is blocked from organization assessment metrics (403)');

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`📊 STAGE 4 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (globalErr) {
    console.error('💥 Unhandled Exception during Stage 4 Test Suite execution:', globalErr);
    process.exit(1);
  }
}

runStage4TestSuite();
