import {
    PerformanceSummary,
    BatterBreakdown,
    BatterAtBatPitch,
    PitchType,
    PitchResult,
    PitchCallZone,
} from '@pitch-tracker/shared';
import React, { useEffect, useState } from 'react';
import { performanceSummaryService } from '../../../services/performanceSummaryService';
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
    BatterList,
    BatterRowContainer,
    BatterHeader,
    BatterOrderBadge,
    BatterNameBlock,
    BatterNameText,
    BatterMetaText,
    AtBatBlock,
    AtBatHeaderRow,
    AtBatInningLabel,
    AtBatResultLabel,
    PitchSequence,
    PitchCard,
    PitchTextLine,
    BreakdownLegend,
    LegendItem,
    LegendDot,
} from './styles';

const PITCH_ABBREV: Record<PitchType, string> = {
    fastball: 'FB',
    '2-seam': '2S',
    '4-seam': '4S',
    cutter: 'CT',
    sinker: 'SK',
    slider: 'SL',
    curveball: 'CB',
    changeup: 'CH',
    splitter: 'SP',
    knuckleball: 'KN',
    screwball: 'SC',
    other: 'OT',
};

const RESULT_COLOR: Record<PitchResult, { bg: string; text: string }> = {
    ball: { bg: '#dbeafe', text: '#1d4ed8' },
    called_strike: { bg: '#fee2e2', text: '#dc2626' },
    swinging_strike: { bg: '#dc2626', text: '#ffffff' },
    foul: { bg: '#fef3c7', text: '#92400e' },
    in_play: { bg: '#dcfce7', text: '#166534' },
    hit_by_pitch: { bg: '#f3e8ff', text: '#6d28d9' },
};

const RESULT_LABEL: Record<PitchResult, string> = {
    ball: 'B',
    called_strike: 'K',
    swinging_strike: 'SW',
    foul: 'F',
    in_play: 'IP',
    hit_by_pitch: 'HBP',
};

const LEGEND_ITEMS: [PitchResult, string][] = [
    ['ball', 'Ball'],
    ['called_strike', 'Called K'],
    ['swinging_strike', 'Swing K'],
    ['foul', 'Foul'],
    ['in_play', 'In Play'],
];

const POSITION_NUM: Record<string, number> = {
    P: 1,
    C: 2,
    '1B': 3,
    '2B': 4,
    '3B': 5,
    SS: 6,
    LF: 7,
    CF: 8,
    RF: 9,
};

function formatAtBatResult(result?: string, fieldedBy?: string, pitches?: { pitch_result: string }[]): React.ReactNode {
    if (!result) return '—';
    const fn = fieldedBy ? (POSITION_NUM[fieldedBy] ?? null) : null;
    switch (result) {
        case 'strikeout': {
            const lastPitch = pitches?.[pitches.length - 1];
            if (lastPitch?.pitch_result === 'called_strike') {
                return <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>K</span>;
            }
            return 'K';
        }
        case 'walk':
            return 'BB';
        case 'hit_by_pitch':
            return 'HBP';
        case 'single':
            return '1B';
        case 'double':
            return '2B';
        case 'triple':
            return '3B';
        case 'home_run':
            return 'HR';
        case 'groundout':
            if (fn === null) return 'GO';
            return fn === 3 ? '3U' : `${fn}-3`;
        case 'flyout':
            return fn !== null ? `F${fn}` : 'FO';
        case 'lineout':
            return fn !== null ? `L${fn}` : 'LO';
        case 'popout':
            return fn !== null ? `P${fn}` : 'PO';
        case 'sacrifice_fly':
            return fn !== null ? `SF${fn}` : 'SF';
        case 'sacrifice_bunt':
            return 'SH';
        case 'double_play':
            return 'DP';
        case 'triple_play':
            return 'TP';
        case 'fielders_choice':
            return 'FC';
        case 'force_out':
            return fn !== null ? `FO${fn}` : 'FO';
        case 'strikeout_dropped':
            return 'K+WP';
        default:
            return result.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
}

function formatInning(num: number, half: string): string {
    return `${half === 'top' ? 'Top' : 'Bot'} ${num}`;
}

function getLocationLabel(zone?: PitchCallZone, bats?: string): string | null {
    if (!zone) return null;
    if (zone.startsWith('W-')) return 'W';
    const col = parseInt(zone.split('-')[1]);
    if (isNaN(col)) return null;
    if (col === 1) return 'Mid';
    const isLHH = bats === 'L';
    return col === 0 ? (isLHH ? 'Out' : 'In') : isLHH ? 'In' : 'Out';
}

function WebPitchCard({ pitch, bats }: { pitch: BatterAtBatPitch; bats?: string }) {
    const colors = RESULT_COLOR[pitch.pitch_result];
    const abbrev = PITCH_ABBREV[pitch.pitch_type] ?? pitch.pitch_type.slice(0, 2).toUpperCase();
    const locationLabel = getLocationLabel(pitch.target_zone, bats);
    return (
        <PitchCard bg={colors.bg} isEnding={pitch.is_ab_ending} title={pitch.pitch_type}>
            <PitchTextLine color={colors.text} size={9}>
                {pitch.balls_before}-{pitch.strikes_before}
            </PitchTextLine>
            <PitchTextLine color={colors.text} size={13}>
                {abbrev}
            </PitchTextLine>
            <PitchTextLine color={colors.text} size={9}>
                {RESULT_LABEL[pitch.pitch_result]}
            </PitchTextLine>
            {pitch.velocity != null && (
                <PitchTextLine color={colors.text} size={9}>
                    {Math.round(pitch.velocity)}
                </PitchTextLine>
            )}
            {locationLabel != null && (
                <PitchTextLine color={colors.text} size={9}>
                    {locationLabel}
                </PitchTextLine>
            )}
        </PitchCard>
    );
}

function WebBatterRow({ batter }: { batter: BatterBreakdown }) {
    const [expanded, setExpanded] = useState(true);
    const totalPitches = batter.at_bats.reduce((sum, ab) => sum + ab.pitches.length, 0);
    return (
        <BatterRowContainer>
            <BatterHeader onClick={() => setExpanded((e) => !e)}>
                <BatterOrderBadge>{batter.batting_order}</BatterOrderBadge>
                <BatterNameBlock>
                    <BatterNameText>{batter.batter_name}</BatterNameText>
                    <BatterMetaText>
                        {batter.position ?? '—'} · {batter.bats}HH · {batter.at_bats.length} AB · {totalPitches}P
                    </BatterMetaText>
                </BatterNameBlock>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{expanded ? '▲' : '▽'}</span>
            </BatterHeader>
            {expanded &&
                batter.at_bats.map((ab) => (
                    <AtBatBlock key={ab.at_bat_id}>
                        <AtBatHeaderRow>
                            <AtBatInningLabel>{formatInning(ab.inning_number, ab.inning_half)}</AtBatInningLabel>
                            <AtBatResultLabel>{formatAtBatResult(ab.result, ab.fielded_by_position, ab.pitches)}</AtBatResultLabel>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{ab.pitches.length} pitches</span>
                        </AtBatHeaderRow>
                        <PitchSequence>
                            {ab.pitches.map((pitch) => (
                                <WebPitchCard key={`${ab.at_bat_id}-${pitch.pitch_number}`} pitch={pitch} bats={batter.bats} />
                            ))}
                        </PitchSequence>
                    </AtBatBlock>
                ))}
        </BatterRowContainer>
    );
}

interface Props {
    summary: PerformanceSummary;
    onRegenerate?: () => void;
    regenerating?: boolean;
}

const formatPitchType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
};

const PerformanceSummaryCard: React.FC<Props> = ({ summary, onRegenerate, regenerating }) => {
    const [batterBreakdown, setBatterBreakdown] = useState<BatterBreakdown[] | null>(null);

    useEffect(() => {
        if (summary.source_type !== 'game') return;
        performanceSummaryService
            .getBatterBreakdown(summary.source_id)
            .then((data) => setBatterBreakdown(data))
            .catch(() => setBatterBreakdown([]));
    }, [summary.source_id, summary.source_type]);
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

            {/* Batter Breakdown */}
            {batterBreakdown != null && batterBreakdown.length > 0 && (
                <>
                    <SectionTitle>Batter Breakdown</SectionTitle>
                    <BreakdownLegend>
                        {LEGEND_ITEMS.map(([result, label]) => {
                            const c = RESULT_COLOR[result];
                            return (
                                <LegendItem key={result}>
                                    <LegendDot bg={c.bg} border={c.text} />
                                    {label}
                                </LegendItem>
                            );
                        })}
                        <LegendItem>
                            <LegendDot bg="#fef9c3" border="#eab308" isEnding />
                            AB-Ending Pitch
                        </LegendItem>
                    </BreakdownLegend>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 8px', fontStyle: 'italic' }}>
                        Count · Type · Result · Vel · Loc
                    </p>
                    <BatterList>
                        {[...batterBreakdown]
                            .sort((a, b) => a.batting_order - b.batting_order)
                            .map((batter) => (
                                <WebBatterRow key={batter.batter_id} batter={batter} />
                            ))}
                    </BatterList>
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
