import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizationService } from '../../services/organizationService';
import { logout, useAppDispatch } from '../../state';
import { theme } from '../../styles/theme';

const OrgCreate: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setError('Give your organization a name to continue.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await organizationService.create(trimmed);
            navigate('/');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Could not create your organization.';
            setError(msg);
            setSubmitting(false);
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: theme.surfaces.body, padding: theme.spacing.xl }}>
            <div
                style={{
                    maxWidth: 520,
                    margin: '4rem auto',
                    backgroundColor: theme.surfaces.card,
                    padding: theme.spacing.xl,
                    borderRadius: theme.borderRadius.lg,
                    boxShadow: theme.shadows.sm,
                }}
            >
                <h1 style={{ marginTop: 0, fontSize: theme.fontSize['2xl'], color: theme.colors.gray[900] }}>
                    Name your organization
                </h1>
                <p style={{ color: theme.colors.gray[700], lineHeight: 1.5 }}>
                    Your organization is the home for every team and coach you manage. You can rename it or add other admins later.
                </p>
                <input
                    type="text"
                    placeholder="Organization name"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        if (error) setError(null);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreate();
                    }}
                    style={{
                        width: '100%',
                        padding: theme.spacing.sm,
                        border: `1px solid ${theme.colors.gray[300]}`,
                        borderRadius: theme.borderRadius.md,
                        fontSize: theme.fontSize.base,
                        marginTop: theme.spacing.md,
                    }}
                />
                {error && (
                    <p style={{ color: theme.colors.red[700], fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm }}>
                        {error}
                    </p>
                )}
                <div style={{ marginTop: theme.spacing.lg, display: 'flex', gap: theme.spacing.sm }}>
                    <button
                        onClick={handleCreate}
                        disabled={submitting}
                        style={{
                            flex: 1,
                            padding: theme.spacing.sm,
                            backgroundColor: theme.colors.primary[600],
                            color: 'white',
                            border: 'none',
                            borderRadius: theme.borderRadius.md,
                            fontSize: theme.fontSize.base,
                            fontWeight: theme.fontWeight.semibold,
                            cursor: submitting ? 'default' : 'pointer',
                            opacity: submitting ? 0.7 : 1,
                        }}
                    >
                        {submitting ? 'Creating…' : 'Create Organization'}
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: theme.spacing.sm,
                            backgroundColor: 'transparent',
                            color: theme.colors.gray[700],
                            border: `1px solid ${theme.colors.gray[300]}`,
                            borderRadius: theme.borderRadius.md,
                            fontSize: theme.fontSize.base,
                            cursor: 'pointer',
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrgCreate;
