import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { theme } from '../../styles/theme';

// Public landing page the API redirects to after consuming a verification
// token (GET /bt-api/auth/verify-email). Purely a status display — the
// verification already happened server-side; this just reads ?status=.
const VerifyEmail: React.FC = () => {
    const [params] = useSearchParams();
    const ok = params.get('status') === 'ok';

    return (
        <div style={{ minHeight: '100vh', backgroundColor: theme.surfaces.body, padding: theme.spacing.xl }}>
            <div
                style={{
                    maxWidth: 480,
                    margin: '4rem auto',
                    backgroundColor: theme.surfaces.card,
                    padding: theme.spacing.xl,
                    borderRadius: theme.borderRadius.lg,
                    boxShadow: theme.shadows.sm,
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        width: 56,
                        height: 56,
                        lineHeight: '56px',
                        margin: '0 auto',
                        borderRadius: theme.borderRadius.full,
                        backgroundColor: ok ? theme.colors.green[100] : theme.colors.red[100],
                        color: ok ? theme.colors.green[700] : theme.colors.red[700],
                        fontSize: theme.fontSize['2xl'],
                        fontWeight: theme.fontWeight.bold,
                    }}
                >
                    {ok ? '✓' : '✕'}
                </div>
                <h1
                    style={{
                        marginTop: theme.spacing.lg,
                        marginBottom: theme.spacing.md,
                        fontSize: theme.fontSize['2xl'],
                        color: theme.colors.gray[900],
                    }}
                >
                    {ok ? 'Email verified' : 'Verification failed'}
                </h1>
                <p style={{ color: theme.colors.gray[700], lineHeight: 1.5, margin: 0 }}>
                    {ok
                        ? 'Your email address is confirmed. Verifying unlocks password recovery and other email-anchored features.'
                        : 'This verification link is invalid or has expired. Sign in and request a new verification email from your account settings.'}
                </p>
                <Link
                    to="/login"
                    style={{
                        display: 'inline-block',
                        marginTop: theme.spacing.lg,
                        padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                        backgroundColor: theme.colors.primary[600],
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: theme.borderRadius.md,
                        fontSize: theme.fontSize.base,
                        fontWeight: theme.fontWeight.semibold,
                    }}
                >
                    Go to sign in
                </Link>
            </div>
        </div>
    );
};

export default VerifyEmail;
