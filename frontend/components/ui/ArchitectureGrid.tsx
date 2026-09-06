import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Layers, ArrowDown, Database, Cpu, Lock, Sparkles } from 'lucide-react';

export const ArchitectureGrid: React.FC = () => {
  return (
    <Card title="System Architecture Flow" subtitle="Stage 0 Modular Monolith baseline & Future AI/RAG expansion path">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        {/* Active Stage 0 Baseline */}
        <div className="bg-onyx p-4 rounded-lg border border-silver/20 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-silver/10 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-white-smoke flex items-center gap-2">
              <Layers className="w-4 h-4 text-mahogany-red-2" />
              Stage 0 Active Architecture Baseline
            </span>
            <Badge variant="brand" size="sm">ACTIVE MONOLITH</Badge>
          </div>

          <div className="space-y-2 font-mono text-xs text-center">
            <div className="p-2.5 bg-carbon-black border border-silver/20 rounded text-white font-semibold flex items-center justify-center gap-2">
              <span>Next.js 14+ Web Client (TypeScript + Tailwind)</span>
            </div>
            <div className="text-strawberry-red py-0.5 flex justify-center">
              <ArrowDown className="w-4 h-4" />
            </div>
            <div className="p-2.5 bg-carbon-black border border-silver/20 rounded text-white font-semibold">
              REST API Routing (<code className="text-strawberry-red">/api/v1/health</code>)
            </div>
            <div className="text-strawberry-red py-0.5 flex justify-center">
              <ArrowDown className="w-4 h-4" />
            </div>
            <div className="p-2.5 bg-carbon-black border border-silver/20 rounded text-white font-semibold">
              Express Modular Monolith (Middleware + Request Tracing)
            </div>
            <div className="text-strawberry-red py-0.5 flex justify-center">
              <ArrowDown className="w-4 h-4" />
            </div>
            <div className="p-2.5 bg-carbon-black border border-silver/20 rounded text-white font-semibold">
              Controller ──► Service ──► Repository / Data Access
            </div>
            <div className="text-strawberry-red py-0.5 flex justify-center">
              <ArrowDown className="w-4 h-4" />
            </div>
            <div className="p-2.5 bg-dark-garnet/50 border border-mahogany-red rounded text-white font-bold flex items-center justify-center gap-2">
              <Database className="w-4 h-4 text-strawberry-red" />
              PostgreSQL System of Record (<code className="text-silver">organizations, users</code>)
            </div>
          </div>
        </div>

        {/* Future AI Expansion */}
        <div className="bg-onyx p-4 rounded-lg border border-silver/20 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-silver/10 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-silver flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-strawberry-red" />
              Future AI / RAG & Context Expansion Layer
            </span>
            <Badge variant="neutral" size="sm">FUTURE — STAGE 0.5+</Badge>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-2.5 bg-carbon-black/60 border border-silver/10 rounded text-silver flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-silver" />
                LangChain Orchestrator
              </span>
              <span className="text-[10px] text-silver/60">Stage 0.5</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="p-2 bg-carbon-black/40 border border-silver/10 rounded text-silver">OpenAI</div>
              <div className="p-2 bg-carbon-black/40 border border-silver/10 rounded text-silver">Gemini</div>
              <div className="p-2 bg-carbon-black/40 border border-silver/10 rounded text-silver">Hugging Face</div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-2.5 bg-carbon-black/40 border border-silver/10 rounded text-silver">
                <div className="font-semibold text-white-smoke text-[11px]">pgvector</div>
                <div className="text-[10px] text-silver/70 mt-0.5">Semantic document chunks</div>
              </div>
              <div className="p-2.5 bg-carbon-black/40 border border-silver/10 rounded text-silver">
                <div className="font-semibold text-white-smoke text-[11px]">Graphiti Layer</div>
                <div className="text-[10px] text-silver/70 mt-0.5">Temporal learner context</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-silver/10 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-dark-garnet/30 border border-mahogany-red/40 text-[11px] text-strawberry-red font-medium">
              <Lock className="w-3 h-3" />
              NOT IMPLEMENTED IN STAGE 0 (Prepared via docs/AI-ARCHITECTURE.md & Provider Interfaces)
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
