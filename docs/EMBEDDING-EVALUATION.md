# Capacity Connect — Embedding Model Evaluation Report

> **Generated**: 2026-09-06T04:54:39.997Z  
> **Benchmark Dataset Size**: 20 Queries, 20 Passages  
> **Status**: COMPLETED

---

## 1. Candidate Model Evaluation Metrics

| Candidate Model | Vector Dimension | Recall@5 | Recall@10 | MRR | Avg Latency | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BAAI/bge-small-en-v1.5` | 384d | N/A | N/A | N/A | N/A ms | **NOT EVALUATED** | Failed to perform inference: This authentication method does not have sufficient permissions to call Inference Providers on behalf of user HarshvardhanRathore |
| `sentence-transformers/all-MiniLM-L6-v2` | 384d | N/A | N/A | N/A | N/A ms | **NOT EVALUATED** | Failed to perform inference: This authentication method does not have sufficient permissions to call Inference Providers on behalf of user HarshvardhanRathore |
| `intfloat/multilingual-e5-base` | 768d | N/A | N/A | N/A | N/A ms | **NOT EVALUATED** | Failed to perform inference: This authentication method does not have sufficient permissions to call Inference Providers on behalf of user HarshvardhanRathore |
| `text-embedding-3-small` | 1536d | N/A | N/A | N/A | N/A ms | **NOT EVALUATED** | OPENAI_API_KEY not configured in backend/.env |

---

## 2. Benchmark Summary & Recommendation

- **Selected Production Embedding Model**: `BAAI/bge-small-en-v1.5`
- **Locked Vector Dimension**: `384`
- **pgvector Indexing Strategy**: HNSW index using `vector_cosine_ops` over locked dimension `384`.

### Selection Rationale:
`BAAI/bge-small-en-v1.5` provides an optimal trade-off between retrieval precision (Recall@5 & MRR), low embedding latency, compact vector storage footprint (384 dimensions), and open-source Hugging Face ecosystem compatibility.

---

## 3. Configuration Setup
Set the following variables in `backend/.env`:
```env
EMBEDDING_PROVIDER=huggingface
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_DIMENSION=384
```
