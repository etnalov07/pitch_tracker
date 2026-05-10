import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, Chip, useTheme, IconButton, Divider } from 'react-native-paper';
import { BaseRunners, formatFielderSequence, getSuggestedAdvancement, RunnerBase } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';
import BaseRunnerDiamond from '../BaseRunnerDiamond';
import FielderSequencePicker from '../FielderSequencePicker';

export type ThrowoutTargetBase = 'second' | 'third' | 'home';

export interface Throwout {
    fromBase: RunnerBase;
    toBase: ThrowoutTargetBase;
    fielderSeq: number[];
}

export type RunnerOrigin = 'batter' | RunnerBase;
export type AdvanceTarget = RunnerBase | 'home';

export interface ErrorAdvancement {
    fromBase: RunnerOrigin;
    toBase: AdvanceTarget;
}

interface RunnerAdvancementModalProps {
    visible: boolean;
    onDismiss: () => void;
    currentRunners: BaseRunners;
    hitResult: string;
    onConfirm: (newRunners: BaseRunners, runsScored: number, throwouts: Throwout[], errorAdvancements: ErrorAdvancement[]) => void;
}

const FROM_BASE_LABEL: Record<RunnerBase, string> = { first: '1st', second: '2nd', third: '3rd' };
const TO_BASE_LABEL: Record<ThrowoutTargetBase, string> = { second: '2nd', third: '3rd', home: 'home' };
const ORIGIN_LABEL: Record<RunnerOrigin, string> = { batter: 'Batter', first: '1st', second: '2nd', third: '3rd' };
const TARGET_LABEL: Record<AdvanceTarget, string> = { first: '1st', second: '2nd', third: '3rd', home: 'home' };

const BASE_ORDER: Record<RunnerOrigin | AdvanceTarget, number> = { batter: 0, first: 1, second: 2, third: 3, home: 4 };

const VALID_TARGETS: Record<RunnerBase, ThrowoutTargetBase[]> = {
    first: ['second', 'third', 'home'],
    second: ['third', 'home'],
    third: ['home'],
};

/**
 * The batter's "source base" for advancement matching. null when the play puts
 * the batter out (sac fly/bunt or a generic out result).
 */
const batterSourceBase = (hitResult: string): AdvanceTarget | 'home' | null => {
    switch (hitResult) {
        case 'home_run':
            return 'home';
        case 'triple':
            return 'third';
        case 'double':
            return 'second';
        case 'single':
        case 'walk':
        case 'hit_by_pitch':
        case 'strikeout_dropped':
        case 'fielders_choice':
            return 'first';
        default:
            return null;
    }
};

/**
 * Greedy left-to-right match of base-runner sources (leading first) to
 * destinations (home counts × runsScored, then 3rd/2nd/1st in newRunners).
 * Each source picks the leading-most available destination ≥ its starting base.
 */
const matchAdvancements = (
    currentRunners: BaseRunners,
    hitResult: string,
    newRunners: BaseRunners,
    runsScored: number
): Array<{ fromBase: RunnerOrigin; toBase: AdvanceTarget }> => {
    const sources: RunnerOrigin[] = [];
    if (currentRunners.third) sources.push('third');
    if (currentRunners.second) sources.push('second');
    if (currentRunners.first) sources.push('first');
    if (batterSourceBase(hitResult) !== null) sources.push('batter');

    const destinations: AdvanceTarget[] = [];
    for (let i = 0; i < runsScored; i++) destinations.push('home');
    if (newRunners.third) destinations.push('third');
    if (newRunners.second) destinations.push('second');
    if (newRunners.first) destinations.push('first');

    const advancements: Array<{ fromBase: RunnerOrigin; toBase: AdvanceTarget }> = [];
    const taken = new Set<number>();
    for (const src of sources) {
        const minOrder = src === 'batter' ? BASE_ORDER.first : BASE_ORDER[src];
        let bestIdx = -1;
        for (let i = 0; i < destinations.length; i++) {
            if (taken.has(i)) continue;
            const destOrder = BASE_ORDER[destinations[i]];
            if (destOrder < minOrder) continue;
            if (bestIdx === -1 || BASE_ORDER[destinations[i]] > BASE_ORDER[destinations[bestIdx]]) {
                bestIdx = i;
            }
        }
        if (bestIdx !== -1) {
            advancements.push({ fromBase: src, toBase: destinations[bestIdx] });
            taken.add(bestIdx);
        }
    }
    return advancements;
};

const computeExtraAdvancements = (
    currentRunners: BaseRunners,
    hitResult: string,
    newRunners: BaseRunners,
    runsScored: number
): ErrorAdvancement[] => {
    const actual = matchAdvancements(currentRunners, hitResult, newRunners, runsScored);
    const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(currentRunners, hitResult);
    const suggested = matchAdvancements(currentRunners, hitResult, suggestedRunners, suggestedRuns);
    const suggestedByFrom = new Map(suggested.map((s) => [s.fromBase, s.toBase]));

    return actual.filter((adv) => {
        const sugDest = suggestedByFrom.get(adv.fromBase);
        if (!sugDest) return false;
        return BASE_ORDER[adv.toBase] > BASE_ORDER[sugDest];
    });
};

const advancementKey = (a: ErrorAdvancement) => `${a.fromBase}->${a.toBase}`;

/**
 * Modal for adjusting runner positions after a hit.
 * Shows suggested advancement based on hit type, allows manual base toggling,
 * and lets the user record any baserunners thrown out trying to advance on the
 * play (with putout/assist fielder sequence).
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
    const [showAddThrowout, setShowAddThrowout] = useState(false);
    const [draftFromBase, setDraftFromBase] = useState<RunnerBase | null>(null);
    const [draftToBase, setDraftToBase] = useState<ThrowoutTargetBase | null>(null);
    const [draftFielderSeq, setDraftFielderSeq] = useState<number[]>([]);
    const [errorFlags, setErrorFlags] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (visible) {
            const suggestion = getSuggestedAdvancement(currentRunners, hitResult);
            setNewRunners(suggestion.suggestedRunners);
            setRunsScored(suggestion.suggestedRuns);
            setThrowouts([]);
            setShowAddThrowout(false);
            setDraftFromBase(null);
            setDraftToBase(null);
            setDraftFielderSeq([]);
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

    const getHitLabel = (result: string): string => {
        switch (result) {
            case 'single':
                return 'Single';
            case 'double':
                return 'Double';
            case 'triple':
                return 'Triple';
            case 'home_run':
                return 'Home Run';
            case 'walk':
                return 'Walk';
            case 'hit_by_pitch':
                return 'Hit By Pitch';
            case 'sacrifice_fly':
                return 'Sacrifice Fly';
            case 'sacrifice_bunt':
                return 'Sacrifice Bunt';
            case 'fielders_choice':
                return "Fielder's Choice";
            case 'strikeout_dropped':
                return 'Dropped 3rd Strike';
            default:
                return result;
        }
    };

    const runnersOnBefore = (currentRunners.first ? 1 : 0) + (currentRunners.second ? 1 : 0) + (currentRunners.third ? 1 : 0);

    const usedFromBases = new Set(throwouts.map((t) => t.fromBase));
    const availableFromBases: RunnerBase[] = (['first', 'second', 'third'] as RunnerBase[]).filter(
        (b) => currentRunners[b] && !usedFromBases.has(b)
    );
    const validTargets = draftFromBase ? VALID_TARGETS[draftFromBase] : [];
    const canAddThrowout = draftFromBase != null && draftToBase != null && draftFielderSeq.length > 0;

    const resetDraft = () => {
        setDraftFromBase(null);
        setDraftToBase(null);
        setDraftFielderSeq([]);
    };

    const handleAddThrowout = () => {
        if (!canAddThrowout) return;
        setThrowouts((prev) => [
            ...prev,
            { fromBase: draftFromBase as RunnerBase, toBase: draftToBase as ThrowoutTargetBase, fielderSeq: draftFielderSeq },
        ]);
        resetDraft();
        setShowAddThrowout(false);
    };

    const handleRemoveThrowout = (index: number) => {
        setThrowouts((prev) => prev.filter((_, i) => i !== index));
    };

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

                    {/* Before state */}
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={styles.sectionTitle}>
                            Before ({runnersOnBefore} on base)
                        </Text>
                        <BaseRunnerDiamond runners={currentRunners} size={80} disabled />
                    </View>

                    {/* After state - adjustable */}
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={styles.sectionTitle}>
                            After (tap bases to adjust)
                        </Text>
                        <BaseRunnerDiamond runners={newRunners} size={100} onBasePress={toggleBase} />
                        <View style={styles.baseToggles}>
                            <Chip
                                selected={newRunners.first}
                                onPress={() => toggleBase('first')}
                                style={[styles.baseChip, newRunners.first && styles.baseChipActive]}
                                textStyle={newRunners.first ? styles.baseChipActiveText : undefined}
                            >
                                1st
                            </Chip>
                            <Chip
                                selected={newRunners.second}
                                onPress={() => toggleBase('second')}
                                style={[styles.baseChip, newRunners.second && styles.baseChipActive]}
                                textStyle={newRunners.second ? styles.baseChipActiveText : undefined}
                            >
                                2nd
                            </Chip>
                            <Chip
                                selected={newRunners.third}
                                onPress={() => toggleBase('third')}
                                style={[styles.baseChip, newRunners.third && styles.baseChipActive]}
                                textStyle={newRunners.third ? styles.baseChipActiveText : undefined}
                            >
                                3rd
                            </Chip>
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

                    {/* Throwouts */}
                    {(runnersOnBefore > 0 || throwouts.length > 0) && (
                        <View style={styles.throwoutSection}>
                            <Text variant="titleSmall" style={styles.sectionTitle}>
                                Runners thrown out advancing
                            </Text>
                            {throwouts.length > 0 && (
                                <View style={styles.throwoutList}>
                                    {throwouts.map((t, idx) => (
                                        <View key={idx} style={[styles.throwoutRow, { backgroundColor: theme.colors.surface }]}>
                                            <Text variant="bodySmall" style={styles.throwoutText}>
                                                {FROM_BASE_LABEL[t.fromBase]} → out at {TO_BASE_LABEL[t.toBase]} (
                                                {formatFielderSequence(t.fielderSeq)})
                                            </Text>
                                            <IconButton
                                                icon="close"
                                                size={16}
                                                onPress={() => handleRemoveThrowout(idx)}
                                                accessibilityLabel="Remove throwout"
                                                style={styles.removeThrowout}
                                            />
                                        </View>
                                    ))}
                                </View>
                            )}

                            {!showAddThrowout && availableFromBases.length > 0 && (
                                <Button mode="outlined" compact onPress={() => setShowAddThrowout(true)} style={styles.addButton}>
                                    + Add throwout
                                </Button>
                            )}

                            {showAddThrowout && (
                                <View style={styles.addForm}>
                                    <Divider style={styles.divider} />
                                    <View style={styles.formRow}>
                                        <Text style={styles.formLabel}>From:</Text>
                                        <View style={styles.formChips}>
                                            {availableFromBases.map((b) => (
                                                <Chip
                                                    key={b}
                                                    selected={draftFromBase === b}
                                                    onPress={() => {
                                                        setDraftFromBase(b);
                                                        setDraftToBase(null);
                                                    }}
                                                    style={[styles.draftChip, draftFromBase === b && styles.draftChipActive]}
                                                    textStyle={draftFromBase === b ? styles.draftChipActiveText : undefined}
                                                >
                                                    {FROM_BASE_LABEL[b]}
                                                </Chip>
                                            ))}
                                        </View>
                                    </View>
                                    {draftFromBase && (
                                        <View style={styles.formRow}>
                                            <Text style={styles.formLabel}>Out at:</Text>
                                            <View style={styles.formChips}>
                                                {validTargets.map((b) => (
                                                    <Chip
                                                        key={b}
                                                        selected={draftToBase === b}
                                                        onPress={() => setDraftToBase(b)}
                                                        style={[styles.draftChip, draftToBase === b && styles.draftChipActive]}
                                                        textStyle={draftToBase === b ? styles.draftChipActiveText : undefined}
                                                    >
                                                        {TO_BASE_LABEL[b]}
                                                    </Chip>
                                                ))}
                                            </View>
                                        </View>
                                    )}
                                    {draftFromBase && draftToBase && (
                                        <View style={styles.formRowColumn}>
                                            <Text style={styles.formLabel}>Fielders:</Text>
                                            <FielderSequencePicker value={draftFielderSeq} onChange={setDraftFielderSeq} />
                                        </View>
                                    )}
                                    <View style={styles.formActions}>
                                        <Button
                                            mode="outlined"
                                            compact
                                            onPress={() => {
                                                resetDraft();
                                                setShowAddThrowout(false);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button mode="contained" compact onPress={handleAddThrowout} disabled={!canAddThrowout}>
                                            Add
                                        </Button>
                                    </View>
                                </View>
                            )}
                        </View>
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
    modalContainer: {
        margin: 20,
        borderRadius: 12,
        maxHeight: '90%',
    },
    scrollContent: {
        padding: 20,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    hitChip: {
        alignSelf: 'center',
        marginBottom: 16,
        backgroundColor: colors.primary[100],
    },
    hitChipText: {
        color: colors.primary[700],
        fontWeight: '600',
    },
    section: {
        marginBottom: 16,
        alignItems: 'center',
    },
    sectionTitle: {
        fontWeight: '600',
        marginBottom: 8,
        color: colors.gray[600],
    },
    baseToggles: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    baseChip: {
        backgroundColor: colors.gray[100],
    },
    baseChipActive: {
        backgroundColor: colors.green[100],
    },
    baseChipActiveText: {
        color: colors.green[700],
    },
    runsSection: {
        marginBottom: 16,
        alignItems: 'center',
    },
    runsControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    runsCount: {
        fontWeight: 'bold',
        minWidth: 40,
        textAlign: 'center',
    },
    throwoutSection: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: colors.gray[50],
        borderRadius: 8,
    },
    throwoutList: {
        gap: 6,
        marginBottom: 8,
    },
    throwoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    throwoutText: {
        flex: 1,
        color: colors.gray[800],
    },
    removeThrowout: {
        margin: 0,
    },
    addButton: {
        alignSelf: 'flex-start',
    },
    addForm: {
        gap: 12,
    },
    divider: {
        marginTop: 4,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    formRowColumn: {
        gap: 8,
    },
    formLabel: {
        fontSize: 12,
        color: colors.gray[600],
        fontWeight: '600',
        minWidth: 56,
    },
    formChips: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
        flex: 1,
    },
    draftChip: {
        backgroundColor: colors.gray[100],
    },
    draftChipActive: {
        backgroundColor: colors.red[100],
    },
    draftChipActiveText: {
        color: colors.red[700],
    },
    formActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    errorSection: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: colors.yellow[50],
        borderRadius: 8,
    },
    errorHint: {
        color: colors.gray[600],
        marginBottom: 8,
    },
    errorList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    errorChip: {
        backgroundColor: colors.gray[100],
    },
    errorChipActive: {
        backgroundColor: colors.yellow[200],
    },
    errorChipActiveText: {
        color: colors.yellow[800],
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

export default RunnerAdvancementModal;
