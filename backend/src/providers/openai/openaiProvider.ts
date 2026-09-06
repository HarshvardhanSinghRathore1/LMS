import { IAIProvider, AIProviderTextOptions, AIProviderStructuredOptions } from '../aiProvider.interface';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '../../config/env';

export class OpenAIProvider implements IAIProvider {
  public readonly name = 'OpenAI';
  private model: ChatOpenAI | null = null;

  constructor() {
    if (config.ai.openaiApiKey) {
      this.model = new ChatOpenAI({
        openAIApiKey: config.ai.openaiApiKey,
        modelName: config.ai.openaiModel,
        temperature: config.ai.temperature,
        timeout: config.ai.timeoutMs,
      });
    }
  }

  public isAvailable(): boolean {
    return Boolean(config.ai.openaiApiKey && this.model);
  }

  async generateText(prompt: string, options?: AIProviderTextOptions): Promise<string> {
    if (!this.model) {
      throw new Error('OpenAI Provider is not configured. Missing OPENAI_API_KEY.');
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
      throw new Error('OpenAI Provider is not configured. Missing OPENAI_API_KEY.');
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
      throw new Error('OpenAI Provider is not configured. Missing OPENAI_API_KEY.');
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
      activeModel: config.ai.openaiModel,
      maxContextTokens: 128000,
      isConfigured: this.isAvailable(),
    };
  }
}
