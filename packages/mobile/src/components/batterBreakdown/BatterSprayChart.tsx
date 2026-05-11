import { ContactType, FieldLocation, SprayChartData } from '@pitch-tracker/shared';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

const SIZE = 240;

const HOME = { x: 120, y: 220 };
const LF_POLE = { x: 12, y: 105 };
const UPPER_LEFT = { x: 50, y: 30 };
const UPPER_RIGHT = { x: 190, y: 30 };
const RF_POLE = { x: 228, y: 105 };
const FIRST = { x: 155, y: 185 };
const SECOND = { x: 120, y: 150 };
const THIRD = { x: 85, y: 185 };
const MOUND = { x: 120, y: 178 };

const FIELD_LOCATIONS: Record<FieldLocation, { x: number; y: number }> = {
    left_field_line: { x: 50, y: 100 },
    left_center_gap: { x: 80, y: 60 },
    center_field: { x: 120, y: 45 },
    right_center_gap: { x: 160, y: 60 },
    right_field_line: { x: 190, y: 100 },
    infield_left: { x: 92, y: 175 },
    infield_center: { x: 120, y: 162 },
    infield_right: { x: 148, y: 175 },
};

const CONTACT_TYPE_COLOR: Record<ContactType, string> = {
    fly_ball: '#3b82f6',
    pop_up: '#93c5fd',
    line_drive: '#ef4444',
    ground_ball: '#ca8a04',
    bunt: '#6b7280',
};

const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
    fly_ball: 'Fly',
    pop_up: 'Pop',
    line_drive: 'Line',
    ground_ball: 'GB',
    bunt: 'Bunt',
};

const RESULT_SYMBOL: Record<string, string> = {
    single: '1B',
    double: '2B',
    triple: '3B',
    home_run: 'HR',
};

function jitter(idx: number, range: number): number {
    return ((Math.sin(idx * 127.1 + 311.7) * 43758.5) % 1) * range - range / 2;
}

function trajectoryPath(endX: number, endY: number, type?: ContactType): string {
    const startX = HOME.x;
    const startY = HOME.y;
    if (type === 'line_drive' || type === 'bunt') return `M ${startX} ${startY} L ${endX} ${endY}`;
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

const BatterSprayChart: React.FC<Props> = ({ sprayData }) => {
    const plays = sprayData.filter((p) => p.field_location);
    const typesPresent = Array.from(new Set(plays.map((p) => p.contact_type).filter((t): t is ContactType => Boolean(t))));

    const fieldHexPath = `M ${HOME.x} ${HOME.y} L ${LF_POLE.x} ${LF_POLE.y} L ${UPPER_LEFT.x} ${UPPER_LEFT.y} A 200 200 0 0 1 ${UPPER_RIGHT.x} ${UPPER_RIGHT.y} L ${RF_POLE.x} ${RF_POLE.y} Z`;
    const infieldPath = `M ${HOME.x} ${HOME.y} L ${FIRST.x} ${FIRST.y} Q ${HOME.x} 115 ${THIRD.x} ${THIRD.y} Z`;

    return (
        <View style={styles.wrapper}>
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                <Rect x={0} y={0} width={SIZE} height={SIZE} fill="#dcfce7" />
                <Path
                    d={fieldHexPath}
                    fill="#4ade80"
                    stroke="#a16207"
                    strokeWidth={9}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                <Line x1={HOME.x} y1={HOME.y} x2={LF_POLE.x} y2={LF_POLE.y} stroke="white" strokeWidth={1.6} opacity={0.95} />
                <Line x1={HOME.x} y1={HOME.y} x2={RF_POLE.x} y2={RF_POLE.y} stroke="white" strokeWidth={1.6} opacity={0.95} />
                <Path d={infieldPath} fill="#c2761d" stroke="#92400e" strokeWidth={0.8} />
                <Line x1={HOME.x} y1={HOME.y} x2={FIRST.x} y2={FIRST.y} stroke="white" strokeWidth={1.6} opacity={0.95} />
                <Line x1={THIRD.x} y1={THIRD.y} x2={HOME.x} y2={HOME.y} stroke="white" strokeWidth={1.6} opacity={0.95} />
                <Circle cx={MOUND.x} cy={MOUND.y} r={5} fill="#c2761d" stroke="#92400e" strokeWidth={1} />
                <Circle cx={MOUND.x} cy={MOUND.y} r={1.5} fill="white" />
                {[
                    [HOME.x, HOME.y, 5],
                    [FIRST.x, FIRST.y, 4],
                    [SECOND.x, SECOND.y, 4],
                    [THIRD.x, THIRD.y, 4],
                ].map(([bx, by, half], i) => (
                    <Rect
                        key={`base-${i}`}
                        x={bx - half}
                        y={by - half}
                        width={half * 2}
                        height={half * 2}
                        fill="white"
                        stroke="#374151"
                        strokeWidth={0.8}
                        transform={`rotate(45 ${bx} ${by})`}
                    />
                ))}
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
            <View style={styles.legendRow}>
                {(typesPresent.length === 0 ? (Object.keys(CONTACT_TYPE_COLOR) as ContactType[]) : typesPresent).map((t) => (
                    <View key={t} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: CONTACT_TYPE_COLOR[t] }]} />
                        <Text style={styles.legendText}>{CONTACT_TYPE_LABEL[t]}</Text>
                    </View>
                ))}
            </View>
            {plays.length === 0 && <Text style={styles.emptyText}>No batted ball data yet.</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
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
    legendText: {
        fontSize: 10,
        color: '#6b7280',
    },
    emptyText: {
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
        marginTop: 4,
    },
});

export default BatterSprayChart;
