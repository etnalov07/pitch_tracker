import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAppDispatch, useAppSelector, fetchInviteByToken, acceptInvite, setCredentials } from '../../state';
import { theme } from '../../styles/theme';
import type { User } from '../../types';
import {
    Container,
    Card,
    Title,
    Subtitle,
    InviteInfo,
    InfoRow,
    InfoLabel,
    InfoValue,
    AcceptButton,
    BackLink,
    ErrorText,
    SuccessText,
    LoadingText,
} from './styles';

const InviteAccept: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    const { currentInvite, loading, error } = useAppSelector((state) => state.invites);
    const [accepted, setAccepted] = useState(false);
    const [signupMode, setSignupMode] = useState(false);
    const [signupForm, setSignupForm] = useState({ first_name: '', last_name: '', password: '' });
    const [signupError, setSignupError] = useState<string | null>(null);
    const [signupBusy, setSignupBusy] = useState(false);

    useEffect(() => {
        if (token) {
            dispatch(fetchInviteByToken(token));
        }
    }, [token, dispatch]);

    const handleAccept = async () => {
        if (!token) return;

        if (!isAuthenticated) {
            navigate(`/login?redirect=/invite/${token}`);
            return;
        }

        const result = await dispatch(acceptInvite(token));
        if (acceptInvite.fulfilled.match(result)) {
            setAccepted(true);
        }
    };

    const handleSignupSubmit = async () => {
        if (!token) return;
        setSignupError(null);
        if (signupForm.password.length < 8) {
            setSignupError('Password must be at least 8 characters');
            return;
        }
        if (!signupForm.first_name.trim() || !signupForm.last_name.trim()) {
            setSignupError('First and last name required');
            return;
        }
        setSignupBusy(true);
        try {
            const response = await api.post<{ user: User; token: string; team_id: string }>(
                `/invites/token/${token}/register`,
                signupForm
            );
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            dispatch(setCredentials({ user: response.data.user, token: response.data.token }));
            setAccepted(true);
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Sign-up failed';
            setSignupError(msg);
        } finally {
            setSignupBusy(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <Card>
                    <LoadingText>Loading invite details...</LoadingText>
                </Card>
            </Container>
        );
    }

    if (accepted) {
        return (
            <Container>
                <Card>
                    <Title>You're In!</Title>
                    <SuccessText>You have successfully joined the team.</SuccessText>
                    <BackLink onClick={() => navigate('/')}>Go to Dashboard</BackLink>
                </Card>
            </Container>
        );
    }

    return (
        <Container>
            <Card>
                <Title>Team Invite</Title>
                <Subtitle>You've been invited to join a team</Subtitle>

                {error && <ErrorText>{error}</ErrorText>}

                {currentInvite ? (
                    <>
                        <InviteInfo>
                            <InfoRow>
                                <InfoLabel>Team</InfoLabel>
                                <InfoValue>{currentInvite.team_name || 'Team'}</InfoValue>
                            </InfoRow>
                            <InfoRow>
                                <InfoLabel>Role</InfoLabel>
                                <InfoValue>{currentInvite.role}</InfoValue>
                            </InfoRow>
                            {currentInvite.player_name && (
                                <InfoRow>
                                    <InfoLabel>Player</InfoLabel>
                                    <InfoValue>{currentInvite.player_name}</InfoValue>
                                </InfoRow>
                            )}
                            <InfoRow>
                                <InfoLabel>Invited by</InfoLabel>
                                <InfoValue>{currentInvite.inviter_name || 'Coach'}</InfoValue>
                            </InfoRow>
                        </InviteInfo>

                        {isAuthenticated || !signupMode ? (
                            <AcceptButton onClick={handleAccept} disabled={loading}>
                                {isAuthenticated ? 'Accept Invite' : 'Sign In to Accept'}
                            </AcceptButton>
                        ) : null}

                        {!isAuthenticated && !signupMode && (
                            <button
                                onClick={() => setSignupMode(true)}
                                style={{
                                    width: '100%',
                                    marginTop: theme.spacing.sm,
                                    padding: theme.spacing.sm,
                                    backgroundColor: 'transparent',
                                    color: theme.colors.primary[700],
                                    border: `1px solid ${theme.colors.primary[600]}`,
                                    borderRadius: theme.borderRadius.md,
                                    cursor: 'pointer',
                                    fontWeight: theme.fontWeight.semibold,
                                }}
                            >
                                Create account from this invite
                            </button>
                        )}

                        {!isAuthenticated && signupMode && (
                            <div
                                style={{
                                    marginTop: theme.spacing.md,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: theme.spacing.sm,
                                }}
                            >
                                {signupError && <ErrorText>{signupError}</ErrorText>}
                                {currentInvite.invited_email && (
                                    <p style={{ color: theme.colors.gray[700], margin: 0, fontSize: theme.fontSize.sm }}>
                                        Creating an account for <strong>{currentInvite.invited_email}</strong>
                                    </p>
                                )}
                                <input
                                    type="text"
                                    placeholder="First name"
                                    value={signupForm.first_name}
                                    onChange={(e) => setSignupForm({ ...signupForm, first_name: e.target.value })}
                                    style={{
                                        padding: theme.spacing.sm,
                                        borderRadius: theme.borderRadius.md,
                                        border: `1px solid ${theme.colors.gray[300]}`,
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="Last name"
                                    value={signupForm.last_name}
                                    onChange={(e) => setSignupForm({ ...signupForm, last_name: e.target.value })}
                                    style={{
                                        padding: theme.spacing.sm,
                                        borderRadius: theme.borderRadius.md,
                                        border: `1px solid ${theme.colors.gray[300]}`,
                                    }}
                                />
                                <input
                                    type="password"
                                    placeholder="Password (min 8 chars)"
                                    value={signupForm.password}
                                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                                    style={{
                                        padding: theme.spacing.sm,
                                        borderRadius: theme.borderRadius.md,
                                        border: `1px solid ${theme.colors.gray[300]}`,
                                    }}
                                />
                                <AcceptButton onClick={handleSignupSubmit} disabled={signupBusy}>
                                    {signupBusy ? 'Creating account…' : 'Create account & accept'}
                                </AcceptButton>
                                <BackLink onClick={() => setSignupMode(false)}>← Back</BackLink>
                            </div>
                        )}
                    </>
                ) : (
                    !error && <ErrorText>This invite is no longer valid or has expired.</ErrorText>
                )}

                <BackLink onClick={() => navigate('/')}>Back to Home</BackLink>
            </Card>
        </Container>
    );
};

export default InviteAccept;
