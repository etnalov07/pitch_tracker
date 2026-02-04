import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { theme } from '../../styles/theme';
import { useAppDispatch, useAppSelector } from '../../state';
import { fetchTeamJoinRequests, approveJoinRequest, denyJoinRequest } from '../../state/invites/invitesSlice';
import type { Player } from '../../types';

interface JoinRequestsPanelProps {
    teamId: string;
    players: Player[];
}

const JoinRequestsPanel: React.FC<JoinRequestsPanelProps> = ({ teamId, players }) => {
    const dispatch = useAppDispatch();
    const { teamJoinRequests } = useAppSelector((state) => state.invites);
    const [linkPlayerMap, setLinkPlayerMap] = useState<Record<string, string>>({});

    useEffect(() => {
        dispatch(fetchTeamJoinRequests(teamId));
    }, [teamId, dispatch]);

    const pendingRequests = teamJoinRequests.filter((r) => r.status === 'pending');

    if (pendingRequests.length === 0) return null;

    const unlinkedPlayers = players.filter((p) => !p.user_id);

    const handleApprove = (requestId: string) => {
        dispatch(approveJoinRequest({
            requestId,
            linkedPlayerId: linkPlayerMap[requestId] || undefined,
        }));
    };

    const handleDeny = (requestId: string) => {
        dispatch(denyJoinRequest(requestId));
    };

    return (
        <Container>
            <Title>Join Requests ({pendingRequests.length})</Title>
            <RequestList>
                {pendingRequests.map((request) => (
                    <RequestItem key={request.id}>
                        <RequestInfo>
                            <RequestName>
                                {[request.user_first_name, request.user_last_name].filter(Boolean).join(' ') || 'Unknown User'}
                            </RequestName>
                            {request.message && (
                                <RequestMessage>{request.message}</RequestMessage>
                            )}
                        </RequestInfo>

                        <RequestActions>
                            {unlinkedPlayers.length > 0 && (
                                <LinkSelect
                                    value={linkPlayerMap[request.id] || ''}
                                    onChange={(e) =>
                                        setLinkPlayerMap({ ...linkPlayerMap, [request.id]: e.target.value })
                                    }
                                >
                                    <option value="">Link to player...</option>
                                    {unlinkedPlayers.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            #{p.jersey_number ?? '-'} {p.first_name} {p.last_name}
                                        </option>
                                    ))}
                                </LinkSelect>
                            )}
                            <ApproveButton onClick={() => handleApprove(request.id)}>
                                Approve
                            </ApproveButton>
                            <DenyButton onClick={() => handleDeny(request.id)}>
                                Deny
                            </DenyButton>
                        </RequestActions>
                    </RequestItem>
                ))}
            </RequestList>
        </Container>
    );
};

export default JoinRequestsPanel;

// Styled components
const Container = styled.div({
    background: theme.colors.yellow[50],
    border: `1px solid ${theme.colors.yellow[200]}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
});

const Title = styled.h3({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.yellow[800],
    margin: `0 0 ${theme.spacing.md} 0`,
});

const RequestList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
});

const RequestItem = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'white',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.gray[200]}`,
    flexWrap: 'wrap',
    gap: theme.spacing.md,
});

const RequestInfo = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

const RequestName = styled.span({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
});

const RequestMessage = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    fontStyle: 'italic',
});

const RequestActions = styled.div({
    display: 'flex',
    gap: theme.spacing.md,
    alignItems: 'center',
});

const LinkSelect = styled.select({
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.xs,
    backgroundColor: 'white',
});

const ApproveButton = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.green[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: theme.colors.green[700],
    },
});

const DenyButton = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.red[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: theme.colors.red[700],
    },
});
