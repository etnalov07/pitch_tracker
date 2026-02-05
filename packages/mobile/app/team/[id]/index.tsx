import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
    Text,
    Card,
    FAB,
    Portal,
    Divider,
    useTheme,
} from 'react-native-paper';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import { useAppSelector, useAppDispatch, fetchTeamById, fetchTeamPlayers, deletePlayer } from '../../../src/state';
import { useDeviceType } from '../../../src/hooks/useDeviceType';
import { LoadingScreen, EmptyState } from '../../../src/components/common';
import { AddPlayerModal, PlayerListItem } from '../../../src/components/team';
import { PlayerWithPitchTypes } from '@pitch-tracker/shared';
import { useState } from 'react';

export default function TeamDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { isTablet } = useDeviceType();

    const { selectedTeam, players: rawPlayers, loading, playersLoading } = useAppSelector((state) => state.teams);
    const players = rawPlayers || [];
    const [modalVisible, setModalVisible] = useState(false);

    const loadData = useCallback(() => {
        if (id) {
            dispatch(fetchTeamById(id));
            dispatch(fetchTeamPlayers(id));
        }
    }, [id, dispatch]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDeletePlayer = (player: PlayerWithPitchTypes) => {
        Alert.alert(
            'Remove Player',
            `Are you sure you want to remove ${player.first_name} ${player.last_name} from the roster?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(deletePlayer(player.id)).unwrap();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch {
                            Alert.alert('Error', 'Failed to remove player');
                        }
                    },
                },
            ]
        );
    };

    const pitchers = players.filter((p) => p.primary_position === 'P');
    const fieldPlayers = players.filter((p) => p.primary_position !== 'P');

    if (loading && !selectedTeam) {
        return <LoadingScreen message="Loading team..." />;
    }

    const renderRosterTable = (title: string, playerList: PlayerWithPitchTypes[]) => {
        if (playerList.length === 0) return null;

        return (
            <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    {title} ({playerList.length})
                </Text>
                <Card style={styles.rosterCard}>
                    <View style={styles.rosterHeader}>
                        <Text style={[styles.rosterHeaderText, styles.rosterJersey]}>#</Text>
                        <Text style={[styles.rosterHeaderText, styles.rosterNameCol]}>Name</Text>
                        <Text style={[styles.rosterHeaderText, { width: 40, textAlign: 'center' }]}>Pos</Text>
                        <Text style={[styles.rosterHeaderText, { width: 36, textAlign: 'center' }]}>B/T</Text>
                        <View style={{ width: 34 }} />
                    </View>
                    <Divider />
                    {playerList.map((player, idx) => (
                        <React.Fragment key={player.id}>
                            <PlayerListItem player={player} onDelete={handleDeletePlayer} />
                            {idx < playerList.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </Card>
            </View>
        );
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: selectedTeam?.name || 'Team',
                    headerBackTitle: 'Teams',
                }}
            />
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={loading || playersLoading} onRefresh={loadData} />
                    }
                >
                    <Card style={styles.teamInfoCard}>
                        <Card.Content>
                            <Text variant="headlineSmall">{selectedTeam?.name}</Text>
                            {(selectedTeam?.team_type || selectedTeam?.season || selectedTeam?.year) && (
                                <Text variant="bodyMedium" style={styles.teamSeason}>
                                    {[
                                        selectedTeam?.team_type === 'high_school' ? 'High School' : selectedTeam?.team_type === 'travel' ? 'Travel' : selectedTeam?.team_type === 'club' ? 'Club' : selectedTeam?.team_type === 'college' ? 'College' : '',
                                        selectedTeam?.season && selectedTeam?.year ? `${selectedTeam.season} ${selectedTeam.year}` : selectedTeam?.season || (selectedTeam?.year ? `${selectedTeam.year}` : ''),
                                    ].filter(Boolean).join(' \u00B7 ')}
                                </Text>
                            )}
                            <View style={styles.teamStats}>
                                <View style={styles.stat}>
                                    <Text variant="titleLarge" style={{ color: theme.colors.primary }}>
                                        {players.length}
                                    </Text>
                                    <Text variant="bodySmall">Players</Text>
                                </View>
                                <View style={styles.stat}>
                                    <Text variant="titleLarge" style={{ color: theme.colors.primary }}>
                                        {pitchers.length}
                                    </Text>
                                    <Text variant="bodySmall">Pitchers</Text>
                                </View>
                                <View style={styles.stat}>
                                    <Text variant="titleLarge" style={{ color: theme.colors.primary }}>
                                        {fieldPlayers.length}
                                    </Text>
                                    <Text variant="bodySmall">Position</Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>

                    {renderRosterTable('Pitchers', pitchers)}
                    {renderRosterTable('Position Players', fieldPlayers)}

                    {players.length === 0 && !playersLoading && (
                        <EmptyState
                            icon="account-plus-outline"
                            title="No Players Yet"
                            message="Add players to your roster"
                            actionLabel="Add Player"
                            onAction={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setModalVisible(true);
                            }}
                        />
                    )}
                </ScrollView>

                <FAB
                    icon="account-plus"
                    style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                    color={theme.colors.onPrimary}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setModalVisible(true);
                    }}
                    label={isTablet ? 'Add Player' : undefined}
                />

                <Portal>
                    <AddPlayerModal
                        visible={modalVisible}
                        onDismiss={() => setModalVisible(false)}
                        teamId={id!}
                        isTablet={isTablet}
                    />
                </Portal>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 80,
    },
    teamInfoCard: {
        backgroundColor: '#ffffff',
        marginBottom: 16,
    },
    teamSeason: {
        color: '#6b7280',
        marginTop: 4,
    },
    teamStats: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 32,
    },
    stat: {
        alignItems: 'center',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        marginBottom: 8,
        color: '#374151',
    },
    rosterCard: {
        backgroundColor: '#ffffff',
        overflow: 'hidden',
    },
    rosterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f9fafb',
    },
    rosterHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
    },
    rosterJersey: {
        width: 40,
    },
    rosterNameCol: {
        flex: 1,
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
    },
});
