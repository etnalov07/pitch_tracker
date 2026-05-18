import {
    BatterAtBatPitch,
    BatterBreakdown,
    PitchCallZone,
    PitchResult,
    PitchType,
    type PitchLocationData,
    type SprayChartData,
} from '@pitch-tracker/shared';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { analyticsService } from '../../../services/analyticsService';
import BatterHeatMapView from './BatterHeatMapView';
import BatterSprayChartView from './BatterSprayChartView';
import BatterTendenciesView from './BatterTendenciesView';
import {
    AtBatBlock,
    AtBatHeaderRow,
    AtBatInningLabel,
    AtBatResultLabel,
    BatterHeader,
    BatterList,
    BatterMetaText,
    BatterNameBlock,
    BatterNameText,
    BatterOrderBadge,
    BatterRowContainer,
    ChartCard,
    ChartCardHeader,
    ChartCardSubtitle,
    ChartCardTitle,
    ChartLoading,
    ChartsGrid,
    ChartsPanel,
    ChartsToggleBtn,
    EmptyText,
    HintText,
    Legend,
    LegendDot,
    LegendItem,
    PitchCard,
    PitchSequence,
    PitchTextLine,
    SectionHeader,
    Wrapper,
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

function getLocationLabel(zone?: PitchCallZone): string | null {
    if (!zone) return null;
    if (zone.startsWith('W-')) {
        const parts = zone.slice(2).split('-');
        if (parts.length === 1) {
            if (parts[0] === 'high') return 'High';
            if (parts[0] === 'low') return 'Low';
            if (parts[0] === 'in') return 'In';
            if (parts[0] === 'out') return 'Out';
        } else {
            const v = parts[0] === 'high' ? 'Hi' : 'Lo';
            const h = parts[1] === 'in' ? 'In' : 'Out';
            return `${v}-${h}`;
        }
    }
    const col = parseInt(zone.split('-')[1]);
    if (isNaN(col)) return null;
    if (col === 1) return 'Mid';
    // target_zone is semantic — column 0 always means "Inside" and column 2 always
    // means "Outside" regardless of batter handedness. The live grid renders those
    // semantic columns on different visual sides for LHH/RHH, but the stored zone
    // string is the same.
    return col === 0 ? 'In' : 'Out';
}

function PitchCardItem({ pitch }: { pitch: BatterAtBatPitch }) {
    const colors = RESULT_COLOR[pitch.pitch_result];
    const abbrev = PITCH_ABBREV[pitch.pitch_type] ?? pitch.pitch_type.slice(0, 2).toUpperCase();
    const locationLabel = getLocationLabel(pitch.target_zone);
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

function BatterRow({
    batter,
    gameId,
    opponentTeamId,
    opponentName,
    scrollToBatterId,
}: {
    batter: BatterBreakdown;
    gameId?: string;
    opponentTeamId?: string;
    opponentName?: string;
    scrollToBatterId?: string;
}) {
    const [expanded, setExpanded] = useState(true);
    const [showCharts, setShowCharts] = useState(false);
    const [sprayData, setSprayData] = useState<SprayChartData[] | null>(null);
    const [pitchLocations, setPitchLocations] = useState<PitchLocationData[] | null>(null);
    const [chartsLoading, setChartsLoading] = useState(false);
    const rowRef = useRef<HTMLDivElement>(null);
    const totalPitches = batter.at_bats.reduce((sum, ab) => sum + ab.pitches.length, 0);

    useEffect(() => {
        if (scrollToBatterId && scrollToBatterId === batter.batter_id) {
            rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [scrollToBatterId, batter.batter_id]);

    const handleToggleCharts = useCallback(async () => {
        if (showCharts) {
            setShowCharts(false);
            return;
        }
        setShowCharts(true);
        if (sprayData !== null) return;
        setChartsLoading(true);
        try {
            // Our Lineup view: opponent scope (all games vs this opponent), with per-game distinction.
            // Opponent Lineup view: single-game scope (no opponent params).
            const useOpponentScope = Boolean(opponentTeamId || opponentName);
            const sprayGameId = useOpponentScope ? undefined : gameId;
            // Pitch locations are NOT scoped to a single pitcher — the
            // opponent-lineup charts are a scouting view of the hitter and
            // should reflect every pitch they saw (matching the spray chart).
            const [spray, locations] = await Promise.all([
                analyticsService.getSprayChart(batter.batter_id, sprayGameId, opponentTeamId, opponentName),
                analyticsService.getPitchLocations(batter.batter_id, undefined, opponentTeamId, opponentName),
            ]);
            setSprayData(spray);
            setPitchLocations(locations);
        } catch {
            setSprayData([]);
            setPitchLocations([]);
        } finally {
            setChartsLoading(false);
        }
    }, [showCharts, sprayData, batter.batter_id, gameId, opponentTeamId, opponentName]);

    return (
        <BatterRowContainer ref={rowRef}>
            <BatterHeader onClick={() => setExpanded((e) => !e)}>
                <BatterOrderBadge>{batter.batting_order}</BatterOrderBadge>
                <BatterNameBlock>
                    <BatterNameText>{batter.batter_name}</BatterNameText>
                    <BatterMetaText>
                        {batter.position ?? '—'} · {batter.bats}HH · {batter.at_bats.length} AB · {totalPitches}P
                    </BatterMetaText>
                </BatterNameBlock>
                <ChartsToggleBtn
                    active={showCharts}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCharts();
                    }}
                >
                    📊 Charts
                </ChartsToggleBtn>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{expanded ? '▲' : '▽'}</span>
            </BatterHeader>

            {showCharts && (
                <ChartsPanel>
                    {chartsLoading ? (
                        <ChartLoading>Loading charts…</ChartLoading>
                    ) : (
                        <ChartsGrid>
                            <ChartCard>
                                <ChartCardHeader>
                                    <ChartCardTitle>Spray Chart</ChartCardTitle>
                                </ChartCardHeader>
                                <BatterSprayChartView sprayData={sprayData ?? []} currentGameId={gameId} />
                            </ChartCard>
                            <ChartCard>
                                <ChartCardHeader>
                                    <ChartCardTitle>Pitch Locations</ChartCardTitle>
                                    <ChartCardSubtitle>{batter.bats === 'L' ? 'LHH' : 'RHH'}</ChartCardSubtitle>
                                </ChartCardHeader>
                                <BatterHeatMapView pitches={pitchLocations ?? []} />
                            </ChartCard>
                            <ChartCard span="full">
                                <ChartCardHeader>
                                    <ChartCardTitle>Tendencies by Count</ChartCardTitle>
                                    <ChartCardSubtitle>{batter.bats === 'L' ? 'LHH' : 'RHH'}</ChartCardSubtitle>
                                </ChartCardHeader>
                                <BatterTendenciesView pitches={pitchLocations ?? []} />
                            </ChartCard>
                        </ChartsGrid>
                    )}
                </ChartsPanel>
            )}

            {expanded && (
                <>
                    {batter.at_bats.map((ab) => (
                        <AtBatBlock key={ab.at_bat_id}>
                            <AtBatHeaderRow>
                                <AtBatInningLabel>{formatInning(ab.inning_number, ab.inning_half)}</AtBatInningLabel>
                                <AtBatResultLabel>
                                    {formatAtBatResult(ab.result, ab.fielded_by_position, ab.pitches)}
                                </AtBatResultLabel>
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>{ab.pitches.length} pitches</span>
                            </AtBatHeaderRow>
                            <PitchSequence>
                                {ab.pitches.map((pitch) => (
                                    <PitchCardItem key={`${ab.at_bat_id}-${pitch.pitch_number}`} pitch={pitch} />
                                ))}
                            </PitchSequence>
                        </AtBatBlock>
                    ))}
                </>
            )}
        </BatterRowContainer>
    );
}

interface Section {
    title: string;
    batters: BatterBreakdown[];
}

interface Props {
    sections: Section[];
    loading?: boolean;
    gameId?: string;
    /** Scope the heat map to all games against this opponent team (Our Lineup view). */
    opponentTeamId?: string;
    /** Fallback when opponent_team_id is null — match by free-text opponent name. */
    opponentName?: string;
    /** Scroll this batter's row into view on mount (used by live-game modal). */
    scrollToBatterId?: string;
}

const BatterBreakdownPanel: React.FC<Props> = ({ sections, loading, gameId, opponentTeamId, opponentName, scrollToBatterId }) => {
    if (loading) {
        return <EmptyText>Loading batter breakdown…</EmptyText>;
    }

    const allEmpty = sections.every((s) => s.batters.length === 0);
    if (allEmpty) {
        return <EmptyText>No at-bats charted yet.</EmptyText>;
    }

    const showSectionHeaders = sections.length > 1;

    return (
        <Wrapper>
            <Legend>
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
            </Legend>
            <HintText>Count · Type · Result · Vel · Target</HintText>
            {sections.map((section) =>
                section.batters.length === 0 ? null : (
                    <div key={section.title}>
                        {showSectionHeaders && <SectionHeader>{section.title}</SectionHeader>}
                        <BatterList>
                            {[...section.batters]
                                .sort((a, b) => a.batting_order - b.batting_order)
                                .map((batter) => (
                                    <BatterRow
                                        key={batter.batter_id}
                                        batter={batter}
                                        gameId={gameId}
                                        opponentTeamId={opponentTeamId}
                                        opponentName={opponentName}
                                        scrollToBatterId={scrollToBatterId}
                                    />
                                ))}
                        </BatterList>
                    </div>
                )
            )}
        </Wrapper>
    );
};

export default BatterBreakdownPanel;
