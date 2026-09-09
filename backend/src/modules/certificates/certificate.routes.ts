import { Router } from 'express';
import { certificateController } from './certificate.controller';
import { authenticate } from '../../middleware/authenticate';
import { enforceOrganizationContext } from '../../middleware/organizationContext';
import { authorize } from '../../middleware/authorize';

const router = Router();

// --- PUBLIC VERIFICATION ENDPOINT (NO JWT, NO AUTH MIDDLEWARE) ---
router.get('/verify/:certificateCode', certificateController.verifyCertificatePublic);

// --- TRAINEE PROTECTED ENDPOINTS (JWT, TENANT CONTEXT, TRAINEE ROLE) ---
router.post(
  '/issue',
  authenticate,
  enforceOrganizationContext,
  authorize('TRAINEE'),
  certificateController.issueCertificate
);

router.get(
  '/my-certificates',
  authenticate,
  enforceOrganizationContext,
  authorize('TRAINEE'),
  certificateController.getMyCertificates
);

router.get(
  '/:id',
  authenticate,
  enforceOrganizationContext,
  authorize('TRAINEE'),
  certificateController.getCertificateById
);

export default router;
