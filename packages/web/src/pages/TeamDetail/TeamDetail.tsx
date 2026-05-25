import React, { useState } from 'react';
import { InviteModal } from '../../components/InviteModal';
import { JoinRequestsPanel } from '../../components/JoinRequestsPanel';
import { TeamLogo } from '../../components/team';
import PlayerForm from './PlayerForm';
import RosterImport from './RosterImport';
import RosterTable from './RosterTable';
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
    ImportButton,
    SettingsButton,
    Content,
    LoadingText,
    ErrorText,
    BackLink,
} from './styles';
import { useTeamDetail } from './useTeamDetail';

const TeamDetail: React.FC = () => {
    const state = useTeamDetail();
    const {
        navigate,
        team_id,
        team,
        players,
        loading,
        readOnly,
        showAddPlayer,
        setShowAddPlayer,
        handleEdit,
        handleDelete,
        loadPlayers,
    } = state;

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

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
                        {(team.team_type || team.season || team.year) && (
                            <Subtitle>
                                {[
                                    team.team_type === 'high_school'
                                        ? 'High School'
                                        : team.team_type === 'travel'
                                          ? 'Travel'
                                          : team.team_type === 'club'
                                            ? 'Club'
                                            : team.team_type === 'college'
                                              ? 'College'
                                              : '',
                                    team.season && team.year
                                        ? `${team.season} ${team.year}`
                                        : team.season || (team.year ? `${team.year}` : ''),
                                ]
                                    .filter(Boolean)
                                    .join(' \u00B7 ')}
                            </Subtitle>
                        )}
                    </TeamInfo>
                </HeaderLeft>
                <HeaderRight>
                    {/* Bullpen/Opponents/Scouting remain read-only entry points
                        for org_view; settings + write affordances are hidden. */}
                    <SettingsButton onClick={() => navigate(`/teams/${team_id}/bullpen`)}>Bullpen</SettingsButton>
                    <SettingsButton onClick={() => navigate(`/teams/${team_id}/opponents`)}>Opponents</SettingsButton>
                    <SettingsButton onClick={() => navigate(`/teams/${team_id}/scouting`)}>Scouting</SettingsButton>
                    {!readOnly && (
                        <>
                            <SettingsButton onClick={() => navigate(`/teams/${team_id}/settings`)}>Settings</SettingsButton>
                            <AddButton onClick={() => setShowInviteModal(true)}>Invite</AddButton>
                            <ImportButton onClick={() => setShowImportModal(true)}>Import Roster</ImportButton>
                            {!showAddPlayer && <AddButton onClick={() => setShowAddPlayer(true)}>+ Add Player</AddButton>}
                        </>
                    )}
                </HeaderRight>
            </Header>

            {readOnly && (
                <div
                    style={{
                        background: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        color: 'var(--surface-text-muted)',
                        padding: '0.5rem 1rem',
                        margin: '0 1rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        textAlign: 'center',
                    }}
                >
                    View-only — you can browse this team because it's in your organization, but you can't make changes.
                </div>
            )}

            <Content>
                {!readOnly && <JoinRequestsPanel teamId={team_id!} players={players} />}

                {showAddPlayer && !readOnly && <PlayerForm state={state} />}

                <RosterTable
                    teamId={team_id!}
                    players={players}
                    showAddPlayer={showAddPlayer}
                    onAddPlayer={() => setShowAddPlayer(true)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    readOnly={readOnly}
                />
            </Content>

            {showInviteModal && <InviteModal teamId={team_id!} players={players} onClose={() => setShowInviteModal(false)} />}
            {showImportModal && (
                <RosterImport
                    teamId={team_id!}
                    onClose={() => setShowImportModal(false)}
                    onImported={() => {
                        loadPlayers();
                        setShowImportModal(false);
                    }}
                />
            )}
        </Container>
    );
};

export default TeamDetail;
