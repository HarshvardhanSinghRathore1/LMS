-- ========================================================
-- MIGRATION: 012_analytics.sql
-- DESCRIPTION: Stage 10 Organization-Wide Analytics & Executive Dashboard
-- Creates analytics_snapshots cache table for 15-minute TTL dashboard caching
-- Stage 10 is READ-ONLY with respect to Stage 0-9 domain tables.
-- ========================================================

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    snapshot_type VARCHAR(50) NOT NULL,

    payload JSONB NOT NULL,

    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_org_snapshot
        UNIQUE (organization_id, snapshot_type)
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_org
ON analytics_snapshots(organization_id);
