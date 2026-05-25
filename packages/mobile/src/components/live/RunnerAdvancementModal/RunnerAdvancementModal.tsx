import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, IconButton, Modal, Portal, Text, useTheme } from 'react-native-paper';

import { BaseRunners, getSuggestedAdvancement, RunnerBase } from '@pitch-tracker/shared';

import { colors } from '../../../styles/theme';
import BaseRunnerDiamond from '../BaseRunnerDiamond';

import {
    advancementKey,
    computeExtraAdvancements,
    ErrorAdvancement,
    getHitLabel,
    ORIGIN_LABEL,
    TARGET_LABEL,
    Throwout,
} from './runnerAdvancementHelpers';
import ThrowoutSection from './ThrowoutSection';

// Re-export the public types so callers (LiveGameModals, useLiveGameActions)
// don't have to re-target the helpers file.
export type { ErrorAdvancement, Throwout, ThrowoutTargetBase, RunnerOrigin, AdvanceTarget } from './runnerAdvancementHelpers';

interface RunnerAdvancementModalProps {
    visible: boolean;
    onDismiss: () => void;
    currentRunners: BaseRunners;
    hitResult: string;
    onConfirm: (newRunners: BaseRunners, runsScored: number, throwouts: Throwout[], errorAdvancements: ErrorAdvancement[]) => void;
}

/**
 * Modal for adjusting runner positions after a hit. Shows suggested
 * advancement based on hit type, allows manual base toggling via
 * BaseRunnerDiamond, records runs scored, and surfaces:
 *   - throwouts (runners thrown out trying to advance) — see ThrowoutSection
 *   - extra advances on throw / error — toggleable chips
 *
 * Trimmed as part of UX audit item E (UX-IP-09): pure helpers in
 * runnerAdvancementHelpers.ts; throwout list + add-form in ThrowoutSection.
 */
const RunnerAdvancementModal: React.FC<RunnerAdvancementModalProps> = ({
    visible,
    onDismiss,
    currentRunners,
    hitResult,
    onConfirm,
}) => {
    const theme = useTheme();
    const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(currentRunners, hitResult);
    const [newRunners, setNewRunners] = useState<BaseRunners>(suggestedRunners);
    const [runsScored, setRunsScored] = useState(suggestedRuns);
    const [throwouts, setThrowouts] = useState<Throwout[]>([]);
    const [errorFlags, setErrorFlags] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (visible) {
            const suggestion = getSuggestedAdvancement(currentRunners, hitResult);
            setNewRunners(suggestion.suggestedRunners);
            setRunsScored(suggestion.suggestedRuns);
            setThrowouts([]);
            setErrorFlags(new Set());
        }
    }, [visible, currentRunners, hitResult]);

    const toggleBase = (base: RunnerBase) => {
        setNewRunners((prev) => ({ ...prev, [base]: !prev[base] }));
    };

    const incrementRuns = () => setRunsScored((prev) => prev + 1);
    const decrementRuns = () => setRunsScored((prev) => Math.max(0, prev - 1));

    const handleConfirm = () => {
        const extras = computeExtraAdvancements(currentRunners, hitResult, newRunners, runsScored);
        const flagged = extras.filter((adv) => errorFlags.has(advancementKey(adv)));
        onConfirm(newRunners, runsScored, throwouts, flagged);
        onDismiss();
    };

    const toggleErrorFlag = (adv: ErrorAdvancement) => {
        const key = advancementKey(adv);
        setErrorFlags((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const extraAdvancements = computeExtraAdvancements(currentRunners, hitResult, newRunners, runsScored);
    const runnersOnBefore = (currentRunners.first ? 1 : 0) + (currentRunners.second ? 1 : 0) + (currentRunners.third ? 1 : 0);

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text variant="titleLarge" style={styles.title}>
                        Runner Advancement
                    </Text>

                    <Chip style={styles.hitChip} textStyle={styles.hitChipText}>
                        {getHitLabel(hitResult)}
                    </Chip>

                    {/* Before */}
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={styles.sectionTitle}>
                            Before ({runnersOnBefore} on base)
                        </Text>
                        <BaseRunnerDiamond runners={currentRunners} size={80} disabled />
                    </View>

                    {/* After — adjustable */}
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={styles.sectionTitle}>
                            After (tap bases to adjust)
                        </Text>
                        <BaseRunnerDiamond runners={newRunners} size={100} onBasePress={toggleBase} />
                        <View style={styles.baseToggles}>
                            {(['first', 'second', 'third'] as RunnerBase[]).map((b) => {
                                const label = b === 'first' ? '1st' : b === 'second' ? '2nd' : '3rd';
                                const active = newRunners[b];
                                return (
                                    <Chip
                                        key={b}
                                        selected={active}
                                        onPress={() => toggleBase(b)}
                                        style={[styles.baseChip, active && styles.baseChipActive]}
                                        textStyle={active ? styles.baseChipActiveText : undefined}
                                    >
                                        {label}
                                    </Chip>
                                );
                            })}
                        </View>
                    </View>

                    {/* Runs scored */}
                    <View style={styles.runsSection}>
                        <Text variant="titleSmall" style={styles.sectionTitle}>
                            Runs Scored
                        </Text>
                        <View style={styles.runsControl}>
                            <IconButton icon="minus" mode="contained" onPress={decrementRuns} disabled={runsScored === 0} />
                            <Text variant="headlineMedium" style={styles.runsCount}>
                                {runsScored}
                            </Text>
                            <IconButton icon="plus" mode="contained" onPress={incrementRuns} />
                        </View>
                    </View>

                    {/* Throwouts — owns its own draft state */}
                    {(runnersOnBefore > 0 || throwouts.length > 0) && (
                        <ThrowoutSection
                            currentRunners={currentRunners}
                            throwouts={throwouts}
                            onAdd={(t) => setThrowouts((prev) => [...prev, t])}
                            onRemove={(idx) => setThrowouts((prev) => prev.filter((_, i) => i !== idx))}
                        />
                    )}

                    {/* Extra advances on throw/error */}
                    {extraAdvancements.length > 0 && (
                        <View style={styles.errorSection}>
                            <Text variant="titleSmall" style={styles.sectionTitle}>
                                Advanced on throw / error
                            </Text>
                            <Text variant="bodySmall" style={styles.errorHint}>
                                Tap any advance below that happened because of a throwing or fielding error.
                            </Text>
                            <View style={styles.errorList}>
                                {extraAdvancements.map((adv) => {
                                    const key = advancementKey(adv);
                                    const selected = errorFlags.has(key);
                                    return (
                                        <Chip
                                            key={key}
                                            selected={selected}
                                            onPress={() => toggleErrorFlag(adv)}
                                            style={[styles.errorChip, selected && styles.errorChipActive]}
                                            textStyle={selected ? styles.errorChipActiveText : undefined}
                                        >
                                            {ORIGIN_LABEL[adv.fromBase]} → {TARGET_LABEL[adv.toBase]}
                                        </Chip>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Button mode="outlined" onPress={onDismiss} style={styles.button}>
                            Cancel
                        </Button>
                        <Button mode="contained" onPress={handleConfirm} style={styles.button}>
                            Confirm
                        </Button>
                    </View>
                </ScrollView>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modalContainer: { margin: 20, borderRadius: 12, maxHeight: '90%' },
    scrollContent: { padding: 20 },
    title: { fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    hitChip: { alignSelf: 'center', marginBottom: 16, backgroundColor: colors.primary[100] },
    hitChipText: { color: colors.primary[700], fontWeight: '600' },
    section: { marginBottom: 16, alignItems: 'center' },
    sectionTitle: { fontWeight: '600', marginBottom: 8, color: colors.gray[600] },
    baseToggles: { flexDirection: 'row', gap: 8, marginTop: 8 },
    baseChip: { backgroundColor: colors.gray[100] },
    baseChipActive: { backgroundColor: colors.green[100] },
    baseChipActiveText: { color: colors.green[700] },
    runsSection: { marginBottom: 16, alignItems: 'center' },
    runsControl: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    runsCount: { fontWeight: 'bold', minWidth: 40, textAlign: 'center' },
    errorSection: { marginBottom: 16, padding: 12, backgroundColor: colors.yellow[50], borderRadius: 8 },
    errorHint: { color: colors.gray[600], marginBottom: 8 },
    errorList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    errorChip: { backgroundColor: colors.gray[100] },
    errorChipActive: { backgroundColor: colors.yellow[200] },
    errorChipActiveText: { color: colors.yellow[800] },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
    button: { minWidth: 100 },
});

export default RunnerAdvancementModal;
