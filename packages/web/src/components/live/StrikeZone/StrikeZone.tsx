import { HeatZoneData, PitchCallZone, PITCH_CALL_ZONE_COORDS } from '@pitch-tracker/shared';
import React, { useState, useEffect } from 'react';
import { theme } from '../../../styles/theme';
import { Pitch } from '../../../types';
import HeatZoneOverlay from '../HeatZoneOverlay';
import BatterSilhouette from './BatterSilhouette';
import { Container, Title, ZoneWrapper, MainSvg, ClearTargetButton, Legend, LegendItem, LegendDot, Instructions } from './styles';

// Zone grid layout for strike zone cells (row, col → PitchCallZone)
// Zone IDs are semantic: '0-0' = "Up and In", '0-2' = "Up and Away"
// For RHH: inside = left (col 0), outside = right (col 2)
// For LHH: inside = right (col 2), outside = left (col 0) — columns mirror
function getStrikeZoneGrid(effectiveSide: 'R' | 'L'): { zone: PitchCallZone; row: number; col: number }[] {
    const flip = effectiveSide === 'R';
    return [
        { zone: '0-0', row: 0, col: flip ? 2 : 0 },
        { zone: '0-1', row: 0, col: 1 },
        { zone: '0-2', row: 0, col: flip ? 0 : 2 },
        { zone: '1-0', row: 1, col: flip ? 2 : 0 },
        { zone: '1-1', row: 1, col: 1 },
        { zone: '1-2', row: 1, col: flip ? 0 : 2 },
        { zone: '2-0', row: 2, col: flip ? 2 : 0 },
        { zone: '2-1', row: 2, col: 1 },
        { zone: '2-2', row: 2, col: flip ? 0 : 2 },
    ];
}

// Waste zone SVG positions — swap left/right for LHH
// Strike zone is at (113, 120) with width 75, height 110
// "in" zones are on the batter's side, "out" zones are away
function getWasteZones(effectiveSide: 'R' | 'L') {
    const flip = effectiveSide === 'R';
    const L = { x: 81, w: 32 }; // left position
    const R = { x: 188, w: 32 }; // right position
    const inPos = flip ? R : L;
    const outPos = flip ? L : R;
    return [
        { zone: 'W-high-in' as PitchCallZone, x: inPos.x, y: 85, w: inPos.w, h: 35, label: 'HI' },
        { zone: 'W-high' as PitchCallZone, x: 126, y: 85, w: 50, h: 35, label: 'HIGH' },
        { zone: 'W-high-out' as PitchCallZone, x: outPos.x, y: 85, w: outPos.w, h: 35, label: 'HO' },
        { zone: 'W-in' as PitchCallZone, x: inPos.x, y: 120, w: inPos.w, h: 110, label: 'IN' },
        { zone: 'W-out' as PitchCallZone, x: outPos.x, y: 120, w: outPos.w, h: 110, label: 'OUT' },
        { zone: 'W-low-in' as PitchCallZone, x: inPos.x, y: 230, w: inPos.w, h: 35, label: 'LI' },
        { zone: 'W-low' as PitchCallZone, x: 126, y: 230, w: 50, h: 35, label: 'LOW' },
        { zone: 'W-low-out' as PitchCallZone, x: outPos.x, y: 230, w: outPos.w, h: 35, label: 'LO' },
    ];
}

// Zone labels — always semantic (I=inside, A=away) since positions already flip
const ZONE_LABELS: Partial<Record<PitchCallZone, string>> = {
    '0-0': 'UI',
    '0-1': 'UM',
    '0-2': 'UA',
    '1-0': 'MI',
    '1-1': 'MM',
    '1-2': 'MA',
    '2-0': 'DI',
    '2-1': 'DM',
    '2-2': 'DA',
};

// Flip zone center x-coordinate for LHH so target crosshair renders on correct side
function getZoneCoords(zone: PitchCallZone, effectiveSide: 'R' | 'L'): { x: number; y: number } {
    const coords = PITCH_CALL_ZONE_COORDS[zone];
    if (effectiveSide === 'R') {
        // Mirror x around 0.5 (center of zone)
        return { x: 1 - coords.x, y: coords.y };
    }
    return coords;
}

interface StrikeZoneProps {
    onLocationSelect: (x: number, y: number) => void;
    onTargetZoneSelect?: (zone: PitchCallZone) => void;
    onTargetClear?: () => void;
    targetZone?: PitchCallZone | null;
    previousPitches?: Pitch[];
    heatZones?: HeatZoneData[];
    showHeatZones?: boolean;
    batterSide?: 'R' | 'L' | 'S' | null;
    pitcherThrows?: 'R' | 'L' | null;
}

const StrikeZone: React.FC<StrikeZoneProps> = ({
    onLocationSelect,
    onTargetZoneSelect,
    onTargetClear,
    targetZone,
    previousPitches = [],
    heatZones = [],
    showHeatZones = false,
    batterSide,
    pitcherThrows,
}) => {
    const [selectedLocation, setSelectedLocation] = useState<{ x: number; y: number } | null>(null);

    // Reset selectedLocation when a new pitch is logged (previousPitches changes)
    useEffect(() => {
        setSelectedLocation(null);
    }, [previousPitches.length]);

    // Calculate coordinates from click event
    const getCoordinatesFromEvent = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const svgX = ((e.clientX - rect.left) / rect.width) * 300;
        const svgY = ((e.clientY - rect.top) / rect.height) * 300;

        // Convert to 0-1 coordinates within strike zone
        const zoneX = (svgX - 113) / 75;
        const zoneY = (svgY - 120) / 110;

        return { zoneX, zoneY };
    };

    // Only handle clicks for pitch location (target is handled by zone clicks)
    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        // If target zone is already set (or no target support), handle as pitch location
        if (!onTargetZoneSelect || targetZone) {
            const { zoneX, zoneY } = getCoordinatesFromEvent(e);
            if (zoneX >= -0.3 && zoneX <= 1.3 && zoneY >= -0.3 && zoneY <= 1.3) {
                setSelectedLocation({ x: zoneX, y: zoneY });
                onLocationSelect(zoneX, zoneY);
            }
        }
    };

    const handleZoneClick = (zone: PitchCallZone, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onTargetZoneSelect) {
            onTargetZoneSelect(zone);
        }
    };

    const getPitchColor = (result: string): string => {
        switch (result) {
            case 'ball':
                return theme.colors.gray[400];
            case 'called_strike':
                return theme.colors.green[500];
            case 'swinging_strike':
                return theme.colors.red[500];
            case 'foul':
                return theme.colors.yellow[500];
            case 'in_play':
                return theme.colors.primary[600];
            default:
                return theme.colors.gray[500];
        }
    };

    // Convert 0-1 coordinates to SVG coordinates for pitch markers
    const toSvgCoords = (x: number, y: number) => ({
        x: 113 + x * 75,
        y: 120 + y * 110,
    });

    // Determine batter position
    const effectiveSide = batterSide === 'S' ? (pitcherThrows === 'L' ? 'R' : 'L') : batterSide === 'L' ? 'L' : 'R';
    const batterX = effectiveSide === 'R' ? 245 : 55;
    const batterScaleX = effectiveSide === 'R' ? 1 : -1;

    // Get batter-relative zone positions (physically mirrored for LHH)
    const strikeZoneGrid = getStrikeZoneGrid(effectiveSide);
    const wasteZones = getWasteZones(effectiveSide);

    // Zone cell dimensions
    const cellW = 75 / 3;
    const cellH = 110 / 3;

    // Colors
    const AMBER = '#F5A623';
    const isTargetMode = onTargetZoneSelect && !targetZone;

    return (
        <Container>
            <Title>Strike Zone</Title>
            <ZoneWrapper>
                <MainSvg viewBox="0 0 300 300" onClick={handleClick}>
                    {/* Background */}
                    <rect x="0" y="0" width="300" height="300" fill="#f5f5f0" />

                    {/* Home plate - reversed (point facing pitcher/up) */}
                    <g transform="translate(150, 272)">
                        <ellipse cx="0" cy="15" rx="45" ry="11" fill="#e0e0d8" />
                        <path d="M -38 22 L 38 22 L 38 10 L 0 -5 L -38 10 Z" fill="#4db6ac" stroke="#26a69a" strokeWidth="2" />
                        <path d="M -32 20 L 32 20 L 32 11 L 0 -2 L -32 11 Z" fill="#80cbc4" stroke="#4db6ac" strokeWidth="1" />
                        <path d="M -26 17 L 26 17 L 26 12 L 0 1 L -26 12 Z" fill="white" stroke="#b0bec5" strokeWidth="1" />
                    </g>

                    {/* Batter silhouette */}
                    {batterSide && (
                        <g transform={`translate(${batterX}, 40) scale(${batterScaleX * 1.61}, 1.61) translate(-36, 0)`}>
                            <BatterSilhouette />
                        </g>
                    )}

                    {/* Waste zone areas (clickable in target mode) */}
                    {onTargetZoneSelect &&
                        wasteZones.map(({ zone, x, y, w, h, label }) => {
                            const isSelected = targetZone === zone;
                            return (
                                <g
                                    key={zone}
                                    onClick={(e) => handleZoneClick(zone, e)}
                                    style={{ cursor: isTargetMode || isSelected ? 'pointer' : 'default' }}
                                >
                                    <rect
                                        x={x}
                                        y={y}
                                        width={w}
                                        height={h}
                                        fill={isSelected ? AMBER + '40' : isTargetMode ? 'rgba(200, 200, 195, 0.3)' : 'transparent'}
                                        stroke={isSelected ? AMBER : isTargetMode ? '#b0b0a8' : 'none'}
                                        strokeWidth={isSelected ? 2 : 1}
                                        strokeDasharray={isSelected ? 'none' : '3,2'}
                                        rx="3"
                                    />
                                    <text
                                        x={x + w / 2}
                                        y={y + h / 2 + 4}
                                        textAnchor="middle"
                                        fontSize="9"
                                        fontWeight="600"
                                        fill={isSelected ? AMBER : isTargetMode ? '#888' : 'transparent'}
                                    >
                                        {label}
                                    </text>
                                </g>
                            );
                        })}

                    {/* Strike zone - 3x3 grid */}
                    <g transform="translate(113, 120)">
                        {/* Zone background */}
                        <rect x="0" y="0" width="75" height="110" fill="rgba(255,255,255,0.85)" />

                        {/* Grid cells (clickable for target zone) */}
                        {strikeZoneGrid.map(({ zone, row, col }) => {
                            const isSelected = targetZone === zone;
                            return (
                                <g
                                    key={zone}
                                    onClick={(e) => onTargetZoneSelect && handleZoneClick(zone, e)}
                                    style={{ cursor: onTargetZoneSelect && (isTargetMode || isSelected) ? 'pointer' : 'default' }}
                                >
                                    <rect
                                        x={col * cellW}
                                        y={row * cellH}
                                        width={cellW}
                                        height={cellH}
                                        fill={isSelected ? AMBER + '35' : 'rgba(230, 230, 225, 0.6)'}
                                        stroke={isSelected ? AMBER : '#a0a0a0'}
                                        strokeWidth={isSelected ? 2 : 1}
                                    />
                                    {/* Zone label (show in target mode or when selected) */}
                                    {(isTargetMode || isSelected) && ZONE_LABELS[zone] && (
                                        <text
                                            x={col * cellW + cellW / 2}
                                            y={row * cellH + cellH / 2 + 4}
                                            textAnchor="middle"
                                            fontSize="10"
                                            fontWeight="700"
                                            fill={isSelected ? AMBER : '#999'}
                                            pointerEvents="none"
                                        >
                                            {ZONE_LABELS[zone]}
                                        </text>
                                    )}
                                </g>
                            );
                        })}

                        {/* Outer border */}
                        <rect x="0" y="0" width="75" height="110" fill="none" stroke="#808080" strokeWidth="2" />
                    </g>

                    {/* Heat zone overlay */}
                    <HeatZoneOverlay zones={heatZones} visible={showHeatZones} />

                    {/* Previous pitches */}
                    {previousPitches.map((pitch, idx) => {
                        if (pitch.location_x === undefined || pitch.location_y === undefined) return null;
                        const coords = toSvgCoords(pitch.location_x, pitch.location_y);
                        return (
                            <g key={pitch.id || idx}>
                                <circle
                                    cx={coords.x}
                                    cy={coords.y}
                                    r="11"
                                    fill={getPitchColor(pitch.pitch_result)}
                                    stroke="white"
                                    strokeWidth="2"
                                />
                                <text x={coords.x} y={coords.y + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">
                                    {idx + 1}
                                </text>
                            </g>
                        );
                    })}

                    {/* Target zone indicator (highlight center of selected zone) */}
                    {targetZone && (
                        <g>
                            {(() => {
                                const zc = getZoneCoords(targetZone, effectiveSide);
                                const coords = toSvgCoords(zc.x, zc.y);
                                return (
                                    <>
                                        <circle
                                            cx={coords.x}
                                            cy={coords.y}
                                            r="12"
                                            fill="none"
                                            stroke={AMBER}
                                            strokeWidth="3"
                                            strokeDasharray="6,3"
                                        />
                                        <line
                                            x1={coords.x - 6}
                                            y1={coords.y}
                                            x2={coords.x + 6}
                                            y2={coords.y}
                                            stroke={AMBER}
                                            strokeWidth="2"
                                        />
                                        <line
                                            x1={coords.x}
                                            y1={coords.y - 6}
                                            x2={coords.x}
                                            y2={coords.y + 6}
                                            stroke={AMBER}
                                            strokeWidth="2"
                                        />
                                    </>
                                );
                            })()}
                        </g>
                    )}

                    {/* Selected location indicator (actual pitch location) */}
                    {selectedLocation && (
                        <g>
                            <circle
                                cx={toSvgCoords(selectedLocation.x, selectedLocation.y).x}
                                cy={toSvgCoords(selectedLocation.x, selectedLocation.y).y}
                                r="12"
                                fill={theme.colors.red[600]}
                                stroke="white"
                                strokeWidth="3"
                            >
                                <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" />
                            </circle>
                            <text
                                x={toSvgCoords(selectedLocation.x, selectedLocation.y).x}
                                y={toSvgCoords(selectedLocation.x, selectedLocation.y).y + 5}
                                textAnchor="middle"
                                fontSize="12"
                                fill="white"
                                fontWeight="bold"
                            >
                                ×
                            </text>
                        </g>
                    )}
                </MainSvg>

                {/* Clear target button */}
                {targetZone && onTargetClear && <ClearTargetButton onClick={onTargetClear}>Clear Target</ClearTargetButton>}

                <Legend>
                    <LegendItem>
                        <LegendDot color={theme.colors.green[500]} />
                        <span>Called Strike</span>
                    </LegendItem>
                    <LegendItem>
                        <LegendDot color={theme.colors.red[500]} />
                        <span>Swinging Strike</span>
                    </LegendItem>
                    <LegendItem>
                        <LegendDot color={theme.colors.gray[400]} />
                        <span>Ball</span>
                    </LegendItem>
                    <LegendItem>
                        <LegendDot color={theme.colors.yellow[500]} />
                        <span>Foul</span>
                    </LegendItem>
                    <LegendItem>
                        <LegendDot color={theme.colors.primary[600]} />
                        <span>In Play</span>
                    </LegendItem>
                </Legend>
            </ZoneWrapper>
            <Instructions>
                {onTargetZoneSelect
                    ? targetZone
                        ? 'Click on the zone to set pitch location'
                        : 'Click a zone to set target (Step 2)'
                    : 'Click on the zone to select pitch location'}
            </Instructions>
        </Container>
    );
};

export default StrikeZone;
