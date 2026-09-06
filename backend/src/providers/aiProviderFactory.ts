import { IAIProvider } from './aiProvider.interface';
import { OpenAIProvider } from './openai/openaiProvider';
import { GeminiProvider } from './gemini/geminiProvider';
import { HuggingFaceProvider } from './huggingface/huggingFaceProvider';
import { config } from '../config/env';

export class AIProviderFactory {
  private static providers: Map<string, IAIProvider> = new Map();

  static initialize(): void {
    if (this.providers.size === 0) {
      this.providers.set('openai', new OpenAIProvider());
      this.providers.set('gemini', new GeminiProvider());
      this.providers.set('huggingface', new HuggingFaceProvider());
    }
  }

  static getProvider(name?: string): IAIProvider {
    this.initialize();
    const targetName = (name || config.ai.provider).toLowerCase();

    const provider = this.providers.get(targetName);
    if (!provider) {
      throw new Error(`Unsupported AI Provider: ${targetName}. Valid choices: openai, gemini, huggingface`);
    }

    return provider;
  }

  static getActiveProvider(): { provider: IAIProvider | null; activeName: string; isConfigured: boolean } {
    this.initialize();
    const activeName = config.ai.provider.toLowerCase();
    const provider = this.providers.get(activeName) || null;

    const isConfigured = Boolean(
      (activeName === 'openai' && config.ai.openaiApiKey) ||
      (activeName === 'gemini' && config.ai.geminiApiKey) ||
      (activeName === 'huggingface' && config.ai.hfApiKey)
    );

    return {
      provider,
      activeName,
      isConfigured,
    };
  }

  static getAllProviderStatuses() {
    this.initialize();
    const result: Array<{ name: string; isConfigured: boolean; activeModel: string }> = [];

    this.providers.forEach((p) => {
      const info = p.getModelInfo();
      result.push({
        name: info.providerName,
        isConfigured: Boolean(info.isConfigured),
        activeModel: info.activeModel,
      });
    });

    return result;
  }
}
