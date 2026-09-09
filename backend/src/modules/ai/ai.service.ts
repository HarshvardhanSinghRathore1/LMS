import { pool } from '../../config/database';
import { aiRepository } from './ai.repository';
import { AIProviderFactory } from '../../providers/aiProviderFactory';
import { vectorRetriever } from '../../retrieval/vector/vectorRetriever';
import { ApiError } from '../../utils/apiError';
import { mcqContentSchema, GenerateNotesInput, GenerateMcqsInput, ReviewItemInput, TutorChatInput, AIQueryInput } from './ai.schemas';
import { AIGeneratedItemRecord, GeneratedMcqContent, GeneratedNotesContent, TutorChatResponse, Citation } from './ai.types';

export class AIService {
  /**
   * Helper: Validate course & module tenant ownership
   */
  private async validateCourseOwnership(
    organizationId: string,
    courseId: string,
    moduleId?: string
  ): Promise<{ courseTitle: string; courseDescription: string; moduleTitle?: string }> {
    const courseRes = await pool.query<{ title: string; description: string }>(
      `SELECT title, description FROM courses WHERE id = $1 AND organization_id = $2;`,
      [courseId, organizationId]
    );

    if (courseRes.rows.length === 0) {
      throw ApiError.notFound(`Course with ID '${courseId}' not found in your organization`, 'COURSE_NOT_FOUND');
    }

    const course = courseRes.rows[0];
    let moduleTitle: string | undefined;

    if (moduleId) {
      const modRes = await pool.query<{ title: string }>(
        `SELECT title FROM course_modules WHERE id = $1 AND course_id = $2;`,
        [moduleId, courseId]
      );
      if (modRes.rows.length === 0) {
        throw ApiError.notFound(
          `Module with ID '${moduleId}' not found in course '${courseId}'`,
          'MODULE_NOT_FOUND'
        );
      }
      moduleTitle = modRes.rows[0].title;
    }

    return { courseTitle: course.title, courseDescription: course.description, moduleTitle };
  }

  /**
   * Helper: Retrieve lesson markdown text for course/module
   */
  private async getCourseLessonContent(courseId: string, moduleId?: string): Promise<string> {
    let sql = `
      SELECT cl.title as lesson_title, cl.content_body, cm.title as module_title
      FROM course_lessons cl
      JOIN course_modules cm ON cl.module_id = cm.id
      WHERE cm.course_id = $1
    `;
    const params: any[] = [courseId];

    if (moduleId) {
      sql += ` AND cm.id = $2`;
      params.push(moduleId);
    }

    sql += ` ORDER BY cm.order_index ASC, cl.order_index ASC LIMIT 10;`;

    const { rows } = await pool.query<{ lesson_title: string; content_body: string; module_title: string }>(sql, params);

    if (rows.length === 0) {
      return '';
    }

    return rows
      .map((r) => `## Module: ${r.module_title}\n### Lesson: ${r.lesson_title}\n${r.content_body || ''}`)
      .join('\n\n');
  }

  /**
   * 1. AI-Generated Summary & Study Notes (ADMIN & TRAINER)
   */
  async generateNotes(
    organizationId: string,
    creatorId: string,
    input: GenerateNotesInput
  ): Promise<AIGeneratedItemRecord> {
    const { courseTitle, courseDescription, moduleTitle } = await this.validateCourseOwnership(
      organizationId,
      input.courseId,
      input.moduleId
    );

    const lessonText = await this.getCourseLessonContent(input.courseId, input.moduleId);
    const sourceText = lessonText || `Course Title: ${courseTitle}\nDescription: ${courseDescription}`;

    const activeProvider = AIProviderFactory.getActiveProvider();
    let providerName = activeProvider.activeName;
    let modelName = 'local-fallback';
    let notesContent: GeneratedNotesContent;

    if (activeProvider.isConfigured && activeProvider.provider) {
      modelName = activeProvider.provider.getModelInfo().activeModel;
      const prompt = `
System: You are an enterprise educational AI content generator.
Task: Create comprehensive study notes for the course "${courseTitle}" ${moduleTitle ? `(Module: ${moduleTitle})` : ''}.

SOURCE MATERIAL:
<<<
${sourceText}
>>>

USER CUSTOM INSTRUCTION: ${input.customPrompt || 'Summarize key concepts clearly.'}

Output Format: Provide a structured summary with key concepts, markdown study notes, and recommended review topics.
      `.trim();

      try {
        const responseText = await activeProvider.provider.generateText(prompt, {
          temperature: 0.3,
          maxTokens: 1000,
        });

        notesContent = {
          summary: `AI generated study notes for ${courseTitle}`,
          keyConcepts: [courseTitle, moduleTitle || 'Core Concepts', 'Key Takeaways'],
          markdownNotes: responseText || `# Study Notes: ${courseTitle}\n\n${sourceText}`,
          recommendedReviewTopics: ['Review lesson materials', 'Complete assessment quizzes'],
        };
      } catch (err: any) {
        console.warn('⚠️ LLM provider call failed, falling back to local note generation:', err.message);
        providerName = 'fallback';
        notesContent = this.generateFallbackNotes(courseTitle, moduleTitle, sourceText);
      }
    } else {
      providerName = 'fallback';
      notesContent = this.generateFallbackNotes(courseTitle, moduleTitle, sourceText);
    }

    return aiRepository.createGeneratedItem({
      organizationId,
      courseId: input.courseId,
      moduleId: input.moduleId,
      creatorId,
      itemType: 'STUDY_NOTES',
      title: `Study Notes: ${courseTitle}${moduleTitle ? ` - ${moduleTitle}` : ''}`,
      content: notesContent,
      status: 'PENDING_REVIEW',
      sourceContext: { topic: input.topic, hasLessonText: Boolean(lessonText) },
      provider: providerName,
      model: modelName,
    });
  }

  private generateFallbackNotes(courseTitle: string, moduleTitle?: string, sourceText?: string): GeneratedNotesContent {
    return {
      summary: `Comprehensive study notes for ${courseTitle}${moduleTitle ? ` (${moduleTitle})` : ''}.`,
      keyConcepts: [
        `${courseTitle} Core Concepts`,
        moduleTitle ? `${moduleTitle} Key Principles` : 'Fundamental Principles',
        'Practical Applications & Best Practices',
      ],
      markdownNotes: `# Study Notes: ${courseTitle}\n\n## Overview\nThis study guide summarizes essential learning objectives for **${courseTitle}**.\n\n### Key Concepts\n- **Foundations**: Core architectural paradigms and principles.\n- **Application**: Operational workflows and scenario resolution.\n\n### Detailed Notes\n${sourceText ? sourceText.slice(0, 500) + '...' : 'Review course modules for full detailed content.'}`,
      recommendedReviewTopics: ['Core Architecture', 'Operational Workflows', 'Assessment Practice'],
    };
  }

  /**
   * 2. AI MCQ Generation with Trainer Review Workflow (ADMIN & TRAINER)
   */
  async generateMcqs(
    organizationId: string,
    creatorId: string,
    input: GenerateMcqsInput
  ): Promise<AIGeneratedItemRecord[]> {
    const { courseTitle, courseDescription, moduleTitle } = await this.validateCourseOwnership(
      organizationId,
      input.courseId,
      input.moduleId
    );

    const lessonText = await this.getCourseLessonContent(input.courseId, input.moduleId);
    const sourceText = lessonText || `Course Title: ${courseTitle}\nDescription: ${courseDescription}`;

    const activeProvider = AIProviderFactory.getActiveProvider();
    let providerName = activeProvider.activeName;
    let modelName = 'local-fallback';
    const generatedRecords: AIGeneratedItemRecord[] = [];

    const requestedCount = input.count || 3;

    for (let i = 1; i <= requestedCount; i++) {
      let mcq: GeneratedMcqContent;

      if (activeProvider.isConfigured && activeProvider.provider) {
        modelName = activeProvider.provider.getModelInfo().activeModel;
        const prompt = `
System: You are an educational test item generator. Generate 1 multiple choice question (MCQ) based strictly on the provided course material.
Difficulty: ${input.difficulty}

COURSE MATERIAL:
<<<
${sourceText}
>>>

Rules:
- Question text must be clear and unambiguous.
- Provide exactly 4 options.
- correctAnswer MUST be an exact string match to one of the 4 options.
- points must be 10.
- Return JSON strictly matching this schema:
{
  "questionText": "string",
  "questionType": "MCQ",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Option A",
  "points": 10,
  "explanation": "string"
}
        `.trim();

        try {
          const rawResult = await activeProvider.provider.generateStructured<GeneratedMcqContent>(prompt, {
            schema: mcqContentSchema,
            temperature: 0.4,
          });

          mcq = mcqContentSchema.parse(rawResult);
        } catch (err: any) {
          console.warn(`⚠️ LLM MCQ generation failed for item #${i}, using deterministic fallback:`, err.message);
          providerName = 'fallback';
          mcq = this.generateFallbackMcq(courseTitle, i, input.difficulty);
        }
      } else {
        providerName = 'fallback';
        mcq = this.generateFallbackMcq(courseTitle, i, input.difficulty);
      }

      // Validate schema via Zod before persisting
      const validatedMcq = mcqContentSchema.parse(mcq);

      const record = await aiRepository.createGeneratedItem({
        organizationId,
        courseId: input.courseId,
        moduleId: input.moduleId,
        creatorId,
        itemType: 'MCQ',
        title: `AI MCQ #${i}: ${courseTitle}`,
        content: validatedMcq,
        status: 'PENDING_REVIEW',
        sourceContext: { index: i, difficulty: input.difficulty },
        provider: providerName,
        model: modelName,
      });

      generatedRecords.push(record);
    }

    return generatedRecords;
  }

  private generateFallbackMcq(courseTitle: string, index: number, difficulty: string): GeneratedMcqContent {
    const questionTemplates = [
      {
        questionText: `Which of the following best describes the core objective of ${courseTitle}?`,
        options: [
          `To establish structured competency and systematic understanding of ${courseTitle}`,
          'To replace existing database tables with unvalidated AI outputs',
          'To bypass authentication and role permissions',
          'None of the above',
        ],
        correctAnswer: `To establish structured competency and systematic understanding of ${courseTitle}`,
        explanation: `${courseTitle} focuses on structured learning objectives and verified competency acquisition.`,
      },
      {
        questionText: `In ${courseTitle}, what is the primary prerequisite for evaluating learner performance?`,
        options: [
          'Completing structured course lessons and participating in published assessments',
          'Submitting empty assessment forms',
          'Bypassing tenant organization boundaries',
          'Generating unreviewed questions',
        ],
        correctAnswer: 'Completing structured course lessons and participating in published assessments',
        explanation: 'Performance evaluation combines lesson progress and assessment scores.',
      },
      {
        questionText: `What security guarantee applies to AI-generated assessment items in Capacity Connect?`,
        options: [
          'They must be reviewed and approved by a Trainer/Admin before entering live assessments',
          'They auto-publish immediately without human review',
          'They override existing PostgreSQL assessment grades',
          'They bypass organization tenant controls',
        ],
        correctAnswer: 'They must be reviewed and approved by a Trainer/Admin before entering live assessments',
        explanation: 'All AI-generated questions enter PENDING_REVIEW status and require human approval.',
      },
    ];

    const template = questionTemplates[(index - 1) % questionTemplates.length];
    return {
      questionText: template.questionText,
      questionType: 'MCQ',
      options: template.options,
      correctAnswer: template.correctAnswer,
      points: 10,
      explanation: template.explanation,
    };
  }

  /**
   * 3. List Generated Items for Review (ADMIN & TRAINER)
   */
  async listGeneratedItems(organizationId: string, options: AIQueryInput) {
    const offset = ((options.page || 1) - 1) * (options.limit || 20);
    return aiRepository.listGeneratedItems(organizationId, {
      status: options.status,
      itemType: options.itemType,
      courseId: options.courseId,
      limit: options.limit,
      offset,
    });
  }

  /**
   * 4. Review & Approve/Reject Generated Item (ADMIN & TRAINER)
   */
  async reviewGeneratedItem(
    organizationId: string,
    reviewerId: string,
    itemId: string,
    input: ReviewItemInput
  ): Promise<{ message: string; item: AIGeneratedItemRecord; importedQuestionId?: string }> {
    const existing = await aiRepository.findGeneratedItemById(itemId, organizationId);
    if (!existing) {
      throw ApiError.notFound(`Generated item with ID '${itemId}' not found in your organization`, 'ITEM_NOT_FOUND');
    }

    if (existing.status !== 'PENDING_REVIEW') {
      throw ApiError.badRequest(`Item '${itemId}' is already in status '${existing.status}'`, 'INVALID_STATUS_TRANSITION');
    }

    if (input.action === 'REJECT') {
      const updated = await aiRepository.updateGeneratedItemStatus(
        itemId,
        organizationId,
        'REJECTED',
        reviewerId,
        input.reviewNotes
      );
      return { message: 'Generated item rejected successfully', item: updated! };
    }

    // APPROVE Action
    if (existing.item_type === 'STUDY_NOTES') {
      const updated = await aiRepository.updateGeneratedItemStatus(
        itemId,
        organizationId,
        'APPROVED',
        reviewerId,
        input.reviewNotes
      );
      return { message: 'Study notes approved successfully', item: updated! };
    }

    // MCQ Item Approval requires targetAssessmentId
    if (!input.targetAssessmentId) {
      throw ApiError.badRequest('Target assessment ID is required to approve and import an MCQ question', 'TARGET_ASSESSMENT_REQUIRED');
    }

    const mcqContent = input.editedContent
      ? mcqContentSchema.parse(input.editedContent)
      : mcqContentSchema.parse(existing.content);

    const { approvedItem, questionId } = await aiRepository.importMcqToAssessmentTransaction(
      itemId,
      input.targetAssessmentId,
      organizationId,
      reviewerId,
      mcqContent,
      input.reviewNotes
    );

    return {
      message: 'MCQ approved and successfully imported into assessment questions',
      item: approvedItem,
      importedQuestionId: questionId,
    };
  }

  /**
   * 5. Course-Aware AI Tutor RAG Chat (TRAINEE, TRAINER, ADMIN)
   */
  async chatWithTutor(
    organizationId: string,
    userRole: string,
    userId: string,
    input: TutorChatInput
  ): Promise<TutorChatResponse> {
    // 1. Verify course ownership & tenant access
    const { courseTitle, courseDescription } = await this.validateCourseOwnership(
      organizationId,
      input.courseId
    );

    // 2. Trainee course enrollment verification
    if (userRole === 'TRAINEE') {
      const enrollRes = await pool.query(
        `SELECT id, status FROM course_enrollments
         WHERE course_id = $1 AND trainee_id = $2 AND organization_id = $3 AND status != 'DROPPED';`,
        [input.courseId, userId, organizationId]
      );
      if (enrollRes.rows.length === 0) {
        throw ApiError.forbidden(
          'Trainee tutor access requires an active course enrollment (ENROLLED or IN_PROGRESS)',
          'ENROLLMENT_REQUIRED'
        );
      }
    }

    // 3. Find or create persistent conversation thread
    const conversation = await aiRepository.findOrCreateTutorConversation(
      organizationId,
      userId,
      input.courseId
    );

    // Persist user prompt message
    await aiRepository.createTutorMessage({
      conversationId: conversation.id,
      role: 'user',
      content: input.message,
    });

    // 4. Scoped RAG Vector Search (organizationId AND courseId filter)
    let retrievedChunks: Awaited<ReturnType<typeof vectorRetriever.search>> = [];
    try {
      retrievedChunks = await vectorRetriever.search(input.message, organizationId, {
        topK: 4,
        similarityThreshold: 0.25,
        courseId: input.courseId,
      });
    } catch (ragErr: any) {
      console.warn('⚠️ RAG vector search failed, proceeding with no context chunks:', ragErr.message);
      retrievedChunks = [];
    }

    // Extract formatted context & citations
    const citations: Citation[] = retrievedChunks.map((chunk) => ({
      documentId: chunk.documentId,
      chunkId: chunk.id,
      title: chunk.metadata?.title || chunk.metadata?.lessonTitle || courseTitle,
      courseId: input.courseId,
      similarityScore: chunk.similarityScore,
    }));

    const contextSnippet = retrievedChunks.map((c) => c.content).join('\n---\n');

    // 5. Construct Grounded Prompt with Prompt Injection Protection
    const activeProvider = AIProviderFactory.getActiveProvider();
    let assistantContent: string;
    let providerName = activeProvider.activeName;

    if (activeProvider.isConfigured && activeProvider.provider) {
      const prompt = `
System: You are Capacity Connect Course AI Tutor for "${courseTitle}".
Grounding Rules:
- Answer using ONLY the supplied course context.
- If the course material does not contain enough information, state clearly that the course material does not provide enough details to answer confidently.
- Do NOT invent facts, assessment scores, or external web links.

<<< COURSE MATERIAL >>>
${contextSnippet || `Course Title: ${courseTitle}\nDescription: ${courseDescription}`}
<<< END COURSE MATERIAL >>>

USER QUESTION: ${input.message}
      `.trim();

      try {
        assistantContent = await activeProvider.provider.generateText(prompt, {
          temperature: 0.2,
          maxTokens: 600,
        });
      } catch (err: any) {
        console.warn('⚠️ LLM Tutor chat call failed, using grounded local fallback:', err.message);
        providerName = 'fallback';
        assistantContent = this.generateFallbackTutorAnswer(input.message, courseTitle, retrievedChunks);
      }
    } else {
      providerName = 'fallback';
      assistantContent = this.generateFallbackTutorAnswer(input.message, courseTitle, retrievedChunks);
    }

    // 6. Persist assistant response & citations
    const assistantMsg = await aiRepository.createTutorMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: assistantContent,
      citations,
    });

    return {
      conversationId: conversation.id,
      messageId: assistantMsg.id,
      role: 'assistant',
      content: assistantContent,
      citations,
      provider: providerName,
    };
  }

  private generateFallbackTutorAnswer(
    query: string,
    courseTitle: string,
    chunks: any[]
  ): string {
    if (chunks.length > 0) {
      const topChunk = chunks[0];
      return `Based on course material for **${courseTitle}**:\n\n${topChunk.content.slice(0, 400)}...\n\n*This answer is grounded directly in retrieved course chunks.*`;
    }

    return `The available course material for **${courseTitle}** does not contain enough explicit information to answer your query about "${query}" confidently. Please consult your course trainer or review published course lessons.`;
  }

  /**
   * 6. List Conversations for Trainee
   */
  async listConversations(organizationId: string, traineeId: string) {
    return aiRepository.listTraineeConversations(organizationId, traineeId);
  }
}

export const aiService = new AIService();
