import React, { useEffect, useState, useCallback } from 'react';
import { analyticsService } from '../../../services/pitchService';
import { BatterHistory as BatterHistoryType } from '../../../types';
import BatterScoutingNotes from '../BatterScoutingNotes';
import {
    Container,
    Header,
    Title,
    ToggleButton,
    StatsGrid,
    StatCard,
    StatLabel,
    StatValue,
    AtBatsSection,
    SectionTitle,
    AtBatsList,
    AtBatCard,
    AtBatHeader,
    AtBatNumber,
    AtBatResult,
    AtBatDetails,
    Detail,
    DetailLabel,
    DetailValue,
    PitchSequence,
    PitchBadge,
    LoadingText,
    EmptyText,
} from './styles';

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

    const { stats, at_bats: atBats } = history;
    const avg =
        stats.batting_average !== undefined && stats.batting_average !== null ? Number(stats.batting_average).toFixed(3) : '---';

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
                    <StatValue>{stats.total_abs}</StatValue>
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
                                    {ab.rbi !== undefined && ab.rbi > 0 && (
                                        <Detail>
                                            <DetailLabel>RBI:</DetailLabel>
                                            <DetailValue highlight>{ab.rbi}</DetailValue>
                                        </Detail>
                                    )}
                                </AtBatDetails>
                                {ab.pitches && ab.pitches.length > 0 && (
                                    <PitchSequence>
                                        {ab.pitches.map((pitch, pIdx) => (
                                            <PitchBadge key={pitch.id || pIdx} result={pitch.pitch_result}>
                                                {pitch.pitch_type.substring(0, 2).toUpperCase()}
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

            <BatterScoutingNotes batterId={batterId} collapsed={true} />
        </Container>
    );
};

export default BatterHistory;
