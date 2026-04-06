import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ZoneCell {
    zone: string;
    value: number; // 0-1 intensity
    displayValue: string;
    count?: number;
}

interface TendencyZoneGridProps {
    cells: ZoneCell[];
    highColor?: string;
    lowColor?: string;
}

const ZONE_LABELS: Record<string, string> = {
    '0-0': 'UI',
    '0-1': 'UM',
    '0-2': 'UA',
    '1-0': 'MI',
    '1-1': 'MM',
    '1-2': 'MA',
    '2-0': 'DI',
    '2-1': 'DM',
    '2-2': 'DA',
};

const STRIKE_ZONES = ['0-0', '0-1', '0-2', '1-0', '1-1', '1-2', '2-0', '2-1', '2-2'];

function lerpColor(lo: string, hi: string, t: number): string {
    const parse = (hex: string) => {
        const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [200, 200, 200];
    };
    const l = parse(lo);
    const h = parse(hi);
    const r = Math.round(l[0] + (h[0] - l[0]) * t);
    const g = Math.round(l[1] + (h[1] - l[1]) * t);
    const b = Math.round(l[2] + (h[2] - l[2]) * t);
    return `rgb(${r},${g},${b})`;
}

const TendencyZoneGrid: React.FC<TendencyZoneGridProps> = ({ cells, highColor = '#1d4ed8', lowColor = '#dbeafe' }) => {
    const cellMap: Record<string, ZoneCell> = {};
    for (const c of cells) cellMap[c.zone] = c;

    return (
        <View style={styles.grid}>
            {STRIKE_ZONES.map((zone) => {
                const cell = cellMap[zone];
                const intensity = cell ? Math.min(1, Math.max(0, cell.value)) : 0;
                const hasData = cell && (cell.count ?? 0) > 0;
                const bg = hasData ? lerpColor(lowColor, highColor, intensity) : '#f3f4f6';
                const textColor = intensity > 0.6 ? 'white' : '#374151';
                return (
                    <View key={zone} style={[styles.cell, { backgroundColor: bg }]}>
                        <Text style={[styles.zoneLabel, { color: intensity > 0.6 ? 'rgba(255,255,255,0.6)' : '#9ca3af' }]}>
                            {ZONE_LABELS[zone]}
                        </Text>
                        <Text style={[styles.value, { color: textColor }]}>{cell?.displayValue || '—'}</Text>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 168,
        borderWidth: 2,
        borderColor: '#9ca3af',
        borderRadius: 6,
        padding: 3,
        backgroundColor: '#f9fafb',
        gap: 3,
    },
    cell: {
        width: 48,
        height: 40,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
    },
    zoneLabel: {
        fontSize: 8,
        fontWeight: '700',
    },
    value: {
        fontSize: 11,
        fontWeight: '700',
    },
});

export default TendencyZoneGrid;
