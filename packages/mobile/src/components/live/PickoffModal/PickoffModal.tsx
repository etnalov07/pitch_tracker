import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Button, Chip, useTheme } from 'react-native-paper';
import { BaseRunners, RunnerBase } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface PickoffModalProps {
    visible: boolean;
    onDismiss: () => void;
    runners: BaseRunners;
    currentOuts: number;
    onRecordPickoff: (runnerBase: RunnerBase) => void;
}

const BASE_LABELS: { base: RunnerBase; label: string }[] = [
    { base: 'first', label: '1st Base' },
    { base: 'second', label: '2nd Base' },
    { base: 'third', label: '3rd Base' },
];

const PickoffModal: React.FC<PickoffModalProps> = ({ visible, onDismiss, runners, currentOuts, onRecordPickoff }) => {
    const theme = useTheme();
    const [selectedBase, setSelectedBase] = useState<RunnerBase | null>(null);

    const occupiedBases = BASE_LABELS.filter((b) => runners[b.base]);

    const handleConfirm = () => {
        if (selectedBase) {
            onRecordPickoff(selectedBase);
            setSelectedBase(null);
            onDismiss();
        }
    };

    const handleDismiss = () => {
        setSelectedBase(null);
        onDismiss();
    };

    const canConfirm = !!selectedBase && currentOuts < 3;

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={handleDismiss}
                contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
            >
                <Text variant="titleLarge" style={styles.title}>
                    Pickoff
                </Text>

                {currentOuts >= 2 && (
                    <Text variant="bodySmall" style={[styles.warning, { color: colors.yellow[600] }]}>
                        Warning: Recording this out will end the inning
                    </Text>
                )}

                <View style={styles.section}>
                    <Text variant="titleSmall" style={styles.sectionTitle}>
                        Runner picked off at:
                    </Text>
                    {occupiedBases.length === 0 ? (
                        <Text variant="bodyMedium" style={styles.noRunnersText}>
                            No runners on base
                        </Text>
                    ) : (
                        <View style={styles.chipRow}>
                            {occupiedBases.map((b) => (
                                <Chip
                                    key={b.base}
                                    selected={selectedBase === b.base}
                                    onPress={() => setSelectedBase(b.base)}
                                    style={[styles.chip, selectedBase === b.base && { backgroundColor: colors.primary[100] }]}
                                    textStyle={selectedBase === b.base ? { color: colors.primary[700] } : undefined}
                                >
                                    {b.label}
                                </Chip>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.actions}>
                    <Button mode="outlined" onPress={handleDismiss} style={styles.button}>
                        Cancel
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleConfirm}
                        disabled={!canConfirm}
                        style={styles.button}
                        buttonColor={colors.red[500]}
                    >
                        Record Pickoff
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        margin: 20,
        padding: 20,
        borderRadius: 12,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    warning: {
        marginBottom: 12,
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontWeight: '600',
        marginBottom: 8,
        color: colors.gray[600],
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        marginRight: 4,
    },
    noRunnersText: {
        color: colors.gray[500],
        fontStyle: 'italic',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
    },
    button: {
        minWidth: 100,
    },
});

export default PickoffModal;
