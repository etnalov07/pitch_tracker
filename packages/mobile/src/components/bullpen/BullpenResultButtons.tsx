import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import * as Haptics from '../../utils/haptics';
import { BullpenPitchResult } from '@pitch-tracker/shared';

interface BullpenResultButtonsProps {
    selectedResult: BullpenPitchResult | null;
    onSelect: (result: BullpenPitchResult) => void;
    disabled?: boolean;
    compact?: boolean;
}

const RESULTS: { value: BullpenPitchResult; label: string; shortLabel: string; color: string }[] = [
    { value: 'ball', label: 'Ball', shortLabel: 'Ball', color: '#6b7280' },
    { value: 'called_strike', label: 'Called Strike', shortLabel: 'Called', color: '#22c55e' },
    { value: 'swinging_strike', label: 'Swinging Strike', shortLabel: 'Swing', color: '#ef4444' },
    { value: 'foul', label: 'Foul', shortLabel: 'Foul', color: '#eab308' },
];

const BullpenResultButtons: React.FC<BullpenResultButtonsProps> = ({
    selectedResult,
    onSelect,
    disabled = false,
    compact = false,
}) => {
    const handleSelect = (result: BullpenPitchResult) => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(result);
    };

    return (
        <View style={styles.container}>
            {RESULTS.map(({ value, label, shortLabel, color }) => {
                const isSelected = selectedResult === value;
                return (
                    <Pressable
                        key={value}
                        style={[
                            styles.button,
                            compact && styles.buttonCompact,
                            { backgroundColor: color },
                            isSelected && styles.buttonSelected,
                            disabled && styles.buttonDisabled,
                        ]}
                        onPress={() => handleSelect(value)}
                        disabled={disabled}
                    >
                        <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>
                            {compact ? shortLabel : label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 6,
    },
    button: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    buttonCompact: {
        paddingVertical: 7,
    },
    buttonSelected: {
        borderColor: '#ffffff',
        transform: [{ scale: 1.02 }],
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    },
    buttonTextCompact: {
        fontSize: 11,
    },
});

export default BullpenResultButtons;
