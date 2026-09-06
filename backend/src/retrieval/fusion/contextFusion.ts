import { VectorRetriever, RetrievedChunk } from '../vector/vectorRetriever';
import { GraphitiContextClient, ContextFactItem } from '../context/contextService';
import { PromptTemplate } from '@langchain/core/prompts';

export interface FusedContext {
  query: string;
  organizationId: string;
  learnerId: string;
  documentChunks: RetrievedChunk[];
  learnerFacts: ContextFactItem[];
  formattedPrompt: string;
}

export class ContextFusionPipeline {
  private vectorRetriever: VectorRetriever;
  private contextClient: GraphitiContextClient;
  private promptTemplate: PromptTemplate;

  constructor(vectorRetriever?: VectorRetriever, contextClient?: GraphitiContextClient) {
    this.vectorRetriever = vectorRetriever || new VectorRetriever();
    this.contextClient = contextClient || new GraphitiContextClient();

    this.promptTemplate = PromptTemplate.fromTemplate(`
You are the Capacity Connect AI Learning Assistant.

=== 1. PERSISTENT LEARNER CONTEXT (Graphiti) ===
{learnerContext}

=== 2. RETRIEVED COURSE CONTENT (pgvector Semantic Search) ===
{documentContent}

=== 3. USER QUERY ===
{userQuery}

Answer the user query accurately using the course content provided above, tailoring explanations to the learner's preferences and struggles.
`);
  }

  async assembleContext(
    userQuery: string,
    organizationId: string,
    learnerId: string
  ): Promise<FusedContext> {
    // 1. Fetch semantic document chunks from pgvector (tenant isolated)
    const chunks = await this.vectorRetriever.search(userQuery, organizationId, { topK: 3 });

    // 2. Fetch persistent learner context facts from Graphiti
    const contextResult = await this.contextClient.getLearnerContext(learnerId);

    // 3. Format document text & learner context
    const docText = chunks.length > 0
      ? chunks.map((c, i) => `[Chunk ${i + 1} | Score: ${c.similarityScore}] ${c.content}`).join('\n\n')
      : 'No relevant course documents found for this query.';

    const factText = contextResult.facts.length > 0
      ? contextResult.facts.map((f) => `- [${f.entityType}] ${f.factText}`).join('\n')
      : 'No specific temporal learner context recorded yet.';

    // 4. Synthesize prompt
    const formattedPrompt = await this.promptTemplate.format({
      learnerContext: factText,
      documentContent: docText,
      userQuery: userQuery,
    });

    return {
      query: userQuery,
      organizationId,
      learnerId,
      documentChunks: chunks,
      learnerFacts: contextResult.facts,
      formattedPrompt,
    };
  }
}

export const contextFusionPipeline = new ContextFusionPipeline();
