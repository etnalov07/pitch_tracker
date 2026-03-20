import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import * as Haptics from '../../../utils/haptics';
import { PitchCallAbbrev } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface CallPitchTypeGridProps {
    selectedType: PitchCallAbbrev | null;
    onSelect: (type: PitchCallAbbrev) => void;
    disabled?: boolean;
}

const PITCH_TYPES: { type: PitchCallAbbrev; label: string; color: string }[] = [
    { type: 'FB', label: 'Fastball', color: '#E63946' },
    { type: 'CB', label: 'Curveball', color: '#3A86FF' },
    { type: 'CH', label: 'Changeup', color: '#2EC4B6' },
    { type: 'SL', label: 'Slider', color: '#F5A623' },
    { type: 'CT', label: 'Cutter', color: '#A855F7' },
    { type: '2S', label: '2-Seam', color: '#F97316' },
];

const CallPitchTypeGrid: React.FC<CallPitchTypeGridProps> = ({ selectedType, onSelect, disabled = false }) => {
    const handleSelect = (type: PitchCallAbbrev) => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(type);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>PITCH TYPE</Text>
            <View style={styles.grid}>
                {PITCH_TYPES.map(({ type, label, color }) => {
                    const isSelected = selectedType === type;
                    return (
                        <Pressable
                            key={type}
                            style={[
                                styles.button,
                                isSelected && { borderColor: color, backgroundColor: color + '20' },
                                disabled && styles.buttonDisabled,
                            ]}
                            onPress={() => handleSelect(type)}
                            disabled={disabled}
                        >
                            <Text style={[styles.abbrev, isSelected && { color }]}>{type}</Text>
                            <Text style={styles.pitchLabel}>{label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

export { PITCH_TYPES };

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
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    button: {
        width: '31%',
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.gray[700],
        backgroundColor: colors.gray[800],
        alignItems: 'center',
        gap: 2,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    abbrev: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.gray[100],
    },
    pitchLabel: {
        fontSize: 10,
        color: colors.gray[400],
    },
});

export default CallPitchTypeGrid;
