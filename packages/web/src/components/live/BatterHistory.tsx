import React, { useEffect, useState, useCallback } from 'react';
import styled from '@emotion/styled';
import { theme } from '../../styles/theme';
import { BatterHistory as BatterHistoryType } from '../../types';
import { analyticsService } from '../../services/pitchService';

interface BatterHistoryProps {
    batterId: string;
    pitcherId?: string;
    limit?: number;
}

const BatterHistory: React.FC<BatterHistoryProps> = ({ batterId, pitcherId, limit = 10 }) => {
    const [history, setHistory] = useState<BatterHistoryType | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAllTime, setShowAllTime] = useState(false);

    const loadHistory = useCallback(async () => {
        try {
            setLoading(true);
            const data = await analyticsService.getBatterHistory(batterId, showAllTime ? undefined : pitcherId, limit);
            setHistory(data);
        } catch (error) {
            console.error('Failed to load batter history:', error);
        } finally {
            setLoading(false);
        }
    }, [batterId, pitcherId, showAllTime, limit]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    if (loading) {
        return (
            <Container>
                <Header>
                    <Title>Batter History</Title>
                </Header>
                <LoadingText>Loading history...</LoadingText>
            </Container>
        );
    }

    if (!history) {
        return (
            <Container>
                <Header>
                    <Title>Batter History</Title>
                </Header>
                <EmptyText>No history available</EmptyText>
            </Container>
        );
    }

    const { stats, atBats } = history;
    const avg = stats.avg !== undefined ? stats.avg.toFixed(3) : '---';

    return (
        <Container>
            <Header>
                <Title>Batter History</Title>
                <ToggleButton onClick={() => setShowAllTime(!showAllTime)}>
                    {showAllTime ? 'vs This Pitcher' : 'All Time'}
                </ToggleButton>
            </Header>

            <StatsGrid>
                <StatCard>
                    <StatLabel>AB</StatLabel>
                    <StatValue>{stats.totalAtBats}</StatValue>
                </StatCard>
                <StatCard>
                    <StatLabel>H</StatLabel>
                    <StatValue>{stats.hits}</StatValue>
                </StatCard>
                <StatCard>
                    <StatLabel>BB</StatLabel>
                    <StatValue>{stats.walks}</StatValue>
                </StatCard>
                <StatCard>
                    <StatLabel>K</StatLabel>
                    <StatValue>{stats.strikeouts}</StatValue>
                </StatCard>
                <StatCard highlighted>
                    <StatLabel>AVG</StatLabel>
                    <StatValue>{avg}</StatValue>
                </StatCard>
            </StatsGrid>

            <AtBatsSection>
                <SectionTitle>Recent At-Bats</SectionTitle>
                {atBats.length === 0 ? (
                    <EmptyText>No at-bats recorded</EmptyText>
                ) : (
                    <AtBatsList>
                        {atBats.map((ab, idx) => (
                            <AtBatCard key={ab.id}>
                                <AtBatHeader>
                                    <AtBatNumber>AB #{idx + 1}</AtBatNumber>
                                    <AtBatResult result={ab.result}>{ab.result || 'In Progress'}</AtBatResult>
                                </AtBatHeader>
                                <AtBatDetails>
                                    <Detail>
                                        <DetailLabel>Count:</DetailLabel>
                                        <DetailValue>
                                            {ab.balls}-{ab.strikes}
                                        </DetailValue>
                                    </Detail>
                                    <Detail>
                                        <DetailLabel>Pitches:</DetailLabel>
                                        <DetailValue>{ab.pitches?.length || 0}</DetailValue>
                                    </Detail>
                                    {ab.rbis !== undefined && ab.rbis > 0 && (
                                        <Detail>
                                            <DetailLabel>RBI:</DetailLabel>
                                            <DetailValue highlight>{ab.rbis}</DetailValue>
                                        </Detail>
                                    )}
                                </AtBatDetails>
                                {ab.pitches && ab.pitches.length > 0 && (
                                    <PitchSequence>
                                        {ab.pitches.map((pitch, pIdx) => (
                                            <PitchBadge key={pitch.id || pIdx} result={pitch.result}>
                                                {pitch.pitchType.substring(0, 2).toUpperCase()}
                                                {pitch.velocity ? ` ${pitch.velocity}` : ''}
                                            </PitchBadge>
                                        ))}
                                    </PitchSequence>
                                )}
                            </AtBatCard>
                        ))}
                    </AtBatsList>
                )}
            </AtBatsSection>
        </Container>
    );
};

// Styled Components
const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.lg};
    padding: ${theme.spacing.lg};
    background-color: white;
    border-radius: ${theme.borderRadius.lg};
    box-shadow: ${theme.shadows.md};
    max-height: 100%;
    overflow-y: auto;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Title = styled.h2`
    font-size: ${theme.fontSize['2xl']};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.gray[900]};
    margin: 0;
`;

const ToggleButton = styled.button`
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    background-color: ${theme.colors.primary[600]};
    color: white;
    border: none;
    border-radius: ${theme.borderRadius.md};
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.medium};
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
        background-color: ${theme.colors.primary[700]};
    }
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: ${theme.spacing.sm};
`;

const StatCard = styled.div<{ highlighted?: boolean }>`
    padding: ${theme.spacing.md};
    background-color: ${(props) => (props.highlighted ? theme.colors.primary[50] : theme.colors.gray[50])};
    border: 2px solid ${(props) => (props.highlighted ? theme.colors.primary[200] : theme.colors.gray[200])};
    border-radius: ${theme.borderRadius.md};
    text-align: center;
`;

const StatLabel = styled.div`
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.gray[600]};
    font-weight: ${theme.fontWeight.medium};
    margin-bottom: ${theme.spacing.xs};
`;

const StatValue = styled.div`
    font-size: ${theme.fontSize.xl};
    font-weight: ${theme.fontWeight.bold};
    color: ${theme.colors.gray[900]};
`;

const AtBatsSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
`;

const SectionTitle = styled.h3`
    font-size: ${theme.fontSize.lg};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.gray[800]};
    margin: 0;
`;

const AtBatsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
`;

const AtBatCard = styled.div`
    padding: ${theme.spacing.md};
    background-color: ${theme.colors.gray[50]};
    border: 1px solid ${theme.colors.gray[200]};
    border-radius: ${theme.borderRadius.md};
`;

const AtBatHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${theme.spacing.sm};
`;

const AtBatNumber = styled.span`
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.gray[700]};
`;

const AtBatResult = styled.span<{ result?: string }>`
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    background-color: ${(props) => {
        if (!props.result) return theme.colors.gray[200];
        if (
            props.result.includes('single') ||
            props.result.includes('double') ||
            props.result.includes('triple') ||
            props.result.includes('home_run')
        ) {
            return theme.colors.green[100];
        }
        if (props.result.includes('strikeout')) return theme.colors.red[100];
        if (props.result.includes('walk')) return theme.colors.yellow[100];
        return theme.colors.gray[200];
    }};
    color: ${(props) => {
        if (!props.result) return theme.colors.gray[700];
        if (
            props.result.includes('single') ||
            props.result.includes('double') ||
            props.result.includes('triple') ||
            props.result.includes('home_run')
        ) {
            return theme.colors.green[700];
        }
        if (props.result.includes('strikeout')) return theme.colors.red[700];
        if (props.result.includes('walk')) return theme.colors.yellow[700];
        return theme.colors.gray[700];
    }};
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.semibold};
    border-radius: ${theme.borderRadius.sm};
    text-transform: uppercase;
`;

const AtBatDetails = styled.div`
    display: flex;
    gap: ${theme.spacing.md};
    margin-bottom: ${theme.spacing.sm};
`;

const Detail = styled.div`
    display: flex;
    gap: ${theme.spacing.xs};
    align-items: baseline;
`;

const DetailLabel = styled.span`
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.gray[600]};
`;

const DetailValue = styled.span<{ highlight?: boolean }>`
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.semibold};
    color: ${(props) => (props.highlight ? theme.colors.green[600] : theme.colors.gray[900])};
`;

const PitchSequence = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.spacing.xs};
`;

const PitchBadge = styled.span<{ result: string }>`
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    background-color: ${(props) => {
        switch (props.result) {
            case 'ball':
                return theme.colors.gray[300];
            case 'called_strike':
                return theme.colors.green[200];
            case 'swinging_strike':
                return theme.colors.red[200];
            case 'foul':
                return theme.colors.yellow[200];
            case 'in_play':
                return theme.colors.primary[200];
            default:
                return theme.colors.gray[200];
        }
    }};
    color: ${(props) => {
        switch (props.result) {
            case 'ball':
                return theme.colors.gray[800];
            case 'called_strike':
                return theme.colors.green[800];
            case 'swinging_strike':
                return theme.colors.red[800];
            case 'foul':
                return theme.colors.yellow[800];
            case 'in_play':
                return theme.colors.primary[800];
            default:
                return theme.colors.gray[800];
        }
    }};
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.medium};
    border-radius: ${theme.borderRadius.sm};
`;

const LoadingText = styled.p`
    text-align: center;
    color: ${theme.colors.gray[600]};
    font-size: ${theme.fontSize.base};
    padding: ${theme.spacing.xl};
`;

const EmptyText = styled.p`
    text-align: center;
    color: ${theme.colors.gray[500]};
    font-size: ${theme.fontSize.sm};
    font-style: italic;
    padding: ${theme.spacing.lg};
`;

export default BatterHistory;
