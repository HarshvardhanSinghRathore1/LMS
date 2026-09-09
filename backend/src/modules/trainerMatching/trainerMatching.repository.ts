import { pool } from '../../config/database';
import {
  TrainerProfileRecord,
  TrainerExpertiseRecord,
  SessionRequestRecord,
  TraineeSkillGapRecord,
  ProficiencyLevel,
  SessionStatus,
} from './trainerMatching.types';
import { eventDispatcher } from '../../events/eventDispatcher';

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class TrainerMatchingRepository {
  /**
   * Find positive skill gaps for a trainee in an organization.
   * Gap percentage = MAX(0, target_score_percentage - current_score_percentage)
   * Ordered by gap_percentage DESC, c.code ASC for deterministic tie-breaking.
   */
  async findTraineeSkillGaps(
    organizationId: string,
    traineeId: string
  ): Promise<TraineeSkillGapRecord[]> {
    const query = `
      SELECT 
        tc.competency_id,
        c.code as competency_code,
        c.name as competency_name,
        c.target_score_percentage as target_score,
        tc.current_score_percentage as current_score,
        GREATEST(0, (c.target_score_percentage - tc.current_score_percentage)) as gap_percentage
      FROM trainee_competencies tc
      JOIN competencies c ON tc.competency_id = c.id
      WHERE tc.trainee_id = $1 
        AND tc.organization_id = $2
        AND c.organization_id = $2
        AND (c.target_score_percentage - tc.current_score_percentage) > 0
      ORDER BY gap_percentage DESC, c.code ASC;
    `;
    const result = await pool.query(query, [traineeId, organizationId]);
    return result.rows.map((row) => ({
      competency_id: row.competency_id,
      competency_code: row.competency_code,
      competency_name: row.competency_name,
      target_score: Number(row.target_score),
      current_score: Number(row.current_score),
      gap_percentage: Number(row.gap_percentage),
    }));
  }

  /**
   * Find eligible trainers for matching in an organization.
   * Requires:
   * - organization_id matches
   * - user role = 'TRAINER'
   * - user is_active = true
   * - trainer profile is_available = true
   */
  async findEligibleTrainers(organizationId: string): Promise<TrainerProfileRecord[]> {
    const query = `
      SELECT 
        tp.id,
        tp.organization_id,
        tp.user_id,
        tp.bio,
        tp.headline,
        tp.years_of_experience,
        tp.hourly_capacity,
        tp.average_rating,
        tp.total_reviews,
        tp.is_available,
        tp.created_at,
        tp.updated_at,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM trainer_profiles tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.organization_id = $1
        AND u.organization_id = $1
        AND u.role = 'TRAINER'
        AND u.is_active = true
        AND tp.is_available = true;
    `;
    const result = await pool.query(query, [organizationId]);
    return result.rows.map((r) => ({
      ...r,
      years_of_experience: Number(r.years_of_experience),
      hourly_capacity: Number(r.hourly_capacity),
      average_rating: Number(r.average_rating),
      total_reviews: Number(r.total_reviews),
    }));
  }

  /**
   * Get mapped competency expertise for a set of trainers.
   */
  async findTrainerExpertise(
    trainerIds: string[],
    organizationId: string
  ): Promise<TrainerExpertiseRecord[]> {
    if (trainerIds.length === 0) return [];
    const query = `
      SELECT 
        tce.id,
        tce.organization_id,
        tce.trainer_id,
        tce.competency_id,
        tce.proficiency_level,
        tce.years_experience,
        tce.created_at,
        tce.updated_at,
        c.code as competency_code,
        c.name as competency_name
      FROM trainer_competency_expertise tce
      JOIN competencies c ON tce.competency_id = c.id
      WHERE tce.trainer_id = ANY($1)
        AND tce.organization_id = $2
        AND c.organization_id = $2;
    `;
    const result = await pool.query(query, [trainerIds, organizationId]);
    return result.rows.map((r) => ({
      ...r,
      years_experience: Number(r.years_experience),
    }));
  }

  /**
   * Count active sessions (PENDING + ACCEPTED) per trainer.
   */
  async calculateActiveSessionCapacity(
    trainerIds: string[],
    organizationId: string
  ): Promise<Record<string, number>> {
    if (trainerIds.length === 0) return {};
    const query = `
      SELECT 
        trainer_id,
        COUNT(*)::integer as active_count
      FROM trainer_session_requests
      WHERE trainer_id = ANY($1)
        AND organization_id = $2
        AND status IN ('PENDING', 'ACCEPTED')
      GROUP BY trainer_id;
    `;
    const result = await pool.query(query, [trainerIds, organizationId]);
    const counts: Record<string, number> = {};
    for (const r of result.rows) {
      counts[r.trainer_id] = Number(r.active_count);
    }
    return counts;
  }

  /**
   * Find trainer profile by user_id and organization_id.
   */
  async findTrainerProfileByUser(
    userId: string,
    organizationId: string
  ): Promise<TrainerProfileRecord | null> {
    const query = `
      SELECT 
        tp.id,
        tp.organization_id,
        tp.user_id,
        tp.bio,
        tp.headline,
        tp.years_of_experience,
        tp.hourly_capacity,
        tp.average_rating,
        tp.total_reviews,
        tp.is_available,
        tp.created_at,
        tp.updated_at,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM trainer_profiles tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.user_id = $1
        AND tp.organization_id = $2
        AND u.organization_id = $2;
    `;
    const result = await pool.query(query, [userId, organizationId]);
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      ...r,
      years_of_experience: Number(r.years_of_experience),
      hourly_capacity: Number(r.hourly_capacity),
      average_rating: Number(r.average_rating),
      total_reviews: Number(r.total_reviews),
    };
  }

  /**
   * Find trainer profile by trainer id and organization_id.
   */
  async findTrainerProfileById(
    trainerId: string,
    organizationId: string
  ): Promise<TrainerProfileRecord | null> {
    const query = `
      SELECT 
        tp.id,
        tp.organization_id,
        tp.user_id,
        tp.bio,
        tp.headline,
        tp.years_of_experience,
        tp.hourly_capacity,
        tp.average_rating,
        tp.total_reviews,
        tp.is_available,
        tp.created_at,
        tp.updated_at,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM trainer_profiles tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.id = $1
        AND tp.organization_id = $2
        AND u.organization_id = $2;
    `;
    const result = await pool.query(query, [trainerId, organizationId]);
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      ...r,
      years_of_experience: Number(r.years_of_experience),
      hourly_capacity: Number(r.hourly_capacity),
      average_rating: Number(r.average_rating),
      total_reviews: Number(r.total_reviews),
    };
  }

  /**
   * Create a new trainer profile. User MUST have role = 'TRAINER' and be active.
   */
  async createTrainerProfile(
    userId: string,
    organizationId: string,
    data: {
      headline?: string | null;
      bio?: string | null;
      yearsOfExperience?: number;
      hourlyCapacity?: number;
      isAvailable?: boolean;
    }
  ): Promise<TrainerProfileRecord> {
    // Verify user role
    const userQuery = `SELECT id, role, is_active, organization_id FROM users WHERE id = $1 AND organization_id = $2`;
    const userRes = await pool.query(userQuery, [userId, organizationId]);
    if (userRes.rows.length === 0) {
      throw new NotFoundError('User not found in organization');
    }
    const user = userRes.rows[0];
    if (user.role !== 'TRAINER') {
      throw new ForbiddenError('Only users with TRAINER role can create a trainer profile');
    }
    if (!user.is_active) {
      throw new ForbiddenError('User is not active');
    }

    const insertQuery = `
      INSERT INTO trainer_profiles (
        organization_id,
        user_id,
        headline,
        bio,
        years_of_experience,
        hourly_capacity,
        is_available,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      organizationId,
      userId,
      data.headline || null,
      data.bio || null,
      data.yearsOfExperience ?? 0,
      data.hourlyCapacity ?? 10,
      data.isAvailable ?? true,
    ];
    const result = await pool.query(insertQuery, values);
    const r = result.rows[0];
    return {
      ...r,
      years_of_experience: Number(r.years_of_experience),
      hourly_capacity: Number(r.hourly_capacity),
      average_rating: Number(r.average_rating),
      total_reviews: Number(r.total_reviews),
    };
  }

  /**
   * Update trainer profile.
   */
  async updateTrainerProfile(
    trainerId: string,
    organizationId: string,
    data: {
      headline?: string | null;
      bio?: string | null;
      yearsOfExperience?: number;
      hourlyCapacity?: number;
      isAvailable?: boolean;
    }
  ): Promise<TrainerProfileRecord> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.headline !== undefined) {
      fields.push(`headline = $${idx++}`);
      values.push(data.headline);
    }
    if (data.bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(data.bio);
    }
    if (data.yearsOfExperience !== undefined) {
      fields.push(`years_of_experience = $${idx++}`);
      values.push(data.yearsOfExperience);
    }
    if (data.hourlyCapacity !== undefined) {
      fields.push(`hourly_capacity = $${idx++}`);
      values.push(data.hourlyCapacity);
    }
    if (data.isAvailable !== undefined) {
      fields.push(`is_available = $${idx++}`);
      values.push(data.isAvailable);
    }

    if (fields.length === 0) {
      const existing = await this.findTrainerProfileById(trainerId, organizationId);
      if (!existing) throw new NotFoundError('Trainer profile not found');
      return existing;
    }

    fields.push(`updated_at = NOW()`);
    values.push(trainerId, organizationId);

    const query = `
      UPDATE trainer_profiles
      SET ${fields.join(', ')}
      WHERE id = $${idx++} AND organization_id = $${idx++}
      RETURNING *;
    `;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      throw new NotFoundError('Trainer profile not found');
    }
    const r = result.rows[0];
    return {
      ...r,
      years_of_experience: Number(r.years_of_experience),
      hourly_capacity: Number(r.hourly_capacity),
      average_rating: Number(r.average_rating),
      total_reviews: Number(r.total_reviews),
    };
  }

  /**
   * Find expertise list for a single trainer profile.
   */
  async findTrainerExpertiseByTrainer(
    trainerId: string,
    organizationId: string
  ): Promise<TrainerExpertiseRecord[]> {
    const query = `
      SELECT 
        tce.id,
        tce.organization_id,
        tce.trainer_id,
        tce.competency_id,
        tce.proficiency_level,
        tce.years_experience,
        tce.created_at,
        tce.updated_at,
        c.code as competency_code,
        c.name as competency_name
      FROM trainer_competency_expertise tce
      JOIN competencies c ON tce.competency_id = c.id
      WHERE tce.trainer_id = $1
        AND tce.organization_id = $2
        AND c.organization_id = $2;
    `;
    const result = await pool.query(query, [trainerId, organizationId]);
    return result.rows.map((r) => ({
      ...r,
      years_experience: Number(r.years_experience),
    }));
  }

  /**
   * Add expertise to a trainer profile.
   */
  async addTrainerExpertise(
    trainerId: string,
    organizationId: string,
    competencyId: string,
    proficiencyLevel: ProficiencyLevel,
    yearsExperience: number
  ): Promise<TrainerExpertiseRecord> {
    // Verify competency belongs to same organization
    const compQuery = `SELECT id FROM competencies WHERE id = $1 AND organization_id = $2`;
    const compRes = await pool.query(compQuery, [competencyId, organizationId]);
    if (compRes.rows.length === 0) {
      throw new NotFoundError('Competency not found in organisation');
    }

    const insertQuery = `
      INSERT INTO trainer_competency_expertise (
        organization_id,
        trainer_id,
        competency_id,
        proficiency_level,
        years_experience,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *;
    `;
    try {
      const result = await pool.query(insertQuery, [
        organizationId,
        trainerId,
        competencyId,
        proficiencyLevel,
        yearsExperience,
      ]);
      const r = result.rows[0];
      return {
        ...r,
        years_experience: Number(r.years_experience),
      };
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictError('Expertise for this competency already exists for trainer');
      }
      throw err;
    }
  }

  /**
   * Remove expertise mapping for a trainer profile.
   */
  async removeTrainerExpertise(
    trainerId: string,
    competencyId: string,
    organizationId: string
  ): Promise<boolean> {
    const query = `
      DELETE FROM trainer_competency_expertise
      WHERE trainer_id = $1 AND competency_id = $2 AND organization_id = $3;
    `;
    const result = await pool.query(query, [trainerId, competencyId, organizationId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Transactional Session Request Creation with PostgreSQL SELECT FOR UPDATE row locking.
   */
  async createSessionRequestTransactional(
    organizationId: string,
    traineeId: string,
    data: {
      trainerId: string;
      competencyId?: string | null;
      topic: string;
      notes?: string | null;
      requestedSlot?: string | null;
    }
  ): Promise<SessionRequestRecord> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. SELECT trainer_profiles FOR UPDATE
      const trainerLockQuery = `
        SELECT tp.*, u.role as user_role, u.is_active as user_active
        FROM trainer_profiles tp
        JOIN users u ON tp.user_id = u.id
        WHERE tp.id = $1 AND tp.organization_id = $2 AND u.organization_id = $2
        FOR UPDATE OF tp;
      `;
      const trainerRes = await client.query(trainerLockQuery, [data.trainerId, organizationId]);
      if (trainerRes.rows.length === 0) {
        throw new NotFoundError('Trainer profile not found in organization');
      }
      const trainer = trainerRes.rows[0];

      // 2. Verify trainer user constraints
      if (trainer.user_role !== 'TRAINER') {
        throw new ForbiddenError('Target user is not a verified trainer');
      }
      if (!trainer.user_active) {
        throw new ForbiddenError('Trainer user is inactive');
      }
      if (!trainer.is_available) {
        throw new ConflictError('Trainer is currently marked as unavailable');
      }

      // 3. Count active sessions (PENDING + ACCEPTED)
      const countActiveQuery = `
        SELECT COUNT(*)::integer as active_count
        FROM trainer_session_requests
        WHERE trainer_id = $1 AND organization_id = $2 AND status IN ('PENDING', 'ACCEPTED');
      `;
      const activeRes = await client.query(countActiveQuery, [data.trainerId, organizationId]);
      const activeSessions = Number(activeRes.rows[0].active_count);
      const remainingCapacity = Math.max(0, Number(trainer.hourly_capacity) - activeSessions);

      if (remainingCapacity <= 0) {
        throw new ConflictError('Trainer has reached maximum hourly capacity');
      }

      // 4. Verify requested slot double booking if slot provided
      if (data.requestedSlot) {
        const slotConflictQuery = `
          SELECT COUNT(*)::integer as conflict_count
          FROM trainer_session_requests
          WHERE trainer_id = $1 
            AND organization_id = $2 
            AND requested_slot = $3
            AND status IN ('PENDING', 'ACCEPTED');
        `;
        const slotRes = await client.query(slotConflictQuery, [
          data.trainerId,
          organizationId,
          data.requestedSlot,
        ]);
        if (Number(slotRes.rows[0].conflict_count) > 0) {
          throw new ConflictError('Trainer already has an active session request at the requested slot');
        }
      }

      // 5. If competencyId provided, verify competency & trainer expertise
      if (data.competencyId) {
        const expQuery = `
          SELECT id FROM trainer_competency_expertise
          WHERE trainer_id = $1 AND competency_id = $2 AND organization_id = $3;
        `;
        const expRes = await client.query(expQuery, [
          data.trainerId,
          data.competencyId,
          organizationId,
        ]);
        if (expRes.rows.length === 0) {
          throw new ConflictError('Trainer does not possess registered expertise in the specified competency');
        }
      }

      // 6. Insert PENDING session
      const insertQuery = `
        INSERT INTO trainer_session_requests (
          organization_id,
          trainee_id,
          trainer_id,
          competency_id,
          status,
          topic,
          notes,
          requested_slot,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, NOW(), NOW())
        RETURNING *;
      `;
      const insertRes = await client.query(insertQuery, [
        organizationId,
        traineeId,
        data.trainerId,
        data.competencyId || null,
        data.topic,
        data.notes || null,
        data.requestedSlot || null,
      ]);

      const createdSession = insertRes.rows[0];

      // Dispatch session requested event transactional
      await eventDispatcher.dispatchTransactional(
        {
          type: 'TRAINER_SESSION_REQUESTED',
          organizationId,
          actor: { id: traineeId, role: 'TRAINEE' },
          payload: {
            sessionId: createdSession.id,
            trainerId: trainer.user_id,
            traineeId,
            topic: data.topic,
            competencyId: data.competencyId,
          },
        },
        client
      );

      await client.query('COMMIT');
      return createdSession;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Transactional Session Status Update with row locking.
   */
  async updateSessionStatusTransactional(
    sessionId: string,
    organizationId: string,
    actorUserId: string,
    actorRole: 'TRAINER' | 'TRAINEE',
    newStatus: SessionStatus
  ): Promise<SessionRequestRecord> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. SELECT session FOR UPDATE
      const sessionLockQuery = `
        SELECT sr.*, tp.user_id as trainer_user_id
        FROM trainer_session_requests sr
        JOIN trainer_profiles tp ON sr.trainer_id = tp.id
        WHERE sr.id = $1 AND sr.organization_id = $2
        FOR UPDATE OF sr;
      `;
      const sessionRes = await client.query(sessionLockQuery, [sessionId, organizationId]);
      if (sessionRes.rows.length === 0) {
        throw new NotFoundError('Session request not found');
      }
      const session = sessionRes.rows[0];
      const currentStatus: SessionStatus = session.status;

      // 2. Verify actor authorization
      if (actorRole === 'TRAINER') {
        if (session.trainer_user_id !== actorUserId) {
          throw new ForbiddenError('Only the assigned trainer can perform this status action');
        }
      } else if (actorRole === 'TRAINEE') {
        if (session.trainee_id !== actorUserId) {
          throw new ForbiddenError('Only the trainee who created the session request can perform this action');
        }
      }

      // 3. Verify legal state transition
      // Valid transitions:
      // PENDING -> ACCEPTED (trainer), DECLINED (trainer), CANCELLED (trainee)
      // ACCEPTED -> COMPLETED (trainer), CANCELLED (trainee)
      // Terminal states (DECLINED, COMPLETED, CANCELLED) cannot transition.
      if (['DECLINED', 'COMPLETED', 'CANCELLED'].includes(currentStatus)) {
        throw new ConflictError(`Cannot transition session from terminal status ${currentStatus}`);
      }

      let isValidTransition = false;
      if (currentStatus === 'PENDING') {
        if (actorRole === 'TRAINER' && ['ACCEPTED', 'DECLINED'].includes(newStatus)) {
          isValidTransition = true;
        } else if (actorRole === 'TRAINEE' && newStatus === 'CANCELLED') {
          isValidTransition = true;
        }
      } else if (currentStatus === 'ACCEPTED') {
        if (actorRole === 'TRAINER' && newStatus === 'COMPLETED') {
          isValidTransition = true;
        } else if (actorRole === 'TRAINEE' && newStatus === 'CANCELLED') {
          isValidTransition = true;
        }
      }

      if (!isValidTransition) {
        throw new ConflictError(
          `Invalid state transition from ${currentStatus} to ${newStatus} for role ${actorRole}`
        );
      }

      // 4. Perform status update
      const updateQuery = `
        UPDATE trainer_session_requests
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND organization_id = $3
        RETURNING *;
      `;
      const updateRes = await client.query(updateQuery, [newStatus, sessionId, organizationId]);
      const updatedSession = updateRes.rows[0];

      let eventType: any = 'TRAINER_SESSION_ACCEPTED';
      if (newStatus === 'DECLINED') eventType = 'TRAINER_SESSION_DECLINED';
      else if (newStatus === 'COMPLETED') eventType = 'TRAINER_SESSION_COMPLETED';
      else if (newStatus === 'CANCELLED') eventType = 'TRAINER_SESSION_CANCELLED';

      await eventDispatcher.dispatchTransactional(
        {
          type: eventType,
          organizationId,
          actor: { id: actorUserId, role: actorRole },
          payload: {
            sessionId: updatedSession.id,
            trainerId: session.trainer_user_id,
            traineeId: session.trainee_id,
            status: newStatus,
          },
        },
        client
      );

      await client.query('COMMIT');
      return updatedSession;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Find sessions for a trainee.
   */
  async findTraineeSessions(
    organizationId: string,
    traineeId: string
  ): Promise<SessionRequestRecord[]> {
    const query = `
      SELECT 
        sr.id,
        sr.organization_id,
        sr.trainee_id,
        sr.trainer_id,
        sr.competency_id,
        sr.status,
        sr.topic,
        sr.notes,
        sr.requested_slot,
        sr.created_at,
        sr.updated_at,
        CONCAT(u_trainer.first_name, ' ', u_trainer.last_name) as trainer_name,
        CONCAT(u_trainee.first_name, ' ', u_trainee.last_name) as trainee_name,
        c.name as competency_name,
        c.code as competency_code
      FROM trainer_session_requests sr
      JOIN trainer_profiles tp ON sr.trainer_id = tp.id
      JOIN users u_trainer ON tp.user_id = u_trainer.id
      JOIN users u_trainee ON sr.trainee_id = u_trainee.id
      LEFT JOIN competencies c ON sr.competency_id = c.id
      WHERE sr.organization_id = $1 AND sr.trainee_id = $2
      ORDER BY sr.created_at DESC;
    `;
    const result = await pool.query(query, [organizationId, traineeId]);
    return result.rows;
  }

  /**
   * Find sessions for a trainer profile.
   */
  async findTrainerSessions(
    organizationId: string,
    trainerId: string
  ): Promise<SessionRequestRecord[]> {
    const query = `
      SELECT 
        sr.id,
        sr.organization_id,
        sr.trainee_id,
        sr.trainer_id,
        sr.competency_id,
        sr.status,
        sr.topic,
        sr.notes,
        sr.requested_slot,
        sr.created_at,
        sr.updated_at,
        CONCAT(u_trainer.first_name, ' ', u_trainer.last_name) as trainer_name,
        CONCAT(u_trainee.first_name, ' ', u_trainee.last_name) as trainee_name,
        c.name as competency_name,
        c.code as competency_code
      FROM trainer_session_requests sr
      JOIN trainer_profiles tp ON sr.trainer_id = tp.id
      JOIN users u_trainer ON tp.user_id = u_trainer.id
      JOIN users u_trainee ON sr.trainee_id = u_trainee.id
      LEFT JOIN competencies c ON sr.competency_id = c.id
      WHERE sr.organization_id = $1 AND sr.trainer_id = $2
      ORDER BY sr.created_at DESC;
    `;
    const result = await pool.query(query, [organizationId, trainerId]);
    return result.rows;
  }
}
