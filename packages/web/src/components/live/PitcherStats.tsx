import styled from '@emotion/styled';
import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import { PitcherGameStats } from '../../types';

interface PitcherStatsProps {
    pitcherId: string;
    gameId: string;
    pitcherName?: string;
    refreshTrigger?: number; // Increment this to refresh stats
}

const PitcherStats: React.FC<PitcherStatsProps> = ({ pitcherId, gameId, pitcherName, refreshTrigger }) => {
    const [stats, setStats] = useState<PitcherGameStats | null>(null);
    const [loading, setLoading] = useState(true);

    const loadStats = useCallback(async () => {
        if (!pitcherId || !gameId) {
            setStats(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await api.get<{ stats: PitcherGameStats }>(`/players/${pitcherId}/game-stats/${gameId}`);
            setStats(response.data.stats);
        } catch (error) {
            console.error('Failed to load pitcher stats:', error);
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, [pitcherId, gameId]);

    useEffect(() => {
        loadStats();
    }, [loadStats, refreshTrigger]);

    if (!pitcherId || !gameId) {
        return (
            <Container>
                <Header>
                    <Title>Pitcher Stats</Title>
                </Header>
                <EmptyText>Select a pitcher to view stats</EmptyText>
            </Container>
        );
    }

    if (loading) {
        return (
            <Container>
                <Header>
                    <Title>Pitcher Stats</Title>
                </Header>
                <LoadingText>Loading stats...</LoadingText>
            </Container>
        );
    }

    if (!stats) {
        return (
            <Container>
                <Header>
                    <Title>Pitcher Stats</Title>
                </Header>
                <EmptyText>No pitches recorded yet</EmptyText>
            </Container>
        );
    }

    const strikePercentage = stats.total_pitches > 0 ? Math.round((stats.strikes / stats.total_pitches) * 100) : 0;

    // Sort pitch types by total pitches (descending)
    const sortedPitchTypes = Object.entries(stats.pitch_type_breakdown).sort(([, a], [, b]) => b.total - a.total);

    return (
        <Container>
            <Header>
                <Title>{pitcherName ? `${pitcherName}'s Stats` : 'Pitcher Stats'}</Title>
                <TotalPitches>{stats.total_pitches} pitches</TotalPitches>
            </Header>

            <SummaryRow>
                <SummaryStat>
                    <StatValue highlight>{stats.strikes}</StatValue>
                    <StatLabel>Strikes</StatLabel>
                </SummaryStat>
                <SummaryStat>
                    <StatValue>{stats.balls}</StatValue>
                    <StatLabel>Balls</StatLabel>
                </SummaryStat>
                <SummaryStat>
                    <StatValue>{strikePercentage}%</StatValue>
                    <StatLabel>Strike %</StatLabel>
                </SummaryStat>
            </SummaryRow>

            <BreakdownSection>
                <SectionTitle>By Pitch Type</SectionTitle>
                <StatsTable>
                    <thead>
                        <tr>
                            <Th align="left">Type</Th>
                            <Th align="right">Ball</Th>
                            <Th align="right">Strike</Th>
                            <Th align="right">%</Th>
                            <Th align="right">Top</Th>
                            <Th align="right">Avg</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPitchTypes.map(([pitchType, data]) => {
                            const pctStrike = data.total > 0 ? Math.round((data.strikes / data.total) * 100) : 0;
                            return (
                                <tr key={pitchType}>
                                    <Td align="left">
                                        <PitchTypeBadge>{formatPitchType(pitchType)}</PitchTypeBadge>
                                    </Td>
                                    <Td align="right">{data.balls}</Td>
                                    <Td align="right" highlight>
                                        {data.strikes}
                                    </Td>
                                    <Td align="right">{pctStrike}</Td>
                                    <Td align="right" velocity>
                                        {data.top_velocity ?? '-'}
                                    </Td>
                                    <Td align="right" velocity>
                                        {data.avg_velocity ?? '-'}
                                    </Td>
                                </tr>
                            );
                        })}
                    </tbody>
                </StatsTable>
            </BreakdownSection>
        </Container>
    );
};

function formatPitchType(type: string): string {
    const names: { [key: string]: string } = {
        fastball: 'FB',
        '2-seam': '2S',
        '4-seam': '4S',
        cutter: 'CUT',
        sinker: 'SNK',
        slider: 'SL',
        curveball: 'CB',
        changeup: 'CH',
        splitter: 'SPL',
        knuckleball: 'KN',
        screwball: 'SCR',
        other: 'OTH',
    };
    return names[type] || type.substring(0, 3).toUpperCase();
}

// Styled Components
const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
    padding: ${theme.spacing.lg};
    background-color: white;
    border-radius: ${theme.borderRadius.lg};
    box-shadow: ${theme.shadows.md};
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Title = styled.h3`
    font-size: ${theme.fontSize.lg};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.gray[900]};
    margin: 0;
`;

const TotalPitches = styled.span`
    font-size: ${theme.fontSize.base};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.primary[600]};
    background-color: ${theme.colors.primary[50]};
    padding: ${theme.spacing.xs} ${theme.spacing.md};
    border-radius: ${theme.borderRadius.full};
`;

const SummaryRow = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: ${theme.spacing.md};
`;

const SummaryStat = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: ${theme.spacing.md};
    background-color: ${theme.colors.gray[50]};
    border-radius: ${theme.borderRadius.md};
`;

const StatValue = styled.div<{ highlight?: boolean }>`
    font-size: ${theme.fontSize['2xl']};
    font-weight: ${theme.fontWeight.bold};
    color: ${(props) => (props.highlight ? theme.colors.green[600] : theme.colors.gray[900])};
`;

const StatLabel = styled.div`
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.gray[600]};
    text-transform: uppercase;
    font-weight: ${theme.fontWeight.medium};
`;

const BreakdownSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.sm};
`;

const SectionTitle = styled.h4`
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.gray[700]};
    margin: 0;
`;

const StatsTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${theme.fontSize.sm};

    thead tr {
        border-bottom: 2px solid ${theme.colors.gray[200]};
    }

    tbody tr {
        border-bottom: 1px solid ${theme.colors.gray[100]};

        &:last-child {
            border-bottom: none;
        }

        &:hover {
            background-color: ${theme.colors.gray[50]};
        }
    }
`;

const Th = styled.th<{ align?: 'left' | 'right' | 'center' }>`
    padding: ${theme.spacing.sm} ${theme.spacing.xs};
    text-align: ${(props) => props.align || 'left'};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.gray[600]};
    text-transform: uppercase;
    font-size: ${theme.fontSize.xs};
`;

const Td = styled.td<{ align?: 'left' | 'right' | 'center'; highlight?: boolean; velocity?: boolean }>`
    padding: ${theme.spacing.sm} ${theme.spacing.xs};
    text-align: ${(props) => props.align || 'left'};
    color: ${(props) => {
        if (props.highlight) return theme.colors.green[600];
        if (props.velocity) return theme.colors.primary[600];
        return theme.colors.gray[800];
    }};
    font-weight: ${(props) => (props.highlight || props.velocity ? theme.fontWeight.semibold : theme.fontWeight.normal)};
`;

const PitchTypeBadge = styled.span`
    display: inline-block;
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.primary[700]};
    background-color: ${theme.colors.primary[50]};
    padding: 2px ${theme.spacing.sm};
    border-radius: ${theme.borderRadius.sm};
    font-size: ${theme.fontSize.xs};
`;

const LoadingText = styled.p`
    text-align: center;
    color: ${theme.colors.gray[600]};
    font-size: ${theme.fontSize.base};
    padding: ${theme.spacing.lg};
`;

const EmptyText = styled.p`
    text-align: center;
    color: ${theme.colors.gray[500]};
    font-size: ${theme.fontSize.sm};
    font-style: italic;
    padding: ${theme.spacing.lg};
`;

export default PitcherStats;
