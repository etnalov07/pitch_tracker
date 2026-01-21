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
                <BreakdownGrid>
                    {Object.entries(stats.pitch_type_breakdown).map(([pitchType, data]) => (
                        <PitchTypeCard key={pitchType}>
                            <PitchTypeName>{formatPitchType(pitchType)}</PitchTypeName>
                            <PitchTypeStats>
                                <PitchTypeStat>
                                    <span>{data.total}</span>
                                    <small>Total</small>
                                </PitchTypeStat>
                                <PitchTypeStat highlight>
                                    <span>{data.strikes}</span>
                                    <small>K</small>
                                </PitchTypeStat>
                                <PitchTypeStat>
                                    <span>{data.balls}</span>
                                    <small>B</small>
                                </PitchTypeStat>
                            </PitchTypeStats>
                            {(data.top_velocity || data.avg_velocity) && (
                                <VelocityStats>
                                    {data.top_velocity && (
                                        <VelocityStat>
                                            <VelocityValue>{data.top_velocity}</VelocityValue>
                                            <VelocityLabel>Top</VelocityLabel>
                                        </VelocityStat>
                                    )}
                                    {data.avg_velocity && (
                                        <VelocityStat>
                                            <VelocityValue>{data.avg_velocity}</VelocityValue>
                                            <VelocityLabel>Avg</VelocityLabel>
                                        </VelocityStat>
                                    )}
                                </VelocityStats>
                            )}
                        </PitchTypeCard>
                    ))}
                </BreakdownGrid>
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

const BreakdownGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: ${theme.spacing.sm};
`;

const PitchTypeCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: ${theme.spacing.sm};
    background-color: ${theme.colors.gray[50]};
    border: 1px solid ${theme.colors.gray[200]};
    border-radius: ${theme.borderRadius.md};
`;

const PitchTypeName = styled.div`
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.primary[700]};
    margin-bottom: ${theme.spacing.xs};
`;

const PitchTypeStats = styled.div`
    display: flex;
    gap: ${theme.spacing.sm};
`;

const PitchTypeStat = styled.div<{ highlight?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;

    span {
        font-size: ${theme.fontSize.sm};
        font-weight: ${theme.fontWeight.semibold};
        color: ${(props) => (props.highlight ? theme.colors.green[600] : theme.colors.gray[800])};
    }

    small {
        font-size: ${theme.fontSize.xs};
        color: ${theme.colors.gray[500]};
    }
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

const VelocityStats = styled.div`
    display: flex;
    gap: ${theme.spacing.md};
    margin-top: ${theme.spacing.xs};
    padding-top: ${theme.spacing.xs};
    border-top: 1px dashed ${theme.colors.gray[300]};
`;

const VelocityStat = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const VelocityValue = styled.span`
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.primary[600]};
`;

const VelocityLabel = styled.span`
    font-size: 10px;
    color: ${theme.colors.gray[500]};
    text-transform: uppercase;
`;

export default PitcherStats;
