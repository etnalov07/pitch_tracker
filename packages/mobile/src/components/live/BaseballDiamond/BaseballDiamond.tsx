import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Circle, G, Rect, Line } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';

interface BaseballDiamondProps {
    runners?: {
        first?: boolean;
        second?: boolean;
        third?: boolean;
    };
    outs?: number;
    onBasePress?: (base: 'first' | 'second' | 'third' | 'home') => void;
    size?: number;
    showLabels?: boolean;
}

const BaseballDiamond: React.FC<BaseballDiamondProps> = ({
    runners = {},
    outs = 0,
    onBasePress,
    size = 200,
    showLabels = true,
}) => {
    const theme = useTheme();

    // Diamond dimensions
    const center = size / 2;
    const baseSize = size * 0.08;
    const diamondSize = size * 0.35;

    // Base positions (rotated 45 degrees)
    const homePos = { x: center, y: center + diamondSize };
    const firstPos = { x: center + diamondSize, y: center };
    const secondPos = { x: center, y: center - diamondSize };
    const thirdPos = { x: center - diamondSize, y: center };

    const baseColor = theme.colors.surface;
    const baseBorder = '#374151';
    const runnerColor = theme.colors.primary;
    const grassColor = '#22c55e';
    const dirtColor = '#d4a76a';

    const handleBasePress = (base: 'first' | 'second' | 'third' | 'home') => {
        if (onBasePress) {
            onBasePress(base);
        }
    };

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Outfield grass */}
                <Circle cx={center} cy={center} r={size * 0.45} fill={grassColor} opacity={0.3} />

                {/* Infield dirt */}
                <Path
                    d={`M ${homePos.x} ${homePos.y}
                        L ${firstPos.x} ${firstPos.y}
                        L ${secondPos.x} ${secondPos.y}
                        L ${thirdPos.x} ${thirdPos.y} Z`}
                    fill={dirtColor}
                    opacity={0.3}
                />

                {/* Base paths */}
                <Line
                    x1={homePos.x}
                    y1={homePos.y}
                    x2={firstPos.x}
                    y2={firstPos.y}
                    stroke={baseBorder}
                    strokeWidth={2}
                    opacity={0.5}
                />
                <Line
                    x1={firstPos.x}
                    y1={firstPos.y}
                    x2={secondPos.x}
                    y2={secondPos.y}
                    stroke={baseBorder}
                    strokeWidth={2}
                    opacity={0.5}
                />
                <Line
                    x1={secondPos.x}
                    y1={secondPos.y}
                    x2={thirdPos.x}
                    y2={thirdPos.y}
                    stroke={baseBorder}
                    strokeWidth={2}
                    opacity={0.5}
                />
                <Line
                    x1={thirdPos.x}
                    y1={thirdPos.y}
                    x2={homePos.x}
                    y2={homePos.y}
                    stroke={baseBorder}
                    strokeWidth={2}
                    opacity={0.5}
                />

                {/* Home plate */}
                <G onPress={() => handleBasePress('home')}>
                    <Path
                        d={`M ${homePos.x} ${homePos.y - baseSize * 0.5}
                            L ${homePos.x + baseSize * 0.6} ${homePos.y}
                            L ${homePos.x + baseSize * 0.6} ${homePos.y + baseSize * 0.3}
                            L ${homePos.x - baseSize * 0.6} ${homePos.y + baseSize * 0.3}
                            L ${homePos.x - baseSize * 0.6} ${homePos.y}
                            Z`}
                        fill={baseColor}
                        stroke={baseBorder}
                        strokeWidth={2}
                    />
                </G>

                {/* First base */}
                <G onPress={() => handleBasePress('first')}>
                    <Rect
                        x={firstPos.x - baseSize / 2}
                        y={firstPos.y - baseSize / 2}
                        width={baseSize}
                        height={baseSize}
                        fill={runners.first ? runnerColor : baseColor}
                        stroke={baseBorder}
                        strokeWidth={2}
                        transform={`rotate(45, ${firstPos.x}, ${firstPos.y})`}
                    />
                </G>

                {/* Second base */}
                <G onPress={() => handleBasePress('second')}>
                    <Rect
                        x={secondPos.x - baseSize / 2}
                        y={secondPos.y - baseSize / 2}
                        width={baseSize}
                        height={baseSize}
                        fill={runners.second ? runnerColor : baseColor}
                        stroke={baseBorder}
                        strokeWidth={2}
                        transform={`rotate(45, ${secondPos.x}, ${secondPos.y})`}
                    />
                </G>

                {/* Third base */}
                <G onPress={() => handleBasePress('third')}>
                    <Rect
                        x={thirdPos.x - baseSize / 2}
                        y={thirdPos.y - baseSize / 2}
                        width={baseSize}
                        height={baseSize}
                        fill={runners.third ? runnerColor : baseColor}
                        stroke={baseBorder}
                        strokeWidth={2}
                        transform={`rotate(45, ${thirdPos.x}, ${thirdPos.y})`}
                    />
                </G>

                {/* Pitcher's mound */}
                <Circle cx={center} cy={center} r={baseSize * 0.5} fill={dirtColor} />
            </Svg>

            {/* Outs indicator */}
            {showLabels && (
                <View style={styles.outsContainer}>
                    <Text variant="labelSmall" style={styles.outsLabel}>
                        OUTS
                    </Text>
                    <View style={styles.outsRow}>
                        {[0, 1, 2].map((i) => (
                            <View key={i} style={[styles.outDot, i < outs && styles.outDotActive]} />
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    outsContainer: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        alignItems: 'center',
    },
    outsLabel: {
        color: '#6b7280',
        fontSize: 10,
        marginBottom: 4,
    },
    outsRow: {
        flexDirection: 'row',
        gap: 4,
    },
    outDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#e5e7eb',
        borderWidth: 1,
        borderColor: '#9ca3af',
    },
    outDotActive: {
        backgroundColor: '#fbbf24',
        borderColor: '#f59e0b',
    },
});

export default BaseballDiamond;
