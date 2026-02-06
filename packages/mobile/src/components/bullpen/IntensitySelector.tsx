import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import * as Haptics from '../../utils/haptics';
import { BullpenIntensity } from '@pitch-tracker/shared';

interface IntensitySelectorProps {
    selected: BullpenIntensity;
    onSelect: (intensity: BullpenIntensity) => void;
    disabled?: boolean;
}

const INTENSITIES: { value: BullpenIntensity; label: string; effort: string; color: string; bgColor: string }[] = [
    { value: 'low', label: 'Low', effort: '60-70%', color: '#16a34a', bgColor: '#dcfce7' },
    { value: 'medium', label: 'Medium', effort: '75-85%', color: '#ca8a04', bgColor: '#fef9c3' },
    { value: 'high', label: 'High', effort: '90-100%', color: '#dc2626', bgColor: '#fee2e2' },
];

const IntensitySelector: React.FC<IntensitySelectorProps> = ({ selected, onSelect, disabled = false }) => {
    const handleSelect = (intensity: BullpenIntensity) => {
        if (disabled) return;
        Haptics.selectionAsync();
        onSelect(intensity);
    };

    return (
        <View style={styles.container}>
            <Text variant="labelMedium" style={styles.label}>
                Intensity
            </Text>
            <View style={styles.row}>
                {INTENSITIES.map(({ value, label, effort, color, bgColor }) => {
                    const isSelected = selected === value;
                    return (
                        <Pressable
                            key={value}
                            style={[
                                styles.button,
                                { backgroundColor: isSelected ? bgColor : '#f3f4f6' },
                                isSelected && { borderColor: color },
                            ]}
                            onPress={() => handleSelect(value)}
                            disabled={disabled}
                        >
                            <Text style={[styles.buttonLabel, isSelected && { color }]}>{label}</Text>
                            <Text style={[styles.effortText, isSelected && { color }]}>{effort}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    label: {
        marginBottom: 8,
        color: '#374151',
    },
    row: {
        flexDirection: 'row',
        gap: 8,
    },
    button: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    buttonLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    effortText: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 2,
    },
});

export default IntensitySelector;
