import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { BatterBreakdown, BatterAtBatPitch, PitchType, PitchResult, PitchCallZone } from '@pitch-tracker/shared';

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

// Parse '0-0'..'2-2' → {row, col}. Returns null for waste or unknown zones.
function parseStrikeZone(zone?: PitchCallZone): { row: number; col: number } | null {
    if (!zone || zone.startsWith('W-')) return null;
    const parts = zone.split('-');
    if (parts.length !== 2) return null;
    const row = parseInt(parts[0]);
    const col = parseInt(parts[1]);
    if (isNaN(row) || isNaN(col)) return null;
    return { row, col };
}

interface MiniZoneProps {
    zone?: PitchCallZone;
    dotColor: string;
}

function MiniZone({ zone, dotColor }: MiniZoneProps) {
    const parsed = parseStrikeZone(zone);
    const isWaste = zone?.startsWith('W-') ?? false;
    return (
        <View style={styles.miniZone}>
            {[0, 1, 2].map((row) =>
                [0, 1, 2].map((col) => {
                    const active = parsed?.row === row && parsed?.col === col;
                    return <View key={`${row}-${col}`} style={[styles.miniZoneCell, active && { backgroundColor: dotColor }]} />;
                })
            )}
            {isWaste && <View style={[styles.miniZoneWaste, { backgroundColor: dotColor }]} />}
        </View>
    );
}

function formatResult(result?: string): string {
    if (!result) return '—';
    return result.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatInning(num: number, half: string): string {
    return `${half === 'top' ? 'Top' : 'Bot'} ${num}`;
}

interface PitchDotProps {
    pitch: BatterAtBatPitch;
}

function PitchDot({ pitch }: PitchDotProps) {
    const colors = RESULT_COLOR[pitch.pitch_result];
    const abbrev = PITCH_ABBREV[pitch.pitch_type] ?? pitch.pitch_type.slice(0, 2).toUpperCase();
    const resultLabel = RESULT_LABEL[pitch.pitch_result];
    const hasTarget = pitch.target_zone != null;

    return (
        <View style={[styles.pitchDot, { backgroundColor: colors.bg }, pitch.is_ab_ending && styles.pitchDotEnding]}>
            <Text style={[styles.pitchCount, { color: colors.text }]}>
                {pitch.balls_before}-{pitch.strikes_before}
            </Text>
            <Text style={[styles.pitchType, { color: colors.text }]}>{abbrev}</Text>
            <Text style={[styles.pitchResult, { color: colors.text }]}>{resultLabel}</Text>
            {pitch.velocity != null && <Text style={[styles.pitchVel, { color: colors.text }]}>{Math.round(pitch.velocity)}</Text>}
            {hasTarget && <MiniZone zone={pitch.target_zone} dotColor={colors.text} />}
            {pitch.is_ab_ending && <View style={styles.endingIndicator} />}
        </View>
    );
}

interface BatterRowProps {
    batter: BatterBreakdown;
}

function BatterRow({ batter }: BatterRowProps) {
    const [expanded, setExpanded] = useState(true);
    const totalPitches = batter.at_bats.reduce((sum, ab) => sum + ab.pitches.length, 0);

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

            {expanded &&
                batter.at_bats.map((ab, abIdx) => (
                    <View key={ab.at_bat_id} style={styles.atBatBlock}>
                        <View style={styles.atBatHeader}>
                            <Text style={styles.atBatInning}>{formatInning(ab.inning_number, ab.inning_half)}</Text>
                            <Text style={styles.atBatResult}>{formatResult(ab.result)}</Text>
                            <Text style={styles.atBatPitchCount}>{ab.pitches.length} pitches</Text>
                        </View>
                        <View style={styles.pitchRow}>
                            {ab.pitches.map((pitch) => (
                                <PitchDot key={`${ab.at_bat_id}-${pitch.pitch_number}`} pitch={pitch} />
                            ))}
                        </View>
                        {abIdx < batter.at_bats.length - 1 && <View style={styles.atBatDivider} />}
                    </View>
                ))}
        </View>
    );
}

interface Props {
    breakdown: BatterBreakdown[];
}

export default function BatterBreakdownView({ breakdown }: Props) {
    if (breakdown.length === 0) {
        return (
            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        Batter Breakdown
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
                    Batter Breakdown
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
                <Text style={styles.pitchDotHint}>Count · Type · Result · Vel</Text>
                {[...breakdown]
                    .sort((a, b) => a.batting_order - b.batting_order)
                    .map((batter, idx) => (
                        <View key={batter.batter_id}>
                            <BatterRow batter={batter} />
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
        color: '#6b7280',
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
    miniZone: {
        width: 27,
        height: 27,
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 2,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.15)',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
    },
    miniZoneCell: {
        width: 9,
        height: 9,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.1)',
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    miniZoneWaste: {
        position: 'absolute',
        top: 9,
        left: 9,
        width: 9,
        height: 9,
        borderRadius: 5,
        opacity: 0.7,
    },
});
