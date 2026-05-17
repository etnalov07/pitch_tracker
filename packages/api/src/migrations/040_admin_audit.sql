-- Migration 040: Admin audit log
-- Shared between Super User (env-var allowlist) actions and future
-- org-scoped privileged mutations. actor_role distinguishes them.

CREATE TABLE IF NOT EXISTS admin_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NOT NULL REFERENCES users(id),
    actor_role VARCHAR(16) NOT NULL CHECK (actor_role IN ('super', 'org_owner', 'org_admin')),
    organization_id UUID REFERENCES organizations(id), -- null for super-user actions
    action VARCHAR(64) NOT NULL,
    target_table VARCHAR(64),
    target_id UUID,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_org ON admin_audit(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit(created_at DESC);

-- Append-only by design: no UPDATE / DELETE grant.
GRANT SELECT, INSERT ON admin_audit TO bvolante_pitch_tracker;
