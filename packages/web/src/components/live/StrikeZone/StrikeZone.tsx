import { HeatZoneData } from '@pitch-tracker/shared';
import React, { useState, useEffect } from 'react';
import { theme } from '../../../styles/theme';
import { Pitch } from '../../../types';
import HeatZoneOverlay from '../HeatZoneOverlay';
import {
    Container,
    Title,
    ZoneWrapper,
    MainSvg,
    ClearTargetButton,
    Legend,
    LegendItem,
    LegendDot,
    TargetIcon,
    Instructions,
} from './styles';

interface StrikeZoneProps {
    onLocationSelect: (x: number, y: number) => void;
    onTargetSelect?: (x: number, y: number) => void;
    onTargetClear?: () => void;
    targetLocation?: { x: number; y: number } | null;
    previousPitches?: Pitch[];
    heatZones?: HeatZoneData[];
    showHeatZones?: boolean;
    batterSide?: 'R' | 'L' | 'S' | null;
    pitcherThrows?: 'R' | 'L' | null;
}

const StrikeZone: React.FC<StrikeZoneProps> = ({
    onLocationSelect,
    onTargetSelect,
    onTargetClear,
    targetLocation,
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
        // Map click to the strike zone area (which starts at x=85 and is 130 wide, y=30 and is 150 tall in the SVG)
        const svgX = ((e.clientX - rect.left) / rect.width) * 300;
        const svgY = ((e.clientY - rect.top) / rect.height) * 280;

        // Convert to 0-1 coordinates within strike zone
        const zoneX = (svgX - 85) / 130;
        const zoneY = (svgY - 30) / 150;

        return { zoneX, zoneY };
    };

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const { zoneX, zoneY } = getCoordinatesFromEvent(e);

        // If we have target support and no target is set yet, set the target
        // Targets can be anywhere (outside zone allowed for off-speed pitches)
        if (onTargetSelect && !targetLocation && !selectedLocation) {
            // Allow targets in expanded area (-0.3 to 1.3)
            if (zoneX >= -0.3 && zoneX <= 1.3 && zoneY >= -0.3 && zoneY <= 1.3) {
                onTargetSelect(zoneX, zoneY);
            }
        } else {
            // For actual pitch location, use expanded area but clamp to reasonable bounds
            if (zoneX >= -0.3 && zoneX <= 1.3 && zoneY >= -0.3 && zoneY <= 1.3) {
                setSelectedLocation({ x: zoneX, y: zoneY });
                onLocationSelect(zoneX, zoneY);
            }
        }
    };

    // Right-click to clear target
    const handleContextMenu = (e: React.MouseEvent<SVGSVGElement>) => {
        e.preventDefault();
        if (targetLocation && onTargetClear) {
            onTargetClear();
        }
    };

    // Double-click to clear target
    const handleDoubleClick = (_e: React.MouseEvent<SVGSVGElement>) => {
        if (targetLocation && onTargetClear) {
            onTargetClear();
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
        x: 85 + x * 130,
        y: 30 + y * 150,
    });

    // Target marker radius (ball-width, roughly 1/9 of zone width)
    const TARGET_RADIUS = 18;

    // Determine batter position: from pitcher's perspective,
    // a right-handed batter stands on the LEFT side of the plate,
    // a left-handed batter stands on the RIGHT side.
    // Switch hitters bat opposite the pitcher's throwing hand.
    const effectiveSide = batterSide === 'S' ? (pitcherThrows === 'L' ? 'R' : 'L') : batterSide === 'L' ? 'L' : 'R';
    const batterX = effectiveSide === 'R' ? 255 : 45;
    const batterScaleX = effectiveSide === 'R' ? 1 : -1;

    return (
        <Container>
            <Title>Strike Zone</Title>
            <ZoneWrapper>
                <MainSvg
                    viewBox="0 0 300 280"
                    onClick={handleClick}
                    onContextMenu={handleContextMenu}
                    onDoubleClick={handleDoubleClick}
                >
                    {/* Background */}
                    <rect x="0" y="0" width="300" height="280" fill="#f5f5f0" />

                    {/* Home plate - reversed (point facing pitcher/up) */}
                    <g transform="translate(150, 210)">
                        <ellipse cx="0" cy="30" rx="85" ry="20" fill="#e0e0d8" />
                        <path d="M -70 45 L 70 45 L 70 20 L 0 -10 L -70 20 Z" fill="#4db6ac" stroke="#26a69a" strokeWidth="2" />
                        <path d="M -60 40 L 60 40 L 60 22 L 0 -4 L -60 22 Z" fill="#80cbc4" stroke="#4db6ac" strokeWidth="1" />
                        <path d="M -50 36 L 50 36 L 50 24 L 0 2 L -50 24 Z" fill="white" stroke="#b0bec5" strokeWidth="1" />
                    </g>

                    {/* Batter silhouette */}
                    {batterSide && (
                        <g transform={`translate(${batterX}, 144) scale(${batterScaleX}, 1)`} opacity={0.45}>
                            <g fill="#808080">
                                {/* Head */}
                                <ellipse cx="1" cy="-40" rx="7" ry="8" />
                                {/* Helmet dome */}
                                <path d="M -7 -44 C -7 -53 11 -53 11 -44 L 11 -40 L -7 -40 Z" />
                                {/* Helmet bill */}
                                <path d="M -7 -44 L -14 -43 L -14 -41 L -7 -41 Z" />
                                {/* Neck */}
                                <rect x="-2" y="-33" width="6" height="5" rx="2" />
                                {/* Torso */}
                                <path d="M -10 -28 C -12 -18 -10 -4 -7 4 L 10 4 C 13 -4 15 -18 13 -28 Z" />
                                {/* Belt */}
                                <rect x="-8" y="2" width="19" height="4" rx="1" fill="#666666" />
                                {/* Back leg */}
                                <path d="M -7 6 C -8 14 -10 20 -12 28 L -15 38 L -18 42 L -8 42 L -8 38 L -5 28 C -3 20 -2 14 -1 6 Z" />
                                {/* Front leg */}
                                <path d="M 5 6 C 6 14 8 20 11 28 L 14 38 L 12 42 L 22 42 L 20 38 L 16 28 C 13 20 11 14 9 6 Z" />
                                {/* Back upper arm */}
                                <path d="M -10 -26 C -14 -23 -17 -19 -17 -15 L -12 -13 C -11 -17 -9 -21 -7 -24 Z" />
                                {/* Back forearm */}
                                <path d="M -15 -14 C -12 -19 -7 -25 -2 -29 L 2 -26 C -3 -22 -8 -17 -11 -12 Z" />
                                {/* Front upper arm */}
                                <path d="M 13 -26 C 16 -23 17 -19 16 -15 L 11 -13 C 12 -17 12 -21 12 -24 Z" />
                                {/* Front forearm */}
                                <path d="M 14 -14 C 11 -19 7 -25 3 -29 L -1 -26 C 4 -22 8 -17 11 -12 Z" />
                                {/* Hands */}
                                <circle cx="0" cy="-28" r="5" />
                            </g>
                            {/* Bat handle */}
                            <line x1="0" y1="-28" x2="22" y2="-56" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />
                            {/* Bat barrel */}
                            <line x1="18" y1="-52" x2="28" y2="-64" stroke="#795548" strokeWidth="6" strokeLinecap="round" />
                        </g>
                    )}

                    {/* Strike zone - 3x3 grid */}
                    <g transform="translate(85, 30)">
                        {/* Zone background */}
                        <rect x="0" y="0" width="130" height="150" fill="rgba(255,255,255,0.85)" />

                        {/* Grid cells */}
                        {[0, 1, 2].map((row) =>
                            [0, 1, 2].map((col) => (
                                <rect
                                    key={`cell-${row}-${col}`}
                                    x={col * (130 / 3)}
                                    y={row * (150 / 3)}
                                    width={130 / 3}
                                    height={150 / 3}
                                    fill="rgba(230, 230, 225, 0.6)"
                                    stroke="#a0a0a0"
                                    strokeWidth="1"
                                />
                            ))
                        )}

                        {/* Outer border */}
                        <rect x="0" y="0" width="130" height="150" fill="none" stroke="#808080" strokeWidth="2" />
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
                                    r="12"
                                    fill={getPitchColor(pitch.pitch_result)}
                                    stroke="white"
                                    strokeWidth="2"
                                />
                                <text
                                    x={coords.x}
                                    y={coords.y + 4}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="white"
                                    fontWeight="bold"
                                >
                                    {idx + 1}
                                </text>
                            </g>
                        );
                    })}

                    {/* Current target location (hollow circle - ball width) */}
                    {targetLocation && (
                        <g>
                            <circle
                                cx={toSvgCoords(targetLocation.x, targetLocation.y).x}
                                cy={toSvgCoords(targetLocation.x, targetLocation.y).y}
                                r={TARGET_RADIUS}
                                fill="none"
                                stroke={theme.colors.primary[500]}
                                strokeWidth="3"
                                strokeDasharray="6,3"
                            />
                            {/* Crosshair inside target */}
                            <line
                                x1={toSvgCoords(targetLocation.x, targetLocation.y).x - 8}
                                y1={toSvgCoords(targetLocation.x, targetLocation.y).y}
                                x2={toSvgCoords(targetLocation.x, targetLocation.y).x + 8}
                                y2={toSvgCoords(targetLocation.x, targetLocation.y).y}
                                stroke={theme.colors.primary[500]}
                                strokeWidth="2"
                            />
                            <line
                                x1={toSvgCoords(targetLocation.x, targetLocation.y).x}
                                y1={toSvgCoords(targetLocation.x, targetLocation.y).y - 8}
                                x2={toSvgCoords(targetLocation.x, targetLocation.y).x}
                                y2={toSvgCoords(targetLocation.x, targetLocation.y).y + 8}
                                stroke={theme.colors.primary[500]}
                                strokeWidth="2"
                            />
                        </g>
                    )}

                    {/* Selected location indicator (actual pitch location) */}
                    {selectedLocation && (
                        <g>
                            <circle
                                cx={toSvgCoords(selectedLocation.x, selectedLocation.y).x}
                                cy={toSvgCoords(selectedLocation.x, selectedLocation.y).y}
                                r="16"
                                fill={theme.colors.red[600]}
                                stroke="white"
                                strokeWidth="3"
                            >
                                <animate attributeName="r" values="14;18;14" dur="1s" repeatCount="indefinite" />
                            </circle>
                            <text
                                x={toSvgCoords(selectedLocation.x, selectedLocation.y).x}
                                y={toSvgCoords(selectedLocation.x, selectedLocation.y).y + 5}
                                textAnchor="middle"
                                fontSize="16"
                                fill="white"
                                fontWeight="bold"
                            >
                                ×
                            </text>
                        </g>
                    )}
                </MainSvg>

                {/* Clear target button */}
                {targetLocation && onTargetClear && <ClearTargetButton onClick={onTargetClear}>Clear Target</ClearTargetButton>}

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
                    {onTargetSelect && (
                        <LegendItem>
                            <TargetIcon />
                            <span>Target</span>
                        </LegendItem>
                    )}
                </Legend>
            </ZoneWrapper>
            <Instructions>
                {onTargetSelect
                    ? targetLocation
                        ? 'Click to set pitch location (right-click or double-click to clear target)'
                        : 'Click to set target location (optional)'
                    : 'Click on the zone to select pitch location'}
            </Instructions>
        </Container>
    );
};

export default StrikeZone;
