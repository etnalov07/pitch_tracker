import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { Button, Chip, Text, useTheme } from 'react-native-paper';

import type {
    PitcherEffectiveness,
    PitcherReportPayload,
    PitcherReportPitchTypeRow,
    PitcherReportVerdict,
    PitcherReportWindow,
    PitcherReportZoneRow,
    PitcherTrendCallout,
    VelocityTrendPoint,
} from '@pitch-tracker/shared';

import { analyticsApi } from '../../../src/state/analytics/api/analyticsApi';

const WINDOWS: { value: PitcherReportWindow; label: string }[] = [
    { value: 'last5', label: '5' },
    { value: 'last10', label: '10' },
    { value: 'last20', label: '20' },
    { value: 'season', label: 'Season' },
    { value: 'all', label: 'All' },
];

const NARRATIVE_POLL_INTERVAL_MS = 3000;
const NARRATIVE_POLL_MAX_ATTEMPTS = 10;

export default function PitcherReportScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [windowOpt, setWindowOpt] = useState<PitcherReportWindow>('last10');
    const [payload, setPayload] = useState<PitcherReportPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [regenerating, setRegenerating] = useState(false);
    const pollAttemptsRef = useRef(0);

    const loadReport = useCallback(
        async (w: PitcherReportWindow) => {
            if (!id) return;
            try {
                setLoading(true);
                setError(null);
                const data = await analyticsApi.getPitcherReport(id, w);
                setPayload(data);
                pollAttemptsRef.current = 0;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load report');
            } finally {
                setLoading(false);
            }
        },
        [id]
    );

    useEffect(() => {
        loadReport(windowOpt);
    }, [loadReport, windowOpt]);

    // Poll for narrative when missing.
    useEffect(() => {
        if (!payload || payload.narrative || !id) return;
        if (pollAttemptsRef.current >= NARRATIVE_POLL_MAX_ATTEMPTS) return;
        const timer = setTimeout(async () => {
            pollAttemptsRef.current += 1;
            try {
                const fresh = await analyticsApi.getPitcherReport(id, windowOpt);
                setPayload(fresh);
            } catch {
                /* swallow; next poll retries */
            }
        }, NARRATIVE_POLL_INTERVAL_MS);
        return () => clearTimeout(timer);
    }, [payload, id, windowOpt]);

    const handleRegenerate = async () => {
        if (!id) return;
        try {
            setRegenerating(true);
            const fresh = await analyticsApi.regeneratePitcherReportNarrative(id, windowOpt);
            setPayload(fresh);
            pollAttemptsRef.current = 0;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to regenerate');
        } finally {
            setRegenerating(false);
        }
    };

    if (loading && !payload) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Text style={styles.muted}>Loading report…</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.muted, { color: theme.colors.error }]}>{error}</Text>
            </SafeAreaView>
        );
    }

    if (!payload) return null;
    const hasGames = payload.stats.games_included > 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Button mode="text" compact onPress={() => router.back()} icon="arrow-left">
                    Back
                </Button>
                <View style={{ flex: 1 }}>
                    <Text variant="titleLarge">{payload.pitcher_name}</Text>
                    <Text variant="bodySmall" style={styles.muted}>
                        Performance Report · {payload.window_label}
                    </Text>
                </View>
            </View>

            <View style={styles.windowRow}>
                {WINDOWS.map((w) => (
                    <Chip
                        key={w.value}
                        selected={w.value === windowOpt}
                        onPress={() => setWindowOpt(w.value)}
                        compact
                        style={[styles.windowChip, w.value === windowOpt && { backgroundColor: theme.colors.primary }]}
                        textStyle={w.value === windowOpt ? { color: '#ffffff' } : undefined}
                    >
                        {w.label}
                    </Chip>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {!hasGames ? (
                    <View style={[styles.card, styles.empty]}>
                        <Text style={styles.muted}>No game data yet in this window.</Text>
                    </View>
                ) : (
                    <>
                        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.cardHeader}>
                                <Text variant="titleMedium">Coach's Summary</Text>
                                <Button mode="outlined" compact onPress={handleRegenerate} disabled={regenerating}>
                                    {regenerating ? 'Regen…' : 'Regenerate'}
                                </Button>
                            </View>
                            <Text style={[styles.narrative, !payload.narrative && styles.muted]}>
                                {payload.narrative
                                    ? payload.narrative
                                    : pollAttemptsRef.current >= NARRATIVE_POLL_MAX_ATTEMPTS
                                      ? 'Narrative still generating — tap Regenerate or check back.'
                                      : 'Generating summary…'}
                            </Text>
                        </View>

                        <StatTiles payload={payload} theme={theme} />

                        {payload.velocity_trend && payload.velocity_trend.length > 0 && (
                            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Velocity Trend
                                </Text>
                                <VelocityChart points={payload.velocity_trend} primary={theme.colors.primary} />
                            </View>
                        )}

                        {payload.trends.length > 0 && (
                            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Recent Trends
                                </Text>
                                {payload.trends.map((t, i) => (
                                    <TrendRow key={`${t.kind}-${i}`} trend={t} />
                                ))}
                            </View>
                        )}

                        {payload.stats.pitch_types.length > 0 && (
                            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Pitch Arsenal
                                </Text>
                                <PitchTypeTable rows={payload.stats.pitch_types} />
                            </View>
                        )}

                        {payload.stats.zones.length > 0 && (
                            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Zone Effectiveness
                                </Text>
                                <ZoneTable rows={payload.stats.zones} />
                            </View>
                        )}

                        {id && (
                            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Pitch Effectiveness vs Handedness
                                </Text>
                                <PitchEffectivenessSection pitcherId={id} theme={theme} />
                            </View>
                        )}

                        {payload.games.length > 0 && (
                            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Game Log
                                </Text>
                                <GameLogTable rows={payload.games} onRowPress={(gid) => router.push(`/game/${gid}` as any)} />
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Subcomponents ---

function StatTiles({ payload, theme }: { payload: PitcherReportPayload; theme: { colors: { surface: string } } }) {
    const tiles: { label: string; value: string }[] = [
        { label: 'Games', value: String(payload.stats.games_included) },
        { label: 'Pitches', value: String(payload.stats.total_pitches) },
        { label: 'Strike %', value: `${payload.stats.strike_pct}%` },
        { label: 'Command', value: payload.stats.target_accuracy_pct != null ? `${payload.stats.target_accuracy_pct}%` : '—' },
        { label: 'BF', value: String(payload.stats.batters_faced) },
        { label: 'IP', value: String(payload.stats.innings_pitched) },
        {
            label: '1st-Pitch K%',
            value: payload.stats.first_pitch_strike_pct != null ? `${payload.stats.first_pitch_strike_pct}%` : '—',
        },
        { label: '3-Ball %', value: payload.stats.three_ball_rate != null ? `${payload.stats.three_ball_rate}%` : '—' },
    ];
    return (
        <View style={styles.tilesGrid}>
            {tiles.map((t) => (
                <View key={t.label} style={[styles.tile, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="titleLarge">{t.value}</Text>
                    <Text style={[styles.tileLabel, styles.muted]}>{t.label}</Text>
                </View>
            ))}
        </View>
    );
}

function VelocityChart({ points, primary }: { points: VelocityTrendPoint[]; primary: string }) {
    const W = 320;
    const H = 140;
    const PAD = 28;
    const innerW = W - PAD * 2;
    const innerH = H - PAD * 2;
    const xs = points.map((_, i) => (points.length === 1 ? PAD + innerW / 2 : PAD + (i / (points.length - 1)) * innerW));
    const allVelos = points.flatMap((p) => [p.avg_velocity, p.top_velocity]);
    const minV = Math.min(...allVelos);
    const maxV = Math.max(...allVelos);
    const pad = Math.max(1, (maxV - minV) * 0.15);
    const yMin = Math.floor(minV - pad);
    const yMax = Math.ceil(maxV + pad);
    const yScale = (v: number) => PAD + innerH - ((v - yMin) / Math.max(yMax - yMin, 1)) * innerH;
    const buildPath = (key: 'avg_velocity' | 'top_velocity') =>
        points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${yScale(p[key]).toFixed(1)}`).join(' ');
    return (
        <View>
            <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
                <SvgText x={4} y={PAD} fill="#888" fontSize={10}>
                    {String(yMax)}
                </SvgText>
                <SvgText x={4} y={H - PAD} fill="#888" fontSize={10}>
                    {String(yMin)}
                </SvgText>
                <Path d={buildPath('avg_velocity')} stroke={primary} strokeWidth={2} fill="none" />
                <Path d={buildPath('top_velocity')} stroke="#a78bfa" strokeWidth={1.5} fill="none" strokeDasharray="4,4" />
                {points.map((p, i) => (
                    <React.Fragment key={p.game_id}>
                        <Circle cx={xs[i]} cy={yScale(p.avg_velocity)} r={3} fill={primary} />
                        <Circle cx={xs[i]} cy={yScale(p.top_velocity)} r={2} fill="#a78bfa" />
                    </React.Fragment>
                ))}
            </Svg>
            <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: primary }]} />
                <Text style={styles.muted}>avg</Text>
                <View style={[styles.legendDot, { backgroundColor: '#a78bfa', marginLeft: 12 }]} />
                <Text style={styles.muted}>top</Text>
            </View>
        </View>
    );
}

function TrendRow({ trend }: { trend: PitcherTrendCallout }) {
    const arrow = trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '—';
    const color = trend.direction === 'up' ? '#22c55e' : trend.direction === 'down' ? '#ef4444' : '#a78bfa';
    return (
        <View style={styles.trendRow}>
            <Text style={[styles.trendArrow, { color }]}>{arrow}</Text>
            <Text style={{ flex: 1 }}>{trend.copy}</Text>
        </View>
    );
}

function PitchTypeTable({ rows }: { rows: PitcherReportPitchTypeRow[] }) {
    return (
        <View>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.5 }]}>Type</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>#</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>K%</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Whiff</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Velo</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.2 }]}>Verdict</Text>
            </View>
            {rows.map((r) => (
                <View key={r.pitch_type} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>{r.pitch_type}</Text>
                    <Text style={styles.tableCell}>{r.count}</Text>
                    <Text style={styles.tableCell}>{r.strike_pct}%</Text>
                    <Text style={styles.tableCell}>{r.whiff_pct}%</Text>
                    <Text style={styles.tableCell}>{r.avg_velocity != null ? r.avg_velocity : '—'}</Text>
                    <View style={[styles.tableCell, { flex: 1.2 }]}>
                        <SuccessTag success={r.success} />
                    </View>
                </View>
            ))}
        </View>
    );
}

function ZoneTable({ rows }: { rows: PitcherReportZoneRow[] }) {
    return (
        <View>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Zone</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>#</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>K%</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Whiff</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Hard</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.2 }]}>Verdict</Text>
            </View>
            {rows.map((r) => (
                <View key={r.zone} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{r.zone}</Text>
                    <Text style={styles.tableCell}>{r.count}</Text>
                    <Text style={styles.tableCell}>{r.strike_pct}%</Text>
                    <Text style={styles.tableCell}>{r.whiff_pct}%</Text>
                    <Text style={styles.tableCell}>{r.hard_contact_pct}%</Text>
                    <View style={[styles.tableCell, { flex: 1.2 }]}>
                        <SuccessTag success={r.success} hitLabel />
                    </View>
                </View>
            ))}
        </View>
    );
}

function GameLogTable({ rows, onRowPress }: { rows: PitcherReportPayload['games']; onRowPress: (gameId: string) => void }) {
    return (
        <View>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.2 }]}>Date</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.5 }]}>Opponent</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>P</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>K%</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Velo</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>R/H</Text>
            </View>
            {rows.map((r) => (
                <View key={r.game_id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1.2 }]} onPress={() => onRowPress(r.game_id)}>
                        {new Date(r.game_date).toLocaleDateString()}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]} onPress={() => onRowPress(r.game_id)}>
                        {r.opponent_name ?? '—'}
                    </Text>
                    <Text style={styles.tableCell} onPress={() => onRowPress(r.game_id)}>
                        {r.pitches}
                    </Text>
                    <Text style={styles.tableCell} onPress={() => onRowPress(r.game_id)}>
                        {r.strike_pct}%
                    </Text>
                    <Text style={styles.tableCell} onPress={() => onRowPress(r.game_id)}>
                        {r.avg_velocity != null ? r.avg_velocity : '—'}
                    </Text>
                    <Text style={styles.tableCell} onPress={() => onRowPress(r.game_id)}>
                        {r.runs_allowed}/{r.hits_allowed}
                    </Text>
                </View>
            ))}
        </View>
    );
}

function SuccessTag({ success, hitLabel = false }: { success: PitcherReportVerdict; hitLabel?: boolean }) {
    // 'low_sample' = not enough pitches to draw a meaningful verdict; render
    // a neutral muted tag so coaches don't read into a 1-of-2 strike rate.
    const bg = success === 'works' ? '#22c55e' : success === 'mixed' ? '#a78bfa' : success === 'low_sample' ? '#9ca3af' : '#ef4444';
    const label =
        success === 'low_sample'
            ? 'Low N'
            : success === 'works'
              ? 'Working'
              : success === 'mixed'
                ? 'Mixed'
                : hitLabel
                  ? 'Hit'
                  : 'Struggles';
    return (
        <View style={[styles.successTag, { backgroundColor: bg }]}>
            <Text style={styles.successTagText}>{label}</Text>
        </View>
    );
}

function formatPitchType(t: string): string {
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function pctColor(pct: number, n: number): string {
    if (n < 15) return '#9ca3af';
    if (pct >= 70) return '#16a34a';
    if (pct >= 60) return '#d97706';
    if (pct < 50) return '#dc2626';
    return '#6b7280';
}

function PitchEffectivenessSection({ pitcherId, theme }: { pitcherId: string; theme: { colors: { surface: string } } }) {
    const [dataL, setDataL] = useState<PitcherEffectiveness | null>(null);
    const [dataR, setDataR] = useState<PitcherEffectiveness | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pitcherId) return;
        let cancelled = false;
        setLoading(true);
        Promise.all([
            analyticsApi.getPitcherEffectiveness(pitcherId, 'L', 'career'),
            analyticsApi.getPitcherEffectiveness(pitcherId, 'R', 'career'),
        ])
            .then(([l, r]) => {
                if (cancelled) return;
                setDataL(l);
                setDataR(r);
                setError(null);
            })
            .catch(() => {
                if (!cancelled) setError('Failed to load effectiveness');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [pitcherId]);

    if (loading) return <Text style={styles.muted}>Loading…</Text>;
    if (error) return <Text style={styles.muted}>{error}</Text>;

    const types = new Map<string, number>();
    for (const p of dataL?.pitch_types ?? []) types.set(p.pitch_type, (types.get(p.pitch_type) ?? 0) + p.n);
    for (const p of dataR?.pitch_types ?? []) types.set(p.pitch_type, (types.get(p.pitch_type) ?? 0) + p.n);
    const pitchTypes = Array.from(types.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([pt]) => pt);

    if (pitchTypes.length === 0) {
        return <Text style={styles.muted}>Not enough pitches yet to compute effectiveness.</Text>;
    }

    return (
        <View style={effStyles.table}>
            <View style={effStyles.headerRow}>
                <Text style={[effStyles.cellHead, effStyles.colPitch]}>Pitch</Text>
                <Text style={[effStyles.cellHead, effStyles.colPct]}>vs LHH</Text>
                <Text style={[effStyles.cellHead, effStyles.colPct]}>vs RHH</Text>
                <Text style={[effStyles.cellHead, effStyles.colZone]}>Best zone</Text>
            </View>
            {pitchTypes.map((pt) => {
                const l = dataL?.pitch_types.find((x) => x.pitch_type === pt);
                const r = dataR?.pitch_types.find((x) => x.pitch_type === pt);
                const best =
                    (l?.best_zone_id && (l.n ?? 0) >= (r?.n ?? 0) ? l.best_zone_id : r?.best_zone_id) ??
                    l?.best_zone_id ??
                    r?.best_zone_id ??
                    '—';
                return (
                    <View key={pt} style={[effStyles.row, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[effStyles.cell, effStyles.colPitch]}>{formatPitchType(pt)}</Text>
                        <View style={[effStyles.colPct, effStyles.pctCell]}>
                            <Text style={{ color: pctColor(l?.strike_pct ?? 0, l?.n ?? 0), fontWeight: '600' }}>
                                {l && l.n >= 5 ? `${l.strike_pct}%` : '—'}
                            </Text>
                            <Text style={effStyles.sampleText}>{l?.n ? `n=${l.n}` : ''}</Text>
                        </View>
                        <View style={[effStyles.colPct, effStyles.pctCell]}>
                            <Text style={{ color: pctColor(r?.strike_pct ?? 0, r?.n ?? 0), fontWeight: '600' }}>
                                {r && r.n >= 5 ? `${r.strike_pct}%` : '—'}
                            </Text>
                            <Text style={effStyles.sampleText}>{r?.n ? `n=${r.n}` : ''}</Text>
                        </View>
                        <Text style={[effStyles.cell, effStyles.colZone]}>{best}</Text>
                    </View>
                );
            })}
        </View>
    );
}

const effStyles = StyleSheet.create({
    table: { width: '100%' },
    headerRow: {
        flexDirection: 'row',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.2)',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.1)',
    },
    cellHead: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', opacity: 0.6 },
    cell: { fontSize: 13 },
    colPitch: { flex: 2 },
    colPct: { flex: 1.5, alignItems: 'center' },
    colZone: { flex: 1, textAlign: 'right', fontSize: 12 },
    pctCell: { alignItems: 'center', justifyContent: 'center' },
    sampleText: { fontSize: 10, opacity: 0.5 },
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.25)',
    },
    windowRow: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexWrap: 'wrap',
    },
    windowChip: {},
    content: {
        padding: 12,
        gap: 12,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.2)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    narrative: { fontSize: 14, lineHeight: 20 },
    sectionTitle: { marginBottom: 8 },
    tilesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tile: {
        flexBasis: '23%',
        flexGrow: 1,
        minWidth: 75,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.2)',
    },
    tileLabel: {
        marginTop: 2,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    muted: { opacity: 0.7 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    trendArrow: { fontSize: 16, fontWeight: '700', minWidth: 18 },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.12)',
    },
    tableHeaderRow: { borderBottomColor: 'rgba(128,128,128,0.25)' },
    tableCell: { flex: 1, fontSize: 12 },
    tableHeaderText: { fontWeight: '700', opacity: 0.7, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
    successTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' },
    successTagText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
    empty: { alignItems: 'center', justifyContent: 'center', minHeight: 120 },
});
