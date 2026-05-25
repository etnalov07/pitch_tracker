// Bullpen plan list — UX-BP-10. Mobile counterpart to web's BullpenPlans page.
// Coaches can browse, edit, delete, or create bullpen plans without needing a laptop.

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';

import { BullpenPlan } from '@pitch-tracker/shared';

import { bullpenApi } from '../../../src/state/bullpen/api/bullpenApi';
import { useToast } from '../../../src/hooks/useToast';
import { colors } from '../../../src/styles/theme';

type PlanRow = BullpenPlan & { pitch_count?: number; assignment_count?: number };

export default function BullpenPlansScreen() {
    const router = useRouter();
    const theme = useTheme();
    const toast = useToast();
    const { teamId } = useLocalSearchParams<{ teamId: string }>();

    const [plans, setPlans] = useState<PlanRow[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPlans = useCallback(async () => {
        if (!teamId) return;
        try {
            setLoading(true);
            const data = await bullpenApi.getTeamPlans(teamId);
            setPlans(data as PlanRow[]);
        } catch {
            toast.show({ message: 'Failed to load plans', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [teamId, toast]);

    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    // Refresh on focus so deletes/edits made in the editor are reflected when we return.
    useFocusEffect(
        useCallback(() => {
            loadPlans();
        }, [loadPlans])
    );

    const handleDelete = (plan: PlanRow) => {
        Alert.alert('Delete plan?', `Delete "${plan.name}"? Sessions using it will keep their data but lose the plan reference.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await bullpenApi.deletePlan(plan.id);
                        setPlans((prev) => prev.filter((p) => p.id !== plan.id));
                        toast.show({ message: 'Plan deleted', type: 'success' });
                    } catch {
                        toast.show({ message: 'Failed to delete plan', type: 'error' });
                    }
                },
            },
        ]);
    };

    if (!teamId) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Text style={{ padding: 16 }}>Team not specified</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <Text variant="titleLarge">Bullpen Plans</Text>
                <Button
                    mode="contained"
                    compact
                    onPress={() => router.push(`/bullpen/plans/new?teamId=${teamId}` as any)}
                    icon="plus"
                >
                    Create
                </Button>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginVertical: 40 }} />
            ) : plans.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text variant="titleMedium" style={styles.emptyTitle}>
                        No plans yet
                    </Text>
                    <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                        Create a plan to prescribe bullpen routines for your pitchers.
                    </Text>
                    <Button mode="contained" onPress={() => router.push(`/bullpen/plans/new?teamId=${teamId}` as any)}>
                        Create Plan
                    </Button>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list}>
                    {plans.map((plan) => (
                        <TouchableOpacity
                            key={plan.id}
                            style={[styles.planCard, { backgroundColor: theme.colors.surface, borderColor: colors.gray[200] }]}
                            onPress={() => router.push(`/bullpen/plans/${plan.id}?teamId=${teamId}` as any)}
                        >
                            <View style={styles.planHeader}>
                                <Text variant="titleMedium" style={styles.planName}>
                                    {plan.name}
                                </Text>
                                <IconButton
                                    icon="delete-outline"
                                    size={20}
                                    onPress={() => handleDelete(plan)}
                                    iconColor={colors.red[600]}
                                />
                            </View>
                            {plan.description ? (
                                <Text
                                    variant="bodySmall"
                                    style={[styles.planDesc, { color: theme.colors.onSurfaceVariant }]}
                                    numberOfLines={2}
                                >
                                    {plan.description}
                                </Text>
                            ) : null}
                            <View style={styles.planMeta}>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {plan.pitch_count ?? 0} pitch{plan.pitch_count === 1 ? '' : 'es'}
                                    {plan.max_pitches ? ` · max ${plan.max_pitches}` : ''}
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {plan.assignment_count ?? 0} assigned
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.25)',
    },
    list: { padding: 16, gap: 12 },
    planCard: {
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 12,
    },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    planName: { fontWeight: '600' },
    planDesc: { marginTop: 4 },
    planMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
    emptyTitle: { fontWeight: '600' },
    emptyText: { textAlign: 'center', marginBottom: 8 },
});
