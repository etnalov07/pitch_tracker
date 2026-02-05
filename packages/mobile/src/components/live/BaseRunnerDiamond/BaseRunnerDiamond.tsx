import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { BaseRunners, RunnerBase } from '@pitch-tracker/shared';

interface BaseRunnerDiamondProps {
    runners: BaseRunners;
    size?: number;
    onBasePress?: (base: RunnerBase) => void;
    disabled?: boolean;
}

/**
 * Compact baseball diamond component for displaying base runner positions.
 * Designed to fit in the game header alongside score and count.
 */
const BaseRunnerDiamond: React.FC<BaseRunnerDiamondProps> = ({
    runners,
    size = 50,
    onBasePress,
    disabled = false,
}) => {
    // Diamond dimensions
    const center = size / 2;
    const baseSize = size * 0.18;
    const diamondSize = size * 0.38;

    // Base positions (rotated 45 degrees diamond)
    const homePos = { x: center, y: center + diamondSize };
    const firstPos = { x: center + diamondSize, y: center };
    const secondPos = { x: center, y: center - diamondSize };
    const thirdPos = { x: center - diamondSize, y: center };

    const baseColor = '#ffffff';
    const baseBorder = 'rgba(255,255,255,0.5)';
    const runnerColor = '#22c55e'; // Green for occupied base
    const pathColor = 'rgba(255,255,255,0.3)';

    const handleBasePress = (base: RunnerBase) => {
        if (onBasePress && !disabled) {
            onBasePress(base);
        }
    };

    return (
        <Pressable
            style={[styles.container, { width: size, height: size }]}
            onPress={() => {}}
            disabled={disabled || !onBasePress}
        >
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Base paths */}
                <Line
                    x1={homePos.x}
                    y1={homePos.y}
                    x2={firstPos.x}
                    y2={firstPos.y}
                    stroke={pathColor}
                    strokeWidth={1.5}
                />
                <Line
                    x1={firstPos.x}
                    y1={firstPos.y}
                    x2={secondPos.x}
                    y2={secondPos.y}
                    stroke={pathColor}
                    strokeWidth={1.5}
                />
                <Line
                    x1={secondPos.x}
                    y1={secondPos.y}
                    x2={thirdPos.x}
                    y2={thirdPos.y}
                    stroke={pathColor}
                    strokeWidth={1.5}
                />
                <Line
                    x1={thirdPos.x}
                    y1={thirdPos.y}
                    x2={homePos.x}
                    y2={homePos.y}
                    stroke={pathColor}
                    strokeWidth={1.5}
                />

                {/* Home plate (pentagon shape) */}
                <Path
                    d={`M ${homePos.x} ${homePos.y - baseSize * 0.4}
                        L ${homePos.x + baseSize * 0.5} ${homePos.y}
                        L ${homePos.x + baseSize * 0.5} ${homePos.y + baseSize * 0.25}
                        L ${homePos.x - baseSize * 0.5} ${homePos.y + baseSize * 0.25}
                        L ${homePos.x - baseSize * 0.5} ${homePos.y}
                        Z`}
                    fill={baseColor}
                    stroke={baseBorder}
                    strokeWidth={1}
                />

                {/* First base */}
                <Rect
                    x={firstPos.x - baseSize / 2}
                    y={firstPos.y - baseSize / 2}
                    width={baseSize}
                    height={baseSize}
                    fill={runners.first ? runnerColor : baseColor}
                    stroke={runners.first ? runnerColor : baseBorder}
                    strokeWidth={1}
                    transform={`rotate(45, ${firstPos.x}, ${firstPos.y})`}
                    onPress={() => handleBasePress('first')}
                />

                {/* Second base */}
                <Rect
                    x={secondPos.x - baseSize / 2}
                    y={secondPos.y - baseSize / 2}
                    width={baseSize}
                    height={baseSize}
                    fill={runners.second ? runnerColor : baseColor}
                    stroke={runners.second ? runnerColor : baseBorder}
                    strokeWidth={1}
                    transform={`rotate(45, ${secondPos.x}, ${secondPos.y})`}
                    onPress={() => handleBasePress('second')}
                />

                {/* Third base */}
                <Rect
                    x={thirdPos.x - baseSize / 2}
                    y={thirdPos.y - baseSize / 2}
                    width={baseSize}
                    height={baseSize}
                    fill={runners.third ? runnerColor : baseColor}
                    stroke={runners.third ? runnerColor : baseBorder}
                    strokeWidth={1}
                    transform={`rotate(45, ${thirdPos.x}, ${thirdPos.y})`}
                    onPress={() => handleBasePress('third')}
                />
            </Svg>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default BaseRunnerDiamond;
