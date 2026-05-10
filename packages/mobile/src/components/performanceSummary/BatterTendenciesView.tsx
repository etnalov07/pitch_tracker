import { PitchLocationData, TendencyBucket } from '@pitch-tracker/shared';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

const PITCH_TYPE_COLORS: Record<string, string> = {
    fastball: '#ef4444',
    '4-seam': '#ef4444',
    '2-seam': '#f97316',
    cutter: '#f59e0b',
    sinker: '#eab308',
    slider: '#3b82f6',
    curveball: '#8b5cf6',
    changeup: '#22c55e',
    splitter: '#14b8a6',
    knuckleball: '#6b7280',
    screwball: '#ec4899',
    other: '#9ca3af',
};

const PITCH_TYPE_ABBREV: Record<string, string> = {
    fastball: 'FB',
    '4-seam': 'FB',
    '2-seam': '2S',
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

const BUCKET_ORDER: TendencyBucket[] = ['first_pitch', 'hitter_count', 'pitcher_count', 'two_strike'];

const BUCKET_LABELS: Record<TendencyBucket, string> = {
    first_pitch: 'First Pitch',
    hitter_count: "Hitter's Count",
    pitcher_count: "Pitcher's Count",
    two_strike: '2-Strike',
};

function bucketFor(p: PitchLocationData): TendencyBucket | null {
    const b = p.balls_before;
    const s = p.strikes_before;
    if (b == null || s == null) return null;
    if (b === 0 && s === 0) return 'first_pitch';
    if (s === 2) return 'two_strike';
    if (b > s) return 'hitter_count';
    return 'pitcher_count';
}

// Mirror the live StrikeZone scaling. Same geometry as web BatterTendenciesView,
// rendered at 110px display size for phone screens.
const SIZE = 110;
const S = SIZE / 300;
const toX = (lx: number) => (113 + lx * 75) * S;
const toY = (ly: number) => (120 + ly * 110) * S;

interface Props {
    pitches: PitchLocationData[];
    bats?: string;
}

export default function BatterTendenciesView({ pitches, bats }: Props) {
    const theme = useTheme();
    const bucketed: Record<TendencyBucket, PitchLocationData[]> = {
        first_pitch: [],
        hitter_count: [],
        pitcher_count: [],
        two_strike: [],
    };
    let unbucketed = 0;
    for (const p of pitches) {
        const b = bucketFor(p);
        if (b) bucketed[b].push(p);
        else unbucketed++;
    }

    const typesPresent = [...new Set(pitches.map((p) => p.pitch_type))];
    const handLabel = bats === 'L' ? 'LHH' : 'RHH';

    return (
        <View style={styles.wrapper}>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{handLabel} · Tendencies by Count</Text>
            <View style={styles.bucketGrid}>
                {BUCKET_ORDER.map((bucket) => (
                    <BucketCell key={bucket} label={BUCKET_LABELS[bucket]} pitches={bucketed[bucket]} />
                ))}
            </View>
            {typesPresent.length > 0 && (
                <View style={styles.legend}>
                    {typesPresent.map((type) => (
                        <View key={type} style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: PITCH_TYPE_COLORS[type] ?? '#9ca3af' }]} />
                            <Text style={[styles.legendLabel, { color: theme.colors.onSurfaceVariant }]}>
                                {PITCH_TYPE_ABBREV[type] ?? type}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
            <Text style={[styles.hintText, { color: theme.colors.onSurfaceVariant }]}>
                ○ target · ● actual (color = pitch type)
            </Text>
            {unbucketed > 0 && (
                <Text style={[styles.hintText, { color: theme.colors.onSurfaceVariant }]}>
                    {unbucketed} pitch{unbucketed === 1 ? '' : 'es'} without count data omitted
                </Text>
            )}
            {pitches.length === 0 && <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>No pitch data.</Text>}
        </View>
    );
}

interface BucketCellProps {
    label: string;
    pitches: PitchLocationData[];
}

function BucketCell({ label, pitches }: BucketCellProps) {
    const theme = useTheme();
    const located = pitches.filter((p) => p.location_x != null && p.location_y != null);
    const targeted = pitches.filter((p) => p.target_location_x != null && p.target_location_y != null);

    const typeCounts = new Map<string, number>();
    for (const p of pitches) typeCounts.set(p.pitch_type, (typeCounts.get(p.pitch_type) ?? 0) + 1);
    const topTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const total = pitches.length;

    return (
        <View style={styles.cell}>
            <Text style={[styles.cellLabel, { color: theme.colors.onSurface }]}>{label}</Text>
            <Text style={[styles.cellTotal, { color: theme.colors.onSurfaceVariant }]}>
                {total} pitch{total === 1 ? '' : 'es'}
            </Text>
            <Svg width={SIZE} height={SIZE}>
                <Rect x={0} y={0} width={SIZE} height={SIZE} fill="#f5f5f0" />
                <Rect
                    x={81 * S}
                    y={85 * S}
                    width={139 * S}
                    height={185 * S}
                    fill="rgba(200,200,195,0.25)"
                    stroke="#b0b0a8"
                    strokeWidth={1}
                />
                <Rect
                    x={113 * S}
                    y={120 * S}
                    width={75 * S}
                    height={110 * S}
                    fill="rgba(255,255,255,0.9)"
                    stroke="#374151"
                    strokeWidth={1.5}
                />
                <Line x1={113 * S} y1={156.7 * S} x2={188 * S} y2={156.7 * S} stroke="#d1d5db" strokeWidth={0.5} />
                <Line x1={113 * S} y1={193.4 * S} x2={188 * S} y2={193.4 * S} stroke="#d1d5db" strokeWidth={0.5} />
                <Line x1={138 * S} y1={120 * S} x2={138 * S} y2={230 * S} stroke="#d1d5db" strokeWidth={0.5} />
                <Line x1={163 * S} y1={120 * S} x2={163 * S} y2={230 * S} stroke="#d1d5db" strokeWidth={0.5} />
                {targeted.map((p, i) => (
                    <Circle
                        key={`t-${i}`}
                        cx={toX(p.target_location_x!)}
                        cy={toY(p.target_location_y!)}
                        r={5}
                        fill="none"
                        stroke={PITCH_TYPE_COLORS[p.pitch_type] ?? '#9ca3af'}
                        strokeWidth={1.5}
                        opacity={0.6}
                    />
                ))}
                {located.map((p, i) => (
                    <Circle
                        key={`a-${i}`}
                        cx={toX(p.location_x)}
                        cy={toY(p.location_y)}
                        r={4}
                        fill={PITCH_TYPE_COLORS[p.pitch_type] ?? '#9ca3af'}
                        opacity={0.85}
                        stroke="white"
                        strokeWidth={0.8}
                    />
                ))}
            </Svg>
            <View style={styles.cellTypeList}>
                {topTypes.length === 0 ? (
                    <Text style={[styles.cellTypeEmpty, { color: theme.colors.onSurfaceVariant }]}>—</Text>
                ) : (
                    topTypes.map(([type, count]) => (
                        <View key={type} style={styles.cellTypeRow}>
                            <View style={[styles.dot, { backgroundColor: PITCH_TYPE_COLORS[type] ?? '#9ca3af' }]} />
                            <Text style={[styles.cellTypeText, { color: theme.colors.onSurface }]}>
                                {PITCH_TYPE_ABBREV[type] ?? type} {Math.round((count / total) * 100)}%
                            </Text>
                        </View>
                    ))
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { alignItems: 'center', gap: 6, alignSelf: 'stretch' },
    label: { fontSize: 11, fontStyle: 'italic' },
    bucketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    cell: { alignItems: 'center', gap: 2, minWidth: 110 },
    cellLabel: { fontSize: 10, fontWeight: '600' },
    cellTotal: { fontSize: 9 },
    cellTypeList: { alignItems: 'center', gap: 1, marginTop: 2, minHeight: 36 },
    cellTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    cellTypeText: { fontSize: 9 },
    cellTypeEmpty: { fontSize: 9, fontStyle: 'italic' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 360 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { fontSize: 10 },
    hintText: { fontSize: 9, fontStyle: 'italic' },
    empty: { fontSize: 12, fontStyle: 'italic' },
});
