import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Text, Button, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from '../../src/utils/haptics';
import { Player, BullpenIntensity } from '@pitch-tracker/shared';
import { useAppDispatch, useAppSelector, fetchTeamPlayers } from '../../src/state';
import { createBullpenSession } from '../../src/state/bullpen/bullpenSlice';
import { IntensitySelector } from '../../src/components/bullpen';

export default function NewBullpenScreen() {
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { teamId } = useLocalSearchParams<{ teamId: string }>();

    const teamPlayers = useAppSelector((state) => state.teams.players) || [];
    const [selectedPitcher, setSelectedPitcher] = useState<Player | null>(null);
    const [intensity, setIntensity] = useState<BullpenIntensity>('medium');
    const [creating, setCreating] = useState(false);
    const [loadingPlayers, setLoadingPlayers] = useState(true);

    useEffect(() => {
        if (teamId) {
            dispatch(fetchTeamPlayers(teamId)).finally(() => setLoadingPlayers(false));
        }
    }, [teamId, dispatch]);

    const pitchers = teamPlayers.filter((p) => p.primary_position === 'P' && p.is_active !== false);

    const handleStart = async () => {
        if (!selectedPitcher || !teamId) return;
        setCreating(true);
        try {
            const session = await dispatch(
                createBullpenSession({
                    team_id: teamId,
                    pitcher_id: selectedPitcher.id,
                    intensity,
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
                {/* Pitcher Selection */}
                <Text variant="labelLarge" style={styles.sectionLabel}>
                    Select Pitcher
                </Text>
                {loadingPlayers ? (
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
    startButton: {
        marginTop: 8,
    },
    startButtonContent: {
        paddingVertical: 8,
    },
});
