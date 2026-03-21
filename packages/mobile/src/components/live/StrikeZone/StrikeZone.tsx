import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Svg, { Rect, Circle, G, Text as SvgText, Line, Path, Ellipse } from 'react-native-svg';
import * as Haptics from '../../../utils/haptics';
import { Pitch, PitchCallZone, PITCH_CALL_ZONE_COORDS } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';
import BatterSilhouette from './BatterSilhouette';

interface StrikeZoneProps {
    onLocationSelect: (x: number, y: number) => void;
    onTargetZoneSelect?: (zone: PitchCallZone) => void;
    onTargetClear?: () => void;
    targetZone?: PitchCallZone | null;
    previousPitches?: Pitch[];
    disabled?: boolean;
    compact?: boolean;
    batterSide?: 'R' | 'L' | 'S' | null;
    pitcherThrows?: 'R' | 'L' | null;
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

// Zone IDs are semantic: '0-0' = "Up and In"
// For LHH, columns flip so inside renders on the batter's side
function getStrikeZoneGrid(effectiveSide: 'R' | 'L'): { zone: PitchCallZone; row: number; col: number }[] {
    const flip = effectiveSide === 'L';
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

// Waste zone positions — swap left/right for LHH
// Strike zone is at (113, 120) with width 75, height 110
function getWasteZones(effectiveSide: 'R' | 'L') {
    const flip = effectiveSide === 'L';
    const L = { x: 81, w: 32 };
    const R = { x: 188, w: 32 };
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

// Flip zone center x-coordinate for LHH so target crosshair renders on correct side
function getZoneCoords(zone: PitchCallZone, effectiveSide: 'R' | 'L'): { x: number; y: number } {
    const coords = PITCH_CALL_ZONE_COORDS[zone];
    if (effectiveSide === 'L') {
        return { x: 1 - coords.x, y: coords.y };
    }
    return coords;
}

const VIEWBOX_WIDTH = 300;
const VIEWBOX_HEIGHT = 300;
const ZONE_X = 113;
const ZONE_Y = 120;
const ZONE_WIDTH = 75;
const ZONE_HEIGHT = 110;
const AMBER = '#F5A623';

const StrikeZone: React.FC<StrikeZoneProps> = ({
    onLocationSelect,
    onTargetZoneSelect,
    onTargetClear,
    targetZone,
    previousPitches = [],
    disabled = false,
    compact = false,
    batterSide,
    pitcherThrows,
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
        const zoneX = (svgX - ZONE_X) / ZONE_WIDTH;
        const zoneY = (svgY - ZONE_Y) / ZONE_HEIGHT;
        return { zoneX, zoneY, svgX, svgY };
    };

    const effectiveSide: 'R' | 'L' = batterSide === 'S' ? (pitcherThrows === 'L' ? 'R' : 'L') : batterSide === 'L' ? 'L' : 'R';
    const batterX = effectiveSide === 'R' ? 245 : 55;
    const batterScaleX = effectiveSide === 'R' ? 1 : -1;
    const strikeZoneGrid = getStrikeZoneGrid(effectiveSide);
    const wasteZones = getWasteZones(effectiveSide);
    const cellW = ZONE_WIDTH / 3;
    const cellH = ZONE_HEIGHT / 3;

    const isTargetMode = onTargetZoneSelect && !targetZone;

    // Find which zone or waste zone was tapped
    const findTappedZone = useCallback(
        (svgX: number, svgY: number): PitchCallZone | null => {
            // Check strike zone cells
            for (const { zone, row, col } of strikeZoneGrid) {
                const cellX = ZONE_X + col * cellW;
                const cellY = ZONE_Y + row * cellH;
                if (svgX >= cellX && svgX <= cellX + cellW && svgY >= cellY && svgY <= cellY + cellH) {
                    return zone;
                }
            }
            // Check waste zones
            for (const { zone, x, y, w, h } of wasteZones) {
                if (svgX >= x && svgX <= x + w && svgY >= y && svgY <= y + h) {
                    return zone;
                }
            }
            return null;
        },
        [strikeZoneGrid, wasteZones, cellW, cellH]
    );

    const handlePress = (event: any) => {
        if (disabled) return;
        const { locationX, locationY } = event.nativeEvent;
        const coords = getCoordinatesFromTouch(locationX, locationY);
        if (!coords) return;

        const { zoneX, zoneY, svgX, svgY } = coords;

        // Target mode: tapping sets the target zone
        if (isTargetMode) {
            const tappedZone = findTappedZone(svgX, svgY);
            if (tappedZone && onTargetZoneSelect) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onTargetZoneSelect(tappedZone);
            }
            return;
        }

        // Pitch location mode (target already set or no target support)
        if (zoneX >= -0.3 && zoneX <= 1.3 && zoneY >= -0.3 && zoneY <= 1.3) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedLocation({ x: zoneX, y: zoneY });
            onLocationSelect(zoneX, zoneY);
        }
    };

    const handleLongPress = () => {
        if (targetZone && onTargetClear) {
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

    const PITCH_RADIUS = 11;

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

                        {/* Home plate - reversed (point facing pitcher/up) */}
                        <G transform="translate(150, 272)">
                            <Ellipse cx="0" cy="15" rx="45" ry="11" fill="#e0e0d8" />
                            <Path d="M -38 22 L 38 22 L 38 10 L 0 -5 L -38 10 Z" fill="#4db6ac" stroke="#26a69a" strokeWidth="2" />
                            <Path d="M -32 20 L 32 20 L 32 11 L 0 -2 L -32 11 Z" fill="#80cbc4" stroke="#4db6ac" strokeWidth="1" />
                            <Path d="M -26 17 L 26 17 L 26 12 L 0 1 L -26 12 Z" fill="white" stroke="#b0bec5" strokeWidth="1" />
                        </G>

                        {/* Batter silhouette */}
                        {batterSide && (
                            <G transform={`translate(${batterX}, 40) scale(${batterScaleX * 1.61}, 1.61) translate(-36, 0)`}>
                                <BatterSilhouette />
                            </G>
                        )}

                        {/* Waste zone areas */}
                        {onTargetZoneSelect &&
                            wasteZones.map(({ zone, x, y, w, h, label }) => {
                                const isSelected = targetZone === zone;
                                return (
                                    <G key={zone}>
                                        <Rect
                                            x={x}
                                            y={y}
                                            width={w}
                                            height={h}
                                            fill={
                                                isSelected
                                                    ? AMBER + '40'
                                                    : isTargetMode
                                                      ? 'rgba(200, 200, 195, 0.3)'
                                                      : 'transparent'
                                            }
                                            stroke={isSelected ? AMBER : isTargetMode ? '#b0b0a8' : 'none'}
                                            strokeWidth={isSelected ? 2 : 1}
                                            strokeDasharray={isSelected ? '' : '3,2'}
                                            rx="3"
                                        />
                                        <SvgText
                                            x={x + w / 2}
                                            y={y + h / 2 + 4}
                                            textAnchor="middle"
                                            fontSize="9"
                                            fontWeight="600"
                                            fill={isSelected ? AMBER : isTargetMode ? '#888' : 'transparent'}
                                        >
                                            {label}
                                        </SvgText>
                                    </G>
                                );
                            })}

                        {/* Strike zone - 3x3 grid */}
                        <G transform={`translate(${ZONE_X}, ${ZONE_Y})`}>
                            <Rect x="0" y="0" width={ZONE_WIDTH} height={ZONE_HEIGHT} fill="rgba(255,255,255,0.85)" />

                            {/* Grid cells */}
                            {strikeZoneGrid.map(({ zone, row, col }) => {
                                const isSelected = targetZone === zone;
                                return (
                                    <G key={zone}>
                                        <Rect
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
                                            <SvgText
                                                x={col * cellW + cellW / 2}
                                                y={row * cellH + cellH / 2 + 4}
                                                textAnchor="middle"
                                                fontSize="10"
                                                fontWeight="700"
                                                fill={isSelected ? AMBER : '#999'}
                                            >
                                                {ZONE_LABELS[zone]}
                                            </SvgText>
                                        )}
                                    </G>
                                );
                            })}

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
                                        fontSize="9"
                                        fill="white"
                                        fontWeight="bold"
                                    >
                                        {idx + 1}
                                    </SvgText>
                                </G>
                            );
                        })}

                        {/* Target zone indicator (amber dashed circle at zone center) */}
                        {targetZone &&
                            (() => {
                                const zc = getZoneCoords(targetZone, effectiveSide);
                                const tc = toSvgCoords(zc.x, zc.y);
                                return (
                                    <G>
                                        <Circle
                                            cx={tc.x}
                                            cy={tc.y}
                                            r="12"
                                            fill="none"
                                            stroke={AMBER}
                                            strokeWidth="3"
                                            strokeDasharray="6,3"
                                        />
                                        <Line x1={tc.x - 6} y1={tc.y} x2={tc.x + 6} y2={tc.y} stroke={AMBER} strokeWidth="2" />
                                        <Line x1={tc.x} y1={tc.y - 6} x2={tc.x} y2={tc.y + 6} stroke={AMBER} strokeWidth="2" />
                                    </G>
                                );
                            })()}

                        {/* Selected pitch location indicator */}
                        {selectedLocation && (
                            <G>
                                <Circle
                                    cx={toSvgCoords(selectedLocation.x, selectedLocation.y).x}
                                    cy={toSvgCoords(selectedLocation.x, selectedLocation.y).y}
                                    r="12"
                                    fill={colors.red[600]}
                                    stroke="white"
                                    strokeWidth="3"
                                />
                                <SvgText
                                    x={toSvgCoords(selectedLocation.x, selectedLocation.y).x}
                                    y={toSvgCoords(selectedLocation.x, selectedLocation.y).y + 6}
                                    textAnchor="middle"
                                    fontSize="12"
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
            {targetZone && onTargetClear && (
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
                    {onTargetZoneSelect
                        ? targetZone
                            ? 'Tap to set pitch location (long press to clear target)'
                            : 'Tap a zone to set target'
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
        aspectRatio: 300 / 300,
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
        aspectRatio: 300 / 300,
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
