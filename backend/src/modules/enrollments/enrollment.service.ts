import { ApiError } from '../../utils/apiError';
import { courseRepository } from '../courses/course.repository';
import { enrollmentRepository } from './enrollment.repository';
import {
  CourseEnrollmentRecord,
  CourseEnrollmentWithCourse,
  LessonProgressRecord,
  OrganizationEnrollmentMetrics,
} from './enrollment.types';

export class EnrollmentService {
  /**
   * Enroll trainee in a published course
   */
  async createEnrollment(
    organizationId: string,
    traineeId: string,
    courseId: string
  ): Promise<CourseEnrollmentRecord> {
    // 1. Fetch course within organization
    const course = await courseRepository.findCourseByIdForOrganization(courseId, organizationId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // 2. Validate course publication status
    if (course.status !== 'PUBLISHED') {
      throw ApiError.badRequest(
        'Cannot enroll in a course that is not published',
        'COURSE_NOT_PUBLISHED'
      );
    }

    // 3. Check duplicate enrollment
    const existing = await enrollmentRepository.findEnrollmentByCourseAndTrainee(
      courseId,
      traineeId,
      organizationId
    );
    if (existing) {
      throw ApiError.conflict('Already enrolled in this course', 'DUPLICATE_ENROLLMENT');
    }

    // 4. Count total lessons
    const totalLessonsCount = await enrollmentRepository.countTotalLessonsForCourse(courseId);

    // 5. Create enrollment
    return enrollmentRepository.createEnrollment({
      organizationId,
      courseId,
      traineeId,
      totalLessonsCount,
    });
  }

  /**
   * List current trainee's enrollments
   */
  async listMyEnrollments(
    organizationId: string,
    traineeId: string,
    options: { status?: string; page: number; limit: number }
  ): Promise<{ enrollments: CourseEnrollmentWithCourse[]; total: number }> {
    return enrollmentRepository.listEnrollmentsForTrainee(traineeId, organizationId, options);
  }

  /**
   * Get enrollment details by ID with role authorization
   */
  async getEnrollmentById(
    organizationId: string,
    userId: string,
    userRole: string,
    enrollmentId: string
  ): Promise<{
    enrollment: CourseEnrollmentWithCourse;
    lessonProgress: LessonProgressRecord[];
  }> {
    let enrollment: CourseEnrollmentWithCourse | null = null;

    if (userRole === 'TRAINEE') {
      enrollment = await enrollmentRepository.findEnrollmentByIdForTrainee(
        enrollmentId,
        userId,
        organizationId
      );
    } else {
      enrollment = await enrollmentRepository.findEnrollmentByIdForOrganization(
        enrollmentId,
        organizationId
      );
    }

    if (!enrollment) {
      throw ApiError.notFound('Enrollment record not found');
    }

    const lessonProgress = await enrollmentRepository.getLessonProgressForEnrollment(
      enrollment.id,
      enrollment.trainee_id
    );

    return { enrollment, lessonProgress };
  }

  /**
   * Mark lesson completed or incomplete with automatic progress recalculation
   */
  async updateLessonProgress(
    organizationId: string,
    traineeId: string,
    enrollmentId: string,
    lessonId: string,
    completed: boolean
  ): Promise<{ enrollment: CourseEnrollmentRecord; lessonProgress: LessonProgressRecord }> {
    try {
      return await enrollmentRepository.updateLessonProgressAndRecalculate({
        enrollmentId,
        lessonId,
        traineeId,
        organizationId,
        completed,
      });
    } catch (error: any) {
      if (error.message === 'ENROLLMENT_NOT_FOUND') {
        throw ApiError.notFound('Enrollment record not found');
      }
      if (error.message === 'ENROLLMENT_DROPPED') {
        throw ApiError.badRequest(
          'Cannot update lesson progress for a dropped enrollment',
          'ENROLLMENT_DROPPED'
        );
      }
      if (error.message === 'LESSON_NOT_IN_COURSE') {
        throw ApiError.badRequest(
          'Lesson does not belong to the enrolled course',
          'LESSON_COURSE_MISMATCH'
        );
      }
      throw error;
    }
  }

  /**
   * Drop enrollment
   */
  async dropEnrollment(
    organizationId: string,
    traineeId: string,
    enrollmentId: string
  ): Promise<CourseEnrollmentRecord> {
    const dropped = await enrollmentRepository.dropEnrollment(
      enrollmentId,
      traineeId,
      organizationId
    );
    if (!dropped) {
      throw ApiError.badRequest(
        'Enrollment not found or cannot be dropped (completed enrollments cannot be dropped)',
        'CANNOT_DROP_ENROLLMENT'
      );
    }
    return dropped;
  }

  /**
   * Get organization enrollment metrics (Admins / Trainers only)
   */
  async getOrganizationMetrics(organizationId: string): Promise<OrganizationEnrollmentMetrics> {
    return enrollmentRepository.getOrganizationMetrics(organizationId);
  }
}

export const enrollmentService = new EnrollmentService();
