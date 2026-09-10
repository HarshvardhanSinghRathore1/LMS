/**
 * Stage 15 — Topic-Grounded AI MCQ Generation & Review Test Suite
 * Tests topic-grounded generation, anti-gibberish validation, difficulty distributions,
 * deduplication, single-question regeneration, editing, deletion, review queue import,
 * secure trainee assessment attempt scoring, and multi-tenant isolation.
 */

const axios = require('axios');
const { Pool } = require('pg');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/capacity_connect',
});

let adminToken = '';
let trainerToken = '';
let traineeToken = '';
let otherOrgAdminToken = '';

let orgId = '';
let otherOrgId = '';
let courseId = '';
let moduleId = '';
let lessonId = '';
let assessmentId = '';

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? `— ${details}` : ''}`);
  }
}

async function login(email, password, orgCode) {
  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email,
    password,
    organizationCode: orgCode,
  });
  return res.data.data.accessToken;
}

async function setupTestData() {
  console.log('\n🔧 Setting up test database entities...');

  // 1. Admin login
  adminToken = await login('admin@lms.com', 'adminbylms', 'cc');

  const orgRes = await pool.query(`SELECT id FROM organizations WHERE code = 'cc' LIMIT 1;`);
  orgId = orgRes.rows[0].id;

  // 2. Create Trainer
  const trainerEmail = `trainer_mcq_${Date.now()}@test.com`;
  const trainerRes = await axios.post(`${BASE_URL}/auth/register`, {
    email: trainerEmail,
    password: 'Password123!',
    name: 'MCQ Trainer',
    organizationCode: 'cc',
  });
  trainerToken = trainerRes.data.data.accessToken;
  const trainerId = trainerRes.data.data.user.id;

  // Set role to TRAINER
  await pool.query(`UPDATE users SET role = 'TRAINER' WHERE id = $1;`, [trainerId]);
  // Relogin to get token with TRAINER role
  trainerToken = await login(trainerEmail, 'Password123!', 'cc');

  // 3. Create Trainee
  const traineeEmail = `trainee_mcq_${Date.now()}@test.com`;
  const traineeRes = await axios.post(`${BASE_URL}/auth/register`, {
    email: traineeEmail,
    password: 'Password123!',
    name: 'MCQ Trainee',
    organizationCode: 'cc',
  });
  traineeToken = traineeRes.data.data.accessToken;
  const traineeId = traineeRes.data.data.user.id;

  // 4. Create Secondary Organization for Multi-tenant testing
  const otherOrgCode = `org_mcq_${Date.now()}`;
  const otherOrgRes = await pool.query(
    `INSERT INTO organizations (name, code)
     VALUES ('Other Org MCQ', $1)
     RETURNING id;`,
    [otherOrgCode]
  );
  otherOrgId = otherOrgRes.rows[0].id;

  const otherAdminEmail = `other_admin_${Date.now()}@test.com`;
  const regOther = await axios.post(`${BASE_URL}/auth/register`, {
    email: otherAdminEmail,
    password: 'Password123!',
    name: 'Other Org Admin',
    organizationCode: otherOrgCode,
  });
  const otherAdminId = regOther.data.data.user.id;
  await pool.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1;`, [otherAdminId]);
  otherOrgAdminToken = await login(otherAdminEmail, 'Password123!', otherOrgCode);

  // 5. Create Course with Module and Lesson containing rich Binary Search material
  const courseRes = await pool.query(
    `INSERT INTO courses (organization_id, creator_id, title, description, status, difficulty_level, category)
     VALUES ($1, $2, 'Algorithms & Data Structures Masterclass', 'Master search algorithms, divide and conquer, and binary search.', 'PUBLISHED', 'INTERMEDIATE', 'COMPUTER_SCIENCE')
     RETURNING id;`,
    [orgId, trainerId]
  );
  courseId = courseRes.rows[0].id;

  const moduleRes = await pool.query(
    `INSERT INTO course_modules (course_id, title, description, order_index)
     VALUES ($1, 'Searching Algorithms', 'Module covering linear, binary, and exponential search techniques', 1)
     RETURNING id;`,
    [courseId]
  );
  moduleId = moduleRes.rows[0].id;

  const lessonRes = await pool.query(
    `INSERT INTO course_lessons (
      module_id, title, content_type, content_body, duration_minutes, order_index,
      notes, notes_status, transcript_text, transcription_status
    ) VALUES (
      $1,
      'Binary Search Implementation & Analysis',
      'VIDEO',
      'Binary search operates on a sorted array by repeatedly dividing the search interval in half. The time complexity is O(log n). To prevent integer overflow, calculate mid as low + (high - low) / 2.',
      25,
      1,
      '# Binary Search Notes\n- **Requirement**: Array must be sorted in ascending/descending order.\n- **Time Complexity**: O(log n) worst and average case, O(1) best case.\n- **Space Complexity**: O(1) iterative, O(log n) recursive.\n- **Midpoint Formula**: int mid = low + (high - low) / 2 to avoid overflow.\n- **Edge Cases**: Target smaller than array minimum, target larger than array maximum, empty array.',
      'READY',
      'Welcome to binary search. Today we discuss why the array must be sorted. If the middle element is greater than our target, we discard the right half. If it is smaller, we discard the left half. This logarithmic reduction gives O(log n) runtime efficiency.',
      'READY'
    ) RETURNING id;`,
    [moduleId]
  );
  lessonId = lessonRes.rows[0].id;

  // Insert document and chunk for RAG grounding
  const docRes = await pool.query(
    `INSERT INTO documents (organization_id, title, document_type, metadata)
     VALUES ($1, 'Binary Search Deep Dive', 'learning_material', $2)
     RETURNING id;`,
    [orgId, JSON.stringify({ courseId, moduleId, lessonId })]
  );
  const docId = docRes.rows[0].id;

  await pool.query(
    `INSERT INTO document_chunks (
      document_id, organization_id, content, chunk_index, metadata
    ) VALUES (
      $1, $2,
      'Binary search algorithm requires a sorted collection. When searching for element 12 in sorted array [2, 5, 8, 12, 16], low=0, high=4, mid=2 element is 8. Since 12 > 8, low becomes mid+1=3. Next mid is 3 element 12, found in 2 comparisons.',
      0,
      $3
    );`,
    [docId, orgId, JSON.stringify({ lessonId, courseId, sourceType: 'video_transcript', title: 'Binary Search Deep Dive' })]
  );

  // 6. Create Target Assessment for import testing
  const assessRes = await pool.query(
    `INSERT INTO assessments (
      organization_id, course_id, creator_id, title, description,
      passing_score_percentage, time_limit_minutes, max_attempts, status
    ) VALUES (
      $1, $2, $3, 'Binary Search Midterm Quiz', 'Knowledge check on binary search principles',
      70.00, 30, 3, 'PUBLISHED'
    ) RETURNING id;`,
    [orgId, courseId, trainerId]
  );
  assessmentId = assessRes.rows[0].id;

  // Enroll trainee in courseId
  await pool.query(
    `INSERT INTO course_enrollments (organization_id, course_id, trainee_id, status)
     VALUES ($1, $2, $3, 'ENROLLED')
     ON CONFLICT DO NOTHING;`,
    [orgId, courseId, traineeId]
  );

  console.log('✅ Test setup completed.\n');
}

async function runTestSuite() {
  await setupTestData();

  console.log('===============================================================');
  console.log('🧪 STAGE 15: TOPIC-GROUNDED AI MCQ GENERATION & QUALITY SUITE');
  console.log('===============================================================\n');

  let generatedItemIds = [];
  let approvedQuestionId = '';

  // -------------------------------------------------------------
  // Test 1: Grounded MCQ Generation with Balanced Distribution
  // -------------------------------------------------------------
  try {
    console.log('▶ Test 1: Generate MCQs strictly grounded in Lesson Context');
    const res = await axios.post(
      `${BASE_URL}/ai/generate-mcqs`,
      {
        courseId,
        moduleId,
        lessonId,
        topic: 'Binary Search',
        count: 5,
        difficulty: 'BALANCED',
      },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );

    assert(res.status === 201, 'HTTP 201 Created on MCQ generation');
    assert(Array.isArray(res.data.data) && res.data.data.length >= 3, `Generated ${res.data.data?.length} grounded questions`);

    const items = res.data.data;
    generatedItemIds = items.map((i) => i.id);

    // Verify all items are in PENDING_REVIEW
    const allPending = items.every((i) => i.status === 'PENDING_REVIEW');
    assert(allPending, 'All generated MCQs enter PENDING_REVIEW status initially');

    // Verify Schema & Non-Gibberish Rules on every item
    let allValid = true;
    let allGroundedInBinarySearch = true;
    let hasCategories = true;

    for (const item of items) {
      const c = item.content;
      // 1. Question text exists and non-empty
      if (!c.questionText || c.questionText.length < 5) allValid = false;
      // 2. Exactly 4 options
      if (!Array.isArray(c.options) || c.options.length !== 4) allValid = false;
      // 3. All options unique
      const uniqueSet = new Set(c.options.map((o) => o.toLowerCase().trim()));
      if (uniqueSet.size !== 4) allValid = false;
      // 4. Correct answer matches one option
      if (!c.options.includes(c.correctAnswer)) allValid = false;
      // 5. Explanation exists
      if (!c.explanation || c.explanation.length < 5) allValid = false;
      // 6. Difficulty is valid
      if (!['EASY', 'MEDIUM', 'HARD'].includes(c.difficulty)) allValid = false;

      // 7. Check topic grounding: must contain terms related to binary search, sorted array, log n, search, mid, etc.
      const text = (c.questionText + ' ' + c.explanation + ' ' + c.options.join(' ')).toLowerCase();
      const hasTopicKeywords =
        text.includes('binary') ||
        text.includes('search') ||
        text.includes('sorted') ||
        text.includes('log') ||
        text.includes('complexity') ||
        text.includes('array') ||
        text.includes('mid');
      if (!hasTopicKeywords) allGroundedInBinarySearch = false;
    }

    assert(allValid, 'Strict No-Gibberish Rule: 4 unique options, 1 exact match correct answer, non-empty explanation');
    assert(allGroundedInBinarySearch, 'All questions are strictly grounded in Binary Search / Lesson context');
  } catch (err) {
    assert(false, 'Test 1 Failed', err.response?.data?.error?.message || err.message);
  }

  // -------------------------------------------------------------
  // Test 2: Difficulty Specific Generation (EASY / HARD)
  // -------------------------------------------------------------
  try {
    console.log('\n▶ Test 2: Generate MCQs with specific difficulty levels');
    const resEasy = await axios.post(
      `${BASE_URL}/ai/generate-mcqs`,
      {
        courseId,
        lessonId,
        topic: 'Binary Search Time Complexity',
        count: 3,
        difficulty: 'EASY',
      },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );

    assert(resEasy.status === 201, 'EASY difficulty generation succeeded');
    const allEasy = resEasy.data.data.every((i) => i.content.difficulty === 'EASY');
    assert(allEasy, 'All questions in EASY request assigned EASY difficulty');

    const resHard = await axios.post(
      `${BASE_URL}/ai/generate-mcqs`,
      {
        courseId,
        lessonId,
        topic: 'Binary Search Edge Cases and Overflow',
        count: 3,
        difficulty: 'HARD',
      },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );

    assert(resHard.status === 201, 'HARD difficulty generation succeeded');
    const allHard = resHard.data.data.every((i) => i.content.difficulty === 'HARD');
    assert(allHard, 'All questions in HARD request assigned HARD difficulty');
  } catch (err) {
    assert(false, 'Test 2 Failed', err.response?.data?.error?.message || err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Deduplication & Non-Repetition
  // -------------------------------------------------------------
  try {
    console.log('\n▶ Test 3: Verify Deduplication Engine rejects duplicate stems');
    const res = await axios.post(
      `${BASE_URL}/ai/generate-mcqs`,
      {
        courseId,
        lessonId,
        count: 5,
        difficulty: 'BALANCED',
      },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );

    const questions = res.data.data.map((i) => i.content.questionText.toLowerCase().trim());
    const uniqueQuestions = new Set(questions);
    assert(questions.length === uniqueQuestions.size, 'No duplicate question stems in generated assessment set');
  } catch (err) {
    assert(false, 'Test 3 Failed', err.response?.data?.error?.message || err.message);
  }

  // -------------------------------------------------------------
  // Test 4: Regenerate Single Individual MCQ Item (1-Click)
  // -------------------------------------------------------------
  let targetItemId = generatedItemIds[0];
  try {
    console.log('\n▶ Test 4: 1-Click Regenerate Individual MCQ Item');
    const prevItemRes = await pool.query(`SELECT content FROM ai_generated_items WHERE id = $1;`, [targetItemId]);
    const prevStem = prevItemRes.rows[0].content.questionText;

    const resRegen = await axios.post(
      `${BASE_URL}/ai/generated-items/${targetItemId}/regenerate`,
      {
        feedback: 'Make it test midpoint arithmetic formula',
        difficulty: 'HARD',
      },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );

    assert(resRegen.status === 200, 'HTTP 200 OK on single question regeneration');
    const updated = resRegen.data.data;
    assert(updated.id === targetItemId, 'Same item ID retained in review queue');
    assert(updated.content.questionText !== prevStem, 'Question stem successfully replaced with fresh question');
    assert(updated.content.options.length === 4, 'Regenerated question satisfies 4-options rule');
    assert(updated.content.options.includes(updated.content.correctAnswer), 'Regenerated question has valid matching correct answer');
  } catch (err) {
    assert(false, 'Test 4 Failed', err.response?.data?.error?.message || err.message);
  }

  // -------------------------------------------------------------
  // Test 5: Trainer Edit Generated Item Content
  // -------------------------------------------------------------
  try {
    console.log('\n▶ Test 5: Trainer Manual Edit of Generated Item');
    const editPayload = {
      title: 'MCQ (EASY): What is the time complexity of binary search?',
      content: {
        questionText: 'What is the worst-case time complexity of binary search on a sorted array of size n?',
        questionType: 'MCQ',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
        correctAnswer: 'O(log n)',
        points: 10,
        explanation: 'Binary search halves the search range in each iteration, resulting in logarithmic O(log n) time complexity.',
        difficulty: 'EASY',
        questionCategory: 'CONCEPTUAL',
        sourceReference: 'Lesson Notes',
      },
      reviewNotes: 'Edited by trainer to clarify worst-case phrasing.',
    };

    const resEdit = await axios.patch(
      `${BASE_URL}/ai/generated-items/${targetItemId}`,
      editPayload,
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );

    assert(resEdit.status === 200, 'HTTP 200 OK on trainer question edit');
    assert(resEdit.data.data.content.correctAnswer === 'O(log n)', 'Edited correct answer saved successfully');
    assert(resEdit.data.data.content.questionText.includes('worst-case'), 'Edited question text persisted');
  } catch (err) {
    assert(false, 'Test 5 Failed', err.response?.data?.error?.message || err.message);
  }

  // -------------------------------------------------------------
  // Test 6: Trainer Delete Item from Review Queue
  // -------------------------------------------------------------
  try {
    console.log('\n▶ Test 6: Trainer Delete Generated Item from Review Queue');
    const deleteItemId = generatedItemIds[generatedItemIds.length - 1];

    const resDel = await axios.delete(
      `${BASE_URL}/ai/generated-items/${deleteItemId}`,
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );

    assert(resDel.status === 200, 'HTTP 200 OK on item deletion');

    const checkDb = await pool.query(`SELECT id FROM ai_generated_items WHERE id = $1;`, [deleteItemId]);
    assert(checkDb.rowCount === 0, 'Item successfully deleted from database');
  } catch (err) {
    assert(false, 'Test 6 Failed', err.response?.data?.error?.message || err.message);
  }

  // -------------------------------------------------------------
  // Test 7: Review Approval & Atomic Import to Assessment Questions
  // -------------------------------------------------------------
  try {
    console.log('\n▶ Test 7: Approve & Import MCQ to Assessment Questions');
    const resApprove = await axios.post(
      `${BASE_URL}/ai/generated-items/${targetItemId}/review`,
      {
        action: 'APPROVE',
        targetAssessmentId: assessmentId,
        reviewNotes: 'Approved for midterm quiz.',
      },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );

    assert(resApprove.status === 200, 'HTTP 200 OK on review approval');
    assert(resApprove.data.data.status === 'APPROVED', 'Item status transitioned to APPROVED');
    approvedQuestionId = resApprove.data.importedQuestionId;
    assert(!!approvedQuestionId, `Question atomically imported to assessment_questions (ID: ${approvedQuestionId})`);

    // Verify imported record in assessment_questions
    const qRes = await pool.query(`SELECT * FROM assessment_questions WHERE id = $1;`, [approvedQuestionId]);
    assert(qRes.rowCount === 1, 'Imported question exists in assessment_questions');
    const qRow = qRes.rows[0];
    assert(qRow.assessment_id === assessmentId, 'Question linked to correct target assessment');
    assert(qRow.correct_answer === 'O(log n)', 'Authoritative correct answer stored on backend');
  } catch (err) {
    assert(false, 'Test 7 Failed', err.response?.data?.error?.message || err.message);
  }

  // -------------------------------------------------------------
  // Test 8: Trainee View & Secure Assessment Attempt Scoring
  // -------------------------------------------------------------
  try {
    console.log('\n▶ Test 8: Trainee Assessment Attempt & Authoritative Scoring');

    // 1. Trainee gets assessment details
    const assessDetailRes = await axios.get(
      `${BASE_URL}/assessments/${assessmentId}`,
      { headers: { Authorization: `Bearer ${traineeToken}` } }
    );
    const questions = assessDetailRes.data.data.questions || [];

    // Verify answer key is NOT exposed to trainee
    const hasExposedAnswer = questions.some((q) => q.correctAnswer || q.correct_answer);
    assert(!hasExposedAnswer, 'Security Rule: Correct answer key is protected and not exposed to trainee prior to submission');

    // 2. Trainee starts attempt
    const startRes = await axios.post(
      `${BASE_URL}/assessments/${assessmentId}/start`,
      {},
      { headers: { Authorization: `Bearer ${traineeToken}` } }
    );
    assert(startRes.status === 201 || startRes.status === 200, 'Trainee successfully started assessment attempt');
    const attemptId = startRes.data.data.id;

    // 3. Trainee submits correct answer
    const answersPayload = {
      [approvedQuestionId]: 'O(log n)', // Correct answer
    };

    const submitRes = await axios.post(
      `${BASE_URL}/assessments/${assessmentId}/attempts/${attemptId}/submit`,
      { answers: answersPayload },
      { headers: { Authorization: `Bearer ${traineeToken}` } }
    );

    assert(submitRes.status === 200, 'HTTP 200 on attempt submission');
    const result = submitRes.data.data;
    assert(Number(result.score_percentage) >= 70, `Trainee scored accurately based on backend authoritative key (Score: ${result.score_percentage}%)`);
  } catch (err) {
    assert(false, 'Test 8 Failed', err.response?.data?.error?.message || err.message);
  }

  // -------------------------------------------------------------
  // Test 9: Multi-Tenant Isolation
  // -------------------------------------------------------------
  try {
    console.log('\n▶ Test 9: Multi-Tenant Isolation Verification');

    // Tenant B attempts to access Tenant A's generated items
    try {
      await axios.patch(
        `${BASE_URL}/ai/generated-items/${targetItemId}`,
        { content: { questionText: 'Hacked question' } },
        { headers: { Authorization: `Bearer ${otherOrgAdminToken}` } }
      );
      assert(false, 'Tenant B was able to modify Tenant A item (Security Violation)');
    } catch (err) {
      assert(err.response?.status === 404, 'Tenant B receives 404 Not Found when attempting to access Tenant A generated item');
    }

    // Tenant B attempts to regenerate Tenant A item
    try {
      await axios.post(
        `${BASE_URL}/ai/generated-items/${targetItemId}/regenerate`,
        {},
        { headers: { Authorization: `Bearer ${otherOrgAdminToken}` } }
      );
      assert(false, 'Tenant B was able to regenerate Tenant A item (Security Violation)');
    } catch (err) {
      assert(err.response?.status === 404, 'Tenant B receives 404 Not Found on cross-tenant regeneration');
    }
  } catch (err) {
    assert(false, 'Test 9 Failed', err.response?.data?.error?.message || err.message);
  }

  // -------------------------------------------------------------
  // Final Results
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`📊 STAGE 15 TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('===============================================================\n');

  await pool.end();

  if (passedTests < totalTests) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  pool.end();
  process.exit(1);
});
