import { HeatZoneData } from '@pitch-tracker/shared';
import React from 'react';

interface HeatZoneOverlayProps {
    zones: HeatZoneData[];
    visible: boolean;
}

// Zone definitions matching backend (normalized coordinates 0-1 for strike zone)
interface ZoneRenderInfo {
    id: string;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
}

const ZONE_RENDER_INFO: ZoneRenderInfo[] = [
    // Inside zones (3x3 grid)
    { id: 'TL', xMin: 0, xMax: 0.33, yMin: 0.67, yMax: 1.0 },
    { id: 'TM', xMin: 0.33, xMax: 0.67, yMin: 0.67, yMax: 1.0 },
    { id: 'TR', xMin: 0.67, xMax: 1.0, yMin: 0.67, yMax: 1.0 },
    { id: 'ML', xMin: 0, xMax: 0.33, yMin: 0.33, yMax: 0.67 },
    { id: 'MM', xMin: 0.33, xMax: 0.67, yMin: 0.33, yMax: 0.67 },
    { id: 'MR', xMin: 0.67, xMax: 1.0, yMin: 0.33, yMax: 0.67 },
    { id: 'BL', xMin: 0, xMax: 0.33, yMin: 0, yMax: 0.33 },
    { id: 'BM', xMin: 0.33, xMax: 0.67, yMin: 0, yMax: 0.33 },
    { id: 'BR', xMin: 0.67, xMax: 1.0, yMin: 0, yMax: 0.33 },
    // Outer zones (ring around strike zone)
    { id: 'OTL', xMin: -0.3, xMax: 0, yMin: 1.0, yMax: 1.3 },
    { id: 'OT', xMin: 0, xMax: 1.0, yMin: 1.0, yMax: 1.3 },
    { id: 'OTR', xMin: 1.0, xMax: 1.3, yMin: 1.0, yMax: 1.3 },
    { id: 'OL', xMin: -0.3, xMax: 0, yMin: 0, yMax: 1.0 },
    { id: 'OR', xMin: 1.0, xMax: 1.3, yMin: 0, yMax: 1.0 },
    { id: 'OBL', xMin: -0.3, xMax: 0, yMin: -0.3, yMax: 0 },
    { id: 'OB', xMin: 0, xMax: 1.0, yMin: -0.3, yMax: 0 },
    { id: 'OBR', xMin: 1.0, xMax: 1.3, yMin: -0.3, yMax: 0 },
];

// Strike zone SVG coordinates from StrikeZone.tsx
const ZONE_START_X = 85;
const ZONE_START_Y = 30;
const ZONE_WIDTH = 130;
const ZONE_HEIGHT = 150;

// Convert normalized coordinates to SVG coordinates
function toSvgCoords(x: number, y: number): { x: number; y: number } {
    return {
        x: ZONE_START_X + x * ZONE_WIDTH,
        y: ZONE_START_Y + (1 - y) * ZONE_HEIGHT, // Y is inverted (0 at bottom, 1 at top)
    };
}

// Interpolate between two colors
function interpolateColor(color1: string, color2: string, t: number): string {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');

    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);

    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Get heat color based on strike percentage
// 0% = red, 50% = yellow, 100% = green
function getHeatColor(strikePercentage: number): string {
    const RED = '#ef4444';
    const YELLOW = '#eab308';
    const GREEN = '#22c55e';

    if (strikePercentage <= 50) {
        const t = strikePercentage / 50;
        return interpolateColor(RED, YELLOW, t);
    } else {
        const t = (strikePercentage - 50) / 50;
        return interpolateColor(YELLOW, GREEN, t);
    }
}

const HeatZoneOverlay: React.FC<HeatZoneOverlayProps> = ({ zones, visible }) => {
    if (!visible || zones.length === 0) {
        return null;
    }

    // Create a map for quick lookup
    const zoneDataMap: { [id: string]: HeatZoneData } = {};
    for (const zone of zones) {
        zoneDataMap[zone.zone_id] = zone;
    }

    return (
        <g className="heat-zone-overlay">
            {ZONE_RENDER_INFO.map((zoneInfo) => {
                const zoneData = zoneDataMap[zoneInfo.id];
                if (!zoneData || zoneData.total_pitches === 0) {
                    return null;
                }

                // Calculate SVG position and size
                const topLeft = toSvgCoords(zoneInfo.xMin, zoneInfo.yMax);
                const bottomRight = toSvgCoords(zoneInfo.xMax, zoneInfo.yMin);

                const width = bottomRight.x - topLeft.x;
                const height = bottomRight.y - topLeft.y;
                const centerX = topLeft.x + width / 2;
                const centerY = topLeft.y + height / 2;

                const color = getHeatColor(zoneData.strike_percentage);

                return (
                    <g key={zoneInfo.id}>
                        {/* Zone rectangle with heat color */}
                        <rect
                            x={topLeft.x}
                            y={topLeft.y}
                            width={width}
                            height={height}
                            fill={color}
                            fillOpacity={0.6}
                            stroke="rgba(255,255,255,0.5)"
                            strokeWidth={1}
                        />
                        {/* Strike percentage text */}
                        <text
                            x={centerX}
                            y={centerY + 4}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="bold"
                            fill="white"
                            stroke="rgba(0,0,0,0.5)"
                            strokeWidth="0.5"
                            paintOrder="stroke"
                        >
                            {zoneData.strike_percentage}%
                        </text>
                        {/* Pitch count (smaller, below percentage) */}
                        <text
                            x={centerX}
                            y={centerY + 16}
                            textAnchor="middle"
                            fontSize="8"
                            fill="rgba(255,255,255,0.9)"
                            stroke="rgba(0,0,0,0.3)"
                            strokeWidth="0.3"
                            paintOrder="stroke"
                        >
                            ({zoneData.total_pitches})
                        </text>
                    </g>
                );
            })}
        </g>
    );
};

export default HeatZoneOverlay;
