import { pool } from '../../config/database';
import {
  AIGeneratedItemRecord,
  TutorConversationRecord,
  TutorMessageRecord,
  Citation,
  AIItemStatus,
  AIItemType,
  ChatRole,
} from './ai.types';

export class AIRepository {
  /**
   * Create an AI generated item (study notes or MCQ) in PENDING_REVIEW state
   */
  async createGeneratedItem(data: {
    organizationId: string;
    courseId: string;
    moduleId?: string | null;
    creatorId: string;
    itemType: AIItemType;
    title: string;
    content: any;
    status?: AIItemStatus;
    sourceContext?: any;
    provider: string;
    model: string;
  }): Promise<AIGeneratedItemRecord> {
    const query = `
      INSERT INTO ai_generated_items (
        organization_id, course_id, module_id, creator_id, item_type,
        title, content, status, source_context, provider, model
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const result = await pool.query<AIGeneratedItemRecord>(query, [
      data.organizationId,
      data.courseId,
      data.moduleId || null,
      data.creatorId,
      data.itemType,
      data.title,
      JSON.stringify(data.content),
      data.status || 'PENDING_REVIEW',
      data.sourceContext ? JSON.stringify(data.sourceContext) : null,
      data.provider,
      data.model,
    ]);
    return result.rows[0];
  }

  /**
   * Find generated item by ID within organization
   */
  async findGeneratedItemById(
    id: string,
    organizationId: string
  ): Promise<AIGeneratedItemRecord | null> {
    const query = `
      SELECT gi.*, c.title as course_title,
             CONCAT(u.first_name, ' ', u.last_name) as creator_name
      FROM ai_generated_items gi
      JOIN courses c ON gi.course_id = c.id
      JOIN users u ON gi.creator_id = u.id
      WHERE gi.id = $1 AND gi.organization_id = $2;
    `;
    const result = await pool.query<AIGeneratedItemRecord>(query, [id, organizationId]);
    return result.rows[0] || null;
  }

  /**
   * List AI generated items for tenant with filters
   */
  async listGeneratedItems(
    organizationId: string,
    options: {
      status?: AIItemStatus;
      itemType?: AIItemType;
      courseId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: AIGeneratedItemRecord[]; total: number }> {
    const conditions: string[] = ['gi.organization_id = $1'];
    const params: any[] = [organizationId];
    let index = 2;

    if (options.status) {
      conditions.push(`gi.status = $${index++}`);
      params.push(options.status);
    }
    if (options.itemType) {
      conditions.push(`gi.item_type = $${index++}`);
      params.push(options.itemType);
    }
    if (options.courseId) {
      conditions.push(`gi.course_id = $${index++}`);
      params.push(options.courseId);
    }

    const whereClause = conditions.join(' AND ');

    const countQuery = `SELECT COUNT(*)::int as total FROM ai_generated_items gi WHERE ${whereClause};`;
    const countRes = await pool.query<{ total: number }>(countQuery, params);
    const total = countRes.rows[0]?.total || 0;

    const limit = options.limit || 20;
    const offset = options.offset || 0;
    params.push(limit, offset);

    const dataQuery = `
      SELECT gi.*, c.title as course_title,
             CONCAT(u.first_name, ' ', u.last_name) as creator_name
      FROM ai_generated_items gi
      JOIN courses c ON gi.course_id = c.id
      JOIN users u ON gi.creator_id = u.id
      WHERE ${whereClause}
      ORDER BY gi.created_at DESC
      LIMIT $${index++} OFFSET $${index++};
    `;
    const dataRes = await pool.query<AIGeneratedItemRecord>(dataQuery, params);

    return { items: dataRes.rows, total };
  }

  /**
   * Reject or Update Status of a generated item
   */
  async updateGeneratedItemStatus(
    id: string,
    organizationId: string,
    status: AIItemStatus,
    reviewerId: string,
    reviewNotes?: string
  ): Promise<AIGeneratedItemRecord | null> {
    const query = `
      UPDATE ai_generated_items
      SET status = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          review_notes = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND organization_id = $5
      RETURNING *;
    `;
    const result = await pool.query<AIGeneratedItemRecord>(query, [
      status,
      reviewerId,
      reviewNotes || null,
      id,
      organizationId,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Update content and title of a generated item (Trainer Edit)
   */
  async updateGeneratedItemContent(
    id: string,
    organizationId: string,
    content: any,
    title?: string,
    reviewNotes?: string
  ): Promise<AIGeneratedItemRecord | null> {
    const updates: string[] = ['content = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [JSON.stringify(content), id, organizationId];
    let paramIndex = 4;

    if (title) {
      updates.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    if (reviewNotes !== undefined) {
      updates.push(`review_notes = $${paramIndex++}`);
      params.push(reviewNotes);
    }

    const query = `
      UPDATE ai_generated_items
      SET ${updates.join(', ')}
      WHERE id = $2 AND organization_id = $3
      RETURNING *;
    `;
    const result = await pool.query<AIGeneratedItemRecord>(query, params);
    return result.rows[0] || null;
  }

  /**
   * Delete a generated item from review queue
   */
  async deleteGeneratedItem(
    id: string,
    organizationId: string
  ): Promise<boolean> {
    const query = `
      DELETE FROM ai_generated_items
      WHERE id = $1 AND organization_id = $2;
    `;
    const result = await pool.query(query, [id, organizationId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Atomic PostgreSQL Transaction for approving an AI MCQ and importing it into assessment_questions
   */
  async importMcqToAssessmentTransaction(
    itemId: string,
    targetAssessmentId: string,
    organizationId: string,
    reviewerId: string,
    mcqContent: {
      questionText: string;
      questionType: 'MCQ';
      options: string[] | any[];
      correctAnswer: string;
      points: number;
      explanation?: string;
    },
    reviewNotes?: string
  ): Promise<{ approvedItem: AIGeneratedItemRecord; questionId: string }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock & verify generated item
      const itemRes = await client.query<AIGeneratedItemRecord>(
        `SELECT * FROM ai_generated_items WHERE id = $1 AND organization_id = $2 FOR UPDATE;`,
        [itemId, organizationId]
      );

      if (itemRes.rows.length === 0) {
        throw new Error('Generated item not found or cross-tenant access denied');
      }

      const item = itemRes.rows[0];
      if (item.status !== 'PENDING_REVIEW') {
        throw new Error(`Item is already in status '${item.status}' and cannot be reviewed again`);
      }

      if (item.item_type !== 'MCQ') {
        throw new Error('Only MCQ item types can be imported into assessment questions');
      }

      // 2. Lock & verify target assessment in same organization
      const assessRes = await client.query(
        `SELECT id, status FROM assessments WHERE id = $1 AND organization_id = $2 FOR UPDATE;`,
        [targetAssessmentId, organizationId]
      );

      if (assessRes.rows.length === 0) {
        throw new Error('Target assessment not found in your organization');
      }

      const assessment = assessRes.rows[0];
      if (assessment.status === 'ARCHIVED') {
        throw new Error('Cannot add questions to an ARCHIVED assessment');
      }

      // 3. Determine next order_index for question in target assessment
      const orderRes = await client.query<{ max_order: number }>(
        `SELECT COALESCE(MAX(order_index), 0) + 1 as max_order FROM assessment_questions WHERE assessment_id = $1;`,
        [targetAssessmentId]
      );
      const nextOrderIndex = orderRes.rows[0]?.max_order || 1;

      // 4. Format options for assessment_questions table
      // If options are simple strings, convert to [{ optionText, isCorrect }]
      let formattedOptions: Array<{ optionText: string; isCorrect: boolean }> = [];
      if (Array.isArray(mcqContent.options)) {
        if (typeof mcqContent.options[0] === 'string') {
          formattedOptions = (mcqContent.options as string[]).map((optStr) => ({
            optionText: optStr,
            isCorrect: optStr.trim().toLowerCase() === mcqContent.correctAnswer.trim().toLowerCase(),
          }));
        } else {
          formattedOptions = mcqContent.options as any;
        }
      }

      // 5. Insert into assessment_questions with source_ai_generated_item_id
      const insertQSql = `
        INSERT INTO assessment_questions (
          assessment_id, question_text, question_type, points, order_index,
          options, correct_answer, source_ai_generated_item_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id;
      `;
      const qRes = await client.query<{ id: string }>(insertQSql, [
        targetAssessmentId,
        mcqContent.questionText,
        'MCQ',
        mcqContent.points || 10,
        nextOrderIndex,
        JSON.stringify(formattedOptions),
        JSON.stringify(mcqContent.correctAnswer),
        itemId,
      ]);
      const createdQuestionId = qRes.rows[0].id;

      // 6. Update ai_generated_items status to APPROVED
      const updateItemSql = `
        UPDATE ai_generated_items
        SET status = 'APPROVED',
            content = $1,
            reviewed_by = $2,
            reviewed_at = CURRENT_TIMESTAMP,
            review_notes = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND organization_id = $5
        RETURNING *;
      `;
      const updatedItemRes = await client.query<AIGeneratedItemRecord>(updateItemSql, [
        JSON.stringify(mcqContent),
        reviewerId,
        reviewNotes || null,
        itemId,
        organizationId,
      ]);

      await client.query('COMMIT');

      return {
        approvedItem: updatedItemRes.rows[0],
        questionId: createdQuestionId,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Find or create AI Tutor Conversation thread for a trainee and course
   */
  async findOrCreateTutorConversation(
    organizationId: string,
    traineeId: string,
    courseId: string
  ): Promise<TutorConversationRecord> {
    const existing = await pool.query<TutorConversationRecord>(
      `SELECT tc.*, c.title as course_title
       FROM ai_tutor_conversations tc
       JOIN courses c ON tc.course_id = c.id
       WHERE tc.organization_id = $1 AND tc.trainee_id = $2 AND tc.course_id = $3;`,
      [organizationId, traineeId, courseId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Get course title for conversation title
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
      traineeId,
      courseId,
      `AI Tutor Thread: ${courseTitle}`,
    ]);

    return { ...inserted.rows[0], course_title: courseTitle };
  }

  /**
   * Find conversation thread by ID strictly scoped to organization and trainee
   */
  async findConversationById(
    conversationId: string,
    organizationId: string,
    traineeId: string
  ): Promise<TutorConversationRecord | null> {
    const query = `
      SELECT tc.*, c.title as course_title
      FROM ai_tutor_conversations tc
      JOIN courses c ON tc.course_id = c.id
      WHERE tc.id = $1 AND tc.organization_id = $2 AND tc.trainee_id = $3;
    `;
    const result = await pool.query<TutorConversationRecord>(query, [
      conversationId,
      organizationId,
      traineeId,
    ]);
    return result.rows[0] || null;
  }

  /**
   * List conversations for trainee
   */
  async listTraineeConversations(
    organizationId: string,
    traineeId: string
  ): Promise<TutorConversationRecord[]> {
    const query = `
      SELECT tc.*, c.title as course_title
      FROM ai_tutor_conversations tc
      JOIN courses c ON tc.course_id = c.id
      WHERE tc.organization_id = $1 AND tc.trainee_id = $2
      ORDER BY tc.updated_at DESC;
    `;
    const result = await pool.query<TutorConversationRecord>(query, [organizationId, traineeId]);
    return result.rows;
  }

  /**
   * Get chat messages in a conversation thread
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 20
  ): Promise<TutorMessageRecord[]> {
    const query = `
      SELECT *
      FROM ai_tutor_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      LIMIT $2;
    `;
    const result = await pool.query<TutorMessageRecord>(query, [conversationId, limit]);
    return result.rows;
  }

  /**
   * Insert a chat message into a conversation thread
   */
  async createTutorMessage(data: {
    conversationId: string;
    role: ChatRole;
    content: string;
    citations?: Citation[];
  }): Promise<TutorMessageRecord> {
    const query = `
      INSERT INTO ai_tutor_messages (
        conversation_id, role, content, citations
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query<TutorMessageRecord>(query, [
      data.conversationId,
      data.role,
      data.content,
      JSON.stringify(data.citations || []),
    ]);

    // Touch parent conversation updated_at
    await pool.query(
      `UPDATE ai_tutor_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
      [data.conversationId]
    );

    return result.rows[0];
  }
}

export const aiRepository = new AIRepository();
