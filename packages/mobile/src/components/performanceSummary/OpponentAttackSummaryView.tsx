import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Card, Text, Chip, Button, useTheme, List } from 'react-native-paper';
import { TeamOffenseSummary, OutcomePitchGroup, CountSituationStat, ZoneHistogram, PerHitterAttack } from '@pitch-tracker/shared';
import { performanceSummaryApi } from '../../state/performanceSummary/api/performanceSummaryApi';
import { colors } from '../../styles/theme';

const SITUATION_LABEL: Record<string, string> = {
    first_pitch: 'First pitch',
    hitter_count: "Hitter's count",
    pitcher_count: "Pitcher's count",
    two_strike: 'Two strikes',
};

const ZONE_GRID = ['TL', 'TM', 'TR', 'ML', 'MM', 'MR', 'BL', 'BM', 'BR'];

const BUCKET_LABEL: Record<string, string> = {
    hit: 'Hits',
    walk: 'Walks',
    strikeout: 'Strikeouts',
    weak_contact_out: 'Weak-contact outs',
    hard_contact_out: 'Hard-contact outs',
};

const GOOD_BUCKETS = new Set(['hit', 'walk']);

interface Props {
    gameId: string;
}

const OpponentAttackSummaryView: React.FC<Props> = ({ gameId }) => {
    const theme = useTheme();
    const [summary, setSummary] = useState<TeamOffenseSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        performanceSummaryApi
            .getOpponentAttackSummary(gameId)
            .then((s) => {
                if (!cancelled) setSummary(s);
            })
            .catch(() => {
                if (!cancelled) setError('Failed to load opponent attack summary');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [gameId]);

    const handleRegenerate = async () => {
        setRegenerating(true);
        try {
            const refreshed = await performanceSummaryApi.regenerateTeamOffenseNarrative(gameId);
            setSummary(refreshed);
        } catch {
            // best effort
        } finally {
            setRegenerating(false);
        }
    };

    if (loading) {
        return (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <ActivityIndicator />
                </Card.Content>
            </Card>
        );
    }
    if (error) {
        return (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>{error}</Text>
                </Card.Content>
            </Card>
        );
    }
    if (!summary) return null;

    const totalPitches = summary.pitch_type_mix.reduce((sum, m) => sum + m.count, 0);
    if (totalPitches === 0) {
        return (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                        How they attacked us
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginTop: 4 }}>
                        No pitch data charted for our hitters this game.
                    </Text>
                </Card.Content>
            </Card>
        );
    }

    return (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
                <View style={styles.headerRow}>
                    <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                        How the opponent attacked us
                    </Text>
                    <Button mode="outlined" compact onPress={handleRegenerate} loading={regenerating} disabled={regenerating}>
                        {summary.narrative ? 'Regen' : 'Generate'}
                    </Button>
                </View>

                {summary.narrative ? (
                    <View style={[styles.narrative, { backgroundColor: colors.primary[50] }]}>
                        <Text style={{ color: colors.primary[900] }}>{summary.narrative}</Text>
                    </View>
                ) : (
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginBottom: 12 }}>
                        Narrative still generating. Tap "Generate" if it doesn't appear shortly.
                    </Text>
                )}

                <SectionTitle text={`Pitch mix (${totalPitches} pitches)`} color={theme.colors.onSurface} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {summary.pitch_type_mix.map((m) => (
                        <Chip key={m.pitch_type} style={styles.mixChip} compact>
                            {m.pitch_type} {m.pct}% ({m.count})
                        </Chip>
                    ))}
                </ScrollView>

                <SectionTitle text="Attack zones" color={theme.colors.onSurface} />
                <ZoneHeatmap histogram={summary.zone_histogram} textColor={theme.colors.onSurface} />

                <SectionTitle text="By count situation" color={theme.colors.onSurface} />
                <SituationListView
                    situations={summary.count_situations}
                    textColor={theme.colors.onSurface}
                    mutedColor={theme.colors.onSurfaceVariant}
                />

                <SectionTitle text="What got us out / what worked" color={theme.colors.onSurface} />
                <OutcomeView outcomes={summary.team_outcomes} textColor={theme.colors.onSurface} />

                <SectionTitle text="Per-hitter attack plan" color={theme.colors.onSurface} />
                {summary.per_hitter.length === 0 && (
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                        No hitters with charted at-bats.
                    </Text>
                )}
                {summary.per_hitter.map((h) => (
                    <HitterAccordion
                        key={h.batter_id}
                        hitter={h}
                        textColor={theme.colors.onSurface}
                        mutedColor={theme.colors.onSurfaceVariant}
                    />
                ))}
            </Card.Content>
        </Card>
    );
};

const SectionTitle: React.FC<{ text: string; color: string }> = ({ text, color }) => (
    <Text variant="titleSmall" style={{ color, marginTop: 14, marginBottom: 6, fontWeight: '600' }}>
        {text}
    </Text>
);

const ZoneHeatmap: React.FC<{ histogram: ZoneHistogram; textColor: string }> = ({ histogram, textColor }) => {
    const max = Math.max(0, ...ZONE_GRID.map((z) => histogram[z] || 0));
    return (
        <View style={styles.grid}>
            {ZONE_GRID.map((z) => {
                const count = histogram[z] || 0;
                const intensity = max > 0 ? count / max : 0;
                const cellColor = `rgba(220, 38, 38, ${0.08 + intensity * 0.6})`;
                const labelColor = intensity > 0.55 ? '#ffffff' : textColor;
                return (
                    <View key={z} style={[styles.gridCell, { backgroundColor: cellColor }]}>
                        <Text style={[styles.gridLabel, { color: labelColor }]}>{z}</Text>
                        <Text style={[styles.gridCount, { color: labelColor }]}>{count}</Text>
                    </View>
                );
            })}
        </View>
    );
};

const SituationListView: React.FC<{
    situations: CountSituationStat[];
    textColor: string;
    mutedColor: string;
}> = ({ situations, textColor, mutedColor }) => (
    <View>
        {situations.map((s) => (
            <View key={s.situation} style={styles.situationRow}>
                <Text style={{ color: textColor, fontWeight: '600', minWidth: 110 }}>{SITUATION_LABEL[s.situation]}</Text>
                <Text style={{ color: mutedColor, fontSize: 12, flex: 1 }}>
                    {s.total === 0
                        ? '—'
                        : s.pitch_type_mix
                              .slice(0, 3)
                              .map((m) => `${m.pitch_type} ${m.pct}%`)
                              .join(' · ')}
                </Text>
                <Text style={{ color: mutedColor, fontSize: 12 }}>({s.total})</Text>
            </View>
        ))}
    </View>
);

const OutcomeView: React.FC<{ outcomes: OutcomePitchGroup[]; textColor: string }> = ({ outcomes, textColor }) => {
    const good = outcomes.filter((g) => GOOD_BUCKETS.has(g.bucket));
    const bad = outcomes.filter((g) => !GOOD_BUCKETS.has(g.bucket));
    return (
        <View>
            <View style={[styles.outcomeBlock, { backgroundColor: colors.green[50], borderColor: colors.green[200] }]}>
                <Text style={[styles.outcomeHeader, { color: colors.green[800] }]}>What worked for us</Text>
                {good.length === 0 && <Text style={styles.muted}>No hits or walks charted.</Text>}
                {good.map((g) => (
                    <View key={g.bucket} style={{ marginBottom: 6 }}>
                        <Text style={{ color: textColor, fontSize: 12, fontWeight: '600' }}>
                            {BUCKET_LABEL[g.bucket]} ({g.total})
                        </Text>
                        <View style={styles.chipRow}>
                            {g.pitches.slice(0, 8).map((p, i) => (
                                <Chip key={`${g.bucket}-${i}`} style={styles.outcomeChip} compact>
                                    {p.pitch_type} @ {p.zone} ×{p.count}
                                </Chip>
                            ))}
                        </View>
                    </View>
                ))}
            </View>

            <View style={[styles.outcomeBlock, { backgroundColor: colors.red[50], borderColor: colors.red[200] }]}>
                <Text style={[styles.outcomeHeader, { color: colors.red[800] }]}>What got us out</Text>
                {bad.length === 0 && <Text style={styles.muted}>No outs charted.</Text>}
                {bad.map((g) => (
                    <View key={g.bucket} style={{ marginBottom: 6 }}>
                        <Text style={{ color: textColor, fontSize: 12, fontWeight: '600' }}>
                            {BUCKET_LABEL[g.bucket]} ({g.total})
                        </Text>
                        <View style={styles.chipRow}>
                            {g.pitches.slice(0, 8).map((p, i) => (
                                <Chip key={`${g.bucket}-${i}`} style={styles.outcomeChip} compact>
                                    {p.pitch_type} @ {p.zone} ×{p.count}
                                </Chip>
                            ))}
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const HitterAccordion: React.FC<{ hitter: PerHitterAttack; textColor: string; mutedColor: string }> = ({
    hitter,
    textColor,
    mutedColor,
}) => {
    const [expanded, setExpanded] = useState(false);
    const title = `#${hitter.batting_order} ${hitter.batter_name}`;
    const subtitle = `${hitter.bats}HH · ${hitter.at_bats_count} AB · ${hitter.outcomes.hits}H / ${hitter.outcomes.walks}BB / ${hitter.outcomes.strikeouts}K / ${hitter.outcomes.outs_in_play}IP-out`;
    return (
        <List.Accordion
            title={title}
            description={subtitle}
            titleStyle={{ color: textColor }}
            descriptionStyle={{ color: mutedColor, fontSize: 12 }}
            expanded={expanded}
            onPress={() => setExpanded(!expanded)}
            style={styles.accordion}
        >
            <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
                <SectionTitle text="Pitch mix" color={textColor} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {hitter.pitch_type_mix.map((m) => (
                        <Chip key={m.pitch_type} style={styles.mixChip} compact>
                            {m.pitch_type} {m.pct}% ({m.count})
                        </Chip>
                    ))}
                </ScrollView>
                <SectionTitle text="Attack zones" color={textColor} />
                <ZoneHeatmap histogram={hitter.zone_histogram} textColor={textColor} />
                <SectionTitle text="What worked / what got out" color={textColor} />
                <OutcomeView outcomes={[...hitter.what_worked, ...hitter.what_got_out]} textColor={textColor} />
            </View>
        </List.Accordion>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontWeight: '600',
        flex: 1,
    },
    narrative: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary[500],
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    mixChip: {
        marginRight: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 3 * 56 + 2 * 4,
        gap: 4,
    },
    gridCell: {
        width: 56,
        height: 56,
        borderWidth: 1,
        borderColor: colors.gray[300],
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridLabel: {
        fontSize: 11,
    },
    gridCount: {
        fontSize: 14,
        fontWeight: '700',
    },
    situationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.gray[200],
    },
    outcomeBlock: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    outcomeHeader: {
        fontWeight: '600',
        marginBottom: 6,
        fontSize: 13,
    },
    outcomeChip: {
        marginRight: 4,
        marginBottom: 4,
    },
    muted: {
        color: colors.gray[500],
        fontStyle: 'italic',
        fontSize: 12,
    },
    accordion: {
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
    },
});

export default OpponentAttackSummaryView;
