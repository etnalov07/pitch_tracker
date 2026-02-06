import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Text, Button, useTheme, IconButton, Card, Divider, ActivityIndicator, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector, fetchSessionSummary } from '../../../src/state';
import { BullpenIntensity } from '@pitch-tracker/shared';

const INTENSITY_COLORS: Record<BullpenIntensity, { bg: string; text: string }> = {
    low: { bg: '#dcfce7', text: '#16a34a' },
    medium: { bg: '#fef9c3', text: '#ca8a04' },
    high: { bg: '#fee2e2', text: '#dc2626' },
};

export default function BullpenSummaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const { summary, loading } = useAppSelector((state) => state.bullpen);

    useEffect(() => {
        if (id) dispatch(fetchSessionSummary(id));
    }, [id, dispatch]);

    if (loading || !summary) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleLarge">Session Summary</Text>
                    <View style={{ width: 48 }} />
                </View>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                </View>
            </SafeAreaView>
        );
    }

    const intensityColors = INTENSITY_COLORS[summary.intensity];

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <Text variant="titleLarge">Session Summary</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Overview Card */}
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.overviewRow}>
                            <Text variant="bodyMedium" style={styles.dateText}>
                                {formatDate(summary.date)}
                            </Text>
                            <Chip
                                compact
                                textStyle={{ fontSize: 11, color: intensityColors.text, fontWeight: '600' }}
                                style={{ backgroundColor: intensityColors.bg }}
                            >
                                {summary.intensity.charAt(0).toUpperCase() + summary.intensity.slice(1)} Intensity
                            </Chip>
                        </View>

                        {summary.plan_name && (
                            <Text variant="bodySmall" style={styles.planText}>
                                Plan: {summary.plan_name}
                            </Text>
                        )}

                        <Divider style={styles.divider} />

                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{summary.total_pitches}</Text>
                                <Text style={styles.statLabel}>Total Pitches</Text>
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
                                <Text style={[styles.statValue, { color: '#2563eb' }]}>{summary.strike_percentage}%</Text>
                                <Text style={styles.statLabel}>Strike %</Text>
                            </View>
                            {summary.target_accuracy_percentage != null && (
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: '#8b5cf6' }]}>
                                        {summary.target_accuracy_percentage}%
                                    </Text>
                                    <Text style={styles.statLabel}>Accuracy</Text>
                                </View>
                            )}
                        </View>
                    </Card.Content>
                </Card>

                {/* Pitch Type Breakdown */}
                {summary.pitch_type_breakdown.length > 0 && (
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Pitch Type Breakdown</Text>
                            <Divider style={styles.divider} />

                            {/* Table Header */}
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Type</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1 }]}>#</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1 }]}>K</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1 }]}>B</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Vel</Text>
                            </View>

                            {summary.pitch_type_breakdown
                                .sort((a, b) => b.count - a.count)
                                .map((pt) => (
                                    <View key={pt.pitch_type} style={styles.tableRow}>
                                        <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]}>
                                            {pt.pitch_type.charAt(0).toUpperCase() + pt.pitch_type.slice(1)}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 1 }]}>{pt.count}</Text>
                                        <Text style={[styles.tableCell, { flex: 1, color: '#22c55e' }]}>{pt.strikes}</Text>
                                        <Text style={[styles.tableCell, { flex: 1, color: '#6b7280' }]}>{pt.balls}</Text>
                                        <Text style={[styles.tableCell, { flex: 1 }]}>
                                            {pt.top_velocity != null ? `${pt.top_velocity}` : '-'}
                                        </Text>
                                    </View>
                                ))}
                        </Card.Content>
                    </Card>
                )}

                {/* Notes */}
                {summary.notes && (
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Notes</Text>
                            <Divider style={styles.divider} />
                            <Text variant="bodyMedium">{summary.notes}</Text>
                        </Card.Content>
                    </Card>
                )}

                <Button
                    mode="contained"
                    onPress={() => router.dismissAll()}
                    style={styles.doneButton}
                    contentStyle={styles.doneButtonContent}
                >
                    Done
                </Button>
            </ScrollView>
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
    content: {
        padding: 16,
        gap: 16,
    },
    card: {
        backgroundColor: '#ffffff',
    },
    overviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    dateText: {
        color: '#6b7280',
    },
    planText: {
        color: '#6b7280',
        marginBottom: 8,
    },
    divider: {
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        gap: 8,
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
    sectionTitle: {
        marginBottom: 8,
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
    },
    tableCell: {
        fontSize: 13,
    },
    doneButton: {
        marginTop: 8,
    },
    doneButtonContent: {
        paddingVertical: 8,
    },
});
