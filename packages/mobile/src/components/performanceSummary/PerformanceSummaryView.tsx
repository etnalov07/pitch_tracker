import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Divider, Chip, Button } from 'react-native-paper';
import { PerformanceSummary, MetricRating } from '@pitch-tracker/shared';

const RATING_COLORS: Record<MetricRating, { bg: string; text: string }> = {
    highlight: { bg: '#dcfce7', text: '#16a34a' },
    concern: { bg: '#fee2e2', text: '#dc2626' },
    neutral: { bg: '#f3f4f6', text: '#6b7280' },
};

interface Props {
    summary: PerformanceSummary;
    onRegenerate?: () => void;
    regenerating?: boolean;
}

export default function PerformanceSummaryView({ summary, onRegenerate, regenerating }: Props) {
    return (
        <ScrollView contentContainerStyle={styles.content}>
            {/* AI Narrative */}
            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        Coach Summary
                    </Text>
                    <Divider style={styles.divider} />
                    {summary.narrative ? (
                        <Text variant="bodyMedium" style={styles.narrative}>
                            {summary.narrative}
                        </Text>
                    ) : (
                        <Text variant="bodySmall" style={styles.narrativePlaceholder}>
                            AI summary generating...
                        </Text>
                    )}
                </Card.Content>
            </Card>

            {/* Key Metrics */}
            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        Key Metrics
                    </Text>
                    <Divider style={styles.divider} />
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{summary.total_pitches}</Text>
                            <Text style={styles.statLabel}>Pitches</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#22c55e' }]}>{summary.strikes}</Text>
                            <Text style={styles.statLabel}>Strikes</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#6b7280' }]}>{summary.balls}</Text>
                            <Text style={styles.statLabel}>Balls</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#486581' }]}>{summary.strike_percentage}%</Text>
                            <Text style={styles.statLabel}>Strike %</Text>
                        </View>
                        {summary.target_accuracy_percentage != null && (
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#8b5cf6' }]}>{summary.target_accuracy_percentage}%</Text>
                                <Text style={styles.statLabel}>Accuracy</Text>
                            </View>
                        )}
                        {summary.batters_faced != null && (
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{summary.batters_faced}</Text>
                                <Text style={styles.statLabel}>Batters</Text>
                            </View>
                        )}
                    </View>

                    {/* Rated metrics */}
                    {summary.metrics.length > 0 && (
                        <View style={styles.metricsSection}>
                            {summary.metrics.map((m) => {
                                const colors = RATING_COLORS[m.rating];
                                return (
                                    <View key={m.metric_name} style={styles.metricRow}>
                                        <Text style={styles.metricName}>{m.metric_name}</Text>
                                        <View style={styles.metricRight}>
                                            <Chip
                                                compact
                                                textStyle={{ fontSize: 11, color: colors.text, fontWeight: '600' }}
                                                style={{ backgroundColor: colors.bg }}
                                            >
                                                {m.value}%
                                            </Chip>
                                            {m.delta_from_avg != null && (
                                                <Text style={[styles.metricDelta, { color: colors.text }]}>
                                                    {m.delta_from_avg > 0 ? '+' : ''}
                                                    {m.delta_from_avg}%
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </Card.Content>
            </Card>

            {/* Pitch Type Breakdown */}
            {summary.pitch_type_breakdown.length > 0 && (
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Pitch Type Breakdown
                        </Text>
                        <Divider style={styles.divider} />
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Type</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>#</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>K%</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Vel</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Rating</Text>
                        </View>
                        {summary.pitch_type_breakdown
                            .sort((a, b) => b.count - a.count)
                            .map((pt) => {
                                const colors = RATING_COLORS[pt.rating];
                                return (
                                    <View key={pt.pitch_type} style={styles.tableRow}>
                                        <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]}>
                                            {pt.pitch_type.charAt(0).toUpperCase() + pt.pitch_type.slice(1)}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 1 }]}>{pt.count}</Text>
                                        <Text style={[styles.tableCell, { flex: 1 }]}>{pt.strike_percentage}%</Text>
                                        <Text style={[styles.tableCell, { flex: 1 }]}>
                                            {pt.top_velocity != null ? `${pt.top_velocity}` : '-'}
                                        </Text>
                                        <View style={{ flex: 1 }}>
                                            <Chip
                                                compact
                                                textStyle={{ fontSize: 9, color: colors.text }}
                                                style={{ backgroundColor: colors.bg, alignSelf: 'flex-start' }}
                                            >
                                                {pt.rating === 'highlight' ? 'Good' : pt.rating === 'concern' ? 'Work' : '-'}
                                            </Chip>
                                        </View>
                                    </View>
                                );
                            })}
                    </Card.Content>
                </Card>
            )}

            {/* Highlights */}
            {summary.highlights.length > 0 && (
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={[styles.sectionTitle, { color: '#16a34a' }]}>
                            Highlights
                        </Text>
                        <Divider style={styles.divider} />
                        {summary.highlights.map((h, i) => (
                            <Text key={i} style={styles.bulletItem}>
                                {'\u2022'} {h}
                            </Text>
                        ))}
                    </Card.Content>
                </Card>
            )}

            {/* Concerns */}
            {summary.concerns.length > 0 && (
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={[styles.sectionTitle, { color: '#dc2626' }]}>
                            Areas to Improve
                        </Text>
                        <Divider style={styles.divider} />
                        {summary.concerns.map((c, i) => (
                            <Text key={i} style={styles.bulletItem}>
                                {'\u2022'} {c}
                            </Text>
                        ))}
                    </Card.Content>
                </Card>
            )}

            {/* Regenerate button */}
            {onRegenerate && (
                <Button
                    mode="outlined"
                    onPress={onRegenerate}
                    loading={regenerating}
                    disabled={regenerating}
                    style={styles.regenerateButton}
                    icon="refresh"
                >
                    Regenerate Summary
                </Button>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: 16,
        gap: 16,
        paddingBottom: 32,
    },
    card: {
        backgroundColor: '#ffffff',
    },
    sectionTitle: {
        marginBottom: 8,
    },
    divider: {
        marginBottom: 12,
    },
    narrative: {
        fontStyle: 'italic',
        lineHeight: 22,
        color: '#374151',
    },
    narrativePlaceholder: {
        fontStyle: 'italic',
        color: '#9ca3af',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        gap: 8,
        marginBottom: 12,
    },
    statItem: {
        alignItems: 'center',
        minWidth: 60,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 10,
        color: '#9ca3af',
        fontWeight: '500',
    },
    metricsSection: {
        gap: 8,
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    metricName: {
        fontSize: 13,
        color: '#374151',
    },
    metricRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metricDelta: {
        fontSize: 11,
        fontWeight: '600',
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        alignItems: 'center',
    },
    tableCell: {
        fontSize: 13,
    },
    bulletItem: {
        fontSize: 13,
        lineHeight: 22,
        color: '#374151',
        paddingLeft: 4,
    },
    regenerateButton: {
        marginTop: 8,
    },
});
