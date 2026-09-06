import { IEmbeddingProvider } from '../embeddingProvider.interface';
import { HfInference } from '@huggingface/inference';
import { config } from '../../config/env';

export class HuggingFaceEmbeddingProvider implements IEmbeddingProvider {
  private client: HfInference | null = null;

  constructor() {
    if (config.ai.hfApiKey) {
      this.client = new HfInference(config.ai.hfApiKey);
    }
  }

  public isAvailable(): boolean {
    return Boolean(config.ai.hfApiKey && this.client);
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    if (!this.client) {
      throw new Error('Hugging Face Embedding Provider is not configured. Missing HF_API_KEY.');
    }

    const embeddings: number[][] = [];
    for (const doc of documents) {
      const res = await this.client.featureExtraction({
        model: config.embedding.model,
        inputs: doc,
      });
      embeddings.push(Array.isArray(res) ? (res as number[]).flat() : []);
    }

    return embeddings;
  }

  async embedQuery(query: string): Promise<number[]> {
    const res = await this.embedDocuments([query]);
    return res[0] || [];
  }

  getDimension(): number {
    return config.embedding.dimension;
  }

  getModelName(): string {
    return config.embedding.model;
  }

  getProviderName(): string {
    return 'HuggingFace';
  }
}
