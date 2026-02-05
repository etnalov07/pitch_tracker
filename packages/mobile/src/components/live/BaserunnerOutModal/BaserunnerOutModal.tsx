import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, Chip, useTheme } from 'react-native-paper';
import { BaseRunners, RunnerBase, BaserunnerEventType } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface BaserunnerOutModalProps {
    visible: boolean;
    onDismiss: () => void;
    runners: BaseRunners;
    currentOuts: number;
    onRecordOut: (eventType: BaserunnerEventType, runnerBase: RunnerBase) => void;
}

const EVENT_TYPES: { type: BaserunnerEventType; label: string; description: string }[] = [
    { type: 'caught_stealing', label: 'Caught Stealing', description: 'Runner thrown out attempting to steal' },
    { type: 'pickoff', label: 'Pickoff', description: 'Pitcher or catcher picks off runner' },
    { type: 'interference', label: 'Interference', description: 'Runner called out for interference' },
    { type: 'passed_runner', label: 'Passed Runner', description: 'Runner passed another runner' },
    { type: 'appeal_out', label: 'Appeal Out', description: 'Runner called out on appeal play' },
    { type: 'other', label: 'Other', description: 'Other baserunning out' },
];

const BASE_LABELS: { base: RunnerBase; label: string }[] = [
    { base: 'first', label: '1st Base' },
    { base: 'second', label: '2nd Base' },
    { base: 'third', label: '3rd Base' },
];

const BaserunnerOutModal: React.FC<BaserunnerOutModalProps> = ({
    visible,
    onDismiss,
    runners,
    currentOuts,
    onRecordOut,
}) => {
    const theme = useTheme();
    const [selectedBase, setSelectedBase] = useState<RunnerBase | null>(null);
    const [selectedEventType, setSelectedEventType] = useState<BaserunnerEventType | null>(null);

    // Get occupied bases
    const occupiedBases = BASE_LABELS.filter((b) => runners[b.base]);

    const handleConfirm = () => {
        if (selectedBase && selectedEventType) {
            onRecordOut(selectedEventType, selectedBase);
            setSelectedBase(null);
            setSelectedEventType(null);
            onDismiss();
        }
    };

    const handleDismiss = () => {
        setSelectedBase(null);
        setSelectedEventType(null);
        onDismiss();
    };

    const canConfirm = selectedBase && selectedEventType && currentOuts < 3;

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={handleDismiss}
                contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
            >
                <Text variant="titleLarge" style={styles.title}>
                    Record Baserunner Out
                </Text>

                {currentOuts >= 2 && (
                    <Text variant="bodySmall" style={[styles.warning, { color: colors.yellow[600] }]}>
                        Warning: Recording this out will end the inning
                    </Text>
                )}

                {/* Step 1: Select Runner */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={styles.sectionTitle}>
                        1. Select Runner
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
                                    style={[
                                        styles.chip,
                                        selectedBase === b.base && { backgroundColor: colors.primary[100] },
                                    ]}
                                    textStyle={selectedBase === b.base ? { color: colors.primary[700] } : undefined}
                                >
                                    {b.label}
                                </Chip>
                            ))}
                        </View>
                    )}
                </View>

                {/* Step 2: Select Event Type */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={styles.sectionTitle}>
                        2. Select Out Type
                    </Text>
                    <ScrollView style={styles.eventList} showsVerticalScrollIndicator={false}>
                        {EVENT_TYPES.map((event) => (
                            <Chip
                                key={event.type}
                                selected={selectedEventType === event.type}
                                onPress={() => setSelectedEventType(event.type)}
                                style={[
                                    styles.eventChip,
                                    selectedEventType === event.type && { backgroundColor: colors.primary[100] },
                                ]}
                                textStyle={
                                    selectedEventType === event.type ? { color: colors.primary[700] } : undefined
                                }
                            >
                                {event.label}
                            </Chip>
                        ))}
                    </ScrollView>
                </View>

                {/* Actions */}
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
                        Record Out
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
        maxHeight: '80%',
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
    eventList: {
        maxHeight: 180,
    },
    eventChip: {
        marginBottom: 8,
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

export default BaserunnerOutModal;
