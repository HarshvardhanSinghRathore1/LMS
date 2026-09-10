import { Router } from 'express';
import { aiController } from './ai.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { enforceOrganizationContext } from '../../middleware/organizationContext';

const router = Router();

// Apply global auth & tenant middleware to all AI routes
router.use(authenticate);
router.use(enforceOrganizationContext);

// 1. Generate AI Study Notes (ADMIN & TRAINER)
router.post(
  '/generate-notes',
  authorize('ADMIN', 'TRAINER'),
  aiController.generateNotes.bind(aiController)
);

// 2. Generate AI MCQs (ADMIN & TRAINER)
router.post(
  '/generate-mcqs',
  authorize('ADMIN', 'TRAINER'),
  aiController.generateMcqs.bind(aiController)
);

// 3. List Generated Items for Review Queue (ADMIN & TRAINER)
router.get(
  '/generated-items',
  authorize('ADMIN', 'TRAINER'),
  aiController.listGeneratedItems.bind(aiController)
);

// 4. Review & Approve/Reject Generated Item (ADMIN & TRAINER)
router.post(
  '/generated-items/:id/review',
  authorize('ADMIN', 'TRAINER'),
  aiController.reviewGeneratedItem.bind(aiController)
);

// 4b. Regenerate Individual MCQ Item (ADMIN & TRAINER)
router.post(
  '/generated-items/:id/regenerate',
  authorize('ADMIN', 'TRAINER'),
  aiController.regenerateSingleMcq.bind(aiController)
);

// 4c. Update/Edit Generated Item (ADMIN & TRAINER)
router.patch(
  '/generated-items/:id',
  authorize('ADMIN', 'TRAINER'),
  aiController.updateGeneratedItem.bind(aiController)
);

// 4d. Delete Generated Item (ADMIN & TRAINER)
router.delete(
  '/generated-items/:id',
  authorize('ADMIN', 'TRAINER'),
  aiController.deleteGeneratedItem.bind(aiController)
);

// 5. Course-Aware AI Tutor RAG Chat (TRAINEE, TRAINER, ADMIN)
router.post(
  '/tutor/chat',
  authorize('TRAINEE', 'TRAINER', 'ADMIN'),
  aiController.chatWithTutor.bind(aiController)
);

// 6. List Tutor Conversations for Trainee (TRAINEE, TRAINER, ADMIN)
router.get(
  '/tutor/conversations',
  authorize('TRAINEE', 'TRAINER', 'ADMIN'),
  aiController.listConversations.bind(aiController)
);

// 7. Get Tutor Conversation Messages (TRAINEE, TRAINER, ADMIN)
router.get(
  '/tutor/conversations/:id',
  authorize('TRAINEE', 'TRAINER', 'ADMIN'),
  aiController.getConversation.bind(aiController)
);

// 8. Delete Tutor Conversation (TRAINEE, TRAINER, ADMIN)
router.delete(
  '/tutor/conversations/:id',
  authorize('TRAINEE', 'TRAINER', 'ADMIN'),
  aiController.deleteConversation.bind(aiController)
);

export default router;
