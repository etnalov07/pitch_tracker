import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { theme } from '../../styles/theme';

// Public landing page the API redirects to after consuming a verification
// token (GET /bt-api/auth/verify-email). A status display — when the token
// was invalid/expired it also offers a resend (the user may not be logged in,
// so this uses the public resend-by-email endpoint).
const VerifyEmail: React.FC = () => {
    const [params] = useSearchParams();
    const ok = params.get('status') === 'ok';

    const [email, setEmail] = useState('');
    const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

    const handleResend = async () => {
        if (!email.trim() || resendState === 'sending') return;
        setResendState('sending');
        try {
            await authService.resendVerificationByEmail(email.trim());
        } catch {
            // Public endpoint always succeeds; nothing to surface.
        }
        setResendState('sent');
    };

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
                        : 'This verification link is invalid or has expired. Enter your email below and we’ll send a fresh one.'}
                </p>

                {!ok &&
                    (resendState === 'sent' ? (
                        <p
                            style={{
                                marginTop: theme.spacing.lg,
                                marginBottom: 0,
                                color: theme.colors.green[700],
                                fontWeight: theme.fontWeight.medium,
                            }}
                        >
                            If that address needs verification, a new link is on its way.
                        </p>
                    ) : (
                        <div style={{ marginTop: theme.spacing.lg, display: 'flex', gap: theme.spacing.sm }}>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleResend();
                                }}
                                style={{
                                    flex: 1,
                                    padding: theme.spacing.sm,
                                    border: `1px solid ${theme.colors.gray[300]}`,
                                    borderRadius: theme.borderRadius.md,
                                    fontSize: theme.fontSize.base,
                                }}
                            />
                            <button
                                onClick={handleResend}
                                disabled={!email.trim() || resendState === 'sending'}
                                style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                                    backgroundColor: theme.colors.primary[600],
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: theme.borderRadius.md,
                                    fontSize: theme.fontSize.base,
                                    fontWeight: theme.fontWeight.semibold,
                                    cursor: !email.trim() || resendState === 'sending' ? 'default' : 'pointer',
                                    opacity: !email.trim() || resendState === 'sending' ? 0.6 : 1,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {resendState === 'sending' ? 'Sending…' : 'Resend email'}
                            </button>
                        </div>
                    ))}

                <Link
                    to="/login"
                    style={{
                        display: 'inline-block',
                        marginTop: theme.spacing.lg,
                        padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                        backgroundColor: ok ? theme.colors.primary[600] : 'transparent',
                        color: ok ? 'white' : theme.colors.gray[700],
                        border: ok ? 'none' : `1px solid ${theme.colors.gray[300]}`,
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
