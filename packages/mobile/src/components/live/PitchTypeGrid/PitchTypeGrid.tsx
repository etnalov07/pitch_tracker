import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import * as Haptics from '../../../utils/haptics';
import { PitchType } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface PitchTypeGridProps {
    selectedType: PitchType | null;
    onSelect: (type: PitchType) => void;
    availablePitchTypes?: PitchType[];
    disabled?: boolean;
    compact?: boolean;
}

const ALL_PITCH_TYPES: { type: PitchType; label: string; abbrev: string }[] = [
    { type: 'fastball', label: 'Fastball', abbrev: 'FB' },
    { type: '4-seam', label: '4-Seam', abbrev: '4S' },
    { type: '2-seam', label: '2-Seam', abbrev: '2S' },
    { type: 'cutter', label: 'Cutter', abbrev: 'CT' },
    { type: 'sinker', label: 'Sinker', abbrev: 'SI' },
    { type: 'slider', label: 'Slider', abbrev: 'SL' },
    { type: 'curveball', label: 'Curveball', abbrev: 'CB' },
    { type: 'changeup', label: 'Changeup', abbrev: 'CH' },
    { type: 'splitter', label: 'Splitter', abbrev: 'SP' },
    { type: 'knuckleball', label: 'Knuckleball', abbrev: 'KN' },
];

const PitchTypeGrid: React.FC<PitchTypeGridProps> = ({
    selectedType,
    onSelect,
    availablePitchTypes,
    disabled = false,
    compact = false,
}) => {
    // Filter to only available pitch types if provided, otherwise show all
    const pitchTypes = availablePitchTypes ? ALL_PITCH_TYPES.filter((p) => availablePitchTypes.includes(p.type)) : ALL_PITCH_TYPES;

    const handleSelect = (type: PitchType) => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(type);
    };

    if (compact) {
        return (
            <View style={compactStyles.container}>
                <View style={compactStyles.grid}>
                    {pitchTypes.map(({ type, abbrev }) => {
                        const isSelected = selectedType === type;
                        return (
                            <Pressable
                                key={type}
                                style={[
                                    compactStyles.button,
                                    isSelected && compactStyles.buttonSelected,
                                    disabled && compactStyles.buttonDisabled,
                                ]}
                                onPress={() => handleSelect(type)}
                                disabled={disabled}
                            >
                                <Text style={[compactStyles.abbrev, isSelected && compactStyles.textSelected]}>{abbrev}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Pitch Type</Text>
            <View style={styles.grid}>
                {pitchTypes.map(({ type, label, abbrev }) => {
                    const isSelected = selectedType === type;
                    return (
                        <Pressable
                            key={type}
                            style={[styles.button, isSelected && styles.buttonSelected, disabled && styles.buttonDisabled]}
                            onPress={() => handleSelect(type)}
                            disabled={disabled}
                        >
                            <Text style={[styles.abbrev, isSelected && styles.textSelected]}>{abbrev}</Text>
                            <Text style={[styles.label, isSelected && styles.textSelected]}>{label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

const compactStyles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'center',
    },
    button: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: colors.gray[100],
        borderWidth: 2,
        borderColor: 'transparent',
    },
    buttonSelected: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[700],
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    abbrev: {
        fontSize: 13,
        fontWeight: 'bold',
        color: colors.gray[700],
    },
    textSelected: {
        color: '#ffffff',
    },
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: colors.gray[800],
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    button: {
        minWidth: 70,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: colors.gray[100],
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    buttonSelected: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[700],
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    abbrev: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.gray[700],
    },
    label: {
        fontSize: 11,
        color: colors.gray[500],
        marginTop: 2,
    },
    textSelected: {
        color: '#ffffff',
    },
});

export default PitchTypeGrid;
