import { pool } from '../../config/database';
import { HuggingFaceEmbeddingProvider } from '../../providers/huggingface/huggingFaceEmbeddingProvider';
import { IEmbeddingProvider } from '../../providers/embeddingProvider.interface';
import { config } from '../../config/env';

export interface RetrievedChunk {
  id: string;
  documentId: string;
  organizationId: string;
  content: string;
  chunkIndex: number;
  similarityScore: number;
  metadata: any;
}

export interface RetrievalOptions {
  topK?: number;
  similarityThreshold?: number;
  courseId?: string;
}

export class VectorRetriever {
  private embeddingProvider: IEmbeddingProvider;
  private hasPgVectorExtension: boolean | null = null;

  constructor(embeddingProvider?: IEmbeddingProvider) {
    this.embeddingProvider = embeddingProvider || new HuggingFaceEmbeddingProvider();
  }

  private async checkPgVectorExtension(): Promise<boolean> {
    if (this.hasPgVectorExtension !== null) {
      return this.hasPgVectorExtension;
    }
    try {
      const { rows } = await pool.query(`SELECT 1 FROM pg_extension WHERE extname = 'vector'`);
      this.hasPgVectorExtension = rows.length > 0;
    } catch {
      this.hasPgVectorExtension = false;
    }
    return this.hasPgVectorExtension;
  }

  /**
   * Performs semantic vector search with mandatory multi-tenant organizationId isolation.
   * Supports both pgvector HNSW (<=>) and PostgreSQL array cosine calculation fallback.
   */
  async search(
    query: string,
    organizationId: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievedChunk[]> {
    if (!organizationId) {
      throw new Error('Mandatory tenant identifier (organizationId) missing from vector search query');
    }

    if (!config.vector.enabled) {
      console.warn('⚠️ Vector retrieval invoked while PGVECTOR_ENABLED is false');
      return [];
    }

    const topK = options.topK || 5;
    const similarityThreshold = options.similarityThreshold !== undefined ? options.similarityThreshold : 0.05;

    // 1. Generate query embedding vector
    const queryVector = await this.embeddingProvider.embedQuery(query);
    if (!queryVector || queryVector.length === 0) {
      console.warn('⚠️ Query embedding generation produced empty vector');
      return [];
    }

    const isPgVector = await this.checkPgVectorExtension();

    if (isPgVector) {
      // Native pgvector cosine search
      const vectorStr = `[${queryVector.join(',')}]`;
      let sql = `
        SELECT 
          id,
          document_id as "documentId",
          organization_id as "organizationId",
          content,
          chunk_index as "chunkIndex",
          metadata,
          1 - (embedding <=> $1::vector) as "similarityScore"
        FROM document_chunks
        WHERE organization_id = $2
          AND embedding IS NOT NULL
          AND (1 - (embedding <=> $1::vector)) >= $3
      `;

      const params: any[] = [vectorStr, organizationId, similarityThreshold];

      if (options.courseId) {
        params.push(options.courseId);
        sql += ` AND (metadata->>'courseId' = $${params.length} OR metadata->>'course_id' = $${params.length})`;
      }

      params.push(topK);
      sql += ` ORDER BY embedding <=> $1::vector ASC LIMIT $${params.length};`;

      const { rows } = await pool.query(sql, params);

      return rows.map((row) => ({
        id: row.id,
        documentId: row.documentId,
        organizationId: row.organizationId,
        content: row.content,
        chunkIndex: row.chunkIndex,
        similarityScore: parseFloat(row.similarityScore.toFixed(4)),
        metadata: row.metadata,
      }));
    } else {
      // PostgreSQL Array Cosine Fallback
      let sql = `
        SELECT 
          id,
          document_id as "documentId",
          organization_id as "organizationId",
          content,
          chunk_index as "chunkIndex",
          metadata,
          COALESCE((
            SELECT SUM(u.a * u.b) / NULLIF(SQRT(SUM(u.a * u.a)) * SQRT(SUM(u.b * u.b)), 0)
            FROM unnest(embedding, $1::real[]) AS u(a, b)
          ), 0) as "similarityScore"
        FROM document_chunks
        WHERE organization_id = $2
          AND embedding IS NOT NULL
      `;

      const params: any[] = [queryVector, organizationId];

      if (options.courseId) {
        params.push(options.courseId);
        sql += ` AND (metadata->>'courseId' = $${params.length} OR metadata->>'course_id' = $${params.length})`;
      }

      params.push(similarityThreshold);
      sql += ` AND COALESCE((
        SELECT SUM(u.a * u.b) / NULLIF(SQRT(SUM(u.a * u.a)) * SQRT(SUM(u.b * u.b)), 0)
        FROM unnest(embedding, $1::real[]) AS u(a, b)
      ), 0) >= $${params.length}`;

      params.push(topK);
      sql += ` ORDER BY "similarityScore" DESC LIMIT $${params.length};`;

      const { rows } = await pool.query(sql, params);

      return rows.map((row) => ({
        id: row.id,
        documentId: row.documentId,
        organizationId: row.organizationId,
        content: row.content,
        chunkIndex: row.chunkIndex,
        similarityScore: parseFloat(row.similarityScore.toFixed(4)),
        metadata: row.metadata,
      }));
    }
  }
}

export const vectorRetriever = new VectorRetriever();
