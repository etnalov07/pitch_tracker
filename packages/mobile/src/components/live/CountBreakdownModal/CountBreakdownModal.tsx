import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Divider, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { CountBucketBreakdown, TeamSide } from '@pitch-tracker/shared';
import { gamesApi } from '../../../state/games/api/gamesApi';

interface Props {
    visible: boolean;
    onDismiss: () => void;
    gameId: string;
    pitcherId?: string;
    teamSide?: TeamSide;
    refreshTrigger?: number;
}

const BUCKET_LABELS: Record<string, string> = {
    '1st_pitch': '1st Pitch (0-0)',
    ahead: 'Ahead (K > B)',
    even: 'Even',
    behind: 'Behind (B > K)',
};

const CountBreakdownModal: React.FC<Props> = ({ visible, onDismiss, gameId, pitcherId, teamSide, refreshTrigger }) => {
    const theme = useTheme();
    const [data, setData] = useState<CountBucketBreakdown | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setLoading(true);
        gamesApi
            .getCountBreakdown(gameId, pitcherId, teamSide)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [visible, gameId, pitcherId, teamSide, refreshTrigger]);

    const buckets = ['1st_pitch', 'ahead', 'even', 'behind'] as const;

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
            >
                <Text variant="titleMedium" style={styles.title}>
                    Count Breakdown
                </Text>
                <Divider style={styles.divider} />
                {loading ? (
                    <ActivityIndicator style={{ marginVertical: 24 }} />
                ) : !data || buckets.every((k) => data[k].total === 0) ? (
                    <Text variant="bodySmall" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                        No pitches recorded yet.
                    </Text>
                ) : (
                    <ScrollView>
                        {buckets.map((key) => {
                            const bucket = data![key];
                            if (bucket.total === 0) return null;
                            return (
                                <View key={key} style={[styles.bucket, { backgroundColor: theme.colors.surfaceVariant }]}>
                                    <View style={styles.bucketHeader}>
                                        <Text variant="labelMedium" style={[styles.bucketLabel, { color: theme.colors.onSurface }]}>
                                            {BUCKET_LABELS[key]}
                                        </Text>
                                        <Text variant="bodyMedium" style={[styles.bucketTotal, { color: theme.colors.onSurface }]}>
                                            {bucket.total} pitches
                                        </Text>
                                        <Text
                                            variant="bodySmall"
                                            style={[
                                                styles.strikeRate,
                                                {
                                                    color:
                                                        bucket.strike_percentage >= 60
                                                            ? '#16a34a'
                                                            : bucket.strike_percentage >= 45
                                                              ? '#ca8a04'
                                                              : '#dc2626',
                                                },
                                            ]}
                                        >
                                            {bucket.strike_percentage}% K
                                        </Text>
                                    </View>
                                    {bucket.pitch_type_breakdown
                                        .sort((a, b) => b.count - a.count)
                                        .slice(0, 4)
                                        .map((t) => (
                                            <View key={t.pitch_type} style={styles.typeRow}>
                                                <Text
                                                    variant="bodySmall"
                                                    style={[styles.typeLabel, { color: theme.colors.onSurfaceVariant }]}
                                                >
                                                    {t.pitch_type}
                                                </Text>
                                                <Text
                                                    variant="bodySmall"
                                                    style={[styles.typeStats, { color: theme.colors.onSurfaceVariant }]}
                                                >
                                                    {t.count} ({t.strike_percentage}%K)
                                                </Text>
                                            </View>
                                        ))}
                                </View>
                            );
                        })}
                    </ScrollView>
                )}
                <Button onPress={onDismiss} style={styles.closeButton}>
                    Close
                </Button>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    container: {
        margin: 24,
        borderRadius: 12,
        padding: 20,
        maxHeight: '80%',
    },
    title: {
        fontWeight: '600',
        marginBottom: 8,
    },
    divider: {
        marginBottom: 12,
    },
    emptyText: {
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 16,
    },
    bucket: {
        marginBottom: 16,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    bucketHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
        flexWrap: 'wrap',
    },
    bucketLabel: {
        fontWeight: '600',
        flex: 1,
    },
    bucketTotal: {
        fontWeight: '600',
    },
    strikeRate: {
        fontWeight: '600',
    },
    typeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 1,
    },
    typeLabel: {},
    typeStats: {},
    closeButton: {
        marginTop: 12,
    },
});

export default CountBreakdownModal;
