import React, { useState } from 'react';
import { TeamLogo } from '../../components/team';
import { InviteModal } from '../../components/InviteModal';
import { JoinRequestsPanel } from '../../components/JoinRequestsPanel';
import PlayerForm from './PlayerForm';
import RosterTable from './RosterTable';
import { useTeamDetail } from './useTeamDetail';
import {
    Container,
    Header,
    HeaderLeft,
    HeaderRight,
    BackButton,
    TeamInfo,
    Title,
    Subtitle,
    AddButton,
    SettingsButton,
    Content,
    LoadingText,
    ErrorText,
    BackLink,
} from './styles';

const TeamDetail: React.FC = () => {
    const state = useTeamDetail();
    const {
        navigate, team_id,
        team, players, loading,
        showAddPlayer, setShowAddPlayer,
        handleEdit, handleDelete,
    } = state;

    const [showInviteModal, setShowInviteModal] = useState(false);

    if (loading) {
        return (
            <Container>
                <LoadingText>Loading team...</LoadingText>
            </Container>
        );
    }

    if (!team) {
        return (
            <Container>
                <ErrorText>Team not found</ErrorText>
                <BackLink onClick={() => navigate('/teams')}>Back to Teams</BackLink>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate('/teams')}>Back to Teams</BackButton>
                    <TeamLogo team={team} size="md" />
                    <TeamInfo>
                        <Title>{team.name}</Title>
                        {team.city && <Subtitle>{team.city}</Subtitle>}
                    </TeamInfo>
                </HeaderLeft>
                <HeaderRight>
                    <SettingsButton onClick={() => navigate(`/teams/${team_id}/settings`)}>Settings</SettingsButton>
                    <AddButton onClick={() => setShowInviteModal(true)}>Invite</AddButton>
                    {!showAddPlayer && <AddButton onClick={() => setShowAddPlayer(true)}>+ Add Player</AddButton>}
                </HeaderRight>
            </Header>

            <Content>
                <JoinRequestsPanel teamId={team_id!} players={players} />

                {showAddPlayer && <PlayerForm state={state} />}

                <RosterTable
                    teamId={team_id!}
                    players={players}
                    showAddPlayer={showAddPlayer}
                    onAddPlayer={() => setShowAddPlayer(true)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </Content>

            {showInviteModal && (
                <InviteModal
                    teamId={team_id!}
                    players={players}
                    onClose={() => setShowInviteModal(false)}
                />
            )}
        </Container>
    );
};

export default TeamDetail;
