import axios from 'axios';
import { config } from '../../config/env';

export interface ContextFactItem {
  entityType: string;
  factText: string;
  timestamp: number;
  metadata?: any;
}

export interface LearnerContextResult {
  learnerId: string;
  facts: ContextFactItem[];
  isAvailable: boolean;
  error?: string;
}

export class GraphitiContextClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.graphiti.url;
  }

  async getLearnerContext(learnerId: string): Promise<LearnerContextResult> {
    if (!config.graphiti.enabled) {
      return {
        learnerId,
        facts: [
          {
            entityType: 'Preference',
            factText: 'Prefers hands-on code examples and modular architecture explanations',
            timestamp: Date.now(),
          },
        ],
        isAvailable: false,
        error: 'Graphiti context service disabled in config',
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/context/learner/${learnerId}`, { timeout: 2000 });
      const rawFacts = response.data?.facts || [];

      return {
        learnerId,
        facts: rawFacts.map((f: any) => ({
          entityType: f.entity_type || f.entityType,
          factText: f.fact_text || f.factText,
          timestamp: f.timestamp || Date.now(),
          metadata: f.metadata,
        })),
        isAvailable: true,
      };
    } catch (err: any) {
      console.warn(`⚠️ Graphiti Context Service ping failed (${this.baseUrl}):`, err?.message);
      return {
        learnerId,
        facts: [
          {
            entityType: 'Preference',
            factText: 'Prefers structured step-by-step technical guidance',
            timestamp: Date.now(),
          },
        ],
        isAvailable: false,
        error: err?.message || 'Context service unavailable',
      };
    }
  }

  async checkHealth(): Promise<{ isAvailable: boolean; status: string; url: string }> {
    try {
      const res = await axios.get(`${this.baseUrl}/health`, { timeout: 2000 });
      return {
        isAvailable: res.status === 200,
        status: res.data?.status || 'healthy',
        url: this.baseUrl,
      };
    } catch (err: any) {
      return {
        isAvailable: false,
        status: 'unavailable',
        url: this.baseUrl,
      };
    }
  }
}

export const graphitiContextClient = new GraphitiContextClient();
