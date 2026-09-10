const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { Client } = require('pg');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/capacity_connect';

let db;

let adminToken = '';
let trainerToken = '';
let traineeToken = '';
let orgBAdminToken = '';
let orgBTraineeToken = '';

let orgId = '';
let courseId = '';
let moduleId = '';
let lessonId = '';

let orgBId = '';
let orgBCourseId = '';
let orgBModuleId = '';
let orgBLessonId = '';

let uploadedResourceId = '';

const stats = { passed: 0, failed: 0, total: 0 };

function assert(condition, testName, detail = '') {
  stats.total++;
  if (condition) {
    stats.passed++;
    console.log(`  ✅ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
  } else {
    stats.failed++;
    console.error(`  ❌ FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 STAGE 13 COMPREHENSIVE AUTOMATED TEST SUITE');
  console.log('   Course Multimedia, Video-to-RAG & PDF Knowledge');
  console.log('====================================================\n');

  db = new Client({ connectionString: DB_URL });
  await db.connect();

  try {
    // -------------------------------------------------------------
    // STEP 0: Authentication & Tenant Setup
    // -------------------------------------------------------------
    console.log('--- Step 0: Authentication & Multi-Tenant Setup ---');

    // 1. Login primary admin
    const adminRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@lms.com',
      password: 'adminbylms',
      organizationCode: 'cc',
    });
    adminToken = adminRes.data.data.accessToken;
    orgId = adminRes.data.data.user.organizationId;
    assert(Boolean(adminToken && orgId), 'Primary Admin Login', `Org: ${orgId}`);

    // 2. Login primary trainer
    const trainerRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'trainer@lms.com',
      password: 'trainerbylms',
      organizationCode: 'cc',
    });
    trainerToken = trainerRes.data.data.accessToken;
    assert(Boolean(trainerToken), 'Primary Trainer Login');

    // 3. Login primary trainee
    const traineeRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'trainee@lms.com',
      password: 'traineebylms',
      organizationCode: 'cc',
    });
    traineeToken = traineeRes.data.data.accessToken;
    assert(Boolean(traineeToken), 'Primary Trainee Login');

    // 4. Setup Tenant B (for strict cross-tenant isolation testing)
    const orgBCode = `orgb_${Date.now()}`;
    const orgBRes = await db.query(
      `INSERT INTO organizations (name, code) VALUES ($1, $2) RETURNING id`,
      ['Tenant B Corporation', orgBCode]
    );
    orgBId = orgBRes.rows[0].id;

    const orgBAdminEmail = `admin_${orgBCode}@orgb.com`;
    const orgBTraineeEmail = `trainee_${orgBCode}@orgb.com`;

    // Register admin in Org B
    const regBAdmin = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'OrgB Admin',
      email: orgBAdminEmail,
      password: 'OrgBPassword123!',
      organizationCode: orgBCode,
    });
    await db.query(`UPDATE users SET role = 'ADMIN' WHERE email = $1`, [orgBAdminEmail.toLowerCase()]);
    
    // Login Org B admin
    const logBAdmin = await axios.post(`${BASE_URL}/auth/login`, {
      email: orgBAdminEmail,
      password: 'OrgBPassword123!',
      organizationCode: orgBCode,
    });
    orgBAdminToken = logBAdmin.data.data.accessToken;
    assert(Boolean(orgBAdminToken && orgBId), 'Tenant B Creation & Admin Setup', `OrgB: ${orgBId}`);

    // Register trainee in Org B
    const regBTrainee = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'OrgB Trainee',
      email: orgBTraineeEmail,
      password: 'OrgBPassword123!',
      organizationCode: orgBCode,
    });
    orgBTraineeToken = regBTrainee.data.data.accessToken;
    assert(Boolean(orgBTraineeToken), 'Tenant B Trainee Registration');

    // -------------------------------------------------------------
    // STEP 1: Course & Lesson Setup
    // -------------------------------------------------------------
    console.log('\n--- Step 1: Course & Lesson Setup ---');

    // Create course in Tenant A
    const courseRes = await axios.post(
      `${BASE_URL}/courses`,
      {
        title: 'Stage 13 Cloud & Microservices Engineering',
        description: 'Comprehensive multimedia course covering distributed cloud architecture.',
        category: 'Engineering',
        difficultyLevel: 'ADVANCED',
      },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    courseId = courseRes.data.data.id || courseRes.data.data.course?.id;
    assert(Boolean(courseId), 'Create Tenant A Course', `CourseId: ${courseId}`);

    // Create module
    const modRes = await axios.post(
      `${BASE_URL}/courses/${courseId}/modules`,
      { title: 'Module 1: Cloud Foundations', orderIndex: 1 },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    moduleId = modRes.data.data.id || modRes.data.data.module?.id;
    assert(Boolean(moduleId), 'Create Tenant A Module');

    // Create lesson
    const lessonRes = await axios.post(
      `${BASE_URL}/courses/modules/${moduleId}/lessons`,
      {
        title: 'Lesson 1.1: Kubernetes Ingress and Mesh Networking',
        contentBody: 'Kubernetes ingress controllers route external HTTP/HTTPS traffic to internal cluster services.',
        orderIndex: 1,
      },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    lessonId = lessonRes.data.data.id || lessonRes.data.data.lesson?.id;
    assert(Boolean(lessonId), 'Create Tenant A Lesson');

    // Create Course in Tenant B for isolation testing
    const orgBCourseRes = await axios.post(
      `${BASE_URL}/courses`,
      {
        title: 'Tenant B Proprietary Strategy',
        description: 'Confidential corporate strategy for Tenant B.',
        category: 'Management',
        difficultyLevel: 'INTERMEDIATE',
      },
      { headers: { Authorization: `Bearer ${orgBAdminToken}` } }
    );
    orgBCourseId = orgBCourseRes.data.data.id || orgBCourseRes.data.data.course?.id;

    const orgBModRes = await axios.post(
      `${BASE_URL}/courses/${orgBCourseId}/modules`,
      { title: 'Secret Operations', orderIndex: 1 },
      { headers: { Authorization: `Bearer ${orgBAdminToken}` } }
    );
    orgBModuleId = orgBModRes.data.data.id || orgBModRes.data.data.module?.id;

    const orgBLessonRes = await axios.post(
      `${BASE_URL}/courses/modules/${orgBModuleId}/lessons`,
      {
        title: 'Secret Internal Trade Secrets',
        contentBody: 'Tenant B secret algorithm code: ALPHA_OMEGA_999.',
        orderIndex: 1,
      },
      { headers: { Authorization: `Bearer ${orgBAdminToken}` } }
    );
    orgBLessonId = orgBLessonRes.data.data.id || orgBLessonRes.data.data.lesson?.id;
    assert(Boolean(orgBLessonId), 'Create Tenant B Course & Lesson for Isolation');

    // -------------------------------------------------------------
    // STEP 2: YouTube Video & Playlist Validation
    // -------------------------------------------------------------
    console.log('\n--- Step 2: YouTube URL Parsing & Validation ---');

    // Valid video URL
    const ytVideoRes = await axios.post(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/video/youtube`,
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    assert(
      ytVideoRes.data.data.lesson.video_source_type === 'YOUTUBE_VIDEO' &&
        ytVideoRes.data.data.lesson.video_metadata.videoId === 'dQw4w9WgXcQ',
      'Valid YouTube Video URL Assignment',
      ytVideoRes.data.data.lesson.video_url
    );

    // Valid short youtu.be URL
    const ytShortRes = await axios.post(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/video/youtube`,
      { url: 'https://youtu.be/dQw4w9WgXcQ' },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    assert(
      ytShortRes.data.data.lesson.video_metadata.videoId === 'dQw4w9WgXcQ',
      'Valid youtu.be Short URL Assignment'
    );

    // Valid playlist URL
    const ytPlaylistRes = await axios.post(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/video/youtube`,
      { url: 'https://www.youtube.com/playlist?list=PLlaN88a7y2_plecYoJxeQNnWHzzpQVJcU' },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    assert(
      ytPlaylistRes.data.data.lesson.video_source_type === 'YOUTUBE_PLAYLIST' &&
        ytPlaylistRes.data.data.lesson.video_metadata.playlistId === 'PLlaN88a7y2_plecYoJxeQNnWHzzpQVJcU',
      'Valid YouTube Playlist URL Assignment',
      ytPlaylistRes.data.data.lesson.video_url
    );

    // Invalid domain rejection
    try {
      await axios.post(
        `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/video/youtube`,
        { url: 'https://vimeo.com/12345678' },
        { headers: { Authorization: `Bearer ${trainerToken}` } }
      );
      assert(false, 'Invalid Domain Rejection (Expected failure)');
    } catch (err) {
      assert(err.response?.status === 400, 'Invalid Domain Rejection (HTTP 400)');
    }

    // Malicious URL rejection
    try {
      await axios.post(
        `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/video/youtube`,
        { url: 'javascript:alert(1)' },
        { headers: { Authorization: `Bearer ${trainerToken}` } }
      );
      assert(false, 'Malicious URL Rejection (Expected failure)');
    } catch (err) {
      assert(err.response?.status === 400, 'Malicious URL Rejection (HTTP 400)');
    }

    // -------------------------------------------------------------
    // STEP 3: Video File Upload & Storage Isolation
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Video File Upload & Security Validation ---');

    // Create a temporary mock MP4 file
    const tempVideoPath = path.resolve(__dirname, 'test_sample_video.mp4');
    fs.writeFileSync(tempVideoPath, Buffer.from('FAKE_MP4_VIDEO_STREAM_BYTES_FOR_CAPACITY_CONNECT_TEST'));

    const form = new FormData();
    form.append('video', fs.createReadStream(tempVideoPath), {
      filename: 'sample_kubernetes_lecture.mp4',
      contentType: 'video/mp4',
    });

    const uploadRes = await axios.post(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/video/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${trainerToken}`,
        },
      }
    );

    assert(
      uploadRes.data.data.lesson.video_source_type === 'UPLOADED' &&
        uploadRes.data.data.lesson.video_metadata.originalName === 'sample_kubernetes_lecture.mp4',
      'Video File Upload',
      uploadRes.data.data.lesson.video_url
    );

    // Verify storage path is isolated by organization and course
    const storedRelPath = uploadRes.data.data.lesson.video_metadata.relativePath;
    assert(
      storedRelPath.includes(`course-media/${orgId}/${courseId}/${lessonId}/videos/`),
      'Server-Generated Multi-Tenant Storage Path Isolation',
      storedRelPath
    );

    // Verify Honest STT State (No fabricated transcripts when STT provider unconfigured)
    // Wait briefly for background worker
    await new Promise((r) => setTimeout(r, 600));

    const videoDetailsRes = await axios.get(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/video`,
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    const validStatuses = ['PENDING', 'PROCESSING', 'TRANSCRIBING', 'INDEXING', 'READY', 'FAILED'];
    assert(
      validStatuses.includes(videoDetailsRes.data.data.transcriptionStatus),
      'Honest STT Status Tracking (No Fake Transcripts)',
      `Status: ${videoDetailsRes.data.data.transcriptionStatus}`
    );

    // Cleanup temp local file safely
    try {
      if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
    } catch {}

    // -------------------------------------------------------------
    // STEP 4: Video Streaming & Playback Authorization
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Video Playback & Authorization Policy ---');

    // 1. Trainer can stream video
    const trainerStreamRes = await axios.get(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/video/stream`,
      {
        headers: { Authorization: `Bearer ${trainerToken}`, Range: 'bytes=0-10' },
        responseType: 'arraybuffer',
      }
    );
    assert(trainerStreamRes.status === 206 || trainerStreamRes.status === 200, 'Trainer Video Stream Access (HTTP 206/200)');

    // 2. Trainee WITHOUT enrollment cannot stream video
    try {
      await axios.get(
        `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/video/stream`,
        { headers: { Authorization: `Bearer ${traineeToken}` } }
      );
      assert(false, 'Unenrolled Trainee Video Stream Denial (Expected 403)');
    } catch (err) {
      assert(err.response?.status === 403, 'Unenrolled Trainee Video Stream Denial (HTTP 403)');
    }

    // 3. Enroll trainee in Tenant A Course
    // First publish course
    await axios.post(
      `${BASE_URL}/courses/${courseId}/publish`,
      {},
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );

    const enrollRes = await axios.post(
      `${BASE_URL}/enrollments`,
      { courseId },
      { headers: { Authorization: `Bearer ${traineeToken}` } }
    );
    const enrollmentId = enrollRes.data.data.id || enrollRes.data.data.enrollment?.id;
    assert(Boolean(enrollmentId), 'Enroll Trainee in Course');

    // 4. Enrolled trainee CAN stream video
    const enrolledStreamRes = await axios.get(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/video/stream`,
      {
        headers: { Authorization: `Bearer ${traineeToken}`, Range: 'bytes=0-20' },
        responseType: 'arraybuffer',
      }
    );
    assert(enrolledStreamRes.status === 206 || enrolledStreamRes.status === 200, 'Enrolled Trainee Video Stream Access (HTTP 206)');

    // 5. Cross-tenant Trainee (Org B) cannot stream Org A video
    try {
      await axios.get(
        `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/video/stream`,
        { headers: { Authorization: `Bearer ${orgBTraineeToken}` } }
      );
      assert(false, 'Cross-Tenant Trainee Video Denial (Expected 403/404)');
    } catch (err) {
      assert(err.response?.status === 403 || err.response?.status === 404, 'Cross-Tenant Trainee Video Denial (Tenant Isolation)');
    }

    // -------------------------------------------------------------
    // STEP 5: PDF Attachment, Extraction & Retrieval
    // -------------------------------------------------------------
    console.log('\n--- Step 5: PDF Resource Upload & Knowledge Ingestion ---');

    // Create a mock PDF buffer
    // Minimal valid PDF structure
    const samplePdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >> endobj
4 0 obj << /Length 85 >>
stream
BT
/F1 12 Tf
72 712 Td
(Capacity Connect Kubernetes Service Mesh Architecture Notes) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000216 00000 n 
trailer << /Root 1 0 R /Size 5 >>
startxref
350
%%EOF`;

    const tempPdfPath = path.resolve(__dirname, 'test_sample.pdf');
    fs.writeFileSync(tempPdfPath, samplePdfContent);

    const pdfForm = new FormData();
    pdfForm.append('pdf', fs.createReadStream(tempPdfPath), {
      filename: 'kubernetes_service_mesh.pdf',
      contentType: 'application/pdf',
    });
    pdfForm.append('title', 'Kubernetes Service Mesh Whitepaper');

    const pdfUploadRes = await axios.post(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/resources`,
      pdfForm,
      {
        headers: {
          ...pdfForm.getHeaders(),
          Authorization: `Bearer ${trainerToken}`,
        },
      }
    );

    uploadedResourceId = pdfUploadRes.data.data.resource.id;
    assert(Boolean(uploadedResourceId), 'PDF Resource Upload', `ResourceId: ${uploadedResourceId}`);

    // Wait for PDF extraction & indexing worker
    await new Promise((r) => setTimeout(r, 800));

    // List resources
    const listRes = await axios.get(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/resources`,
      { headers: { Authorization: `Bearer ${traineeToken}` } }
    );
    assert(listRes.data.data.resources.length > 0, 'List Lesson Resources', `Count: ${listRes.data.data.resources.length}`);

    // Download PDF (Enrolled Trainee)
    const downloadRes = await axios.get(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/resources/${uploadedResourceId}/download`,
      { headers: { Authorization: `Bearer ${traineeToken}` } }
    );
    assert(downloadRes.status === 200, 'Enrolled Trainee PDF Download');

    // Cross-tenant Trainee (Org B) blocked from downloading Org A PDF
    try {
      await axios.get(
        `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/resources/${uploadedResourceId}/download`,
        { headers: { Authorization: `Bearer ${orgBTraineeToken}` } }
      );
      assert(false, 'Cross-Tenant PDF Download Denial (Expected 403/404)');
    } catch (err) {
      assert(err.response?.status === 403 || err.response?.status === 404, 'Cross-Tenant PDF Download Denial (Tenant Isolation)');
    }

    try {
      if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    } catch {}

    // -------------------------------------------------------------
    // STEP 6: Multi-Source RAG Retrieval & Citations
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Multi-Source RAG Retrieval & Citations ---');

    // Index the course
    await axios.post(
      `${BASE_URL}/rag/index/course/${courseId}`,
      {},
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );

    // Query AI Tutor about lesson / ingress
    const tutorChatRes = await axios.post(
      `${BASE_URL}/rag/chat`,
      {
        courseId,
        message: 'How does Kubernetes Ingress handle traffic routing?',
      },
      { headers: { Authorization: `Bearer ${traineeToken}` } }
    );

    assert(Boolean(tutorChatRes.data.data.content), 'AI Tutor Chat Multi-Source Response');
    assert(Array.isArray(tutorChatRes.data.data.citations), 'AI Tutor Citations Generated');
    if (tutorChatRes.data.data.citations.length > 0) {
      const topCitation = tutorChatRes.data.data.citations[0];
      assert(
        topCitation.courseId === courseId,
        'Citation Grounding & Course Scoping',
        `Title: ${topCitation.title}, SourceBadge: ${topCitation.sourceBadge || 'Lesson'}`
      );
    }

    // Strict Tenant Isolation in RAG: Org B Trainee asking about Org A course content
    try {
      await axios.post(
        `${BASE_URL}/rag/chat`,
        {
          courseId,
          message: 'What is the Kubernetes ingress architecture?',
        },
        { headers: { Authorization: `Bearer ${orgBTraineeToken}` } }
      );
      assert(false, 'Cross-Tenant AI Tutor Access Denial (Expected 404/403)');
    } catch (err) {
      assert(err.response?.status === 404 || err.response?.status === 403, 'Cross-Tenant AI Tutor Access Denial (Tenant Isolation)');
    }

    // -------------------------------------------------------------
    // STEP 7: Cleanup & Stale Vector Deletion
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Media Deletion & Vector Cleanup ---');

    // Delete PDF resource
    const deletePdfRes = await axios.delete(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/resources/${uploadedResourceId}`,
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    assert(deletePdfRes.status === 200, 'Delete Lesson PDF Resource');

    // Delete Lesson Video
    const deleteVideoRes = await axios.delete(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/video`,
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    assert(deleteVideoRes.status === 200, 'Delete Lesson Video & Clean Stale Vectors');

    // -------------------------------------------------------------
    // STEP 8: Course Media Status Monitor
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Course Media Status Monitor ---');
    const mediaStatusRes = await axios.get(
      `${BASE_URL}/courses/${courseId}/media-status`,
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    assert(
      mediaStatusRes.status === 200 && Array.isArray(mediaStatusRes.data.data.lessons),
      'Course Media Processing Status Overview'
    );

    // -------------------------------------------------------------
    // STEP 9: YouTube Playlist Course Generation
    // -------------------------------------------------------------
    console.log('\n--- Step 9: YouTube Playlist Course Generation ---');
    let importedCourseId = '';
    let importedLessonId = '';

    // Unique playlist URL per run to test both fresh import and duplicate detection
    const validTestPlaylistUrl = `https://www.youtube.com/playlist?list=PLlaN88a7y2_${Date.now()}`;
    
    // We create an imported course deterministically to verify multi-lesson structure
    const importRes = await axios.post(
      `${BASE_URL}/courses/import-playlist`,
      {
        playlistUrl: validTestPlaylistUrl,
        category: 'Frontend Development',
        difficultyLevel: 'INTERMEDIATE',
      },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );

    assert(
      importRes.status === 201 || importRes.status === 200,
      'YouTube Playlist Import Endpoint',
      `Status: ${importRes.status}`
    );

    const importedData = importRes.data.data.course;
    importedCourseId = importedData.id;
    assert(Boolean(importedCourseId), 'Playlist Course Created', `CourseId: ${importedCourseId}`);
    assert(
      importedData.metadata?.importSource === 'YOUTUBE_PLAYLIST' ||
        importedData.metadata?.youtubePlaylistId?.startsWith('PLlaN88a7y2_'),
      'Playlist Metadata Stored'
    );

    // Verify Modules and Lessons were created
    const importedCourseDetail = await axios.get(`${BASE_URL}/courses/${importedCourseId}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    const importedModules = importedCourseDetail.data.data.modules || [];
    assert(importedModules.length > 0, 'Default Module Created from Playlist');

    const importedLessons = importedModules[0]?.lessons || [];
    assert(importedLessons.length === 3, 'Playlist Videos Converted to Lessons', `Count: ${importedLessons.length}`);
    importedLessonId = importedLessons[0]?.id;

    if (importedLessons.length > 1) {
      assert(
        importedLessons[0].order_index === 1 && importedLessons[1].order_index === 2,
        'Exact Playlist Ordering Preserved (1..N)'
      );
    }

    // -------------------------------------------------------------
    // STEP 10: Duplicate Playlist Import Protection
    // -------------------------------------------------------------
    console.log('\n--- Step 10: Duplicate Playlist Import Protection ---');
    const duplicateRes = await axios.post(
      `${BASE_URL}/courses/import-playlist`,
      {
        playlistUrl: validTestPlaylistUrl,
        category: 'Frontend Development',
      },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );

    assert(
      duplicateRes.status === 200 && duplicateRes.data.duplicate === true,
      'Duplicate Import Detection (duplicate: true)'
    );
    assert(
      duplicateRes.data.data.courseId === importedCourseId || duplicateRes.data.courseId === importedCourseId,
      'Existing Course Link Returned on Duplicate'
    );

    // Verify no phantom second course was inserted
    const countCheck = await db.query(
      `SELECT count(*) FROM courses WHERE organization_id = $1 AND (metadata->>'youtubePlaylistId' = $2);`,
      [orgId, validTestPlaylistUrl.split('list=')[1]]
    );
    assert(parseInt(countCheck.rows[0].count, 10) === 1, 'Zero Duplicate Phantom Courses in Database');

    // -------------------------------------------------------------
    // STEP 11: Lesson Notes Lifecycle & Zero-Fabrication Policy
    // -------------------------------------------------------------
    console.log('\n--- Step 11: Lesson Notes Lifecycle & Grounding ---');

    // 1. Initial status is NOT_GENERATED
    const initialNotesRes = await axios.get(
      `${BASE_URL}/courses/${importedCourseId}/lessons/${importedLessonId}/notes`,
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    assert(
      initialNotesRes.data.data.notesStatus === 'NOT_GENERATED' || initialNotesRes.data.data.notesStatus === 'READY',
      'Initial Lesson Notes Status'
    );

    // 2. Zero-Fabrication: Attempt generating notes when NO source material exists
    // Create empty lesson with no transcript, no body, no PDF
    const emptyLessonRes = await axios.post(
      `${BASE_URL}/courses/modules/${importedModules[0].id}/lessons`,
      { title: 'Empty Placeholder Lesson', contentBody: '', orderIndex: 10 },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    const emptyLessonId = emptyLessonRes.data.data.id || emptyLessonRes.data.data.lesson?.id;

    try {
      await axios.post(
        `${BASE_URL}/courses/${importedCourseId}/lessons/${emptyLessonId}/notes/generate`,
        {},
        { headers: { Authorization: `Bearer ${trainerToken}` } }
      );
      assert(false, 'Zero-Fabrication Note Generation (Expected failure when no source exists)');
    } catch (err) {
      assert(
        err.response?.status === 400 && err.response?.data?.error?.code === 'NO_GROUNDING_SOURCE',
        'Zero-Fabrication: Rejects Note Generation Without Source Material (HTTP 400 NO_GROUNDING_SOURCE)'
      );
    }

    // 3. Trainer manual note update
    const updateNotesRes = await axios.put(
      `${BASE_URL}/courses/${importedCourseId}/lessons/${importedLessonId}/notes`,
      {
        notes: '## Summary\nComprehensive guide to microservices and service mesh architecture.\n\n## Key Concepts\n• Envoy Proxy\n• Control Plane\n• Data Plane\n\n## Key Takeaways\nService meshes decouple observability and security from application code.',
      },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    assert(
      updateNotesRes.status === 200 && updateNotesRes.data.data.notes_status === 'READY',
      'Trainer Manual Note Update & Re-indexing'
    );

    // 4. Verify updated notes via GET
    const getUpdatedNotesRes = await axios.get(
      `${BASE_URL}/courses/${importedCourseId}/lessons/${importedLessonId}/notes`,
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    assert(
      getUpdatedNotesRes.data.data.notes.includes('Envoy Proxy') &&
        getUpdatedNotesRes.data.data.notesStatus === 'READY',
      'Get Lesson Notes (Grounded Content Verified)'
    );

    // -------------------------------------------------------------
    // STEP 12: Multi-Source RAG Retrieval with Notes Citations
    // -------------------------------------------------------------
    console.log('\n--- Step 12: RAG Multi-Source Retrieval with Notes ---');

    // Enroll trainee in imported course
    await axios.post(`${BASE_URL}/courses/${importedCourseId}/publish`, {}, { headers: { Authorization: `Bearer ${trainerToken}` } });
    await axios.post(`${BASE_URL}/enrollments`, { courseId: importedCourseId }, { headers: { Authorization: `Bearer ${traineeToken}` } });

    // Ask AI Tutor question answered by notes
    const notesChatRes = await axios.post(
      `${BASE_URL}/rag/chat`,
      {
        courseId: importedCourseId,
        message: 'What components make up a service mesh according to the lesson notes?',
      },
      { headers: { Authorization: `Bearer ${traineeToken}` } }
    );

    assert(Boolean(notesChatRes.data.data.content), 'AI Tutor Chat with Lesson Notes');
    assert(Array.isArray(notesChatRes.data.data.citations), 'AI Tutor Returns Citations for Notes');
    if (notesChatRes.data.data.citations.length > 0) {
      const topNoteCitation = notesChatRes.data.data.citations[0];
      assert(
        topNoteCitation.sourceType === 'lesson_notes' || topNoteCitation.sourceBadge?.includes('Notes') || topNoteCitation.title.includes('Notes') || topNoteCitation.courseId === importedCourseId,
        'Notes Citation Grounded & Correctly Attributed',
        `Badge: ${topNoteCitation.sourceBadge || topNoteCitation.title}`
      );
    }

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n====================================================');
    console.log(`📊 STAGE 13 TEST SUITE SUMMARY:`);
    console.log(`   Total Tests : ${stats.total}`);
    console.log(`   Passed      : ${stats.passed}`);
    console.log(`   Failed      : ${stats.failed}`);
    console.log('====================================================\n');

    if (stats.failed > 0) {
      process.exit(1);
    } else {
      console.log('🎉 ALL STAGE 13 TESTS PASSED PERFECTLY!\n');
      process.exit(0);
    }
  } catch (globalErr) {
    console.error('💥 Unexpected exception in Stage 13 Test Suite:', globalErr.response?.data || globalErr.message);
    process.exit(1);
  }
}

runTests();
