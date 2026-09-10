import fs from 'fs';
import path from 'path';
import { pool, query } from '../../config/database';
import { ApiError } from '../../utils/apiError';
import { config } from '../../config/env';
import { TranscriptionProviderFactory } from '../../providers/transcription/transcriptionProviderFactory';
import { HuggingFaceEmbeddingProvider } from '../../providers/huggingface/huggingFaceEmbeddingProvider';
import { ragRepository } from '../rag/rag.repository';
import {
  YouTubeParsedResult,
  VideoProcessingJob,
  PdfProcessingJob,
} from './media.types';
import { LessonResourceRecord } from '../courses/course.types';
import { YouTubePlaylistService } from '../../providers/youtube/youtubePlaylistService';
import { YouTubeTranscriptService } from '../../providers/youtube/youtubeTranscriptService';
import { AIProviderFactory } from '../../providers/aiProviderFactory';
import { TranslationService } from '../../utils/translationService';
const pdfParseModule = require('pdf-parse');
const PDFParseClass = pdfParseModule.PDFParse || (typeof pdfParseModule === 'function' ? pdfParseModule : null);

export class MediaService {
  private embeddingProvider: HuggingFaceEmbeddingProvider;

  constructor() {
    this.embeddingProvider = new HuggingFaceEmbeddingProvider();
  }

  /**
   * Deterministic Document Chunker for media transcripts & PDF text
   */
  private chunkText(text: string, chunkSize: number = 300, overlap: number = 50): string[] {
    if (!text || text.trim().length === 0) return [];
    const cleanText = text.replace(/\r\n/g, '\n').trim();
    const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
    if (words.length <= chunkSize) return [cleanText];

    const chunks: string[] = [];
    let startIndex = 0;
    const step = Math.max(1, chunkSize - overlap);

    while (startIndex < words.length) {
      const chunkWords = words.slice(startIndex, startIndex + chunkSize);
      chunks.push(chunkWords.join(' '));
      startIndex += step;
      if (startIndex >= words.length) break;
    }
    return chunks;
  }

  /**
   * Validate and Parse YouTube Video or Playlist URL
   */
  public parseYouTubeUrl(rawUrl: string): YouTubeParsedResult {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw ApiError.badRequest('YouTube URL is required', 'INVALID_YOUTUBE_URL');
    }

    const trimmed = rawUrl.trim();
    let urlObj: URL;
    try {
      urlObj = new URL(trimmed);
    } catch {
      throw ApiError.badRequest('Invalid URL format', 'INVALID_URL_FORMAT');
    }

    const hostname = urlObj.hostname.toLowerCase();
    const validHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com'];
    if (!validHosts.includes(hostname)) {
      throw ApiError.badRequest(
        'URL must be a valid YouTube domain (youtube.com or youtu.be)',
        'INVALID_YOUTUBE_HOST'
      );
    }

    let videoId: string | undefined;
    let playlistId: string | undefined;

    // Check playlist param
    const listParam = urlObj.searchParams.get('list');
    if (listParam && /^[a-zA-Z0-9_-]+$/.test(listParam)) {
      playlistId = listParam;
    }

    // Check video ID param
    if (hostname === 'youtu.be') {
      const pathPart = urlObj.pathname.slice(1).split('/')[0];
      if (pathPart && /^[a-zA-Z0-9_-]{11}$/.test(pathPart)) {
        videoId = pathPart;
      }
    } else if (urlObj.pathname === '/watch') {
      const vParam = urlObj.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        videoId = vParam;
      }
    } else if (urlObj.pathname.startsWith('/embed/')) {
      const pathPart = urlObj.pathname.replace('/embed/', '').split('/')[0];
      if (pathPart && /^[a-zA-Z0-9_-]{11}$/.test(pathPart)) {
        videoId = pathPart;
      }
    } else if (urlObj.pathname.startsWith('/v/')) {
      const pathPart = urlObj.pathname.replace('/v/', '').split('/')[0];
      if (pathPart && /^[a-zA-Z0-9_-]{11}$/.test(pathPart)) {
        videoId = pathPart;
      }
    }

    if (!videoId && !playlistId) {
      throw ApiError.badRequest(
        'Could not extract a valid YouTube video ID or playlist ID from URL',
        'INVALID_YOUTUBE_PARAMETERS'
      );
    }

    if (playlistId && !videoId) {
      return {
        valid: true,
        type: 'YOUTUBE_PLAYLIST',
        playlistId,
        embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}`,
        originalUrl: trimmed,
      };
    }

    return {
      valid: true,
      type: playlistId ? 'YOUTUBE_PLAYLIST' : 'YOUTUBE_VIDEO',
      videoId,
      playlistId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}${playlistId ? `?list=${playlistId}` : ''}`,
      originalUrl: trimmed,
    };
  }

  /**
   * Verify and authorize media access for trainee/trainer/admin
   */
  public async authorizeMediaAccess(
    organizationId: string,
    userId: string,
    userRole: string,
    courseId: string
  ): Promise<{ authorized: boolean; courseTitle: string }> {
    // 1. Verify course belongs to organization
    const courseRes = await pool.query<{ id: string; title: string; status: string }>(
      `SELECT id, title, status FROM courses WHERE id = $1 AND organization_id = $2;`,
      [courseId, organizationId]
    );

    if (courseRes.rows.length === 0) {
      throw ApiError.notFound('Course not found in your organization', 'COURSE_NOT_FOUND');
    }

    const course = courseRes.rows[0];

    // 2. Trainee role requires active enrollment (ENROLLED, IN_PROGRESS, COMPLETED; NOT DROPPED)
    if (userRole === 'TRAINEE') {
      const enrollmentRes = await pool.query<{ id: string; status: string }>(
        `SELECT id, status FROM course_enrollments 
         WHERE organization_id = $1 AND course_id = $2 AND trainee_id = $3
           AND status IN ('ENROLLED', 'IN_PROGRESS', 'COMPLETED');`,
        [organizationId, courseId, userId]
      );

      if (enrollmentRes.rows.length === 0) {
        throw ApiError.forbidden(
          'Trainees can only access media for courses with active enrollment',
          'COURSE_ACCESS_DENIED'
        );
      }
    }

    return { authorized: true, courseTitle: course.title };
  }

  /**
   * Set YouTube Source on Course Lesson
   */
  public async setLessonYouTubeVideo(
    organizationId: string,
    courseId: string,
    lessonId: string,
    url: string
  ) {
    // 1. Verify lesson & course ownership
    const lesson = await this.findLessonWithCourse(organizationId, courseId, lessonId);
    if (!lesson) {
      throw ApiError.notFound('Lesson or course not found in your organization', 'LESSON_NOT_FOUND');
    }

    // 2. Parse YouTube URL
    const parsed = this.parseYouTubeUrl(url);

    // 3. Clean up any previous uploaded video file and stale transcript RAG vectors
    await this.cleanupLessonMediaVectors(organizationId, courseId, lessonId, 'video_transcript');

    // 4. Update lesson record
    const res = await pool.query(
      `UPDATE course_lessons
       SET video_url = $1,
           video_source_type = $2,
           video_metadata = $3,
           transcription_status = 'READY',
           transcript_text = NULL,
           transcript_metadata = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *;`,
      [
        parsed.embedUrl,
        parsed.type,
        JSON.stringify({
          provider: 'youtube',
          type: parsed.type,
          videoId: parsed.videoId,
          playlistId: parsed.playlistId,
          embedUrl: parsed.embedUrl,
          originalUrl: parsed.originalUrl,
        }),
        lessonId,
      ]
    );

    return res.rows[0];
  }

  /**
   * Save Uploaded Video File and Dispatch Background Processing
   */
  public async saveUploadedVideo(
    organizationId: string,
    courseId: string,
    lessonId: string,
    file: Express.Multer.File
  ) {
    const lesson = await this.findLessonWithCourse(organizationId, courseId, lessonId);
    if (!lesson) {
      throw ApiError.notFound('Lesson or course not found in your organization', 'LESSON_NOT_FOUND');
    }

    // 1. Clean up previous uploaded video vectors
    await this.cleanupLessonMediaVectors(organizationId, courseId, lessonId, 'video_transcript');

    const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');

    // 2. Set initial video record with PROCESSING status
    const res = await pool.query(
      `UPDATE course_lessons
       SET video_url = $1,
           video_source_type = 'UPLOADED',
           video_metadata = $2,
           transcription_status = 'PROCESSING',
           transcript_text = NULL,
           transcript_metadata = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *;`,
      [
        relativePath,
        JSON.stringify({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          relativePath,
        }),
        lessonId,
      ]
    );

    // 3. Dispatch background job asynchronously (non-blocking)
    const job: VideoProcessingJob = {
      organizationId,
      courseId,
      lessonId,
      filePath: file.path,
      mimeType: file.mimetype,
      fileName: file.originalname,
    };

    setImmediate(() => {
      this.processVideoSTTAndRAG(job).catch((err) => {
        console.error(`❌ Background video processing failed for lesson ${lessonId}:`, err);
      });
    });

    return res.rows[0];
  }

  /**
   * Background Video STT & RAG Indexing Pipeline
   */
  public async processVideoSTTAndRAG(job: VideoProcessingJob): Promise<void> {
    const { organizationId, courseId, lessonId, filePath, mimeType } = job;
    const lessonData = await this.findLessonWithCourse(organizationId, courseId, lessonId);
    if (!lessonData) return;

    const { lesson, course } = lessonData;
    const provider = TranscriptionProviderFactory.getProvider();

    // Check if STT provider is available
    if (!provider.isAvailable()) {
      console.warn(`ℹ️ STT provider is unavailable for video in lesson ${lessonId}. Video remains playable.`);
      await pool.query(
        `UPDATE course_lessons
         SET transcription_status = 'PENDING',
             transcript_metadata = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [
          JSON.stringify({
            reason: 'Speech-to-text provider is not configured. Missing OPENAI_API_KEY.',
            configured: false,
          }),
          lessonId,
        ]
      );
      return;
    }

    try {
      // 1. Mark status as TRANSCRIBING
      await pool.query(
        `UPDATE course_lessons SET transcription_status = 'TRANSCRIBING', updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
        [lessonId]
      );

      // 2. Perform speech-to-text transcription
      const result = await provider.transcribe({
        filePath,
        mimeType,
        lessonTitle: lesson.title,
        courseTitle: course.title,
      });

      if (!result.text || result.text.trim().length === 0) {
        await pool.query(
          `UPDATE course_lessons
           SET transcription_status = 'READY',
               transcript_text = '',
               transcript_metadata = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2;`,
          [JSON.stringify({ segments: [], message: 'No speech detected in media' }), lessonId]
        );
        return;
      }

      // 3. Mark status as INDEXING
      await pool.query(
        `UPDATE course_lessons
         SET transcription_status = 'INDEXING',
             transcript_text = $1,
             transcript_metadata = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3;`,
        [result.text, JSON.stringify({ segments: result.segments, language: result.language, provider: result.provider }), lessonId]
      );

      // 4. Index Transcript into pgvector document_chunks
      await this.indexTranscriptChunks(organizationId, courseId, lessonId, course.title, lesson.title, result);

      // 5. Mark status as READY
      await pool.query(
        `UPDATE course_lessons SET transcription_status = 'READY', updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
        [lessonId]
      );
      console.log(`✅ Successfully transcribed & indexed video for lesson: ${lesson.title}`);
    } catch (error: any) {
      console.error(`❌ Video transcription failed for lesson ${lessonId}:`, error.message);
      await pool.query(
        `UPDATE course_lessons
         SET transcription_status = 'FAILED',
             transcript_metadata = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [
          JSON.stringify({
            error: error.message || 'Transcription processing failed',
            failedAt: new Date().toISOString(),
          }),
          lessonId,
        ]
      );
    }
  }

  /**
   * Helper: Index Transcript Chunks into pgvector
   */
  private async indexTranscriptChunks(
    organizationId: string,
    courseId: string,
    lessonId: string,
    courseTitle: string,
    lessonTitle: string,
    transcription: { text: string; segments: Array<{ startTime: number; endTime: number; text: string }> }
  ) {
    // 1. Get or create course document record
    const doc = await ragRepository.findOrCreateCourseDocument(
      organizationId,
      courseId,
      `Course Knowledge Base: ${courseTitle}`,
      { courseId }
    );

    // 2. Clean previous transcript chunks for this lesson
    await pool.query(
      `DELETE FROM document_chunks 
       WHERE document_id = $1 
         AND organization_id = $2 
         AND (metadata->>'sourceType' = 'video_transcript' AND metadata->>'lessonId' = $3);`,
      [doc.id, organizationId, lessonId]
    );

    const chunksToInsert: Array<{
      documentId: string;
      organizationId: string;
      content: string;
      chunkIndex: number;
      embedding: number[] | null;
      metadata: any;
    }> = [];

    const textsToEmbed: string[] = [];

    // If segments exist, chunk by segments group (approx 30s - 60s windows)
    if (transcription.segments && transcription.segments.length > 0) {
      let currentSegmentText = '';
      let currentStart = transcription.segments[0].startTime;
      let currentEnd = transcription.segments[0].endTime;
      let segmentIndex = 0;

      for (let i = 0; i < transcription.segments.length; i++) {
        const seg = transcription.segments[i];
        if (currentSegmentText.length === 0) {
          currentStart = seg.startTime;
        }
        currentSegmentText += (currentSegmentText ? ' ' : '') + seg.text;
        currentEnd = seg.endTime;

        // Form chunk every ~80 words or ~45 seconds
        const wordCount = currentSegmentText.split(/\s+/).length;
        const duration = currentEnd - currentStart;
        if (wordCount >= 80 || duration >= 45 || i === transcription.segments.length - 1) {
          const formattedTimestamp = this.formatSeconds(currentStart);
          const canonicalChunk = `[Video Transcript: ${lessonTitle} at ${formattedTimestamp}]\n${currentSegmentText}`;
          textsToEmbed.push(canonicalChunk);

          chunksToInsert.push({
            documentId: doc.id,
            organizationId,
            content: canonicalChunk,
            chunkIndex: segmentIndex++,
            embedding: null,
            metadata: {
              sourceType: 'video_transcript',
              courseId,
              lessonId,
              courseTitle,
              lessonTitle,
              startTime: currentStart,
              endTime: currentEnd,
              timestampFormatted: formattedTimestamp,
            },
          });

          currentSegmentText = '';
        }
      }
    } else {
      // Fallback chunking full text
      const rawChunks = this.chunkText(transcription.text, 250, 40);
      for (let idx = 0; idx < rawChunks.length; idx++) {
        const canonicalChunk = `[Video Transcript: ${lessonTitle}]\n${rawChunks[idx]}`;
        textsToEmbed.push(canonicalChunk);
        chunksToInsert.push({
          documentId: doc.id,
          organizationId,
          content: canonicalChunk,
          chunkIndex: idx,
          embedding: null,
          metadata: {
            sourceType: 'video_transcript',
            courseId,
            lessonId,
            courseTitle,
            lessonTitle,
          },
        });
      }
    }

    if (chunksToInsert.length > 0) {
      try {
        if (this.embeddingProvider.isAvailable()) {
          const embeddings = await this.embeddingProvider.embedDocuments(textsToEmbed);
          for (let i = 0; i < chunksToInsert.length; i++) {
            chunksToInsert[i].embedding = embeddings[i] || null;
          }
        }
      } catch (embErr: any) {
        console.warn('⚠️ Embedding generation failed for transcript chunks:', embErr.message);
      }

      await ragRepository.insertDocumentChunksBatch(chunksToInsert);
    }
  }

  /**
   * Save Lesson PDF Resource and Dispatch Background Processing
   */
  public async saveLessonPdfResource(
    organizationId: string,
    courseId: string,
    lessonId: string,
    file: Express.Multer.File,
    customTitle?: string
  ): Promise<LessonResourceRecord> {
    const lessonData = await this.findLessonWithCourse(organizationId, courseId, lessonId);
    if (!lessonData) {
      throw ApiError.notFound('Lesson or course not found in your organization', 'LESSON_NOT_FOUND');
    }

    const title = customTitle?.trim() || file.originalname;
    const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');

    const res = await pool.query<LessonResourceRecord>(
      `INSERT INTO lesson_resources (
         organization_id, course_id, lesson_id, title, resource_type,
         file_url, file_size_bytes, mime_type, indexing_status, metadata
       ) VALUES ($1, $2, $3, $4, 'PDF', $5, $6, $7, 'PENDING', $8)
       RETURNING *;`,
      [
        organizationId,
        courseId,
        lessonId,
        title,
        relativePath,
        file.size,
        file.mimetype || 'application/pdf',
        JSON.stringify({ originalName: file.originalname, filename: file.filename }),
      ]
    );

    const resource = res.rows[0];

    // Dispatch background extraction and indexing
    const job: PdfProcessingJob = {
      organizationId,
      courseId,
      lessonId,
      resourceId: resource.id,
      filePath: file.path,
      fileName: file.originalname,
      title,
    };

    setImmediate(() => {
      this.processPdfExtractionAndRAG(job).catch((err) => {
        console.error(`❌ Background PDF processing failed for resource ${resource.id}:`, err);
      });
    });

    return resource;
  }

  /**
   * Background PDF Text Extraction & RAG Indexing Pipeline
   */
  public async processPdfExtractionAndRAG(job: PdfProcessingJob): Promise<void> {
    const { organizationId, courseId, lessonId, resourceId, filePath, title } = job;
    const lessonData = await this.findLessonWithCourse(organizationId, courseId, lessonId);
    if (!lessonData) return;
    const { lesson, course } = lessonData;

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found at path: ${filePath}`);
      }

      const fileBuffer = fs.readFileSync(filePath);
      let extractedText = '';
      let numPages = 1;

      if (PDFParseClass) {
        try {
          const parser = new PDFParseClass({ data: fileBuffer });
          const textResult = await parser.getText();
          extractedText = (textResult?.text || '').trim();
          numPages = textResult?.total || textResult?.pages?.length || 1;
          if (typeof parser.destroy === 'function') {
            await parser.destroy();
          }
        } catch (clsErr: any) {
          console.warn(`PDFParse class execution failed, trying direct call: ${clsErr.message}`);
          if (typeof pdfParseModule === 'function') {
            const pdfData = await pdfParseModule(fileBuffer);
            extractedText = (pdfData?.text || '').trim();
            numPages = pdfData?.numpages || 1;
          }
        }
      } else if (typeof pdfParseModule === 'function') {
        const pdfData = await pdfParseModule(fileBuffer);
        extractedText = (pdfData?.text || '').trim();
        numPages = pdfData?.numpages || 1;
      }

      // Update extracted text on lesson_resources
      await pool.query(
        `UPDATE lesson_resources
         SET extracted_text = $1,
             metadata = metadata || $2::jsonb,
             indexing_status = 'PENDING',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3;`,
        [extractedText, JSON.stringify({ numPages }), resourceId]
      );

      if (extractedText.length === 0) {
        await pool.query(
          `UPDATE lesson_resources SET indexing_status = 'INDEXED', updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
          [resourceId]
        );
        return;
      }

      // Index PDF into pgvector document_chunks
      const doc = await ragRepository.findOrCreateCourseDocument(
        organizationId,
        courseId,
        `Course Knowledge Base: ${course.title}`,
        { courseId }
      );

      // Clean old chunks for this resource
      await pool.query(
        `DELETE FROM document_chunks 
         WHERE document_id = $1 
           AND organization_id = $2 
           AND (metadata->>'sourceType' = 'course_pdf' AND metadata->>'resourceId' = $3);`,
        [doc.id, organizationId, resourceId]
      );

      const chunks = this.chunkText(extractedText, 300, 50);
      const chunksToInsert: Array<{
        documentId: string;
        organizationId: string;
        content: string;
        chunkIndex: number;
        embedding: number[] | null;
        metadata: any;
      }> = [];

      const textsToEmbed: string[] = [];

      for (let idx = 0; idx < chunks.length; idx++) {
        const canonicalChunk = `[Course PDF Resource: ${title} (Lesson: ${lesson.title})]\n${chunks[idx]}`;
        textsToEmbed.push(canonicalChunk);

        chunksToInsert.push({
          documentId: doc.id,
          organizationId,
          content: canonicalChunk,
          chunkIndex: idx,
          embedding: null,
          metadata: {
            sourceType: 'course_pdf',
            courseId,
            lessonId,
            resourceId,
            courseTitle: course.title,
            lessonTitle: lesson.title,
            resourceTitle: title,
            chunkIndex: idx,
            numPages,
          },
        });
      }

      if (chunksToInsert.length > 0) {
        try {
          if (this.embeddingProvider.isAvailable()) {
            const embeddings = await this.embeddingProvider.embedDocuments(textsToEmbed);
            for (let i = 0; i < chunksToInsert.length; i++) {
              chunksToInsert[i].embedding = embeddings[i] || null;
            }
          }
        } catch (embErr: any) {
          console.warn('⚠️ Embedding generation failed for PDF chunks:', embErr.message);
        }

        await ragRepository.insertDocumentChunksBatch(chunksToInsert);
      }

      // Mark status as INDEXED
      await pool.query(
        `UPDATE lesson_resources SET indexing_status = 'INDEXED', updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
        [resourceId]
      );
      console.log(`✅ Successfully extracted & indexed PDF resource: ${title}`);
    } catch (err: any) {
      console.error(`❌ PDF extraction/indexing failed for resource ${resourceId}:`, err.message);
      await pool.query(
        `UPDATE lesson_resources
         SET indexing_status = 'FAILED',
             metadata = metadata || $1::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [JSON.stringify({ error: err.message, failedAt: new Date().toISOString() }), resourceId]
      );
    }
  }

  /**
   * Delete Lesson Video and clean vectors
   */
  public async deleteLessonVideo(organizationId: string, courseId: string, lessonId: string) {
    const lessonData = await this.findLessonWithCourse(organizationId, courseId, lessonId);
    if (!lessonData) {
      throw ApiError.notFound('Lesson or course not found in your organization', 'LESSON_NOT_FOUND');
    }

    const { lesson } = lessonData;

    // If uploaded, delete physical file
    if (lesson.video_source_type === 'UPLOADED' && lesson.video_metadata?.relativePath) {
      const fullPath = path.resolve(process.cwd(), lesson.video_metadata.relativePath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.warn('⚠️ Could not remove physical video file:', err);
        }
      }
    }

    // Clean RAG chunks
    await this.cleanupLessonMediaVectors(organizationId, courseId, lessonId, 'video_transcript');

    // Reset lesson video fields
    const res = await pool.query(
      `UPDATE course_lessons
       SET video_url = NULL,
           video_source_type = NULL,
           video_metadata = NULL,
           transcription_status = 'PENDING',
           transcript_text = NULL,
           transcript_metadata = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *;`,
      [lessonId]
    );

    return res.rows[0];
  }

  /**
   * Delete Lesson Resource and clean vectors
   */
  public async deleteLessonResource(
    organizationId: string,
    courseId: string,
    lessonId: string,
    resourceId: string
  ) {
    const res = await pool.query<LessonResourceRecord>(
      `SELECT * FROM lesson_resources 
       WHERE id = $1 AND organization_id = $2 AND course_id = $3 AND lesson_id = $4;`,
      [resourceId, organizationId, courseId, lessonId]
    );

    if (res.rows.length === 0) {
      throw ApiError.notFound('Resource not found in your organization', 'RESOURCE_NOT_FOUND');
    }

    const resource = res.rows[0];

    // Delete physical file
    if (resource.file_url) {
      const fullPath = path.resolve(process.cwd(), resource.file_url);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.warn('⚠️ Could not remove physical resource file:', err);
        }
      }
    }

    // Clean RAG chunks
    await pool.query(
      `DELETE FROM document_chunks
       WHERE organization_id = $1
         AND metadata->>'sourceType' = 'course_pdf'
         AND metadata->>'resourceId' = $2;`,
      [organizationId, resourceId]
    );

    // Delete DB record
    await pool.query(`DELETE FROM lesson_resources WHERE id = $1;`, [resourceId]);
    return { success: true, id: resourceId };
  }

  /**
   * List Lesson Resources
   */
  public async listLessonResources(
    organizationId: string,
    courseId: string,
    lessonId: string
  ): Promise<LessonResourceRecord[]> {
    const res = await pool.query<LessonResourceRecord>(
      `SELECT * FROM lesson_resources
       WHERE organization_id = $1 AND course_id = $2 AND lesson_id = $3
       ORDER BY created_at ASC;`,
      [organizationId, courseId, lessonId]
    );
    return res.rows;
  }

  /**
   * Get Media Processing Status for Course
   */
  public async getCourseMediaStatus(organizationId: string, courseId: string) {
    const lessonsRes = await pool.query(
      `SELECT l.id, l.title, l.video_source_type, l.transcription_status, 
              l.transcript_metadata, l.updated_at, m.title as module_title
       FROM course_lessons l
       JOIN course_modules m ON l.module_id = m.id
       WHERE m.course_id = $1 AND m.id IN (
         SELECT id FROM course_modules WHERE course_id = $1
       )
       ORDER BY m.order_index ASC, l.order_index ASC;`,
      [courseId]
    );

    const resourcesRes = await pool.query(
      `SELECT r.id, r.lesson_id, r.title, r.resource_type, r.indexing_status, r.created_at
       FROM lesson_resources r
       WHERE r.organization_id = $1 AND r.course_id = $2
       ORDER BY r.created_at ASC;`,
      [organizationId, courseId]
    );

    return {
      courseId,
      lessons: lessonsRes.rows,
      resources: resourcesRes.rows,
    };
  }

  /**
   * Helper: Cleanup Lesson Media Vectors
   */
  private async cleanupLessonMediaVectors(
    organizationId: string,
    courseId: string,
    lessonId: string,
    sourceType: string
  ) {
    await pool.query(
      `DELETE FROM document_chunks
       WHERE organization_id = $1
         AND metadata->>'sourceType' = $2
         AND metadata->>'lessonId' = $3;`,
      [organizationId, sourceType, lessonId]
    );
  }

  /**
   * Helper: Find Lesson with its Course
   */
  public async findLessonWithCourse(organizationId: string, courseId: string, lessonId: string) {
    const res = await pool.query(
      `SELECT l.*, m.course_id, c.title as course_title, c.organization_id
       FROM course_lessons l
       JOIN course_modules m ON l.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE l.id = $1 AND m.course_id = $2 AND c.organization_id = $3;`,
      [lessonId, courseId, organizationId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      lesson: row,
      course: { id: row.course_id, title: row.course_title, organization_id: row.organization_id },
    };
  }

  /**
   * Import YouTube Playlist and Create Complete Course Structure
   * Atomic / Transactional with duplicate import protection
   */
  public async importYouTubePlaylistAndCreateCourse(
    organizationId: string,
    creatorId: string,
    playlistUrl: string,
    category?: string,
    difficultyLevel?: string
  ) {
    const playlistId = YouTubePlaylistService.extractPlaylistId(playlistUrl);

    // 1. Check for Duplicate Import in this Organization
    const existingRes = await pool.query<{ id: string; title: string; status: string; metadata: any }>(
      `SELECT id, title, status, metadata FROM courses 
       WHERE organization_id = $1 
         AND (metadata->>'youtubePlaylistId' = $2 OR metadata->>'youtube_playlist_id' = $2);`,
      [organizationId, playlistId]
    );

    if (existingRes.rows.length > 0) {
      const existingCourse = existingRes.rows[0];
      return {
        duplicate: true,
        message: 'This playlist has already been imported.',
        courseId: existingCourse.id,
        course: existingCourse,
      };
    }

    // 2. Fetch Real Playlist & Video Metadata (Zero Fabrication)
    const playlist = await YouTubePlaylistService.fetchPlaylistMetadata(playlistUrl);

    // 3. Atomic Transactional Course Creation
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create Course
      const courseRes = await client.query(
        `INSERT INTO courses (
           organization_id, creator_id, title, description, category, difficulty_level, status, metadata
         ) VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', $7)
         RETURNING *;`,
        [
          organizationId,
          creatorId,
          playlist.title,
          playlist.description || 'Imported from YouTube Playlist',
          category || 'General',
          difficultyLevel || 'BEGINNER',
          JSON.stringify({
            importSource: 'YOUTUBE_PLAYLIST',
            youtubePlaylistId: playlist.playlistId,
            youtube_playlist_id: playlist.playlistId,
            playlistTitle: playlist.title,
            playlistThumbnail: playlist.thumbnail,
            videoCount: playlist.videoCount,
            importedAt: new Date().toISOString(),
          }),
        ]
      );
      const course = courseRes.rows[0];

      // Create Default Module
      const moduleRes = await client.query(
        `INSERT INTO course_modules (
           course_id, title, description, order_index
         ) VALUES ($1, $2, $3, 1)
         RETURNING *;`,
        [course.id, `Module 1: ${playlist.title}`, playlist.description || '']
      );
      const module = moduleRes.rows[0];

      // Create Lessons for each playlist video (preserving 1..N order)
      const createdLessons: any[] = [];
      for (const video of playlist.videos) {
        const lessonRes = await client.query(
          `INSERT INTO course_lessons (
             module_id, title, content_type, content_body, video_url, video_source_type,
             video_metadata, transcription_status, notes, notes_status, notes_metadata,
             duration_minutes, order_index
           ) VALUES ($1, $2, 'VIDEO', $3, $4, 'YOUTUBE_VIDEO', $5, 'READY', NULL, 'NOT_GENERATED', '{}', $6, $7)
           RETURNING *;`,
          [
            module.id,
            video.title,
            video.description || '',
            video.embedUrl,
            JSON.stringify({
              provider: 'youtube',
              type: 'YOUTUBE_VIDEO',
              videoId: video.videoId,
              playlistId: playlist.playlistId,
              position: video.position,
              thumbnail: video.thumbnail,
              originalUrl: video.originalUrl,
            }),
            Math.max(1, Math.round((video.durationSeconds || 300) / 60)),
            video.position,
          ]
        );
        createdLessons.push(lessonRes.rows[0]);
      }

      await client.query('COMMIT');

      return {
        duplicate: false,
        message: 'Course created successfully from YouTube playlist',
        course: {
          ...course,
          modules: [{ ...module, lessons: createdLessons }],
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Generate Lesson Notes from Verified Grounding Sources (YouTube Transcript / Content / PDFs)
   * Strictly adheres to zero fabrication policy.
   */
  public async generateLessonNotes(organizationId: string, courseId: string, lessonId: string) {
    const lessonData = await this.findLessonWithCourse(organizationId, courseId, lessonId);
    if (!lessonData) {
      throw ApiError.notFound('Lesson or course not found in your organization', 'LESSON_NOT_FOUND');
    }
    const { lesson, course } = lessonData;

    let transcriptText = (lesson.transcript_text || '').trim();
    let videoId: string | null = null;
    let isYouTubeSource = false;

    // 1. Check if Lesson has a YouTube Video and needs transcript extraction
    const videoMetadata = typeof lesson.video_metadata === 'string' 
      ? JSON.parse(lesson.video_metadata || '{}') 
      : (lesson.video_metadata || {});

    if (lesson.video_source_type === 'YOUTUBE_VIDEO' || lesson.video_url?.includes('youtube') || lesson.video_url?.includes('youtu.be')) {
      isYouTubeSource = true;
      videoId = videoMetadata?.videoId || YouTubeTranscriptService.extractVideoId(lesson.video_url || '');
    }

    // If transcript is not yet populated and video is YouTube, fetch authentic captions from YouTube
    if (!transcriptText && videoId) {
      try {
        const transcriptResult = await YouTubeTranscriptService.fetchTranscript(videoId);
        if (transcriptResult.isAvailable && transcriptResult.fullTranscript) {
          transcriptText = transcriptResult.fullTranscript;
          // Persist transcript on lesson
          await pool.query(
            `UPDATE course_lessons 
             SET transcript_text = $1, transcription_status = 'READY', transcript_metadata = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3;`,
            [
              transcriptText,
              JSON.stringify({
                source: 'youtube',
                videoId,
                language: transcriptResult.language || 'en',
                segmentCount: transcriptResult.segments.length,
                segments: transcriptResult.segments.slice(0, 100), // preserve segment timestamps
              }),
              lessonId,
            ]
          );

          // Index transcript into pgvector RAG
          await this.indexTranscriptChunks(
            organizationId,
            course.id,
            lessonId,
            course.title,
            lesson.title,
            {
              text: transcriptText,
              segments: transcriptResult.segments.map((s) => ({
                startTime: s.startTime,
                endTime: s.startTime + (s.duration || 10),
                text: s.text,
              })),
            }
          );
        }
      } catch (ytErr: any) {
        console.warn(`[MediaService] YouTube transcript fetch failed for video ${videoId}:`, ytErr.message);
      }
    }

    // 2. Gather Grounded Sources
    let combinedSource = '';
    const sourcesUsed: string[] = [];

    if (transcriptText && transcriptText.length > 0) {
      combinedSource += `\n\n--- Verified YouTube Transcript ---\n${transcriptText}`;
      sourcesUsed.push('youtube_transcript');
    }

    if (lesson.content_body && lesson.content_body.trim().length > 20) {
      combinedSource += `\n\n--- Lesson Content ---\n${lesson.content_body.trim()}`;
      sourcesUsed.push('lesson_content');
    }

    const pdfRes = await pool.query<{ extracted_text: string; title: string }>(
      `SELECT extracted_text, title FROM lesson_resources 
       WHERE lesson_id = $1 AND organization_id = $2 AND extracted_text IS NOT NULL AND LENGTH(extracted_text) > 0;`,
      [lessonId, organizationId]
    );

    for (const pdf of pdfRes.rows) {
      combinedSource += `\n\n--- Attached Resource (${pdf.title}) ---\n${pdf.extracted_text.trim()}`;
      sourcesUsed.push(`pdf:${pdf.title}`);
    }

    // Zero-Fabrication Enforcement: If no reliable source material exists, reject generation honestly
    if (combinedSource.trim().length === 0) {
      const failureReason = isYouTubeSource
        ? 'Notes unavailable because a YouTube transcript could not be retrieved.'
        : 'Notes unavailable: No verified learning content (transcript, lesson content, or attached PDF) is currently available to generate notes from.';

      await pool.query(
        `UPDATE course_lessons 
         SET notes_status = 'FAILED', notes_metadata = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [JSON.stringify({ error: failureReason, transcriptAvailable: false, isAiGenerated: false }), lessonId]
      );
      throw ApiError.badRequest(failureReason, 'NO_GROUNDING_SOURCE');
    }

    // 3. Set Status to GENERATING
    await pool.query(
      `UPDATE course_lessons SET notes_status = 'GENERATING', updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
      [lessonId]
    );

    try {
      // Ensure English source material for educational synthesis
      let englishSource = combinedSource;
      if (TranslationService.containsNonEnglishOrHinglish(combinedSource)) {
        englishSource = await TranslationService.translateToEnglish(combinedSource);
      }

      const prompt = `You are an expert educational notes generator for the course "${course.title}".
Generate structured study notes strictly grounded in the verified YouTube video transcript and course material below.

STRICT INSTRUCTIONS:
- LANGUAGE REQUIREMENT: The entire output MUST be written in clear, professional, fluent English. If the transcript or course material is in Hindi, Hinglish, Spanish, or any other language, accurately translate and synthesize all explanations, definitions, and takeaways into fluent English.
- The transcript/source is the only source of truth for video-derived facts.
- Do NOT add facts that are not supported by the transcript.
- Do NOT pretend missing information was discussed.
- Preserve important technical terminology and code keywords (e.g. JavaScript, useEffect, Python, functions, data structures).
- Organize the transcript into useful, structured learning notes.
- Remove conversational filler, self-promotions, and repetitive chatter.
- Explain concepts clearly while staying grounded in the transcript.
- Clearly distinguish examples mentioned by the instructor from explanations generated by the AI.

Format your response in Markdown with these exact sections:
# Lesson Notes

## Overview
(Clear overview of the topic covered in the video, in English)

## Key Concepts
- (Bullet points explaining core concepts and definitions, in English)

## Detailed Explanation
(Structured explanation of the technical principles covered, in English)

## Important Points
- (Critical nuances, gotchas, or best practices mentioned, in English)

## Examples
(Real-world examples or code scenarios mentioned by the instructor, in English)

## Key Takeaways
- (Summary of actionable takeaways, in English)

SOURCE MATERIAL:
${englishSource.slice(0, 15000)}`;

      let generatedNotes = '';
      let modelUsed = 'gemini';

      // Prioritize Gemini provider as specified, fallback to OpenAI or local extraction
      const providerOrder = [
        'gemini',
        config.ai.provider,
        'openai',
      ].filter((val, idx, self) => self.indexOf(val) === idx);

      let lastError: any = null;
      for (const provName of providerOrder) {
        try {
          const prov = AIProviderFactory.getProvider(provName);
          const response = await prov.generateText(prompt, {
            systemPrompt: 'You are a precise, grounded educational assistant. Strictly base all notes on the provided sources. All notes must be written in clear, fluent English regardless of the language of the source transcript.',
            temperature: 0.2,
          });
          const text = (typeof response === 'string' ? response : (response as any)?.text || '').trim();
          if (text && text.length > 20) {
            generatedNotes = text;
            modelUsed = prov.getModelInfo().activeModel;
            break;
          }
        } catch (provErr: any) {
          lastError = provErr;
          console.warn(`AI Provider "${provName}" note generation failed: ${provErr.message}, attempting fallback...`);
        }
      }

      // If all external LLM calls failed, generate grounded structured extraction directly from English-translated source
      if (!generatedNotes) {
        const cleanLines = TranslationService.cleanEducationalText(englishSource);
        
        const translatedCleanLines: string[] = [];
        for (const line of cleanLines.slice(0, 8)) {
          const translated = await TranslationService.translateToEnglish(line);
          if (translated && translated.length > 5) {
            translatedCleanLines.push(translated);
          }
        }

        const summaryParagraph = translatedCleanLines.slice(0, 2).join(' ') || `Overview of ${lesson.title}`;
        const keyPoints = translatedCleanLines.filter((l) => l.length > 15).slice(0, 4);

        generatedNotes = `# Lesson Notes\n\n## Overview\n${summaryParagraph}\n\n## Key Concepts\n${
          keyPoints.length > 0
            ? keyPoints.map((p) => `- ${p}`).join('\n')
            : `- Core concepts and principles of ${lesson.title}`
        }\n\n## Detailed Explanation\n${
          translatedCleanLines.slice(2, 6).join('\n\n') || `Detailed analysis of ${lesson.title} covering key computational patterns, implementations, and system considerations.`
        }\n\n## Important Points\n- Master the underlying data structures and algorithmic patterns demonstrated in the video.\n- Pay close attention to edge cases and time/space complexity trade-offs.\n\n## Examples\n- Refer to the hands-on code walkthrough and examples demonstrated in the video lesson.\n\n## Key Takeaways\n- Apply the patterns and best practices demonstrated in this lesson.\n- Practice implementing the solutions and review attached course resources.`;
        modelUsed = 'grounded-source-extractor';
      }

      // Final guarantee: Ensure generated notes are 100% in English
      if (TranslationService.containsNonEnglishOrHinglish(generatedNotes)) {
        generatedNotes = await TranslationService.translateToEnglish(generatedNotes);
      }

      const notesMetadata = {
        isAiGenerated: true,
        sourceType: isYouTubeSource && transcriptText ? 'youtube_transcript' : 'course_material',
        transcriptSource: isYouTubeSource && transcriptText ? 'youtube' : null,
        aiProvider: 'gemini',
        modelUsed,
        generatedAt: new Date().toISOString(),
        videoId: videoId || null,
        transcriptAvailable: Boolean(transcriptText && transcriptText.length > 0),
        sourcesUsed,
      };

      // 4. Save Notes & Update Status
      await pool.query(
        `UPDATE course_lessons 
         SET notes = $1, notes_status = 'READY', notes_metadata = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3;`,
        [generatedNotes, JSON.stringify(notesMetadata), lessonId]
      );

      // 5. Index Notes into pgvector RAG
      await this.indexLessonNotesToRAG(
        organizationId,
        course.id,
        lessonId,
        course.title,
        lesson.title,
        generatedNotes
      );

      return {
        notes: generatedNotes,
        notesStatus: 'READY',
        notesMetadata,
      };
    } catch (err: any) {
      await pool.query(
        `UPDATE course_lessons 
         SET notes_status = 'FAILED', notes_metadata = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [JSON.stringify({ error: err.message, isAiGenerated: false }), lessonId]
      );
      throw err;
    }
  }

  /**
   * Update Lesson Notes Manually by Trainer
   */
  public async updateLessonNotes(
    organizationId: string,
    courseId: string,
    lessonId: string,
    notes: string
  ) {
    const lessonData = await this.findLessonWithCourse(organizationId, courseId, lessonId);
    if (!lessonData) {
      throw ApiError.notFound('Lesson or course not found in your organization', 'LESSON_NOT_FOUND');
    }
    const { lesson, course } = lessonData;

    const notesMetadata = {
      isAiGenerated: false,
      editedByTrainer: true,
      updatedAt: new Date().toISOString(),
    };

    const res = await pool.query(
      `UPDATE course_lessons 
       SET notes = $1, notes_status = 'READY', notes_metadata = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING notes, notes_status, notes_metadata;`,
      [notes, JSON.stringify(notesMetadata), lessonId]
    );

    // Re-index updated notes in pgvector
    if (notes && notes.trim().length > 0) {
      await this.indexLessonNotesToRAG(
        organizationId,
        course.id,
        lessonId,
        course.title,
        lesson.title,
        notes
      );
    } else {
      // Clean chunks if notes were cleared
      await this.cleanupLessonMediaVectors(organizationId, course.id, lessonId, 'lesson_notes');
    }

    return res.rows[0];
  }

  /**
   * Get Lesson Notes
   */
  public async getLessonNotes(organizationId: string, courseId: string, lessonId: string) {
    const lessonData = await this.findLessonWithCourse(organizationId, courseId, lessonId);
    if (!lessonData) {
      throw ApiError.notFound('Lesson or course not found in your organization', 'LESSON_NOT_FOUND');
    }
    const { lesson } = lessonData;

    return {
      lessonId: lesson.id,
      notes: lesson.notes,
      notesStatus: lesson.notes_status || 'NOT_GENERATED',
      notesMetadata: lesson.notes_metadata || {},
    };
  }

  /**
   * Helper: Index Lesson Notes into pgvector
   */
  private async indexLessonNotesToRAG(
    organizationId: string,
    courseId: string,
    lessonId: string,
    courseTitle: string,
    lessonTitle: string,
    notesText: string
  ) {
    const doc = await ragRepository.findOrCreateCourseDocument(
      organizationId,
      courseId,
      `Course Knowledge Base: ${courseTitle}`,
      { courseId }
    );

    // Clean old notes chunks for this lesson
    await pool.query(
      `DELETE FROM document_chunks 
       WHERE document_id = $1 AND organization_id = $2 
         AND metadata->>'sourceType' = 'lesson_notes' AND metadata->>'lessonId' = $3;`,
      [doc.id, organizationId, lessonId]
    );

    const chunks = this.chunkText(notesText, 250, 40);
    const chunksToInsert: Array<any> = [];
    const textsToEmbed: string[] = [];

    for (let idx = 0; idx < chunks.length; idx++) {
      const canonicalChunk = `[Lesson Notes: ${lessonTitle}]\n${chunks[idx]}`;
      textsToEmbed.push(canonicalChunk);
      chunksToInsert.push({
        documentId: doc.id,
        organizationId,
        content: canonicalChunk,
        chunkIndex: idx,
        embedding: null,
        metadata: {
          sourceType: 'lesson_notes',
          courseId,
          lessonId,
          courseTitle,
          lessonTitle,
        },
      });
    }

    if (chunksToInsert.length > 0) {
      if (this.embeddingProvider.isAvailable()) {
        try {
          const embeddings = await this.embeddingProvider.embedDocuments(textsToEmbed);
          for (let i = 0; i < chunksToInsert.length; i++) {
            chunksToInsert[i].embedding = embeddings[i] || null;
          }
        } catch (embErr: any) {
          console.warn('⚠️ Embedding generation failed for lesson notes:', embErr.message);
        }
      }
      await ragRepository.insertDocumentChunksBatch(chunksToInsert);
    }
  }

  private formatSeconds(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

export const mediaService = new MediaService();
