import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PitchResult } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface ResultButtonsProps {
    selectedResult: PitchResult | null;
    onSelect: (result: PitchResult) => void;
    disabled?: boolean;
    compact?: boolean;
}

const RESULTS: { type: PitchResult; label: string; compactLabel: string; color: string; textColor: string }[] = [
    { type: 'ball', label: 'Ball', compactLabel: 'Ball', color: colors.gray[300], textColor: colors.gray[800] },
    { type: 'called_strike', label: 'Called\nStrike', compactLabel: 'Called', color: colors.green[500], textColor: '#ffffff' },
    { type: 'swinging_strike', label: 'Swinging\nStrike', compactLabel: 'Swing', color: colors.red[500], textColor: '#ffffff' },
    { type: 'foul', label: 'Foul', compactLabel: 'Foul', color: colors.yellow[500], textColor: colors.gray[800] },
    { type: 'in_play', label: 'In Play', compactLabel: 'In Play', color: colors.primary[600], textColor: '#ffffff' },
];

const ResultButtons: React.FC<ResultButtonsProps> = ({
    selectedResult,
    onSelect,
    disabled = false,
    compact = false,
}) => {
    const handleSelect = (result: PitchResult) => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSelect(result);
    };

    if (compact) {
        return (
            <View style={compactStyles.container}>
                <View style={compactStyles.row}>
                    {RESULTS.map(({ type, compactLabel, color, textColor }) => {
                        const isSelected = selectedResult === type;
                        return (
                            <Pressable
                                key={type}
                                style={[
                                    compactStyles.button,
                                    { backgroundColor: color },
                                    isSelected && compactStyles.buttonSelected,
                                    disabled && compactStyles.buttonDisabled,
                                ]}
                                onPress={() => handleSelect(type)}
                                disabled={disabled}
                            >
                                <Text style={[compactStyles.label, { color: textColor }]}>
                                    {compactLabel}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Result</Text>
            <View style={styles.row}>
                {RESULTS.map(({ type, label, color, textColor }) => {
                    const isSelected = selectedResult === type;
                    return (
                        <Pressable
                            key={type}
                            style={[
                                styles.button,
                                { backgroundColor: color },
                                isSelected && styles.buttonSelected,
                                disabled && styles.buttonDisabled,
                            ]}
                            onPress={() => handleSelect(type)}
                            disabled={disabled}
                        >
                            <Text style={[
                                styles.label,
                                { color: textColor },
                            ]}>
                                {label}
                            </Text>
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
    row: {
        flexDirection: 'row',
        gap: 6,
    },
    button: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    buttonSelected: {
        borderColor: colors.gray[800],
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
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
    row: {
        flexDirection: 'row',
        gap: 8,
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 60,
        borderWidth: 3,
        borderColor: 'transparent',
    },
    buttonSelected: {
        borderColor: colors.gray[800],
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default ResultButtons;
