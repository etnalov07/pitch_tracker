import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, Button } from 'react-native-paper';
import { formatFielderSequence } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface FielderSequencePickerProps {
    value: number[];
    onChange: (seq: number[]) => void;
    /** Maximum sequence length (DB constraint allows up to 5). */
    maxLength?: number;
}

const POSITION_LABELS: Record<number, string> = {
    1: 'P',
    2: 'C',
    3: '1B',
    4: '2B',
    5: '3B',
    6: 'SS',
    7: 'LF',
    8: 'CF',
    9: 'RF',
};

const FielderSequencePicker: React.FC<FielderSequencePickerProps> = ({ value, onChange, maxLength = 5 }) => {
    const togglePosition = (pos: number) => {
        const idx = value.indexOf(pos);
        if (idx >= 0) {
            // Tap a selected chip removes it (and trailing positions, since order matters)
            onChange(value.slice(0, idx));
        } else if (value.length < maxLength) {
            onChange([...value, pos]);
        }
    };

    const preview = formatFielderSequence(value);
    const atLimit = value.length >= maxLength;

    return (
        <View style={styles.wrapper}>
            <View style={styles.previewRow}>
                {preview ? (
                    <Text variant="titleMedium" style={styles.preview}>
                        {preview}
                    </Text>
                ) : (
                    <Text variant="bodySmall" style={styles.placeholder}>
                        tap fielders in order
                    </Text>
                )}
                <Button compact mode="outlined" onPress={() => onChange([])} disabled={value.length === 0} style={styles.clear}>
                    Clear
                </Button>
            </View>
            <View style={styles.grid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((pos) => {
                    const order = value.indexOf(pos);
                    const isSelected = order >= 0;
                    return (
                        <Chip
                            key={pos}
                            selected={isSelected}
                            onPress={() => togglePosition(pos)}
                            disabled={!isSelected && atLimit}
                            style={[styles.chip, isSelected && styles.chipSelected]}
                            textStyle={isSelected ? styles.chipTextSelected : styles.chipText}
                            compact
                        >
                            {pos} {POSITION_LABELS[pos]}
                            {isSelected ? ` (${order + 1})` : ''}
                        </Chip>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        gap: 8,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    preview: {
        fontWeight: '700',
        color: colors.gray[900],
        minWidth: 60,
        textAlign: 'center',
    },
    placeholder: {
        fontStyle: 'italic',
        color: colors.gray[500],
        minWidth: 60,
        textAlign: 'center',
    },
    clear: {
        height: 32,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'center',
    },
    chip: {
        backgroundColor: colors.gray[100],
    },
    chipSelected: {
        backgroundColor: colors.primary[100],
    },
    chipText: {
        fontSize: 12,
    },
    chipTextSelected: {
        color: colors.primary[700],
        fontSize: 12,
        fontWeight: '600',
    },
});

export default FielderSequencePicker;
