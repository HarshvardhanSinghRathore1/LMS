export type ContextEntityType =
  | 'STRUGGLE_CONCEPT'
  | 'LEARNING_PREFERENCE'
  | 'TARGET_COMPETENCY'
  | 'PRIOR_KNOWLEDGE';

export type IndexingStatus = 'INDEXED' | 'PARTIAL' | 'PENDING' | 'FAILED';

export interface LearnerContextFactRecord {
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

export interface DocumentRecord {
  id: string;
  organization_id: string;
  title: string;
  document_type: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunkRecord {
  id: string;
  document_id: string;
  organization_id: string;
  content: string;
  chunk_index: number;
  embedding?: number[] | string;
  metadata: {
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
    courseTitle?: string;
    moduleTitle?: string;
    lessonTitle?: string;
    chunkIndex?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
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
