import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { PitchCallWithDetails, PITCH_CALL_LABELS, PITCH_CALL_ZONE_LABELS } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';
import { PITCH_TYPES } from '../CallPitchTypeGrid/CallPitchTypeGrid';

interface CallHistoryProps {
    calls: PitchCallWithDetails[];
    maxVisible?: number;
}

const RESULT_COLORS: Record<string, { bg: string; text: string }> = {
    strike: { bg: '#E6394620', text: '#E63946' },
    ball: { bg: '#3A86FF20', text: '#3A86FF' },
    foul: { bg: '#EAB30820', text: '#EAB308' },
    in_play: { bg: '#2EC4B620', text: '#2EC4B6' },
};

const CallHistory: React.FC<CallHistoryProps> = ({ calls, maxVisible = 8 }) => {
    // Show most recent first, limited
    const visibleCalls = [...calls].reverse().slice(0, maxVisible);

    if (visibleCalls.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.label}>CALL HISTORY</Text>
            <ScrollView style={styles.list} nestedScrollEnabled>
                {visibleCalls.map((call) => {
                    const pitchColor = PITCH_TYPES.find((p) => p.type === call.pitch_type)?.color || colors.gray[400];
                    const resultStyle = call.result ? RESULT_COLORS[call.result] : null;

                    return (
                        <View key={call.id} style={styles.row}>
                            <View style={[styles.pitchBadge, { borderColor: pitchColor }]}>
                                <Text style={[styles.pitchText, { color: pitchColor }]}>{call.pitch_type}</Text>
                            </View>
                            <Text style={styles.zoneText} numberOfLines={1}>
                                {PITCH_CALL_ZONE_LABELS[call.zone] || call.zone}
                            </Text>
                            {call.is_change && (
                                <View style={styles.changeBadge}>
                                    <Text style={styles.changeText}>CHG</Text>
                                </View>
                            )}
                            <View style={styles.spacer} />
                            {resultStyle && call.result ? (
                                <View style={[styles.resultBadge, { backgroundColor: resultStyle.bg }]}>
                                    <Text style={[styles.resultText, { color: resultStyle.text }]}>
                                        {call.result === 'in_play' ? 'IP' : call.result.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.pendingDot} />
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {},
    label: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.gray[400],
        letterSpacing: 1,
        marginBottom: 6,
    },
    list: {
        maxHeight: 200,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[800],
    },
    pitchBadge: {
        borderWidth: 1.5,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    pitchText: {
        fontSize: 12,
        fontWeight: '700',
    },
    zoneText: {
        fontSize: 12,
        color: colors.gray[300],
        flex: 1,
    },
    changeBadge: {
        backgroundColor: '#F5A62325',
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    changeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#F5A623',
        letterSpacing: 0.5,
    },
    spacer: {
        flex: 1,
    },
    resultBadge: {
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 28,
        alignItems: 'center',
    },
    resultText: {
        fontSize: 11,
        fontWeight: '700',
    },
    pendingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.gray[600],
    },
});

export default CallHistory;
