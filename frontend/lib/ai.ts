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
  documentId?: string;
  chunkId: string;
  title: string;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  resourceId?: string;
  sourceType?: 'course_material' | 'video_transcript' | 'course_pdf';
  sourceBadge?: string;
  startTime?: number;
  endTime?: number;
  page?: number;
  similarityScore?: number;
  similarity?: number;
  contentSnippet?: string;
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
  lessonId?: string;
  topic?: string;
  count?: number;
  difficulty?: 'BALANCED' | 'EASY' | 'MEDIUM' | 'HARD';
}

export interface ReviewItemPayload {
  action: 'APPROVE' | 'REJECT';
  targetAssessmentId?: string;
  editedContent?: any;
  reviewNotes?: string;
}

export interface RegenerateMcqPayload {
  feedback?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface UpdateGeneratedItemPayload {
  title?: string;
  content: any;
  reviewNotes?: string;
}

export interface TutorChatPayload {
  courseId?: string;
  lessonId?: string;
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
 * 2b. Regenerate Individual MCQ Item (ADMIN & TRAINER)
 */
export async function regenerateSingleMcqApi(
  id: string,
  payload?: RegenerateMcqPayload
): Promise<AIGeneratedItem> {
  const res = await apiClient.post<ApiSuccessResponse<AIGeneratedItem>>(`/ai/generated-items/${id}/regenerate`, payload || {});
  return res.data.data;
}

/**
 * 2c. Update / Edit Generated Item Content (ADMIN & TRAINER)
 */
export async function updateGeneratedItemApi(
  id: string,
  payload: UpdateGeneratedItemPayload
): Promise<AIGeneratedItem> {
  const res = await apiClient.patch<ApiSuccessResponse<AIGeneratedItem>>(`/ai/generated-items/${id}`, payload);
  return res.data.data;
}

/**
 * 2d. Delete Generated Item from Review Queue (ADMIN & TRAINER)
 */
export async function deleteGeneratedItemApi(
  id: string
): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.delete<ApiSuccessResponse<{ success: boolean; message: string }>>(`/ai/generated-items/${id}`);
  return res.data.data || { success: true, message: 'Item deleted' };
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

/**
 * 7. Fetch Messages for a Specific Tutor Conversation
 */
export async function fetchTutorConversationMessages(
  conversationId: string
): Promise<{ conversation: TutorConversation; messages: Array<{ id: string; role: ChatRole; content: string; citations?: Citation[]; created_at: string }> }> {
  const res = await apiClient.get<ApiSuccessResponse<{ conversation: TutorConversation; messages: Array<{ id: string; role: ChatRole; content: string; citations?: Citation[]; created_at: string }> }>>(
    `/ai/tutor/conversations/${conversationId}`
  );
  return res.data.data;
}

/**
 * 8. Delete a Tutor Conversation
 */
export async function deleteTutorConversation(
  conversationId: string
): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.delete<ApiSuccessResponse<{ success: boolean; message: string }>>(
    `/ai/tutor/conversations/${conversationId}`
  );
  return res.data.data || { success: true, message: 'Conversation deleted' };
}
