import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Modal, Portal, Text, Button, useTheme } from 'react-native-paper';
import { BaseRunners, RunnerBase } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface DoublePlayModalProps {
    visible: boolean;
    onDismiss: () => void;
    runners: BaseRunners;
    currentOuts: number;
    onConfirm: (outRunners: RunnerBase[], batterReachesFirst: boolean) => void;
}

const BASE_LABELS: { base: RunnerBase; label: string }[] = [
    { base: 'first', label: '1st' },
    { base: 'second', label: '2nd' },
    { base: 'third', label: '3rd' },
];

const DiamondView: React.FC<{ runners: BaseRunners; batterAtFirst?: boolean; label?: string }> = ({
    runners,
    batterAtFirst,
    label,
}) => (
    <View style={diamondStyles.wrapper}>
        {label && <Text style={diamondStyles.label}>{label}</Text>}
        <View style={diamondStyles.container}>
            <View style={[diamondStyles.base, runners.second && diamondStyles.occupied]}>
                <Text style={diamondStyles.baseText}>2</Text>
            </View>
            <View style={diamondStyles.middleRow}>
                <View style={[diamondStyles.base, runners.third && diamondStyles.occupied]}>
                    <Text style={diamondStyles.baseText}>3</Text>
                </View>
                <View style={diamondStyles.homeBase} />
                <View
                    style={[
                        diamondStyles.base,
                        runners.first && diamondStyles.occupied,
                        !runners.first && batterAtFirst && diamondStyles.batter,
                    ]}
                >
                    <Text style={diamondStyles.baseText}>1</Text>
                </View>
            </View>
            <View style={[diamondStyles.base, { opacity: 0.3 }]}>
                <Text style={diamondStyles.baseText}>H</Text>
            </View>
        </View>
    </View>
);

const diamondStyles = StyleSheet.create({
    wrapper: { alignItems: 'center' },
    label: { fontSize: 11, color: colors.gray[500], marginBottom: 4, fontWeight: '600' },
    container: { alignItems: 'center', gap: 2 },
    middleRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    base: {
        width: 30,
        height: 30,
        borderRadius: 4,
        backgroundColor: colors.gray[200],
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '45deg' }],
    },
    occupied: { backgroundColor: colors.primary[500] },
    batter: { backgroundColor: colors.green[500] },
    homeBase: { width: 30 },
    baseText: { transform: [{ rotate: '-45deg' }], fontSize: 11, fontWeight: '700', color: '#fff' },
});

const DoublePlayModal: React.FC<DoublePlayModalProps> = ({ visible, onDismiss, runners, currentOuts, onConfirm }) => {
    const theme = useTheme();
    const [batterReachesFirst, setBatterReachesFirst] = useState(false);
    const [outRunners, setOutRunners] = useState<RunnerBase[]>([]);

    const occupiedBases = BASE_LABELS.filter((b) => runners[b.base]);

    useEffect(() => {
        if (!visible) return;
        setBatterReachesFirst(false);
        setOutRunners([]);
    }, [visible]);

    useEffect(() => {
        setOutRunners([]);
    }, [batterReachesFirst]);

    const toggleRunner = (base: RunnerBase) => {
        if (batterReachesFirst) {
            setOutRunners((prev) =>
                prev.includes(base) ? prev.filter((b) => b !== base) : prev.length < 2 ? [...prev, base] : prev
            );
        } else {
            setOutRunners((prev) => (prev.includes(base) ? [] : [base]));
        }
    };

    const afterRunners: BaseRunners = { ...runners };
    for (const base of outRunners) afterRunners[base] = false;

    const canConfirm = batterReachesFirst ? outRunners.length >= 2 : outRunners.length === 1;
    const willEndInning = currentOuts + 2 >= 3;

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
            >
                <Text style={styles.title}>Double Play</Text>

                {/* Batter reaches first toggle */}
                <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Batter reaches 1st</Text>
                    <Switch
                        value={batterReachesFirst}
                        onValueChange={setBatterReachesFirst}
                        trackColor={{ true: colors.primary[500] }}
                    />
                </View>

                {/* Runner selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{batterReachesFirst ? 'Runners out — select 2' : 'Runner out on bases'}</Text>
                    {occupiedBases.length === 0 ? (
                        <Text style={styles.empty}>No runners on base</Text>
                    ) : (
                        <View style={styles.chipRow}>
                            {occupiedBases.map((b) => (
                                <TouchableOpacity
                                    key={b.base}
                                    onPress={() => toggleRunner(b.base)}
                                    style={[styles.chip, outRunners.includes(b.base) && styles.chipSelected]}
                                >
                                    <Text style={[styles.chipText, outRunners.includes(b.base) && styles.chipTextSelected]}>
                                        {b.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Before / After diamond */}
                <View style={styles.diamondRow}>
                    <DiamondView runners={runners} label="Before" />
                    <Text style={styles.arrow}>→</Text>
                    <DiamondView runners={afterRunners} label="After" batterAtFirst={batterReachesFirst} />
                </View>

                {willEndInning && <Text style={styles.warning}>This double play will end the inning</Text>}

                <View style={styles.actions}>
                    <Button mode="outlined" onPress={onDismiss}>
                        Cancel
                    </Button>
                    <Button
                        mode="contained"
                        onPress={() => onConfirm(outRunners, batterReachesFirst)}
                        disabled={!canConfirm}
                        buttonColor={colors.red[500]}
                    >
                        Confirm DP
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
    title: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 16,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.gray[50],
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 16,
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.gray[700],
    },
    section: { marginBottom: 14 },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.gray[500],
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gray[300],
        backgroundColor: 'white',
    },
    chipSelected: {
        borderColor: colors.red[400],
        backgroundColor: colors.red[50],
    },
    chipText: { fontSize: 13, color: colors.gray[700] },
    chipTextSelected: { color: colors.red[700] },
    diamondRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 14,
    },
    arrow: { fontSize: 20, color: colors.gray[400] },
    warning: {
        fontSize: 13,
        color: colors.red[700],
        backgroundColor: colors.red[50],
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
    },
    empty: { color: colors.gray[400], fontStyle: 'italic', fontSize: 13 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
});

export default DoublePlayModal;
