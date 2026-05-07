import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { SprayChartData, FieldLocation, ContactType } from '@pitch-tracker/shared';

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

// Mirrors the trajectory aesthetic from the web BaseballDiamond: arc/line/squiggle.
const CONTACT_TYPE_COLOR: Record<ContactType, string> = {
    fly_ball: '#3b82f6',
    pop_up: '#93c5fd',
    line_drive: '#dc2626',
    ground_ball: '#ca8a04',
    bunt: '#6b7280',
};

const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
    fly_ball: 'Fly (arc)',
    pop_up: 'Pop-up',
    line_drive: 'Line Drive',
    ground_ball: 'Grounder',
    bunt: 'Bunt',
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

// Stable jitter seeded by index so dots don't move on re-render
function jitter(idx: number, range: number): number {
    return ((Math.sin(idx * 127.1 + 311.7) * 43758.5) % 1) * range - range / 2;
}

// Trajectory path from home plate (CX, CY) to landing spot (endX, endY).
// Mirrors BaseballDiamond's path math, rescaled to this chart's viewBox.
function trajectoryPath(endX: number, endY: number, type?: ContactType): string {
    const startX = CX;
    const startY = CY;

    if (type === 'line_drive' || type === 'bunt') {
        return `M ${startX} ${startY} L ${endX} ${endY}`;
    }
    if (type === 'fly_ball' || type === 'pop_up') {
        const midX = (startX + endX) / 2;
        const peakOffset = type === 'pop_up' ? 55 : 32; // pop-ups arc higher
        const midY = Math.min(startY, endY) - peakOffset;
        return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
    }
    if (type === 'ground_ball') {
        const segments = 6;
        let path = `M ${startX} ${startY}`;
        const dx = (endX - startX) / segments;
        const dy = (endY - startY) / segments;
        for (let i = 0; i < segments; i++) {
            const x1 = startX + dx * i + dx / 2;
            const y1 = startY + dy * i + dy / 2;
            const wiggle = i % 2 === 0 ? 4 : -4;
            path += ` Q ${x1 + wiggle} ${y1} ${startX + dx * (i + 1)} ${startY + dy * (i + 1)}`;
        }
        return path;
    }
    // Unknown type — straight line, gray
    return `M ${startX} ${startY} L ${endX} ${endY}`;
}

interface Props {
    sprayData: SprayChartData[];
}

export default function SprayChartView({ sprayData }: Props) {
    const plays = sprayData.filter((p) => p.field_location);
    const typesPresent = Array.from(new Set(plays.map((p) => p.contact_type).filter((t): t is ContactType => Boolean(t))));

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
                {/* Trajectories drawn under the dots */}
                {plays.map((play, i) => {
                    const loc = FIELD_LOCATIONS[play.field_location];
                    if (!loc) return null;
                    const a = loc.angle + jitter(i, 6);
                    const d = Math.max(0.1, Math.min(0.99, loc.depth + jitter(i + 1, 0.06)));
                    const { x, y } = toXY(a, d);
                    const color = play.contact_type ? CONTACT_TYPE_COLOR[play.contact_type] : '#9ca3af';
                    return (
                        <Path
                            key={`traj-${i}`}
                            d={trajectoryPath(x, y, play.contact_type)}
                            fill="none"
                            stroke={color}
                            strokeWidth={1.25}
                            opacity={0.4}
                        />
                    );
                })}
                {/* Home plate */}
                <Circle cx={CX} cy={CY} r={5} fill="white" stroke="#374151" strokeWidth={1} />
                {/* One dot per aggregated entry; radius scales with count */}
                {plays.map((play, i) => {
                    const loc = FIELD_LOCATIONS[play.field_location];
                    if (!loc) return null;
                    const a = loc.angle + jitter(i, 6);
                    const d = Math.max(0.1, Math.min(0.99, loc.depth + jitter(i + 1, 0.06)));
                    const { x, y } = toXY(a, d);
                    const color = play.contact_type ? CONTACT_TYPE_COLOR[play.contact_type] : '#6b7280';
                    const symbol = play.hit_result ? (RESULT_SYMBOL[play.hit_result] ?? 'X') : 'X';
                    const r = Math.min(14, 6 + (play.count - 1) * 2);
                    return (
                        <React.Fragment key={`dot-${i}`}>
                            <Circle cx={x} cy={y} r={r} fill={color} opacity={0.85} stroke="white" strokeWidth={1} />
                            <SvgText x={x} y={y + 3.5} fontSize={6} fontWeight="700" fill="white" textAnchor="middle">
                                {symbol}
                            </SvgText>
                        </React.Fragment>
                    );
                })}
            </Svg>
            {/* Legend */}
            <View style={styles.legend}>
                {(typesPresent.length === 0 ? (Object.keys(CONTACT_TYPE_COLOR) as ContactType[]) : typesPresent).map((t) => (
                    <View key={t} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: CONTACT_TYPE_COLOR[t] }]} />
                        <Text style={styles.legendLabel}>{CONTACT_TYPE_LABEL[t]}</Text>
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
        maxWidth: 220,
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
