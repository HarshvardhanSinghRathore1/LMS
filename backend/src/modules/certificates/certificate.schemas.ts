import { z } from 'zod';

export const issueCertificateSchema = z.object({
  enrollmentId: z.string().uuid(),
});

export const verifyCertificateCodeSchema = z.object({
  certificateCode: z.string().trim().regex(/^CERT-CC-\d{4}-[A-Z0-9]{5}$/i, {
    message: 'Certificate code must be in format CERT-CC-YYYY-XXXXX',
  }),
});
