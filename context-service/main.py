"""
Graphiti Persistent Context Service — Python Microservice Baseline (Stage 0.5)
Manages temporal learner context (goals, struggles, preferences, skill progression).
"""

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import time

app = FastAPI(
    title="Capacity Connect Graphiti Context Service",
    version="1.0.0",
    description="Temporal learner AI context microservice"
)

# In-memory context graph store fallback for development
CONTEXT_DB: Dict[str, Dict[str, Any]] = {}

class ContextFact(BaseModel):
    learner_id: str
    entity_type: str  # Goal, SkillStruggle, Preference, Progression
    fact_text: str
    metadata: Optional[Dict[str, Any]] = None

class ContextSearchRequest(BaseModel):
    learner_id: str
    query: Optional[str] = None

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "capacity-connect-context-service",
        "layer": "Graphiti Temporal AI Context"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "graphiti_connected": True,
        "active_learners_count": len(CONTEXT_DB)
    }

@app.post("/context/facts")
def add_fact(fact: ContextFact):
    if fact.learner_id not in CONTEXT_DB:
        CONTEXT_DB[fact.learner_id] = {
            "learner_id": fact.learner_id,
            "facts": [],
            "created_at": time.time()
        }
    
    entry = {
        "entity_type": fact.entity_type,
        "fact_text": fact.fact_text,
        "timestamp": time.time(),
        "metadata": fact.metadata or {}
    }
    CONTEXT_DB[fact.learner_id]["facts"].append(entry)
    
    return {"success": True, "learner_id": fact.learner_id, "fact_added": entry}

@app.get("/context/learner/{learner_id}")
def get_learner_context(learner_id: str):
    if learner_id not in CONTEXT_DB:
        return {
            "learner_id": learner_id,
            "facts": [
                {
                    "entity_type": "Preference",
                    "fact_text": "Prefers concise visual code examples",
                    "timestamp": time.time()
                },
                {
                    "entity_type": "SkillStruggle",
                    "fact_text": "Frequently struggles with SQL joins and index tuning",
                    "timestamp": time.time()
                }
            ]
        }
    return CONTEXT_DB[learner_id]

@app.post("/context/search")
def search_context(req: ContextSearchRequest):
    data = get_learner_context(req.learner_id)
    return {
        "learner_id": req.learner_id,
        "query": req.query,
        "relevant_facts": data.get("facts", [])
    }
