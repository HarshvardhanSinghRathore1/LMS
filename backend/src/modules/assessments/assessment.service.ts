import { ApiError } from '../../utils/apiError';
import { courseRepository } from '../courses/course.repository';
import { enrollmentRepository } from '../enrollments/enrollment.repository';
import { assessmentRepository } from './assessment.repository';
import {
  AssessmentRecord,
  QuestionRecord,
  SafeQuestionDTO,
  SubmissionRecord,
  OrganizationAssessmentMetrics,
  AssessmentStatus,
} from './assessment.types';
import {
  CreateAssessmentInput,
  UpdateAssessmentInput,
  CreateQuestionInput,
  UpdateQuestionInput,
} from './assessment.schemas';

export class AssessmentService {
  /**
   * Create new assessment (Admin & Trainer)
   */
  async createAssessment(
    organizationId: string,
    creatorId: string,
    input: CreateAssessmentInput
  ): Promise<AssessmentRecord> {
    // 1. Verify course ownership & existence
    const course = await courseRepository.findCourseByIdForOrganization(
      input.courseId,
      organizationId
    );
    if (!course) {
      throw ApiError.notFound('Course not found in your organization');
    }

    // 2. Create assessment
    return assessmentRepository.createAssessment({
      organizationId,
      courseId: input.courseId,
      creatorId,
      title: input.title,
      description: input.description,
      passingScorePercentage: input.passingScorePercentage,
      timeLimitMinutes: input.timeLimitMinutes,
      maxAttempts: input.maxAttempts,
    });
  }

  /**
   * Update assessment details (Admin & Trainer, DRAFT mode)
   */
  async updateAssessment(
    organizationId: string,
    assessmentId: string,
    input: UpdateAssessmentInput
  ): Promise<AssessmentRecord> {
    const assessment = await assessmentRepository.findAssessmentByIdForOrganization(
      assessmentId,
      organizationId
    );
    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    if (assessment.status !== 'DRAFT') {
      throw ApiError.badRequest(
        'Cannot update details of a non-draft assessment',
        'ASSESSMENT_NOT_EDITABLE'
      );
    }

    const updated = await assessmentRepository.updateAssessment(
      assessmentId,
      organizationId,
      input
    );
    if (!updated) {
      throw ApiError.notFound('Failed to update assessment');
    }
    return updated;
  }

  /**
   * Get assessment by ID with role security
   */
  async getAssessmentById(
    organizationId: string,
    userId: string,
    userRole: string,
    assessmentId: string
  ): Promise<{ assessment: AssessmentRecord; questions: (QuestionRecord | SafeQuestionDTO)[] }> {
    const assessment = await assessmentRepository.findAssessmentByIdForOrganization(
      assessmentId,
      organizationId
    );
    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    if (userRole === 'TRAINEE') {
      if (assessment.status !== 'PUBLISHED') {
        throw ApiError.notFound('Assessment not found');
      }

      // Verify trainee course enrollment
      const enrollment = await enrollmentRepository.findEnrollmentByCourseAndTrainee(
        assessment.course_id,
        userId,
        organizationId
      );
      if (!enrollment || enrollment.status === 'DROPPED') {
        throw ApiError.forbidden('Must be enrolled in course to access assessment');
      }

      // Trainees receive questions WITHOUT correct_answer keys!
      const questions = await assessmentRepository.listQuestionsForAssessment(
        assessmentId,
        false
      );
      return { assessment, questions };
    }

    // Admins and Trainers receive full questions with answer keys
    const questions = await assessmentRepository.listQuestionsForAssessment(assessmentId, true);
    return { assessment, questions };
  }

  /**
   * List assessments for organization
   */
  async listAssessments(
    organizationId: string,
    userId: string,
    userRole: string,
    options: { courseId?: string; status?: AssessmentStatus; page: number; limit: number }
  ): Promise<{ assessments: AssessmentRecord[]; total: number }> {
    if (userRole === 'TRAINEE') {
      // Trainees strictly see PUBLISHED assessments for courses they are enrolled in
      options.status = 'PUBLISHED';
    }
    return assessmentRepository.listAssessmentsForOrganization(organizationId, options);
  }

  /**
   * Add question to assessment (DRAFT status only)
   */
  async addQuestion(
    organizationId: string,
    assessmentId: string,
    input: CreateQuestionInput
  ): Promise<QuestionRecord> {
    const assessment = await assessmentRepository.findAssessmentByIdForOrganization(
      assessmentId,
      organizationId
    );
    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    if (assessment.status !== 'DRAFT') {
      throw ApiError.badRequest(
        'Cannot modify questions of a non-draft assessment',
        'ASSESSMENT_NOT_EDITABLE'
      );
    }

    // Validate Question Options & Correct Answer
    if (input.questionType === 'MCQ') {
      const normOptions = input.options.map((o) => String(o).trim().toLowerCase());
      const normCorrect = String(input.correctAnswer).trim().toLowerCase();
      if (!normOptions.includes(normCorrect)) {
        throw ApiError.badRequest(
          'MCQ correct answer must match one of the provided options',
          'INVALID_CORRECT_ANSWER'
        );
      }
    } else if (input.questionType === 'TRUE_FALSE') {
      const normCorrect = String(input.correctAnswer).trim().toLowerCase();
      if (normCorrect !== 'true' && normCorrect !== 'false') {
        throw ApiError.badRequest(
          'True/False correct answer must be true or false',
          'INVALID_CORRECT_ANSWER'
        );
      }
    }

    try {
      return await assessmentRepository.createQuestion({
        assessmentId,
        questionText: input.questionText,
        questionType: input.questionType,
        points: input.points,
        orderIndex: input.orderIndex,
        options: input.options,
        correctAnswer: input.correctAnswer,
      });
    } catch (err: any) {
      if (err.code === '23505') {
        throw ApiError.badRequest('Question order_index must be unique for this assessment', 'DUPLICATE_ORDER_INDEX');
      }
      throw err;
    }
  }

  /**
   * Update question
   */
  async updateQuestion(
    organizationId: string,
    assessmentId: string,
    questionId: string,
    input: UpdateQuestionInput
  ): Promise<QuestionRecord> {
    const assessment = await assessmentRepository.findAssessmentByIdForOrganization(
      assessmentId,
      organizationId
    );
    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    if (assessment.status !== 'DRAFT') {
      throw ApiError.badRequest(
        'Cannot modify questions of a non-draft assessment',
        'ASSESSMENT_NOT_EDITABLE'
      );
    }

    const updated = await assessmentRepository.updateQuestion(questionId, assessmentId, input);
    if (!updated) {
      throw ApiError.notFound('Question not found');
    }
    return updated;
  }

  /**
   * Delete question
   */
  async deleteQuestion(
    organizationId: string,
    assessmentId: string,
    questionId: string
  ): Promise<void> {
    const assessment = await assessmentRepository.findAssessmentByIdForOrganization(
      assessmentId,
      organizationId
    );
    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    if (assessment.status !== 'DRAFT') {
      throw ApiError.badRequest(
        'Cannot delete questions from a non-draft assessment',
        'ASSESSMENT_NOT_EDITABLE'
      );
    }

    const deleted = await assessmentRepository.deleteQuestion(questionId, assessmentId);
    if (!deleted) {
      throw ApiError.notFound('Question not found');
    }
  }

  /**
   * Publish assessment with structural validation
   */
  async publishAssessment(
    organizationId: string,
    assessmentId: string
  ): Promise<AssessmentRecord> {
    const assessment = await assessmentRepository.findAssessmentByIdForOrganization(
      assessmentId,
      organizationId
    );
    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    // Structural Validation before Publishing
    const questions = (await assessmentRepository.listQuestionsForAssessment(
      assessmentId,
      true
    )) as QuestionRecord[];
    if (questions.length === 0) {
      throw ApiError.badRequest(
        'Cannot publish an assessment with zero questions',
        'ASSESSMENT_EMPTY'
      );
    }

    for (const q of questions) {
      if (q.points <= 0) {
        throw ApiError.badRequest(
          `Question '${q.question_text}' must have positive points`,
          'INVALID_QUESTION_POINTS'
        );
      }
    }

    const published = await assessmentRepository.updateAssessmentStatus(
      assessmentId,
      organizationId,
      'PUBLISHED'
    );
    if (!published) {
      throw ApiError.notFound('Failed to publish assessment');
    }
    return published;
  }

  /**
   * Start assessment attempt (Trainees only)
   */
  async startAttempt(
    organizationId: string,
    traineeId: string,
    assessmentId: string
  ): Promise<SubmissionRecord> {
    // 1. Fetch published assessment
    const assessment = await assessmentRepository.findAssessmentByIdForOrganization(
      assessmentId,
      organizationId
    );
    if (!assessment || assessment.status !== 'PUBLISHED') {
      throw ApiError.notFound('Published assessment not found');
    }

    // 2. Verify trainee course enrollment
    const enrollment = await enrollmentRepository.findEnrollmentByCourseAndTrainee(
      assessment.course_id,
      traineeId,
      organizationId
    );
    if (!enrollment || enrollment.status === 'DROPPED') {
      throw ApiError.forbidden(
        'You must be enrolled in the course to take this assessment',
        'ENROLLMENT_REQUIRED'
      );
    }

    // 3. Check for existing active attempt
    const activeAttempt = await assessmentRepository.findActiveAttempt(assessmentId, traineeId);
    if (activeAttempt) {
      throw ApiError.conflict(
        'An assessment attempt is already in progress',
        'ACTIVE_ATTEMPT_EXISTS'
      );
    }

    // 4. Check maximum attempts limit
    const attemptCount = await assessmentRepository.countSubmissionsForTrainee(
      assessmentId,
      traineeId
    );
    if (attemptCount >= assessment.max_attempts) {
      throw ApiError.badRequest(
        `Maximum attempt limit (${assessment.max_attempts}) reached for this assessment`,
        'MAX_ATTEMPTS_EXCEEDED'
      );
    }

    // 5. Calculate timer expiration
    let expiresAt: Date | null = null;
    if (assessment.time_limit_minutes && assessment.time_limit_minutes > 0) {
      expiresAt = new Date(Date.now() + assessment.time_limit_minutes * 60 * 1000);
    }

    // 6. Create attempt
    return assessmentRepository.createAttempt({
      organizationId,
      assessmentId,
      traineeId,
      enrollmentId: enrollment.id,
      attemptNumber: attemptCount + 1,
      expiresAt,
    });
  }

  /**
   * Submit and grade assessment attempt (Trainees only)
   */
  async submitAttempt(
    organizationId: string,
    traineeId: string,
    submissionId: string,
    submittedAnswers: Record<string, any>
  ): Promise<SubmissionRecord> {
    try {
      return await assessmentRepository.submitAndGradeAttempt({
        submissionId,
        traineeId,
        organizationId,
        submittedAnswers,
      });
    } catch (error: any) {
      if (error.message === 'SUBMISSION_NOT_FOUND') {
        throw ApiError.notFound('Assessment attempt submission record not found');
      }
      if (error.message === 'SUBMISSION_ALREADY_COMPLETED') {
        throw ApiError.badRequest(
          'This assessment attempt has already been submitted and graded',
          'ATTEMPT_ALREADY_SUBMITTED'
        );
      }
      if (error.message === 'ATTEMPT_EXPIRED') {
        throw ApiError.badRequest(
          'Time limit expired for this assessment attempt',
          'ATTEMPT_EXPIRED'
        );
      }
      throw error;
    }
  }

  /**
   * Get assessment results (Trainee views own, Admin/Trainer views organization results)
   */
  async getResults(
    organizationId: string,
    userId: string,
    userRole: string,
    assessmentId: string
  ): Promise<SubmissionRecord[]> {
    if (userRole === 'ADMIN' || userRole === 'TRAINER') {
      return assessmentRepository.listSubmissionsForAssessment(assessmentId, organizationId);
    }
    return assessmentRepository.listSubmissionsForTrainee(userId, organizationId, assessmentId);
  }

  /**
   * Get submissions for a trainee
   */
  async getMySubmissions(
    organizationId: string,
    traineeId: string,
    assessmentId?: string
  ): Promise<SubmissionRecord[]> {
    return assessmentRepository.listSubmissionsForTrainee(traineeId, organizationId, assessmentId);
  }

  /**
   * Get organization assessment metrics (Admin & Trainer)
   */
  async getOrganizationMetrics(organizationId: string): Promise<OrganizationAssessmentMetrics> {
    return assessmentRepository.getOrganizationMetrics(organizationId);
  }
}

export const assessmentService = new AssessmentService();
