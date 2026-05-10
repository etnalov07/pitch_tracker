import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Modal, useTheme } from 'react-native-paper';
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
    const theme = useTheme();
    const [batterHand, setBatterHand] = useState<'L' | 'R'>(initialBatterHand);
    const [data, setData] = useState<PitcherTendenciesLive | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!visible || !pitcherId) return;
        setLoading(true);
        setError(false);
        analyticsApi
            .getPitcherLiveTendencies(pitcherId, batterHand)
            .then((d) => {
                setData(d);
                setError(false);
            })
            .catch(() => {
                setData(null);
                setError(true);
            })
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
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Pitcher Tendencies</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{pitcherName}</Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.closeBtnText, { color: theme.colors.onSurface }]}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Handedness toggle */}
            <View style={styles.handRow}>
                {(['L', 'R'] as const).map((hand) => (
                    <TouchableOpacity
                        key={hand}
                        onPress={() => setBatterHand(hand)}
                        style={[
                            styles.handBtn,
                            { backgroundColor: theme.colors.surface },
                            batterHand === hand && styles.handBtnActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.handBtnText,
                                { color: theme.colors.onSurfaceVariant },
                                batterHand === hand && styles.handBtnTextActive,
                            ]}
                        >
                            vs. {hand}HH
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {loading && <ActivityIndicator style={{ marginVertical: 24 }} />}

                {!loading && error && (
                    <View style={styles.noData}>
                        <Text style={styles.noDataText}>Unable to load tendencies. Check connection and try again.</Text>
                    </View>
                )}

                {!loading && !error && data && !data.has_data && (
                    <View style={styles.noData}>
                        <Text style={styles.noDataText}>
                            Insufficient data — fewer than 10 pitches recorded vs. {batterHand}HH batters.
                        </Text>
                    </View>
                )}

                {!loading && !error && data && data.has_data && (
                    <>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                            PITCH MIX vs. {batterHand}HH ({data.total_pitches} pitches)
                        </Text>
                        {data.pitch_mix.map((p) => (
                            <View key={p.pitch_type} style={styles.mixRow}>
                                <Text style={[styles.mixType, { color: theme.colors.onSurfaceVariant }]}>{p.pitch_type}</Text>
                                <View style={[styles.mixBarBg, { backgroundColor: theme.colors.background }]}>
                                    <View style={[styles.mixBar, { width: `${p.usage_pct}%` }]} />
                                </View>
                                <Text style={[styles.mixPct, { color: theme.colors.onSurfaceVariant }]}>{p.usage_pct}%</Text>
                                <Text style={[styles.mixStats, { color: theme.colors.onSurfaceVariant }]}>
                                    {p.strike_pct}%K {p.whiff_pct}%W
                                    {p.avg_velocity ? ` ${p.avg_velocity}` : ''}
                                </Text>
                            </View>
                        ))}

                        <Text style={[styles.sectionTitle, { marginTop: 16, color: theme.colors.onSurfaceVariant }]}>
                            ZONE TENDENCIES (usage %)
                        </Text>
                        <TendencyZoneGrid cells={zoneGridCells} />

                        <Text style={[styles.sectionTitle, { marginTop: 16, color: theme.colors.onSurfaceVariant }]}>
                            SUGGESTED SEQUENCE
                        </Text>
                        <SuggestedSequence sequence={data.suggested_sequence} />
                    </>
                )}
            </ScrollView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
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
    subtitle: { fontSize: 13, marginTop: 2 },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: { fontSize: 14 },
    handRow: { flexDirection: 'row', gap: 8, padding: 12 },
    handBtn: {
        paddingVertical: 5,
        paddingHorizontal: 14,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    handBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    handBtnText: { fontSize: 13, fontWeight: '600' },
    handBtnTextActive: { color: 'white' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingTop: 4 },
    noData: { padding: 20, backgroundColor: '#fefce8', borderRadius: 8 },
    noDataText: { color: '#854d0e', fontSize: 13, textAlign: 'center' },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    mixRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    mixType: { width: 64, fontSize: 11, textTransform: 'capitalize' },
    mixBarBg: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
    mixBar: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 6 },
    mixPct: { width: 28, fontSize: 11, textAlign: 'right' },
    mixStats: { width: 80, fontSize: 10 },
});

export default PitcherTendenciesModal;
