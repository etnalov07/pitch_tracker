import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import * as Haptics from '../../../utils/haptics';
import { PitchResult } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface ResultButtonsProps {
    selectedResult: PitchResult | null;
    onSelect: (result: PitchResult) => void;
    disabled?: boolean;
    compact?: boolean;
    // 'card' = iPad web-parity look (white card, uppercase label, solid
    // color-coded buttons with white labels in a 3-column grid). Phone unchanged.
    variant?: 'card';
}

const RESULTS: { type: PitchResult; label: string; compactLabel: string; color: string; textColor: string }[] = [
    { type: 'ball', label: 'Ball', compactLabel: 'Ball', color: colors.gray[300], textColor: colors.gray[800] },
    { type: 'called_strike', label: 'Called\nStrike', compactLabel: 'Called', color: colors.green[500], textColor: '#ffffff' },
    { type: 'swinging_strike', label: 'Swinging\nStrike', compactLabel: 'Swing', color: colors.red[500], textColor: '#ffffff' },
    { type: 'foul', label: 'Foul', compactLabel: 'Foul', color: colors.yellow[500], textColor: colors.gray[800] },
    { type: 'hit_by_pitch', label: 'HBP', compactLabel: 'HBP', color: '#f97316', textColor: '#ffffff' },
    { type: 'in_play', label: 'In Play', compactLabel: 'In Play', color: colors.primary[600], textColor: '#ffffff' },
];

const ResultButtons: React.FC<ResultButtonsProps> = ({ selectedResult, onSelect, disabled = false, compact = false, variant }) => {
    const theme = useTheme();
    const handleSelect = (result: PitchResult) => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSelect(result);
    };

    if (compact) {
        return (
            <View style={[compactStyles.container, { backgroundColor: theme.colors.surface }]}>
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
                                <Text style={[compactStyles.label, { color: textColor }]}>{compactLabel}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        );
    }

    if (variant === 'card') {
        return (
            <View style={[cardStyles.container, { backgroundColor: theme.colors.surface }]}>
                <Text style={[cardStyles.title, { color: theme.colors.onSurfaceVariant }]}>RESULT</Text>
                <View style={cardStyles.grid}>
                    {RESULTS.map(({ type, label, color }) => {
                        const isSelected = selectedResult === type;
                        // Ball's shared shade (gray[300]) is too light for white card labels;
                        // bump to the artifact's medium gray so the white text reads.
                        const bg = type === 'ball' ? colors.gray[400] : color;
                        return (
                            <Pressable
                                key={type}
                                style={[
                                    cardStyles.button,
                                    { backgroundColor: bg },
                                    isSelected && cardStyles.buttonSelected,
                                    disabled && cardStyles.buttonDisabled,
                                ]}
                                onPress={() => handleSelect(type)}
                                disabled={disabled}
                            >
                                <Text style={cardStyles.label}>{label.replace('\n', ' ')}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
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
                            <Text style={[styles.label, { color: textColor }]}>{label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

const compactStyles = StyleSheet.create({
    container: {
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

// iPad web-parity "card" look — solid color-coded buttons with white labels in a
// 3-column grid, inside a white card with an uppercase section label.
const cardStyles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    title: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7,
    },
    button: {
        flexGrow: 1,
        flexBasis: '30%',
        minWidth: 70,
        minHeight: 42,
        paddingVertical: 10,
        paddingHorizontal: 7,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'transparent',
    },
    buttonSelected: {
        borderColor: '#ffffff',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
        color: '#ffffff',
    },
});

const styles = StyleSheet.create({
    container: {
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
