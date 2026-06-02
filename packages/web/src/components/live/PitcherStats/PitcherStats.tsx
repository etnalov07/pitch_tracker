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

interface EligibilityResult {
    eligibility: 'eligible' | 'ineligible' | 'unknown_division' | 'unknown_rules';
    sanction: 'PG' | 'PBR' | 'HS' | 'NONE' | null;
    age_division: string | null;
    daily_max: number | null;
}

// Color the count badge by % of daily_max.
function counterColorForPct(pct: number): string {
    if (pct >= 1.0) return '#dc2626'; // red
    if (pct >= 0.9) return '#dc2626';
    if (pct >= 0.7) return '#d97706'; // amber
    return '#16a34a'; // green
}

function sanctionLabel(sanction: EligibilityResult['sanction'], ageDivision: string | null): string {
    if (sanction === 'PG') return `PG ${ageDivision ?? ''} daily max`.trim();
    if (sanction === 'PBR') return 'PBR rules pending';
    if (sanction === 'HS') return 'NFHS HS limit';
    return '';
}

const PitcherStats: React.FC<PitcherStatsProps> = ({ pitcherId, gameId, pitcherName, refreshTrigger }) => {
    const [stats, setStats] = useState<PitcherGameStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [elig, setElig] = useState<EligibilityResult | null>(null);

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

    // Pitch-rules eligibility — drives the daily-max counter color + label.
    // Game-level sanction + age don't change mid-game so this is fetched once
    // per (gameId, pitcherId). The live count comes from `stats.total_pitches`.
    useEffect(() => {
        if (!pitcherId || !gameId) {
            setElig(null);
            return;
        }
        let cancelled = false;
        api.get<{ eligibility: EligibilityResult }>(`/pitch-rules/eligibility/${gameId}/${pitcherId}`)
            .then((res) => {
                if (!cancelled) setElig(res.data.eligibility);
            })
            .catch(() => {
                if (!cancelled) setElig(null);
            });
        return () => {
            cancelled = true;
        };
    }, [pitcherId, gameId]);

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

    // Counter source + color depends on sanction.
    const dailyMax = elig?.daily_max ?? null;
    const pct = dailyMax ? stats.total_pitches / dailyMax : 0;
    const counterColor = dailyMax ? counterColorForPct(pct) : undefined;
    const sanctionTag = sanctionLabel(elig?.sanction ?? null, elig?.age_division ?? null);

    return (
        <Container>
            <Header>
                <Title>{pitcherName ? `${pitcherName}'s Stats` : 'Pitcher Stats'}</Title>
                <TotalPitches style={counterColor ? { color: counterColor, fontWeight: 700 } : undefined}>
                    {dailyMax != null
                        ? `${stats.total_pitches} / ${dailyMax}${sanctionTag ? ` (${sanctionTag})` : ''}`
                        : `${stats.total_pitches} pitches${sanctionTag ? ` (${sanctionTag})` : ''}`}
                </TotalPitches>
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
