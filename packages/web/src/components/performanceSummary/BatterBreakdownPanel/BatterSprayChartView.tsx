import styled from '@emotion/styled';
import { ContactType, FieldLocation, SprayChartData } from '@pitch-tracker/shared';
import React from 'react';
import { theme } from '../../../styles/theme';

// Field geometry mirrors BaseballDiamond (web charter view): 100-unit
// coordinates scaled 2.4× into a 240-unit viewBox. Home plate at (120, 204),
// bases at (168, 156)/(120, 108)/(72, 156), bell-shaped outfield via Q-curves,
// rotated-square infield dirt polygon, dashed foul lines and warning track.
const SIZE = 240;
const HOME = { x: 120, y: 204 };
const FIRST = { x: 168, y: 156 };
const SECOND = { x: 120, y: 108 };
const THIRD = { x: 72, y: 156 };
const MOUND = { x: 120, y: 156 };
const FOUL_LEFT_TIP = { x: 12, y: 96 };
const FOUL_RIGHT_TIP = { x: 228, y: 96 };

// Where each field_location bucket places its dot, in 240-unit coordinates.
// Outfield positions sit just inside the foul lines (LF/RF) and between gaps.
// Infield positions sit at roughly the SS/2B/up-the-middle fielder spots.
const FIELD_LOCATIONS: Record<FieldLocation, { x: number; y: number }> = {
    left_field_line: { x: 45, y: 100 },
    left_center_gap: { x: 80, y: 80 },
    center_field: { x: 120, y: 55 },
    right_center_gap: { x: 160, y: 80 },
    right_field_line: { x: 195, y: 100 },
    infield_left: { x: 88, y: 138 },
    infield_center: { x: 120, y: 130 },
    infield_right: { x: 152, y: 138 },
};

const CONTACT_TYPE_COLOR: Record<ContactType, string> = {
    fly_ball: theme.colors.primary[500],
    pop_up: theme.colors.primary[300],
    line_drive: theme.colors.red[500],
    ground_ball: theme.colors.yellow[600],
    bunt: theme.colors.gray[500],
};

const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
    fly_ball: 'Fly (arc)',
    pop_up: 'Pop-up (high arc)',
    line_drive: 'Line Drive',
    ground_ball: 'Grounder (squiggle)',
    bunt: 'Bunt',
};

const RESULT_SYMBOL: Record<string, string> = {
    single: '1B',
    double: '2B',
    triple: '3B',
    home_run: 'HR',
};

// Stable jitter seeded by index so dots don't move on re-render
function jitter(idx: number, range: number): number {
    return ((Math.sin(idx * 127.1 + 311.7) * 43758.5) % 1) * range - range / 2;
}

// Trajectory path from home plate to landing spot. Mirrors BaseballDiamond's
// path math: line for liners/bunts, Q-curve arc for fly/pop-ups, segmented
// squiggle for grounders.
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

export default function BatterSprayChartView({ sprayData }: Props) {
    const plays = sprayData.filter((p) => p.field_location);
    const typesPresent = Array.from(new Set(plays.map((p) => p.contact_type).filter((t): t is ContactType => Boolean(t))));

    return (
        <Wrapper>
            <ChartLabel>Spray Chart</ChartLabel>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ display: 'block' }}>
                {/* Outfield grass — bell-shaped, matching BaseballDiamond */}
                <path
                    d="M 120 24 Q 12 96 24 204 L 120 204 L 216 204 Q 228 96 120 24"
                    fill={theme.colors.green[200]}
                    stroke={theme.colors.green[400]}
                    strokeWidth={1.2}
                />
                {/* Infield dirt — rotated square, matching BaseballDiamond */}
                <polygon
                    points="120,132 72,180 120,228 168,180"
                    fill={theme.colors.yellow[200]}
                    stroke={theme.colors.yellow[400]}
                    strokeWidth={1.2}
                />
                {/* Baseline paths */}
                <line x1={HOME.x} y1={HOME.y} x2={THIRD.x} y2={THIRD.y} stroke={theme.colors.gray[300]} strokeWidth={2.4} />
                <line x1={HOME.x} y1={HOME.y} x2={FIRST.x} y2={FIRST.y} stroke={theme.colors.gray[300]} strokeWidth={2.4} />
                <line x1={THIRD.x} y1={THIRD.y} x2={SECOND.x} y2={SECOND.y} stroke={theme.colors.gray[300]} strokeWidth={2.4} />
                <line x1={FIRST.x} y1={FIRST.y} x2={SECOND.x} y2={SECOND.y} stroke={theme.colors.gray[300]} strokeWidth={2.4} />
                {/* Foul lines (dashed) */}
                <line
                    x1={HOME.x}
                    y1={HOME.y}
                    x2={FOUL_LEFT_TIP.x}
                    y2={FOUL_LEFT_TIP.y}
                    stroke={theme.colors.gray[400]}
                    strokeWidth={1.2}
                    strokeDasharray="4.8,4.8"
                />
                <line
                    x1={HOME.x}
                    y1={HOME.y}
                    x2={FOUL_RIGHT_TIP.x}
                    y2={FOUL_RIGHT_TIP.y}
                    stroke={theme.colors.gray[400]}
                    strokeWidth={1.2}
                    strokeDasharray="4.8,4.8"
                />
                {/* Warning track arc (dashed) */}
                <path
                    d="M 24 120 Q 120 12 216 120"
                    fill="none"
                    stroke={theme.colors.yellow[400]}
                    strokeWidth={1.2}
                    strokeDasharray="4.8,4.8"
                />
                {/* Pitcher's mound */}
                <circle
                    cx={MOUND.x}
                    cy={MOUND.y}
                    r={3.6}
                    fill={theme.colors.yellow[300]}
                    stroke={theme.colors.yellow[500]}
                    strokeWidth={1.2}
                />
                {/* Bases — small rotated squares like BaseballDiamond */}
                {[
                    [HOME.x, HOME.y],
                    [FIRST.x, FIRST.y],
                    [SECOND.x, SECOND.y],
                    [THIRD.x, THIRD.y],
                ].map(([bx, by], i) => (
                    <rect
                        key={`base-${i}`}
                        x={bx - 4.8}
                        y={by - 4.8}
                        width={9.6}
                        height={9.6}
                        fill="white"
                        stroke={theme.colors.gray[400]}
                        strokeWidth={1.2}
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
                        <path
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
                        <g key={`dot-${i}`}>
                            <circle cx={x} cy={y} r={r} fill={color} opacity={0.85} stroke="white" strokeWidth={1} />
                            <text x={x} y={y + 3.5} fontSize={6} fontWeight="700" fill="white" textAnchor="middle">
                                {symbol}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <LegendRow>
                {(typesPresent.length === 0 ? (Object.keys(CONTACT_TYPE_COLOR) as ContactType[]) : typesPresent).map((t) => (
                    <LegendItem key={t}>
                        <LegendDot style={{ backgroundColor: CONTACT_TYPE_COLOR[t] }} />
                        {CONTACT_TYPE_LABEL[t]}
                    </LegendItem>
                ))}
            </LegendRow>
            {plays.length === 0 && <EmptyText>No batted ball data yet.</EmptyText>}
        </Wrapper>
    );
}

const Wrapper = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: `${theme.spacing.sm} 0`,
});

const ChartLabel = styled.p({
    fontSize: 11,
    color: theme.colors.gray[500],
    fontStyle: 'italic',
    marginBottom: theme.spacing.xs,
});

const LegendRow = styled.div({
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    justifyContent: 'center',
    maxWidth: 240,
});

const LegendItem = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: theme.colors.gray[500],
});

const LegendDot = styled.div({
    width: 8,
    height: 8,
    borderRadius: '50%',
});

const EmptyText = styled.p({
    fontSize: 12,
    color: theme.colors.gray[400],
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
});
