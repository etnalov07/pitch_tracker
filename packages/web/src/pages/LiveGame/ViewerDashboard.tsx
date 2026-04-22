import styled from '@emotion/styled';
import { BatterBreakdown, Game, GamePitcherWithPlayer, PerformanceSummary } from '@pitch-tracker/shared';
import React, { useState, useEffect, useRef } from 'react';
import CountBreakdownPanel from '../../components/live/CountBreakdownPanel';
import PitcherStats from '../../components/live/PitcherStats';
import { BatterBreakdownPanel, PerformanceSummaryCard } from '../../components/performanceSummary';
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
    const [activeTab, setActiveTab] = useState<'stats' | 'counts' | 'breakdown' | 'summary'>('stats');
    const [activePitcher, setActivePitcher] = useState<GamePitcherWithPlayer | null>(null);
    const [summary, setSummary] = useState<PerformanceSummary | null>(null);
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
                const active = pitchers.find((p) => !p.inning_exited) ?? pitchers[pitchers.length - 1] ?? null;
                setActivePitcher(active);
            })
            .catch(() => {});
    }, [game.id, refreshTrigger]);

    // Batter breakdown — re-fetch whenever the tab is active or a new pitch is logged
    useEffect(() => {
        if (activeTab !== 'breakdown') return;
        if (!breakdownFetchedRef.current) setBreakdownLoading(true);
        Promise.all([
            performanceSummaryService.getBatterBreakdown(game.id),
            game.charting_mode === 'both' ? performanceSummaryService.getMyTeamBatterBreakdown(game.id) : Promise.resolve([]),
        ])
            .then(([opp, mine]) => {
                setOppBreakdown(opp);
                setMyTeamBreakdown(mine);
                breakdownFetchedRef.current = true;
            })
            .catch(() => {})
            .finally(() => setBreakdownLoading(false));
    }, [activeTab, game.id, game.charting_mode, refreshTrigger]);

    useEffect(() => {
        if (activeTab !== 'summary' || summary) return;
        setSummaryLoading(true);
        performanceSummaryService
            .getSummary('game', game.id)
            .then((s) => setSummary(s))
            .catch(() => {})
            .finally(() => setSummaryLoading(false));
    }, [activeTab, game.id, summary]);

    // Poll until narrative arrives
    useEffect(() => {
        if (!summary || summary.narrative) {
            pollAttemptsRef.current = 0;
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
            return;
        }
        if (pollAttemptsRef.current >= NARRATIVE_POLL_MAX_ATTEMPTS) return;
        pollTimerRef.current = setTimeout(() => {
            pollAttemptsRef.current += 1;
            performanceSummaryService
                .getSummary('game', game.id)
                .then((s) => setSummary(s))
                .catch(() => {});
        }, NARRATIVE_POLL_INTERVAL_MS);
        return () => {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
    }, [summary, game.id]);

    const handleRegenerate = async () => {
        if (!summary) return;
        setRegenerating(true);
        try {
            await performanceSummaryService.regenerateNarrative(summary.id);
            const updated = await performanceSummaryService.getSummary('game', game.id);
            setSummary(updated);
        } finally {
            setRegenerating(false);
        }
    };

    const pitcherId = activePitcher?.player_id;

    const score = `${game.home_score} – ${game.away_score}`;
    const inningLabel = `${game.inning_half === 'top' ? '▲' : '▼'} ${game.current_inning}`;

    const breakdownSections = [
        { title: 'Opponent Lineup vs. Our Pitcher', batters: oppBreakdown ?? [] },
        ...(game.charting_mode === 'both' ? [{ title: 'Our Lineup vs. Opponent Pitcher', batters: myTeamBreakdown ?? [] }] : []),
    ];

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
                {game.status === 'completed' && (
                    <Tab active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>
                        Performance Summary
                    </Tab>
                )}
            </TabRow>

            <Content>
                {activeTab === 'stats' && pitcherId && (
                    <PitcherStats gameId={game.id} pitcherId={pitcherId} refreshTrigger={refreshTrigger} />
                )}
                {activeTab === 'counts' && (
                    <CountBreakdownPanel gameId={game.id} pitcherId={pitcherId} refreshTrigger={refreshTrigger} />
                )}
                {activeTab === 'breakdown' && (
                    <BreakdownWrapper>
                        <BatterBreakdownPanel sections={breakdownSections} loading={breakdownLoading} />
                    </BreakdownWrapper>
                )}
                {activeTab === 'summary' && (
                    <SummaryWrapper>
                        {summaryLoading && <LoadingText>Loading performance summary…</LoadingText>}
                        {!summaryLoading && !summary && <LoadingText>No performance data available for this game.</LoadingText>}
                        {summary && (
                            <PerformanceSummaryCard summary={summary} onRegenerate={handleRegenerate} regenerating={regenerating} />
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
    background: ${theme.colors.gray[50]};
    font-family: system-ui, sans-serif;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.lg};
    padding: ${theme.spacing.md} ${theme.spacing.xl};
    background: white;
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
    color: white;
    background: ${theme.colors.gray[500]};
    border-radius: ${theme.borderRadius.sm};
    padding: 2px ${theme.spacing.xs};
    letter-spacing: 1px;
`;

const ExitButton = styled.button`
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.gray[600]};
    background: none;
    border: 1px solid ${theme.colors.gray[300]};
    border-radius: ${theme.borderRadius.md};
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    cursor: pointer;
    white-space: nowrap;
    margin-left: auto;

    &:hover {
        background: ${theme.colors.gray[100]};
        color: ${theme.colors.gray[800]};
    }
`;

const TabRow = styled.div`
    display: flex;
    background: white;
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

const SummaryWrapper = styled.div`
    max-width: 800px;
    margin: 0 auto;
`;

const LoadingText = styled.p`
    color: ${theme.colors.gray[500]};
    font-size: ${theme.fontSize.sm};
    text-align: center;
    margin-top: ${theme.spacing['2xl']};
`;

export default ViewerDashboard;
