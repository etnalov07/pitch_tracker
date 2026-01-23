import styled from '@emotion/styled';
import { HeatZoneData } from '@pitch-tracker/shared';
import React, { useState, useEffect } from 'react';
import { theme } from '../../styles/theme';
import { Pitch } from '../../types';
import HeatZoneOverlay from './HeatZoneOverlay';

interface StrikeZoneProps {
    onLocationSelect: (x: number, y: number) => void;
    onTargetSelect?: (x: number, y: number) => void;
    onTargetClear?: () => void;
    targetLocation?: { x: number; y: number } | null;
    previousPitches?: Pitch[];
    heatZones?: HeatZoneData[];
    showHeatZones?: boolean;
}

const StrikeZone: React.FC<StrikeZoneProps> = ({
    onLocationSelect,
    onTargetSelect,
    onTargetClear,
    targetLocation,
    previousPitches = [],
    heatZones = [],
    showHeatZones = false,
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

                    {/* Home plate - 3D perspective view */}
                    <g transform="translate(150, 210)">
                        {/* Plate shadow/ground */}
                        <ellipse cx="0" cy="35" rx="85" ry="20" fill="#e0e0d8" />

                        {/* Main plate surface - teal color */}
                        <path d="M -70 0 L 70 0 L 70 25 L 0 55 L -70 25 Z" fill="#4db6ac" stroke="#26a69a" strokeWidth="2" />

                        {/* Plate highlight - lighter inner area */}
                        <path d="M -60 5 L 60 5 L 60 22 L 0 48 L -60 22 Z" fill="#80cbc4" stroke="#4db6ac" strokeWidth="1" />

                        {/* White inner plate */}
                        <path d="M -50 10 L 50 10 L 50 18 L 0 42 L -50 18 Z" fill="white" stroke="#b0bec5" strokeWidth="1" />
                    </g>

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

// Styled Components
const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
`;

const Title = styled.h3`
    font-size: ${theme.fontSize.lg};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.gray[900]};
    margin: 0;
`;

const ZoneWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
    align-items: center;
`;

const MainSvg = styled.svg`
    width: 100%;
    max-width: 350px;
    height: auto;
    cursor: crosshair;
    border-radius: ${theme.borderRadius.lg};
    box-shadow: ${theme.shadows.md};
`;

const ClearTargetButton = styled.button`
    padding: ${theme.spacing.xs} ${theme.spacing.md};
    background-color: ${theme.colors.gray[100]};
    color: ${theme.colors.gray[700]};
    border: 1px solid ${theme.colors.gray[300]};
    border-radius: ${theme.borderRadius.md};
    font-size: ${theme.fontSize.sm};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background-color: ${theme.colors.gray[200]};
        border-color: ${theme.colors.gray[400]};
    }
`;

const Legend = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.spacing.md};
    padding: ${theme.spacing.md};
    background-color: ${theme.colors.gray[50]};
    border-radius: ${theme.borderRadius.md};
`;

const LegendItem = styled.div`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.gray[700]};
`;

const LegendDot = styled.div<{ color: string }>`
    width: 12px;
    height: 12px;
    background-color: ${(props) => props.color};
    border-radius: 50%;
    border: 1px solid white;
    box-shadow: ${theme.shadows.sm};
`;

const TargetIcon = styled.div`
    width: 14px;
    height: 14px;
    border: 2px dashed ${theme.colors.primary[500]};
    border-radius: 50%;
`;

const Instructions = styled.p`
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.gray[600]};
    text-align: center;
    margin: 0;
    font-style: italic;
`;

export default StrikeZone;
