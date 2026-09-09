import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';

interface StageItem {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
}

const STAGES: StageItem[] = [
  { id: 'STAGE 0', name: 'Foundation & Architecture', description: 'Express modular monolith, Next.js dashboard, PostgreSQL pool, migration system, health API.', status: 'completed' },
  { id: 'STAGE 0.5', name: 'AI / RAG Foundation', description: 'LangChain abstraction, Hugging Face/OpenAI/Gemini providers, embedding benchmark, pgvector, Graphiti prep.', status: 'completed' },
  { id: 'STAGE 1', name: 'Authentication & RBAC', description: 'JWT tokens, password hashing, organization isolation, user profiles, Trainee/Trainer/Admin RBAC.', status: 'completed' },
  { id: 'STAGE 2', name: 'Course Management', description: 'Course CRUD, modules, learning materials upload, search, filtering, publishing workflow.', status: 'completed' },
  { id: 'STAGE 3', name: 'Enrollment & Progress', description: 'Trainee course enrollment, module progress tracking, continue learning, activity events.', status: 'completed' },
  { id: 'STAGE 4', name: 'Assessment Engine', description: 'MCQs, short answer, assignment submission, automated evaluation, scoring, passing criteria.', status: 'completed' },
  { id: 'STAGE 5', name: 'Competency Engine', description: 'Skill catalog, course competency mapping, 70/30 user competency scoring, skill gap matrix.', status: 'completed' },
  { id: 'STAGE 6', name: 'AI Features', description: 'AI-generated notes, AI MCQ generation with trainer review workflow, course-aware AI tutor with RAG retrieval.', status: 'current' },
  { id: 'STAGE 7', name: 'Personalized Recommendations', description: 'Explainable recommendation engine using skill gaps, difficulty fit, and learning history.', status: 'upcoming' },
  { id: 'STAGE 8', name: 'Intelligent Trainer Matching', description: 'Trainee-trainer matching algorithm based on skill match, experience, availability, and rating.', status: 'upcoming' },
  { id: 'STAGE 9', name: 'Certificates', description: 'Course completion & assessment criteria verification, unique certificate ID generation, verification mechanism.', status: 'upcoming' },
  { id: 'STAGE 10', name: 'Analytics', description: 'Real activity-event-based dashboards for Trainee, Trainer, and Organization intelligence.', status: 'upcoming' },
  { id: 'STAGE 11', name: 'Notifications & Audit', description: 'System notification dispatcher and administrative audit log trail.', status: 'upcoming' },
  { id: 'STAGE 12', name: 'Advanced RAG & Persistent Context', description: 'pgvector document retrieval + Graphiti persistent temporal learner context contextual assistant.', status: 'upcoming' },
  { id: 'STAGE 13', name: 'Production Hardening', description: 'Rate limiting, caching, background jobs, AI job queues, Dockerization, security audit, deployment.', status: 'upcoming' },
];

export const StageRoadmap: React.FC = () => {
  return (
    <Card title="Capacity Connect Development Roadmap" subtitle="Full 14-stage implementation path">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
        {STAGES.map((stage) => (
          <div
            key={stage.id}
            className={`p-3.5 rounded-lg border transition-all ${
              stage.status === 'current'
                ? 'bg-carbon-black border-mahogany-red shadow-[0_0_15px_rgba(164,22,26,0.2)]'
                : stage.status === 'completed'
                ? 'bg-onyx border-emerald-900/50'
                : 'bg-onyx/80 border-silver/10 hover:border-silver/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-bold text-silver">
                {stage.id}
              </span>
              {stage.status === 'current' ? (
                <Badge variant="danger" size="sm">CURRENT</Badge>
              ) : stage.status === 'completed' ? (
                <Badge variant="success" size="sm">COMPLETE</Badge>
              ) : (
                <Badge variant="neutral" size="sm">UPCOMING</Badge>
              )}
            </div>
            <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              {stage.status === 'completed' || stage.status === 'current' ? (
                <CheckCircle2 className="w-4 h-4 text-strawberry-red shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-silver/40 shrink-0" />
              )}
              {stage.name}
            </h4>
            <p className="text-xs text-silver/70 mt-1 line-clamp-2">
              {stage.description}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};
