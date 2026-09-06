import { query } from '../../config/database';
import { CourseRecord, CourseModuleRecord, CourseLessonRecord, CourseStatus, DifficultyLevel } from './course.types';
import { CourseQueryInput } from './course.schemas';

export class CourseRepository {
  // 1. Create Course (Strictly bound to organizationId and creatorId)
  async createCourse(data: {
    organizationId: string;
    creatorId: string;
    title: string;
    description: string;
    category: string;
    difficultyLevel: DifficultyLevel;
    metadata?: any;
  }): Promise<CourseRecord> {
    const res = await query(
      `INSERT INTO courses (
        organization_id, creator_id, title, description, category, difficulty_level, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', $7)
      RETURNING *;`,
      [
        data.organizationId,
        data.creatorId,
        data.title,
        data.description,
        data.category,
        data.difficultyLevel,
        JSON.stringify(data.metadata || {}),
      ]
    );
    return res.rows[0];
  }

  // 2. Find Course by ID strictly enforcing organizationId
  async findCourseByIdForOrganization(
    courseId: string,
    organizationId: string
  ): Promise<CourseRecord | null> {
    const res = await query(
      `SELECT c.*, 
              TRIM(CONCAT(u.first_name, ' ', u.last_name)) as creator_name
       FROM courses c
       LEFT JOIN users u ON c.creator_id = u.id
       WHERE c.id = $1 AND c.organization_id = $2;`,
      [courseId, organizationId]
    );
    return res.rows[0] || null;
  }

  // 3. List Courses for Organization (Paginated, Filtered by tenant & role status permissions)
  async listCoursesForOrganization(
    organizationId: string,
    params: CourseQueryInput,
    allowedStatuses?: CourseStatus[]
  ): Promise<{ courses: CourseRecord[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['c.organization_id = $1'];
    const values: any[] = [organizationId];
    let paramIndex = 2;

    // Filter by allowed statuses (e.g. Trainees can strictly see PUBLISHED)
    if (allowedStatuses && allowedStatuses.length > 0) {
      if (params.status && allowedStatuses.includes(params.status)) {
        conditions.push(`c.status = $${paramIndex}`);
        values.push(params.status);
        paramIndex++;
      } else {
        conditions.push(`c.status = ANY($${paramIndex})`);
        values.push(allowedStatuses);
        paramIndex++;
      }
    } else if (params.status) {
      conditions.push(`c.status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }

    if (params.category) {
      conditions.push(`LOWER(c.category) = LOWER($${paramIndex})`);
      values.push(params.category);
      paramIndex++;
    }

    if (params.difficultyLevel) {
      conditions.push(`c.difficulty_level = $${paramIndex}`);
      values.push(params.difficultyLevel);
      paramIndex++;
    }

    if (params.search) {
      conditions.push(`(c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Total Count Query
    const countRes = await query(
      `SELECT COUNT(*)::int as total FROM courses c WHERE ${whereClause};`,
      values
    );
    const total = countRes.rows[0]?.total || 0;

    // Data Query
    const dataQuery = `
      SELECT c.*, 
             TRIM(CONCAT(u.first_name, ' ', u.last_name)) as creator_name,
             (SELECT COUNT(*)::int FROM course_modules cm WHERE cm.course_id = c.id) as modules_count,
             (SELECT COUNT(*)::int FROM course_lessons cl JOIN course_modules cm ON cl.module_id = cm.id WHERE cm.course_id = c.id) as lessons_count,
             COALESCE((SELECT SUM(cl.duration_minutes)::int FROM course_lessons cl JOIN course_modules cm ON cl.module_id = cm.id WHERE cm.course_id = c.id), 0) as total_duration_minutes
      FROM courses c
      LEFT JOIN users u ON c.creator_id = u.id
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const dataRes = await query(dataQuery, [...values, limit, offset]);

    return {
      courses: dataRes.rows,
      total,
      page,
      limit,
    };
  }

  // 4. Update Course for Organization
  async updateCourseForOrganization(
    courseId: string,
    organizationId: string,
    updates: {
      title?: string;
      description?: string;
      category?: string;
      difficultyLevel?: DifficultyLevel;
      metadata?: any;
    }
  ): Promise<CourseRecord | null> {
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [courseId, organizationId];
    let index = 3;

    if (updates.title !== undefined) {
      fields.push(`title = $${index++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${index++}`);
      values.push(updates.description);
    }
    if (updates.category !== undefined) {
      fields.push(`category = $${index++}`);
      values.push(updates.category);
    }
    if (updates.difficultyLevel !== undefined) {
      fields.push(`difficulty_level = $${index++}`);
      values.push(updates.difficultyLevel);
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${index++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    const res = await query(
      `UPDATE courses 
       SET ${fields.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      values
    );

    return res.rows[0] || null;
  }

  // 5. Update Course Status
  async updateCourseStatusForOrganization(
    courseId: string,
    organizationId: string,
    status: CourseStatus
  ): Promise<CourseRecord | null> {
    const res = await query(
      `UPDATE courses
       SET status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      [courseId, organizationId, status]
    );
    return res.rows[0] || null;
  }

  // 6. Delete / Archive Course (Logical archiving)
  async archiveCourseForOrganization(
    courseId: string,
    organizationId: string
  ): Promise<CourseRecord | null> {
    return this.updateCourseStatusForOrganization(courseId, organizationId, 'ARCHIVED');
  }

  // --- MODULE OPERATIONS (Tenant Isolated via Course -> Organization) ---

  async createModuleForCourse(
    courseId: string,
    organizationId: string,
    data: { title: string; description?: string; orderIndex: number }
  ): Promise<CourseModuleRecord> {
    // 1. Verify course ownership first
    const course = await this.findCourseByIdForOrganization(courseId, organizationId);
    if (!course) {
      throw new Error('COURSE_NOT_FOUND');
    }

    const res = await query(
      `INSERT INTO course_modules (course_id, title, description, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [courseId, data.title, data.description || '', data.orderIndex]
    );
    return res.rows[0];
  }

  async findModuleForOrganization(
    moduleId: string,
    organizationId: string
  ): Promise<{ module: CourseModuleRecord; course: CourseRecord } | null> {
    const res = await query(
      `SELECT m.*, c.organization_id, c.id as c_id, c.title as c_title, c.status as c_status
       FROM course_modules m
       JOIN courses c ON m.course_id = c.id
       WHERE m.id = $1 AND c.organization_id = $2;`,
      [moduleId, organizationId]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const module: CourseModuleRecord = {
      id: row.id,
      course_id: row.course_id,
      title: row.title,
      description: row.description,
      order_index: row.order_index,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
    const course: CourseRecord = {
      id: row.c_id,
      organization_id: row.organization_id,
      creator_id: '',
      title: row.c_title,
      description: '',
      category: '',
      difficulty_level: 'BEGINNER',
      status: row.c_status,
      metadata: {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return { module, course };
  }

  async updateModuleForOrganization(
    moduleId: string,
    organizationId: string,
    updates: { title?: string; description?: string; orderIndex?: number }
  ): Promise<CourseModuleRecord | null> {
    const target = await this.findModuleForOrganization(moduleId, organizationId);
    if (!target) return null;

    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [moduleId];
    let index = 2;

    if (updates.title !== undefined) {
      fields.push(`title = $${index++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${index++}`);
      values.push(updates.description);
    }
    if (updates.orderIndex !== undefined) {
      fields.push(`order_index = $${index++}`);
      values.push(updates.orderIndex);
    }

    const res = await query(
      `UPDATE course_modules SET ${fields.join(', ')} WHERE id = $1 RETURNING *;`,
      values
    );
    return res.rows[0] || null;
  }

  async deleteModuleForOrganization(moduleId: string, organizationId: string): Promise<boolean> {
    const target = await this.findModuleForOrganization(moduleId, organizationId);
    if (!target) return false;

    const res = await query(`DELETE FROM course_modules WHERE id = $1;`, [moduleId]);
    return (res.rowCount ?? 0) > 0;
  }

  // --- LESSON OPERATIONS (Tenant Isolated via Lesson -> Module -> Course -> Organization) ---

  async createLessonForModule(
    moduleId: string,
    organizationId: string,
    data: {
      title: string;
      contentType?: string;
      contentBody?: string;
      videoUrl?: string | null;
      durationMinutes?: number;
      orderIndex: number;
    }
  ): Promise<CourseLessonRecord> {
    const target = await this.findModuleForOrganization(moduleId, organizationId);
    if (!target) {
      throw new Error('MODULE_NOT_FOUND');
    }

    const res = await query(
      `INSERT INTO course_lessons (
        module_id, title, content_type, content_body, video_url, duration_minutes, order_index
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;`,
      [
        moduleId,
        data.title,
        data.contentType || 'TEXT',
        data.contentBody || '',
        data.videoUrl || null,
        data.durationMinutes || 0,
        data.orderIndex,
      ]
    );
    return res.rows[0];
  }

  async findLessonForOrganization(
    lessonId: string,
    organizationId: string
  ): Promise<{ lesson: CourseLessonRecord; module: CourseModuleRecord; course: CourseRecord } | null> {
    const res = await query(
      `SELECT l.*, m.course_id, c.organization_id, c.status as c_status
       FROM course_lessons l
       JOIN course_modules m ON l.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE l.id = $1 AND c.organization_id = $2;`,
      [lessonId, organizationId]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const lesson: CourseLessonRecord = {
      id: row.id,
      module_id: row.module_id,
      title: row.title,
      content_type: row.content_type,
      content_body: row.content_body,
      video_url: row.video_url,
      duration_minutes: row.duration_minutes,
      order_index: row.order_index,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
    const module: CourseModuleRecord = {
      id: row.module_id,
      course_id: row.course_id,
      title: '',
      description: '',
      order_index: 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
    const course: CourseRecord = {
      id: row.course_id,
      organization_id: row.organization_id,
      creator_id: '',
      title: '',
      description: '',
      category: '',
      difficulty_level: 'BEGINNER',
      status: row.c_status,
      metadata: {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return { lesson, module, course };
  }

  async updateLessonForOrganization(
    lessonId: string,
    organizationId: string,
    updates: {
      title?: string;
      contentType?: string;
      contentBody?: string;
      videoUrl?: string | null;
      durationMinutes?: number;
      orderIndex?: number;
    }
  ): Promise<CourseLessonRecord | null> {
    const target = await this.findLessonForOrganization(lessonId, organizationId);
    if (!target) return null;

    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [lessonId];
    let index = 2;

    if (updates.title !== undefined) {
      fields.push(`title = $${index++}`);
      values.push(updates.title);
    }
    if (updates.contentType !== undefined) {
      fields.push(`content_type = $${index++}`);
      values.push(updates.contentType);
    }
    if (updates.contentBody !== undefined) {
      fields.push(`content_body = $${index++}`);
      values.push(updates.contentBody);
    }
    if (updates.videoUrl !== undefined) {
      fields.push(`video_url = $${index++}`);
      values.push(updates.videoUrl);
    }
    if (updates.durationMinutes !== undefined) {
      fields.push(`duration_minutes = $${index++}`);
      values.push(updates.durationMinutes);
    }
    if (updates.orderIndex !== undefined) {
      fields.push(`order_index = $${index++}`);
      values.push(updates.orderIndex);
    }

    const res = await query(
      `UPDATE course_lessons SET ${fields.join(', ')} WHERE id = $1 RETURNING *;`,
      values
    );
    return res.rows[0] || null;
  }

  async deleteLessonForOrganization(lessonId: string, organizationId: string): Promise<boolean> {
    const target = await this.findLessonForOrganization(lessonId, organizationId);
    if (!target) return false;

    const res = await query(`DELETE FROM course_lessons WHERE id = $1;`, [lessonId]);
    return (res.rowCount ?? 0) > 0;
  }

  // --- NESTED HIERARCHY FETCH (Course -> Modules -> Lessons) ---

  async findCourseHierarchyForOrganization(
    courseId: string,
    organizationId: string,
    allowedStatuses?: CourseStatus[]
  ): Promise<CourseRecord | null> {
    const course = await this.findCourseByIdForOrganization(courseId, organizationId);
    if (!course) return null;

    if (allowedStatuses && allowedStatuses.length > 0 && !allowedStatuses.includes(course.status)) {
      return null; // Status restriction (e.g. Trainee cannot fetch DRAFT course hierarchy)
    }

    // Fetch Modules ordered by order_index ASC
    const modulesRes = await query(
      `SELECT * FROM course_modules WHERE course_id = $1 ORDER BY order_index ASC;`,
      [courseId]
    );
    const modules: CourseModuleRecord[] = modulesRes.rows;

    if (modules.length > 0) {
      const moduleIds = modules.map((m) => m.id);
      // Fetch Lessons for all modules ordered by order_index ASC
      const lessonsRes = await query(
        `SELECT * FROM course_lessons WHERE module_id = ANY($1) ORDER BY order_index ASC;`,
        [moduleIds]
      );
      const lessons: CourseLessonRecord[] = lessonsRes.rows;

      // Group lessons by module_id
      const lessonMap = new Map<string, CourseLessonRecord[]>();
      lessons.forEach((l) => {
        if (!lessonMap.has(l.module_id)) lessonMap.set(l.module_id, []);
        lessonMap.get(l.module_id)!.push(l);
      });

      modules.forEach((m) => {
        m.lessons = lessonMap.get(m.id) || [];
      });
    }

    course.modules = modules;
    course.modules_count = modules.length;
    course.lessons_count = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
    course.total_duration_minutes = modules.reduce(
      (acc, m) => acc + (m.lessons?.reduce((lAcc, l) => lAcc + l.duration_minutes, 0) || 0),
      0
    );

    return course;
  }
}

export const courseRepository = new CourseRepository();
