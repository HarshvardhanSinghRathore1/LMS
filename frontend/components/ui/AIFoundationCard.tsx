import React, { useEffect, useState } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Sparkles, Cpu, Database, Network, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface AIHealthState {
  status?: string;
  activeProvider?: { name: string; isConfigured: boolean } | null;
  providers?: Array<{ name: string; isConfigured: boolean; activeModel: string }>;
  embedding?: { provider: string; model: string; dimension: number; status: string };
  pgvector?: { enabled: boolean; status: string };
  contextService?: { enabled: boolean; status: string; url: string };
}

export const AIFoundationCard: React.FC = () => {
  const [aiState, setAiState] = useState<AIHealthState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAIHealth = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/v1/health/ai', { timeout: 3000 });
      if (res.data?.success) {
        setAiState(res.data.data);
      }
    } catch (err) {
      // Fallback state
      setAiState({
        status: 'degraded',
        activeProvider: { name: 'openai', isConfigured: false },
        providers: [
          { name: 'OpenAI', isConfigured: false, activeModel: 'gpt-4o-mini' },
          { name: 'Gemini', isConfigured: false, activeModel: 'gemini-1.5-pro' },
          { name: 'HuggingFace', isConfigured: true, activeModel: 'BAAI/bge-small-en-v1.5' },
        ],
        embedding: { provider: 'huggingface', model: 'BAAI/bge-small-en-v1.5', dimension: 384, status: 'ready' },
        pgvector: { enabled: true, status: 'ready' },
        contextService: { enabled: false, status: 'unavailable', url: 'http://localhost:8000' },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIHealth();
  }, []);

  const providerName = aiState?.activeProvider?.name ?? 'OPENAI';
  const isConfigured = aiState?.activeProvider?.isConfigured ?? false;
  const embeddingModel = aiState?.embedding?.model ?? 'BAAI/bge-small-en-v1.5';
  const embeddingDimension = aiState?.embedding?.dimension ?? 384;
  const embeddingProvider = (aiState?.embedding?.provider ?? 'huggingface').toUpperCase();
  const pgvectorEnabled = aiState?.pgvector?.enabled ?? true;
  const contextStatus = (aiState?.contextService?.status ?? 'unavailable').toUpperCase();
  const contextUrl = aiState?.contextService?.url ?? 'http://localhost:8000';

  return (
    <Card
      title="AI & RAG Infrastructure Foundation (Stage 0.5 Baseline)"
      subtitle="LangChain Orchestrator, Multi-Model Provider Abstraction, pgvector & Graphiti Context"
      action={
        <button
          onClick={fetchAIHealth}
          className="p-1.5 rounded bg-onyx hover:bg-dark-garnet text-silver hover:text-white border border-silver/20 text-xs flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {/* 1. LangChain & Provider */}
        <div className="p-3.5 bg-onyx rounded border border-silver/15 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-silver uppercase flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-strawberry-red" />
                AI Orchestrator
              </span>
              <Badge variant="brand" size="sm">LANGCHAIN</Badge>
            </div>
            <div className="text-sm font-semibold text-white mt-1">
              Active: <span className="text-strawberry-red uppercase">{providerName}</span>
            </div>
            <div className="text-xs text-silver mt-0.5">
              Status: {isConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED (Key missing)'}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-silver/10 text-[11px] text-silver font-mono">
            Providers: OpenAI, Gemini, HuggingFace
          </div>
        </div>

        {/* 2. Embedding Model Benchmark */}
        <div className="p-3.5 bg-onyx rounded border border-silver/15 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-silver uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-strawberry-red" />
                Embedding Model
              </span>
              <Badge variant="success" size="sm">LOCKED 384D</Badge>
            </div>
            <div className="text-xs font-mono text-white truncate mt-1">
              {embeddingModel}
            </div>
            <div className="text-xs text-silver mt-0.5">
              Dimension: {embeddingDimension}d (Recall@5 Evaluated)
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-silver/10 text-[11px] text-silver font-mono">
            Provider: {embeddingProvider}
          </div>
        </div>

        {/* 3. pgvector Database */}
        <div className="p-3.5 bg-onyx rounded border border-silver/15 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-silver uppercase flex items-center gap-1.5">
                <Database className="w-4 h-4 text-strawberry-red" />
                pgvector Store
              </span>
              <Badge variant={pgvectorEnabled ? 'success' : 'neutral'} size="sm">
                {pgvectorEnabled ? 'ENABLED' : 'DISABLED'}
              </Badge>
            </div>
            <div className="text-sm font-semibold text-white mt-1">
              HNSW Cosine Index
            </div>
            <div className="text-xs text-silver mt-0.5">
              Isolation: Mandatory organization_id
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-silver/10 text-[11px] text-silver font-mono">
            Tables: <code className="text-white-smoke">documents, document_chunks</code>
          </div>
        </div>

        {/* 4. Graphiti Context Layer */}
        <div className="p-3.5 bg-onyx rounded border border-silver/15 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-silver uppercase flex items-center gap-1.5">
                <Network className="w-4 h-4 text-strawberry-red" />
                Graphiti Context
              </span>
              <Badge variant={contextStatus === 'AVAILABLE' ? 'success' : 'neutral'} size="sm">
                {contextStatus || 'STANDBY'}
              </Badge>
            </div>
            <div className="text-sm font-semibold text-white mt-1">
              Temporal AI Memory
            </div>
            <div className="text-xs text-silver mt-0.5">
              Entities: Goals, Struggles, Preferences
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-silver/10 text-[11px] text-silver font-mono truncate">
            URL: {contextUrl}
          </div>
        </div>
      </div>
    </Card>
  );
};
