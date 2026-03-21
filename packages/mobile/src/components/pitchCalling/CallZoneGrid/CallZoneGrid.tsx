import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import * as Haptics from '../../../utils/haptics';
import { PitchCallZone } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface CallZoneGridProps {
    selectedZone: PitchCallZone | null;
    onSelect: (zone: PitchCallZone) => void;
    disabled?: boolean;
    batterSide?: 'R' | 'L' | 'S' | null;
    pitcherThrows?: 'R' | 'L' | null;
}

// 3x3 strike zone grid
const STRIKE_ZONES: { zone: PitchCallZone; row: number; col: number }[] = [
    { zone: '0-0', row: 0, col: 0 },
    { zone: '0-1', row: 0, col: 1 },
    { zone: '0-2', row: 0, col: 2 },
    { zone: '1-0', row: 1, col: 0 },
    { zone: '1-1', row: 1, col: 1 },
    { zone: '1-2', row: 1, col: 2 },
    { zone: '2-0', row: 2, col: 0 },
    { zone: '2-1', row: 2, col: 1 },
    { zone: '2-2', row: 2, col: 2 },
];

// Waste pitch zone positions (labels are computed based on batter handedness)
const WASTE_ZONES_BASE: {
    zone: PitchCallZone;
    position: 'top' | 'bottom' | 'left' | 'right' | 'corner';
    style: object;
}[] = [
    { zone: 'W-high-in', position: 'corner', style: { top: 0, left: 0 } },
    { zone: 'W-high', position: 'top', style: { top: 0, left: '25%', right: '25%' } },
    { zone: 'W-high-out', position: 'corner', style: { top: 0, right: 0 } },
    { zone: 'W-in', position: 'left', style: { top: '25%', bottom: '25%', left: 0 } },
    { zone: 'W-out', position: 'right', style: { top: '25%', bottom: '25%', right: 0 } },
    { zone: 'W-low-in', position: 'corner', style: { bottom: 0, left: 0 } },
    { zone: 'W-low', position: 'bottom', style: { bottom: 0, left: '25%', right: '25%' } },
    { zone: 'W-low-out', position: 'corner', style: { bottom: 0, right: 0 } },
];

// Labels flip inside/outside based on batter handedness
// From pitcher's view: RHH stands on right, LHH stands on left
// col 0 = left side: inside for LHH, outside for RHH
// col 2 = right side: inside for RHH, outside for LHH
function getWasteLabels(effectiveSide: 'R' | 'L'): Record<PitchCallZone, string> {
    const isRHH = effectiveSide === 'R';
    return {
        'W-high-in': isRHH ? 'HO' : 'HI',
        'W-high': 'HIGH',
        'W-high-out': isRHH ? 'HI' : 'HO',
        'W-in': isRHH ? 'OUT' : 'IN',
        'W-out': isRHH ? 'IN' : 'OUT',
        'W-low-in': isRHH ? 'LO' : 'LI',
        'W-low': 'LOW',
        'W-low-out': isRHH ? 'LI' : 'LO',
    } as Record<PitchCallZone, string>;
}

function getZoneLabels(effectiveSide: 'R' | 'L'): Record<string, string> {
    const isRHH = effectiveSide === 'R';
    const i = isRHH ? 'A' : 'I';
    const a = isRHH ? 'I' : 'A';
    return {
        '0-0': `U${i}`,
        '0-1': 'UM',
        '0-2': `U${a}`,
        '1-0': `M${i}`,
        '1-1': 'MM',
        '1-2': `M${a}`,
        '2-0': `D${i}`,
        '2-1': 'DM',
        '2-2': `D${a}`,
    };
}

const CallZoneGrid: React.FC<CallZoneGridProps> = ({ selectedZone, onSelect, disabled = false, batterSide, pitcherThrows }) => {
    const handleSelect = (zone: PitchCallZone) => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSelect(zone);
    };

    const isSelected = (zone: PitchCallZone) => selectedZone === zone;

    // Compute batter-relative labels
    const effectiveSide: 'R' | 'L' = batterSide === 'S' ? (pitcherThrows === 'L' ? 'R' : 'L') : batterSide === 'L' ? 'L' : 'R';
    const wasteLabels = getWasteLabels(effectiveSide);
    const zoneLabels = getZoneLabels(effectiveSide);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>TARGET ZONE</Text>
            <View style={styles.outerGrid}>
                {/* Waste zones as border buttons */}
                {WASTE_ZONES_BASE.map(({ zone }) => (
                    <Pressable
                        key={zone}
                        style={[styles.wasteButton, isSelected(zone) && styles.wasteButtonSelected, disabled && styles.disabled]}
                        onPress={() => handleSelect(zone)}
                        disabled={disabled}
                    >
                        <Text style={[styles.wasteText, isSelected(zone) && styles.wasteTextSelected]}>{wasteLabels[zone]}</Text>
                    </Pressable>
                ))}

                {/* Strike zone 3x3 grid */}
                <View style={styles.strikeZone}>
                    {STRIKE_ZONES.map(({ zone }) => (
                        <Pressable
                            key={zone}
                            style={[styles.zoneCell, isSelected(zone) && styles.zoneCellSelected, disabled && styles.disabled]}
                            onPress={() => handleSelect(zone)}
                            disabled={disabled}
                        >
                            {isSelected(zone) ? (
                                <View style={styles.zoneDot} />
                            ) : (
                                <Text style={styles.zoneLabelText}>{zoneLabels[zone]}</Text>
                            )}
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Waste zone row below */}
            <View style={styles.wasteRow}>
                {WASTE_ZONES_BASE.map(({ zone }) => (
                    <Pressable
                        key={zone}
                        style={[styles.wasteChip, isSelected(zone) && styles.wasteChipSelected, disabled && styles.disabled]}
                        onPress={() => handleSelect(zone)}
                        disabled={disabled}
                    >
                        <Text style={[styles.wasteChipText, isSelected(zone) && styles.wasteChipTextSelected]}>
                            {wasteLabels[zone]}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
};

const ZONE_SIZE = 64;
const AMBER = '#F5A623';

const styles = StyleSheet.create({
    container: {
        marginBottom: 4,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.gray[400],
        letterSpacing: 1,
        marginBottom: 8,
    },
    outerGrid: {
        alignSelf: 'center',
        width: ZONE_SIZE * 3 + 8,
        height: ZONE_SIZE * 3 + 8,
        position: 'relative',
    },
    strikeZone: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: ZONE_SIZE * 3,
        height: ZONE_SIZE * 3,
        borderWidth: 2,
        borderColor: colors.gray[500],
        borderRadius: 4,
        alignSelf: 'center',
        overflow: 'hidden',
    },
    zoneCell: {
        width: ZONE_SIZE,
        height: ZONE_SIZE,
        borderWidth: 0.5,
        borderColor: colors.gray[600],
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary[900] + '80',
    },
    zoneCellSelected: {
        backgroundColor: AMBER + '30',
        borderColor: AMBER,
        borderWidth: 1.5,
    },
    zoneDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: AMBER,
    },
    zoneLabelText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.gray[500],
        letterSpacing: 0.5,
    },
    disabled: {
        opacity: 0.5,
    },
    // Hidden — we use the chip row instead
    wasteButton: {
        display: 'none',
    },
    wasteButtonSelected: {},
    wasteText: {},
    wasteTextSelected: {},
    // Waste pitch chip row
    wasteRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
    },
    wasteChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        backgroundColor: colors.gray[800],
        borderWidth: 1,
        borderColor: colors.gray[600],
    },
    wasteChipSelected: {
        backgroundColor: AMBER + '25',
        borderColor: AMBER,
    },
    wasteChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.gray[400],
        letterSpacing: 0.5,
    },
    wasteChipTextSelected: {
        color: AMBER,
    },
});

export default CallZoneGrid;
