import { PITCH_CALL_ZONE_COORDS, PitchCallZone } from '@pitch-tracker/shared';
import React from 'react';
import { theme } from '../../styles/theme';

interface Props {
    targetZone?: PitchCallZone | null;
    actualX?: number;
    actualY?: number;
    pitchResult?: string;
    size?: number;
}

const VIEWBOX = 300;
// Strike zone rectangle inside the viewbox — matches the mobile StrikeZone layout.
const ZONE_X = 105;
const ZONE_Y = 100;
const ZONE_W = 90;
const ZONE_H = 132;
const AMBER = '#F5A623';

const RESULT_COLOR: Record<string, string> = {
    ball: '#9ca3af',
    called_strike: '#10b981',
    swinging_strike: '#ef4444',
    foul: '#f59e0b',
    in_play: '#3b82f6',
    hit_by_pitch: '#8b5cf6',
};

// Pitch.location_x / location_y are normalized 0..1 inside the strike-zone
// rectangle (waste zones extend beyond). Same mapping as the mobile StrikeZone.
const toSvgX = (x: number) => ZONE_X + x * ZONE_W;
const toSvgY = (y: number) => ZONE_Y + y * ZONE_H;
const PITCH_RADIUS = 11;

const MiniStrikeZone: React.FC<Props> = ({ targetZone, actualX, actualY, pitchResult, size = 280 }) => {
    const targetCoords = targetZone ? PITCH_CALL_ZONE_COORDS[targetZone] : null;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            style={{ background: theme.colors.gray[100], borderRadius: 8 }}
        >
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

            {/* Actual location dot */}
            {typeof actualX === 'number' && typeof actualY === 'number' && (
                <circle
                    cx={toSvgX(actualX)}
                    cy={toSvgY(actualY)}
                    r={PITCH_RADIUS}
                    fill={pitchResult ? RESULT_COLOR[pitchResult] || '#3b82f6' : '#3b82f6'}
                    stroke="#fff"
                    strokeWidth={1.5}
                />
            )}
        </svg>
    );
};

export default MiniStrikeZone;
