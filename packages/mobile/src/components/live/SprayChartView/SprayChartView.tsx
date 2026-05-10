import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { ContactType, FieldLocation, SprayChartData } from '@pitch-tracker/shared';

// Realistic top-down baseball field. Fair territory is a hexagon (home at the
// bottom point; foul lines run up-out at ~45° to LF/RF foul poles; outfield
// wall has angled segments meeting in deep CF). A thick brown stroke around
// the hexagon is the warning track / dirt foul-territory border. Infield is
// a small dirt cutout at home with a curved back edge (the lip behind 2B).
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

// Per-game border colors when the chart is scoped across multiple games
// (Our Lineup view vs. an opponent series).
const GAME_BORDER_PALETTE = ['#1d4ed8', '#c2410c', '#15803d', '#7e22ce', '#b45309', '#be185d', '#4d7c0f'];

function jitter(idx: number, range: number): number {
    return ((Math.sin(idx * 127.1 + 311.7) * 43758.5) % 1) * range - range / 2;
}

function formatGameDate(iso?: string): string {
    if (!iso) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return '';
    return `${parseInt(m[2], 10)}/${parseInt(m[3], 10)}`;
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
    /** When set, the matching game is labeled "(this game)" in the per-game legend. */
    currentGameId?: string;
}

export default function SprayChartView({ sprayData, currentGameId }: Props) {
    const theme = useTheme();
    const plays = sprayData.filter((p) => p.field_location);
    const typesPresent = Array.from(new Set(plays.map((p) => p.contact_type).filter((t): t is ContactType => Boolean(t))));

    const gamesPresent = (() => {
        const seen = new Map<string, { game_id: string; game_date?: string }>();
        for (const p of plays) {
            if (p.game_id && !seen.has(p.game_id)) {
                seen.set(p.game_id, { game_id: p.game_id, game_date: p.game_date });
            }
        }
        return Array.from(seen.values()).sort((a, b) => (a.game_date ?? '').localeCompare(b.game_date ?? ''));
    })();
    const multiGame = gamesPresent.length >= 2;
    const gameColorById: Record<string, string> = {};
    gamesPresent.forEach((g, i) => {
        gameColorById[g.game_id] = GAME_BORDER_PALETTE[i % GAME_BORDER_PALETTE.length];
    });

    const fieldHexPath = `M ${HOME.x} ${HOME.y} L ${LF_POLE.x} ${LF_POLE.y} L ${UPPER_LEFT.x} ${UPPER_LEFT.y} A 200 200 0 0 1 ${UPPER_RIGHT.x} ${UPPER_RIGHT.y} L ${RF_POLE.x} ${RF_POLE.y} Z`;
    const infieldPath = `M ${HOME.x} ${HOME.y} L ${FIRST.x} ${FIRST.y} Q ${HOME.x} 115 ${THIRD.x} ${THIRD.y} Z`;

    return (
        <View style={styles.wrapper}>
            <Text style={[styles.title, { color: theme.colors.onSurfaceVariant }]}>Spray Chart</Text>
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {/* Off-field background */}
                <Rect x={0} y={0} width={SIZE} height={SIZE} fill="#d1fae5" />
                {/* Field hexagon: thick brown stroke is the warning-track / dirt border */}
                <Path
                    d={fieldHexPath}
                    fill="#22c55e"
                    stroke="#a16207"
                    strokeWidth={9}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                {/* Foul lines (white chalk) */}
                <Line x1={HOME.x} y1={HOME.y} x2={LF_POLE.x} y2={LF_POLE.y} stroke="white" strokeWidth={1.6} opacity={0.95} />
                <Line x1={HOME.x} y1={HOME.y} x2={RF_POLE.x} y2={RF_POLE.y} stroke="white" strokeWidth={1.6} opacity={0.95} />
                {/* Infield dirt cutout */}
                <Path d={infieldPath} fill="#c2761d" stroke="#92400e" strokeWidth={0.8} />
                {/* Baselines */}
                <Line x1={HOME.x} y1={HOME.y} x2={FIRST.x} y2={FIRST.y} stroke="white" strokeWidth={1.6} opacity={0.95} />
                <Line x1={THIRD.x} y1={THIRD.y} x2={HOME.x} y2={HOME.y} stroke="white" strokeWidth={1.6} opacity={0.95} />
                {/* Pitcher's mound */}
                <Circle cx={MOUND.x} cy={MOUND.y} r={5} fill="#c2761d" stroke="#92400e" strokeWidth={1} />
                <Circle cx={MOUND.x} cy={MOUND.y} r={1.5} fill="white" />
                {/* Bases */}
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
                    const gameBorder = multiGame && play.game_id ? gameColorById[play.game_id] : 'white';
                    const gameStrokeWidth = multiGame ? 2.25 : 1;
                    return (
                        <G key={`dot-${i}`}>
                            <Circle
                                cx={x}
                                cy={y}
                                r={r}
                                fill={color}
                                opacity={0.9}
                                stroke={gameBorder}
                                strokeWidth={gameStrokeWidth}
                            />
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
                        <Text style={[styles.legendLabel, { color: theme.colors.onSurfaceVariant }]}>{CONTACT_TYPE_LABEL[t]}</Text>
                    </View>
                ))}
            </View>
            {multiGame && (
                <View style={styles.legend}>
                    {gamesPresent.map((g) => (
                        <View key={g.game_id} style={styles.legendItem}>
                            <View style={[styles.legendRing, { borderColor: gameColorById[g.game_id] }]} />
                            <Text style={[styles.legendLabel, { color: theme.colors.onSurfaceVariant }]}>
                                {formatGameDate(g.game_date)}
                                {currentGameId === g.game_id ? ' (this game)' : ''}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
            {plays.length === 0 && (
                <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>No batted ball data yet.</Text>
            )}
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
    legendRing: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'transparent',
        borderWidth: 2,
    },
    legendLabel: {
        fontSize: 9,
    },
    empty: {
        fontSize: 12,
        marginTop: 8,
        fontStyle: 'italic',
    },
});
