-- ═════════════════════════════════════════════════════════════════════════════
-- Stage 12: Advanced RAG & Persistent Learner Context Engine
-- Migration 014: learner_context_facts
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. LEARNER CONTEXT FACTS TABLE (Persistent Temporal Learner Context)
CREATE TABLE IF NOT EXISTS learner_context_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    entity_type VARCHAR(50) NOT NULL,

    fact_text TEXT NOT NULL,

    confidence_score NUMERIC(4,3) NOT NULL DEFAULT 1.000,

    source_event VARCHAR(100),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_context_entity_type
        CHECK (
            entity_type IN (
                'STRUGGLE_CONCEPT',
                'LEARNING_PREFERENCE',
                'TARGET_COMPETENCY',
                'PRIOR_KNOWLEDGE'
            )
        ),

    CONSTRAINT chk_context_confidence
        CHECK (
            confidence_score >= 0.000 AND confidence_score <= 1.000
        )
);

-- 2. INDEXES FOR MULTI-TENANT CONTEXT RETRIEVAL
CREATE INDEX IF NOT EXISTS idx_learner_context_user_active
ON learner_context_facts(user_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learner_context_org_user
ON learner_context_facts(organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_learner_context_type
ON learner_context_facts(entity_type);
