import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, fetchInviteByToken, acceptInvite } from '../../state';
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

                        <AcceptButton onClick={handleAccept} disabled={loading}>
                            {isAuthenticated ? 'Accept Invite' : 'Sign In to Accept'}
                        </AcceptButton>
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
