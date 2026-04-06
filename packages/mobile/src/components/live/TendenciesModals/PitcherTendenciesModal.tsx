import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Modal } from 'react-native-paper';
import { PitcherTendenciesLive } from '@pitch-tracker/shared';
import { analyticsApi } from '../../../state/analytics/api/analyticsApi';
import TendencyZoneGrid from './TendencyZoneGrid';
import SuggestedSequence from './SuggestedSequence';

interface PitcherTendenciesModalProps {
    visible: boolean;
    onDismiss: () => void;
    pitcherId: string;
    pitcherName: string;
    initialBatterHand: 'L' | 'R';
}

const PitcherTendenciesModal: React.FC<PitcherTendenciesModalProps> = ({
    visible,
    onDismiss,
    pitcherId,
    pitcherName,
    initialBatterHand,
}) => {
    const [batterHand, setBatterHand] = useState<'L' | 'R'>(initialBatterHand);
    const [data, setData] = useState<PitcherTendenciesLive | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible || !pitcherId) return;
        setLoading(true);
        analyticsApi
            .getPitcherLiveTendencies(pitcherId, batterHand)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [visible, pitcherId, batterHand]);

    const zoneGridCells =
        data?.zone_grid.map((z) => ({
            zone: z.zone,
            value: z.usage_pct / 100,
            displayValue: `${z.usage_pct}%`,
            count: z.count,
        })) || [];

    return (
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Pitcher Tendencies</Text>
                    <Text style={styles.subtitle}>{pitcherName}</Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Handedness toggle */}
            <View style={styles.handRow}>
                {(['L', 'R'] as const).map((hand) => (
                    <TouchableOpacity
                        key={hand}
                        onPress={() => setBatterHand(hand)}
                        style={[styles.handBtn, batterHand === hand && styles.handBtnActive]}
                    >
                        <Text style={[styles.handBtnText, batterHand === hand && styles.handBtnTextActive]}>vs. {hand}HH</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {loading && <ActivityIndicator style={{ marginVertical: 24 }} />}

                {!loading && data && !data.has_data && (
                    <View style={styles.noData}>
                        <Text style={styles.noDataText}>
                            Insufficient data — fewer than 10 pitches recorded vs. {batterHand}HH batters.
                        </Text>
                    </View>
                )}

                {!loading && data && data.has_data && (
                    <>
                        <Text style={styles.sectionTitle}>
                            PITCH MIX vs. {batterHand}HH ({data.total_pitches} pitches)
                        </Text>
                        {data.pitch_mix.map((p) => (
                            <View key={p.pitch_type} style={styles.mixRow}>
                                <Text style={styles.mixType}>{p.pitch_type}</Text>
                                <View style={styles.mixBarBg}>
                                    <View style={[styles.mixBar, { width: `${p.usage_pct}%` }]} />
                                </View>
                                <Text style={styles.mixPct}>{p.usage_pct}%</Text>
                                <Text style={styles.mixStats}>
                                    {p.strike_pct}%K {p.whiff_pct}%W
                                    {p.avg_velocity ? ` ${p.avg_velocity}` : ''}
                                </Text>
                            </View>
                        ))}

                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>ZONE TENDENCIES (usage %)</Text>
                        <TendencyZoneGrid cells={zoneGridCells} />

                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>SUGGESTED SEQUENCE</Text>
                        <SuggestedSequence sequence={data.suggested_sequence} />
                    </>
                )}
            </ScrollView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
        backgroundColor: 'white',
        margin: 16,
        borderRadius: 12,
        maxHeight: '85%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: { fontSize: 17, fontWeight: '700', color: '#0B1F3A' },
    subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: { fontSize: 14, color: '#374151' },
    handRow: { flexDirection: 'row', gap: 8, padding: 12 },
    handBtn: {
        paddingVertical: 5,
        paddingHorizontal: 14,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: 'white',
    },
    handBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    handBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
    handBtnTextActive: { color: 'white' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingTop: 4 },
    noData: { padding: 20, backgroundColor: '#fefce8', borderRadius: 8 },
    noDataText: { color: '#854d0e', fontSize: 13, textAlign: 'center' },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9ca3af',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    mixRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    mixType: { width: 64, fontSize: 11, color: '#4b5563', textTransform: 'capitalize' },
    mixBarBg: { flex: 1, height: 12, backgroundColor: '#f3f4f6', borderRadius: 6, overflow: 'hidden' },
    mixBar: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 6 },
    mixPct: { width: 28, fontSize: 11, color: '#6b7280', textAlign: 'right' },
    mixStats: { width: 80, fontSize: 10, color: '#9ca3af' },
});

export default PitcherTendenciesModal;
