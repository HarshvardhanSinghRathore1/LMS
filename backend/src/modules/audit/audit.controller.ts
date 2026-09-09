import { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service';
import { auditQuerySchema, auditExportSchema } from './audit.schemas';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';

export class AuditController {
  async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;

      const parsedQuery = auditQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        throw ApiError.badRequest('Invalid query parameters', 'VALIDATION_ERROR', parsedQuery.error.format());
      }

      const result = await auditService.getAuditLogs(orgId, parsedQuery.data);
      sendSuccess(res, result, { message: 'Audit logs retrieved successfully' });
    } catch (err) {
      next(err);
    }
  }

  async exportAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;

      const parsedQuery = auditExportSchema.safeParse(req.query);
      if (!parsedQuery.success) {
        throw ApiError.badRequest('Invalid export parameters', 'VALIDATION_ERROR', parsedQuery.error.format());
      }

      const { format, ...filters } = parsedQuery.data;
      const exportResult = await auditService.exportAuditLogs(orgId, format, filters);

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.status(200).send(exportResult.data);
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
