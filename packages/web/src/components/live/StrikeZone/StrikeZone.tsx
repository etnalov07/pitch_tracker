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
// Strike zone is at (105, 100) with width 90, height 132
// "in" zones are on the batter's side, "out" zones are away
function getWasteZones(effectiveSide: 'R' | 'L') {
    const flip = effectiveSide === 'R';
    const L = { x: 73, w: 32 }; // left position
    const R = { x: 195, w: 32 }; // right position
    const inPos = flip ? R : L;
    const outPos = flip ? L : R;
    return [
        { zone: 'W-high-in' as PitchCallZone, x: inPos.x, y: 65, w: inPos.w, h: 35, label: 'HI' },
        { zone: 'W-high' as PitchCallZone, x: 125, y: 65, w: 50, h: 35, label: 'HIGH' },
        { zone: 'W-high-out' as PitchCallZone, x: outPos.x, y: 65, w: outPos.w, h: 35, label: 'HO' },
        { zone: 'W-in' as PitchCallZone, x: inPos.x, y: 100, w: inPos.w, h: 132, label: 'IN' },
        { zone: 'W-out' as PitchCallZone, x: outPos.x, y: 100, w: outPos.w, h: 132, label: 'OUT' },
        { zone: 'W-low-in' as PitchCallZone, x: inPos.x, y: 232, w: inPos.w, h: 35, label: 'LI' },
        { zone: 'W-low' as PitchCallZone, x: 125, y: 232, w: 50, h: 35, label: 'LOW' },
        { zone: 'W-low-out' as PitchCallZone, x: outPos.x, y: 232, w: outPos.w, h: 35, label: 'LO' },
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

    // Calculate 0-1 strike zone coordinates from a client position
    const clientToZoneCoords = (clientX: number, clientY: number, rect: DOMRect) => {
        const svgX = ((clientX - rect.left) / rect.width) * 300;
        const svgY = ((clientY - rect.top) / rect.height) * 300;
        return { zoneX: (svgX - 105) / 90, zoneY: (svgY - 100) / 132 };
    };

    const recordLocation = (zoneX: number, zoneY: number) => {
        if (zoneX >= -0.3 && zoneX <= 1.3 && zoneY >= -0.3 && zoneY <= 1.3) {
            setSelectedLocation({ x: zoneX, y: zoneY });
            onLocationSelect(zoneX, zoneY);
        }
    };

    // Mouse click — pitch location on SVG background
    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!onTargetZoneSelect || targetZone) {
            const rect = e.currentTarget.getBoundingClientRect();
            const { zoneX, zoneY } = clientToZoneCoords(e.clientX, e.clientY, rect);
            recordLocation(zoneX, zoneY);
        }
    };

    // Touch end — pitch location (tablet/touchscreen browsers)
    const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
        if (!onTargetZoneSelect || targetZone) {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const rect = e.currentTarget.getBoundingClientRect();
            const { zoneX, zoneY } = clientToZoneCoords(touch.clientX, touch.clientY, rect);
            recordLocation(zoneX, zoneY);
        }
    };

    const handleZoneClick = (zone: PitchCallZone, e: React.MouseEvent | React.TouchEvent) => {
        if (!targetZone && onTargetZoneSelect) {
            e.stopPropagation();
            if ('preventDefault' in e && e.type === 'touchend') (e as React.TouchEvent).preventDefault();
            onTargetZoneSelect(zone);
        }
        // If targetZone already set, let event bubble to SVG for pitch location recording
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
        x: 105 + x * 90,
        y: 100 + y * 132,
    });

    // Determine batter position
    const effectiveSide = batterSide === 'S' ? (pitcherThrows === 'L' ? 'R' : 'L') : batterSide === 'L' ? 'L' : 'R';
    const batterX = effectiveSide === 'R' ? 253 : 47;
    const batterScaleX = effectiveSide === 'R' ? 1 : -1;

    // Get batter-relative zone positions (physically mirrored for LHH)
    const strikeZoneGrid = getStrikeZoneGrid(effectiveSide);
    const wasteZones = getWasteZones(effectiveSide);

    // Zone cell dimensions
    const cellW = 90 / 3;
    const cellH = 132 / 3;

    // Colors
    const AMBER = '#F5A623';
    const isTargetMode = onTargetZoneSelect && !targetZone;

    return (
        <Container>
            <Title>Strike Zone</Title>
            <ZoneWrapper>
                <MainSvg viewBox="0 0 300 300" onClick={handleClick} onTouchEnd={handleTouchEnd} style={{ touchAction: 'none' }}>
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
                                    onTouchEnd={(e) => handleZoneClick(zone, e)}
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
                    <g transform="translate(105, 100)">
                        {/* Zone background */}
                        <rect x="0" y="0" width="90" height="132" fill="rgba(255,255,255,0.85)" />

                        {/* Grid cells (clickable for target zone) */}
                        {strikeZoneGrid.map(({ zone, row, col }) => {
                            const isSelected = targetZone === zone;
                            return (
                                <g
                                    key={zone}
                                    onClick={(e) => onTargetZoneSelect && handleZoneClick(zone, e)}
                                    onTouchEnd={(e) => onTargetZoneSelect && handleZoneClick(zone, e)}
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
                        <rect x="0" y="0" width="90" height="132" fill="none" stroke="#808080" strokeWidth="2" />
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
                                    r="13"
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
                                            r="14"
                                            fill="none"
                                            stroke={AMBER}
                                            strokeWidth="3"
                                            strokeDasharray="6,3"
                                        />
                                        <line
                                            x1={coords.x - 7}
                                            y1={coords.y}
                                            x2={coords.x + 7}
                                            y2={coords.y}
                                            stroke={AMBER}
                                            strokeWidth="2"
                                        />
                                        <line
                                            x1={coords.x}
                                            y1={coords.y - 7}
                                            x2={coords.x}
                                            y2={coords.y + 7}
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
                                r="14"
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
