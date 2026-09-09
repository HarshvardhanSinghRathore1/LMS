const http = require('http');
const { pool } = require('../backend/dist/config/database');

const BASE_URL = 'http://localhost:5000/api/v1';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
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

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message, extra = null) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    if (extra) console.error('  Details:', JSON.stringify(extra, null, 2));
    process.exit(1);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('   CAPACITY CONNECT — STAGE 5 TEST SUITE            ');
  console.log('   Competency Engine & Skill Gap Analysis           ');
  console.log('====================================================\n');

  // Ensure ORG001 and ORG002 exist in Database
  await pool.query(`
    INSERT INTO organizations (name, code)
    VALUES ('Org 1 Baseline', 'ORG001')
    ON CONFLICT (code) DO NOTHING;
  `);
  await pool.query(`
    INSERT INTO organizations (name, code)
    VALUES ('Org 2 Isolated', 'ORG002')
    ON CONFLICT (code) DO NOTHING;
  `);

  // 1. Health Checks
  console.log('--- 1. Health Endpoints Verification ---');
  const healthRes = await request('GET', '/health');
  assert(healthRes.status === 200 && healthRes.body?.data?.status === 'healthy', 'GET /health returns 200 OK', healthRes);

  const healthAiRes = await request('GET', '/health/ai');
  assert(healthAiRes.status === 200 && healthAiRes.body?.data?.status === 'healthy', 'GET /health/ai returns 200 OK', healthAiRes);

  // 2. Authentication Setup
  console.log('\n--- 2. Authentication & Multi-Tenant Setup ---');
  const ts = Date.now();

  // Register Org 1 Users
  const admin1RegRes = await request('POST', '/auth/register', {
    name: 'Org 1 Admin User',
    email: `admin_org1_${ts}@example.com`,
    password: 'Password123!',
    organizationCode: 'ORG001',
  });
  assert(admin1RegRes.status === 201, 'Registered user for Org 1', admin1RegRes);
  let tokenAdmin1 = admin1RegRes.body.data.accessToken;
  const admin1UserId = admin1RegRes.body.data.user.id;

  // Promote user to ADMIN in DB & login again for updated JWT payload
  await pool.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [admin1UserId]);
  const admin1LoginRes = await request('POST', '/auth/login', {
    email: `admin_org1_${ts}@example.com`,
    password: 'Password123!',
  });
  tokenAdmin1 = admin1LoginRes.body.data.accessToken;

  const trainer1RegRes = await request('POST', '/auth/register', {
    name: 'Org 1 Trainer User',
    email: `trainer_org1_${ts}@example.com`,
    password: 'Password123!',
    organizationCode: 'ORG001',
  });
  assert(trainer1RegRes.status === 201, 'Registered trainer for Org 1');
  const trainer1UserId = trainer1RegRes.body.data.user.id;

  // Promote user to TRAINER in DB & login again for updated JWT payload
  await pool.query(`UPDATE users SET role = 'TRAINER' WHERE id = $1`, [trainer1UserId]);
  const trainer1LoginRes = await request('POST', '/auth/login', {
    email: `trainer_org1_${ts}@example.com`,
    password: 'Password123!',
  });
  const tokenTrainer1 = trainer1LoginRes.body.data.accessToken;

  const trainee1RegRes = await request('POST', '/auth/register', {
    name: 'Org 1 Trainee User',
    email: `trainee_org1_${ts}@example.com`,
    password: 'Password123!',
    organizationCode: 'ORG001',
  });
  assert(trainee1RegRes.status === 201, 'Registered trainee for Org 1');
  const tokenTrainee1 = trainee1RegRes.body.data.accessToken;

  // Register Org 2 User (Tenant Isolation)
  const admin2RegRes = await request('POST', '/auth/register', {
    name: 'Org 2 Admin User',
    email: `admin_org2_${ts}@example.com`,
    password: 'Password123!',
    organizationCode: 'ORG002',
  });
  assert(admin2RegRes.status === 201, 'Registered user for Org 2');
  const admin2UserId = admin2RegRes.body.data.user.id;
  await pool.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [admin2UserId]);
  const admin2LoginRes = await request('POST', '/auth/login', {
    email: `admin_org2_${ts}@example.com`,
    password: 'Password123!',
  });
  const tokenAdmin2 = admin2LoginRes.body.data.accessToken;

  // 3. Competency Management (CRUD & RBAC)
  console.log('\n--- 3. Competency Management (CRUD & RBAC) ---');
  
  // Trainee cannot create competency (403)
  const traineeCreateRes = await request('POST', '/competencies', {
    code: `JS-CORE-${ts}`,
    name: 'JavaScript Fundamentals',
    description: 'Core JS language skills',
    targetScorePercentage: 80.0,
  }, tokenTrainee1);
  assert(traineeCreateRes.status === 403, 'Trainee cannot create competency (403 Forbidden)');

  // Admin creates competency
  const createComp1Res = await request('POST', '/competencies', {
    code: `JS-CORE-${ts}`,
    name: 'JavaScript Fundamentals',
    description: 'Core JS syntax and async programming',
    targetScorePercentage: 80.0,
  }, tokenAdmin1);
  assert(createComp1Res.status === 201, 'Admin can create competency (201 Created)', createComp1Res);
  const comp1Id = createComp1Res.body.data.id;

  // Duplicate code conflict (409)
  const dupCompRes = await request('POST', '/competencies', {
    code: `JS-CORE-${ts}`,
    name: 'Duplicate Code Test',
    description: 'Should conflict',
    targetScorePercentage: 75.0,
  }, tokenAdmin1);
  assert(dupCompRes.status === 409, 'Duplicate competency code returns 409 Conflict');

  // Trainer creates second competency
  const createComp2Res = await request('POST', '/competencies', {
    code: `REACT-CORE-${ts}`,
    name: 'React Architecture',
    description: 'Frontend components and state management',
    targetScorePercentage: 85.0,
  }, tokenTrainer1);
  assert(createComp2Res.status === 201, 'Trainer can create competency (201 Created)');
  const comp2Id = createComp2Res.body.data.id;

  // List competencies
  const listCompRes = await request('GET', '/competencies', null, tokenAdmin1);
  assert(listCompRes.status === 200 && listCompRes.body.data.length >= 2, 'List competencies returns tenant competencies');

  // Update competency (PATCH)
  const updateCompRes = await request('PATCH', `/competencies/${comp1Id}`, {
    name: 'Advanced JavaScript Fundamentals',
    targetScorePercentage: 85.0,
  }, tokenAdmin1);
  assert(updateCompRes.status === 200 && parseFloat(updateCompRes.body?.data?.target_score_percentage) === 85.0, 'Update competency succeeds', updateCompRes);

  // 4. Course Creation & Competency Mapping
  console.log('\n--- 4. Course Creation & Competency Mapping ---');
  
  const course1Res = await request('POST', '/courses', {
    title: `JS Course ${ts}`,
    description: 'Learn JS deep dive',
    level: 'INTERMEDIATE',
  }, tokenTrainer1);
  assert(course1Res.status === 201, 'Created test Course 1');
  const course1Id = course1Res.body.data.id;

  // Create module and lesson with orderIndex
  const mod1Res = await request('POST', `/courses/${course1Id}/modules`, {
    title: 'Module 1: Engine & Scopes',
    orderIndex: 1,
  }, tokenTrainer1);
  assert(mod1Res.status === 201, 'Created Module 1', mod1Res);
  const mod1Id = mod1Res.body.data.id;

  const lesson1Res = await request('POST', `/courses/modules/${mod1Id}/lessons`, {
    title: 'Lesson 1: Event Loop',
    content: 'Deep dive into event loop microtasks',
    orderIndex: 1,
  }, tokenTrainer1);
  assert(lesson1Res.status === 201, 'Created Lesson 1', lesson1Res);
  const lesson1Id = lesson1Res.body.data.id;

  // Publish course
  await request('POST', `/courses/${course1Id}/publish`, null, tokenTrainer1);

  // Map Course to Competency (Weight 1.0)
  const mapRes1 = await request('POST', `/competencies/${comp1Id}/map-course`, {
    courseId: course1Id,
    weight: 1.0,
  }, tokenAdmin1);
  assert(mapRes1.status === 201, 'Mapped Course 1 to Competency 1 with weight 1.0', mapRes1);

  // Invalid weight (weight <= 0)
  const invalidWeightRes = await request('POST', `/competencies/${comp1Id}/map-course`, {
    courseId: course1Id,
    weight: -1.0,
  }, tokenAdmin1);
  assert(invalidWeightRes.status === 400, 'Weight <= 0 returns 400 Bad Request');

  // Cross-tenant course mapping attempt (Org 2 Admin mapping Org 1 course)
  const crossTenantMapRes = await request('POST', `/competencies/${comp1Id}/map-course`, {
    courseId: course1Id,
    weight: 1.0,
  }, tokenAdmin2);
  assert(crossTenantMapRes.status === 404, 'Cross-tenant course mapping returns 404 Not Found');

  // 5. Competency Evaluation & Skill Gap Calculation (70/30 Policy)
  console.log('\n--- 5. Synchronous Evaluation & 70/30 Gap Calculations ---');

  // Enroll Trainee 1 in Course 1
  const enrollRes = await request('POST', '/enrollments', {
    courseId: course1Id,
  }, tokenTrainee1);
  assert(enrollRes.status === 201, 'Trainee 1 enrolled in Course 1', enrollRes);
  const enrollmentId = enrollRes.body.data.id;

  // Complete Lesson 1 (Lesson progress becomes 100%)
  // Synchronous competency recalculation policy: Progress-only fallback when no assessment exists -> 100.00%
  const lessonProgressRes = await request('POST', `/enrollments/${enrollmentId}/lessons/${lesson1Id}/complete`, null, tokenTrainee1);
  assert(lessonProgressRes.status === 200, 'Lesson 1 marked complete', lessonProgressRes);

  let gapsRes = await request('GET', '/competencies/my-gaps', null, tokenTrainee1);
  assert(gapsRes.status === 200, 'Trainee fetched /my-gaps');
  let comp1Gap = gapsRes.body.data.find(g => g.competency_id === comp1Id || g.id === comp1Id);
  assert(comp1Gap && parseFloat(comp1Gap.current_score_percentage || comp1Gap.currentScorePercentage) === 100.0, 'Progress-only evaluation score is 100.00%', gapsRes);
  assert(comp1Gap.proficiency_level === 'EXPERT' || comp1Gap.proficiencyLevel === 'EXPERT', 'Score 100.00% is EXPERT');
  assert(parseFloat(comp1Gap.gap_percentage || comp1Gap.gapPercentage) === 0.0, 'Skill gap is 0.00% (MAX(0, 85.0 - 100.0))');

  // Uncomplete Lesson 1 -> Synchronous recalculation should reset score to 0.00%
  const uncompleteRes = await request('POST', `/enrollments/${enrollmentId}/lessons/${lesson1Id}/uncomplete`, null, tokenTrainee1);
  assert(uncompleteRes.status === 200, 'Lesson 1 marked uncomplete');

  gapsRes = await request('GET', '/competencies/my-gaps', null, tokenTrainee1);
  comp1Gap = gapsRes.body.data.find(g => g.competency_id === comp1Id || g.id === comp1Id);
  assert(parseFloat(comp1Gap.current_score_percentage || comp1Gap.currentScorePercentage) === 0.0, 'Uncompleting lesson synchronously resets score to 0.00%');

  // Complete lesson again
  await request('POST', `/enrollments/${enrollmentId}/lessons/${lesson1Id}/complete`, null, tokenTrainee1);

  // Create assessment for Course 1
  const createAssessRes = await request('POST', '/assessments', {
    courseId: course1Id,
    title: 'JS Core Quiz',
    description: 'Test event loop knowledge',
    passingPercentage: 70,
    timeLimitMinutes: 30,
    maxAttempts: 3,
  }, tokenTrainer1);
  assert(createAssessRes.status === 201, 'Assessment created', createAssessRes);
  const assessId = createAssessRes.body.data.id;

  // Add MCQ Question to assessment
  const addQRes = await request('POST', `/assessments/${assessId}/questions`, {
    questionText: 'Is JS single threaded?',
    questionType: 'MCQ',
    points: 10,
    orderIndex: 1,
    options: ['True', 'False'],
    correctAnswer: 'True',
  }, tokenTrainer1);
  assert(addQRes.status === 201, 'Added question to assessment', addQRes);
  const questionId = addQRes.body.data.id;

  // Publish assessment
  const publishRes = await request('POST', `/assessments/${assessId}/publish`, null, tokenTrainer1);
  assert(publishRes.status === 200, 'Published assessment', publishRes);

  // Start attempt first (Assessment engine flow)
  const startAttemptRes = await request('POST', `/assessments/${assessId}/start`, null, tokenTrainee1);
  assert(startAttemptRes.status === 201, 'Assessment attempt started', startAttemptRes);
  const attemptId = startAttemptRes.body.data.id;

  // Submit assessment attempt with 100% score (10/10 points)
  const submitRes = await request('POST', `/assessments/${assessId}/attempts/${attemptId}/submit`, {
    answers: {
      [questionId]: 'True',
    },
  }, tokenTrainee1);
  assert(submitRes.status === 200 && parseFloat(submitRes.body?.data?.score_percentage) === 100.0, 'Assessment submitted with 100% score', submitRes);

  // Check gaps again:
  // Both Assessment (100%) and Progress (100%) exist!
  // Formula: 100% * 0.70 + 100% * 0.30 = 100.00%
  gapsRes = await request('GET', '/competencies/my-gaps', null, tokenTrainee1);
  comp1Gap = gapsRes.body.data.find(g => g.competency_id === comp1Id || g.id === comp1Id);
  assert(comp1Gap && parseFloat(comp1Gap.current_score_percentage || comp1Gap.currentScorePercentage) === 100.0, 'Combined 70/30 evaluation score is 100.00%', gapsRes);
  assert(comp1Gap.proficiency_level === 'EXPERT' || comp1Gap.proficiencyLevel === 'EXPERT', 'Score 100.00% is EXPERT (>= 90.00)');
  assert(parseFloat(comp1Gap.gap_percentage || comp1Gap.gapPercentage) === 0.0, 'Skill gap percentage is 0.00% (MAX(0, 85.0 - 100.0))');

  // 6. Organization Matrix & Trainee Privacy Enforcement
  console.log('\n--- 6. Matrix & Trainee Privacy Enforcement ---');

  // Trainee trying to view organization matrix (403 Forbidden)
  const traineeMatrixRes = await request('GET', '/competencies/organization-matrix', null, tokenTrainee1);
  assert(traineeMatrixRes.status === 403, 'Trainee blocked from GET /competencies/organization-matrix (403 Forbidden)');

  // Admin viewing matrix
  const adminMatrixRes = await request('GET', '/competencies/organization-matrix', null, tokenAdmin1);
  assert(adminMatrixRes.status === 200, 'Admin can view GET /competencies/organization-matrix', adminMatrixRes);
  assert(adminMatrixRes.body.data.competencies.length >= 2, 'Matrix returns organization competencies');
  assert(adminMatrixRes.body.data.trainees.length >= 1, 'Matrix includes evaluated trainees');

  // Trainee /my-gaps ignore user ID override (Privacy check)
  const privacyCheckRes = await request('GET', `/competencies/my-gaps?userId=00000000-0000-0000-0000-000000000000`, null, tokenTrainee1);
  assert(privacyCheckRes.status === 200, '/my-gaps returns 200 OK');
  const privacyGap = privacyCheckRes.body.data.find(g => g.competency_id === comp1Id || g.id === comp1Id);
  assert(privacyGap && parseFloat(privacyGap.current_score_percentage || privacyGap.currentScorePercentage) === 100.0, 'Trainee /my-gaps strictly derives user identity from JWT payload', privacyCheckRes);

  // Cross-tenant competency view (Org 2 Admin attempting to access Org 1 competency)
  const crossTenantCompRes = await request('GET', `/competencies/${comp1Id}`, null, tokenAdmin2);
  assert(crossTenantCompRes.status === 404, 'Cross-tenant competency access returns 404 Not Found');

  console.log('\n====================================================');
  console.log('   🎉 ALL STAGE 5 VERIFICATION TESTS PASSED!          ');
  console.log('====================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Unhandled error in test suite:', err);
  process.exit(1);
});
