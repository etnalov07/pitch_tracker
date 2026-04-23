import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { PitchLocationHeatMap } from '@pitch-tracker/shared';

const INNER_ZONES = [
    ['TL', 'TM', 'TR'],
    ['ML', 'MM', 'MR'],
    ['BL', 'BM', 'BR'],
];

const OUTER_TOP = ['OTL', 'OT', 'OTR'];
const OUTER_BOTTOM = ['OBL', 'OB', 'OBR'];
const OUTER_LEFT = ['OTL', 'OL', 'OBL'];
const OUTER_RIGHT = ['OTR', 'OR', 'OBR'];

function interpolateColor(t: number): string {
    // 0 = blue (cold), 1 = red (hot)
    const r = Math.round(t * 220);
    const g = Math.round(60 + (1 - t) * 120);
    const b = Math.round((1 - t) * 220);
    return `rgb(${r},${g},${b})`;
}

function getZoneColor(zone: { count: number } | undefined, maxCount: number): string {
    if (!zone || zone.count === 0 || maxCount === 0) return '#f3f4f6';
    return interpolateColor(zone.count / maxCount);
}

function getTextColor(bg: string): string {
    if (bg === '#f3f4f6') return '#9ca3af';
    // light color → dark text; dark color → white text (simple luminance check)
    const match = bg.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (!match) return '#111827';
    const lum = (parseInt(match[1]) * 299 + parseInt(match[2]) * 587 + parseInt(match[3]) * 114) / 1000;
    return lum > 140 ? '#111827' : '#ffffff';
}

interface Props {
    heatmap: PitchLocationHeatMap;
    bats?: string;
}

export default function HeatMapView({ heatmap, bats }: Props) {
    const zones = heatmap.zones ?? {};
    const allCounts = Object.values(zones).map((z) => z.count);
    const maxCount = allCounts.length > 0 ? Math.max(...allCounts) : 1;

    const isLHH = bats === 'L';

    const renderZone = (zoneId: string, size: number, fontSize = 9) => {
        const zone = zones[zoneId];
        const bg = getZoneColor(zone, maxCount);
        const textColor = getTextColor(bg);
        return (
            <View key={zoneId} style={[styles.zone, { width: size, height: size, backgroundColor: bg }]}>
                <Text style={[styles.zoneCount, { color: textColor, fontSize }]}>{zone?.count ?? 0}</Text>
                {zone && zone.count > 0 && (
                    <Text style={[styles.zoneAvg, { color: textColor }]}>{zone.avg.toFixed(2).replace('0.', '.')}</Text>
                )}
            </View>
        );
    };

    // Mirror zone columns for LHH so "inside" is on the correct side
    const innerRows = INNER_ZONES.map((row) => (isLHH ? [...row].reverse() : row));

    return (
        <View style={styles.wrapper}>
            <View style={styles.handLabel}>
                <Text style={styles.handLabelText}>{isLHH ? 'LHH' : 'RHH'} · Pitch Location Heatmap</Text>
            </View>
            <View style={styles.grid}>
                {/* Outer top row */}
                <View style={styles.outerRow}>
                    {(isLHH ? [...OUTER_TOP].reverse() : OUTER_TOP).map((z) => renderZone(z, 28, 8))}
                </View>
                {/* Middle section: outer-left + inner 3×3 + outer-right */}
                <View style={styles.middleSection}>
                    <View style={styles.outerCol}>
                        {(isLHH ? [...OUTER_LEFT].reverse() : OUTER_LEFT).map((z) => renderZone(z, 28, 8))}
                    </View>
                    <View style={styles.innerGrid}>
                        {innerRows.map((row, ri) => (
                            <View key={ri} style={styles.innerRow}>
                                {row.map((z) => renderZone(z, 40, 10))}
                            </View>
                        ))}
                    </View>
                    <View style={styles.outerCol}>
                        {(isLHH ? [...OUTER_RIGHT].reverse() : OUTER_RIGHT).map((z) => renderZone(z, 28, 8))}
                    </View>
                </View>
                {/* Outer bottom row */}
                <View style={styles.outerRow}>
                    {(isLHH ? [...OUTER_BOTTOM].reverse() : OUTER_BOTTOM).map((z) => renderZone(z, 28, 8))}
                </View>
            </View>
            <View style={styles.legend}>
                <View style={[styles.legendSwatch, { backgroundColor: '#f3f4f6' }]} />
                <Text style={styles.legendLabel}>0</Text>
                <View style={[styles.legendBar]}>
                    {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                        <View key={t} style={[styles.legendBarSegment, { backgroundColor: interpolateColor(t) }]} />
                    ))}
                </View>
                <Text style={styles.legendLabel}>{maxCount}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    handLabel: {
        marginBottom: 6,
    },
    handLabelText: {
        fontSize: 11,
        color: '#6b7280',
        fontStyle: 'italic',
    },
    grid: {
        alignItems: 'center',
        gap: 2,
    },
    outerRow: {
        flexDirection: 'row',
        gap: 2,
        marginLeft: 30,
        marginRight: 30,
    },
    middleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    outerCol: {
        gap: 2,
    },
    innerGrid: {
        gap: 2,
    },
    innerRow: {
        flexDirection: 'row',
        gap: 2,
    },
    zone: {
        borderRadius: 3,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    zoneCount: {
        fontWeight: '700',
        lineHeight: 13,
    },
    zoneAvg: {
        fontSize: 7,
        lineHeight: 9,
        opacity: 0.85,
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },
    legendSwatch: {
        width: 14,
        height: 14,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    legendLabel: {
        fontSize: 9,
        color: '#6b7280',
    },
    legendBar: {
        flexDirection: 'row',
        width: 60,
        height: 10,
        borderRadius: 2,
        overflow: 'hidden',
    },
    legendBarSegment: {
        flex: 1,
    },
});
