import { IAIProvider, AIProviderTextOptions, AIProviderStructuredOptions } from '../aiProvider.interface';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '../../config/env';

export class GeminiProvider implements IAIProvider {
  public readonly name = 'Gemini';
  private model: ChatGoogleGenerativeAI | null = null;

  constructor() {
    if (config.ai.geminiApiKey) {
      this.model = new ChatGoogleGenerativeAI({
        apiKey: config.ai.geminiApiKey,
        model: config.ai.geminiModel,
        temperature: config.ai.temperature,
      });
    }
  }

  public isAvailable(): boolean {
    return Boolean(config.ai.geminiApiKey && this.model);
  }

  async generateText(prompt: string, options?: AIProviderTextOptions): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini Provider is not configured. Missing GEMINI_API_KEY.');
    }

    const messages = [];
    if (options?.systemPrompt) {
      messages.push(new SystemMessage(options.systemPrompt));
    }
    messages.push(new HumanMessage(prompt));

    const response = await this.model.invoke(messages);
    return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  }

  async generateStructured<T>(prompt: string, options: AIProviderStructuredOptions<T>): Promise<T> {
    if (!this.model) {
      throw new Error('Gemini Provider is not configured. Missing GEMINI_API_KEY.');
    }

    const structuredLlm = this.model.withStructuredOutput(options.schema);
    const messages = [];
    if (options.systemPrompt) {
      messages.push(new SystemMessage(options.systemPrompt));
    }
    messages.push(new HumanMessage(prompt));

    const response = await structuredLlm.invoke(messages);
    return response as T;
  }

  async generateChat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: AIProviderTextOptions
  ): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini Provider is not configured. Missing GEMINI_API_KEY.');
    }

    const lcMessages = messages.map((msg) => {
      if (msg.role === 'system') return new SystemMessage(msg.content);
      return new HumanMessage(msg.content);
    });

    const response = await this.model.invoke(lcMessages);
    return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  }

  getModelInfo() {
    return {
      providerName: this.name,
      activeModel: config.ai.geminiModel,
      maxContextTokens: 1000000,
      isConfigured: this.isAvailable(),
    };
  }
}
