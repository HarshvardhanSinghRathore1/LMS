export type AIItemType = 'STUDY_NOTES' | 'MCQ';
export type AIItemStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type ChatRole = 'user' | 'assistant';

export interface AIGeneratedItemRecord {
  id: string;
  organization_id: string;
  course_id: string;
  module_id?: string | null;
  creator_id: string;
  item_type: AIItemType;
  title: string;
  content: any; // JSONB
  status: AIItemStatus;
  source_context?: any | null;
  provider: string;
  model: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
  course_title?: string;
  creator_name?: string;
}

export interface GeneratedMcqOption {
  optionText: string;
  isCorrect: boolean;
}

export interface GeneratedMcqContent {
  questionText: string;
  questionType: 'MCQ';
  options: string[] | GeneratedMcqOption[];
  correctAnswer: string;
  points: number;
  explanation?: string;
}

export interface GeneratedNotesContent {
  summary: string;
  keyConcepts: string[];
  markdownNotes: string;
  recommendedReviewTopics?: string[];
}

export interface Citation {
  documentId: string;
  chunkId: string;
  title: string;
  courseId?: string;
  similarityScore?: number;
}

export interface TutorConversationRecord {
  id: string;
  organization_id: string;
  trainee_id: string;
  course_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  course_title?: string;
}

export interface TutorMessageRecord {
  id: string;
  conversation_id: string;
  role: ChatRole;
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface TutorChatResponse {
  conversationId: string;
  messageId: string;
  role: ChatRole;
  content: string;
  citations: Citation[];
  provider: string;
}
