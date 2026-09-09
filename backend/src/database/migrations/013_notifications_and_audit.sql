-- ═════════════════════════════════════════════════════════════════════════════
-- Stage 11: Notifications & Enterprise Audit Trail Engine
-- Migration 013: notifications & audit_logs
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    type VARCHAR(30) NOT NULL,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    link VARCHAR(500),

    data JSONB NOT NULL DEFAULT '{}'::jsonb,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_notification_type
        CHECK (
            type IN (
                'INFO',
                'SUCCESS',
                'WARNING',
                'ACTION_REQUIRED',
                'ACHIEVEMENT'
            )
        ),

    CONSTRAINT chk_notification_read_state
        CHECK (
            (is_read = FALSE AND read_at IS NULL)
            OR
            (is_read = TRUE AND read_at IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_org_created
ON notifications(organization_id, created_at DESC);

-- 2. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    actor_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    actor_email VARCHAR(255),

    actor_role VARCHAR(50),

    action VARCHAR(100) NOT NULL,

    resource_type VARCHAR(50) NOT NULL,

    resource_id VARCHAR(255),

    details JSONB NOT NULL DEFAULT '{}'::jsonb,

    ip_address VARCHAR(45),

    user_agent VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
ON audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
ON audit_logs(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
ON audit_logs(resource_type, resource_id);

-- 3. AUDIT IMMUTABILITY ENFORCEMENT TRIGGER
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_mutation();
