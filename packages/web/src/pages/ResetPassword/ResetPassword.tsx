import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { theme } from '../../styles/theme';

const card: React.CSSProperties = {
    maxWidth: 440,
    margin: '4rem auto',
    backgroundColor: theme.surfaces.card,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    marginTop: theme.spacing.md,
};

// Public page reached from the password-reset email link. Reads ?token= and
// posts a new password; on success the user goes to /login (no auto-login).
const ResetPassword: React.FC = () => {
    const [params] = useSearchParams();
    const token = params.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [state, setState] = useState<'idle' | 'submitting' | 'done'>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!token) {
            setError('This reset link is missing its token.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setState('submitting');
        setError(null);
        try {
            await authService.resetPassword(token, password);
            setState('done');
        } catch (err: unknown) {
            const resp = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setError(resp || 'Could not reset your password. The link may have expired.');
            setState('idle');
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: theme.surfaces.body, padding: theme.spacing.xl }}>
            <div style={card}>
                {state === 'done' ? (
                    <>
                        <h1 style={{ marginTop: 0, fontSize: theme.fontSize['2xl'], color: theme.colors.gray[900] }}>
                            Password updated
                        </h1>
                        <p style={{ color: theme.colors.gray[700], lineHeight: 1.5 }}>
                            Your password has been changed and any other active sessions have been signed out. Sign in with your new
                            password.
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
                    </>
                ) : (
                    <>
                        <h1 style={{ marginTop: 0, fontSize: theme.fontSize['2xl'], color: theme.colors.gray[900] }}>
                            Choose a new password
                        </h1>
                        <p style={{ color: theme.colors.gray[700], lineHeight: 1.5 }}>
                            Enter a new password for your account. It must be at least 8 characters.
                        </p>
                        <input
                            type="password"
                            placeholder="New password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (error) setError(null);
                            }}
                            style={inputStyle}
                        />
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirm}
                            onChange={(e) => {
                                setConfirm(e.target.value);
                                if (error) setError(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSubmit();
                            }}
                            style={inputStyle}
                        />
                        {error && (
                            <p style={{ color: theme.colors.red[700], fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm }}>
                                {error}
                            </p>
                        )}
                        <button
                            onClick={handleSubmit}
                            disabled={state === 'submitting'}
                            style={{
                                width: '100%',
                                marginTop: theme.spacing.lg,
                                padding: theme.spacing.sm,
                                backgroundColor: theme.colors.primary[600],
                                color: 'white',
                                border: 'none',
                                borderRadius: theme.borderRadius.md,
                                fontSize: theme.fontSize.base,
                                fontWeight: theme.fontWeight.semibold,
                                cursor: state === 'submitting' ? 'default' : 'pointer',
                                opacity: state === 'submitting' ? 0.7 : 1,
                            }}
                        >
                            {state === 'submitting' ? 'Updating…' : 'Update password'}
                        </button>
                        <p style={{ marginTop: theme.spacing.lg, fontSize: theme.fontSize.sm }}>
                            <Link to="/login" style={{ color: theme.colors.primary[600] }}>
                                Back to sign in
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
