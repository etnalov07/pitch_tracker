import styled from '@emotion/styled';
import { Game, GamePitcherWithPlayer } from '@pitch-tracker/shared';
import React, { useState, useEffect } from 'react';
import CountBreakdownPanel from '../../components/live/CountBreakdownPanel';
import PitcherStats from '../../components/live/PitcherStats';
import { gamesApi } from '../../state/games/api/gamesApi';
import { theme } from '../../styles/theme';

interface Props {
    game: Game;
    refreshTrigger: number;
}

const ViewerDashboard: React.FC<Props> = ({ game, refreshTrigger }) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'counts'>('stats');
    const [activePitcher, setActivePitcher] = useState<GamePitcherWithPlayer | null>(null);

    useEffect(() => {
        gamesApi
            .getGamePitchers(game.id)
            .then((pitchers) => {
                const active = pitchers.find((p) => !p.inning_exited) ?? pitchers[pitchers.length - 1] ?? null;
                setActivePitcher(active);
            })
            .catch(() => {});
    }, [game.id, refreshTrigger]);

    const pitcherId = activePitcher?.player_id;

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
            </Header>

            <TabRow>
                <Tab active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>
                    Pitcher Stats
                </Tab>
                <Tab active={activeTab === 'counts'} onClick={() => setActiveTab('counts')}>
                    Count Breakdown
                </Tab>
            </TabRow>

            <Content>
                {activeTab === 'stats' && pitcherId && (
                    <PitcherStats gameId={game.id} pitcherId={pitcherId} refreshTrigger={refreshTrigger} />
                )}
                {activeTab === 'counts' && (
                    <CountBreakdownPanel gameId={game.id} pitcherId={pitcherId} refreshTrigger={refreshTrigger} />
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

export default ViewerDashboard;
