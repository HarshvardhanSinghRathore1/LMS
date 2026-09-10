/**
 * AI Provider Abstraction Contract (Stage 0 Placeholder)
 * 
 * NOT IMPLEMENTED IN STAGE 0.
 * Future implementation will encapsulate OpenAI, Gemini, Hugging Face,
 * and open-source models behind this uniform interface.
 */

export interface AIProviderTextOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIProviderStructuredOptions<T> extends AIProviderTextOptions {
  schema: any;
}

export interface IAIProvider {
  name: string;
  
  /**
   * Generates freeform text response from LLM
   */
  generateText(prompt: string, options?: AIProviderTextOptions): Promise<string>;

  /**
   * Generates validated structured JSON response matching a target schema
   */
  generateStructured<T>(prompt: string, options: AIProviderStructuredOptions<T>): Promise<T>;

  /**
   * Handles multi-turn chat conversations
   */
  generateChat(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>, options?: AIProviderTextOptions): Promise<string>;

  /**
   * Returns metadata about provider capability and current model
   */
  getModelInfo(): { providerName: string; activeModel: string; maxContextTokens: number; isConfigured?: boolean };

  isAvailable?(): boolean;
}
