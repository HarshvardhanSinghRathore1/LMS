import { Router } from 'express';
import { auditController } from './audit.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { enforceOrganizationContext } from '../../middleware/organizationContext';

const router = Router();

// Apply auth, tenant isolation, and ADMIN-only authorization
router.use(authenticate);
router.use(enforceOrganizationContext);
router.use(authorize('ADMIN'));

// GET /api/v1/audit/export
router.get('/export', auditController.exportAuditLogs.bind(auditController));

// GET /api/v1/audit
router.get('/', auditController.listAuditLogs.bind(auditController));

export default router;
