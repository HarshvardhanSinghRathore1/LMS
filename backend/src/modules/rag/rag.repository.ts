import { pool } from '../../config/database';
import {
  LearnerContextFactRecord,
  ContextEntityType,
  DocumentRecord,
  DocumentChunkRecord,
  CourseIndexSummary,
} from './rag.types';
import { TutorConversationRecord, TutorMessageRecord, ChatRole } from '../ai/ai.types';

export class RAGRepository {
  /**
   * 1. Get Course, Modules, and Lessons for Indexing
   */
  async getCourseWithLessons(
    organizationId: string,
    courseId: string
  ): Promise<{
    course: { id: string; title: string; description: string; status: string };
    modules: Array<{
      id: string;
      title: string;
      orderIndex: number;
      lessons: Array<{
        id: string;
        title: string;
        contentBody: string;
        contentType: string;
        orderIndex: number;
      }>;
    }>;
  } | null> {
    const courseRes = await pool.query(
      `SELECT id, title, description, status FROM courses WHERE id = $1 AND organization_id = $2;`,
      [courseId, organizationId]
    );

    if (courseRes.rows.length === 0) {
      return null;
    }

    const course = courseRes.rows[0];

    const modulesRes = await pool.query(
      `SELECT id, title, order_index as "orderIndex"
       FROM course_modules
       WHERE course_id = $1
       ORDER BY order_index ASC;`,
      [courseId]
    );

    const modules: any[] = [];
    for (const mod of modulesRes.rows) {
      const lessonsRes = await pool.query(
        `SELECT id, title, content_body as "contentBody", content_type as "contentType", order_index as "orderIndex"
         FROM course_lessons
         WHERE module_id = $1
         ORDER BY order_index ASC;`,
        [mod.id]
      );
      modules.push({
        id: mod.id,
        title: mod.title,
        orderIndex: mod.orderIndex,
        lessons: lessonsRes.rows,
      });
    }

    return { course, modules };
  }

  /**
   * 2. Find or Create Course Document in `documents`
   */
  async findOrCreateCourseDocument(
    organizationId: string,
    courseId: string,
    title: string,
    metadata: any = {}
  ): Promise<DocumentRecord> {
    const existing = await pool.query<DocumentRecord>(
      `SELECT * FROM documents 
       WHERE organization_id = $1 AND document_type = 'course_content' AND metadata->>'courseId' = $2;`,
      [organizationId, courseId]
    );

    if (existing.rows.length > 0) {
      // Update title & metadata
      const updateRes = await pool.query<DocumentRecord>(
        `UPDATE documents 
         SET title = $1, metadata = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *;`,
        [title, JSON.stringify({ ...existing.rows[0].metadata, ...metadata, courseId }), existing.rows[0].id]
      );
      return updateRes.rows[0];
    }

    const insertRes = await pool.query<DocumentRecord>(
      `INSERT INTO documents (organization_id, title, document_type, metadata)
       VALUES ($1, $2, 'course_content', $3)
       RETURNING *;`,
      [organizationId, title, JSON.stringify({ ...metadata, courseId })]
    );

    return insertRes.rows[0];
  }

  /**
   * 3. Idempotently Delete Document Chunks for a Course/Document
   */
  async deleteDocumentChunks(documentId: string, organizationId: string): Promise<number> {
    const res = await pool.query(
      `DELETE FROM document_chunks WHERE document_id = $1 AND organization_id = $2;`,
      [documentId, organizationId]
    );
    return res.rowCount || 0;
  }

  /**
   * 4. Insert Batch Chunks
   */
  async insertDocumentChunksBatch(
    chunks: Array<{
      documentId: string;
      organizationId: string;
      content: string;
      chunkIndex: number;
      embedding: number[] | null;
      metadata: any;
    }>
  ): Promise<number> {
    if (chunks.length === 0) return 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const extRes = await client.query(`SELECT 1 FROM pg_extension WHERE extname = 'vector'`);
      const hasVectorExt = extRes.rows.length > 0;

      for (const chunk of chunks) {
        if (hasVectorExt && chunk.embedding) {
          const vectorStr = `[${chunk.embedding.join(',')}]`;
          await client.query(
            `INSERT INTO document_chunks (
              document_id, organization_id, content, chunk_index, embedding, metadata
            ) VALUES ($1, $2, $3, $4, $5::vector, $6);`,
            [
              chunk.documentId,
              chunk.organizationId,
              chunk.content,
              chunk.chunkIndex,
              vectorStr,
              JSON.stringify(chunk.metadata),
            ]
          );
        } else {
          await client.query(
            `INSERT INTO document_chunks (
              document_id, organization_id, content, chunk_index, embedding, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6);`,
            [
              chunk.documentId,
              chunk.organizationId,
              chunk.content,
              chunk.chunkIndex,
              chunk.embedding || null,
              JSON.stringify(chunk.metadata),
            ]
          );
        }
      }
      await client.query('COMMIT');
      return chunks.length;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 5. Get Indexing Summary for a Specific Course
   */
  async getCourseIndexingSummary(
    organizationId: string,
    courseId: string
  ): Promise<CourseIndexSummary | null> {
    const courseRes = await pool.query(
      `SELECT c.id, c.title, c.status,
              COUNT(DISTINCT cm.id)::int as "moduleCount",
              COUNT(DISTINCT cl.id)::int as "lessonCount"
       FROM courses c
       LEFT JOIN course_modules cm ON c.id = cm.course_id
       LEFT JOIN course_lessons cl ON cm.id = cl.module_id
       WHERE c.id = $1 AND c.organization_id = $2
       GROUP BY c.id, c.title, c.status;`,
      [courseId, organizationId]
    );

    if (courseRes.rows.length === 0) return null;
    const course = courseRes.rows[0];

    const docRes = await pool.query(
      `SELECT d.id, d.updated_at,
              COUNT(dc.id)::int as "chunkCount"
       FROM documents d
       LEFT JOIN document_chunks dc ON d.id = dc.document_id
       WHERE d.organization_id = $1 AND d.document_type = 'course_content' AND d.metadata->>'courseId' = $2
       GROUP BY d.id, d.updated_at;`,
      [organizationId, courseId]
    );

    const doc = docRes.rows[0] || null;

    return {
      courseId: course.id,
      courseTitle: course.title,
      status: course.status,
      moduleCount: course.moduleCount || 0,
      lessonCount: course.lessonCount || 0,
      chunkCount: doc?.chunkCount || 0,
      documentId: doc?.id || null,
      lastIndexedAt: doc?.updated_at ? new Date(doc.updated_at).toISOString() : null,
    };
  }

  /**
   * 6. List Knowledge Index Overview for Tenant
   */
  async listKnowledgeIndex(organizationId: string): Promise<CourseIndexSummary[]> {
    const query = `
      SELECT 
        c.id as "courseId",
        c.title as "courseTitle",
        c.status,
        COUNT(DISTINCT cm.id)::int as "moduleCount",
        COUNT(DISTINCT cl.id)::int as "lessonCount",
        COALESCE(COUNT(DISTINCT dc.id), 0)::int as "chunkCount",
        d.id as "documentId",
        d.updated_at as "lastIndexedAt"
      FROM courses c
      LEFT JOIN course_modules cm ON c.id = cm.course_id
      LEFT JOIN course_lessons cl ON cm.id = cl.module_id
      LEFT JOIN documents d ON d.organization_id = c.organization_id 
                            AND d.document_type = 'course_content' 
                            AND d.metadata->>'courseId' = c.id::text
      LEFT JOIN document_chunks dc ON d.id = dc.document_id
      WHERE c.organization_id = $1
      GROUP BY c.id, c.title, c.status, d.id, d.updated_at
      ORDER BY c.title ASC;
    `;
    const res = await pool.query(query, [organizationId]);
    return res.rows.map((r) => ({
      ...r,
      lastIndexedAt: r.lastIndexedAt ? new Date(r.lastIndexedAt).toISOString() : null,
    }));
  }

  /**
   * 7. Learner Context Facts CRUD
   */
  async getLearnerContextFacts(
    organizationId: string,
    userId: string,
    activeOnly: boolean = true
  ): Promise<LearnerContextFactRecord[]> {
    let sql = `
      SELECT id, organization_id, user_id, entity_type, fact_text,
             confidence_score, source_event, is_active, created_at, updated_at
      FROM learner_context_facts
      WHERE organization_id = $1 AND user_id = $2
    `;
    const params: any[] = [organizationId, userId];

    if (activeOnly) {
      sql += ` AND is_active = TRUE`;
    }

    sql += ` ORDER BY created_at DESC;`;

    const res = await pool.query<LearnerContextFactRecord>(sql, params);
    return res.rows.map((r) => ({
      ...r,
      confidence_score: parseFloat(r.confidence_score as any),
    }));
  }

  async createLearnerContextFact(
    organizationId: string,
    userId: string,
    entityType: ContextEntityType,
    factText: string,
    confidenceScore: number = 1.0,
    sourceEvent: string | null = null
  ): Promise<LearnerContextFactRecord> {
    const query = `
      INSERT INTO learner_context_facts (
        organization_id, user_id, entity_type, fact_text, confidence_score, source_event, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING *;
    `;
    const res = await pool.query<LearnerContextFactRecord>(query, [
      organizationId,
      userId,
      entityType,
      factText,
      confidenceScore,
      sourceEvent,
    ]);
    const r = res.rows[0];
    return {
      ...r,
      confidence_score: parseFloat(r.confidence_score as any),
    };
  }

  async deactivateLearnerContextFact(
    organizationId: string,
    userId: string,
    factId: string
  ): Promise<LearnerContextFactRecord | null> {
    const query = `
      UPDATE learner_context_facts
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND organization_id = $2 AND user_id = $3
      RETURNING *;
    `;
    const res = await pool.query<LearnerContextFactRecord>(query, [factId, organizationId, userId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      confidence_score: parseFloat(r.confidence_score as any),
    };
  }

  async deactivateStruggleFacts(
    organizationId: string,
    userId: string,
    keyword: string
  ): Promise<number> {
    const query = `
      UPDATE learner_context_facts
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1 AND user_id = $2 AND entity_type = 'STRUGGLE_CONCEPT'
        AND is_active = TRUE AND fact_text ILIKE $3;
    `;
    const res = await pool.query(query, [organizationId, userId, `%${keyword}%`]);
    return res.rowCount || 0;
  }

  /**
   * 8. Trainee Course Enrollment Verification
   */
  async verifyTraineeCourseAccess(
    organizationId: string,
    userId: string,
    courseId: string
  ): Promise<boolean> {
    const query = `
      SELECT id, status FROM course_enrollments
      WHERE organization_id = $1 AND trainee_id = $2 AND course_id = $3
        AND status IN ('ENROLLED', 'IN_PROGRESS', 'COMPLETED');
    `;
    const res = await pool.query(query, [organizationId, userId, courseId]);
    return res.rows.length > 0;
  }

  /**
   * 9. Conversation Sessions & History (Reusing ai_tutor_conversations & ai_tutor_messages)
   */
  async findOrCreateConversation(
    organizationId: string,
    userId: string,
    courseId?: string
  ): Promise<TutorConversationRecord> {
    if (courseId) {
      const existing = await pool.query<TutorConversationRecord>(
        `SELECT tc.*, c.title as course_title
         FROM ai_tutor_conversations tc
         LEFT JOIN courses c ON tc.course_id = c.id
         WHERE tc.organization_id = $1 AND tc.trainee_id = $2 AND tc.course_id = $3;`,
        [organizationId, userId, courseId]
      );

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      // Get course title
      const courseRes = await pool.query<{ title: string }>(
        `SELECT title FROM courses WHERE id = $1 AND organization_id = $2;`,
        [courseId, organizationId]
      );
      const courseTitle = courseRes.rows[0]?.title || 'Course';

      const insertSql = `
        INSERT INTO ai_tutor_conversations (
          organization_id, trainee_id, course_id, title
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (trainee_id, course_id)
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;
      const inserted = await pool.query<TutorConversationRecord>(insertSql, [
        organizationId,
        userId,
        courseId,
        `AI Assistant: ${courseTitle}`,
      ]);

      return { ...inserted.rows[0], course_title: courseTitle };
    } else {
      // General assistant conversation without specific course
      const existing = await pool.query<TutorConversationRecord>(
        `SELECT tc.*, NULL as course_title
         FROM ai_tutor_conversations tc
         WHERE tc.organization_id = $1 AND tc.trainee_id = $2 AND tc.course_id IS NULL
         ORDER BY tc.updated_at DESC LIMIT 1;`,
        [organizationId, userId]
      );

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      const insertSql = `
        INSERT INTO ai_tutor_conversations (
          organization_id, trainee_id, course_id, title
        )
        VALUES ($1, $2, NULL, 'General Learning Assistant')
        RETURNING *;
      `;
      const inserted = await pool.query<TutorConversationRecord>(insertSql, [
        organizationId,
        userId,
      ]);

      return inserted.rows[0];
    }
  }

  async findConversationById(
    conversationId: string,
    organizationId: string,
    userId: string
  ): Promise<TutorConversationRecord | null> {
    const query = `
      SELECT tc.*, c.title as course_title
      FROM ai_tutor_conversations tc
      LEFT JOIN courses c ON tc.course_id = c.id
      WHERE tc.id = $1 AND tc.organization_id = $2 AND tc.trainee_id = $3;
    `;
    const res = await pool.query<TutorConversationRecord>(query, [conversationId, organizationId, userId]);
    return res.rows[0] || null;
  }

  async listUserConversations(
    organizationId: string,
    userId: string
  ): Promise<TutorConversationRecord[]> {
    const query = `
      SELECT tc.*, c.title as course_title
      FROM ai_tutor_conversations tc
      LEFT JOIN courses c ON tc.course_id = c.id
      WHERE tc.organization_id = $1 AND tc.trainee_id = $2
      ORDER BY tc.updated_at DESC;
    `;
    const res = await pool.query<TutorConversationRecord>(query, [organizationId, userId]);
    return res.rows;
  }

  async getConversationMessages(
    conversationId: string,
    limit: number = 20
  ): Promise<TutorMessageRecord[]> {
    const query = `
      SELECT * FROM ai_tutor_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      LIMIT $2;
    `;
    const res = await pool.query<TutorMessageRecord>(query, [conversationId, limit]);
    return res.rows;
  }

  async getRecentConversationMessages(
    conversationId: string,
    limit: number = 8
  ): Promise<TutorMessageRecord[]> {
    const query = `
      SELECT * FROM (
        SELECT * FROM ai_tutor_messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      ) sub
      ORDER BY created_at ASC;
    `;
    const res = await pool.query<TutorMessageRecord>(query, [conversationId, limit]);
    return res.rows;
  }

  async createMessage(data: {
    conversationId: string;
    role: ChatRole;
    content: string;
    citations?: any[];
  }): Promise<TutorMessageRecord> {
    const query = `
      INSERT INTO ai_tutor_messages (
        conversation_id, role, content, citations
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const res = await pool.query<TutorMessageRecord>(query, [
      data.conversationId,
      data.role,
      data.content,
      JSON.stringify(data.citations || []),
    ]);

    await pool.query(
      `UPDATE ai_tutor_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
      [data.conversationId]
    );

    return res.rows[0];
  }

  async deleteConversation(
    conversationId: string,
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    const query = `
      DELETE FROM ai_tutor_conversations
      WHERE id = $1 AND organization_id = $2 AND trainee_id = $3
      RETURNING id;
    `;
    const res = await pool.query(query, [conversationId, organizationId, userId]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const ragRepository = new RAGRepository();
