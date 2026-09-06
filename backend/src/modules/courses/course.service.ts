import { courseRepository } from './course.repository';
import { CreateCourseInput, UpdateCourseInput, CreateModuleInput, UpdateModuleInput, CreateLessonInput, UpdateLessonInput, CourseQueryInput } from './course.schemas';
import { CourseStatus } from './course.types';
import { UserRole } from '../auth/auth.types';
import { ApiError } from '../../utils/apiError';
import { query } from '../../config/database';
import { HuggingFaceEmbeddingProvider } from '../../providers/huggingface/huggingFaceEmbeddingProvider';

export class CourseService {
  async createCourse(organizationId: string, creatorId: string, input: CreateCourseInput) {
    return courseRepository.createCourse({
      organizationId,
      creatorId,
      title: input.title,
      description: input.description,
      category: input.category || 'General',
      difficultyLevel: input.difficultyLevel || 'BEGINNER',
      metadata: input.metadata || {},
    });
  }

  async getCourse(courseId: string, organizationId: string, userRole: UserRole) {
    const allowedStatuses: CourseStatus[] = userRole === 'TRAINEE' ? ['PUBLISHED'] : ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

    const course = await courseRepository.findCourseHierarchyForOrganization(courseId, organizationId, allowedStatuses);
    if (!course) {
      throw ApiError.notFound('Course not found or access forbidden', 'COURSE_NOT_FOUND');
    }
    return course;
  }

  async listCourses(organizationId: string, params: CourseQueryInput, userRole: UserRole) {
    const allowedStatuses: CourseStatus[] = userRole === 'TRAINEE' ? ['PUBLISHED'] : ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

    return courseRepository.listCoursesForOrganization(organizationId, params, allowedStatuses);
  }

  async updateCourse(courseId: string, organizationId: string, input: UpdateCourseInput) {
    const updated = await courseRepository.updateCourseForOrganization(courseId, organizationId, input);
    if (!updated) {
      throw ApiError.notFound('Course not found or access forbidden', 'COURSE_NOT_FOUND');
    }
    return updated;
  }

  async archiveCourse(courseId: string, organizationId: string) {
    const archived = await courseRepository.archiveCourseForOrganization(courseId, organizationId);
    if (!archived) {
      throw ApiError.notFound('Course not found or access forbidden', 'COURSE_NOT_FOUND');
    }
    return archived;
  }

  // --- PUBLISHING WORKFLOW & VALIDATION ---

  async publishCourse(courseId: string, organizationId: string) {
    const hierarchy = await courseRepository.findCourseHierarchyForOrganization(courseId, organizationId);
    if (!hierarchy) {
      throw ApiError.notFound('Course not found or access forbidden', 'COURSE_NOT_FOUND');
    }

    // Publish Validation Checks
    if (!hierarchy.title || !hierarchy.description) {
      throw ApiError.badRequest('Course must have a title and description before publishing', 'INVALID_COURSE_STRUCTURE');
    }

    if (!hierarchy.modules || hierarchy.modules.length === 0) {
      throw ApiError.badRequest('Course must contain at least one module before publishing', 'EMPTY_COURSE_MODULES');
    }

    const totalLessons = hierarchy.modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
    if (totalLessons === 0) {
      throw ApiError.badRequest('Course must contain at least one lesson before publishing', 'EMPTY_COURSE_LESSONS');
    }

    // Update status to PUBLISHED
    const published = await courseRepository.updateCourseStatusForOrganization(courseId, organizationId, 'PUBLISHED');
    if (!published) {
      throw ApiError.internal('Failed to update course status to PUBLISHED');
    }

    // RAG Indexing Hook (Non-blocking async trigger)
    this.indexCourseForRag(courseId, organizationId).catch((err) => {
      console.error(`⚠️ RAG Indexing Warning for Course ${courseId}:`, err.message);
    });

    return published;
  }

  // --- MODULE & LESSON OPERATIONS ---

  async createModule(courseId: string, organizationId: string, input: CreateModuleInput) {
    try {
      return await courseRepository.createModuleForCourse(courseId, organizationId, input);
    } catch (err: any) {
      if (err.message === 'COURSE_NOT_FOUND') {
        throw ApiError.notFound('Course not found or access forbidden', 'COURSE_NOT_FOUND');
      }
      if (err.code === '23505') { // Unique constraint violation on (course_id, order_index)
        throw ApiError.conflict(`Module order index ${input.orderIndex} is already occupied`, 'ORDER_INDEX_COLLISION');
      }
      throw err;
    }
  }

  async updateModule(moduleId: string, organizationId: string, input: UpdateModuleInput) {
    try {
      const updated = await courseRepository.updateModuleForOrganization(moduleId, organizationId, input);
      if (!updated) {
        throw ApiError.notFound('Module not found or access forbidden', 'MODULE_NOT_FOUND');
      }
      return updated;
    } catch (err: any) {
      if (err.code === '23505') {
        throw ApiError.conflict(`Module order index is already occupied`, 'ORDER_INDEX_COLLISION');
      }
      throw err;
    }
  }

  async deleteModule(moduleId: string, organizationId: string) {
    const deleted = await courseRepository.deleteModuleForOrganization(moduleId, organizationId);
    if (!deleted) {
      throw ApiError.notFound('Module not found or access forbidden', 'MODULE_NOT_FOUND');
    }
    return true;
  }

  async createLesson(moduleId: string, organizationId: string, input: CreateLessonInput) {
    try {
      return await courseRepository.createLessonForModule(moduleId, organizationId, input);
    } catch (err: any) {
      if (err.message === 'MODULE_NOT_FOUND') {
        throw ApiError.notFound('Module not found or access forbidden', 'MODULE_NOT_FOUND');
      }
      if (err.code === '23505') { // Unique constraint violation on (module_id, order_index)
        throw ApiError.conflict(`Lesson order index ${input.orderIndex} is already occupied`, 'ORDER_INDEX_COLLISION');
      }
      throw err;
    }
  }

  async updateLesson(lessonId: string, organizationId: string, input: UpdateLessonInput) {
    try {
      const updated = await courseRepository.updateLessonForOrganization(lessonId, organizationId, input);
      if (!updated) {
        throw ApiError.notFound('Lesson not found or access forbidden', 'LESSON_NOT_FOUND');
      }
      return updated;
    } catch (err: any) {
      if (err.code === '23505') {
        throw ApiError.conflict(`Lesson order index is already occupied`, 'ORDER_INDEX_COLLISION');
      }
      throw err;
    }
  }

  async deleteLesson(lessonId: string, organizationId: string) {
    const deleted = await courseRepository.deleteLessonForOrganization(lessonId, organizationId);
    if (!deleted) {
      throw ApiError.notFound('Lesson not found or access forbidden', 'LESSON_NOT_FOUND');
    }
    return true;
  }

  // --- RAG INDEXING INTEGRATION (Idempotent 384d Embedding Vector Storage) ---

  async indexCourseForRag(courseId: string, organizationId: string): Promise<boolean> {
    const course = await courseRepository.findCourseHierarchyForOrganization(courseId, organizationId);
    if (!course || course.status !== 'PUBLISHED') return false;

    // Build canonical text document representing full course
    let fullText = `COURSE: ${course.title}\nCategory: ${course.category} | Difficulty: ${course.difficulty_level}\nDescription: ${course.description}\n\n`;

    if (course.modules) {
      course.modules.forEach((mod, mIdx) => {
        fullText += `MODULE ${mIdx + 1}: ${mod.title}\n${mod.description}\n`;
        if (mod.lessons) {
          mod.lessons.forEach((les, lIdx) => {
            fullText += `  LESSON ${lIdx + 1}: ${les.title}\n  Content: ${les.content_body}\n`;
            if (les.video_url) fullText += `  Video Resource: ${les.video_url}\n`;
          });
        }
        fullText += '\n';
      });
    }

    // Idempotent: Remove any existing RAG document record for this course
    const docSourceId = `course:${courseId}`;
    await query(`DELETE FROM documents WHERE organization_id = $1 AND title = $2;`, [organizationId, docSourceId]);

    // Insert Document Record
    const docRes = await query(
      `INSERT INTO documents (organization_id, title, document_type, metadata)
       VALUES ($1, $2, 'course_material', $3)
       RETURNING id;`,
      [
        organizationId,
        docSourceId,
        JSON.stringify({
          courseId,
          courseTitle: course.title,
          category: course.category,
          difficultyLevel: course.difficulty_level,
        }),
      ]
    );

    const documentId = docRes.rows[0].id;

    // Simple chunking into 500-char blocks for vector embedding
    const chunks: string[] = [];
    const chunkSize = 500;
    for (let i = 0; i < fullText.length; i += chunkSize) {
      chunks.push(fullText.substring(i, i + chunkSize));
    }

    try {
      const provider = new HuggingFaceEmbeddingProvider();
      let embeddings: number[][] = [];
      if (provider.isAvailable()) {
        embeddings = await provider.embedDocuments(chunks);
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const emb = embeddings[i] || [];

        // Check if table uses vector type or real[] array fallback
        const isVectorExt = (await query(`SELECT 1 FROM pg_extension WHERE extname = 'vector';`)).rows.length > 0;

        if (isVectorExt && emb.length > 0) {
          const vectorStr = `[${emb.join(',')}]`;
          await query(
            `INSERT INTO document_chunks (document_id, organization_id, content, chunk_index, embedding, metadata)
             VALUES ($1, $2, $3, $4, $5::vector, $6);`,
            [documentId, organizationId, chunkText, i, vectorStr, JSON.stringify({ courseId })]
          );
        } else {
          await query(
            `INSERT INTO document_chunks (document_id, organization_id, content, chunk_index, embedding, metadata)
             VALUES ($1, $2, $3, $4, $5, $6);`,
            [documentId, organizationId, chunkText, i, emb.length > 0 ? emb : null, JSON.stringify({ courseId })]
          );
        }
      }
      console.log(`✅ Successfully RAG-indexed ${chunks.length} chunk(s) for Course ${courseId}`);
      return true;
    } catch (err: any) {
      console.warn(`⚠️ RAG embedding provider unavailable, stored text chunks without vector embeddings:`, err.message);
      for (let i = 0; i < chunks.length; i++) {
        await query(
          `INSERT INTO document_chunks (document_id, organization_id, content, chunk_index, metadata)
           VALUES ($1, $2, $3, $4, $5);`,
          [documentId, organizationId, chunks[i], i, JSON.stringify({ courseId })]
        );
      }
      return false;
    }
  }
}

export const courseService = new CourseService();
