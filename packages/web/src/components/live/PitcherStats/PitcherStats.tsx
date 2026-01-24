import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import { PitcherGameStats } from '../../../types';
import {
    Container,
    Header,
    Title,
    TotalPitches,
    SummaryRow,
    SummaryStat,
    StatValue,
    StatLabel,
    BreakdownSection,
    SectionTitle,
    StatsTable,
    Th,
    Td,
    PitchTypeBadge,
    LoadingText,
    EmptyText,
} from './styles';

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

export default PitcherStats;
