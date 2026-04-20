import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Text, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    useAppDispatch,
    useAppSelector,
    fetchPerformanceSummary,
    regenerateNarrative,
    clearPerformanceSummary,
} from '../../../src/state';
import { PerformanceSummaryView } from '../../../src/components/performanceSummary';

const NARRATIVE_POLL_INTERVAL_MS = 3000;
const NARRATIVE_POLL_MAX_ATTEMPTS = 10;

export default function GamePerformanceSummaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const [regenerating, setRegenerating] = useState(false);
    const pollAttemptsRef = useRef(0);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { currentSummary, loading, error } = useAppSelector((state) => state.performanceSummary);

    useEffect(() => {
        if (id) dispatch(fetchPerformanceSummary({ sourceType: 'game', sourceId: id }));
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
                <View style={{ width: 48 }} />
            </View>
            <PerformanceSummaryView summary={currentSummary} onRegenerate={handleRegenerate} regenerating={regenerating} />
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
});
