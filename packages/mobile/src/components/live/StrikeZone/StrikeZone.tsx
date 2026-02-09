import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Svg, { Rect, Circle, G, Text as SvgText, Line, Path, Ellipse } from 'react-native-svg';
import * as Haptics from '../../../utils/haptics';
import { Pitch } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface StrikeZoneProps {
    onLocationSelect: (x: number, y: number) => void;
    onTargetSelect?: (x: number, y: number) => void;
    onTargetClear?: () => void;
    targetLocation?: { x: number; y: number } | null;
    previousPitches?: Pitch[];
    disabled?: boolean;
    compact?: boolean;
}

const VIEWBOX_WIDTH = 300;
const VIEWBOX_HEIGHT = 280;
const ZONE_X = 85;
const ZONE_Y = 30;
const ZONE_WIDTH = 130;
const ZONE_HEIGHT = 150;

const StrikeZone: React.FC<StrikeZoneProps> = ({
    onLocationSelect,
    onTargetSelect,
    onTargetClear,
    targetLocation,
    previousPitches = [],
    disabled = false,
    compact = false,
}) => {
    const [selectedLocation, setSelectedLocation] = useState<{ x: number; y: number } | null>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // Reset selectedLocation when a new pitch is logged
    useEffect(() => {
        setSelectedLocation(null);
    }, [previousPitches.length]);

    const handleLayout = (event: any) => {
        const { width, height } = event.nativeEvent.layout;
        setContainerSize({ width, height });
    };

    const getCoordinatesFromTouch = (locationX: number, locationY: number) => {
        if (containerSize.width === 0) return null;

        const scaleX = containerSize.width / VIEWBOX_WIDTH;
        const scaleY = containerSize.height / VIEWBOX_HEIGHT;

        const svgX = locationX / scaleX;
        const svgY = locationY / scaleY;

        // Convert to 0-1 coordinates within strike zone
        const zoneX = (svgX - ZONE_X) / ZONE_WIDTH;
        const zoneY = (svgY - ZONE_Y) / ZONE_HEIGHT;

        return { zoneX, zoneY };
    };

    const handlePress = (event: any) => {
        if (disabled) return;

        const { locationX, locationY } = event.nativeEvent;
        const coords = getCoordinatesFromTouch(locationX, locationY);
        if (!coords) return;

        const { zoneX, zoneY } = coords;

        // Allow touches in expanded area (-0.3 to 1.3)
        if (zoneX >= -0.3 && zoneX <= 1.3 && zoneY >= -0.3 && zoneY <= 1.3) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // If we have target support and no target is set yet, set the target
            if (onTargetSelect && !targetLocation && !selectedLocation) {
                onTargetSelect(zoneX, zoneY);
            } else {
                setSelectedLocation({ x: zoneX, y: zoneY });
                onLocationSelect(zoneX, zoneY);
            }
        }
    };

    const handleLongPress = () => {
        if (targetLocation && onTargetClear) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onTargetClear();
        }
    };

    const getPitchColor = (result?: string): string => {
        switch (result) {
            case 'ball':
                return colors.gray[400];
            case 'called_strike':
                return colors.green[500];
            case 'swinging_strike':
                return colors.red[500];
            case 'foul':
                return colors.yellow[500];
            case 'in_play':
                return colors.primary[600];
            default:
                return colors.gray[500];
        }
    };

    // Convert 0-1 coordinates to SVG coordinates
    const toSvgCoords = (x: number, y: number) => ({
        x: ZONE_X + x * ZONE_WIDTH,
        y: ZONE_Y + y * ZONE_HEIGHT,
    });

    const TARGET_RADIUS = 20;
    const PITCH_RADIUS = 14;

    return (
        <View style={compact ? compactStyles.container : styles.container}>
            {!compact && <Text style={styles.title}>Strike Zone</Text>}
            <Pressable
                onPress={handlePress}
                onLongPress={handleLongPress}
                style={compact ? compactStyles.zoneWrapper : styles.zoneWrapper}
                disabled={disabled}
            >
                <View onLayout={handleLayout} style={styles.svgContainer}>
                    <Svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} style={styles.svg}>
                        {/* Background */}
                        <Rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#f5f5f0" />

                        {/* Home plate - 3D perspective view */}
                        <G transform="translate(150, 210)">
                            <Ellipse cx="0" cy="35" rx="85" ry="20" fill="#e0e0d8" />
                            <Path d="M -70 0 L 70 0 L 70 25 L 0 55 L -70 25 Z" fill="#4db6ac" stroke="#26a69a" strokeWidth="2" />
                            <Path d="M -60 5 L 60 5 L 60 22 L 0 48 L -60 22 Z" fill="#80cbc4" stroke="#4db6ac" strokeWidth="1" />
                            <Path d="M -50 10 L 50 10 L 50 18 L 0 42 L -50 18 Z" fill="white" stroke="#b0bec5" strokeWidth="1" />
                        </G>

                        {/* Strike zone - 3x3 grid */}
                        <G transform={`translate(${ZONE_X}, ${ZONE_Y})`}>
                            <Rect x="0" y="0" width={ZONE_WIDTH} height={ZONE_HEIGHT} fill="rgba(255,255,255,0.85)" />

                            {/* Grid cells */}
                            {[0, 1, 2].map((row) =>
                                [0, 1, 2].map((col) => (
                                    <Rect
                                        key={`cell-${row}-${col}`}
                                        x={col * (ZONE_WIDTH / 3)}
                                        y={row * (ZONE_HEIGHT / 3)}
                                        width={ZONE_WIDTH / 3}
                                        height={ZONE_HEIGHT / 3}
                                        fill="rgba(230, 230, 225, 0.6)"
                                        stroke="#a0a0a0"
                                        strokeWidth="1"
                                    />
                                ))
                            )}

                            {/* Outer border */}
                            <Rect
                                x="0"
                                y="0"
                                width={ZONE_WIDTH}
                                height={ZONE_HEIGHT}
                                fill="none"
                                stroke="#808080"
                                strokeWidth="2"
                            />
                        </G>

                        {/* Previous pitches */}
                        {previousPitches.map((pitch, idx) => {
                            if (pitch.location_x === undefined || pitch.location_y === undefined) return null;
                            const coords = toSvgCoords(pitch.location_x, pitch.location_y);
                            return (
                                <G key={pitch.id || idx}>
                                    <Circle
                                        cx={coords.x}
                                        cy={coords.y}
                                        r={PITCH_RADIUS}
                                        fill={getPitchColor(pitch.pitch_result)}
                                        stroke="white"
                                        strokeWidth="2"
                                    />
                                    <SvgText
                                        x={coords.x}
                                        y={coords.y + 4}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fill="white"
                                        fontWeight="bold"
                                    >
                                        {idx + 1}
                                    </SvgText>
                                </G>
                            );
                        })}

                        {/* Current target location */}
                        {targetLocation && (
                            <G>
                                <Circle
                                    cx={toSvgCoords(targetLocation.x, targetLocation.y).x}
                                    cy={toSvgCoords(targetLocation.x, targetLocation.y).y}
                                    r={TARGET_RADIUS}
                                    fill="none"
                                    stroke={colors.primary[500]}
                                    strokeWidth="3"
                                    strokeDasharray="6,3"
                                />
                                <Line
                                    x1={toSvgCoords(targetLocation.x, targetLocation.y).x - 10}
                                    y1={toSvgCoords(targetLocation.x, targetLocation.y).y}
                                    x2={toSvgCoords(targetLocation.x, targetLocation.y).x + 10}
                                    y2={toSvgCoords(targetLocation.x, targetLocation.y).y}
                                    stroke={colors.primary[500]}
                                    strokeWidth="2"
                                />
                                <Line
                                    x1={toSvgCoords(targetLocation.x, targetLocation.y).x}
                                    y1={toSvgCoords(targetLocation.x, targetLocation.y).y - 10}
                                    x2={toSvgCoords(targetLocation.x, targetLocation.y).x}
                                    y2={toSvgCoords(targetLocation.x, targetLocation.y).y + 10}
                                    stroke={colors.primary[500]}
                                    strokeWidth="2"
                                />
                            </G>
                        )}

                        {/* Selected location indicator */}
                        {selectedLocation && (
                            <G>
                                <Circle
                                    cx={toSvgCoords(selectedLocation.x, selectedLocation.y).x}
                                    cy={toSvgCoords(selectedLocation.x, selectedLocation.y).y}
                                    r="18"
                                    fill={colors.red[600]}
                                    stroke="white"
                                    strokeWidth="3"
                                />
                                <SvgText
                                    x={toSvgCoords(selectedLocation.x, selectedLocation.y).x}
                                    y={toSvgCoords(selectedLocation.x, selectedLocation.y).y + 6}
                                    textAnchor="middle"
                                    fontSize="18"
                                    fill="white"
                                    fontWeight="bold"
                                >
                                    ×
                                </SvgText>
                            </G>
                        )}
                    </Svg>
                </View>
            </Pressable>

            {/* Clear target button */}
            {targetLocation && onTargetClear && (
                <Pressable
                    style={styles.clearButton}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onTargetClear();
                    }}
                >
                    <Text style={styles.clearButtonText}>Clear Target</Text>
                </Pressable>
            )}

            {/* Legend - only in non-compact mode */}
            {!compact && (
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.green[500] }]} />
                        <Text style={styles.legendText}>Strike</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.red[500] }]} />
                        <Text style={styles.legendText}>Swing</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.gray[400] }]} />
                        <Text style={styles.legendText}>Ball</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.yellow[500] }]} />
                        <Text style={styles.legendText}>Foul</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.primary[600] }]} />
                        <Text style={styles.legendText}>In Play</Text>
                    </View>
                </View>
            )}

            {/* Instructions - only in non-compact mode */}
            {!compact && (
                <Text style={styles.instructions}>
                    {onTargetSelect
                        ? targetLocation
                            ? 'Tap to set pitch location (long press to clear target)'
                            : 'Tap to set target location (optional)'
                        : 'Tap on the zone to select pitch location'}
                </Text>
            )}
        </View>
    );
};

const compactStyles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 4,
    },
    zoneWrapper: {
        width: '100%',
        maxHeight: 260,
        aspectRatio: 300 / 280,
        alignSelf: 'center',
    },
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 12,
        color: colors.gray[800],
    },
    zoneWrapper: {
        width: '100%',
        aspectRatio: 300 / 280,
    },
    svgContainer: {
        flex: 1,
    },
    svg: {
        width: '100%',
        height: '100%',
    },
    clearButton: {
        alignSelf: 'center',
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.gray[100],
        borderRadius: 8,
    },
    clearButtonText: {
        color: colors.primary[600],
        fontSize: 14,
        fontWeight: '500',
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 12,
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 12,
        color: colors.gray[600],
    },
    instructions: {
        textAlign: 'center',
        fontSize: 12,
        color: colors.gray[500],
        marginTop: 8,
    },
});

export default StrikeZone;
