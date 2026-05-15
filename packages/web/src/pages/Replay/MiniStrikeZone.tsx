import { PITCH_CALL_ZONE_COORDS, PitchCallZone } from '@pitch-tracker/shared';
import React from 'react';
import { theme } from '../../styles/theme';

interface Props {
    targetZone?: PitchCallZone | null;
    actualX?: number;
    actualY?: number;
    pitchType?: string;
    batterSide?: 'R' | 'L' | 'S' | null;
    pitcherThrows?: 'R' | 'L' | null;
    size?: number;
}

const VIEWBOX = 300;
// Strike zone rectangle inside the viewbox — matches the mobile StrikeZone layout.
const ZONE_X = 105;
const ZONE_Y = 100;
const ZONE_W = 90;
const ZONE_H = 132;
const AMBER = '#F5A623';

// Mirrors mobile StrikeZone PITCH_TYPE_COLORS so the visual encoding is the
// same on both platforms.
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
    other: 'OT',
};

// Pitch.location_x / location_y are normalized 0..1 inside the strike-zone
// rectangle (waste zones extend beyond). Same mapping as the mobile StrikeZone.
const toSvgX = (x: number) => ZONE_X + x * ZONE_W;
const toSvgY = (y: number) => ZONE_Y + y * ZONE_H;
const PITCH_RADIUS = 13;

const MiniStrikeZone: React.FC<Props> = ({ targetZone, actualX, actualY, pitchType, batterSide, pitcherThrows, size = 280 }) => {
    const targetCoords = targetZone ? PITCH_CALL_ZONE_COORDS[targetZone] : null;
    const dotColor = PITCH_TYPE_COLORS[pitchType ?? 'other'] ?? PITCH_TYPE_COLORS.other;
    const dotLabel = PITCH_TYPE_ABBREV[pitchType ?? 'other'] ?? 'OT';
    const hasActual = typeof actualX === 'number' && typeof actualY === 'number';
    // Resolve switch-hitter against the pitcher's throws (matches mobile StrikeZone behavior).
    const effectiveSide: 'R' | 'L' | null = batterSide
        ? batterSide === 'S'
            ? pitcherThrows === 'L'
                ? 'R'
                : 'L'
            : batterSide === 'L'
              ? 'L'
              : 'R'
        : null;
    // Batter on the side they stand on relative to the catcher's view used by the
    // strike-zone canvas: RHH on the right, LHH on the left.
    const silhouetteX = effectiveSide === 'R' ? 245 : 25;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            style={{ background: theme.colors.gray[100], borderRadius: 8 }}
        >
            {/* Batter silhouette — simple stick figure on the side the batter stands */}
            {effectiveSide && (
                <g opacity={0.55} fill={theme.colors.gray[500]}>
                    {/* head */}
                    <circle cx={silhouetteX} cy={90} r={9} />
                    {/* body */}
                    <rect x={silhouetteX - 4} y={99} width={8} height={50} rx={2} />
                    {/* legs */}
                    <rect x={silhouetteX - 4} y={149} width={3} height={45} />
                    <rect x={silhouetteX + 1} y={149} width={3} height={45} />
                    {/* bat angled toward the strike zone */}
                    <line
                        x1={silhouetteX}
                        y1={108}
                        x2={effectiveSide === 'R' ? silhouetteX - 35 : silhouetteX + 35}
                        y2={70}
                        stroke={theme.colors.gray[600]}
                        strokeWidth={3}
                        strokeLinecap="round"
                    />
                </g>
            )}
            {/* Strike zone outline */}
            <rect
                x={ZONE_X}
                y={ZONE_Y}
                width={ZONE_W}
                height={ZONE_H}
                fill="none"
                stroke={theme.colors.gray[700]}
                strokeWidth={2}
            />
            {/* 3x3 grid */}
            {[1, 2].map((i) => (
                <line
                    key={`v-${i}`}
                    x1={ZONE_X + (ZONE_W / 3) * i}
                    y1={ZONE_Y}
                    x2={ZONE_X + (ZONE_W / 3) * i}
                    y2={ZONE_Y + ZONE_H}
                    stroke={theme.colors.gray[400]}
                    strokeWidth={1}
                />
            ))}
            {[1, 2].map((i) => (
                <line
                    key={`h-${i}`}
                    x1={ZONE_X}
                    y1={ZONE_Y + (ZONE_H / 3) * i}
                    x2={ZONE_X + ZONE_W}
                    y2={ZONE_Y + (ZONE_H / 3) * i}
                    stroke={theme.colors.gray[400]}
                    strokeWidth={1}
                />
            ))}

            {/* Target marker (dashed amber crosshair) */}
            {targetCoords && (
                <g>
                    <circle
                        cx={toSvgX(targetCoords.x)}
                        cy={toSvgY(targetCoords.y)}
                        r={18}
                        fill="none"
                        stroke={AMBER}
                        strokeWidth={2}
                        strokeDasharray="4 3"
                    />
                    <line
                        x1={toSvgX(targetCoords.x) - 14}
                        y1={toSvgY(targetCoords.y)}
                        x2={toSvgX(targetCoords.x) + 14}
                        y2={toSvgY(targetCoords.y)}
                        stroke={AMBER}
                        strokeWidth={1.5}
                    />
                    <line
                        x1={toSvgX(targetCoords.x)}
                        y1={toSvgY(targetCoords.y) - 14}
                        x2={toSvgX(targetCoords.x)}
                        y2={toSvgY(targetCoords.y) + 14}
                        stroke={AMBER}
                        strokeWidth={1.5}
                    />
                </g>
            )}

            {/* Actual location dot — colored by pitch type with a 2-letter type abbrev */}
            {hasActual && (
                <g>
                    <circle
                        cx={toSvgX(actualX as number)}
                        cy={toSvgY(actualY as number)}
                        r={PITCH_RADIUS}
                        fill={dotColor}
                        stroke="#fff"
                        strokeWidth={2}
                    />
                    <text
                        x={toSvgX(actualX as number)}
                        y={toSvgY(actualY as number) + 3}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight="bold"
                        fill="#fff"
                    >
                        {dotLabel}
                    </text>
                </g>
            )}
        </svg>
    );
};

export default MiniStrikeZone;
