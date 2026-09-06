# CAPACITY CONNECT — AI & RAG ARCHITECTURE SPECIFICATION

> **STATUS: FUTURE ARCHITECTURE**
> **NOT IMPLEMENTED IN STAGE 0**
> 
> This document defines the system design, provider abstraction, embedding benchmark plan, and persistent context layer for future AI integration (Stage 0.5 & Stage 12).

---

## 1. High-Level AI Orchestration Architecture

To prevent tight coupling between application business logic and specific AI vendors, Capacity Connect uses an abstraction layer powered by **LangChain**:

```text
                        APPLICATION SERVICE LAYER
                                    │
                                    ▼
                             AI Orchestrator
                                    │
                                LangChain
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
     OpenAIProvider          GeminiProvider         HuggingFaceProvider
   (GPT-4o / GPT-4o-mini)   (Gemini 1.5 Pro)     (Open-Source / Hosted)
```

Application code interacts strictly through generic service contracts (e.g., `aiService.generateNotes()`, `aiService.generateMCQ()`, `aiService.answerQuestion()`) rather than invoking vendor SDKs directly in controllers.

---

## 2. Advanced Contextual RAG Architecture

When the AI Learning Assistant answers user queries, it combines two distinct context streams:

```text
                                USER QUERY
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
pgvector (PostgreSQL)                                    Graphiti Context Layer
Semantic Document Retrieval                              Persistent Temporal Context
(Course Modules, Transcripts, PDF Notes)                 (Learner Struggles, Style, Progression)
    │                                                               │
    └───────────────────────────────┬───────────────────────────────┘
                                    ▼
                             Context Fusion
                                    │
                                LangChain
                                    │
                                   LLM
                                    │
                                  Answer
```

---

## 3. Storage Layer Responsibilities

### 3.1 PostgreSQL (System of Record)
- **Role**: Primary relational database.
- **Stores**: User credentials, organization hierarchy, course metadata, enrollment state, raw assessment attempts, official scores, certificates, audit logs.
- **Guarantee**: ACID compliance and strict multi-tenant data isolation (`organization_id`).

### 3.2 pgvector (Semantic Document Search)
- **Role**: Vector extension within PostgreSQL.
- **Stores**: Chunks of text extracted from course materials, video transcripts, and instructor slides along with dense vector embeddings.
- **Use Case**: Enables fast cosine similarity search to retrieve relevant course text for user questions.

### 3.3 Graphiti (Persistent Temporal Context)
- **Role**: Semantic knowledge graph layer running as a dedicated microservice.
- **Stores**: Temporal facts and evolving relationships about the learner, such as:
  - `User -> struggles_with -> Recursion` (timestamped)
  - `User -> prefers -> Visual explanations`
  - `User -> target_competency -> REST APIs`
  - `User -> completed_course -> Node.js Fundamentals`
- **Non-Goal**: Graphiti NEVER replaces PostgreSQL for transactional data, credentials, or official grades.

---

## 4. Embedding Model Evaluation & Benchmarking Strategy

During **Stage 0.5**, candidate embedding models will be evaluated against a domain-specific Capacity Connect dataset prior to selecting the production embedding model.

### Candidate Embedding Models:
1. `sentence-transformers/all-MiniLM-L6-v2` (Lightweight, 384d)
2. `BAAI/bge-small-en-v1.5` & `BAAI/bge-base-en-v1.5` (High retrieval accuracy, 768d)
3. `intfloat/multilingual-e5-base` (Strong cross-lingual capability, 768d)
4. `Alibaba-NLP/gte-Qwen2-1.5B-instruct` (Advanced performance)

### Evaluation Metrics:
- **Recall@5 & Recall@10**: Percentage of queries where relevant document chunks are returned in top K.
- **MRR (Mean Reciprocal Rank)**: Position quality of first relevant chunk.
- **Retrieval Latency**: Milliseconds per query embedding & search.
- **Memory Footprint & Dimensions**: Index size and RAM requirements.
- **Multilingual Capability**: Performance across non-English learning content.
- **License & Deployment Complexity**: Open-source license suitability for production.

The production model name and dimension will be set in environment variables (`EMBEDDING_MODEL` and `EMBEDDING_DIMENSION`) and enforced consistently.

---

## 5. Summary of Implementation Timeline

- **Stage 0 (Current)**: Architecture specification & interface contracts (`aiProvider.interface.ts`, `embeddingProvider.interface.ts`). Zero runtime LLM or vector dependencies.
- **Stage 0.5**: Provider abstraction implementation, embedding benchmarking, pgvector table setup, and Graphiti service proof-of-concept.
- **Stage 6**: Production AI Notes generation, AI MCQ generation, and basic course-context chatbot.
- **Stage 12**: Fusion of pgvector semantic document retrieval + Graphiti persistent temporal context into the full AI Learning Assistant.
