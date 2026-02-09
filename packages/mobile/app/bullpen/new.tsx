import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Text, Button, useTheme, IconButton, ActivityIndicator, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from '../../src/utils/haptics';
import { Player, BullpenIntensity, BullpenPlanWithPitches, Team } from '@pitch-tracker/shared';
import {
    useAppDispatch,
    useAppSelector,
    fetchTeamPlayers,
    fetchAllTeams,
    fetchTeamPlans,
    fetchPitcherAssignments,
} from '../../src/state';
import { createBullpenSession } from '../../src/state/bullpen/bullpenSlice';
import { IntensitySelector } from '../../src/components/bullpen';

export default function NewBullpenScreen() {
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { teamId: teamIdParam } = useLocalSearchParams<{ teamId: string }>();

    const teams = useAppSelector((state) => state.teams.teams) || [];
    const teamPlayers = useAppSelector((state) => state.teams.players) || [];
    const [resolvedTeamId, setResolvedTeamId] = useState<string | undefined>(teamIdParam);
    const [selectedPitcher, setSelectedPitcher] = useState<Player | null>(null);
    const [intensity, setIntensity] = useState<BullpenIntensity>('medium');
    const [creating, setCreating] = useState(false);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const [loadingTeams, setLoadingTeams] = useState(!teamIdParam);
    const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);

    const { plans: teamPlans, pitcherAssignments, plansLoading } = useAppSelector((state) => state.bullpen);

    // If no teamId param, fetch user's teams to resolve one
    useEffect(() => {
        if (teamIdParam) {
            setResolvedTeamId(teamIdParam);
            setLoadingTeams(false);
            return;
        }
        // If teams are already in Redux, pick from them
        if (teams.length > 0) {
            setResolvedTeamId(teams[0].id);
            setLoadingTeams(false);
            return;
        }
        // Otherwise fetch teams
        dispatch(fetchAllTeams()).finally(() => setLoadingTeams(false));
    }, [teamIdParam, dispatch]);

    // Once teams load from Redux, auto-select the first one
    useEffect(() => {
        if (!teamIdParam && !resolvedTeamId && teams.length > 0) {
            setResolvedTeamId(teams[0].id);
        }
    }, [teams, teamIdParam, resolvedTeamId]);

    // Fetch players once we have a resolved team ID
    useEffect(() => {
        if (resolvedTeamId) {
            setLoadingPlayers(true);
            dispatch(fetchTeamPlayers(resolvedTeamId)).finally(() => setLoadingPlayers(false));
        }
    }, [resolvedTeamId, dispatch]);

    // Fetch team plans when team is resolved
    useEffect(() => {
        if (resolvedTeamId) {
            dispatch(fetchTeamPlans(resolvedTeamId));
        }
    }, [resolvedTeamId, dispatch]);

    // Fetch pitcher assignments when pitcher is selected
    useEffect(() => {
        if (selectedPitcher) {
            dispatch(fetchPitcherAssignments(selectedPitcher.id)).then((result) => {
                if (result.meta.requestStatus === 'fulfilled') {
                    const assignments = result.payload as BullpenPlanWithPitches[];
                    if (assignments.length > 0) {
                        setSelectedPlanId(assignments[0].id);
                    } else {
                        setSelectedPlanId(undefined);
                    }
                }
            });
        } else {
            setSelectedPlanId(undefined);
        }
    }, [selectedPitcher, dispatch]);

    const pitchers = teamPlayers.filter((p) => p.primary_position === 'P' && p.is_active !== false);

    const handleSelectTeam = (team: Team) => {
        Haptics.selectionAsync();
        setResolvedTeamId(team.id);
        setSelectedPitcher(null);
    };

    const handleStart = async () => {
        if (!selectedPitcher || !resolvedTeamId) return;
        setCreating(true);
        try {
            const session = await dispatch(
                createBullpenSession({
                    team_id: resolvedTeamId,
                    pitcher_id: selectedPitcher.id,
                    intensity,
                    plan_id: selectedPlanId,
                })
            ).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace(
                `/bullpen/${session.id}/live?pitcherName=${encodeURIComponent(selectedPitcher.first_name + ' ' + selectedPitcher.last_name)}&jerseyNumber=${selectedPitcher.jersey_number || ''}&intensity=${intensity}` as any
            );
        } catch {
            Alert.alert('Error', 'Failed to create bullpen session');
        } finally {
            setCreating(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <Text variant="titleLarge">New Bullpen Session</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Team Selection (only when multiple teams and no teamId param) */}
                {!teamIdParam && teams.length > 1 && (
                    <>
                        <Text variant="labelLarge" style={styles.sectionLabel}>
                            Select Team
                        </Text>
                        <View style={styles.pitcherGrid}>
                            {teams.map((team) => {
                                const isSelected = resolvedTeamId === team.id;
                                return (
                                    <Button
                                        key={team.id}
                                        mode={isSelected ? 'contained' : 'outlined'}
                                        onPress={() => handleSelectTeam(team)}
                                        style={styles.pitcherButton}
                                        compact
                                    >
                                        {team.name}
                                    </Button>
                                );
                            })}
                        </View>
                    </>
                )}

                {/* Pitcher Selection */}
                <Text variant="labelLarge" style={styles.sectionLabel}>
                    Select Pitcher
                </Text>
                {loadingTeams || loadingPlayers ? (
                    <ActivityIndicator style={{ marginVertical: 20 }} />
                ) : pitchers.length === 0 ? (
                    <Text style={styles.emptyText}>No pitchers found on this team</Text>
                ) : (
                    <View style={styles.pitcherGrid}>
                        {pitchers.map((player) => {
                            const isSelected = selectedPitcher?.id === player.id;
                            return (
                                <Button
                                    key={player.id}
                                    mode={isSelected ? 'contained' : 'outlined'}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelectedPitcher(player);
                                    }}
                                    style={styles.pitcherButton}
                                    compact
                                >
                                    {player.jersey_number ? `#${player.jersey_number} ` : ''}
                                    {player.first_name} {player.last_name}
                                </Button>
                            );
                        })}
                    </View>
                )}

                {/* Intensity */}
                <IntensitySelector selected={intensity} onSelect={setIntensity} />

                {/* Plan Selection */}
                {selectedPitcher && (
                    <>
                        <Text variant="labelLarge" style={styles.sectionLabel}>
                            Bullpen Plan (optional)
                        </Text>
                        {plansLoading ? (
                            <ActivityIndicator style={{ marginVertical: 8 }} />
                        ) : (
                            <View style={styles.planChips}>
                                <Chip
                                    selected={!selectedPlanId}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelectedPlanId(undefined);
                                    }}
                                    style={styles.planChip}
                                >
                                    Freestyle
                                </Chip>
                                {pitcherAssignments.map((plan) => (
                                    <Chip
                                        key={plan.id}
                                        selected={selectedPlanId === plan.id}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setSelectedPlanId(plan.id);
                                        }}
                                        style={styles.planChip}
                                        icon="star"
                                    >
                                        {plan.name}
                                    </Chip>
                                ))}
                                {teamPlans
                                    .filter((p) => !pitcherAssignments.some((a) => a.id === p.id))
                                    .map((plan) => (
                                        <Chip
                                            key={plan.id}
                                            selected={selectedPlanId === plan.id}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setSelectedPlanId(plan.id);
                                            }}
                                            style={styles.planChip}
                                        >
                                            {plan.name}
                                        </Chip>
                                    ))}
                            </View>
                        )}
                    </>
                )}

                {/* Start Button */}
                <Button
                    mode="contained"
                    onPress={handleStart}
                    disabled={!selectedPitcher || creating}
                    loading={creating}
                    style={styles.startButton}
                    contentStyle={styles.startButtonContent}
                    icon="baseball"
                >
                    Start Bullpen
                </Button>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    content: {
        padding: 16,
        gap: 16,
    },
    sectionLabel: {
        color: '#374151',
        marginBottom: 4,
    },
    pitcherGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pitcherButton: {
        marginBottom: 0,
    },
    emptyText: {
        color: '#9ca3af',
        textAlign: 'center',
        paddingVertical: 20,
    },
    planChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    planChip: {
        marginBottom: 0,
    },
    startButton: {
        marginTop: 8,
    },
    startButtonContent: {
        paddingVertical: 8,
    },
});
