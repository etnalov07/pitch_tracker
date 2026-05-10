import styled from '@emotion/styled';
import { BatterBreakdown, Game, GamePitcherWithPlayer, OpposingPitcher, PerformanceSummary } from '@pitch-tracker/shared';
import React, { useState, useEffect, useRef } from 'react';
import CountBreakdownPanel from '../../components/live/CountBreakdownPanel';
import PitcherStats from '../../components/live/PitcherStats';
import ViewerTendenciesTab from '../../components/live/ViewerTendenciesTab';
import { BatterBreakdownPanel, OpponentAttackSummary, PerformanceSummaryCard } from '../../components/performanceSummary';
import { opposingPitcherService } from '../../services/opposingPitcherService';
import { performanceSummaryService } from '../../services/performanceSummaryService';
import { gamesApi } from '../../state/games/api/gamesApi';
import { theme } from '../../styles/theme';

interface Props {
    game: Game;
    refreshTrigger: number;
    onExit?: () => void;
}

const NARRATIVE_POLL_INTERVAL_MS = 3000;
const NARRATIVE_POLL_MAX_ATTEMPTS = 10;

const ViewerDashboard: React.FC<Props> = ({ game, refreshTrigger, onExit }) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'counts' | 'breakdown' | 'tendencies' | 'summary'>('stats');
    const [breakdownTab, setBreakdownTab] = useState<'opponent' | 'our_team'>('opponent');
    const [allPitchers, setAllPitchers] = useState<GamePitcherWithPlayer[]>([]);
    const [activePitcher, setActivePitcher] = useState<GamePitcherWithPlayer | null>(null);
    const [selectedPitcherIdx, setSelectedPitcherIdx] = useState(0);
    const [allOpposingPitchers, setAllOpposingPitchers] = useState<OpposingPitcher[]>([]);
    const [pitcherSummaries, setPitcherSummaries] = useState<PerformanceSummary[]>([]);
    const [activePitcherIdx, setActivePitcherIdx] = useState(0);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [oppBreakdown, setOppBreakdown] = useState<BatterBreakdown[] | null>(null);
    const [myTeamBreakdown, setMyTeamBreakdown] = useState<BatterBreakdown[] | null>(null);
    const [breakdownLoading, setBreakdownLoading] = useState(false);
    const breakdownFetchedRef = useRef(false);
    const pollAttemptsRef = useRef(0);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        gamesApi
            .getGamePitchers(game.id)
            .then((pitchers) => {
                setAllPitchers(pitchers);
                const active = pitchers.find((p) => !p.inning_exited) ?? pitchers[pitchers.length - 1] ?? null;
                setActivePitcher(active);
                const activeIdx = active ? pitchers.findIndex((p) => p.player_id === active.player_id) : 0;
                setSelectedPitcherIdx(Math.max(0, activeIdx));
            })
            .catch(() => {});
        opposingPitcherService
            .getByGame(game.id)
            .then((pitchers) => {
                setAllOpposingPitchers(pitchers);
            })
            .catch(() => {});
    }, [game.id, refreshTrigger]);

    // Batter breakdown — re-fetch whenever the tab is active or a new pitch is logged
    useEffect(() => {
        if (activeTab !== 'breakdown') return;
        if (!breakdownFetchedRef.current) setBreakdownLoading(true);
        Promise.all([
            performanceSummaryService.getBatterBreakdown(game.id),
            game.charting_mode === 'both' || game.charting_mode === 'opp_pitcher'
                ? performanceSummaryService.getMyTeamBatterBreakdown(game.id)
                : Promise.resolve([]),
        ])
            .then(([opp, mine]) => {
                setOppBreakdown(opp);
                setMyTeamBreakdown(mine);
                breakdownFetchedRef.current = true;
            })
            .catch(() => {})
            .finally(() => setBreakdownLoading(false));
    }, [activeTab, game.id, game.charting_mode, refreshTrigger]);

    const isScoutingMode = game.charting_mode === 'scouting';
    const summarySourceType = isScoutingMode ? 'scouting' : 'game';

    useEffect(() => {
        if (activeTab !== 'summary' || pitcherSummaries.length > 0) return;
        setSummaryLoading(true);
        const fetch = isScoutingMode
            ? performanceSummaryService.getSummary(summarySourceType, game.id).then((s) => (s ? [s] : []))
            : performanceSummaryService.getGamePitcherSummaries(game.id);
        fetch
            .then((s) => {
                setPitcherSummaries(s);
                setActivePitcherIdx(0);
            })
            .catch(() => {})
            .finally(() => setSummaryLoading(false));
    }, [activeTab, game.id, pitcherSummaries.length, summarySourceType, isScoutingMode]);

    const activeSummary = pitcherSummaries[activePitcherIdx] ?? null;

    // Poll until narrative arrives on the active summary
    useEffect(() => {
        if (!activeSummary || activeSummary.narrative) {
            pollAttemptsRef.current = 0;
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
            return;
        }
        if (pollAttemptsRef.current >= NARRATIVE_POLL_MAX_ATTEMPTS) return;
        pollTimerRef.current = setTimeout(() => {
            pollAttemptsRef.current += 1;
            const fetch = isScoutingMode
                ? performanceSummaryService.getSummary(summarySourceType, game.id).then((s) => (s ? [s] : []))
                : performanceSummaryService.getGamePitcherSummaries(game.id);
            fetch.then((s) => setPitcherSummaries(s)).catch(() => {});
        }, NARRATIVE_POLL_INTERVAL_MS);
        return () => {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
    }, [activeSummary, game.id, summarySourceType, isScoutingMode]);

    const handleRegenerate = async () => {
        if (!activeSummary) return;
        setRegenerating(true);
        try {
            await performanceSummaryService.regenerateNarrative(activeSummary.id);
            const updated = isScoutingMode
                ? performanceSummaryService.getSummary(summarySourceType, game.id).then((s) => (s ? [s] : []))
                : performanceSummaryService.getGamePitcherSummaries(game.id);
            updated.then((s) => setPitcherSummaries(s)).catch(() => {});
        } finally {
            setRegenerating(false);
        }
    };

    const selectedPitcher = allPitchers[selectedPitcherIdx] ?? activePitcher;
    const pitcherId = selectedPitcher?.player_id;
    const pitcherName = selectedPitcher?.player
        ? `${selectedPitcher.player.first_name} ${selectedPitcher.player.last_name}`
        : 'Our Pitcher';
    const currentOpposingPitcher = allOpposingPitchers[allOpposingPitchers.length - 1] ?? null;
    const opponentPitcherName = currentOpposingPitcher?.pitcher_name ?? 'Opponent Pitcher';

    const score = `${game.home_score} – ${game.away_score}`;
    const inningLabel = `${game.inning_half === 'top' ? '▲' : '▼'} ${game.current_inning}`;

    return (
        <Wrapper>
            <Header>
                <ScoreRow>
                    <TeamLabel>{game.home_team_name ?? 'Home'}</TeamLabel>
                    <Score>{score}</Score>
                    <TeamLabel>{game.opponent_name ?? 'Away'}</TeamLabel>
                </ScoreRow>
                <InningBadge>{inningLabel}</InningBadge>
                <ViewerBadge>VIEWER</ViewerBadge>
                {onExit && <ExitButton onClick={onExit}>← Dashboard</ExitButton>}
            </Header>

            <TabRow>
                <Tab active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>
                    Pitcher Stats
                </Tab>
                <Tab active={activeTab === 'counts'} onClick={() => setActiveTab('counts')}>
                    Count Breakdown
                </Tab>
                <Tab active={activeTab === 'breakdown'} onClick={() => setActiveTab('breakdown')}>
                    Batter Breakdown
                </Tab>
                <Tab active={activeTab === 'tendencies'} onClick={() => setActiveTab('tendencies')}>
                    Tendencies
                </Tab>
                {game.status === 'completed' && (
                    <Tab active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>
                        {isScoutingMode ? 'Scouting Report' : 'Performance Summary'}
                    </Tab>
                )}
            </TabRow>

            <Content>
                {(activeTab === 'stats' || activeTab === 'counts') && allPitchers.length > 1 && (
                    <PitcherTabRow>
                        {allPitchers.map((p, i) => {
                            const name = p.player ? `${p.player.first_name} ${p.player.last_name}` : `Pitcher ${i + 1}`;
                            return (
                                <PitcherTab
                                    key={p.player_id}
                                    active={i === selectedPitcherIdx}
                                    onClick={() => setSelectedPitcherIdx(i)}
                                >
                                    {name}
                                    {!p.inning_exited && (
                                        <span
                                            style={{
                                                marginLeft: 4,
                                                fontSize: 10,
                                                color: theme.colors.green[600],
                                                fontWeight: 700,
                                            }}
                                        >
                                            ●
                                        </span>
                                    )}
                                </PitcherTab>
                            );
                        })}
                    </PitcherTabRow>
                )}
                {activeTab === 'stats' && pitcherId && (
                    <PitcherStats gameId={game.id} pitcherId={pitcherId} refreshTrigger={refreshTrigger} />
                )}
                {activeTab === 'counts' && (
                    <CountBreakdownPanel gameId={game.id} pitcherId={pitcherId} refreshTrigger={refreshTrigger} />
                )}
                {activeTab === 'breakdown' && (
                    <BreakdownWrapper>
                        {game.charting_mode === 'both' && (
                            <BreakdownTabRow>
                                <BreakdownTab active={breakdownTab === 'opponent'} onClick={() => setBreakdownTab('opponent')}>
                                    Opponent Lineup
                                </BreakdownTab>
                                <BreakdownTab active={breakdownTab === 'our_team'} onClick={() => setBreakdownTab('our_team')}>
                                    Our Lineup
                                </BreakdownTab>
                            </BreakdownTabRow>
                        )}
                        {isScoutingMode ? (
                            <BatterBreakdownPanel
                                sections={[
                                    {
                                        title: `${game.opponent_name || 'Away Team'} Lineup`,
                                        batters: (oppBreakdown ?? []).filter((b) => b.team_side === 'away'),
                                    },
                                    {
                                        title: `${game.scouting_home_team || 'Home Team'} Lineup`,
                                        batters: (oppBreakdown ?? []).filter((b) => b.team_side === 'home'),
                                    },
                                ]}
                                loading={breakdownLoading}
                                gameId={game.id}
                            />
                        ) : game.charting_mode === 'opp_pitcher' ? (
                            <BatterBreakdownPanel
                                sections={[{ title: `Our Lineup vs. ${opponentPitcherName}`, batters: myTeamBreakdown ?? [] }]}
                                loading={breakdownLoading}
                                gameId={game.id}
                                opponentTeamId={game.opponent_team_id ?? undefined}
                                opponentName={game.opponent_name ?? undefined}
                            />
                        ) : breakdownTab === 'opponent' || game.charting_mode !== 'both' ? (
                            <BatterBreakdownPanel
                                sections={[{ title: `Opponent Lineup vs. ${pitcherName}`, batters: oppBreakdown ?? [] }]}
                                loading={breakdownLoading}
                                pitcherId={pitcherId}
                                gameId={game.id}
                            />
                        ) : (
                            <BatterBreakdownPanel
                                sections={[{ title: `Our Lineup vs. ${opponentPitcherName}`, batters: myTeamBreakdown ?? [] }]}
                                loading={breakdownLoading}
                                gameId={game.id}
                                opponentTeamId={game.opponent_team_id ?? undefined}
                                opponentName={game.opponent_name ?? undefined}
                            />
                        )}
                    </BreakdownWrapper>
                )}
                {activeTab === 'tendencies' && (
                    <ViewerTendenciesTab
                        game={game}
                        allPitchers={allPitchers}
                        activePitcher={activePitcher}
                        allOpposingPitchers={allOpposingPitchers}
                        refreshTrigger={refreshTrigger}
                    />
                )}
                {activeTab === 'summary' && (
                    <SummaryWrapper>
                        <OpponentAttackSummary gameId={game.id} />
                        {summaryLoading && <LoadingText>Loading performance summary…</LoadingText>}
                        {!summaryLoading && pitcherSummaries.length === 0 && (
                            <LoadingText>No pitcher performance data available for this game.</LoadingText>
                        )}
                        {pitcherSummaries.length > 1 && (
                            <PitcherTabRow>
                                {pitcherSummaries.map((s, i) => (
                                    <PitcherTab key={s.id} active={i === activePitcherIdx} onClick={() => setActivePitcherIdx(i)}>
                                        {s.pitcher_name}
                                    </PitcherTab>
                                ))}
                            </PitcherTabRow>
                        )}
                        {activeSummary && (
                            <PerformanceSummaryCard
                                summary={activeSummary}
                                onRegenerate={handleRegenerate}
                                regenerating={regenerating}
                            />
                        )}
                    </SummaryWrapper>
                )}
            </Content>
        </Wrapper>
    );
};

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: ${theme.surfaces.body};
    font-family: system-ui, sans-serif;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.lg};
    padding: ${theme.spacing.md} ${theme.spacing.xl};
    background: ${theme.surfaces.card};
    border-bottom: 1px solid ${theme.colors.gray[200]};
    box-shadow: ${theme.shadows.sm};
`;

const ScoreRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.md};
    flex: 1;
`;

const TeamLabel = styled.span`
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.gray[600]};
    font-weight: ${theme.fontWeight.medium};
`;

const Score = styled.span`
    font-size: ${theme.fontSize['2xl']};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.gray[900]};
    letter-spacing: 2px;
`;

const InningBadge = styled.span`
    font-size: ${theme.fontSize.base};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.primary[700]};
    background: ${theme.colors.primary[50]};
    border-radius: ${theme.borderRadius.md};
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
`;

const ViewerBadge = styled.span`
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.primary[700]};
    background: ${theme.colors.primary[100]};
    border-radius: ${theme.borderRadius.sm};
    padding: 2px ${theme.spacing.xs};
    letter-spacing: 1px;
`;

const ExitButton = styled.button`
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.primary[600]};
    background: none;
    border: 1px solid ${theme.colors.primary[300]};
    border-radius: ${theme.borderRadius.md};
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    cursor: pointer;
    white-space: nowrap;
    margin-left: auto;

    &:hover {
        background: ${theme.colors.primary[50]};
        color: ${theme.colors.primary[700]};
    }
`;

const TabRow = styled.div`
    display: flex;
    background: ${theme.surfaces.card};
    border-bottom: 2px solid ${theme.colors.gray[200]};
    padding: 0 ${theme.spacing.xl};
`;

const Tab = styled.button<{ active: boolean }>`
    padding: ${theme.spacing.sm} ${theme.spacing.lg};
    border: none;
    background: none;
    cursor: pointer;
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.medium};
    color: ${({ active }) => (active ? theme.colors.primary[700] : theme.colors.gray[500])};
    border-bottom: 2px solid ${({ active }) => (active ? theme.colors.primary[600] : 'transparent')};
    margin-bottom: -2px;
    transition:
        color 0.15s,
        border-color 0.15s;

    &:hover {
        color: ${theme.colors.primary[600]};
    }
`;

const Content = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: ${theme.spacing.xl};
`;

const BreakdownWrapper = styled.div`
    max-width: 800px;
    margin: 0 auto;
`;

const BreakdownTabRow = styled.div`
    display: flex;
    border-bottom: 2px solid ${theme.colors.gray[200]};
    margin-bottom: ${theme.spacing.lg};
`;

const BreakdownTab = styled.button<{ active: boolean }>`
    padding: ${theme.spacing.sm} ${theme.spacing.lg};
    border: none;
    background: none;
    cursor: pointer;
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.medium};
    color: ${({ active }) => (active ? theme.colors.primary[700] : theme.colors.gray[500])};
    border-bottom: 2px solid ${({ active }) => (active ? theme.colors.primary[600] : 'transparent')};
    margin-bottom: -2px;
    transition:
        color 0.15s,
        border-color 0.15s;

    &:hover {
        color: ${theme.colors.primary[600]};
    }
`;

const SummaryWrapper = styled.div`
    max-width: 800px;
    margin: 0 auto;
`;

const PitcherTabRow = styled.div`
    display: flex;
    border-bottom: 2px solid ${theme.colors.gray[200]};
    margin-bottom: ${theme.spacing.lg};
    gap: 2px;
`;

const PitcherTab = styled.button<{ active: boolean }>`
    padding: ${theme.spacing.xs} ${theme.spacing.md};
    border: none;
    background: ${({ active }) => (active ? theme.colors.primary[50] : 'none')};
    cursor: pointer;
    font-size: ${theme.fontSize.sm};
    font-weight: ${({ active }) => (active ? theme.fontWeight.semibold : theme.fontWeight.normal)};
    color: ${({ active }) => (active ? theme.colors.primary[700] : theme.colors.gray[500])};
    border-bottom: 2px solid ${({ active }) => (active ? theme.colors.primary[600] : 'transparent')};
    margin-bottom: -2px;
    border-radius: ${theme.borderRadius.sm} ${theme.borderRadius.sm} 0 0;
    transition:
        color 0.15s,
        border-color 0.15s;

    &:hover {
        color: ${theme.colors.primary[600]};
    }
`;

const LoadingText = styled.p`
    color: ${theme.colors.gray[500]};
    font-size: ${theme.fontSize.sm};
    text-align: center;
    margin-top: ${theme.spacing['2xl']};
`;

export default ViewerDashboard;
