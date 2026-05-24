import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Modal, Portal, Button, useTheme } from 'react-native-paper';
import { PitchResult } from '@pitch-tracker/shared';

interface EditResultModalProps {
    visible: boolean;
    currentResult?: PitchResult | null;
    onDismiss: () => void;
    onSelect: (newResult: PitchResult) => void;
}

const RESULT_OPTIONS: { value: PitchResult; label: string }[] = [
    { value: 'ball', label: 'Ball' },
    { value: 'called_strike', label: 'Called Strike' },
    { value: 'swinging_strike', label: 'Swinging Strike' },
    { value: 'foul', label: 'Foul' },
    { value: 'hit_by_pitch', label: 'HBP' },
    { value: 'in_play', label: 'In Play' },
];

const formatResult = (r: string): string => r.replace(/_/g, ' ');

const EditResultModal: React.FC<EditResultModalProps> = ({ visible, currentResult, onDismiss, onSelect }) => {
    const theme = useTheme();
    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
            >
                <Text variant="titleLarge" style={styles.title}>
                    Edit last pitch
                </Text>
                {currentResult && (
                    <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Currently: <Text style={styles.currentResult}>{formatResult(currentResult)}</Text>
                    </Text>
                )}
                <View style={styles.grid}>
                    {RESULT_OPTIONS.map((opt) => {
                        const isCurrent = opt.value === currentResult;
                        return (
                            <Pressable
                                key={opt.value}
                                onPress={() => !isCurrent && onSelect(opt.value)}
                                disabled={isCurrent}
                                style={[
                                    styles.option,
                                    {
                                        borderColor: theme.colors.outline,
                                        backgroundColor: isCurrent ? theme.colors.surfaceVariant : theme.colors.surface,
                                        opacity: isCurrent ? 0.55 : 1,
                                    },
                                ]}
                            >
                                <Text style={[styles.optionLabel, { color: theme.colors.onSurface }]}>{opt.label}</Text>
                                {isCurrent && (
                                    <Text style={[styles.currentTag, { color: theme.colors.onSurfaceVariant }]}>current</Text>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
                <Button onPress={onDismiss} style={styles.cancel}>
                    Cancel
                </Button>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modal: { margin: 20, padding: 20, borderRadius: 12 },
    title: { marginBottom: 6, textAlign: 'center' },
    subtitle: { textAlign: 'center', marginBottom: 14 },
    currentResult: { fontWeight: '700', textTransform: 'capitalize' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    option: {
        minWidth: 120,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
    optionLabel: { fontSize: 14, fontWeight: '600' },
    currentTag: { fontSize: 10, marginTop: 2, fontStyle: 'italic' },
    cancel: { marginTop: 16 },
});

export default EditResultModal;
