// Runner Advance modal — extracted from the legacy tabbed RunnerEventModal
// as part of UX audit item E (UX-IP-07). One file owns one flow: pick the
// advancement event (stolen base / wild pitch / etc.), confirm the after-
// state of the diamond, fire the callback.
//
// Replaces the legacy DiamondToggle (UX-IP-08, 45°-rotated squares with
// counter-rotated text) with the shared BaseRunnerDiamond used in the live
// GameHeader, so the runner display is identical wherever it appears.

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Modal, Portal, Text, useTheme } from 'react-native-paper';

import { BaseRunners, RunnerBase, getSuggestedAdvancement } from '@pitch-tracker/shared';

import { colors } from '../../../styles/theme';
import BaseRunnerDiamond from '../BaseRunnerDiamond';

export type AdvancementEventType = 'stolen_base' | 'wild_pitch' | 'passed_ball' | 'balk' | 'advance_on_throw';

interface RunnerAdvanceModalProps {
    visible: boolean;
    onDismiss: () => void;
    runners: BaseRunners;
    onRecord: (
        eventType: AdvancementEventType,
        fromBase: RunnerBase,
        newRunners: BaseRunners,
        runsScored: number,
        runnerToBase?: RunnerBase | 'home'
    ) => void;
}

const ADVANCEMENT_EVENTS: { type: AdvancementEventType; short: string }[] = [
    { type: 'stolen_base', short: 'SB' },
    { type: 'wild_pitch', short: 'WP' },
    { type: 'passed_ball', short: 'PB' },
    { type: 'balk', short: 'BLK' },
    { type: 'advance_on_throw', short: 'TE' },
];

const BASE_LABELS: { base: RunnerBase; label: string; next: RunnerBase | 'home' }[] = [
    { base: 'first', label: '1st', next: 'second' },
    { base: 'second', label: '2nd', next: 'third' },
    { base: 'third', label: '3rd', next: 'home' },
];

const RunnerAdvanceModal: React.FC<RunnerAdvanceModalProps> = ({ visible, onDismiss, runners, onRecord }) => {
    const theme = useTheme();
    const [eventType, setEventType] = useState<AdvancementEventType | null>(null);
    const [sbFromBase, setSbFromBase] = useState<RunnerBase | null>(null);
    const [afterRunners, setAfterRunners] = useState<BaseRunners>({ first: false, second: false, third: false });
    const [runsScored, setRunsScored] = useState(0);

    const occupiedBases = BASE_LABELS.filter((b) => runners[b.base]);

    useEffect(() => {
        if (!visible) return;
        setEventType(null);
        setSbFromBase(null);
        setAfterRunners({ first: false, second: false, third: false });
        setRunsScored(0);
    }, [visible]);

    useEffect(() => {
        if (!eventType) return;
        if (eventType === 'stolen_base') {
            setAfterRunners({ ...runners });
            setRunsScored(0);
        } else {
            const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(runners, eventType);
            setAfterRunners(suggestedRunners);
            setRunsScored(suggestedRuns);
        }
        setSbFromBase(null);
    }, [eventType, runners]);

    const handleSbFromBase = (base: RunnerBase) => {
        setSbFromBase(base);
        const nextBase = BASE_LABELS.find((b) => b.base === base)?.next;
        const newRunners = { ...runners, [base]: false };
        if (nextBase && nextBase !== 'home') newRunners[nextBase] = true;
        const runs = nextBase === 'home' ? 1 : 0;
        setAfterRunners(newRunners);
        setRunsScored(runs);
    };

    const handleToggleAfterBase = (base: RunnerBase) => {
        setAfterRunners((prev) => ({ ...prev, [base]: !prev[base] }));
    };

    const handleConfirm = () => {
        if (!eventType) return;
        const fromBase = eventType === 'stolen_base' ? sbFromBase : (occupiedBases[0]?.base ?? 'first');
        if (!fromBase) return;
        const toBase = BASE_LABELS.find((b) => b.base === fromBase)?.next;
        onRecord(eventType, fromBase as RunnerBase, afterRunners, runsScored, toBase as RunnerBase | 'home' | undefined);
        onDismiss();
    };

    const canConfirm = eventType !== null && (eventType !== 'stolen_base' || sbFromBase !== null);

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
            >
                <Text variant="titleMedium" style={styles.title}>
                    Runner Advancement
                </Text>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Event</Text>
                    <View style={styles.chipRow}>
                        {ADVANCEMENT_EVENTS.map((e) => (
                            <Chip
                                key={e.type}
                                selected={eventType === e.type}
                                onPress={() => setEventType(e.type)}
                                style={[styles.chip, eventType === e.type && { backgroundColor: colors.green[100] }]}
                                textStyle={eventType === e.type ? { color: colors.green[700] } : undefined}
                            >
                                {e.short}
                            </Chip>
                        ))}
                    </View>
                </View>

                {eventType === 'stolen_base' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Runner stealing from</Text>
                        <View style={styles.chipRow}>
                            {occupiedBases.map((b) => (
                                <Chip
                                    key={b.base}
                                    selected={sbFromBase === b.base}
                                    onPress={() => handleSbFromBase(b.base)}
                                    style={[styles.chip, sbFromBase === b.base && { backgroundColor: colors.green[100] }]}
                                    textStyle={sbFromBase === b.base ? { color: colors.green[700] } : undefined}
                                >
                                    {b.label}
                                </Chip>
                            ))}
                        </View>
                    </View>
                )}

                {eventType && eventType !== 'stolen_base' && (
                    <View style={styles.diamondSection}>
                        <View style={styles.diamondCol}>
                            <Text style={styles.diamondLabel}>Before</Text>
                            <BaseRunnerDiamond runners={runners} size={80} disabled />
                        </View>
                        <Text style={styles.arrow}>→</Text>
                        <View style={styles.diamondCol}>
                            <Text style={styles.diamondLabel}>After</Text>
                            <BaseRunnerDiamond runners={afterRunners} size={80} onBasePress={handleToggleAfterBase} />
                        </View>
                    </View>
                )}

                {eventType && runsScored > 0 && (
                    <Text style={styles.runsText}>
                        +{runsScored} run{runsScored > 1 ? 's' : ''} scored
                    </Text>
                )}

                <View style={styles.actions}>
                    <Button mode="outlined" onPress={onDismiss}>
                        Cancel
                    </Button>
                    <Button mode="contained" onPress={handleConfirm} disabled={!canConfirm} buttonColor={colors.green[600]}>
                        Confirm
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
    chip: {},
    diamondSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 14,
    },
    diamondCol: { alignItems: 'center', gap: 4 },
    diamondLabel: { fontSize: 11, color: colors.gray[500], fontWeight: '600' },
    arrow: { fontSize: 20, color: colors.gray[400] },
    runsText: { textAlign: 'center', color: colors.green[700], fontWeight: '600', marginBottom: 10 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
});

export default RunnerAdvanceModal;
