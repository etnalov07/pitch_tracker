import { BatterAtBatPitch, BatterBreakdown, SprayChartData } from '@pitch-tracker/shared';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { analyticsApi } from '../../state/analytics/api/analyticsApi';
import BatterSprayChart from './BatterSprayChart';
import PitchChip from './PitchChip';

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

function formatAtBatResult(result?: string, fieldedBy?: string, pitches?: BatterAtBatPitch[]): string {
    if (!result) return '—';
    const fn = fieldedBy ? (POSITION_NUM[fieldedBy] ?? null) : null;
    switch (result) {
        case 'strikeout': {
            const last = pitches?.[pitches.length - 1];
            return last?.pitch_result === 'called_strike' ? 'ꓘ' : 'K';
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
        case 'fielders_choice':
            return 'FC';
        case 'strikeout_dropped':
            return 'K+WP';
        default:
            return result.replace(/_/g, ' ');
    }
}

function formatInning(num: number, half: string): string {
    return `${half === 'top' ? 'Top' : 'Bot'} ${num}`;
}

interface Props {
    batter: BatterBreakdown;
    gameId?: string;
    initiallyExpanded?: boolean;
}

const BatterRow: React.FC<Props> = ({ batter, gameId, initiallyExpanded = true }) => {
    const [expanded, setExpanded] = useState(initiallyExpanded);
    const [showCharts, setShowCharts] = useState(false);
    const [sprayData, setSprayData] = useState<SprayChartData[] | null>(null);
    const [chartsLoading, setChartsLoading] = useState(false);
    const totalPitches = batter.at_bats.reduce((sum, ab) => sum + ab.pitches.length, 0);

    const handleToggleCharts = useCallback(async () => {
        if (showCharts) {
            setShowCharts(false);
            return;
        }
        setShowCharts(true);
        if (sprayData !== null) return;
        setChartsLoading(true);
        try {
            const data = await analyticsApi.getSprayChart(batter.batter_id, gameId);
            setSprayData(data);
        } catch {
            setSprayData([]);
        } finally {
            setChartsLoading(false);
        }
    }, [showCharts, sprayData, batter.batter_id, gameId]);

    return (
        <View style={styles.row}>
            <Pressable style={styles.header} onPress={() => setExpanded((e) => !e)}>
                <View style={styles.orderBadge}>
                    <Text style={styles.orderText}>{batter.batting_order}</Text>
                </View>
                <View style={styles.nameBlock}>
                    <Text style={styles.nameText}>{batter.batter_name}</Text>
                    <Text style={styles.metaText}>
                        {batter.position ?? '—'} · {batter.bats}HH · {batter.at_bats.length} AB · {totalPitches}P
                    </Text>
                </View>
                <Pressable
                    onPress={(e) => {
                        e.stopPropagation?.();
                        handleToggleCharts();
                    }}
                    style={[styles.chartsBtn, showCharts && styles.chartsBtnActive]}
                >
                    <Text style={[styles.chartsBtnText, showCharts && styles.chartsBtnTextActive]}>📊 Spray</Text>
                </Pressable>
                <Text style={styles.caret}>{expanded ? '▲' : '▽'}</Text>
            </Pressable>

            {showCharts && (
                <View style={styles.chartsPanel}>
                    {chartsLoading ? <ActivityIndicator /> : <BatterSprayChart sprayData={sprayData ?? []} />}
                </View>
            )}

            {expanded &&
                batter.at_bats.map((ab) => (
                    <View key={ab.at_bat_id} style={styles.atBatBlock}>
                        <View style={styles.atBatHeader}>
                            <Text style={styles.atBatInning}>{formatInning(ab.inning_number, ab.inning_half)}</Text>
                            <Text style={styles.atBatResult}>
                                {formatAtBatResult(ab.result, ab.fielded_by_position, ab.pitches)}
                            </Text>
                            <Text style={styles.atBatCount}>{ab.pitches.length} pitches</Text>
                        </View>
                        <View style={styles.pitchSequence}>
                            {ab.pitches.map((pitch) => (
                                <PitchChip key={`${ab.at_bat_id}-${pitch.pitch_number}`} pitch={pitch} />
                            ))}
                        </View>
                    </View>
                ))}
            {expanded && batter.at_bats.length === 0 && <Text style={styles.noAbText}>No at-bats yet this game.</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#f9fafb',
        gap: 8,
    },
    orderBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#1f2937',
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 12,
    },
    nameBlock: {
        flex: 1,
    },
    nameText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    metaText: {
        fontSize: 11,
        color: '#6b7280',
    },
    chartsBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#ffffff',
    },
    chartsBtnActive: {
        backgroundColor: '#1f2937',
        borderColor: '#1f2937',
    },
    chartsBtnText: {
        fontSize: 11,
        color: '#374151',
        fontWeight: '600',
    },
    chartsBtnTextActive: {
        color: '#ffffff',
    },
    caret: {
        fontSize: 11,
        color: '#9ca3af',
        marginLeft: 4,
    },
    chartsPanel: {
        padding: 8,
        backgroundColor: '#f9fafb',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    atBatBlock: {
        padding: 8,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    atBatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    atBatInning: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
        width: 56,
    },
    atBatResult: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
    },
    atBatCount: {
        fontSize: 10,
        color: '#9ca3af',
    },
    pitchSequence: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    noAbText: {
        padding: 12,
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
        textAlign: 'center',
    },
});

export default BatterRow;
