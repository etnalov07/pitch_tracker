import { PitchLocationData } from '@pitch-tracker/shared';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

// Scale from the 300×300 viewBox used by the live StrikeZone
const SIZE = 200;
const S = SIZE / 300;
const toX = (lx: number) => (105 + lx * 90) * S;
const toY = (ly: number) => (100 + ly * 132) * S;

interface Props {
    pitches: PitchLocationData[];
    bats?: string;
}

export default function HeatMapView({ pitches, bats }: Props) {
    const located = pitches.filter((p) => p.location_x != null && p.location_y != null);
    const typesPresent = [...new Set(located.map((p) => p.pitch_type))];

    return (
        <View style={styles.wrapper}>
            <Text style={styles.label}>{bats === 'L' ? 'LHH' : 'RHH'} · Pitch Locations by Type</Text>
            <Svg width={SIZE} height={SIZE}>
                <Rect x={0} y={0} width={SIZE} height={SIZE} fill="#f5f5f0" />
                {/* Waste area */}
                <Rect
                    x={73 * S}
                    y={65 * S}
                    width={154 * S}
                    height={202 * S}
                    fill="rgba(200,200,195,0.25)"
                    stroke="#b0b0a8"
                    strokeWidth={1}
                />
                {/* Strike zone */}
                <Rect
                    x={105 * S}
                    y={100 * S}
                    width={90 * S}
                    height={132 * S}
                    fill="rgba(255,255,255,0.9)"
                    stroke="#374151"
                    strokeWidth={1.5}
                />
                {/* 3×3 grid lines */}
                <Line x1={105 * S} y1={144 * S} x2={195 * S} y2={144 * S} stroke="#d1d5db" strokeWidth={0.5} />
                <Line x1={105 * S} y1={188 * S} x2={195 * S} y2={188 * S} stroke="#d1d5db" strokeWidth={0.5} />
                <Line x1={135 * S} y1={100 * S} x2={135 * S} y2={232 * S} stroke="#d1d5db" strokeWidth={0.5} />
                <Line x1={165 * S} y1={100 * S} x2={165 * S} y2={232 * S} stroke="#d1d5db" strokeWidth={0.5} />
                {/* Pitch dots */}
                {located.map((p, i) => (
                    <Circle
                        key={i}
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
            {typesPresent.length > 0 && (
                <View style={styles.legend}>
                    {typesPresent.map((type) => (
                        <View key={type} style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: PITCH_TYPE_COLORS[type] ?? '#9ca3af' }]} />
                            <Text style={styles.legendLabel}>{PITCH_TYPE_ABBREV[type] ?? type}</Text>
                        </View>
                    ))}
                </View>
            )}
            {located.length === 0 && <Text style={styles.empty}>No pitch location data.</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { alignItems: 'center', gap: 6 },
    label: { fontSize: 11, color: '#6b7280', fontStyle: 'italic' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 210 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { fontSize: 10, color: '#6b7280' },
    empty: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
});
