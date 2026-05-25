// Throwouts sub-section of RunnerAdvancementModal — list of recorded
// throwouts + inline add-form. Owns the form's draft state so the parent
// modal doesn't carry it. Extracted as part of UX audit item E (UX-IP-09)
// to slim the main modal file.

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, IconButton, Text, useTheme } from 'react-native-paper';

import { BaseRunners, formatFielderSequence, RunnerBase } from '@pitch-tracker/shared';

import { colors } from '../../../styles/theme';
import FielderSequencePicker from '../FielderSequencePicker';
import { FROM_BASE_LABEL, TO_BASE_LABEL, type Throwout, type ThrowoutTargetBase, VALID_TARGETS } from './runnerAdvancementHelpers';

interface ThrowoutSectionProps {
    currentRunners: BaseRunners;
    throwouts: Throwout[];
    onAdd: (throwout: Throwout) => void;
    onRemove: (index: number) => void;
}

const ThrowoutSection: React.FC<ThrowoutSectionProps> = ({ currentRunners, throwouts, onAdd, onRemove }) => {
    const theme = useTheme();
    const [showAddThrowout, setShowAddThrowout] = useState(false);
    const [draftFromBase, setDraftFromBase] = useState<RunnerBase | null>(null);
    const [draftToBase, setDraftToBase] = useState<ThrowoutTargetBase | null>(null);
    const [draftFielderSeq, setDraftFielderSeq] = useState<number[]>([]);

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

    const handleAdd = () => {
        if (!canAddThrowout) return;
        onAdd({
            fromBase: draftFromBase as RunnerBase,
            toBase: draftToBase as ThrowoutTargetBase,
            fielderSeq: draftFielderSeq,
        });
        resetDraft();
        setShowAddThrowout(false);
    };

    return (
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
                                onPress={() => onRemove(idx)}
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
                        <Button mode="contained" compact onPress={handleAdd} disabled={!canAddThrowout}>
                            Add
                        </Button>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    throwoutSection: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: colors.gray[50],
        borderRadius: 8,
    },
    sectionTitle: {
        fontWeight: '600',
        marginBottom: 8,
        color: colors.gray[600],
    },
    throwoutList: { gap: 6, marginBottom: 8 },
    throwoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    throwoutText: { flex: 1, color: colors.gray[800] },
    removeThrowout: { margin: 0 },
    addButton: { alignSelf: 'flex-start' },
    addForm: { gap: 12 },
    divider: { marginTop: 4 },
    formRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    formRowColumn: { gap: 8 },
    formLabel: { fontSize: 12, color: colors.gray[600], fontWeight: '600', minWidth: 56 },
    formChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
    draftChip: { backgroundColor: colors.gray[100] },
    draftChipActive: { backgroundColor: colors.red[100] },
    draftChipActiveText: { color: colors.red[700] },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});

export default ThrowoutSection;
