import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Text, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
    useAppDispatch,
    useAppSelector,
    fetchPerformanceSummary,
    fetchBatterBreakdown,
    regenerateNarrative,
    clearPerformanceSummary,
} from '../../../src/state';
import { PerformanceSummaryView } from '../../../src/components/performanceSummary';
import { PerformanceSummary } from '@pitch-tracker/shared';

const NARRATIVE_POLL_INTERVAL_MS = 3000;
const NARRATIVE_POLL_MAX_ATTEMPTS = 10;

function buildSummaryHtml(summary: PerformanceSummary): string {
    const pitchRows = summary.pitch_type_breakdown
        .sort((a, b) => b.count - a.count)
        .map(
            (pt) => `
      <tr>
        <td>${pt.pitch_type.charAt(0).toUpperCase() + pt.pitch_type.slice(1)}</td>
        <td>${pt.count}</td>
        <td>${pt.strike_percentage}%</td>
        <td>${pt.avg_velocity != null ? `${Math.round(pt.avg_velocity)}` : '-'}</td>
        <td>${pt.top_velocity != null ? `${pt.top_velocity}` : '-'}</td>
        <td class="rating-${pt.rating}">${pt.rating === 'highlight' ? 'Good' : pt.rating === 'concern' ? 'Needs Work' : '-'}</td>
      </tr>`
        )
        .join('');

    const metricRows = summary.metrics
        .map(
            (m) => `
      <tr>
        <td>${m.metric_name}</td>
        <td class="rating-${m.rating}">${m.value}%${m.delta_from_avg != null ? ` (${m.delta_from_avg > 0 ? '+' : ''}${m.delta_from_avg}%)` : ''}</td>
      </tr>`
        )
        .join('');

    const highlights = summary.highlights.map((h) => `<li>${h}</li>`).join('');
    const concerns = summary.concerns.map((c) => `<li>${c}</li>`).join('');

    const statsHtml = [
        `<div class="stat"><div class="stat-val">${summary.total_pitches}</div><div class="stat-lbl">Pitches</div></div>`,
        `<div class="stat"><div class="stat-val green">${summary.strikes}</div><div class="stat-lbl">Strikes</div></div>`,
        `<div class="stat"><div class="stat-val gray">${summary.balls}</div><div class="stat-lbl">Balls</div></div>`,
        `<div class="stat"><div class="stat-val blue">${summary.strike_percentage}%</div><div class="stat-lbl">Strike %</div></div>`,
        summary.target_accuracy_percentage != null
            ? `<div class="stat"><div class="stat-val purple">${summary.target_accuracy_percentage}%</div><div class="stat-lbl">Accuracy</div></div>`
            : '',
        summary.batters_faced != null
            ? `<div class="stat"><div class="stat-val">${summary.batters_faced}</div><div class="stat-lbl">Batters</div></div>`
            : '',
        summary.innings_pitched != null
            ? `<div class="stat"><div class="stat-val">${summary.innings_pitched}</div><div class="stat-lbl">Innings</div></div>`
            : '',
    ].join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1f2937; font-size: 14px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
  .section { margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .section-title { font-size: 15px; font-weight: 700; padding: 10px 14px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .section-body { padding: 14px; }
  .stats { display: flex; flex-wrap: wrap; gap: 16px; }
  .stat { text-align: center; min-width: 56px; }
  .stat-val { font-size: 24px; font-weight: 700; }
  .stat-lbl { font-size: 10px; color: #9ca3af; text-transform: uppercase; }
  .green { color: #22c55e; } .gray { color: #6b7280; } .blue { color: #3b82f6; } .purple { color: #8b5cf6; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
  td { padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
  .rating-highlight { color: #16a34a; font-weight: 600; }
  .rating-concern { color: #dc2626; font-weight: 600; }
  .narrative { font-style: italic; line-height: 1.7; color: #374151; }
  ul { margin: 0; padding-left: 20px; }
  li { margin-bottom: 4px; line-height: 1.6; }
  .highlights .section-title { color: #16a34a; }
  .concerns .section-title { color: #dc2626; }
  .footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 11px; }
</style>
</head>
<body>
<h1>Performance Summary</h1>
<div class="subtitle">Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>

${
    summary.narrative
        ? `<div class="section">
  <div class="section-title">Coach Summary</div>
  <div class="section-body"><p class="narrative">${summary.narrative}</p></div>
</div>`
        : ''
}

<div class="section">
  <div class="section-title">Key Stats</div>
  <div class="section-body"><div class="stats">${statsHtml}</div></div>
</div>

${
    metricRows
        ? `<div class="section">
  <div class="section-title">Performance Metrics</div>
  <div class="section-body">
    <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${metricRows}</tbody></table>
  </div>
</div>`
        : ''
}

${
    pitchRows
        ? `<div class="section">
  <div class="section-title">Pitch Type Breakdown</div>
  <div class="section-body">
    <table><thead><tr><th>Type</th><th>#</th><th>K%</th><th>Avg Vel</th><th>Top Vel</th><th>Rating</th></tr></thead><tbody>${pitchRows}</tbody></table>
  </div>
</div>`
        : ''
}

${
    highlights
        ? `<div class="section highlights">
  <div class="section-title">Highlights</div>
  <div class="section-body"><ul>${highlights}</ul></div>
</div>`
        : ''
}

${
    concerns
        ? `<div class="section concerns">
  <div class="section-title">Areas to Improve</div>
  <div class="section-body"><ul>${concerns}</ul></div>
</div>`
        : ''
}

<div class="footer">PitchChart</div>
</body>
</html>`;
}

export default function GamePerformanceSummaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const [regenerating, setRegenerating] = useState(false);
    const [exporting, setExporting] = useState(false);
    const pollAttemptsRef = useRef(0);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { currentSummary, batterBreakdown, loading, error } = useAppSelector((state) => state.performanceSummary);

    useEffect(() => {
        if (id) {
            dispatch(fetchPerformanceSummary({ sourceType: 'game', sourceId: id }));
            dispatch(fetchBatterBreakdown(id));
        }
        return () => {
            dispatch(clearPerformanceSummary());
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
    }, [id, dispatch]);

    // Poll until narrative arrives when it's initially absent
    useEffect(() => {
        if (!currentSummary || currentSummary.narrative) {
            pollAttemptsRef.current = 0;
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
            return;
        }
        if (pollAttemptsRef.current >= NARRATIVE_POLL_MAX_ATTEMPTS) return;
        pollTimerRef.current = setTimeout(() => {
            pollAttemptsRef.current += 1;
            if (id) dispatch(fetchPerformanceSummary({ sourceType: 'game', sourceId: id }));
        }, NARRATIVE_POLL_INTERVAL_MS);
        return () => {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
    }, [currentSummary, id, dispatch]);

    const handleRegenerate = async () => {
        if (!currentSummary) return;
        setRegenerating(true);
        await dispatch(regenerateNarrative(currentSummary.id));
        if (id) await dispatch(fetchPerformanceSummary({ sourceType: 'game', sourceId: id }));
        setRegenerating(false);
    };

    const handleExport = async () => {
        if (!currentSummary) return;
        setExporting(true);
        try {
            const html = buildSummaryHtml(currentSummary);
            const { uri } = await Print.printToFileAsync({ html, base64: false });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Performance Summary' });
            } else {
                Alert.alert('Sharing not available', 'PDF saved to: ' + uri);
            }
        } catch (err) {
            Alert.alert('Export failed', String(err));
        } finally {
            setExporting(false);
        }
    };

    if (loading && !currentSummary) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleLarge">Performance Summary</Text>
                    <View style={{ width: 48 }} />
                </View>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                </View>
            </SafeAreaView>
        );
    }

    if (!currentSummary) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleLarge">Performance Summary</Text>
                    <View style={{ width: 48 }} />
                </View>
                <View style={styles.centered}>
                    <Text variant="bodyLarge" style={{ color: '#6b7280', textAlign: 'center', marginBottom: 8 }}>
                        {error ? 'Failed to load summary' : 'No performance summary available for this game.'}
                    </Text>
                    {error && (
                        <Text variant="bodySmall" style={{ color: '#ef4444', textAlign: 'center', marginBottom: 16 }}>
                            {error}
                        </Text>
                    )}
                    <IconButton
                        icon="refresh"
                        onPress={() => id && dispatch(fetchPerformanceSummary({ sourceType: 'game', sourceId: id }))}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <Text variant="titleLarge">Performance Summary</Text>
                <IconButton icon="export-variant" onPress={handleExport} disabled={exporting} />
            </View>
            {exporting && (
                <View style={styles.exportingBanner}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.exportingText}>Generating PDF…</Text>
                </View>
            )}
            <PerformanceSummaryView
                summary={currentSummary}
                batterBreakdown={batterBreakdown}
                onRegenerate={handleRegenerate}
                regenerating={regenerating}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    exportingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1f2937',
        paddingVertical: 8,
    },
    exportingText: {
        color: '#ffffff',
        fontSize: 13,
    },
});
