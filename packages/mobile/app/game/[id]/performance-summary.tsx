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
import {
    PerformanceSummary,
    BatterBreakdown,
    PitchType,
    PitchResult,
    PitchCallZone,
    SummarySourceType,
} from '@pitch-tracker/shared';

const NARRATIVE_POLL_INTERVAL_MS = 3000;
const NARRATIVE_POLL_MAX_ATTEMPTS = 10;

const PITCH_ABBREV: Record<PitchType, string> = {
    fastball: 'FB',
    '2-seam': '2S',
    '4-seam': '4S',
    cutter: 'CT',
    sinker: 'SK',
    slider: 'SL',
    curveball: 'CB',
    changeup: 'CH',
    splitter: 'SP',
    knuckleball: 'KN',
    screwball: 'SC',
    other: 'OT',
};

const RESULT_STYLE: Record<PitchResult, { bg: string; color: string; label: string }> = {
    ball: { bg: '#dbeafe', color: '#1d4ed8', label: 'B' },
    called_strike: { bg: '#fee2e2', color: '#dc2626', label: 'K' },
    swinging_strike: { bg: '#dc2626', color: '#ffffff', label: 'SW' },
    foul: { bg: '#fef3c7', color: '#92400e', label: 'F' },
    in_play: { bg: '#dcfce7', color: '#166534', label: 'IP' },
    hit_by_pitch: { bg: '#f3e8ff', color: '#6d28d9', label: 'HBP' },
};

function buildMiniZoneHtml(zone: PitchCallZone | undefined, dotColor: string): string {
    if (!zone) return '';
    const isWaste = zone.startsWith('W-');
    let parsed: { row: number; col: number } | null = null;
    if (!isWaste) {
        const parts = zone.split('-');
        const row = parseInt(parts[0]);
        const col = parseInt(parts[1]);
        if (!isNaN(row) && !isNaN(col)) parsed = { row, col };
    }
    const cellSize = 7;
    const cells = [0, 1, 2]
        .map((row) =>
            [0, 1, 2]
                .map((col) => {
                    const active = parsed?.row === row && parsed?.col === col;
                    return `<td style="width:${cellSize}px;height:${cellSize}px;border:0.5px solid rgba(0,0,0,0.1);background:${active ? dotColor : 'rgba(255,255,255,0.35)'};padding:0;"></td>`;
                })
                .join('')
        )
        .map((row) => `<tr>${row}</tr>`)
        .join('');
    const wasteOverlay = isWaste
        ? `<div style="position:absolute;top:${cellSize}px;left:${cellSize}px;width:${cellSize}px;height:${cellSize}px;border-radius:50%;background:${dotColor};opacity:0.7;"></div>`
        : '';
    return `<div style="position:relative;display:inline-block;margin-top:2px;border:0.5px solid rgba(0,0,0,0.15);border-radius:2px;overflow:hidden;line-height:0;">
      <table style="border-collapse:collapse;width:${cellSize * 3}px;">${cells}</table>
      ${wasteOverlay}
    </div>`;
}

const POSITION_NUM: Record<string, number> = {
    P: 1,
    C: 2,
    '1B': 3,
    '2B': 4,
    '3B': 5,
    SS: 6,
    LF: 7,
    CF: 8,
    RF: 9,
};

function formatAtBatResultHtml(
    result: string | undefined,
    fieldedBy: string | undefined,
    pitches: { pitch_result: string }[]
): string {
    if (!result) return '—';
    const fn = fieldedBy ? (POSITION_NUM[fieldedBy] ?? null) : null;
    switch (result) {
        case 'strikeout': {
            const last = pitches[pitches.length - 1];
            if (last?.pitch_result === 'called_strike') {
                return '<span style="display:inline-block;transform:scaleX(-1);">K</span>';
            }
            return 'K';
        }
        case 'walk':
            return 'BB';
        case 'hit_by_pitch':
            return 'HBP';
        case 'single':
            return '1B';
        case 'double':
            return '2B';
        case 'triple':
            return '3B';
        case 'home_run':
            return 'HR';
        case 'groundout':
            if (fn === null) return 'GO';
            return fn === 3 ? '3U' : `${fn}-3`;
        case 'flyout':
            return fn !== null ? `F${fn}` : 'FO';
        case 'lineout':
            return fn !== null ? `L${fn}` : 'LO';
        case 'popout':
            return fn !== null ? `P${fn}` : 'PO';
        case 'sacrifice_fly':
            return fn !== null ? `SF${fn}` : 'SF';
        case 'sacrifice_bunt':
            return 'SH';
        case 'double_play':
            return 'DP';
        case 'triple_play':
            return 'TP';
        case 'fielders_choice':
            return 'FC';
        case 'force_out':
            return fn !== null ? `FO${fn}` : 'FO';
        case 'strikeout_dropped':
            return 'K+WP';
        default:
            return result.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
}

function buildBatterBreakdownHtml(breakdown: BatterBreakdown[]): string {
    if (!breakdown.length) return '';

    const batterSections = [...breakdown]
        .sort((a, b) => a.batting_order - b.batting_order)
        .map((batter) => {
            const totalPitches = batter.at_bats.reduce((s, ab) => s + ab.pitches.length, 0);
            const atBatRows = batter.at_bats
                .map((ab) => {
                    const inningLabel = `${ab.inning_half === 'top' ? '▲' : '▼'} ${ab.inning_number}`;
                    const result = formatAtBatResultHtml(ab.result, ab.fielded_by_position, ab.pitches);
                    const pitchCells = ab.pitches
                        .map((pitch) => {
                            const s = RESULT_STYLE[pitch.pitch_result] ?? { bg: '#f3f4f6', color: '#374151', label: '?' };
                            const abbrev = PITCH_ABBREV[pitch.pitch_type] ?? pitch.pitch_type.slice(0, 2).toUpperCase();
                            const border = pitch.is_ab_ending
                                ? 'border: 2px solid #eab308;'
                                : 'border: 1px solid rgba(0,0,0,0.08);';
                            const vel =
                                pitch.velocity != null
                                    ? `<div style="font-size:8px;opacity:0.8;">${Math.round(pitch.velocity)}</div>`
                                    : '';
                            const zone = pitch.target_zone != null ? buildMiniZoneHtml(pitch.target_zone, s.color) : '';
                            return `<td style="padding:2px;">
                              <div style="background:${s.bg};color:${s.color};${border}border-radius:4px;width:36px;text-align:center;padding:3px 2px;display:inline-block;vertical-align:top;">
                                <div style="font-size:8px;font-weight:700;line-height:1.2;">${pitch.balls_before}-${pitch.strikes_before}</div>
                                <div style="font-size:11px;font-weight:800;line-height:1.3;">${abbrev}</div>
                                <div style="font-size:8px;font-weight:600;line-height:1.2;">${s.label}</div>
                                ${vel}
                                ${zone}
                              </div>
                            </td>`;
                        })
                        .join('');
                    return `<tr>
                      <td style="font-size:11px;font-weight:600;color:#374151;white-space:nowrap;padding:4px 6px 4px 0;vertical-align:top;width:52px;">${inningLabel}</td>
                      <td style="font-size:11px;color:#6b7280;white-space:nowrap;padding:4px 8px 4px 0;vertical-align:top;width:90px;">${result}</td>
                      <td style="vertical-align:top;padding:2px 0;">
                        <table style="border-collapse:collapse;"><tr>${pitchCells}</tr></table>
                      </td>
                    </tr>`;
                })
                .join('');

            return `<div class="batter-block">
              <div class="batter-header">
                <span class="batter-order">${batter.batting_order}</span>
                <strong>${batter.batter_name}</strong>
                <span class="batter-meta">${batter.position ?? '—'} · ${batter.bats}HH · ${batter.at_bats.length} AB · ${totalPitches}P</span>
              </div>
              <table style="width:100%;border-collapse:collapse;margin-top:6px;">${atBatRows}</table>
            </div>`;
        })
        .join('');

    return `<div class="section">
  <div class="section-title">Batter Breakdown</div>
  <div class="section-body">
    <div style="font-size:10px;color:#9ca3af;margin-bottom:8px;font-style:italic;">Count · Type · Result · Vel · Zone &nbsp;|&nbsp; <span style="display:inline-block;width:10px;height:10px;border:2px solid #eab308;border-radius:2px;vertical-align:middle;"></span> = AB-ending pitch</div>
    ${batterSections}
  </div>
</div>`;
}

function buildSummaryHtml(summary: PerformanceSummary, batterBreakdown: BatterBreakdown[], isScoutingMode = false): string {
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

    const reportTitle = isScoutingMode ? 'Scouting Report' : 'Performance Summary';
    const narrativeTitle = isScoutingMode ? 'Scout Summary' : 'Coach Summary';
    const highlightsTitle = isScoutingMode ? 'Key Observations' : 'Highlights';
    const concernsTitle = isScoutingMode ? 'Matchup Concerns' : 'Areas to Improve';

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
  .batter-block { margin-bottom: 14px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
  .batter-header { display: flex; align-items: center; gap: 8px; background: #f9fafb; padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
  .batter-order { width: 22px; height: 22px; border-radius: 50%; background: #1e3a5f; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .batter-meta { font-size: 11px; color: #9ca3af; margin-left: 4px; }
  .batter-block table { padding: 6px 10px; }
</style>
</head>
<body>
<h1>${reportTitle}</h1>
<div class="subtitle">Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>

${
    summary.narrative
        ? `<div class="section">
  <div class="section-title">${narrativeTitle}</div>
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
  <div class="section-title">${highlightsTitle}</div>
  <div class="section-body"><ul>${highlights}</ul></div>
</div>`
        : ''
}

${
    concerns
        ? `<div class="section concerns">
  <div class="section-title">${concernsTitle}</div>
  <div class="section-body"><ul>${concerns}</ul></div>
</div>`
        : ''
}

${buildBatterBreakdownHtml(batterBreakdown)}

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
    const selectedGame = useAppSelector((state) => state.games.selectedGame);
    const isScoutingMode = selectedGame?.charting_mode === 'scouting';
    const sourceType: SummarySourceType = isScoutingMode ? 'scouting' : 'game';
    const screenTitle = isScoutingMode ? 'Scouting Report' : 'Performance Summary';

    useEffect(() => {
        if (id) {
            dispatch(fetchPerformanceSummary({ sourceType, sourceId: id }));
            if (!isScoutingMode) dispatch(fetchBatterBreakdown(id));
        }
        return () => {
            dispatch(clearPerformanceSummary());
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
    }, [id, sourceType, dispatch]);

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
            if (id) dispatch(fetchPerformanceSummary({ sourceType, sourceId: id }));
        }, NARRATIVE_POLL_INTERVAL_MS);
        return () => {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
    }, [currentSummary, id, sourceType, dispatch]);

    const handleRegenerate = async () => {
        if (!currentSummary) return;
        setRegenerating(true);
        await dispatch(regenerateNarrative(currentSummary.id));
        if (id) await dispatch(fetchPerformanceSummary({ sourceType, sourceId: id }));
        setRegenerating(false);
    };

    const handleExport = async () => {
        if (!currentSummary) return;
        setExporting(true);
        try {
            const html = buildSummaryHtml(currentSummary, batterBreakdown, isScoutingMode);
            const { uri } = await Print.printToFileAsync({ html, base64: false });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Export ${screenTitle}` });
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
                    <Text variant="titleLarge">{screenTitle}</Text>
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
                    <Text variant="titleLarge">{screenTitle}</Text>
                    <View style={{ width: 48 }} />
                </View>
                <View style={styles.centered}>
                    <Text variant="bodyLarge" style={{ color: '#6b7280', textAlign: 'center', marginBottom: 8 }}>
                        {error
                            ? 'Failed to load summary'
                            : `No ${isScoutingMode ? 'scouting report' : 'performance summary'} available.`}
                    </Text>
                    {error && (
                        <Text variant="bodySmall" style={{ color: '#ef4444', textAlign: 'center', marginBottom: 16 }}>
                            {error}
                        </Text>
                    )}
                    <IconButton
                        icon="refresh"
                        onPress={() => id && dispatch(fetchPerformanceSummary({ sourceType, sourceId: id }))}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <Text variant="titleLarge">{screenTitle}</Text>
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
                batterBreakdown={isScoutingMode ? [] : batterBreakdown}
                onRegenerate={handleRegenerate}
                regenerating={regenerating}
                isScoutingMode={isScoutingMode}
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
