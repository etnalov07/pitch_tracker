import styled from '@emotion/styled';
import { ContactType, FieldLocation, SprayChartData } from '@pitch-tracker/shared';
import React from 'react';
import { theme } from '../../../styles/theme';

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE - 25;
// Real baseball field foul lines are 90° apart (±45° from vertical). We use
// MAX_R sized so the foul-line tips at depth 1.0 stay inside the SVG.
const MAX_R = Math.min(CX - 8, CY - 8) / Math.sin((45 * Math.PI) / 180);
const FOUL_ANGLE = 45;

const FIELD_LOCATIONS: Record<FieldLocation, { angle: number; depth: number }> = {
    left_field_line: { angle: -42, depth: 0.95 },
    left_center_gap: { angle: -25, depth: 0.92 },
    center_field: { angle: 0, depth: 0.95 },
    right_center_gap: { angle: 25, depth: 0.92 },
    right_field_line: { angle: 42, depth: 0.95 },
    infield_left: { angle: -28, depth: 0.42 },
    infield_center: { angle: 0, depth: 0.38 },
    infield_right: { angle: 28, depth: 0.42 },
};

// Mirrors the trajectory aesthetic from BaseballDiamond (web): arc/line/squiggle.
// pop_up uses a higher arc, bunt uses a short straight stub.
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

function toXY(angleDeg: number, depth: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: CX + depth * MAX_R * Math.cos(rad), y: CY + depth * MAX_R * Math.sin(rad) };
}

function arcPath(startAngle: number, endAngle: number, r: number): string {
    const s = toXY(startAngle, r / MAX_R);
    const e = toXY(endAngle, r / MAX_R);
    return `M ${CX} ${CY} L ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y} Z`;
}

// Stable jitter seeded by index so dots don't move on re-render
function jitter(idx: number, range: number): number {
    return ((Math.sin(idx * 127.1 + 311.7) * 43758.5) % 1) * range - range / 2;
}

// Trajectory path from home plate (CX, CY) to landing spot (endX, endY).
// Mirrors BaseballDiamond's path math, rescaled from a 100-unit viewBox
// (peak offset = 15, wiggle = 2) to this chart's 240-unit viewBox.
function trajectoryPath(endX: number, endY: number, type?: ContactType): string {
    const startX = CX;
    const startY = CY;

    if (type === 'line_drive' || type === 'bunt') {
        return `M ${startX} ${startY} L ${endX} ${endY}`;
    }
    if (type === 'fly_ball' || type === 'pop_up') {
        const midX = (startX + endX) / 2;
        const peakOffset = type === 'pop_up' ? 60 : 36; // pop-ups arc higher
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
    // Unknown type — straight line, gray
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
            <svg width={SIZE} height={SIZE} style={{ display: 'block' }}>
                {/* Outfield grass — drawn within fair territory plus a small buffer */}
                <path d={arcPath(-FOUL_ANGLE, FOUL_ANGLE, MAX_R)} fill="#86efac" stroke="#166534" strokeWidth={1} />
                {/* Infield dirt */}
                <path d={arcPath(-FOUL_ANGLE, FOUL_ANGLE, MAX_R * 0.52)} fill="#fde68a" stroke="#92400e" strokeWidth={0.5} />
                {/* Foul lines */}
                {(() => {
                    const left = toXY(-FOUL_ANGLE, 1.0);
                    const right = toXY(FOUL_ANGLE, 1.0);
                    return (
                        <>
                            <line x1={CX} y1={CY} x2={left.x} y2={left.y} stroke="#92400e" strokeWidth={1} strokeDasharray="4,3" />
                            <line
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
                {/* Home plate */}
                <circle cx={CX} cy={CY} r={5} fill="white" stroke="#374151" strokeWidth={1} />
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
                {typesPresent.length === 0
                    ? (Object.keys(CONTACT_TYPE_COLOR) as ContactType[]).map((t) => (
                          <LegendItem key={t}>
                              <LegendDot style={{ backgroundColor: CONTACT_TYPE_COLOR[t] }} />
                              {CONTACT_TYPE_LABEL[t]}
                          </LegendItem>
                      ))
                    : typesPresent.map((t) => (
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
