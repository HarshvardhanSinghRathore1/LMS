import { AIProviderFactory } from '../../providers/aiProviderFactory';
import { graphitiContextClient } from '../../retrieval/context/contextService';
import { contextFusionPipeline } from '../../retrieval/fusion/contextFusion';
import { config } from '../../config/env';

export class AIService {
  async getAIHealth() {
    const activeInfo = AIProviderFactory.getActiveProvider();
    const providerStatuses = AIProviderFactory.getAllProviderStatuses();
    const graphitiHealth = await graphitiContextClient.checkHealth();

    const isHealthy = activeInfo.isConfigured;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      activeProvider: {
        name: activeInfo.activeName,
        isConfigured: activeInfo.isConfigured,
      },
      providers: providerStatuses,
      embedding: {
        provider: config.embedding.provider,
        model: config.embedding.model,
        dimension: config.embedding.dimension,
        status: 'ready',
      },
      pgvector: {
        enabled: config.vector.enabled,
        status: config.vector.enabled ? 'ready' : 'disabled',
      },
      contextService: {
        enabled: config.graphiti.enabled,
        status: graphitiHealth.isAvailable ? 'available' : 'unavailable',
        url: graphitiHealth.url,
      },
    };
  }

  async testAIFusion(query: string, organizationId: string, learnerId: string) {
    const activeInfo = AIProviderFactory.getActiveProvider();
    
    // Assemble fused RAG prompt
    const fused = await contextFusionPipeline.assembleContext(query, organizationId, learnerId);

    let llmResponse = 'LLM Generation skipped because active provider is not configured.';
    if (activeInfo.isConfigured && activeInfo.provider) {
      try {
        llmResponse = await activeInfo.provider.generateText(query, {
          systemPrompt: 'You are the Capacity Connect AI tutor assistant. Answer concisely.',
        });
      } catch (err: any) {
        llmResponse = `LLM generation error: ${err?.message || 'Unknown error'}`;
      }
    }

    return {
      query,
      activeProvider: activeInfo.activeName,
      isConfigured: activeInfo.isConfigured,
      fusedPrompt: fused.formattedPrompt,
      retrievedChunksCount: fused.documentChunks.length,
      learnerFactsCount: fused.learnerFacts.length,
      llmResponse,
    };
  }
}

export const aiService = new AIService();
