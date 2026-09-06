/**
 * Embedding Provider Abstraction Contract (Stage 0 Placeholder)
 * 
 * NOT IMPLEMENTED IN STAGE 0.
 * Future implementation will benchmark and evaluate candidate embedding models
 * (e.g., all-MiniLM-L6-v2, BGE family, multilingual-e5, Qwen embedding models).
 */

export interface IEmbeddingProvider {
  /**
   * Generates dense vector embeddings for an array of document text chunks
   */
  embedDocuments(documents: string[]): Promise<number[][]>;

  /**
   * Generates a dense vector embedding for a single search query
   */
  embedQuery(query: string): Promise<number[]>;

  /**
   * Returns vector dimension count (e.g., 384, 768, 1536)
   */
  getDimension(): number;

  /**
   * Returns active model identifier
   */
  getModelName(): string;
}
