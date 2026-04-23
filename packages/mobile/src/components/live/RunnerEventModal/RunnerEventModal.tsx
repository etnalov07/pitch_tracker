import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, Button, Chip, useTheme } from 'react-native-paper';
import { BaseRunners, RunnerBase, BaserunnerEventType, getSuggestedAdvancement } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

type AdvancementEventType = 'stolen_base' | 'wild_pitch' | 'passed_ball' | 'balk';
type OutEventType = 'caught_stealing' | 'pickoff' | 'interference' | 'passed_runner' | 'appeal_out' | 'other';

interface RunnerEventModalProps {
    visible: boolean;
    onDismiss: () => void;
    runners: BaseRunners;
    currentOuts: number;
    onRecordAdvancement: (
        eventType: AdvancementEventType,
        fromBase: RunnerBase,
        newRunners: BaseRunners,
        runsScored: number,
        runnerToBase?: RunnerBase | 'home'
    ) => void;
    onRecordOut: (eventType: BaserunnerEventType, runnerBase: RunnerBase) => void;
    defaultTab?: 'advance' | 'out';
}

const ADVANCEMENT_EVENTS: { type: AdvancementEventType; label: string; short: string }[] = [
    { type: 'stolen_base', label: 'Stolen Base', short: 'SB' },
    { type: 'wild_pitch', label: 'Wild Pitch', short: 'WP' },
    { type: 'passed_ball', label: 'Passed Ball', short: 'PB' },
    { type: 'balk', label: 'Balk', short: 'BLK' },
];

const OUT_EVENTS: { type: OutEventType; label: string }[] = [
    { type: 'caught_stealing', label: 'Caught Stealing' },
    { type: 'pickoff', label: 'Pickoff' },
    { type: 'interference', label: 'Interference' },
    { type: 'appeal_out', label: 'Appeal Out' },
    { type: 'passed_runner', label: 'Passed Runner' },
    { type: 'other', label: 'Other' },
];

const BASE_LABELS: { base: RunnerBase; label: string; next: RunnerBase | 'home' }[] = [
    { base: 'first', label: '1st', next: 'second' },
    { base: 'second', label: '2nd', next: 'third' },
    { base: 'third', label: '3rd', next: 'home' },
];

const DiamondToggle: React.FC<{
    runners: BaseRunners;
    onToggle: (base: RunnerBase) => void;
    disabled?: boolean;
    label?: string;
}> = ({ runners, onToggle, disabled, label }) => (
    <View style={diamondStyles.wrapper}>
        {label && <Text style={diamondStyles.label}>{label}</Text>}
        <View style={diamondStyles.container}>
            <TouchableOpacity
                style={[diamondStyles.base, diamondStyles.second, runners.second && diamondStyles.occupied]}
                onPress={() => !disabled && onToggle('second')}
                disabled={disabled}
            >
                <Text style={diamondStyles.baseText}>2</Text>
            </TouchableOpacity>
            <View style={diamondStyles.middleRow}>
                <TouchableOpacity
                    style={[diamondStyles.base, diamondStyles.third, runners.third && diamondStyles.occupied]}
                    onPress={() => !disabled && onToggle('third')}
                    disabled={disabled}
                >
                    <Text style={diamondStyles.baseText}>3</Text>
                </TouchableOpacity>
                <View style={diamondStyles.homeBase} />
                <TouchableOpacity
                    style={[diamondStyles.base, diamondStyles.first, runners.first && diamondStyles.occupied]}
                    onPress={() => !disabled && onToggle('first')}
                    disabled={disabled}
                >
                    <Text style={diamondStyles.baseText}>1</Text>
                </TouchableOpacity>
            </View>
            <View style={[diamondStyles.base, diamondStyles.home, { opacity: 0.4 }]}>
                <Text style={diamondStyles.baseText}>H</Text>
            </View>
        </View>
    </View>
);

const diamondStyles = StyleSheet.create({
    wrapper: { alignItems: 'center' },
    label: { fontSize: 11, color: colors.gray[500], marginBottom: 4, fontWeight: '600' },
    container: { alignItems: 'center', gap: 2 },
    middleRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
    base: {
        width: 32,
        height: 32,
        borderRadius: 4,
        backgroundColor: colors.gray[200],
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '45deg' }],
    },
    occupied: { backgroundColor: colors.primary[500] },
    second: {},
    third: {},
    first: {},
    home: {},
    homeBase: { width: 32 },
    baseText: { transform: [{ rotate: '-45deg' }], fontSize: 11, fontWeight: '700', color: '#fff' },
});

const RunnerEventModal: React.FC<RunnerEventModalProps> = ({
    visible,
    onDismiss,
    runners,
    currentOuts,
    onRecordAdvancement,
    onRecordOut,
    defaultTab = 'advance',
}) => {
    const theme = useTheme();
    const [tab, setTab] = useState<'advance' | 'out'>(defaultTab);

    // Advance tab state
    const [advEventType, setAdvEventType] = useState<AdvancementEventType | null>(null);
    const [sbFromBase, setSbFromBase] = useState<RunnerBase | null>(null);
    const [afterRunners, setAfterRunners] = useState<BaseRunners>({ first: false, second: false, third: false });
    const [runsScored, setRunsScored] = useState(0);

    // Out tab state
    const [outEventType, setOutEventType] = useState<OutEventType | null>(null);
    const [outBase, setOutBase] = useState<RunnerBase | null>(null);

    const occupiedBases = BASE_LABELS.filter((b) => runners[b.base]);
    const hasRunners = occupiedBases.length > 0;

    useEffect(() => {
        if (!visible) return;
        setTab(defaultTab);
        resetAdvance();
        resetOut();
    }, [visible, defaultTab]);

    useEffect(() => {
        if (!advEventType) return;
        if (advEventType === 'stolen_base') {
            setAfterRunners({ ...runners });
            setRunsScored(0);
        } else {
            const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(runners, advEventType);
            setAfterRunners(suggestedRunners);
            setRunsScored(suggestedRuns);
        }
        setSbFromBase(null);
    }, [advEventType]);

    const resetAdvance = () => {
        setAdvEventType(null);
        setSbFromBase(null);
        setAfterRunners({ first: false, second: false, third: false });
        setRunsScored(0);
    };

    const resetOut = () => {
        setOutEventType(null);
        setOutBase(null);
    };

    const handleToggleAfterBase = (base: RunnerBase) => {
        setAfterRunners((prev) => ({ ...prev, [base]: !prev[base] }));
    };

    const handleSbFromBase = (base: RunnerBase) => {
        setSbFromBase(base);
        const nextBase = BASE_LABELS.find((b) => b.base === base)?.next;
        const newRunners = { ...runners, [base]: false };
        if (nextBase && nextBase !== 'home') newRunners[nextBase] = true;
        const runs = nextBase === 'home' ? 1 : 0;
        setAfterRunners(newRunners);
        setRunsScored(runs);
    };

    const handleConfirmAdvance = () => {
        if (!advEventType) return;
        const fromBase = advEventType === 'stolen_base' ? sbFromBase : (occupiedBases[0]?.base ?? 'first');
        if (!fromBase) return;
        const toBase = BASE_LABELS.find((b) => b.base === fromBase)?.next;
        onRecordAdvancement(
            advEventType,
            fromBase as RunnerBase,
            afterRunners,
            runsScored,
            toBase as RunnerBase | 'home' | undefined
        );
        onDismiss();
    };

    const handleConfirmOut = () => {
        if (!outEventType || !outBase) return;
        onRecordOut(outEventType, outBase);
        onDismiss();
    };

    const canConfirmAdvance = advEventType !== null && (advEventType !== 'stolen_base' || sbFromBase !== null);

    const canConfirmOut = outEventType !== null && outBase !== null && currentOuts < 3;

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
            >
                {/* Tab bar */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, tab === 'advance' && styles.tabActive]}
                        onPress={() => {
                            setTab('advance');
                            resetAdvance();
                        }}
                    >
                        <Text style={[styles.tabText, tab === 'advance' && styles.tabTextActive]}>Advance</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, tab === 'out' && styles.tabActiveRed]}
                        onPress={() => {
                            setTab('out');
                            resetOut();
                        }}
                    >
                        <Text style={[styles.tabText, tab === 'out' && styles.tabTextActiveRed]}>Runner Out</Text>
                    </TouchableOpacity>
                </View>

                {tab === 'advance' && (
                    <View>
                        {/* Event type chips */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Event</Text>
                            <View style={styles.chipRow}>
                                {ADVANCEMENT_EVENTS.map((e) => (
                                    <Chip
                                        key={e.type}
                                        selected={advEventType === e.type}
                                        onPress={() => setAdvEventType(e.type)}
                                        style={[styles.chip, advEventType === e.type && { backgroundColor: colors.green[100] }]}
                                        textStyle={advEventType === e.type ? { color: colors.green[700] } : undefined}
                                    >
                                        {e.short}
                                    </Chip>
                                ))}
                            </View>
                        </View>

                        {advEventType === 'stolen_base' && (
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

                        {advEventType && advEventType !== 'stolen_base' && (
                            <View style={styles.diamondSection}>
                                <DiamondToggle runners={runners} onToggle={() => {}} disabled label="Before" />
                                <Text style={styles.arrow}>→</Text>
                                <DiamondToggle runners={afterRunners} onToggle={handleToggleAfterBase} label="After" />
                            </View>
                        )}

                        {advEventType && runsScored > 0 && (
                            <Text style={styles.runsText}>
                                +{runsScored} run{runsScored > 1 ? 's' : ''} scored
                            </Text>
                        )}

                        <View style={styles.actions}>
                            <Button mode="outlined" onPress={onDismiss}>
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleConfirmAdvance}
                                disabled={!canConfirmAdvance}
                                buttonColor={colors.green[600]}
                            >
                                Confirm
                            </Button>
                        </View>
                    </View>
                )}

                {tab === 'out' && (
                    <View>
                        {currentOuts >= 2 && (
                            <Text style={[styles.warning, { color: colors.yellow[700] }]}>
                                Recording this out will end the inning
                            </Text>
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
                                        selected={outEventType === e.type}
                                        onPress={() => setOutEventType(e.type as OutEventType)}
                                        style={[styles.eventChip, outEventType === e.type && { backgroundColor: colors.red[100] }]}
                                        textStyle={outEventType === e.type ? { color: colors.red[700] } : undefined}
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
                            <Button
                                mode="contained"
                                onPress={handleConfirmOut}
                                disabled={!canConfirmOut}
                                buttonColor={colors.red[500]}
                            >
                                Record Out
                            </Button>
                        </View>
                    </View>
                )}
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
    tabBar: {
        flexDirection: 'row',
        borderRadius: 8,
        backgroundColor: colors.gray[100],
        marginBottom: 16,
        padding: 3,
    },
    tab: {
        flex: 1,
        paddingVertical: 7,
        alignItems: 'center',
        borderRadius: 6,
    },
    tabActive: { backgroundColor: colors.green[500] },
    tabActiveRed: { backgroundColor: colors.red[500] },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.gray[600] },
    tabTextActive: { color: '#fff' },
    tabTextActiveRed: { color: '#fff' },
    section: { marginBottom: 14 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.gray[500], marginBottom: 6, textTransform: 'uppercase' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipColumn: { gap: 8 },
    chip: {},
    eventChip: {},
    diamondSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 14,
    },
    arrow: { fontSize: 20, color: colors.gray[400] },
    runsText: { textAlign: 'center', color: colors.green[700], fontWeight: '600', marginBottom: 10 },
    warning: { fontSize: 12, marginBottom: 10 },
    empty: { color: colors.gray[400], fontStyle: 'italic' },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
});

export default RunnerEventModal;
