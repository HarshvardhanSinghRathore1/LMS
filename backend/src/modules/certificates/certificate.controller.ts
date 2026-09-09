import { Request, Response, NextFunction } from 'express';
import { CertificateService } from './certificate.service';
import { issueCertificateSchema } from './certificate.schemas';
import { ApiError } from '../../utils/apiError';
import { ConflictError, NotFoundError, ForbiddenError } from './certificate.repository';

export class CertificateController {
  constructor(private service: CertificateService = new CertificateService()) {}

  private handleError(error: any): ApiError {
    if (error instanceof ConflictError) {
      return ApiError.conflict(error.message);
    }
    if (error instanceof NotFoundError) {
      return ApiError.notFound(error.message);
    }
    if (error instanceof ForbiddenError) {
      return ApiError.forbidden(error.message);
    }
    return error;
  }

  issueCertificate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');
      const parsed = issueCertificateSchema.parse(req.body);

      const certificate = await this.service.issueCertificateForEnrollment(
        req.user.organizationId,
        req.user.id,
        parsed.enrollmentId
      );

      res.status(201).json({
        success: true,
        data: certificate,
        message: 'Certificate issued successfully',
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  getMyCertificates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');

      const certificates = await this.service.getMyCertificates(
        req.user.organizationId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: certificates,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  getCertificateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');
      const { id } = req.params;

      const certificate = await this.service.getCertificateById(
        id,
        req.user.organizationId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: certificate,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  verifyCertificatePublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { certificateCode } = req.params;

      if (!certificateCode) {
        throw ApiError.badRequest('Certificate code parameter required');
      }

      const result = await this.service.verifyCertificatePublic(certificateCode);

      if (!result.valid) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CERTIFICATE_NOT_FOUND',
            message: 'Certificate code is invalid, unverified, or does not exist',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };
}

export const certificateController = new CertificateController();
