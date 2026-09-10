import crypto from 'crypto';
import { pool } from '../../config/database';
import {
  CertificateRepository,
  ConflictError,
  NotFoundError,
} from './certificate.repository';
import {
  CertificateRecord,
  CertificateWithDetails,
  PublicCertificateVerificationResponse,
} from './certificate.types';
import { eventDispatcher } from '../../events/eventDispatcher';

export class CertificateService {
  constructor(private repo: CertificateRepository = new CertificateRepository()) {}

  /**
   * PURE HELPER: Calculate SHA-256 verification hash over canonical payload
   * Format: organization_id|enrollment_id|trainee_id|course_id|certificate_code|issued_at
   */
  calculateVerificationHash(
    organizationId: string,
    enrollmentId: string,
    traineeId: string,
    courseId: string,
    certificateCode: string,
    issuedAt: Date | string
  ): string {
    const isoIssuedAt =
      typeof issuedAt === 'string' ? new Date(issuedAt).toISOString() : issuedAt.toISOString();

    const payload = `${organizationId}|${enrollmentId}|${traineeId}|${courseId}|${certificateCode}|${isoIssuedAt}`;
    return crypto.createHash('hsr256').update(payload).digest('hex');
  }

  /**
   * PURE HELPER: Generate human-readable certificate code
   * Format: CERT-CC-YYYY-XXXXX
   */
  generateUniqueCertificateCode(issuedAt: Date = new Date()): string {
    const year = issuedAt.getUTCFullYear();
    const randomSuffix = crypto.randomBytes(4).toString('hex').substring(0, 5).toUpperCase();
    return `CERT-CC-${year}-${randomSuffix}`;
  }

  /**
   * Transactional Certificate Issuance
   */
  async issueCertificateForEnrollment(
    organizationId: string,
    traineeId: string,
    enrollmentId: string
  ): Promise<CertificateRecord> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock enrollment & verify 100% completion criteria
      const { verification, enrollment, courseId } =
        await this.repo.verifyCourseCompletionCriteria(
          client,
          enrollmentId,
          traineeId,
          organizationId
        );

      // 2. Check existing certificate for this enrollment
      const existing = await this.repo.findExistingCertificateByEnrollment(enrollmentId, client);
      if (existing) {
        await client.query('COMMIT');
        return existing;
      }

      if (!verification.eligible) {
        throw new ConflictError(
          `Course completion criteria not satisfied: ${verification.failedCriteria.join('; ')}`
        );
      }

      // 3. Generate unique certificate code
      let certificateCode = this.generateUniqueCertificateCode();
      let attempts = 0;
      while (attempts < 5) {
        const collisionCheck = await client.query(
          `SELECT id FROM certificates WHERE certificate_code = $1`,
          [certificateCode]
        );
        if (collisionCheck.rows.length === 0) break;
        certificateCode = this.generateUniqueCertificateCode();
        attempts++;
      }

      // 4. Capture competency snapshot
      const competencySnapshot = await this.repo.findCompetencySnapshots(
        client,
        traineeId,
        courseId,
        organizationId
      );

      // 5. Calculate SHA-256 hash using NOW() timestamp
      const issuedAt = new Date();
      const verificationHash = this.calculateVerificationHash(
        organizationId,
        enrollmentId,
        traineeId,
        courseId,
        certificateCode,
        issuedAt
      );

      // 6. Insert certificate
      const certificate = await this.repo.insertCertificateTransactional(client, {
        organizationId,
        enrollmentId,
        traineeId,
        courseId,
        certificateCode,
        verificationHash,
        finalScorePercentage: verification.finalScorePercentage,
        competenciesAchieved: competencySnapshot,
        issuedAt,
      });

      // 7. Emit mandatory compliance audit & achievement notification inside same transaction
      await eventDispatcher.dispatchTransactional(
        {
          type: 'CERTIFICATE_ISSUED',
          organizationId,
          actor: { id: traineeId, role: 'TRAINEE' },
          payload: {
            certificateId: certificate.id,
            certificateCode: certificate.certificate_code,
            courseTitle: enrollment.course_title || 'Course',
            courseId,
            traineeId,
            finalScore: verification.finalScorePercentage,
          },
        },
        client
      );

      await client.query('COMMIT');
      return certificate;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * PUBLIC VERIFICATION SERVICE (No JWT required)
   */
  async verifyCertificatePublic(
    certificateCode: string
  ): Promise<PublicCertificateVerificationResponse> {
    if (!certificateCode || !certificateCode.trim()) {
      return { valid: false, certificate: null };
    }

    const cert = await this.repo.findCertificateByCodePublic(certificateCode.trim());
    if (!cert) {
      return { valid: false, certificate: null };
    }

    // Recompute SHA-256 hash to verify data integrity
    const recomputedHash = this.calculateVerificationHash(
      cert.organization_id,
      cert.enrollment_id,
      cert.trainee_id,
      cert.course_id,
      cert.certificate_code,
      cert.issued_at
    );

    const hashMatches =
      crypto.timingSafeEqual(
        Buffer.from(cert.verification_hash, 'utf-8'),
        Buffer.from(recomputedHash, 'utf-8')
      );

    if (!hashMatches) {
      return { valid: false, certificate: null };
    }

    return {
      valid: true,
      certificate: {
        certificateCode: cert.certificate_code,
        traineeName: cert.trainee_name || 'Verified Learner',
        courseTitle: cert.course_title || 'Completed Course',
        organizationName: cert.organization_name || 'Capacity Connect',
        finalScorePercentage: Number(cert.final_score_percentage),
        competenciesAchieved: cert.competencies_achieved,
        issuedAt: new Date(cert.issued_at).toISOString(),
        verificationHash: cert.verification_hash,
      },
    };
  }

  // Trainee Vault Services
  async getMyCertificates(organizationId: string, traineeId: string) {
    return this.repo.findCertificatesByTrainee(organizationId, traineeId);
  }

  async getCertificateById(certificateId: string, organizationId: string, traineeId: string) {
    const cert = await this.repo.findCertificateById(certificateId, organizationId, traineeId);
    if (!cert) {
      throw new NotFoundError('Certificate not found in your vault');
    }
    return cert;
  }
}
