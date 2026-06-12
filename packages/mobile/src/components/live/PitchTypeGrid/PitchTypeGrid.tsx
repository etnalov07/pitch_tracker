import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import * as Haptics from '../../../utils/haptics';
import { PitchType } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface PitchTypeGridProps {
    selectedType: PitchType | null;
    onSelect: (type: PitchType) => void;
    availablePitchTypes?: PitchType[];
    disabled?: boolean;
    compact?: boolean;
    // 'card' = iPad web-parity look (white card, uppercase label, large light
    // buttons with abbrev over full name). Phone uses the default/compact looks.
    variant?: 'card';
    // Per-pitch-type tint color encoding strike% vs current batter hand.
    // Missing entry = sample too small (n<15) → neutral.
    tintByPitchType?: Partial<Record<PitchType, string>>;
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
    { type: 'screwball', label: 'Screwball', abbrev: 'SC' },
    { type: 'other', label: 'Other', abbrev: 'OT' },
];

const PitchTypeGrid: React.FC<PitchTypeGridProps> = ({
    selectedType,
    onSelect,
    availablePitchTypes,
    disabled = false,
    compact = false,
    variant,
    tintByPitchType,
}) => {
    const theme = useTheme();
    // Filter to only available pitch types if provided, otherwise show all.
    // Fallback to ALL_PITCH_TYPES if the filter produces nothing (guards against a type stored in
    // pitcher_pitch_types that isn't yet in ALL_PITCH_TYPES blanking out the selector).
    const filtered = availablePitchTypes ? ALL_PITCH_TYPES.filter((p) => availablePitchTypes.includes(p.type)) : ALL_PITCH_TYPES;
    const pitchTypes = filtered.length > 0 ? filtered : ALL_PITCH_TYPES;

    const handleSelect = (type: PitchType) => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(type);
    };

    if (compact) {
        return (
            <View style={[compactStyles.container, { backgroundColor: theme.colors.surface }]}>
                <View style={compactStyles.grid}>
                    {pitchTypes.map(({ type, abbrev }) => {
                        const isSelected = selectedType === type;
                        const tint = tintByPitchType?.[type];
                        return (
                            <Pressable
                                key={type}
                                style={[
                                    compactStyles.button,
                                    !isSelected && { backgroundColor: tint ?? theme.colors.surfaceVariant },
                                    isSelected && compactStyles.buttonSelected,
                                    disabled && compactStyles.buttonDisabled,
                                ]}
                                onPress={() => handleSelect(type)}
                                disabled={disabled}
                            >
                                <Text
                                    style={[
                                        compactStyles.abbrev,
                                        { color: theme.colors.onSurfaceVariant },
                                        isSelected && compactStyles.textSelected,
                                    ]}
                                >
                                    {abbrev}
                                </Text>
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
                <Text style={[cardStyles.title, { color: theme.colors.onSurfaceVariant }]}>PITCH TYPE</Text>
                <View style={cardStyles.grid}>
                    {pitchTypes.map(({ type, label, abbrev }) => {
                        const isSelected = selectedType === type;
                        const tint = tintByPitchType?.[type];
                        return (
                            <Pressable
                                key={type}
                                style={[
                                    cardStyles.button,
                                    {
                                        backgroundColor: isSelected ? colors.primary[600] : (tint ?? theme.colors.surfaceVariant),
                                        borderColor: isSelected ? colors.primary[700] : colors.gray[200],
                                    },
                                    disabled && cardStyles.buttonDisabled,
                                ]}
                                onPress={() => handleSelect(type)}
                                disabled={disabled}
                            >
                                <Text style={[cardStyles.abbrev, { color: isSelected ? '#ffffff' : theme.colors.onSurface }]}>
                                    {abbrev}
                                </Text>
                                <Text style={[cardStyles.label, { color: isSelected ? '#ffffff' : theme.colors.onSurfaceVariant }]}>
                                    {label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>Pitch Type</Text>
            <View style={styles.grid}>
                {pitchTypes.map(({ type, label, abbrev }) => {
                    const isSelected = selectedType === type;
                    const tint = tintByPitchType?.[type];
                    return (
                        <Pressable
                            key={type}
                            style={[
                                styles.button,
                                !isSelected && { backgroundColor: tint ?? theme.colors.surfaceVariant },
                                isSelected && styles.buttonSelected,
                                disabled && styles.buttonDisabled,
                            ]}
                            onPress={() => handleSelect(type)}
                            disabled={disabled}
                        >
                            <Text style={[styles.abbrev, { color: theme.colors.onSurface }, isSelected && styles.textSelected]}>
                                {abbrev}
                            </Text>
                            <Text
                                style={[styles.label, { color: theme.colors.onSurfaceVariant }, isSelected && styles.textSelected]}
                            >
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

// iPad web-parity "card" look — large light buttons with a big abbrev over the
// full pitch name, inside a white card with an uppercase section label.
const cardStyles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7,
    },
    // Compact buttons so the full-width selector above the strike zone packs many
    // pitch types per row without forcing the column to scroll.
    button: {
        flexGrow: 1,
        flexBasis: 58,
        minWidth: 58,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 9,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    abbrev: {
        fontSize: 15,
        fontWeight: '800',
    },
    label: {
        fontSize: 8,
        marginTop: 2,
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
