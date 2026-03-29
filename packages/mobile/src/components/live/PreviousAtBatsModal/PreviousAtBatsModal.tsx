import { AtBat, Pitch, PITCH_CALL_ZONE_LABELS, PitchCallZone } from '@pitch-tracker/shared';
import React, { useState } from 'react';
import { Modal, View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { colors } from '../../../styles/theme';

export interface CompletedAtBatEntry {
    atBat: AtBat;
    result: string;
    pitches: Pitch[];
}

interface Props {
    visible: boolean;
    onClose: () => void;
    batterName: string;
    completedAtBats: CompletedAtBatEntry[];
}

const PITCH_RESULT_LABELS: Record<string, string> = {
    ball: 'Ball',
    called_strike: 'Called Strike',
    swinging_strike: 'Swinging Strike',
    foul: 'Foul',
    in_play: 'In Play',
    hit_by_pitch: 'HBP',
};

const PITCH_RESULT_COLORS: Record<string, string> = {
    ball: colors.gray[400],
    called_strike: colors.green[600],
    swinging_strike: colors.red[500],
    foul: colors.yellow[600],
    in_play: colors.primary[600],
    hit_by_pitch: colors.primary[400],
};

const AT_BAT_RESULT_LABELS: Record<string, string> = {
    strikeout: 'Strikeout (K)',
    walk: 'Walk (BB)',
    single: 'Single',
    double: 'Double',
    triple: 'Triple',
    home_run: 'Home Run',
    out: 'Out',
    fielders_choice: "Fielder's Choice",
    error: 'Reached on Error',
    hit_by_pitch: 'Hit by Pitch',
    sacrifice_fly: 'Sacrifice Fly',
    sacrifice_bunt: 'Sacrifice Bunt',
    double_play: 'Double Play',
    triple_play: 'Triple Play',
};

const formatPitchType = (type: string): string => {
    const names: Record<string, string> = {
        fastball: 'FB',
        '2-seam': '2S',
        '4-seam': '4S',
        cutter: 'CUT',
        sinker: 'SNK',
        slider: 'SL',
        curveball: 'CB',
        changeup: 'CH',
        splitter: 'SPL',
        knuckleball: 'KN',
        screwball: 'SCR',
        other: 'OTH',
    };
    return names[type] || type.toUpperCase().slice(0, 3);
};

const AtBatAccordion: React.FC<{ entry: CompletedAtBatEntry; abNumber: number; defaultOpen?: boolean }> = ({
    entry,
    abNumber,
    defaultOpen = false,
}) => {
    const [expanded, setExpanded] = useState(defaultOpen);
    const resultLabel = AT_BAT_RESULT_LABELS[entry.result] || entry.result;

    return (
        <View style={styles.accordionItem}>
            <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
                <View style={styles.accordionHeaderLeft}>
                    <Text style={styles.abLabel}>AB #{abNumber}</Text>
                    <Text style={styles.abResult}>{resultLabel}</Text>
                </View>
                <Text style={styles.pitchCount}>{entry.pitches.length}p</Text>
                <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.accordionContent}>
                    {entry.pitches.map((pitch, idx) => (
                        <View key={pitch.id || idx} style={styles.pitchRow}>
                            <Text style={styles.pitchNum}>{idx + 1}</Text>
                            <Text style={styles.pitchType}>{formatPitchType(pitch.pitch_type)}</Text>
                            <Text style={styles.pitchTarget}>
                                {pitch.target_zone
                                    ? (PITCH_CALL_ZONE_LABELS[pitch.target_zone as PitchCallZone] ?? pitch.target_zone)
                                    : '—'}
                            </Text>
                            <View
                                style={[
                                    styles.resultBadge,
                                    { backgroundColor: PITCH_RESULT_COLORS[pitch.pitch_result] || colors.gray[400] },
                                ]}
                            >
                                <Text style={styles.resultBadgeText}>
                                    {PITCH_RESULT_LABELS[pitch.pitch_result] || pitch.pitch_result}
                                </Text>
                            </View>
                        </View>
                    ))}
                    <View style={styles.atBatResultRow}>
                        <Text style={styles.atBatResultLabel}>Result: </Text>
                        <Text style={styles.atBatResultValue}>{resultLabel}</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const PreviousAtBatsModal: React.FC<Props> = ({ visible, onClose, batterName, completedAtBats }) => {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Previous At-Bats</Text>
                            <Text style={styles.subtitle}>{batterName}</Text>
                        </View>
                        <IconButton icon="close" size={24} onPress={onClose} />
                    </View>

                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        {completedAtBats.length === 0 ? (
                            <Text style={styles.emptyText}>No previous at-bats</Text>
                        ) : (
                            completedAtBats.map((entry, idx) => (
                                <AtBatAccordion
                                    key={entry.atBat.id || idx}
                                    entry={entry}
                                    abNumber={idx + 1}
                                    defaultOpen={completedAtBats.length === 1}
                                />
                            ))
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[200],
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray[900],
    },
    subtitle: {
        fontSize: 14,
        color: colors.gray[500],
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 8,
    },
    emptyText: {
        textAlign: 'center',
        color: colors.gray[400],
        marginTop: 24,
    },
    accordionItem: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.gray[200],
        overflow: 'hidden',
        marginBottom: 8,
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: colors.gray[50],
    },
    accordionHeaderLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    abLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.gray[700],
    },
    abResult: {
        fontSize: 13,
        color: colors.gray[600],
    },
    pitchCount: {
        fontSize: 12,
        color: colors.gray[400],
        marginRight: 8,
    },
    chevron: {
        fontSize: 11,
        color: colors.gray[500],
    },
    accordionContent: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#ffffff',
        gap: 6,
    },
    pitchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    pitchNum: {
        width: 20,
        fontSize: 12,
        color: colors.gray[400],
        fontWeight: '600',
    },
    pitchType: {
        width: 38,
        fontSize: 12,
        fontWeight: '700',
        color: colors.gray[800],
    },
    pitchTarget: {
        flex: 1,
        fontSize: 12,
        color: colors.gray[600],
    },
    resultBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    resultBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#ffffff',
    },
    atBatResultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 8,
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: colors.gray[100],
    },
    atBatResultLabel: {
        fontSize: 13,
        color: colors.gray[500],
    },
    atBatResultValue: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.gray[800],
    },
});

export default PreviousAtBatsModal;
