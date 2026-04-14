import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Modal } from 'react-native-paper';
import { HitterTendenciesLive } from '@pitch-tracker/shared';
import { analyticsApi } from '../../../state/analytics/api/analyticsApi';
import TendencyZoneGrid from './TendencyZoneGrid';
import SuggestedSequence from './SuggestedSequence';

interface HitterTendenciesModalProps {
    visible: boolean;
    onDismiss: () => void;
    batterId: string;
    batterName: string;
    batterType: 'team' | 'opponent';
}

const HitterTendenciesModal: React.FC<HitterTendenciesModalProps> = ({ visible, onDismiss, batterId, batterName, batterType }) => {
    const [data, setData] = useState<HitterTendenciesLive | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!visible || !batterId) return;
        setLoading(true);
        setError(false);
        analyticsApi
            .getHitterLiveTendencies(batterId, batterType)
            .then((d) => {
                setData(d);
                setError(false);
            })
            .catch(() => {
                setData(null);
                setError(true);
            })
            .finally(() => setLoading(false));
    }, [visible, batterId, batterType]);

    const zoneGridCells =
        data?.zone_weakness_map
            .filter((z) => z.count >= 1)
            .map((z) => ({
                zone: z.zone,
                value: z.swing_rate,
                displayValue: `${Math.round(z.swing_rate * 100)}%`,
                count: z.count,
            })) || [];

    const formatRate = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

    return (
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Hitter Tendencies</Text>
                    <Text style={styles.subtitle}>{batterName}</Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
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
                        <Text style={styles.noDataText}>No pitch history available for this batter.</Text>
                    </View>
                )}

                {!loading && !error && data && data.has_data && (
                    <>
                        {/* Quick stats */}
                        <View style={styles.statsRow}>
                            {[
                                { label: '1st pitch take', value: formatRate(data.first_pitch_take_rate) },
                                { label: '2-strike chase', value: formatRate(data.two_strike_chase_rate) },
                                { label: 'Total pitches', value: String(data.total_pitches) },
                            ].map((s) => (
                                <View key={s.label} style={styles.statBox}>
                                    <Text style={styles.statValue}>{s.value}</Text>
                                    <Text style={styles.statLabel}>{s.label}</Text>
                                </View>
                            ))}
                        </View>

                        <Text style={styles.sectionTitle}>ZONE WEAKNESS MAP (swing rate)</Text>
                        <View style={styles.zoneRow}>
                            <TendencyZoneGrid cells={zoneGridCells} highColor="#ef4444" lowColor="#dcfce7" />
                            <View style={styles.legend}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendSwatch, { backgroundColor: '#ef4444' }]} />
                                    <Text style={styles.legendText}>High swing</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View
                                        style={[
                                            styles.legendSwatch,
                                            { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#d1d5db' },
                                        ]}
                                    />
                                    <Text style={styles.legendText}>Low swing</Text>
                                </View>
                            </View>
                        </View>

                        {data.pitch_type_vulnerability.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>PITCH VULNERABILITY (whiff %)</Text>
                                {data.pitch_type_vulnerability.slice(0, 5).map((p) => (
                                    <View key={p.pitch_type} style={styles.vulnRow}>
                                        <Text style={styles.vulnType}>{p.pitch_type}</Text>
                                        <View style={styles.vulnBarBg}>
                                            <View style={[styles.vulnBar, { width: `${p.whiff_pct}%` }]} />
                                        </View>
                                        <Text style={styles.vulnPct}>{p.whiff_pct}%</Text>
                                        <Text style={styles.vulnN}>n={p.times_seen}</Text>
                                    </View>
                                ))}
                            </>
                        )}

                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>SUGGESTED ATTACK SEQUENCE</Text>
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
    scroll: { flex: 1 },
    scrollContent: { padding: 16 },
    noData: { padding: 20, backgroundColor: '#fefce8', borderRadius: 8 },
    noDataText: { color: '#854d0e', fontSize: 13, textAlign: 'center' },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statBox: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        alignItems: 'center',
    },
    statValue: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
    statLabel: { fontSize: 10, color: '#9ca3af', marginTop: 2, textAlign: 'center' },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9ca3af',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    zoneRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    legend: { gap: 6, paddingTop: 4 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendSwatch: { width: 12, height: 12, borderRadius: 2 },
    legendText: { fontSize: 10, color: '#6b7280' },
    vulnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    vulnType: { width: 64, fontSize: 11, color: '#4b5563', textTransform: 'capitalize' },
    vulnBarBg: { flex: 1, height: 12, backgroundColor: '#f3f4f6', borderRadius: 6, overflow: 'hidden' },
    vulnBar: { height: '100%', backgroundColor: '#f87171', borderRadius: 6 },
    vulnPct: { width: 28, fontSize: 11, color: '#6b7280', textAlign: 'right' },
    vulnN: { width: 36, fontSize: 10, color: '#9ca3af' },
});

export default HitterTendenciesModal;
