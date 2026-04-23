import styled from '@emotion/styled';
import { ContactQuality, FieldLocation, SprayChart } from '@pitch-tracker/shared';
import React from 'react';
import { theme } from '../../../styles/theme';

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE - 20;

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
};

function toXY(angleDeg: number, depth: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const maxR = CY - 8;
    return { x: CX + depth * maxR * Math.cos(rad), y: CY + depth * maxR * Math.sin(rad) };
}

function arcPath(startAngle: number, endAngle: number, r: number): string {
    const maxR = CY - 8;
    const s = toXY(startAngle, r / maxR);
    const e = toXY(endAngle, r / maxR);
    return `M ${CX} ${CY} L ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y} Z`;
}

// Stable jitter seeded by index so dots don't move on re-render
function jitter(idx: number, range: number): number {
    return ((Math.sin(idx * 127.1 + 311.7) * 43758.5) % 1) * range - range / 2;
}

interface Props {
    sprayChart: SprayChart;
}

export default function BatterSprayChartView({ sprayChart }: Props) {
    const plays = sprayChart.plays.filter((p) => p.field_location);
    const maxR = CY - 8;

    return (
        <Wrapper>
            <ChartLabel>Spray Chart</ChartLabel>
            <svg width={SIZE} height={SIZE} style={{ display: 'block' }}>
                {/* Outfield grass */}
                <path d={arcPath(-65, 65, maxR)} fill="#86efac" stroke="#166534" strokeWidth={1} />
                {/* Infield dirt */}
                <path d={arcPath(-65, 65, maxR * 0.52)} fill="#fde68a" stroke="#92400e" strokeWidth={0.5} />
                {/* Foul lines */}
                {(() => {
                    const left = toXY(-60, 1.0);
                    const right = toXY(60, 1.0);
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
                {/* Home plate */}
                <circle cx={CX} cy={CY} r={5} fill="white" stroke="#374151" strokeWidth={1} />
                {/* Plays */}
                {plays.map((play, i) => {
                    const loc = FIELD_LOCATIONS[play.field_location!];
                    if (!loc) return null;
                    const a = loc.angle + jitter(i, 6);
                    const d = Math.max(0.1, Math.min(0.99, loc.depth + jitter(i + 1, 0.06)));
                    const { x, y } = toXY(a, d);
                    const color = play.contact_quality ? (QUALITY_COLOR[play.contact_quality] ?? '#6b7280') : '#6b7280';
                    const symbol = play.hit_result ? (RESULT_SYMBOL[play.hit_result] ?? 'X') : 'X';
                    return (
                        <g key={i}>
                            <circle cx={x} cy={y} r={8} fill={color} opacity={0.75} />
                            <text x={x} y={y + 3.5} fontSize={6} fontWeight="700" fill="white" textAnchor="middle">
                                {symbol}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <LegendRow>
                {(Object.entries(QUALITY_COLOR) as [ContactQuality, string][]).map(([q, c]) => (
                    <LegendItem key={q}>
                        <LegendDot style={{ backgroundColor: c }} />
                        {q}
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
