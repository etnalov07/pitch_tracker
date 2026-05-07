import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { ContactType, FieldLocation, SprayChartData } from '@pitch-tracker/shared';

// Realistic top-down baseball field. Home plate at the bottom point of an
// arrowhead-shaped fair territory; foul lines run up-and-out at ~45° to the
// outfield corners; outfield wall is a curved arc connecting the corners
// across deep center. Foul territory (dirt) fills the canvas behind it; a
// small infield diamond sits at home plate with home as its bottom vertex.
const SIZE = 240;

// Anchor points
const HOME = { x: 120, y: 220 };
const FOUL_LEFT_TIP = { x: 15, y: 75 };
const FOUL_RIGHT_TIP = { x: 225, y: 75 };
const OUTFIELD_RADIUS = 160;

// Infield diamond: home at bottom, 2B at top, 1B/3B on the sides
const FIRST = { x: 155, y: 185 };
const SECOND = { x: 120, y: 150 };
const THIRD = { x: 85, y: 185 };
const MOUND = { x: 120, y: 185 };

// Where each field_location bucket places its dot
const FIELD_LOCATIONS: Record<FieldLocation, { x: number; y: number }> = {
    left_field_line: { x: 45, y: 100 },
    left_center_gap: { x: 80, y: 78 },
    center_field: { x: 120, y: 60 },
    right_center_gap: { x: 160, y: 78 },
    right_field_line: { x: 195, y: 100 },
    infield_left: { x: 92, y: 180 },
    infield_center: { x: 120, y: 168 },
    infield_right: { x: 148, y: 180 },
};

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

// Stable jitter seeded by index so dots don't move on re-render
function jitter(idx: number, range: number): number {
    return ((Math.sin(idx * 127.1 + 311.7) * 43758.5) % 1) * range - range / 2;
}

// Trajectory path from home plate to landing spot.
function trajectoryPath(endX: number, endY: number, type?: ContactType): string {
    const startX = HOME.x;
    const startY = HOME.y;

    if (type === 'line_drive' || type === 'bunt') {
        return `M ${startX} ${startY} L ${endX} ${endY}`;
    }
    if (type === 'fly_ball' || type === 'pop_up') {
        const midX = (startX + endX) / 2;
        const peakOffset = type === 'pop_up' ? 60 : 36;
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
            const wiggle = i % 2 === 0 ? 5 : -5;
            path += ` Q ${x1 + wiggle} ${y1} ${startX + dx * (i + 1)} ${startY + dy * (i + 1)}`;
        }
        return path;
    }
    return `M ${startX} ${startY} L ${endX} ${endY}`;
}

interface Props {
    sprayData: SprayChartData[];
}

export default function SprayChartView({ sprayData }: Props) {
    const plays = sprayData.filter((p) => p.field_location);
    const typesPresent = Array.from(new Set(plays.map((p) => p.contact_type).filter((t): t is ContactType => Boolean(t))));

    const fairTerritoryPath = `M ${HOME.x} ${HOME.y} L ${FOUL_LEFT_TIP.x} ${FOUL_LEFT_TIP.y} A ${OUTFIELD_RADIUS} ${OUTFIELD_RADIUS} 0 0 1 ${FOUL_RIGHT_TIP.x} ${FOUL_RIGHT_TIP.y} Z`;
    const infieldPath = `M ${HOME.x} ${HOME.y} L ${FIRST.x} ${FIRST.y} L ${SECOND.x} ${SECOND.y} L ${THIRD.x} ${THIRD.y} Z`;

    return (
        <View style={styles.wrapper}>
            <Text style={styles.title}>Spray Chart</Text>
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {/* Foul territory — dirt fills the canvas */}
                <Rect x={0} y={0} width={SIZE} height={SIZE} fill="#d4a76a" opacity={0.55} />
                {/* Fair territory — green grass arrowhead with curved outfield wall */}
                <Path d={fairTerritoryPath} fill="#86efac" stroke="#166534" strokeWidth={1.5} />
                {/* Foul lines (white chalk) */}
                <Line
                    x1={HOME.x}
                    y1={HOME.y}
                    x2={FOUL_LEFT_TIP.x}
                    y2={FOUL_LEFT_TIP.y}
                    stroke="white"
                    strokeWidth={1.5}
                    opacity={0.9}
                />
                <Line
                    x1={HOME.x}
                    y1={HOME.y}
                    x2={FOUL_RIGHT_TIP.x}
                    y2={FOUL_RIGHT_TIP.y}
                    stroke="white"
                    strokeWidth={1.5}
                    opacity={0.9}
                />
                {/* Infield dirt diamond */}
                <Path d={infieldPath} fill="#c4915a" stroke="#92400e" strokeWidth={1} />
                {/* Baseline paths (white chalk) */}
                <Line x1={HOME.x} y1={HOME.y} x2={FIRST.x} y2={FIRST.y} stroke="white" strokeWidth={1.5} opacity={0.9} />
                <Line x1={FIRST.x} y1={FIRST.y} x2={SECOND.x} y2={SECOND.y} stroke="white" strokeWidth={1.5} opacity={0.6} />
                <Line x1={SECOND.x} y1={SECOND.y} x2={THIRD.x} y2={THIRD.y} stroke="white" strokeWidth={1.5} opacity={0.6} />
                <Line x1={THIRD.x} y1={THIRD.y} x2={HOME.x} y2={HOME.y} stroke="white" strokeWidth={1.5} opacity={0.9} />
                {/* Pitcher's mound */}
                <Circle cx={MOUND.x} cy={MOUND.y} r={4.5} fill="#c4915a" stroke="#92400e" strokeWidth={1} />
                {/* Bases — small white squares (rotated) */}
                {[
                    [HOME.x, HOME.y],
                    [FIRST.x, FIRST.y],
                    [SECOND.x, SECOND.y],
                    [THIRD.x, THIRD.y],
                ].map(([bx, by], i) => (
                    <Rect
                        key={`base-${i}`}
                        x={bx - 4}
                        y={by - 4}
                        width={8}
                        height={8}
                        fill="white"
                        stroke="#374151"
                        strokeWidth={1}
                        transform={`rotate(45 ${bx} ${by})`}
                    />
                ))}
                {/* Trajectories drawn under the dots */}
                {plays.map((play, i) => {
                    const loc = FIELD_LOCATIONS[play.field_location];
                    if (!loc) return null;
                    const x = loc.x + jitter(i, 14);
                    const y = loc.y + jitter(i + 1, 12);
                    const color = play.contact_type ? CONTACT_TYPE_COLOR[play.contact_type] : '#9ca3af';
                    return (
                        <Path
                            key={`traj-${i}`}
                            d={trajectoryPath(x, y, play.contact_type)}
                            fill="none"
                            stroke={color}
                            strokeWidth={2.25}
                            opacity={0.7}
                            strokeLinecap="round"
                        />
                    );
                })}
                {/* Hit-location dots */}
                {plays.map((play, i) => {
                    const loc = FIELD_LOCATIONS[play.field_location];
                    if (!loc) return null;
                    const x = loc.x + jitter(i, 14);
                    const y = loc.y + jitter(i + 1, 12);
                    const color = play.contact_type ? CONTACT_TYPE_COLOR[play.contact_type] : '#6b7280';
                    const symbol = play.hit_result ? (RESULT_SYMBOL[play.hit_result] ?? 'X') : 'X';
                    const r = Math.min(14, 6 + (play.count - 1) * 2);
                    return (
                        <G key={`dot-${i}`}>
                            <Circle cx={x} cy={y} r={r} fill={color} opacity={0.9} stroke="white" strokeWidth={1} />
                            <SvgText x={x} y={y + 3.5} fontSize={6} fontWeight="700" fill="white" textAnchor="middle">
                                {symbol}
                            </SvgText>
                        </G>
                    );
                })}
            </Svg>
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
        maxWidth: 240,
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
