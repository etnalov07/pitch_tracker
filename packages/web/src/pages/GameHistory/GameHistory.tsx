import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, fetchAllGames, fetchAllTeams, deleteGame } from '../../state';
import { theme } from '../../styles/theme';
import type { GameStatus as GameStatusType } from '../../types';
import {
    Container,
    Header,
    HeaderLeft,
    BackButton,
    Title,
    HeaderRight,
    CreateButton,
    Content,
    FilterBar,
    FilterButton,
    LoadingText,
    EmptyState,
    EmptyIcon,
    EmptyTitle,
    EmptyText,
    CreateButtonLarge,
    GamesTable,
    Th,
    GameRow,
    Td,
    DateCell,
    DateText,
    TimeText,
    MatchupCell,
    TeamText,
    AtText,
    ScoreCell,
    ScoreTeam,
    ScoreValue,
    ScoreDivider,
    NoScore,
    LocationText,
    StatusBadge,
    LiveDot,
    InningText,
    ActionButtons,
    ViewButton,
    DeleteButton,
} from './styles';

const GameHistory: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { games, loading: gamesLoading } = useAppSelector((state) => state.games);
    const { teamList: teams, loading: teamsLoading } = useAppSelector((state) => state.teams);

    const loading = gamesLoading || teamsLoading;
    const [filter, setFilter] = useState<'all' | 'completed' | 'scheduled' | 'in_progress'>('all');

    useEffect(() => {
        dispatch(fetchAllGames());
        dispatch(fetchAllTeams());
    }, [dispatch]);

    const getTeamName = (team_id: string) => {
        const team = teams.find((t) => t.id === team_id);
        return team?.name || 'Unknown Team';
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const filteredGames = games
        .filter((g) => filter === 'all' || g.status === filter)
        .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime());

    const handleDelete = async (gameId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this game? This cannot be undone.')) {
            return;
        }

        try {
            await dispatch(deleteGame(gameId)).unwrap();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to delete game');
        }
    };

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate('/')}>Back</BackButton>
                    <Title>Game History</Title>
                </HeaderLeft>
                <HeaderRight>
                    <CreateButton onClick={() => navigate('/games/new')}>+ New Game</CreateButton>
                </HeaderRight>
            </Header>

            <Content>
                <FilterBar>
                    <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
                        All ({games.length})
                    </FilterButton>
                    <FilterButton active={filter === 'in_progress'} onClick={() => setFilter('in_progress')}>
                        Live ({games.filter((g) => g.status === 'in_progress').length})
                    </FilterButton>
                    <FilterButton active={filter === 'scheduled'} onClick={() => setFilter('scheduled')}>
                        Scheduled ({games.filter((g) => g.status === 'scheduled').length})
                    </FilterButton>
                    <FilterButton active={filter === 'completed'} onClick={() => setFilter('completed')}>
                        Completed ({games.filter((g) => g.status === 'completed').length})
                    </FilterButton>
                </FilterBar>

                {loading ? (
                    <LoadingText>Loading games...</LoadingText>
                ) : filteredGames.length === 0 ? (
                    <EmptyState>
                        <EmptyIcon>&#9918;</EmptyIcon>
                        <EmptyTitle>{filter === 'all' ? 'No Games Yet' : `No ${filter.replace('_', ' ')} games`}</EmptyTitle>
                        <EmptyText>
                            {filter === 'all'
                                ? 'Create your first game to start tracking!'
                                : 'Games matching this filter will appear here.'}
                        </EmptyText>
                        {filter === 'all' && (
                            <CreateButtonLarge onClick={() => navigate('/games/new')}>Create Game</CreateButtonLarge>
                        )}
                    </EmptyState>
                ) : (
                    <GamesTable>
                        <thead>
                            <tr>
                                <Th>Date</Th>
                                <Th>Matchup</Th>
                                <Th>Score</Th>
                                <Th>Location</Th>
                                <Th>Status</Th>
                                <Th>Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGames.map((game) => (
                                <GameRow key={game.id} onClick={() => navigate(`/game/${game.id}`)}>
                                    <Td>
                                        <DateCell>
                                            <DateText>{formatDate(game.game_date)}</DateText>
                                            <TimeText>{formatTime(game.game_date)}</TimeText>
                                        </DateCell>
                                    </Td>
                                    <Td>
                                        <MatchupCell>
                                            <TeamText>{getTeamName(game.away_team_id)}</TeamText>
                                            <AtText>@</AtText>
                                            <TeamText>{getTeamName(game.home_team_id)}</TeamText>
                                        </MatchupCell>
                                    </Td>
                                    <Td>
                                        {game.status === 'completed' || game.status === 'in_progress' ? (
                                            <ScoreCell>
                                                <ScoreTeam>
                                                    <ScoreValue>{game.away_score ?? 0}</ScoreValue>
                                                </ScoreTeam>
                                                <ScoreDivider>-</ScoreDivider>
                                                <ScoreTeam>
                                                    <ScoreValue>{game.home_score ?? 0}</ScoreValue>
                                                </ScoreTeam>
                                            </ScoreCell>
                                        ) : (
                                            <NoScore>-</NoScore>
                                        )}
                                    </Td>
                                    <Td>
                                        <LocationText>{game.location || 'TBD'}</LocationText>
                                    </Td>
                                    <Td>
                                        <StatusBadge color={getStatusColor(game.status)}>
                                            {game.status === 'in_progress' && <LiveDot />}
                                            {getStatusLabel(game.status)}
                                        </StatusBadge>
                                        {game.status === 'in_progress' && game.current_inning && (
                                            <InningText>
                                                {game.inning_half === 'top' ? 'Top' : 'Bot'} {game.current_inning}
                                            </InningText>
                                        )}
                                    </Td>
                                    <Td>
                                        <ActionButtons>
                                            <ViewButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/game/${game.id}`);
                                                }}
                                            >
                                                {game.status === 'in_progress' ? 'Track' : 'View'}
                                            </ViewButton>
                                            <DeleteButton onClick={(e) => handleDelete(game.id, e)}>Delete</DeleteButton>
                                        </ActionButtons>
                                    </Td>
                                </GameRow>
                            ))}
                        </tbody>
                    </GamesTable>
                )}
            </Content>
        </Container>
    );
};

export default GameHistory;
