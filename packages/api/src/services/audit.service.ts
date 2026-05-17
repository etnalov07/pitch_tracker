import { query } from '../config/database';
import type { AdminActorRole } from '../types';

interface WriteAuditParams {
    actor_user_id: string;
    actor_role: AdminActorRole;
    organization_id?: string | null;
    action: string;
    target_table?: string | null;
    target_id?: string | null;
    payload?: Record<string, unknown> | null;
}

export class AuditService {
    /**
     * Append-only write to admin_audit. Best-effort: a failure here MUST NOT
     * fail the originating request — log and swallow. The audit table grants
     * SELECT and INSERT only, so accidental UPDATE/DELETE will reject.
     */
    async write(params: WriteAuditParams): Promise<void> {
        try {
            await query(
                `INSERT INTO admin_audit
                    (actor_user_id, actor_role, organization_id, action, target_table, target_id, payload)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    params.actor_user_id,
                    params.actor_role,
                    params.organization_id ?? null,
                    params.action,
                    params.target_table ?? null,
                    params.target_id ?? null,
                    params.payload ? JSON.stringify(params.payload) : null,
                ]
            );
        } catch (err) {
            console.error('admin_audit write failed:', err);
        }
    }
}

export default new AuditService();
