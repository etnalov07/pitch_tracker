import { HeatZoneData, PitchCallZone, PITCH_CALL_ZONE_COORDS } from '@pitch-tracker/shared';
import React, { useState, useEffect, useRef } from 'react';
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
    // Track the selected zone for cell highlight and raw click position for the dot
    const [selectedZone, setSelectedZone] = useState<PitchCallZone | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<{ x: number; y: number } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Reset on new pitch logged
    useEffect(() => {
        setSelectedZone(null);
        setSelectedLocation(null);
    }, [previousPitches.length]);

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
    const BLUE = theme.colors.primary[600];
    const isTargetMode = onTargetZoneSelect && !targetZone;

    // Stage 1 — target mode: tapping a zone records it as the called target.
    // Stage 2 — location mode: clicking anywhere in a zone stores the raw click
    // position (not the zone center), so heat maps reflect where the ball actually
    // landed within the zone rather than collapsing to 17 discrete points.
    const handleZoneClick = (zone: PitchCallZone, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        if (e.type === 'touchend') (e as React.TouchEvent).preventDefault();

        if (isTargetMode) {
            onTargetZoneSelect!(zone);
        } else {
            setSelectedZone(zone);
            const svg = svgRef.current;
            if (svg) {
                const rect = svg.getBoundingClientRect();
                let clientX: number, clientY: number;
                if ('changedTouches' in e) {
                    clientX = (e as React.TouchEvent).changedTouches[0].clientX;
                    clientY = (e as React.TouchEvent).changedTouches[0].clientY;
                } else {
                    clientX = (e as React.MouseEvent).clientX;
                    clientY = (e as React.MouseEvent).clientY;
                }
                const rawX = ((clientX - rect.left) * (300 / rect.width) - 105) / 90;
                const rawY = ((clientY - rect.top) * (300 / rect.height) - 100) / 132;
                setSelectedLocation({ x: rawX, y: rawY });
                onLocationSelect(rawX, rawY);
            } else {
                const coords = getZoneCoords(zone, effectiveSide);
                setSelectedLocation(coords);
                onLocationSelect(coords.x, coords.y);
            }
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
        x: 105 + x * 90,
        y: 100 + y * 132,
    });

    return (
        <Container>
            <Title>Strike Zone</Title>
            <ZoneWrapper>
                {/* touchAction:none prevents scroll-while-tapping on mobile */}
                <MainSvg ref={svgRef as React.Ref<SVGSVGElement>} viewBox="0 0 300 300" style={{ touchAction: 'none' }}>
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

                    {/* Waste zone areas — always visible and tappable */}
                    {wasteZones.map(({ zone, x, y, w, h, label }) => {
                        const isTarget = targetZone === zone;
                        const isSelected = selectedZone === zone;
                        const showHighlight = isTargetMode || isTarget || isSelected;
                        return (
                            <g
                                key={zone}
                                onClick={(e) => handleZoneClick(zone, e)}
                                onTouchEnd={(e) => handleZoneClick(zone, e)}
                                style={{ cursor: 'pointer' }}
                            >
                                <rect
                                    x={x}
                                    y={y}
                                    width={w}
                                    height={h}
                                    fill={
                                        isSelected
                                            ? BLUE + '30'
                                            : isTarget
                                              ? AMBER + '40'
                                              : showHighlight
                                                ? 'rgba(200, 200, 195, 0.3)'
                                                : 'rgba(200,200,195,0.15)'
                                    }
                                    stroke={isSelected ? BLUE : isTarget ? AMBER : '#b0b0a8'}
                                    strokeWidth={isSelected || isTarget ? 2 : 1}
                                    strokeDasharray={isSelected || isTarget ? 'none' : '3,2'}
                                    rx="3"
                                />
                                <text
                                    x={x + w / 2}
                                    y={y + h / 2 + 4}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fontWeight="600"
                                    fill={isSelected ? BLUE : isTarget ? AMBER : '#aaa'}
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

                        {/* Grid cells — always tappable */}
                        {strikeZoneGrid.map(({ zone, row, col }) => {
                            const isTarget = targetZone === zone;
                            const isSelected = selectedZone === zone;
                            return (
                                <g
                                    key={zone}
                                    onClick={(e) => handleZoneClick(zone, e)}
                                    onTouchEnd={(e) => handleZoneClick(zone, e)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <rect
                                        x={col * cellW}
                                        y={row * cellH}
                                        width={cellW}
                                        height={cellH}
                                        fill={isSelected ? BLUE + '25' : isTarget ? AMBER + '35' : 'rgba(230, 230, 225, 0.6)'}
                                        stroke={isSelected ? BLUE : isTarget ? AMBER : '#a0a0a0'}
                                        strokeWidth={isSelected || isTarget ? 2 : 1}
                                    />
                                    {/* Zone label */}
                                    {(isTargetMode || isTarget || isSelected) && ZONE_LABELS[zone] && (
                                        <text
                                            x={col * cellW + cellW / 2}
                                            y={row * cellH + cellH / 2 + 4}
                                            textAnchor="middle"
                                            fontSize="10"
                                            fontWeight="700"
                                            fill={isSelected ? BLUE : isTarget ? AMBER : '#999'}
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

                    {/* Target zone indicator — dashed crosshair at zone center */}
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

                    {/* Selected location indicator — pulsing dot at raw click position */}
                    {selectedLocation && (
                        <g>
                            {(() => {
                                const coords = toSvgCoords(selectedLocation.x, selectedLocation.y);
                                return (
                                    <circle cx={coords.x} cy={coords.y} r="10" fill={BLUE} stroke="white" strokeWidth="3">
                                        <animate attributeName="r" values="8;12;8" dur="0.8s" repeatCount="indefinite" />
                                    </circle>
                                );
                            })()}
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
                        ? 'Step 2: Tap a zone to record actual pitch location'
                        : 'Step 2: Tap a zone to set called target'
                    : 'Step 2: Tap a zone to record pitch location'}
            </Instructions>
        </Container>
    );
};

export default StrikeZone;
