import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import { ReplayAtBat } from '@pitch-tracker/shared';

interface Props {
    atBats: ReplayAtBat[];
    selectedIdx: number;
    onSelect: (idx: number) => void;
}

const formatLabel = (entry: ReplayAtBat): string => {
    const order = entry.atBat.batting_order ? `#${entry.atBat.batting_order} ` : '';
    const result = entry.atBat.result ? ` (${entry.atBat.result.replace(/_/g, ' ')})` : '';
    return `${order}${entry.batterDisplayName}${result}`;
};

const BatterStrip: React.FC<Props> = ({ atBats, selectedIdx, onSelect }) => {
    const theme = useTheme();
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {atBats.map((entry, idx) => {
                const selected = idx === selectedIdx;
                return (
                    <Chip
                        key={entry.atBat.id}
                        selected={selected}
                        onPress={() => onSelect(idx)}
                        style={[styles.chip, selected && { backgroundColor: theme.colors.primary }]}
                        textStyle={selected ? { color: theme.colors.onPrimary } : undefined}
                        compact
                    >
                        {formatLabel(entry)}
                    </Chip>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    row: {
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    chip: {
        marginRight: 0,
    },
});

export default BatterStrip;
