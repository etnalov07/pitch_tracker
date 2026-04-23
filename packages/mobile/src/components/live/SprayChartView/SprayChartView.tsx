import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { SprayChart, FieldLocation, ContactQuality } from '@pitch-tracker/shared';

const SIZE = 220;
const CX = SIZE / 2;
const CY = SIZE - 20;

// Angles measured from CY point, counter-clockwise (left field line = ~315°, right = ~225°)
// In SVG: 0° = right, going clockwise. We'll use standard outfield angles.
// Left foul line = 225° from center, right foul line = 315° from center (in standard coords)
// Translate: left line angle from our CX/CY = 135° (SVG: y down, x right)

const FIELD_LOCATIONS: Record<FieldLocation, { angle: number; depth: number }> = {
    left_field_line: { angle: -60, depth: 0.82 },
    left_center_gap: { angle: -35, depth: 0.88 },
    center_field: { angle: 0, depth: 0.92 },
    right_center_gap: { angle: 35, depth: 0.88 },
    right_field_line: { angle: 60, depth: 0.82 },
    infield_left: { angle: -25, depth: 0.42 },
    infield_center: { angle: 0, depth: 0.38 },
    infield_right: { angle: 25, depth: 0.42 },
};

const QUALITY_COLOR: Record<ContactQuality, string> = {
    hard: '#dc2626',
    medium: '#f59e0b',
    soft: '#3b82f6',
    weak: '#9ca3af',
};

const RESULT_SYMBOL: Record<string, string> = {
    single: '1B',
    double: '2B',
    triple: '3B',
    home_run: 'HR',
    out: 'X',
};

function toXY(angleDeg: number, depth: number): { x: number; y: number } {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const maxRadius = CY - 8;
    const r = depth * maxRadius;
    return {
        x: CX + r * Math.cos(rad),
        y: CY + r * Math.sin(rad),
    };
}

function arcPath(startAngle: number, endAngle: number, radius: number): string {
    const start = toXY(startAngle, radius / (CY - 8));
    const end = toXY(endAngle, radius / (CY - 8));
    return `M ${CX} ${CY} L ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y} Z`;
}

interface Props {
    sprayChart: SprayChart;
}

export default function SprayChartView({ sprayChart }: Props) {
    const plays = sprayChart.plays.filter((p) => p.field_location);

    return (
        <View style={styles.wrapper}>
            <Text style={styles.title}>Spray Chart</Text>
            <Svg width={SIZE} height={SIZE}>
                {/* Outfield grass */}
                <Path d={arcPath(-65, 65, CY - 10)} fill="#86efac" stroke="#166534" strokeWidth={1} />
                {/* Infield dirt */}
                <Path d={arcPath(-65, 65, (CY - 10) * 0.52)} fill="#fde68a" stroke="#92400e" strokeWidth={0.5} />
                {/* Foul lines */}
                {(() => {
                    const left = toXY(-60, 1.0);
                    const right = toXY(60, 1.0);
                    return (
                        <>
                            <Line x1={CX} y1={CY} x2={left.x} y2={left.y} stroke="#92400e" strokeWidth={1} strokeDasharray="4,3" />
                            <Line
                                x1={CX}
                                y1={CY}
                                x2={right.x}
                                y2={right.y}
                                stroke="#92400e"
                                strokeWidth={1}
                                strokeDasharray="4,3"
                            />
                        </>
                    );
                })()}
                {/* Home plate */}
                <Circle cx={CX} cy={CY} r={5} fill="white" stroke="#374151" strokeWidth={1} />
                {/* Play dots */}
                {plays.map((play, i) => {
                    const loc = FIELD_LOCATIONS[play.field_location!];
                    if (!loc) return null;
                    const jitterAngle = loc.angle + (Math.random() - 0.5) * 6;
                    const jitterDepth = loc.depth + (Math.random() - 0.5) * 0.06;
                    const { x, y } = toXY(jitterAngle, Math.max(0.1, Math.min(0.99, jitterDepth)));
                    const color = play.contact_quality ? QUALITY_COLOR[play.contact_quality] : '#6b7280';
                    const symbol = play.hit_result ? (RESULT_SYMBOL[play.hit_result] ?? 'X') : 'X';
                    return (
                        <React.Fragment key={i}>
                            <Circle cx={x} cy={y} r={7} fill={color} opacity={0.75} />
                            <SvgText x={x} y={y + 3.5} fontSize={6} fontWeight="700" fill="white" textAnchor="middle">
                                {symbol}
                            </SvgText>
                        </React.Fragment>
                    );
                })}
            </Svg>
            {/* Legend */}
            <View style={styles.legend}>
                {(Object.entries(QUALITY_COLOR) as [ContactQuality, string][]).map(([q, c]) => (
                    <View key={q} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: c }]} />
                        <Text style={styles.legendLabel}>{q}</Text>
                    </View>
                ))}
            </View>
            {plays.length === 0 && <Text style={styles.empty}>No batted ball data yet.</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    title: {
        fontSize: 11,
        color: '#6b7280',
        fontStyle: 'italic',
        marginBottom: 4,
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 6,
        justifyContent: 'center',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendLabel: {
        fontSize: 9,
        color: '#6b7280',
    },
    empty: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 8,
        fontStyle: 'italic',
    },
});
