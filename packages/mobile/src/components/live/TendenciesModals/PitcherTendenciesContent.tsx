// Body of the Pitcher Tendencies surface — owns data fetching, handedness
// toggle, and rendering. Used inside PitcherTendenciesModal AND inline in
// the tablet side-by-side LiveGameTablet panel (UX-TD-11).
//
// The handedness toggle is exposed via the `toolbar` render-prop pattern so
// the modal can mount it under the header, and the tablet panel can mount it
// at the top of the side rail.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import { PitcherTendenciesLive } from '@pitch-tracker/shared';

import { analyticsApi } from '../../../state/analytics/api/analyticsApi';
import { colors, semantic } from '../../../styles/theme';

import SuggestedSequence from './SuggestedSequence';
import TendencyZoneGrid from './TendencyZoneGrid';

interface PitcherTendenciesContentProps {
    pitcherId: string;
    initialBatterHand: 'L' | 'R';
    /** Render-prop for the handedness toggle. Callers (modal vs. tablet panel) wrap it
     *  differently. The function is called with the toggle element so the caller
     *  can mount it where it makes sense in its own layout. */
    renderToolbar?: (toolbar: React.ReactNode) => React.ReactNode;
}

export const PitcherTendenciesContent: React.FC<PitcherTendenciesContentProps> = ({
    pitcherId,
    initialBatterHand,
    renderToolbar,
}) => {
    const theme = useTheme();
    const [batterHand, setBatterHand] = useState<'L' | 'R'>(initialBatterHand);
    const [data, setData] = useState<PitcherTendenciesLive | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!pitcherId) return;
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
    }, [pitcherId, batterHand]);

    const zoneGridCells =
        data?.zone_grid.map((z) => ({
            zone: z.zone,
            value: z.usage_pct / 100,
            displayValue: `${z.usage_pct}%`,
            count: z.count,
        })) || [];

    const toolbar = (
        <View style={styles.handRow}>
            {(['L', 'R'] as const).map((hand) => (
                <TouchableOpacity
                    key={hand}
                    onPress={() => setBatterHand(hand)}
                    style={[styles.handBtn, { backgroundColor: theme.colors.surface }, batterHand === hand && styles.handBtnActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: batterHand === hand }}
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
    );

    return (
        <>
            {renderToolbar ? renderToolbar(toolbar) : toolbar}

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
        </>
    );
};

const styles = StyleSheet.create({
    handRow: { flexDirection: 'row', gap: 8, padding: 12 },
    handBtn: {
        paddingVertical: 5,
        paddingHorizontal: 14,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.gray[300],
    },
    handBtnActive: { backgroundColor: colors.blue[700], borderColor: colors.blue[700] },
    handBtnText: { fontSize: 13, fontWeight: '600' },
    handBtnTextActive: { color: 'white' },
    noData: { padding: 20, backgroundColor: semantic.warningBg, borderRadius: 8 },
    noDataText: { color: semantic.warningText, fontSize: 13, textAlign: 'center' },
    sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
    mixRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    mixType: { width: 64, fontSize: 11, textTransform: 'capitalize' },
    mixBarBg: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
    mixBar: { height: '100%', backgroundColor: colors.blue[500], borderRadius: 6 },
    mixPct: { width: 28, fontSize: 11, textAlign: 'right' },
    mixStats: { width: 80, fontSize: 10 },
});

export default PitcherTendenciesContent;
