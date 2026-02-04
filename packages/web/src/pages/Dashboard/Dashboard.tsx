import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, logout, fetchAllGames, fetchAllTeams } from '../../state';
import { teamsApi } from '../../state/teams/api/teamsApi';
import { theme } from '../../styles/theme';
import type { GameStatus as GameStatusType, Player } from '../../types';
import {
    Container,
    Header,
    HeaderLeft,
    Logo,
    WelcomeText,
    HeaderRight,
    LogoutButton,
    MainContent,
    QuickActions,
    ActionCard,
    ActionIcon,
    ActionText,
    Section,
    SectionTitle,
    LiveDot,
    GameGrid,
    GameCard,
    GameStatus,
    GameTeams,
    TeamRow,
    TeamName,
    Score,
    GameInfo,
    InningInfo,
    TabContainer,
    TabButton,
    LoadingText,
    GameList,
    GameListItem,
    GameDate,
    GameMatchup,
    GameLocation,
    GameStatusBadge,
    ViewAllLink,
    GameScore,
    EmptyState,
    EmptyIcon,
    EmptyTitle,
    EmptyText,
    CreateButton,
    TeamGrid,
    TeamCard,
    TeamCardName,
    TeamCardCity,
    TeamCardAbbr,
    SectionHeader,
    TeamCardHeader,
    TeamCardInfo,
    ManageRosterButton,
    RosterList,
    RosterTitle,
    RosterItem,
    RosterPlayerInfo,
    RosterNumber,
    RosterName,
    RosterRight,
    HandednessBadge,
    ProfileButton,
    EmptyRoster,
} from './styles';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { user } = useAppSelector((state) => state.auth);
    const { games, loading: gamesLoading } = useAppSelector((state) => state.games);
    const { teamList: teams, loading: teamsLoading } = useAppSelector((state) => state.teams);

    const [activeTab, setActiveTab] = useState<'games' | 'teams'>('games');
    const [teamRosters, setTeamRosters] = useState<Record<string, Player[]>>({});

    const loading = gamesLoading || teamsLoading;

    useEffect(() => {
        dispatch(fetchAllGames());
        dispatch(fetchAllTeams());
    }, [dispatch]);

    // Fetch rosters for all teams when teams are loaded
    useEffect(() => {
        const fetchRosters = async () => {
            const rosters: Record<string, Player[]> = {};
            for (const team of teams) {
                try {
                    const teamWithPlayers = await teamsApi.getTeamRoster(team.id);
                    rosters[team.id] = teamWithPlayers.players || [];
                } catch {
                    rosters[team.id] = [];
                }
            }
            setTeamRosters(rosters);
        };

        if (teams.length > 0) {
            fetchRosters();
        }
    }, [teams]);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    const getStatusColor = (status: GameStatusType) => {
        switch (status) {
            case 'in_progress':
                return theme.colors.green[500];
            case 'completed':
                return theme.colors.gray[500];
            case 'scheduled':
                return theme.colors.primary[500];
            case 'cancelled':
                return theme.colors.red[500];
            default:
                return theme.colors.gray[500];
        }
    };

    const getStatusLabel = (status: GameStatusType) => {
        switch (status) {
            case 'in_progress':
                return 'Live';
            case 'completed':
                return 'Final';
            case 'scheduled':
                return 'Scheduled';
            case 'cancelled':
                return 'Cancelled';
            default:
                return status;
        }
    };

    const getTeamName = (team_id: string | null | undefined) => {
        if (!team_id) return 'Unknown Team';
        const team = teams.find((t) => t.id === team_id);
        return team?.name || 'Unknown Team';
    };

    const getOpponentName = (game: (typeof games)[0]) => {
        if (game.opponent_name) return game.opponent_name;
        return getTeamName(game.away_team_id);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const liveGames = games.filter((g) => g.status === 'in_progress');
    const upcomingGames = games.filter((g) => g.status === 'scheduled');
    const completedGames = games.filter((g) => g.status === 'completed');

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <Logo>Baseball Tracker</Logo>
                    <WelcomeText>Welcome back, {user?.first_name || 'Coach'}!</WelcomeText>
                </HeaderLeft>
                <HeaderRight>
                    <LogoutButton onClick={handleLogout}>Sign Out</LogoutButton>
                </HeaderRight>
            </Header>

            <MainContent>
                <QuickActions>
                    <ActionCard onClick={() => navigate('/games/new')}>
                        <ActionIcon>+</ActionIcon>
                        <ActionText>New Game</ActionText>
                    </ActionCard>
                    <ActionCard onClick={() => navigate('/teams/new')}>
                        <ActionIcon>+</ActionIcon>
                        <ActionText>New Team</ActionText>
                    </ActionCard>
                    <ActionCard onClick={() => navigate('/join-team')}>
                        <ActionIcon>&#128269;</ActionIcon>
                        <ActionText>Find Team</ActionText>
                    </ActionCard>
                </QuickActions>

                {liveGames.length > 0 && (
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <LiveDot /> Live Games
                            </SectionTitle>
                        </SectionHeader>
                        <GameGrid>
                            {liveGames.map((game) => (
                                <GameCard key={game.id} onClick={() => navigate(`/game/${game.id}`)} isLive>
                                    <GameStatus color={getStatusColor(game.status)}>{getStatusLabel(game.status)}</GameStatus>
                                    <GameTeams>
                                        <TeamRow>
                                            <TeamName>{getOpponentName(game)}</TeamName>
                                            <Score>{game.away_score ?? 0}</Score>
                                        </TeamRow>
                                        <TeamRow>
                                            <TeamName>{getTeamName(game.home_team_id)}</TeamName>
                                            <Score>{game.home_score ?? 0}</Score>
                                        </TeamRow>
                                    </GameTeams>
                                    <GameInfo>
                                        {game.current_inning && (
                                            <InningInfo>
                                                {game.inning_half === 'top' ? 'Top' : 'Bot'} {game.current_inning}
                                            </InningInfo>
                                        )}
                                    </GameInfo>
                                </GameCard>
                            ))}
                        </GameGrid>
                    </Section>
                )}

                <TabContainer>
                    <TabButton active={activeTab === 'games'} onClick={() => setActiveTab('games')}>
                        Games ({games.length})
                    </TabButton>
                    <TabButton active={activeTab === 'teams'} onClick={() => setActiveTab('teams')}>
                        Teams ({teams.length})
                    </TabButton>
                </TabContainer>

                {loading ? (
                    <LoadingText>Loading...</LoadingText>
                ) : activeTab === 'games' ? (
                    <>
                        {upcomingGames.length > 0 && (
                            <Section>
                                <SectionHeader>
                                    <SectionTitle>Upcoming Games</SectionTitle>
                                </SectionHeader>
                                <GameList>
                                    {upcomingGames.map((game) => (
                                        <GameListItem key={game.id} onClick={() => navigate(`/game/${game.id}`)}>
                                            <GameDate>{formatDate(game.game_date)}</GameDate>
                                            <GameMatchup>
                                                {getOpponentName(game)} @ {getTeamName(game.home_team_id)}
                                            </GameMatchup>
                                            <GameLocation>{game.location || 'TBD'}</GameLocation>
                                            <GameStatusBadge color={getStatusColor(game.status)}>
                                                {getStatusLabel(game.status)}
                                            </GameStatusBadge>
                                        </GameListItem>
                                    ))}
                                </GameList>
                            </Section>
                        )}

                        {completedGames.length > 0 && (
                            <Section>
                                <SectionHeader>
                                    <SectionTitle>Recent Games</SectionTitle>
                                    <ViewAllLink onClick={() => navigate('/games/history')}>View All</ViewAllLink>
                                </SectionHeader>
                                <GameList>
                                    {completedGames.slice(0, 5).map((game) => (
                                        <GameListItem key={game.id} onClick={() => navigate(`/game/${game.id}`)}>
                                            <GameDate>{formatDate(game.game_date)}</GameDate>
                                            <GameMatchup>
                                                {getOpponentName(game)} @ {getTeamName(game.home_team_id)}
                                            </GameMatchup>
                                            <GameScore>
                                                {game.away_score} - {game.home_score}
                                            </GameScore>
                                            <GameStatusBadge color={getStatusColor(game.status)}>
                                                {getStatusLabel(game.status)}
                                            </GameStatusBadge>
                                        </GameListItem>
                                    ))}
                                </GameList>
                            </Section>
                        )}

                        {games.length === 0 && (
                            <EmptyState>
                                <EmptyIcon>&#9918;</EmptyIcon>
                                <EmptyTitle>No Games Yet</EmptyTitle>
                                <EmptyText>Create your first game to start tracking pitches!</EmptyText>
                                <CreateButton onClick={() => navigate('/games/new')}>Create Game</CreateButton>
                            </EmptyState>
                        )}
                    </>
                ) : (
                    <Section>
                        {teams && teams.length > 0 ? (
                            <TeamGrid>
                                {teams?.map((team) => {
                                    const roster = teamRosters[team.id] || [];
                                    return (
                                        <TeamCard key={team.id}>
                                            <TeamCardHeader>
                                                <TeamCardInfo>
                                                    <TeamCardName>{team.name}</TeamCardName>
                                                    {team.city && <TeamCardCity>{team.city}</TeamCardCity>}
                                                    {team.abbreviation && <TeamCardAbbr>{team.abbreviation}</TeamCardAbbr>}
                                                </TeamCardInfo>
                                                <ManageRosterButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/teams/${team.id}`);
                                                    }}
                                                >
                                                    Manage Roster
                                                </ManageRosterButton>
                                            </TeamCardHeader>
                                            <RosterList>
                                                <RosterTitle>Roster ({roster.length})</RosterTitle>
                                                {roster.length > 0 ? (
                                                    roster.map((player) => (
                                                        <RosterItem key={player.id}>
                                                            <RosterPlayerInfo>
                                                                <RosterNumber>#{player.jersey_number ?? '-'}</RosterNumber>
                                                                <RosterName>
                                                                    {player.first_name} {player.last_name}
                                                                </RosterName>
                                                            </RosterPlayerInfo>
                                                            <RosterRight>
                                                                {player.primary_position === 'P' && (
                                                                    <>
                                                                        <HandednessBadge>
                                                                            {player.throws === 'L' ? 'LHP' : 'RHP'}
                                                                        </HandednessBadge>
                                                                        <ProfileButton
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate(`/teams/${team.id}/pitcher/${player.id}`);
                                                                            }}
                                                                        >
                                                                            Profile
                                                                        </ProfileButton>
                                                                    </>
                                                                )}
                                                            </RosterRight>
                                                        </RosterItem>
                                                    ))
                                                ) : (
                                                    <EmptyRoster>No players added yet</EmptyRoster>
                                                )}
                                            </RosterList>
                                        </TeamCard>
                                    );
                                })}
                            </TeamGrid>
                        ) : (
                            <EmptyState>
                                <EmptyIcon>&#128101;</EmptyIcon>
                                <EmptyTitle>No Teams Yet</EmptyTitle>
                                <EmptyText>Create your first team to get started!</EmptyText>
                                <CreateButton onClick={() => navigate('/teams/new')}>Create Team</CreateButton>
                            </EmptyState>
                        )}
                    </Section>
                )}
            </MainContent>
        </Container>
    );
};

export default Dashboard;
