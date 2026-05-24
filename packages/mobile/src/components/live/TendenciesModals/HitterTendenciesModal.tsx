import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Modal, Chip, useTheme } from 'react-native-paper';
import { HitterTendenciesLive } from '@pitch-tracker/shared';
import { analyticsApi } from '../../../state/analytics/api/analyticsApi';
import scoutingReportsApi, { LiveScoutingMatch } from '../../../state/scouting/api/scoutingReportsApi';
import { colors, semantic } from '../../../styles/theme';
import TendencyZoneGrid from './TendencyZoneGrid';
import SuggestedSequence from './SuggestedSequence';

interface HitterTendenciesModalProps {
    visible: boolean;
    onDismiss: () => void;
    batterId: string;
    batterName: string;
    batterType: 'team' | 'opponent';
    gameId?: string;
    jerseyNumber?: number | null;
}

const HitterTendenciesModal: React.FC<HitterTendenciesModalProps> = ({
    visible,
    onDismiss,
    batterId,
    batterName,
    batterType,
    gameId,
    jerseyNumber,
}) => {
    const theme = useTheme();
    const [data, setData] = useState<HitterTendenciesLive | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [scouting, setScouting] = useState<LiveScoutingMatch | null>(null);

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

    useEffect(() => {
        if (!visible || !gameId || batterType !== 'opponent' || !batterName) {
            setScouting(null);
            return;
        }
        scoutingReportsApi
            .getLiveMatch(gameId, batterName, jerseyNumber ?? null)
            .then(setScouting)
            .catch(() => setScouting(null));
    }, [visible, gameId, batterName, jerseyNumber, batterType]);

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
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Hitter Tendencies</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{batterName}</Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.closeBtnText, { color: theme.colors.onSurface }]}>✕</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {scouting && (
                    <View style={styles.scoutingBox}>
                        <Text style={styles.scoutingHeading}>📋 SCOUTING REPORT</Text>
                        {scouting.batter.notes ? (
                            <Text style={[styles.scoutingNotes, { color: theme.colors.onSurface }]}>{scouting.batter.notes}</Text>
                        ) : null}
                        {scouting.batter.pitch_vulnerabilities && scouting.batter.pitch_vulnerabilities.length > 0 && (
                            <View style={styles.scoutingChips}>
                                {scouting.batter.pitch_vulnerabilities.map((v) => (
                                    <Chip key={v} compact style={styles.scoutingChip}>
                                        {v.replace(/_/g, ' ')}
                                    </Chip>
                                ))}
                            </View>
                        )}
                        {scouting.batter.zone_weakness && Object.keys(scouting.batter.zone_weakness).length > 0 && (
                            <Text style={[styles.scoutingZones, { color: theme.colors.onSurfaceVariant }]}>
                                Pre-filled zone map:{' '}
                                {Object.entries(scouting.batter.zone_weakness)
                                    .filter(([, v]) => v !== 'neutral')
                                    .map(([id, v]) => `${id}=${v}`)
                                    .join(' · ') || 'none set'}
                            </Text>
                        )}
                    </View>
                )}

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
                                <View key={s.label} style={[styles.statBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                                    <Text style={styles.statValue}>{s.value}</Text>
                                    <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{s.label}</Text>
                                </View>
                            ))}
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                            ZONE WEAKNESS MAP (swing rate)
                        </Text>
                        <View style={styles.zoneRow}>
                            <TendencyZoneGrid cells={zoneGridCells} highColor={colors.red[500]} lowColor={colors.green[100]} />
                            <View style={styles.legend}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendSwatch, { backgroundColor: colors.red[500] }]} />
                                    <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>High swing</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View
                                        style={[
                                            styles.legendSwatch,
                                            { backgroundColor: colors.green[100], borderWidth: 1, borderColor: colors.gray[300] },
                                        ]}
                                    />
                                    <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>Low swing</Text>
                                </View>
                            </View>
                        </View>

                        {data.pitch_type_vulnerability.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { marginTop: 16, color: theme.colors.onSurfaceVariant }]}>
                                    PITCH VULNERABILITY (whiff %)
                                </Text>
                                {data.pitch_type_vulnerability.slice(0, 5).map((p) => (
                                    <View key={p.pitch_type} style={styles.vulnRow}>
                                        <Text style={[styles.vulnType, { color: theme.colors.onSurfaceVariant }]}>
                                            {p.pitch_type}
                                        </Text>
                                        <View style={[styles.vulnBarBg, { backgroundColor: theme.colors.background }]}>
                                            <View style={[styles.vulnBar, { width: `${p.whiff_pct}%` }]} />
                                        </View>
                                        <Text style={[styles.vulnPct, { color: theme.colors.onSurfaceVariant }]}>
                                            {p.whiff_pct}%
                                        </Text>
                                        <Text style={[styles.vulnN, { color: theme.colors.onSurfaceVariant }]}>
                                            n={p.times_seen}
                                        </Text>
                                    </View>
                                ))}
                            </>
                        )}

                        <Text style={[styles.sectionTitle, { marginTop: 16, color: theme.colors.onSurfaceVariant }]}>
                            SUGGESTED ATTACK SEQUENCE
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
        borderBottomColor: colors.gray[200],
    },
    title: { fontSize: 17, fontWeight: '700', color: colors.primary[900] },
    subtitle: { fontSize: 13, marginTop: 2 },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: { fontSize: 14 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16 },
    noData: { padding: 20, backgroundColor: semantic.warningBg, borderRadius: 8 },
    noDataText: { color: semantic.warningText, fontSize: 13, textAlign: 'center' },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statBox: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    statValue: { fontSize: 15, fontWeight: '700', color: colors.blue[700] },
    statLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    zoneRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    legend: { gap: 6, paddingTop: 4 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendSwatch: { width: 12, height: 12, borderRadius: 2 },
    legendText: { fontSize: 10 },
    vulnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    vulnType: { width: 64, fontSize: 11, textTransform: 'capitalize' },
    vulnBarBg: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
    vulnBar: { height: '100%', backgroundColor: colors.red[400], borderRadius: 6 },
    vulnPct: { width: 28, fontSize: 11, textAlign: 'right' },
    vulnN: { width: 36, fontSize: 10 },
    scoutingBox: {
        padding: 12,
        backgroundColor: semantic.infoBg,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: semantic.infoBorder,
    },
    scoutingHeading: {
        fontSize: 10,
        fontWeight: '700',
        color: semantic.infoText,
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    scoutingNotes: { fontSize: 13, marginBottom: 6 },
    scoutingZones: { fontSize: 11, marginTop: 4 },
    scoutingChips: { flexDirection: 'row', flexWrap: 'wrap' },
    scoutingChip: { marginRight: 4, marginBottom: 4 },
});

export default HitterTendenciesModal;
