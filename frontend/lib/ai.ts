import { apiClient, ApiSuccessResponse } from './api';

export type AIItemType = 'STUDY_NOTES' | 'MCQ';
export type AIItemStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type ChatRole = 'user' | 'assistant';

export interface AIGeneratedItem {
  id: string;
  organization_id: string;
  course_id: string;
  module_id?: string | null;
  creator_id: string;
  item_type: AIItemType;
  title: string;
  content: any;
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

export interface Citation {
  documentId: string;
  chunkId: string;
  title: string;
  courseId?: string;
  similarityScore?: number;
}

export interface TutorConversation {
  id: string;
  organization_id: string;
  trainee_id: string;
  course_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  course_title?: string;
}

export interface TutorChatResponse {
  conversationId: string;
  messageId: string;
  role: ChatRole;
  content: string;
  citations: Citation[];
  provider: string;
}

export interface GenerateNotesPayload {
  courseId: string;
  moduleId?: string;
  topic?: string;
  customPrompt?: string;
}

export interface GenerateMcqsPayload {
  courseId: string;
  moduleId?: string;
  count?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface ReviewItemPayload {
  action: 'APPROVE' | 'REJECT';
  targetAssessmentId?: string;
  editedContent?: any;
  reviewNotes?: string;
}

export interface TutorChatPayload {
  courseId: string;
  conversationId?: string;
  message: string;
}

/**
 * 1. Generate AI Study Notes (ADMIN & TRAINER)
 */
export async function generateAINotes(payload: GenerateNotesPayload): Promise<AIGeneratedItem> {
  const res = await apiClient.post<ApiSuccessResponse<AIGeneratedItem>>('/ai/generate-notes', payload);
  return res.data.data;
}

/**
 * 2. Generate AI MCQs (ADMIN & TRAINER)
 */
export async function generateAIMcqs(payload: GenerateMcqsPayload): Promise<AIGeneratedItem[]> {
  const res = await apiClient.post<ApiSuccessResponse<AIGeneratedItem[]>>('/ai/generate-mcqs', payload);
  return res.data.data;
}

/**
 * 3. List Generated Items for Review Queue (ADMIN & TRAINER)
 */
export async function fetchGeneratedItems(params?: {
  status?: AIItemStatus;
  itemType?: AIItemType;
  courseId?: string;
}): Promise<AIGeneratedItem[]> {
  const res = await apiClient.get<ApiSuccessResponse<AIGeneratedItem[]>>('/ai/generated-items', { params });
  return res.data.data;
}

/**
 * 4. Review & Approve/Reject Generated Item (ADMIN & TRAINER)
 */
export async function reviewGeneratedItem(
  id: string,
  payload: ReviewItemPayload
): Promise<{ item: AIGeneratedItem; importedQuestionId?: string }> {
  const res = await apiClient.post<ApiSuccessResponse<AIGeneratedItem> & { importedQuestionId?: string }>(
    `/ai/generated-items/${id}/review`,
    payload
  );
  return { item: res.data.data, importedQuestionId: res.data.importedQuestionId };
}

/**
 * 5. Send message to Course-Aware AI Tutor
 */
export async function sendTutorMessage(payload: TutorChatPayload): Promise<TutorChatResponse> {
  const res = await apiClient.post<ApiSuccessResponse<TutorChatResponse>>('/ai/tutor/chat', payload);
  return res.data.data;
}

/**
 * 6. Fetch Trainee Tutor Conversations
 */
export async function fetchTutorConversations(): Promise<TutorConversation[]> {
  const res = await apiClient.get<ApiSuccessResponse<TutorConversation[]>>('/ai/tutor/conversations');
  return res.data.data;
}
