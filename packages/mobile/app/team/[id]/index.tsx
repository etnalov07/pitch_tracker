import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
    Text,
    Card,
    Button,
    useTheme,
    FAB,
    Portal,
    Modal,
    TextInput,
    IconButton,
    Chip,
    SegmentedButtons,
    Divider,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAppSelector, useAppDispatch, fetchTeamById, fetchTeamPlayers, addPlayer, deletePlayer } from '../../../src/state';
import { useDeviceType } from '../../../src/hooks/useDeviceType';
import { LoadingScreen, EmptyState } from '../../../src/components/common';
import { PlayerWithPitchTypes, PlayerPosition, HandednessType, ThrowingHand } from '@pitch-tracker/shared';

const POSITIONS: PlayerPosition[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UTIL'];

const getPositionColor = (pos: string): string => {
    switch (pos) {
        case 'P': return '#ef4444';
        case 'C': return '#3b82f6';
        case '1B': return '#22c55e';
        case '2B': return '#16a34a';
        case '3B': return '#eab308';
        case 'SS': return '#15803d';
        case 'LF': return '#2563eb';
        case 'CF': return '#1d4ed8';
        case 'RF': return '#3b82f6';
        case 'DH': return '#6b7280';
        default: return '#6b7280';
    }
};

export default function TeamDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { isTablet } = useDeviceType();

    const { selectedTeam, players: rawPlayers, loading, playersLoading } = useAppSelector((state) => state.teams);
    const players = rawPlayers || [];

    const [modalVisible, setModalVisible] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [jerseyNumber, setJerseyNumber] = useState('');
    const [position, setPosition] = useState<PlayerPosition>('P');
    const [throws, setThrows] = useState<ThrowingHand>('R');
    const [bats, setBats] = useState<HandednessType>('R');
    const [creating, setCreating] = useState(false);

    const loadData = useCallback(() => {
        if (id) {
            dispatch(fetchTeamById(id));
            dispatch(fetchTeamPlayers(id));
        }
    }, [id, dispatch]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddPlayer = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Please enter first and last name');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCreating(true);
        try {
            await dispatch(addPlayer({
                teamId: id!,
                data: {
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    jersey_number: jerseyNumber ? parseInt(jerseyNumber, 10) : undefined,
                    primary_position: position,
                    throws,
                    bats,
                },
            })).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setModalVisible(false);
            resetForm();
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to add player');
        } finally {
            setCreating(false);
        }
    };

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

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setJerseyNumber('');
        setPosition('P');
        setThrows('R');
        setBats('R');
    };

    const pitchers = players.filter((p) => p.primary_position === 'P');
    const fieldPlayers = players.filter((p) => p.primary_position !== 'P');

    if (loading && !selectedTeam) {
        return <LoadingScreen message="Loading team..." />;
    }

    const renderRosterRow = (player: PlayerWithPitchTypes) => (
        <View key={player.id} style={styles.rosterRow}>
            <Text style={styles.rosterJersey}>
                {player.jersey_number != null ? `#${player.jersey_number}` : '-'}
            </Text>
            <View style={styles.rosterNameCol}>
                <Text style={styles.rosterName} numberOfLines={1}>
                    {player.first_name} {player.last_name}
                </Text>
            </View>
            <View style={[styles.posBadge, { backgroundColor: getPositionColor(player.primary_position) }]}>
                <Text style={styles.posBadgeText}>{player.primary_position}</Text>
            </View>
            <Text style={styles.rosterBT}>
                {player.bats === 'S' ? 'S' : player.bats}/{player.throws}
            </Text>
            <IconButton
                icon="trash-can-outline"
                size={18}
                iconColor="#9ca3af"
                onPress={() => handleDeletePlayer(player)}
                style={styles.deleteButton}
            />
        </View>
    );

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
                            {renderRosterRow(player)}
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
                    {/* Team Info Card */}
                    <Card style={styles.teamInfoCard}>
                        <Card.Content>
                            <Text variant="headlineSmall">{selectedTeam?.name}</Text>
                            {selectedTeam?.season && (
                                <Text variant="bodyMedium" style={styles.teamSeason}>
                                    {selectedTeam.season}
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

                    {/* Roster Tables */}
                    {renderRosterTable('Pitchers', pitchers)}
                    {renderRosterTable('Position Players', fieldPlayers)}

                    {/* Empty State */}
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
                    <Modal
                        visible={modalVisible}
                        onDismiss={() => setModalVisible(false)}
                        contentContainerStyle={[styles.modal, isTablet && styles.modalTablet]}
                    >
                        <ScrollView>
                            <Text variant="titleLarge" style={styles.modalTitle}>
                                Add Player
                            </Text>
                            <View style={styles.nameRow}>
                                <TextInput
                                    label="First Name"
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    mode="outlined"
                                    style={[styles.input, styles.nameInput]}
                                />
                                <TextInput
                                    label="Last Name"
                                    value={lastName}
                                    onChangeText={setLastName}
                                    mode="outlined"
                                    style={[styles.input, styles.nameInput]}
                                />
                            </View>
                            <TextInput
                                label="Jersey Number"
                                value={jerseyNumber}
                                onChangeText={setJerseyNumber}
                                mode="outlined"
                                keyboardType="numeric"
                                style={styles.input}
                            />
                            <Text variant="labelMedium" style={styles.fieldLabel}>Position</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                                <View style={styles.chipRow}>
                                    {POSITIONS.map((pos) => (
                                        <Chip
                                            key={pos}
                                            selected={position === pos}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setPosition(pos);
                                            }}
                                            style={styles.positionChip}
                                        >
                                            {pos}
                                        </Chip>
                                    ))}
                                </View>
                            </ScrollView>
                            <Text variant="labelMedium" style={styles.fieldLabel}>Throws</Text>
                            <SegmentedButtons
                                value={throws}
                                onValueChange={(v) => {
                                    Haptics.selectionAsync();
                                    setThrows(v as ThrowingHand);
                                }}
                                buttons={[
                                    { value: 'R', label: 'Right' },
                                    { value: 'L', label: 'Left' },
                                ]}
                                style={styles.segmented}
                            />
                            <Text variant="labelMedium" style={styles.fieldLabel}>Bats</Text>
                            <SegmentedButtons
                                value={bats}
                                onValueChange={(v) => {
                                    Haptics.selectionAsync();
                                    setBats(v as HandednessType);
                                }}
                                buttons={[
                                    { value: 'R', label: 'Right' },
                                    { value: 'L', label: 'Left' },
                                    { value: 'S', label: 'Switch' },
                                ]}
                                style={styles.segmented}
                            />
                            <View style={styles.modalActions}>
                                <Button onPress={() => setModalVisible(false)}>Cancel</Button>
                                <Button
                                    mode="contained"
                                    onPress={handleAddPlayer}
                                    loading={creating}
                                    disabled={creating || !firstName.trim() || !lastName.trim()}
                                >
                                    Add Player
                                </Button>
                            </View>
                        </ScrollView>
                    </Modal>
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
    // Roster table styles
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
    rosterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    rosterJersey: {
        width: 40,
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    rosterNameCol: {
        flex: 1,
    },
    rosterName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#111827',
    },
    posBadge: {
        width: 36,
        paddingVertical: 2,
        borderRadius: 4,
        alignItems: 'center',
        marginRight: 4,
    },
    posBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#ffffff',
    },
    rosterBT: {
        width: 32,
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
    },
    deleteButton: {
        margin: 0,
        width: 34,
        height: 34,
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
    },
    modal: {
        backgroundColor: '#ffffff',
        margin: 20,
        padding: 20,
        borderRadius: 12,
        maxHeight: '80%',
    },
    modalTablet: {
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
    },
    modalTitle: {
        marginBottom: 16,
    },
    nameRow: {
        flexDirection: 'row',
        gap: 12,
    },
    nameInput: {
        flex: 1,
    },
    input: {
        marginBottom: 12,
    },
    fieldLabel: {
        marginBottom: 8,
        color: '#374151',
    },
    chipScroll: {
        marginBottom: 12,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
    },
    positionChip: {
        marginRight: 4,
    },
    segmented: {
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8,
    },
});
