import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, useAppDispatch } from '../../state';
import { theme } from '../../styles/theme';

const tokenFromInput = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Accept either the raw token or a full /invite/:token URL
    const match = trimmed.match(/\/invite\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
    return trimmed;
};

const PlayerWaiting: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [link, setLink] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleGo = () => {
        const token = tokenFromInput(link);
        if (!token) {
            setError('Paste your invite link or token to continue.');
            return;
        }
        navigate(`/invite/${token}`);
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
                    Waiting for your coach
                </h1>
                <p style={{ color: theme.colors.gray[700], lineHeight: 1.5 }}>
                    Your coach will add you to a team and send an invite link. If you already have a link, paste it below to get
                    connected.
                </p>
                <input
                    type="text"
                    placeholder="Invite link or token"
                    value={link}
                    onChange={(e) => {
                        setLink(e.target.value);
                        if (error) setError(null);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGo();
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
                        onClick={handleGo}
                        style={{
                            flex: 1,
                            padding: theme.spacing.sm,
                            backgroundColor: theme.colors.primary[600],
                            color: 'white',
                            border: 'none',
                            borderRadius: theme.borderRadius.md,
                            fontSize: theme.fontSize.base,
                            fontWeight: theme.fontWeight.semibold,
                            cursor: 'pointer',
                        }}
                    >
                        Continue
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

export default PlayerWaiting;
