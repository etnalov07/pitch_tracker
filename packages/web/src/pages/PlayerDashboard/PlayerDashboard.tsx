import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { playerService, type MyPlayerRecord } from '../../services/playerService';
import { logout, useAppDispatch, useAppSelector } from '../../state';
import type { MyPlayerStats } from '../../types';
import {
    Container,
    Header,
    HeaderLeft,
    HeaderRight,
    TeamName,
    SubLine,
    TeamSwitcher,
    LogoutButton,
    MainContent,
    Section,
    SectionTitle,
    StatsPlaceholder,
    EmptyState,
    EmptyTitle,
    EmptyText,
    StatBlock,
    StatBlockTitle,
    StatGrid,
    StatItem,
    StatItemValue,
    StatItemLabel,
    GameList,
    GameRow,
    GameDate,
    GameOpponent,
    GameResult,
    GameLines,
    GameLine,
} from './styles';

const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const PlayerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);

    const [records, setRecords] = useState<MyPlayerRecord[] | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const [stats, setStats] = useState<MyPlayerStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        playerService
            .getMyPlayers()
            .then((rows) => {
                if (!cancelled) setRecords(rows);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const msg = err instanceof Error ? err.message : 'Failed to load your teams';
                setError(msg);
                setRecords([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const activeTeamId = records && records.length > 0 ? records[Math.min(activeIdx, records.length - 1)].team_id : undefined;

    useEffect(() => {
        if (!activeTeamId) return;
        let cancelled = false;
        setStats(null);
        setStatsError(null);
        setStatsLoading(true);
        playerService
            .getMyStats(activeTeamId)
            .then((s) => {
                if (!cancelled) setStats(s);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setStatsError(err instanceof Error ? err.message : 'Failed to load your stats');
            })
            .finally(() => {
                if (!cancelled) setStatsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [activeTeamId]);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    if (records === null) {
        return (
            <Container>
                <Header>
                    <HeaderLeft>
                        <TeamName>Loading…</TeamName>
                    </HeaderLeft>
                </Header>
            </Container>
        );
    }

    // No team membership yet — redirect to onboarding screen
    if (records.length === 0) {
        return (
            <Container>
                <Header>
                    <HeaderLeft>
                        <TeamName>Hi {user?.first_name || 'there'}</TeamName>
                    </HeaderLeft>
                    <HeaderRight>
                        <LogoutButton onClick={handleLogout}>Sign Out</LogoutButton>
                    </HeaderRight>
                </Header>
                <MainContent>
                    <EmptyState>
                        <EmptyTitle>Waiting for your coach</EmptyTitle>
                        <EmptyText>
                            {error || 'No team yet. Ask your coach to add you, or paste your invite link below to get connected.'}
                        </EmptyText>
                        <p style={{ marginTop: 16 }}>
                            <button onClick={() => navigate('/onboarding/player')}>Paste invite link</button>
                        </p>
                    </EmptyState>
                </MainContent>
            </Container>
        );
    }

    const active = records[Math.min(activeIdx, records.length - 1)];
    const batting = stats?.batting ?? null;
    const pitching = stats?.pitching ?? null;
    const hasStats = !!batting || !!pitching;

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <TeamName>{active.team_name || 'My Team'}</TeamName>
                    <SubLine>
                        {user?.first_name} {user?.last_name}
                        {active.jersey_number !== undefined && active.jersey_number !== null ? ` · #${active.jersey_number}` : ''}
                        {active.primary_position ? ` · ${active.primary_position}` : ''}
                    </SubLine>
                </HeaderLeft>
                <HeaderRight>
                    {records.length > 1 && (
                        <TeamSwitcher value={activeIdx} onChange={(e) => setActiveIdx(parseInt(e.target.value, 10))}>
                            {records.map((r, i) => (
                                <option key={r.id} value={i}>
                                    {r.team_name || 'Team'}
                                </option>
                            ))}
                        </TeamSwitcher>
                    )}
                    <LogoutButton onClick={handleLogout}>Sign Out</LogoutButton>
                </HeaderRight>
            </Header>
            <MainContent>
                <Section>
                    <SectionTitle>My Stats</SectionTitle>
                    {statsLoading && <StatsPlaceholder>Loading your stats…</StatsPlaceholder>}
                    {!statsLoading && statsError && <StatsPlaceholder>{statsError}</StatsPlaceholder>}
                    {!statsLoading && !statsError && !hasStats && (
                        <StatsPlaceholder>
                            No game stats recorded yet. Your batting and pitching lines show up here once your coach charts a game
                            you played in.
                        </StatsPlaceholder>
                    )}
                    {!statsLoading && !statsError && batting && (
                        <StatBlock>
                            <StatBlockTitle>Batting</StatBlockTitle>
                            <StatGrid>
                                <StatItem>
                                    <StatItemValue>{batting.batting_average}</StatItemValue>
                                    <StatItemLabel>AVG</StatItemLabel>
                                </StatItem>
                                <StatItem>
                                    <StatItemValue>{batting.games}</StatItemValue>
                                    <StatItemLabel>G</StatItemLabel>
                                </StatItem>
                                <StatItem>
                                    <StatItemValue>{batting.at_bats}</StatItemValue>
                                    <StatItemLabel>AB</StatItemLabel>
                                </StatItem>
                                <StatItem>
                                    <StatItemValue>{batting.hits}</StatItemValue>
                                    <StatItemLabel>H</StatItemLabel>
                                </StatItem>
                                <StatItem>
                                    <StatItemValue>{batting.rbi}</StatItemValue>
                                    <StatItemLabel>RBI</StatItemLabel>
                                </StatItem>
                                <StatItem>
                                    <StatItemValue>{batting.runs}</StatItemValue>
                                    <StatItemLabel>R</StatItemLabel>
                                </StatItem>
                                <StatItem>
                                    <StatItemValue>{batting.walks}</StatItemValue>
                                    <StatItemLabel>BB</StatItemLabel>
                                </StatItem>
                                <StatItem>
                                    <StatItemValue>{batting.strikeouts}</StatItemValue>
                                    <StatItemLabel>K</StatItemLabel>
                                </StatItem>
                            </StatGrid>
                        </StatBlock>
                    )}
                    {!statsLoading && !statsError && pitching && (
                        <StatBlock>
                            <StatBlockTitle>Pitching</StatBlockTitle>
                            <StatGrid>
                                <StatItem>
                                    <StatItemValue>{pitching.strike_percentage}%</StatItemValue>
                                    <StatItemLabel>Strikes</StatItemLabel>
                                </StatItem>
                                <StatItem>
                                    <StatItemValue>{pitching.games}</StatItemValue>
                                    <StatItemLabel>G</StatItemLabel>
                                </StatItem>
                                <StatItem>
                                    <StatItemValue>{pitching.batters_faced}</StatItemValue>
                                    <StatItemLabel>BF</StatItemLabel>
                                </StatItem>
                                <StatItem>
                                    <StatItemValue>{pitching.total_pitches}</StatItemValue>
                                    <StatItemLabel>Pitches</StatItemLabel>
                                </StatItem>
                                <StatItem>
                                    <StatItemValue>{pitching.strikes}</StatItemValue>
                                    <StatItemLabel>Strikes</StatItemLabel>
                                </StatItem>
                                <StatItem>
                                    <StatItemValue>{pitching.balls}</StatItemValue>
                                    <StatItemLabel>Balls</StatItemLabel>
                                </StatItem>
                            </StatGrid>
                        </StatBlock>
                    )}
                </Section>
                <Section>
                    <SectionTitle>Recent Games</SectionTitle>
                    {statsLoading && <StatsPlaceholder>Loading…</StatsPlaceholder>}
                    {!statsLoading && (!stats || stats.games.length === 0) && (
                        <StatsPlaceholder>No games played yet.</StatsPlaceholder>
                    )}
                    {!statsLoading && stats && stats.games.length > 0 && (
                        <GameList>
                            {stats.games.map((game) => {
                                const scoreText =
                                    game.team_score !== null && game.opponent_score !== null
                                        ? `${game.result ?? ''} ${game.team_score}-${game.opponent_score}`.trim()
                                        : '—';
                                return (
                                    <GameRow key={game.game_id}>
                                        <GameDate>{formatDate(game.game_date)}</GameDate>
                                        <GameOpponent>{game.opponent_name || 'Opponent'}</GameOpponent>
                                        <GameLines>
                                            {game.batting_line && <GameLine>{game.batting_line}</GameLine>}
                                            {game.pitching_line && <GameLine>{game.pitching_line}</GameLine>}
                                            {!game.batting_line && !game.pitching_line && <GameLine>—</GameLine>}
                                        </GameLines>
                                        <GameResult result={game.result}>{scoreText}</GameResult>
                                    </GameRow>
                                );
                            })}
                        </GameList>
                    )}
                </Section>
            </MainContent>
        </Container>
    );
};

export default PlayerDashboard;
