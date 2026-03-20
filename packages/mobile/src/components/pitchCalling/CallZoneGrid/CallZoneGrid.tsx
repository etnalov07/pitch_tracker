import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import * as Haptics from '../../../utils/haptics';
import { PitchCallZone } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface CallZoneGridProps {
    selectedZone: PitchCallZone | null;
    onSelect: (zone: PitchCallZone) => void;
    disabled?: boolean;
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

// Waste pitch zones surrounding the strike zone
const WASTE_ZONES: {
    zone: PitchCallZone;
    label: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'corner';
    style: object;
}[] = [
    { zone: 'W-high-in', label: 'HI', position: 'corner', style: { top: 0, left: 0 } },
    { zone: 'W-high', label: 'HIGH', position: 'top', style: { top: 0, left: '25%', right: '25%' } },
    { zone: 'W-high-out', label: 'HO', position: 'corner', style: { top: 0, right: 0 } },
    { zone: 'W-in', label: 'IN', position: 'left', style: { top: '25%', bottom: '25%', left: 0 } },
    { zone: 'W-out', label: 'OUT', position: 'right', style: { top: '25%', bottom: '25%', right: 0 } },
    { zone: 'W-low-in', label: 'LI', position: 'corner', style: { bottom: 0, left: 0 } },
    { zone: 'W-low', label: 'LOW', position: 'bottom', style: { bottom: 0, left: '25%', right: '25%' } },
    { zone: 'W-low-out', label: 'LO', position: 'corner', style: { bottom: 0, right: 0 } },
];

const ZONE_SHORT_LABELS: Record<string, string> = {
    '0-0': '',
    '0-1': '',
    '0-2': '',
    '1-0': '',
    '1-1': '',
    '1-2': '',
    '2-0': '',
    '2-1': '',
    '2-2': '',
};

const CallZoneGrid: React.FC<CallZoneGridProps> = ({ selectedZone, onSelect, disabled = false }) => {
    const handleSelect = (zone: PitchCallZone) => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSelect(zone);
    };

    const isWaste = (zone: PitchCallZone) => zone.startsWith('W-');
    const isSelected = (zone: PitchCallZone) => selectedZone === zone;

    return (
        <View style={styles.container}>
            <Text style={styles.label}>TARGET ZONE</Text>
            <View style={styles.outerGrid}>
                {/* Waste zones as border buttons */}
                {WASTE_ZONES.map(({ zone, label }) => (
                    <Pressable
                        key={zone}
                        style={[styles.wasteButton, isSelected(zone) && styles.wasteButtonSelected, disabled && styles.disabled]}
                        onPress={() => handleSelect(zone)}
                        disabled={disabled}
                    >
                        <Text style={[styles.wasteText, isSelected(zone) && styles.wasteTextSelected]}>{label}</Text>
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
                            {isSelected(zone) && <View style={styles.zoneDot} />}
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Waste zone row below */}
            <View style={styles.wasteRow}>
                {WASTE_ZONES.map(({ zone, label }) => (
                    <Pressable
                        key={zone}
                        style={[styles.wasteChip, isSelected(zone) && styles.wasteChipSelected, disabled && styles.disabled]}
                        onPress={() => handleSelect(zone)}
                        disabled={disabled}
                    >
                        <Text style={[styles.wasteChipText, isSelected(zone) && styles.wasteChipTextSelected]}>{label}</Text>
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
