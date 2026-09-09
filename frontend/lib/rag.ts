import { apiClient } from './api';

export type ContextEntityType =
  | 'STRUGGLE_CONCEPT'
  | 'LEARNING_PREFERENCE'
  | 'TARGET_COMPETENCY'
  | 'PRIOR_KNOWLEDGE';

export interface LearnerContextFact {
  id: string;
  organization_id: string;
  user_id: string;
  entity_type: ContextEntityType;
  fact_text: string;
  confidence_score: number;
  source_event: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearnerContextProfile {
  userId: string;
  totalFacts: number;
  struggles: LearnerContextFact[];
  preferences: LearnerContextFact[];
  competencies: LearnerContextFact[];
  priorKnowledge: LearnerContextFact[];
  allFacts: LearnerContextFact[];
}

export interface RAGCitation {
  chunkId: string;
  documentId?: string;
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  courseTitle?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  title: string;
  similarity: number;
  contentSnippet?: string;
}

export interface RAGChatResponse {
  conversationId: string;
  messageId: string;
  role: 'assistant';
  content: string;
  citations: RAGCitation[];
  provider: string;
  model: string;
  contextUsed: {
    pgvectorChunksCount: number;
    learnerFactsCount: number;
    graphitiAvailable: boolean;
  };
}

export interface ConversationSummary {
  id: string;
  trainee_id: string;
  course_id: string | null;
  course_title?: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: RAGCitation[];
  created_at: string;
}

export interface CourseIndexSummary {
  courseId: string;
  courseTitle: string;
  status: string;
  moduleCount: number;
  lessonCount: number;
  chunkCount: number;
  documentId: string | null;
  lastIndexedAt: string | null;
}

export interface KnowledgeOverviewResponse {
  totalCourses: number;
  totalIndexedCourses: number;
  totalChunks: number;
  courses: CourseIndexSummary[];
}

export interface SemanticSearchResult {
  chunkId: string;
  documentId: string;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  title: string;
  content: string;
  similarityScore: number;
  metadata: any;
}

export const ragApi = {
  // 1. Semantic Search
  async search(params: {
    query: string;
    courseId?: string;
    topK?: number;
    similarityThreshold?: number;
  }): Promise<{ query: string; totalResults: number; results: SemanticSearchResult[] }> {
    const res = await apiClient.post('/rag/search', params);
    return res.data.data;
  },

  // 2. Contextual Chat
  async chat(params: {
    message: string;
    courseId?: string;
    conversationId?: string;
    topK?: number;
  }): Promise<RAGChatResponse> {
    const res = await apiClient.post('/rag/chat', params);
    return res.data.data;
  },

  // 3. Learner Context Profile
  async getContextProfile(userId?: string): Promise<LearnerContextProfile> {
    const res = await apiClient.get('/rag/context', {
      params: userId ? { userId } : {},
    });
    return res.data.data;
  },

  // 4. Add Context Fact
  async createContextFact(data: {
    entityType: ContextEntityType;
    factText: string;
    confidenceScore?: number;
    sourceEvent?: string;
    userId?: string;
  }): Promise<LearnerContextFact> {
    const res = await apiClient.post('/rag/context', data);
    return res.data.data;
  },

  // 5. Deactivate Context Fact
  async deactivateContextFact(factId: string): Promise<LearnerContextFact> {
    const res = await apiClient.patch(`/rag/context/${factId}/deactivate`);
    return res.data.data;
  },

  // 6. List Conversations
  async getConversations(): Promise<ConversationSummary[]> {
    const res = await apiClient.get('/rag/conversations');
    return res.data.data;
  },

  // 7. Get Conversation Messages
  async getConversation(id: string): Promise<{
    conversation: ConversationSummary;
    messages: ConversationMessage[];
  }> {
    const res = await apiClient.get(`/rag/conversations/${id}`);
    return res.data.data;
  },

  // 8. Admin / Trainer Knowledge Indexing
  async indexCourse(courseId: string): Promise<CourseIndexSummary> {
    const res = await apiClient.post(`/rag/index/course/${courseId}`);
    return res.data.data;
  },

  async getCourseIndexStatus(courseId: string): Promise<CourseIndexSummary> {
    const res = await apiClient.get(`/rag/index/course/${courseId}`);
    return res.data.data;
  },

  async getKnowledgeOverview(): Promise<KnowledgeOverviewResponse> {
    const res = await apiClient.get('/rag/index/knowledge-overview');
    return res.data.data;
  },
};
