import { Router } from 'express';
import { ragController } from './rag.controller';
import { authenticate } from '../../middleware/authenticate';
import { enforceOrganizationContext } from '../../middleware/organizationContext';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Apply global authentication and tenant context middleware across all RAG routes
router.use(authenticate);
router.use(enforceOrganizationContext);

// 1. Course Indexing & Knowledge Overview (ADMIN, TRAINER only)
router.post(
  '/index/course/:courseId',
  authorize('ADMIN', 'TRAINER'),
  ragController.indexCourse.bind(ragController)
);

router.get(
  '/index/course/:courseId',
  authorize('ADMIN', 'TRAINER'),
  ragController.getCourseIndexStatus.bind(ragController)
);

router.get(
  '/index/knowledge-overview',
  authorize('ADMIN', 'TRAINER'),
  ragController.listKnowledgeIndex.bind(ragController)
);

// 2. Multi-tenant Semantic Search (All Authenticated Roles)
router.post('/search', ragController.semanticSearch.bind(ragController));

// 3. Grounded Contextual AI Chat (All Authenticated Roles)
router.post('/chat', ragController.chat.bind(ragController));

// 4. Persistent Learner Context Profile & Facts
router.get('/context', ragController.getContextProfile.bind(ragController));
router.post('/context', ragController.createContextFact.bind(ragController));
router.patch('/context/:id/deactivate', ragController.deactivateContextFact.bind(ragController));

// 5. Conversation History
router.get('/conversations', ragController.listConversations.bind(ragController));
router.get('/conversations/:id', ragController.getConversation.bind(ragController));

export const ragRoutes = router;
