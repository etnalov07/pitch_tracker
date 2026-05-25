// Runner Out modal — extracted from the legacy tabbed RunnerEventModal
// as part of UX audit item E (UX-IP-07). One file owns one flow: pick the
// runner on base + the out type, fire the callback.

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Modal, Portal, Text, useTheme } from 'react-native-paper';

import { BaseRunners, BaserunnerEventType, RunnerBase } from '@pitch-tracker/shared';

import { colors } from '../../../styles/theme';

export type OutEventType = 'caught_stealing' | 'pickoff' | 'interference' | 'passed_runner' | 'appeal_out' | 'other';

interface RunnerOutModalProps {
    visible: boolean;
    onDismiss: () => void;
    runners: BaseRunners;
    currentOuts: number;
    onRecord: (eventType: BaserunnerEventType, runnerBase: RunnerBase) => void;
}

const OUT_EVENTS: { type: OutEventType; label: string }[] = [
    { type: 'caught_stealing', label: 'Caught Stealing' },
    { type: 'pickoff', label: 'Pickoff' },
    { type: 'interference', label: 'Interference' },
    { type: 'appeal_out', label: 'Appeal Out' },
    { type: 'passed_runner', label: 'Passed Runner' },
    { type: 'other', label: 'Other' },
];

const BASE_LABELS: { base: RunnerBase; label: string }[] = [
    { base: 'first', label: '1st' },
    { base: 'second', label: '2nd' },
    { base: 'third', label: '3rd' },
];

const RunnerOutModal: React.FC<RunnerOutModalProps> = ({ visible, onDismiss, runners, currentOuts, onRecord }) => {
    const theme = useTheme();
    const [eventType, setEventType] = useState<OutEventType | null>(null);
    const [outBase, setOutBase] = useState<RunnerBase | null>(null);

    const occupiedBases = BASE_LABELS.filter((b) => runners[b.base]);
    const hasRunners = occupiedBases.length > 0;

    useEffect(() => {
        if (!visible) return;
        setEventType(null);
        setOutBase(null);
    }, [visible]);

    const handleConfirm = () => {
        if (!eventType || !outBase) return;
        onRecord(eventType, outBase);
        onDismiss();
    };

    const canConfirm = eventType !== null && outBase !== null && currentOuts < 3;

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
            >
                <Text variant="titleMedium" style={styles.title}>
                    Runner Out
                </Text>

                {currentOuts >= 2 && (
                    <Text style={[styles.warning, { color: colors.yellow[700] }]}>Recording this out will end the inning</Text>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Runner</Text>
                    {!hasRunners ? (
                        <Text style={styles.empty}>No runners on base</Text>
                    ) : (
                        <View style={styles.chipRow}>
                            {occupiedBases.map((b) => (
                                <Chip
                                    key={b.base}
                                    selected={outBase === b.base}
                                    onPress={() => setOutBase(b.base)}
                                    style={[styles.chip, outBase === b.base && { backgroundColor: colors.red[100] }]}
                                    textStyle={outBase === b.base ? { color: colors.red[700] } : undefined}
                                >
                                    {b.label}
                                </Chip>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Out type</Text>
                    <View style={styles.chipColumn}>
                        {OUT_EVENTS.map((e) => (
                            <Chip
                                key={e.type}
                                selected={eventType === e.type}
                                onPress={() => setEventType(e.type)}
                                style={[styles.eventChip, eventType === e.type && { backgroundColor: colors.red[100] }]}
                                textStyle={eventType === e.type ? { color: colors.red[700] } : undefined}
                            >
                                {e.label}
                            </Chip>
                        ))}
                    </View>
                </View>

                <View style={styles.actions}>
                    <Button mode="outlined" onPress={onDismiss}>
                        Cancel
                    </Button>
                    <Button mode="contained" onPress={handleConfirm} disabled={!canConfirm} buttonColor={colors.red[500]}>
                        Record Out
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modal: {
        margin: 20,
        padding: 20,
        borderRadius: 12,
        maxHeight: '85%',
    },
    title: { marginBottom: 12 },
    section: { marginBottom: 14 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.gray[500], marginBottom: 6, textTransform: 'uppercase' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipColumn: { gap: 8 },
    chip: {},
    eventChip: {},
    warning: { fontSize: 12, marginBottom: 10 },
    empty: { color: colors.gray[400], fontStyle: 'italic' },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
});

export default RunnerOutModal;
