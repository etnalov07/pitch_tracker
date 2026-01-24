import React, { useState, useRef } from 'react';
import { theme } from '../../../styles/theme';
import { Container, DiamondSvg, Legend, LegendItem, LegendLine } from './styles';

export type HitType = 'fly_ball' | 'line_drive' | 'ground_ball';

export interface HitLocation {
    x: number; // 0-100 percentage
    y: number; // 0-100 percentage
    hitType: HitType;
}

interface BaseballDiamondProps {
    onLocationSelect: (location: HitLocation) => void;
    selectedLocation?: HitLocation | null;
    hitType: HitType;
}

const BaseballDiamond: React.FC<BaseballDiamondProps> = ({ onLocationSelect, selectedLocation, hitType }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoverLocation, setHoverLocation] = useState<{ x: number; y: number } | null>(null);

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        onLocationSelect({ x, y, hitType });
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setHoverLocation({ x, y });
    };

    const handleMouseLeave = () => {
        setHoverLocation(null);
    };

    // Generate trajectory path from home plate to hit location
    const generateTrajectoryPath = (endX: number, endY: number, type: HitType): string => {
        const startX = 50; // Home plate x
        const startY = 85; // Home plate y

        if (type === 'line_drive') {
            // Straight line
            return `M ${startX} ${startY} L ${endX} ${endY}`;
        } else if (type === 'fly_ball') {
            // Curved arc (control point above the midpoint)
            const midX = (startX + endX) / 2;
            const midY = Math.min(startY, endY) - 15; // Arc above
            return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
        } else {
            // Ground ball - squiggly line using multiple small curves
            const segments = 6;
            let path = `M ${startX} ${startY}`;
            const dx = (endX - startX) / segments;
            const dy = (endY - startY) / segments;

            for (let i = 0; i < segments; i++) {
                const x1 = startX + dx * i + dx / 2;
                const y1 = startY + dy * i + dy / 2;
                const wiggle = i % 2 === 0 ? 2 : -2;
                const cpX = x1 + wiggle;
                const cpY = y1;
                const nextX = startX + dx * (i + 1);
                const nextY = startY + dy * (i + 1);
                path += ` Q ${cpX} ${cpY} ${nextX} ${nextY}`;
            }
            return path;
        }
    };

    const getTrajectoryColor = (type: HitType): string => {
        switch (type) {
            case 'fly_ball':
                return theme.colors.primary[500];
            case 'line_drive':
                return theme.colors.red[500];
            case 'ground_ball':
                return theme.colors.yellow[600];
            default:
                return theme.colors.gray[500];
        }
    };

    return (
        <Container>
            <DiamondSvg
                ref={svgRef}
                viewBox="0 0 100 100"
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Outfield grass */}
                <path
                    d="M 50 10 Q 5 40 10 85 L 50 85 L 90 85 Q 95 40 50 10"
                    fill={theme.colors.green[200]}
                    stroke={theme.colors.green[400]}
                    strokeWidth="0.5"
                />

                {/* Infield dirt */}
                <polygon
                    points="50,55 30,75 50,95 70,75"
                    fill={theme.colors.yellow[200]}
                    stroke={theme.colors.yellow[400]}
                    strokeWidth="0.5"
                />

                {/* Baseline paths */}
                <line x1="50" y1="85" x2="30" y2="65" stroke={theme.colors.gray[300]} strokeWidth="1" />
                <line x1="50" y1="85" x2="70" y2="65" stroke={theme.colors.gray[300]} strokeWidth="1" />
                <line x1="30" y1="65" x2="50" y2="45" stroke={theme.colors.gray[300]} strokeWidth="1" />
                <line x1="70" y1="65" x2="50" y2="45" stroke={theme.colors.gray[300]} strokeWidth="1" />

                {/* Bases */}
                <rect
                    x="48"
                    y="83"
                    width="4"
                    height="4"
                    fill="white"
                    stroke={theme.colors.gray[400]}
                    transform="rotate(45 50 85)"
                />
                <rect
                    x="28"
                    y="63"
                    width="4"
                    height="4"
                    fill="white"
                    stroke={theme.colors.gray[400]}
                    transform="rotate(45 30 65)"
                />
                <rect
                    x="68"
                    y="63"
                    width="4"
                    height="4"
                    fill="white"
                    stroke={theme.colors.gray[400]}
                    transform="rotate(45 70 65)"
                />
                <rect
                    x="48"
                    y="43"
                    width="4"
                    height="4"
                    fill="white"
                    stroke={theme.colors.gray[400]}
                    transform="rotate(45 50 45)"
                />

                {/* Pitcher's mound */}
                <circle cx="50" cy="65" r="2" fill={theme.colors.yellow[300]} stroke={theme.colors.yellow[500]} strokeWidth="0.5" />

                {/* Foul lines */}
                <line x1="50" y1="85" x2="5" y2="40" stroke={theme.colors.gray[400]} strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="50" y1="85" x2="95" y2="40" stroke={theme.colors.gray[400]} strokeWidth="0.5" strokeDasharray="2,2" />

                {/* Warning track arc */}
                <path
                    d="M 10 50 Q 50 5 90 50"
                    fill="none"
                    stroke={theme.colors.yellow[400]}
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                />

                {/* Field positions labels */}
                <text x="50" y="38" fontSize="3" fill={theme.colors.gray[500]} textAnchor="middle">
                    CF
                </text>
                <text x="25" y="48" fontSize="3" fill={theme.colors.gray[500]} textAnchor="middle">
                    LF
                </text>
                <text x="75" y="48" fontSize="3" fill={theme.colors.gray[500]} textAnchor="middle">
                    RF
                </text>
                <text x="38" y="60" fontSize="3" fill={theme.colors.gray[500]} textAnchor="middle">
                    SS
                </text>
                <text x="62" y="60" fontSize="3" fill={theme.colors.gray[500]} textAnchor="middle">
                    2B
                </text>
                <text x="25" y="72" fontSize="3" fill={theme.colors.gray[500]} textAnchor="middle">
                    3B
                </text>
                <text x="75" y="72" fontSize="3" fill={theme.colors.gray[500]} textAnchor="middle">
                    1B
                </text>

                {/* Hover indicator */}
                {hoverLocation && !selectedLocation && (
                    <>
                        <path
                            d={generateTrajectoryPath(hoverLocation.x, hoverLocation.y, hitType)}
                            fill="none"
                            stroke={getTrajectoryColor(hitType)}
                            strokeWidth="1"
                            strokeDasharray="2,2"
                            opacity="0.5"
                        />
                        <circle cx={hoverLocation.x} cy={hoverLocation.y} r="2" fill={getTrajectoryColor(hitType)} opacity="0.5" />
                    </>
                )}

                {/* Selected location with trajectory */}
                {selectedLocation && (
                    <>
                        <path
                            d={generateTrajectoryPath(selectedLocation.x, selectedLocation.y, selectedLocation.hitType)}
                            fill="none"
                            stroke={getTrajectoryColor(selectedLocation.hitType)}
                            strokeWidth="1.5"
                        />
                        <circle
                            cx={selectedLocation.x}
                            cy={selectedLocation.y}
                            r="3"
                            fill={getTrajectoryColor(selectedLocation.hitType)}
                        />
                        {/* Ball marker */}
                        <circle cx={selectedLocation.x} cy={selectedLocation.y} r="1.5" fill="white" />
                    </>
                )}
            </DiamondSvg>

            <Legend>
                <LegendItem>
                    <LegendLine style={{ background: theme.colors.primary[500] }} />
                    <span>Fly Ball (arc)</span>
                </LegendItem>
                <LegendItem>
                    <LegendLine style={{ background: theme.colors.red[500] }} />
                    <span>Line Drive (straight)</span>
                </LegendItem>
                <LegendItem>
                    <LegendLine style={{ background: theme.colors.yellow[600] }} />
                    <span>Ground Ball (squiggly)</span>
                </LegendItem>
            </Legend>
        </Container>
    );
};

export default BaseballDiamond;
