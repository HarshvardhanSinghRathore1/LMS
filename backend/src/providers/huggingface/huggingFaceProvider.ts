import { IAIProvider, AIProviderTextOptions, AIProviderStructuredOptions } from '../aiProvider.interface';
import { HfInference } from '@huggingface/inference';
import { config } from '../../config/env';

export class HuggingFaceProvider implements IAIProvider {
  public readonly name = 'HuggingFace';
  private client: HfInference | null = null;

  constructor() {
    if (config.ai.hfApiKey) {
      this.client = new HfInference(config.ai.hfApiKey);
    }
  }

  public isAvailable(): boolean {
    return Boolean(config.ai.hfApiKey && this.client);
  }

  async generateText(prompt: string, options?: AIProviderTextOptions): Promise<string> {
    if (!this.client) {
      throw new Error('Hugging Face Provider is not configured. Missing HF_API_KEY.');
    }

    const fullPrompt = options?.systemPrompt
      ? `<|system|>\n${options.systemPrompt}\n<|user|>\n${prompt}\n<|assistant|>`
      : prompt;

    const response = await this.client.textGeneration({
      model: config.ai.hfModel,
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: options?.maxTokens || config.ai.maxTokens || 512,
        temperature: options?.temperature || config.ai.temperature,
      },
    });

    return response.generated_text;
  }

  async generateStructured<T>(prompt: string, options: AIProviderStructuredOptions<T>): Promise<T> {
    const rawText = await this.generateText(
      `${prompt}\nIMPORTANT: Respond with valid JSON matching the schema strictly.`,
      options
    );

    // Extract JSON block if surrounded by markdown code blocks
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/```\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawText;

    return JSON.parse(jsonStr.trim()) as T;
  }

  async generateChat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: AIProviderTextOptions
  ): Promise<string> {
    const formatted = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    return this.generateText(formatted, options);
  }

  getModelInfo() {
    return {
      providerName: this.name,
      activeModel: config.ai.hfModel,
      maxContextTokens: 8192,
      isConfigured: this.isAvailable(),
    };
  }
}
