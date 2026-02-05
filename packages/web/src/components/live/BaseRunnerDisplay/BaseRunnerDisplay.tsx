import React from 'react';
import styled from '@emotion/styled';
import { BaseRunners, RunnerBase } from '@pitch-tracker/shared';

interface BaseRunnerDisplayProps {
    runners: BaseRunners;
    size?: number;
    onBaseClick?: (base: RunnerBase) => void;
}

const Container = styled.div<{ $size: number }>`
    width: ${(props) => props.$size}px;
    height: ${(props) => props.$size}px;
    position: relative;
`;

const DiamondSvg = styled.svg`
    width: 100%;
    height: 100%;
`;

const Base = styled.rect<{ $occupied: boolean; $clickable: boolean }>`
    fill: ${(props) => (props.$occupied ? '#22c55e' : '#ffffff')};
    stroke: ${(props) => (props.$occupied ? '#22c55e' : '#9ca3af')};
    stroke-width: 1.5;
    cursor: ${(props) => (props.$clickable ? 'pointer' : 'default')};

    &:hover {
        opacity: ${(props) => (props.$clickable ? 0.8 : 1)};
    }
`;

const BasePath = styled.line`
    stroke: #d1d5db;
    stroke-width: 1.5;
`;

const HomePlate = styled.path`
    fill: #ffffff;
    stroke: #9ca3af;
    stroke-width: 1.5;
`;

/**
 * Compact baseball diamond showing base runner positions.
 * Used in the game status header.
 */
const BaseRunnerDisplay: React.FC<BaseRunnerDisplayProps> = ({ runners, size = 60, onBaseClick }) => {
    const center = size / 2;
    const baseSize = size * 0.18;
    const diamondSize = size * 0.38;

    // Base positions (rotated 45 degrees diamond)
    const homePos = { x: center, y: center + diamondSize };
    const firstPos = { x: center + diamondSize, y: center };
    const secondPos = { x: center, y: center - diamondSize };
    const thirdPos = { x: center - diamondSize, y: center };

    const handleBaseClick = (base: RunnerBase) => {
        if (onBaseClick) {
            onBaseClick(base);
        }
    };

    return (
        <Container $size={size}>
            <DiamondSvg viewBox={`0 0 ${size} ${size}`}>
                {/* Base paths */}
                <BasePath x1={homePos.x} y1={homePos.y} x2={firstPos.x} y2={firstPos.y} />
                <BasePath x1={firstPos.x} y1={firstPos.y} x2={secondPos.x} y2={secondPos.y} />
                <BasePath x1={secondPos.x} y1={secondPos.y} x2={thirdPos.x} y2={thirdPos.y} />
                <BasePath x1={thirdPos.x} y1={thirdPos.y} x2={homePos.x} y2={homePos.y} />

                {/* Home plate */}
                <HomePlate
                    d={`M ${homePos.x} ${homePos.y - baseSize * 0.4}
                        L ${homePos.x + baseSize * 0.5} ${homePos.y}
                        L ${homePos.x + baseSize * 0.5} ${homePos.y + baseSize * 0.25}
                        L ${homePos.x - baseSize * 0.5} ${homePos.y + baseSize * 0.25}
                        L ${homePos.x - baseSize * 0.5} ${homePos.y}
                        Z`}
                />

                {/* First base */}
                <Base
                    x={firstPos.x - baseSize / 2}
                    y={firstPos.y - baseSize / 2}
                    width={baseSize}
                    height={baseSize}
                    $occupied={runners.first}
                    $clickable={!!onBaseClick}
                    transform={`rotate(45, ${firstPos.x}, ${firstPos.y})`}
                    onClick={() => handleBaseClick('first')}
                />

                {/* Second base */}
                <Base
                    x={secondPos.x - baseSize / 2}
                    y={secondPos.y - baseSize / 2}
                    width={baseSize}
                    height={baseSize}
                    $occupied={runners.second}
                    $clickable={!!onBaseClick}
                    transform={`rotate(45, ${secondPos.x}, ${secondPos.y})`}
                    onClick={() => handleBaseClick('second')}
                />

                {/* Third base */}
                <Base
                    x={thirdPos.x - baseSize / 2}
                    y={thirdPos.y - baseSize / 2}
                    width={baseSize}
                    height={baseSize}
                    $occupied={runners.third}
                    $clickable={!!onBaseClick}
                    transform={`rotate(45, ${thirdPos.x}, ${thirdPos.y})`}
                    onClick={() => handleBaseClick('third')}
                />
            </DiamondSvg>
        </Container>
    );
};

export default BaseRunnerDisplay;
