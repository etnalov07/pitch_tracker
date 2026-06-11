import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { CountBucketBreakdown, TeamSide } from '@pitch-tracker/shared';

import { gamesApi } from '../../../state/games/api/gamesApi';

export interface CountBreakdownContentProps {
    gameId: string;
    pitcherId?: string;
    teamSide?: TeamSide;
    refreshTrigger?: number;
    /** Gates the fetch — modal passes `visible`, the inline panel leaves it true. */
    active?: boolean;
}

const BUCKET_LABELS: Record<string, string> = {
    '1st_pitch': '1st Pitch (0-0)',
    ahead: 'Ahead (K > B)',
    even: 'Even',
    behind: 'Behind (B > K)',
};

const BUCKETS = ['1st_pitch', 'ahead', 'even', 'behind'] as const;

/**
 * Shared body for the Count Breakdown — count-bucket cards with per-type rows.
 * Wrapped by `CountBreakdownModal` (phone) and `CountBreakdownPanel` (iPad
 * sidebar). Mirrors the web CountBreakdownPanel.
 */
const CountBreakdownContent: React.FC<CountBreakdownContentProps> = ({
    gameId,
    pitcherId,
    teamSide,
    refreshTrigger,
    active = true,
}) => {
    const theme = useTheme();
    const [data, setData] = useState<CountBucketBreakdown | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!active) return;
        setLoading(true);
        gamesApi
            .getCountBreakdown(gameId, pitcherId, teamSide)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [active, gameId, pitcherId, teamSide, refreshTrigger]);

    if (loading) {
        return <ActivityIndicator style={{ marginVertical: 24 }} />;
    }

    if (!data || BUCKETS.every((k) => data[k].total === 0)) {
        return (
            <Text variant="bodySmall" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                No pitches recorded yet.
            </Text>
        );
    }

    return (
        <View>
            {BUCKETS.map((key) => {
                const bucket = data[key];
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
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        {t.pitch_type}
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        {t.count} ({t.strike_percentage}%K)
                                    </Text>
                                </View>
                            ))}
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
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
});

export default CountBreakdownContent;
