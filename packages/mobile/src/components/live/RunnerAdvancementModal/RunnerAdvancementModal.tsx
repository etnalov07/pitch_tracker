import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Button, Chip, useTheme, IconButton } from 'react-native-paper';
import { BaseRunners, getSuggestedAdvancement } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';
import BaseRunnerDiamond from '../BaseRunnerDiamond';

interface RunnerAdvancementModalProps {
    visible: boolean;
    onDismiss: () => void;
    currentRunners: BaseRunners;
    hitResult: string;
    onConfirm: (newRunners: BaseRunners, runsScored: number) => void;
}

/**
 * Modal for adjusting runner positions after a hit.
 * Shows suggested advancement based on hit type, but allows manual adjustment
 * to handle extra-base advancement (e.g., first-to-third on a single).
 */
const RunnerAdvancementModal: React.FC<RunnerAdvancementModalProps> = ({
    visible,
    onDismiss,
    currentRunners,
    hitResult,
    onConfirm,
}) => {
    const theme = useTheme();

    // Get initial suggested advancement
    const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(currentRunners, hitResult);

    // State for adjusted positions
    const [newRunners, setNewRunners] = useState<BaseRunners>(suggestedRunners);
    const [runsScored, setRunsScored] = useState(suggestedRuns);

    // Reset when modal opens with new data
    useEffect(() => {
        if (visible) {
            const suggestion = getSuggestedAdvancement(currentRunners, hitResult);
            setNewRunners(suggestion.suggestedRunners);
            setRunsScored(suggestion.suggestedRuns);
        }
    }, [visible, currentRunners, hitResult]);

    const toggleBase = (base: 'first' | 'second' | 'third') => {
        setNewRunners((prev) => ({
            ...prev,
            [base]: !prev[base],
        }));
    };

    const incrementRuns = () => {
        setRunsScored((prev) => prev + 1);
    };

    const decrementRuns = () => {
        setRunsScored((prev) => Math.max(0, prev - 1));
    };

    const handleConfirm = () => {
        onConfirm(newRunners, runsScored);
        onDismiss();
    };

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
            case 'fielders_choice':
                return "Fielder's Choice";
            default:
                return result;
        }
    };

    // Calculate how many runners were on base before
    const runnersOnBefore =
        (currentRunners.first ? 1 : 0) + (currentRunners.second ? 1 : 0) + (currentRunners.third ? 1 : 0);

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
            >
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

                {/* Actions */}
                <View style={styles.actions}>
                    <Button mode="outlined" onPress={onDismiss} style={styles.button}>
                        Cancel
                    </Button>
                    <Button mode="contained" onPress={handleConfirm} style={styles.button}>
                        Confirm
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
