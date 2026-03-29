import React from 'react';
import { PerformanceSummary } from '@pitch-tracker/shared';
import {
    Card,
    NarrativeBox,
    NarrativePlaceholder,
    SectionTitle,
    MetricsGrid,
    StatBox,
    StatValue,
    StatLabel,
    RatingBadge,
    MetricRow,
    MetricName,
    MetricRight,
    DeltaText,
    StatsTable,
    Th,
    Td,
    HighlightsList,
    HighlightItem,
    ConcernItem,
    RegenerateButton,
} from './styles';

interface Props {
    summary: PerformanceSummary;
    onRegenerate?: () => void;
    regenerating?: boolean;
}

const formatPitchType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
};

const PerformanceSummaryCard: React.FC<Props> = ({ summary, onRegenerate, regenerating }) => {
    return (
        <Card>
            {/* AI Narrative */}
            <SectionTitle>Coach Summary</SectionTitle>
            {summary.narrative ? (
                <NarrativeBox>{summary.narrative}</NarrativeBox>
            ) : (
                <NarrativePlaceholder>AI summary generating...</NarrativePlaceholder>
            )}

            {/* Key Stats */}
            <SectionTitle>Overview</SectionTitle>
            <MetricsGrid>
                <StatBox>
                    <StatValue>{summary.total_pitches}</StatValue>
                    <StatLabel>Pitches</StatLabel>
                </StatBox>
                <StatBox>
                    <StatValue style={{ color: '#22c55e' }}>{summary.strikes}</StatValue>
                    <StatLabel>Strikes</StatLabel>
                </StatBox>
                <StatBox>
                    <StatValue>{summary.strike_percentage}%</StatValue>
                    <StatLabel>Strike %</StatLabel>
                </StatBox>
                {summary.target_accuracy_percentage != null && (
                    <StatBox>
                        <StatValue style={{ color: '#8b5cf6' }}>{summary.target_accuracy_percentage}%</StatValue>
                        <StatLabel>Accuracy</StatLabel>
                    </StatBox>
                )}
                {summary.batters_faced != null && (
                    <StatBox>
                        <StatValue>{summary.batters_faced}</StatValue>
                        <StatLabel>Batters</StatLabel>
                    </StatBox>
                )}
                {summary.innings_pitched != null && (
                    <StatBox>
                        <StatValue>{summary.innings_pitched}</StatValue>
                        <StatLabel>Innings</StatLabel>
                    </StatBox>
                )}
            </MetricsGrid>

            {/* Rated Metrics */}
            {summary.metrics.length > 0 && (
                <>
                    <SectionTitle>Key Metrics</SectionTitle>
                    <div>
                        {summary.metrics.map((m) => (
                            <MetricRow key={m.metric_name}>
                                <MetricName>{m.metric_name}</MetricName>
                                <MetricRight>
                                    <RatingBadge rating={m.rating}>{m.value}%</RatingBadge>
                                    {m.delta_from_avg != null && (
                                        <DeltaText positive={m.delta_from_avg > 0}>
                                            {m.delta_from_avg > 0 ? '+' : ''}
                                            {m.delta_from_avg}%
                                        </DeltaText>
                                    )}
                                </MetricRight>
                            </MetricRow>
                        ))}
                    </div>
                </>
            )}

            {/* Pitch Type Breakdown */}
            {summary.pitch_type_breakdown.length > 0 && (
                <>
                    <SectionTitle>Pitch Type Breakdown</SectionTitle>
                    <StatsTable>
                        <thead>
                            <tr>
                                <Th>Type</Th>
                                <Th>#</Th>
                                <Th>K%</Th>
                                <Th>Vel</Th>
                                <Th>Rating</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.pitch_type_breakdown
                                .sort((a, b) => b.count - a.count)
                                .map((pt) => (
                                    <tr key={pt.pitch_type}>
                                        <Td style={{ fontWeight: 600 }}>{formatPitchType(pt.pitch_type)}</Td>
                                        <Td>{pt.count}</Td>
                                        <Td>{pt.strike_percentage}%</Td>
                                        <Td>{pt.top_velocity != null ? `${pt.top_velocity}` : '-'}</Td>
                                        <Td>
                                            <RatingBadge rating={pt.rating}>
                                                {pt.rating === 'highlight' ? 'Good' : pt.rating === 'concern' ? 'Work' : '-'}
                                            </RatingBadge>
                                        </Td>
                                    </tr>
                                ))}
                        </tbody>
                    </StatsTable>
                </>
            )}

            {/* Highlights */}
            {summary.highlights.length > 0 && (
                <>
                    <SectionTitle style={{ color: '#16a34a' }}>Highlights</SectionTitle>
                    <HighlightsList>
                        {summary.highlights.map((h, i) => (
                            <HighlightItem key={i}>{h}</HighlightItem>
                        ))}
                    </HighlightsList>
                </>
            )}

            {/* Concerns */}
            {summary.concerns.length > 0 && (
                <>
                    <SectionTitle style={{ color: '#dc2626' }}>Areas to Improve</SectionTitle>
                    <HighlightsList>
                        {summary.concerns.map((c, i) => (
                            <ConcernItem key={i}>{c}</ConcernItem>
                        ))}
                    </HighlightsList>
                </>
            )}

            {/* Regenerate */}
            {onRegenerate && (
                <RegenerateButton onClick={onRegenerate} disabled={regenerating}>
                    {regenerating ? 'Regenerating...' : 'Regenerate Summary'}
                </RegenerateButton>
            )}
        </Card>
    );
};

export default PerformanceSummaryCard;
