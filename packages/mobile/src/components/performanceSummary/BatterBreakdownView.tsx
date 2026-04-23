import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Divider, SegmentedButtons } from 'react-native-paper';
import {
    BatterBreakdown,
    BatterAtBatPitch,
    PitchType,
    PitchResult,
    PitchCallZone,
    PitchLocationHeatMap,
    SprayChartData,
} from '@pitch-tracker/shared';
import HeatMapView from '../live/HeatMapView/HeatMapView';
import SprayChartView from '../live/SprayChartView/SprayChartView';
import { analyticsApi } from '../../state/analytics/api/analyticsApi';

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

function getLocationLabel(zone?: PitchCallZone, bats?: string): string | null {
    if (!zone) return null;
    if (zone.startsWith('W-')) return 'W';
    const col = parseInt(zone.split('-')[1]);
    if (isNaN(col)) return null;
    if (col === 1) return 'Mid';
    const isLHH = bats === 'L';
    return col === 0 ? (isLHH ? 'Out' : 'In') : isLHH ? 'In' : 'Out';
}

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

function formatAtBatResult(result?: string, fieldedBy?: string, pitches?: { pitch_result: string }[]): string {
    if (!result) return '—';
    const fn = fieldedBy ? (POSITION_NUM[fieldedBy] ?? null) : null;
    switch (result) {
        case 'strikeout': {
            const lastPitch = pitches?.[pitches.length - 1];
            return lastPitch?.pitch_result === 'called_strike' ? 'ꓘ' : 'K';
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

interface PitchDotProps {
    pitch: BatterAtBatPitch;
    bats?: string;
}

function PitchDot({ pitch, bats }: PitchDotProps) {
    const colors = RESULT_COLOR[pitch.pitch_result];
    const abbrev = PITCH_ABBREV[pitch.pitch_type] ?? pitch.pitch_type.slice(0, 2).toUpperCase();
    const resultLabel = RESULT_LABEL[pitch.pitch_result];
    const locationLabel = getLocationLabel(pitch.target_zone, bats);
    return (
        <View style={[styles.pitchDot, { backgroundColor: colors.bg }, pitch.is_ab_ending && styles.pitchDotEnding]}>
            <Text style={[styles.pitchCount, { color: colors.text }]}>
                {pitch.balls_before}-{pitch.strikes_before}
            </Text>
            <Text style={[styles.pitchType, { color: colors.text }]}>{abbrev}</Text>
            <Text style={[styles.pitchResult, { color: colors.text }]}>{resultLabel}</Text>
            {pitch.velocity != null && <Text style={[styles.pitchVel, { color: colors.text }]}>{Math.round(pitch.velocity)}</Text>}
            {locationLabel != null && <Text style={[styles.pitchLoc, { color: colors.text }]}>{locationLabel}</Text>}
            {pitch.is_ab_ending && <View style={styles.endingIndicator} />}
        </View>
    );
}

type BatterView = 'pitches' | 'charts';

interface BatterRowProps {
    batter: BatterBreakdown;
    pitcherId?: string;
    gameId?: string;
}

function BatterRow({ batter, pitcherId, gameId }: BatterRowProps) {
    const [expanded, setExpanded] = useState(true);
    const [view, setView] = useState<BatterView>('pitches');
    const [heatmap, setHeatmap] = useState<PitchLocationHeatMap | null>(null);
    const [sprayChart, setSprayChart] = useState<SprayChartData[] | null>(null);
    const [chartLoading, setChartLoading] = useState(false);
    const totalPitches = batter.at_bats.reduce((sum, ab) => sum + ab.pitches.length, 0);

    const loadChart = useCallback(
        async (nextView: BatterView) => {
            if (nextView === 'pitches') return;
            const needHeatmap = !heatmap;
            const needSpray = !sprayChart;
            if (!needHeatmap && !needSpray) return;
            setChartLoading(true);
            try {
                await Promise.all([
                    needHeatmap ? analyticsApi.getHeatMap(batter.batter_id, pitcherId).then(setHeatmap) : Promise.resolve(),
                    needSpray ? analyticsApi.getSprayChart(batter.batter_id, gameId).then(setSprayChart) : Promise.resolve(),
                ]);
            } catch {
                // leave previous data in place
            } finally {
                setChartLoading(false);
            }
        },
        [batter.batter_id, pitcherId, gameId, heatmap, sprayChart]
    );

    const handleViewChange = (v: string) => {
        const next = v as BatterView;
        setView(next);
        loadChart(next);
    };

    return (
        <View style={styles.batterRow}>
            <TouchableOpacity style={styles.batterHeader} onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
                <View style={styles.batterOrder}>
                    <Text style={styles.batterOrderNum}>{batter.batting_order}</Text>
                </View>
                <View style={styles.batterInfo}>
                    <Text style={styles.batterName}>{batter.batter_name}</Text>
                    <Text style={styles.batterMeta}>
                        {batter.position ?? '—'} · {batter.bats}HH · {batter.at_bats.length} AB · {totalPitches}P
                    </Text>
                </View>
                <Text style={styles.expandChevron}>{expanded ? '▲' : '▽'}</Text>
            </TouchableOpacity>

            {expanded && (
                <>
                    <View style={styles.viewToggleRow}>
                        <SegmentedButtons
                            value={view}
                            onValueChange={handleViewChange}
                            buttons={[
                                { value: 'pitches', label: 'Pitches', style: styles.segBtn },
                                { value: 'charts', label: 'Charts', style: styles.segBtn },
                            ]}
                            style={styles.viewToggle}
                        />
                    </View>

                    {view === 'pitches' &&
                        batter.at_bats.map((ab, abIdx) => (
                            <View key={ab.at_bat_id} style={styles.atBatBlock}>
                                <View style={styles.atBatHeader}>
                                    <Text style={styles.atBatInning}>{formatInning(ab.inning_number, ab.inning_half)}</Text>
                                    <Text style={styles.atBatResult}>
                                        {formatAtBatResult(ab.result, ab.fielded_by_position, ab.pitches)}
                                    </Text>
                                    <Text style={styles.atBatPitchCount}>{ab.pitches.length} pitches</Text>
                                </View>
                                <View style={styles.pitchRow}>
                                    {ab.pitches.map((pitch) => (
                                        <PitchDot key={`${ab.at_bat_id}-${pitch.pitch_number}`} pitch={pitch} bats={batter.bats} />
                                    ))}
                                </View>
                                {abIdx < batter.at_bats.length - 1 && <View style={styles.atBatDivider} />}
                            </View>
                        ))}

                    {view === 'charts' && (
                        <View style={styles.chartContainer}>
                            {chartLoading && <Text style={styles.chartLoading}>Loading charts…</Text>}
                            {!chartLoading && (
                                <>
                                    {heatmap ? (
                                        <HeatMapView heatmap={heatmap} bats={batter.bats} />
                                    ) : (
                                        <Text style={styles.chartLoading}>No heatmap data.</Text>
                                    )}
                                    <View style={styles.chartDivider} />
                                    {sprayChart ? (
                                        <SprayChartView sprayData={sprayChart} />
                                    ) : (
                                        <Text style={styles.chartLoading}>No spray chart data.</Text>
                                    )}
                                </>
                            )}
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

interface Props {
    breakdown: BatterBreakdown[];
    title?: string;
    pitcherId?: string;
    gameId?: string;
}

export default function BatterBreakdownView({ breakdown, title = 'Batter Breakdown', pitcherId, gameId }: Props) {
    if (breakdown.length === 0) {
        return (
            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        {title}
                    </Text>
                    <Divider style={styles.divider} />
                    <Text style={styles.empty}>No batter data available.</Text>
                </Card.Content>
            </Card>
        );
    }

    return (
        <Card style={styles.card}>
            <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    {title}
                </Text>
                <View style={styles.legend}>
                    {(
                        [
                            ['ball', 'Ball'],
                            ['called_strike', 'Called K'],
                            ['swinging_strike', 'Swing K'],
                            ['foul', 'Foul'],
                            ['in_play', 'In Play'],
                        ] as [PitchResult, string][]
                    ).map(([result, label]) => {
                        const c = RESULT_COLOR[result];
                        return (
                            <View key={result} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: c.bg, borderColor: c.text }]} />
                                <Text style={styles.legendLabel}>{label}</Text>
                            </View>
                        );
                    })}
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, styles.endingLegendDot]} />
                        <Text style={styles.legendLabel}>AB End</Text>
                    </View>
                </View>
                <Divider style={styles.divider} />
                <Text style={styles.pitchDotHint}>Count · Type · Result · Vel · Loc</Text>
                {[...breakdown]
                    .sort((a, b) => a.batting_order - b.batting_order)
                    .map((batter, idx) => (
                        <View key={batter.batter_id}>
                            <BatterRow batter={batter} pitcherId={pitcherId} gameId={gameId} />
                            {idx < breakdown.length - 1 && <Divider style={styles.batterDivider} />}
                        </View>
                    ))}
            </Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
    },
    sectionTitle: {
        marginBottom: 8,
    },
    divider: {
        marginBottom: 12,
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1,
    },
    endingLegendDot: {
        backgroundColor: '#fef9c3',
        borderColor: '#eab308',
        borderWidth: 2,
    },
    legendLabel: {
        fontSize: 10,
        color: '#6b7280',
    },
    pitchDotHint: {
        fontSize: 10,
        color: '#9ca3af',
        marginBottom: 12,
        fontStyle: 'italic',
    },
    empty: {
        fontSize: 13,
        color: '#9ca3af',
    },
    batterRow: {
        paddingVertical: 4,
    },
    batterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 6,
    },
    batterOrder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#1e3a5f',
        alignItems: 'center',
        justifyContent: 'center',
    },
    batterOrderNum: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    },
    batterInfo: {
        flex: 1,
    },
    batterName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    batterMeta: {
        fontSize: 11,
        color: '#6b7280',
    },
    expandChevron: {
        fontSize: 11,
        color: '#9ca3af',
    },
    viewToggleRow: {
        paddingLeft: 38,
        paddingBottom: 8,
    },
    viewToggle: {
        height: 32,
    },
    segBtn: {
        minWidth: 0,
    },
    atBatBlock: {
        paddingLeft: 38,
        paddingBottom: 8,
    },
    atBatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    atBatInning: {
        fontSize: 11,
        fontWeight: '600',
        color: '#374151',
        minWidth: 52,
    },
    atBatResult: {
        fontSize: 11,
        fontWeight: '700',
        color: '#374151',
        flex: 1,
    },
    atBatPitchCount: {
        fontSize: 10,
        color: '#9ca3af',
    },
    pitchRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    pitchDot: {
        width: 44,
        minHeight: 52,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        position: 'relative',
    },
    pitchDotEnding: {
        borderWidth: 2,
        borderColor: '#eab308',
    },
    pitchCount: {
        fontSize: 9,
        fontWeight: '700',
        lineHeight: 12,
    },
    pitchType: {
        fontSize: 12,
        fontWeight: '800',
        lineHeight: 16,
    },
    pitchResult: {
        fontSize: 9,
        fontWeight: '600',
        lineHeight: 12,
    },
    pitchVel: {
        fontSize: 9,
        lineHeight: 11,
        opacity: 0.8,
    },
    endingIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#eab308',
    },
    atBatDivider: {
        marginTop: 8,
        marginBottom: 2,
        backgroundColor: '#f3f4f6',
    },
    batterDivider: {
        marginVertical: 4,
        backgroundColor: '#e5e7eb',
    },
    pitchLoc: {
        fontSize: 9,
        fontWeight: '600',
        lineHeight: 11,
        opacity: 0.85,
    },
    chartContainer: {
        paddingLeft: 38,
        paddingBottom: 8,
        alignItems: 'center',
    },
    chartLoading: {
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
        marginTop: 16,
    },
    chartDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        alignSelf: 'stretch' as const,
        marginVertical: 8,
        marginHorizontal: 16,
    },
});
