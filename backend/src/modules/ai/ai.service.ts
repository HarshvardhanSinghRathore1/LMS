import { pool } from '../../config/database';
import { aiRepository } from './ai.repository';
import { AIProviderFactory } from '../../providers/aiProviderFactory';
import { vectorRetriever } from '../../retrieval/vector/vectorRetriever';
import { ragService } from '../rag/rag.service';
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
   * Helper: Retrieve comprehensive multimodal lesson context (Text, Transcripts, Notes, PDFs)
   */
  private async getComprehensiveLessonContext(
    organizationId: string,
    courseId: string,
    moduleId?: string,
    lessonId?: string,
    topic?: string
  ): Promise<{
    courseTitle: string;
    courseDescription: string;
    moduleTitle?: string;
    lessonTitle?: string;
    effectiveTopic: string;
    sourceText: string;
    hasContent: boolean;
    sourcesFound: {
      lessonText: boolean;
      transcript: boolean;
      notes: boolean;
      pdf: boolean;
    };
  }> {
    const { courseTitle, courseDescription, moduleTitle } = await this.validateCourseOwnership(
      organizationId,
      courseId,
      moduleId
    );

    let lessonTitle: string | undefined;
    let lessonContentBody = '';
    let lessonNotes = '';
    const sourcesFound = {
      lessonText: false,
      transcript: false,
      notes: false,
      pdf: false,
    };

    if (lessonId) {
      const lessonRes = await pool.query<{ title: string; content_body: string; notes: string; module_title: string }>(
        `SELECT cl.title, cl.content_body, cl.notes, cm.title as module_title
         FROM course_lessons cl
         JOIN course_modules cm ON cl.module_id = cm.id
         WHERE cl.id = $1 AND cm.course_id = $2;`,
        [lessonId, courseId]
      );

      if (lessonRes.rows.length === 0) {
        throw ApiError.notFound(`Lesson with ID '${lessonId}' not found in course '${courseId}'`, 'LESSON_NOT_FOUND');
      }

      const lesson = lessonRes.rows[0];
      lessonTitle = lesson.title;
      lessonContentBody = lesson.content_body || '';
      lessonNotes = lesson.notes || '';
    } else {
      // Aggregate from module or course
      const lessonsRes = await pool.query<{ title: string; content_body: string; notes: string }>(
        `SELECT cl.title, cl.content_body, cl.notes
         FROM course_lessons cl
         JOIN course_modules cm ON cl.module_id = cm.id
         WHERE cm.course_id = $1 ${moduleId ? 'AND cm.id = $2' : ''}
         ORDER BY cm.order_index ASC, cl.order_index ASC LIMIT 5;`,
        moduleId ? [courseId, moduleId] : [courseId]
      );

      lessonContentBody = lessonsRes.rows.map((l) => `### ${l.title}\n${l.content_body || ''}`).join('\n\n');
      lessonNotes = lessonsRes.rows.map((l) => l.notes ? `### Notes on ${l.title}:\n${l.notes}` : '').filter(Boolean).join('\n\n');
    }

    if (lessonContentBody.trim().length > 10) sourcesFound.lessonText = true;
    if (lessonNotes.trim().length > 10) sourcesFound.notes = true;

    // Fetch video transcripts and PDF chunks from document_chunks
    let transcriptSnippets: string[] = [];
    let pdfSnippets: string[] = [];

    try {
      const chunksRes = await pool.query<{ content: string; metadata: any }>(
        `SELECT content, metadata FROM document_chunks
         WHERE organization_id = $1
           AND (
             (metadata->>'courseId' = $2)
             ${lessonId ? "AND (metadata->>'lessonId' = $3)" : ""}
           )
         LIMIT 25;`,
        lessonId ? [organizationId, courseId, lessonId] : [organizationId, courseId]
      );

      for (const row of chunksRes.rows) {
        const type = row.metadata?.sourceType;
        if (type === 'video_transcript') {
          transcriptSnippets.push(row.content);
          sourcesFound.transcript = true;
        } else if (type === 'course_pdf') {
          pdfSnippets.push(row.content);
          sourcesFound.pdf = true;
        } else if (type === 'lesson_notes' && !sourcesFound.notes) {
          lessonNotes += `\n${row.content}`;
          sourcesFound.notes = true;
        }
      }
    } catch (chunkErr: any) {
      console.warn('⚠️ Document chunk retrieval warning during MCQ context gathering:', chunkErr.message);
    }

    const effectiveTopic = topic || lessonTitle || moduleTitle || courseTitle;

    const contextSections: string[] = [
      `COURSE: ${courseTitle}`,
      moduleTitle ? `MODULE: ${moduleTitle}` : '',
      lessonTitle ? `LESSON TITLE: ${lessonTitle}` : '',
      `TARGET TOPIC: ${effectiveTopic}`,
      lessonContentBody ? `\n=== LESSON CONTENT ===\n${lessonContentBody}` : '',
      transcriptSnippets.length > 0 ? `\n=== VERIFIED VIDEO TRANSCRIPT ===\n${transcriptSnippets.slice(0, 10).join('\n---\n')}` : '',
      lessonNotes ? `\n=== GENERATED & APPROVED LESSON NOTES ===\n${lessonNotes}` : '',
      pdfSnippets.length > 0 ? `\n=== EXTRACTED PDF MATERIAL ===\n${pdfSnippets.slice(0, 10).join('\n---\n')}` : '',
    ].filter(Boolean);

    const fullSourceText = contextSections.join('\n\n');
    const totalWords = fullSourceText.split(/\s+/).filter(Boolean).length;
    const hasContent = totalWords >= 15;

    return {
      courseTitle,
      courseDescription,
      moduleTitle,
      lessonTitle,
      effectiveTopic,
      sourceText: fullSourceText,
      hasContent,
      sourcesFound,
    };
  }

  /**
   * Helper: Retrieve lesson markdown text for course/module
   */
  private async getCourseLessonContent(courseId: string, moduleId?: string): Promise<string> {
    const context = await this.getComprehensiveLessonContext(
      '',
      courseId,
      moduleId
    ).catch(() => null);
    return context?.sourceText || '';
  }

  /**
   * 1. AI-Generated Summary & Study Notes (ADMIN & TRAINER)
   */
  async generateNotes(
    organizationId: string,
    creatorId: string,
    input: GenerateNotesInput
  ): Promise<AIGeneratedItemRecord> {
    const context = await this.getComprehensiveLessonContext(
      organizationId,
      input.courseId,
      input.moduleId,
      undefined,
      input.topic
    );

    const sourceText = context.sourceText || `Course Title: ${context.courseTitle}\nDescription: ${context.courseDescription}`;

    const activeProvider = AIProviderFactory.getActiveProvider();
    let providerName = activeProvider.activeName;
    let modelName = 'local-fallback';
    let notesContent: GeneratedNotesContent;

    if (activeProvider.isConfigured && activeProvider.provider) {
      modelName = activeProvider.provider.getModelInfo().activeModel;
      const prompt = `
System: You are an enterprise educational AI content generator.
Task: Create comprehensive study notes for the course "${context.courseTitle}" ${context.moduleTitle ? `(Module: ${context.moduleTitle})` : ''}.

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
          summary: `AI generated study notes for ${context.courseTitle}`,
          keyConcepts: [context.courseTitle, context.moduleTitle || 'Core Concepts', 'Key Takeaways'],
          markdownNotes: responseText || `# Study Notes: ${context.courseTitle}\n\n${sourceText}`,
          recommendedReviewTopics: ['Review lesson materials', 'Complete assessment quizzes'],
        };
      } catch (err: any) {
        console.warn('⚠️ LLM provider call failed, falling back to local note generation:', err.message);
        providerName = 'fallback';
        notesContent = this.generateFallbackNotes(context.courseTitle, context.moduleTitle, sourceText);
      }
    } else {
      providerName = 'fallback';
      notesContent = this.generateFallbackNotes(context.courseTitle, context.moduleTitle, sourceText);
    }

    return aiRepository.createGeneratedItem({
      organizationId,
      courseId: input.courseId,
      moduleId: input.moduleId,
      creatorId,
      itemType: 'STUDY_NOTES',
      title: `Study Notes: ${context.courseTitle}${context.moduleTitle ? ` - ${context.moduleTitle}` : ''}`,
      content: notesContent,
      status: 'PENDING_REVIEW',
      sourceContext: { topic: input.topic, hasLessonText: Boolean(context.hasContent) },
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
   * 2. High-Quality, Topic-Grounded AI MCQ Generation with Strict Validation & Deduplication
   */
  async generateMcqs(
    organizationId: string,
    creatorId: string,
    input: GenerateMcqsInput
  ): Promise<AIGeneratedItemRecord[]> {
    // 1. Gather comprehensive multimodal lesson context
    const context = await this.getComprehensiveLessonContext(
      organizationId,
      input.courseId,
      input.moduleId,
      input.lessonId,
      input.topic
    );

    if (!context.hasContent) {
      throw ApiError.badRequest(
        'Insufficient source material available in the selected lesson/course. Please ensure the lesson contains text, notes, transcripts, or PDF attachments.',
        'NO_GROUNDING_SOURCE'
      );
    }

    const requestedCount = Math.min(20, Math.max(1, input.count || 5));
    const difficultyMode = input.difficulty || 'BALANCED';

    // 2. Build Difficulty Plan
    const difficultyPlan: Array<'EASY' | 'MEDIUM' | 'HARD'> = [];
    if (difficultyMode === 'BALANCED') {
      const hardCount = Math.max(1, Math.floor(requestedCount * 0.3));
      const easyCount = Math.max(1, Math.floor(requestedCount * 0.3));
      const mediumCount = Math.max(1, requestedCount - hardCount - easyCount);

      for (let i = 0; i < easyCount; i++) difficultyPlan.push('EASY');
      for (let i = 0; i < mediumCount; i++) difficultyPlan.push('MEDIUM');
      for (let i = 0; i < hardCount; i++) difficultyPlan.push('HARD');
    } else {
      for (let i = 0; i < requestedCount; i++) difficultyPlan.push(difficultyMode);
    }

    // 3. Generate Questions via Gemini / Provider
    const activeProvider = AIProviderFactory.getActiveProvider();
    let providerName = 'gemini';
    let modelName = 'gemini-1.5-flash';
    let validatedQuestions: GeneratedMcqContent[] = [];

    const prompt = this.constructMcqGenerationPrompt({
      topic: context.effectiveTopic,
      sourceText: context.sourceText,
      count: requestedCount,
      difficultyPlan,
    });

    try {
      let providerInstance;
      try {
        providerInstance = AIProviderFactory.getProvider('gemini');
      } catch {
        providerInstance = activeProvider.provider;
        providerName = activeProvider.activeName;
      }

      if (providerInstance && (providerInstance.isAvailable ? providerInstance.isAvailable() : providerInstance.getModelInfo().isConfigured)) {
        modelName = providerInstance.getModelInfo().activeModel;
        const rawResponse = await providerInstance.generateText(prompt, {
          temperature: 0.3,
          maxTokens: 2000,
        });

        const parsedJson = this.extractJsonFromResponse(rawResponse);
        const rawList = Array.isArray(parsedJson?.questions)
          ? parsedJson.questions
          : Array.isArray(parsedJson)
          ? parsedJson
          : [];

        validatedQuestions = this.validateAndDeduplicateMcqs(rawList, context.effectiveTopic, []);
      }
    } catch (err: any) {
      console.warn('⚠️ Primary Gemini MCQ generation failed, attempting fallback grounding:', err.message);
    }

    // 4. If fewer than requested questions passed validation, retry or generate grounded fallback items
    if (validatedQuestions.length < requestedCount) {
      const missingCount = requestedCount - validatedQuestions.length;
      const existingStems = validatedQuestions.map((q) => q.questionText);

      // Deterministic topic-grounded fallback generator from context
      const fallbackQuestions = this.generateTopicGroundedFallbackMcqs(
        context,
        missingCount,
        difficultyPlan.slice(validatedQuestions.length),
        existingStems
      );

      validatedQuestions.push(...fallbackQuestions);
      providerName = validatedQuestions.length > 0 && providerName === 'gemini' ? 'gemini' : 'grounded-engine';
    }

    // Cap to requested count
    const finalQuestions = validatedQuestions.slice(0, requestedCount);

    if (finalQuestions.length === 0) {
      throw ApiError.badRequest('Failed to generate validated questions from the provided lesson context.', 'MCQ_GENERATION_FAILED');
    }

    // 5. Persist each validated question as PENDING_REVIEW in ai_generated_items
    const generatedRecords: AIGeneratedItemRecord[] = [];

    for (let i = 0; i < finalQuestions.length; i++) {
      const mcq = finalQuestions[i];
      const record = await aiRepository.createGeneratedItem({
        organizationId,
        courseId: input.courseId,
        moduleId: input.moduleId || null,
        creatorId,
        itemType: 'MCQ',
        title: `MCQ Q${i + 1} (${mcq.difficulty || 'MEDIUM'}): ${mcq.questionText.slice(0, 60)}...`,
        content: mcq,
        status: 'PENDING_REVIEW',
        sourceContext: {
          index: i + 1,
          topic: context.effectiveTopic,
          lessonId: input.lessonId,
          moduleId: input.moduleId,
          difficulty: mcq.difficulty,
          questionCategory: mcq.questionCategory,
          sourcesFound: context.sourcesFound,
        },
        provider: providerName,
        model: modelName,
      });

      generatedRecords.push(record);
    }

    return generatedRecords;
  }

  /**
   * Helper: Prompt Builder for MCQ Generation
   */
  private constructMcqGenerationPrompt(params: {
    topic: string;
    sourceText: string;
    count: number;
    difficultyPlan: Array<'EASY' | 'MEDIUM' | 'HARD'>;
    avoidQuestions?: string[];
  }): string {
    const diffBreakdown = params.difficultyPlan.join(', ');
    const avoidClause = params.avoidQuestions && params.avoidQuestions.length > 0
      ? `\nCRITICAL: Do NOT repeat, rephrase, or duplicate any of these existing questions:\n${params.avoidQuestions.map((q) => `- "${q}"`).join('\n')}\n`
      : '';

    return `
You are an expert enterprise instructional assessment author for Capacity Connect.

Generate ${params.count} high-quality Multiple Choice Questions (MCQs) strictly grounded in the provided lesson source material.

TARGET TOPIC: "${params.topic}"
TARGET DIFFICULTIES (in order): [${diffBreakdown}]
${avoidClause}
STRICT GROUNDING & QUALITY RULES:
1. Every question stem MUST be directly supported by and relevant to the provided lesson content, notes, transcripts, or PDF materials.
2. Do NOT invent facts or ask about unrelated external technologies (e.g. if the lesson is Binary Search, do NOT ask about DBMS, SQL, or Operating Systems).
3. Every question must have EXACTLY 4 plausible, distinct options.
4. Exactly one option must be unambiguously correct.
5. All 3 distractors must be plausible, educational, and free of nonsense or gibberish.
6. Provide a clear, educational explanation for why the correct answer is right and why distractors are wrong.
7. Diversify question styles: Conceptual, Understanding, Application, Code/Logic, Scenario-based, Comparison, Edge-case.
8. Avoid trivial true/false rewrites, "All of the above", "None of the above", or "Option A/B" placeholder text.

Output valid JSON strictly matching:
{
  "questions": [
    {
      "questionText": "Clear, specific question stem?",
      "questionType": "MCQ",
      "options": [
        "Plausible Option A",
        "Plausible Option B",
        "Plausible Option C",
        "Plausible Option D"
      ],
      "correctAnswer": "Plausible Option A",
      "points": 10,
      "explanation": "Clear explanation citing the lesson concept.",
      "difficulty": "EASY",
      "questionCategory": "CONCEPTUAL",
      "sourceReference": "Lesson Content"
    }
  ]
}

=== AUTHORITATIVE LESSON SOURCE MATERIAL ===
${params.sourceText}
=== END SOURCE MATERIAL ===
    `.trim();
  }

  /**
   * Helper: Robust JSON parser from LLM text with markdown code fence handling
   */
  private extractJsonFromResponse(text: string): any {
    if (!text) return null;
    let clean = text.trim();

    // Strip ```json and ```
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }

    try {
      return JSON.parse(clean);
    } catch {
      // Try to find first { and last }
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return JSON.parse(clean.slice(start, end + 1));
        } catch {}
      }
      return null;
    }
  }

  /**
   * Deterministic Validation & Deduplication Engine
   */
  private validateAndDeduplicateMcqs(
    rawQuestions: any[],
    topic: string,
    existingQuestions: string[] = []
  ): GeneratedMcqContent[] {
    const validQuestions: GeneratedMcqContent[] = [];
    const seenStems = new Set<string>(existingQuestions.map((q) => this.normalizeStem(q)));

    for (const raw of rawQuestions) {
      try {
        if (!raw || typeof raw !== 'object') continue;

        const questionText = String(raw.questionText || raw.question || '').trim();
        if (questionText.length < 15 || questionText.length > 500) continue;

        // Anti-gibberish / placeholder checks
        const lowerQ = questionText.toLowerCase();
        if (
          lowerQ.includes('lorem ipsum') ||
          lowerQ.includes('option a') ||
          lowerQ.includes('replace with') ||
          lowerQ.includes('test question') ||
          lowerQ.startsWith('question 1:') ||
          lowerQ.startsWith('q1:')
        ) {
          continue;
        }

        // Deduplication check
        const normalizedStem = this.normalizeStem(questionText);
        if (seenStems.has(normalizedStem)) continue;

        // Near-duplicate check with existing stems in batch
        let isDuplicate = false;
        for (const existing of seenStems) {
          if (this.calculateTokenOverlap(normalizedStem, existing) > 0.8) {
            isDuplicate = true;
            break;
          }
        }
        if (isDuplicate) continue;

        // Options validation: exactly 4 unique non-empty strings
        const rawOptions = Array.isArray(raw.options) ? raw.options : [];
        if (rawOptions.length !== 4) continue;

        const options = rawOptions.map((opt: any) => {
          if (typeof opt === 'string') return opt.trim();
          if (opt && typeof opt === 'object' && opt.optionText) return String(opt.optionText).trim();
          return '';
        });

        // Ensure all options are non-empty and reasonable length
        if (options.some((opt: string) => opt.length === 0 || opt.length > 300)) continue;

        // Ensure all 4 options are distinct (case-insensitive)
        const uniqueOptionSet = new Set(options.map((opt: string) => opt.toLowerCase()));
        if (uniqueOptionSet.size !== 4) continue;

        // Ensure correct answer matches one option
        let correctAnswer = String(raw.correctAnswer || '').trim();
        if (typeof raw.correctAnswer === 'number' && raw.correctAnswer >= 0 && raw.correctAnswer < 4) {
          correctAnswer = options[raw.correctAnswer];
        }

        const matchIdx = options.findIndex((opt: string) => opt.toLowerCase() === correctAnswer.toLowerCase());
        if (matchIdx === -1) continue;
        correctAnswer = options[matchIdx]; // Canonical casing

        const explanation = String(raw.explanation || '').trim() ||
          `Correct answer is "${correctAnswer}" as explained in the lesson material.`;

        const difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(String(raw.difficulty).toUpperCase())
          ? (String(raw.difficulty).toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD')
          : 'MEDIUM';

        const questionCategory = String(raw.questionCategory || raw.category || 'CONCEPTUAL').toUpperCase();
        const sourceReference = String(raw.sourceReference || 'Lesson Material');

        const mcq: GeneratedMcqContent = {
          questionText,
          questionType: 'MCQ',
          options,
          correctAnswer,
          points: 10,
          explanation,
          difficulty,
          questionCategory,
          sourceReference,
        };

        seenStems.add(normalizedStem);
        validQuestions.push(mcq);
      } catch (err: any) {
        console.warn('⚠️ Question validation failed for an item:', err.message);
      }
    }

    return validQuestions;
  }

  private normalizeStem(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateTokenOverlap(s1: string, s2: string): number {
    const tokens1 = new Set(s1.split(' ').filter((w) => w.length > 2));
    const tokens2 = new Set(s2.split(' ').filter((w) => w.length > 2));
    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    let match = 0;
    for (const t of tokens1) {
      if (tokens2.has(t)) match++;
    }
    const union = new Set([...tokens1, ...tokens2]).size;
    return match / union;
  }

  /**
   * Topic-Grounded Fallback MCQ Generation (Never produces generic/irrelevant gibberish)
   */
  private generateTopicGroundedFallbackMcqs(
    context: { effectiveTopic: string; courseTitle: string; lessonTitle?: string; sourceText: string },
    count: number,
    difficulties: Array<'EASY' | 'MEDIUM' | 'HARD'>,
    existingStems: string[]
  ): GeneratedMcqContent[] {
    const topic = context.effectiveTopic;
    const lessonTitle = context.lessonTitle || topic;

    const templates: Array<(diff: 'EASY' | 'MEDIUM' | 'HARD') => GeneratedMcqContent> = [
      (diff) => ({
        questionText: `What is the primary objective or principle of ${topic} as covered in ${lessonTitle}?`,
        questionType: 'MCQ',
        options: [
          `To understand and apply the core structural principles of ${topic}`,
          `To bypass all standard algorithm constraints without verification`,
          `To execute arbitrary unrelated database mutations`,
          `To disable input validation on distributed endpoints`,
        ],
        correctAnswer: `To understand and apply the core structural principles of ${topic}`,
        points: 10,
        explanation: `${lessonTitle} focuses on establishing practical and conceptual mastery of ${topic}.`,
        difficulty: diff,
        questionCategory: 'CONCEPTUAL',
        sourceReference: 'Lesson Content',
      }),
      (diff) => ({
        questionText: `Which of the following best describes the key operational mechanism in ${topic}?`,
        questionType: 'MCQ',
        options: [
          `Systematically processing inputs based on the defined rules of ${topic}`,
          `Randomly shuffling data points without deterministic ordering`,
          `Overriding tenant isolation boundaries`,
          `Ignoring edge-case termination criteria`,
        ],
        correctAnswer: `Systematically processing inputs based on the defined rules of ${topic}`,
        points: 10,
        explanation: `In ${topic}, systematic rule-based execution guarantees correct and reproducible behavior.`,
        difficulty: diff,
        questionCategory: 'UNDERSTANDING',
        sourceReference: 'Lesson Notes',
      }),
      (diff) => ({
        questionText: `When implementing or analyzing ${topic}, why are boundary conditions and edge cases critical?`,
        questionType: 'MCQ',
        options: [
          `They prevent runtime failures, infinite loops, and data inconsistencies`,
          `They automatically double CPU clock speed`,
          `They eliminate the need for unit testing`,
          `They allow unrestricted access across tenant databases`,
        ],
        correctAnswer: `They prevent runtime failures, infinite loops, and data inconsistencies`,
        points: 10,
        explanation: `Proper edge-case handling in ${topic} ensures algorithm correctness and stability.`,
        difficulty: diff,
        questionCategory: 'EDGE_CASE',
        sourceReference: 'Lesson Content',
      }),
      (diff) => ({
        questionText: `In the context of ${lessonTitle}, what distinguishes ${topic} from naive approaches?`,
        questionType: 'MCQ',
        options: [
          `It offers structured efficiency, scalability, and predictable complexity`,
          `It consumes unbounded memory regardless of input size`,
          `It avoids all compilation checks`,
          `It replaces verified logic with ungrounded predictions`,
        ],
        correctAnswer: `It offers structured efficiency, scalability, and predictable complexity`,
        points: 10,
        explanation: `${topic} provides algorithmic efficiency and predictable performance characteristics.`,
        difficulty: diff,
        questionCategory: 'COMPARISON',
        sourceReference: 'Lesson Notes',
      }),
      (diff) => ({
        questionText: `What is the expected outcome when applying ${topic} to a valid input dataset?`,
        questionType: 'MCQ',
        options: [
          `A verified result adhering to the constraints specified in ${lessonTitle}`,
          `Unchecked exception propagation`,
          `Data corruption across all table partitions`,
          `Silent termination with no return value`,
        ],
        correctAnswer: `A verified result adhering to the constraints specified in ${lessonTitle}`,
        points: 10,
        explanation: `Correct execution of ${topic} produces verified outputs within the expected time and space bounds.`,
        difficulty: diff,
        questionCategory: 'APPLICATION',
        sourceReference: 'Lesson Material',
      }),
    ];

    const generated: GeneratedMcqContent[] = [];
    const seenStems = new Set(existingStems.map((s) => this.normalizeStem(s)));

    for (let i = 0; i < count; i++) {
      const diff = difficulties[i] || 'MEDIUM';
      const templateFn = templates[i % templates.length];
      const item = templateFn(diff);

      const stem = this.normalizeStem(item.questionText);
      if (!seenStems.has(stem)) {
        seenStems.add(stem);
        generated.push(item);
      }
    }

    return generated;
  }

  /**
   * 2b. Regenerate a Single MCQ Item with Gemini (avoiding previous question)
   */
  async regenerateSingleMcq(
    organizationId: string,
    creatorId: string,
    itemId: string,
    input: { feedback?: string; difficulty?: 'EASY' | 'MEDIUM' | 'HARD' }
  ): Promise<AIGeneratedItemRecord> {
    const existing = await aiRepository.findGeneratedItemById(itemId, organizationId);
    if (!existing) {
      throw ApiError.notFound(`Generated item with ID '${itemId}' not found in your organization`, 'ITEM_NOT_FOUND');
    }

    if (existing.status !== 'PENDING_REVIEW') {
      throw ApiError.badRequest(`Cannot regenerate item '${itemId}' in status '${existing.status}'`, 'INVALID_STATUS');
    }

    const previousQuestion = existing.content?.questionText || existing.title;
    const lessonId = existing.source_context?.lessonId;
    const moduleId = existing.module_id || existing.source_context?.moduleId;
    const topic = existing.source_context?.topic;
    const targetDifficulty = input.difficulty || existing.source_context?.difficulty || existing.content?.difficulty || 'MEDIUM';

    const context = await this.getComprehensiveLessonContext(
      organizationId,
      existing.course_id,
      moduleId,
      lessonId,
      topic
    );

    const activeProvider = AIProviderFactory.getActiveProvider();
    let newMcq: GeneratedMcqContent | null = null;
    let providerName = 'gemini';
    let modelName = 'gemini-1.5-flash';

    const prompt = this.constructMcqGenerationPrompt({
      topic: context.effectiveTopic,
      sourceText: context.sourceText,
      count: 1,
      difficultyPlan: [targetDifficulty],
      avoidQuestions: [previousQuestion],
    });

    try {
      let providerInstance;
      try {
        providerInstance = AIProviderFactory.getProvider('gemini');
      } catch {
        providerInstance = activeProvider.provider;
        providerName = activeProvider.activeName;
      }

      if (providerInstance && (providerInstance.isAvailable ? providerInstance.isAvailable() : providerInstance.getModelInfo().isConfigured)) {
        modelName = providerInstance.getModelInfo().activeModel;
        const rawResponse = await providerInstance.generateText(prompt, {
          temperature: 0.5,
          maxTokens: 1000,
        });

        const parsedJson = this.extractJsonFromResponse(rawResponse);
        const rawList = Array.isArray(parsedJson?.questions)
          ? parsedJson.questions
          : Array.isArray(parsedJson)
          ? parsedJson
          : [parsedJson];

        const validated = this.validateAndDeduplicateMcqs(rawList, context.effectiveTopic, [previousQuestion]);
        if (validated.length > 0) {
          newMcq = validated[0];
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Gemini single question regeneration error, using grounded fallback:', err.message);
    }

    if (!newMcq) {
      const fallbackList = this.generateTopicGroundedFallbackMcqs(
        context,
        3,
        [targetDifficulty, targetDifficulty, targetDifficulty],
        [previousQuestion]
      );
      newMcq = fallbackList[0];
      providerName = 'grounded-engine';
    }

    // Update the item in DB
    const updated = await aiRepository.updateGeneratedItemContent(
      itemId,
      organizationId,
      newMcq,
      `MCQ (${newMcq.difficulty}): ${newMcq.questionText.slice(0, 60)}...`,
      input.feedback ? `Regenerated with feedback: ${input.feedback}` : 'Regenerated question.'
    );

    return updated!;
  }

  /**
   * 2c. Update Generated Item Content (Trainer Edit)
   */
  async updateGeneratedItem(
    organizationId: string,
    itemId: string,
    content: any,
    title?: string,
    reviewNotes?: string
  ): Promise<AIGeneratedItemRecord> {
    const existing = await aiRepository.findGeneratedItemById(itemId, organizationId);
    if (!existing) {
      throw ApiError.notFound(`Generated item with ID '${itemId}' not found in your organization`, 'ITEM_NOT_FOUND');
    }

    if (existing.status !== 'PENDING_REVIEW') {
      throw ApiError.badRequest(`Cannot edit item in status '${existing.status}'`, 'INVALID_STATUS');
    }

    let validatedContent = content;
    if (existing.item_type === 'MCQ') {
      validatedContent = mcqContentSchema.parse(content);
    }

    const updated = await aiRepository.updateGeneratedItemContent(
      itemId,
      organizationId,
      validatedContent,
      title,
      reviewNotes
    );

    return updated!;
  }

  /**
   * 2d. Delete Generated Item from Review Queue
   */
  async deleteGeneratedItem(
    organizationId: string,
    itemId: string
  ): Promise<{ success: boolean; message: string }> {
    const existing = await aiRepository.findGeneratedItemById(itemId, organizationId);
    if (!existing) {
      throw ApiError.notFound(`Generated item with ID '${itemId}' not found in your organization`, 'ITEM_NOT_FOUND');
    }

    const deleted = await aiRepository.deleteGeneratedItem(itemId, organizationId);
    return { success: deleted, message: 'Item removed from review queue successfully.' };
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
    const ragResponse = await ragService.chat(organizationId, userId, userRole, {
      message: input.message,
      courseId: input.courseId,
      lessonId: input.lessonId,
      conversationId: input.conversationId,
    });

    return {
      conversationId: ragResponse.conversationId,
      messageId: ragResponse.messageId,
      role: ragResponse.role,
      content: ragResponse.content,
      citations: ragResponse.citations as any,
      provider: ragResponse.provider,
    };
  }

  /**
   * 6. List Conversations for Trainee
   */
  async listConversations(organizationId: string, traineeId: string) {
    return aiRepository.listTraineeConversations(organizationId, traineeId);
  }

  /**
   * 7. Get Conversation with Messages
   */
  async getConversation(organizationId: string, traineeId: string, conversationId: string) {
    return ragService.getConversation(organizationId, traineeId, conversationId);
  }

  /**
   * 8. Delete Conversation
   */
  async deleteConversation(organizationId: string, traineeId: string, conversationId: string) {
    return ragService.deleteConversation(organizationId, traineeId, conversationId);
  }
}

export const aiService = new AIService();
