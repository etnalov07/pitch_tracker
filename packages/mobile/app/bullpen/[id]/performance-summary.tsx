import React, { useEffect, useState } from 'react';
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

export default function BullpenPerformanceSummaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const [regenerating, setRegenerating] = useState(false);

    const { currentSummary, loading } = useAppSelector((state) => state.performanceSummary);

    useEffect(() => {
        if (id) dispatch(fetchPerformanceSummary({ sourceType: 'bullpen', sourceId: id }));
        return () => {
            dispatch(clearPerformanceSummary());
        };
    }, [id, dispatch]);

    const handleRegenerate = async () => {
        if (!currentSummary) return;
        setRegenerating(true);
        await dispatch(regenerateNarrative(currentSummary.id));
        // Refetch to get updated narrative
        if (id) await dispatch(fetchPerformanceSummary({ sourceType: 'bullpen', sourceId: id }));
        setRegenerating(false);
    };

    if (loading || !currentSummary) {
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
