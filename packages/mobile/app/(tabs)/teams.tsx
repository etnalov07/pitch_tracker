import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { Text, Card, Button, useTheme, FAB, Portal, Modal, TextInput, IconButton, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useDeviceType } from '../../src/hooks/useDeviceType';
import { useAppSelector, useAppDispatch, fetchAllTeams, createTeam } from '../../src/state';
import { EmptyState } from '../../src/components/common';
import { Team } from '@pitch-tracker/shared';

const TeamCard: React.FC<{ team: Team; onPress: () => void }> = ({ team, onPress }) => {
    const theme = useTheme();

    return (
        <Pressable onPress={onPress}>
            <Card style={styles.teamCard}>
                <Card.Content style={styles.teamCardContent}>
                    <Avatar.Text
                        size={48}
                        label={team.name.substring(0, 2).toUpperCase()}
                        style={{ backgroundColor: theme.colors.primary }}
                    />
                    <View style={styles.teamInfo}>
                        <Text variant="titleMedium" numberOfLines={1}>
                            {team.name}
                        </Text>
                        {team.season && (
                            <Text variant="bodySmall" style={styles.teamSeason}>
                                {team.season}
                            </Text>
                        )}
                    </View>
                    <IconButton icon="chevron-right" size={24} />
                </Card.Content>
            </Card>
        </Pressable>
    );
};

export default function TeamsScreen() {
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { isTablet } = useDeviceType();
    const { teams, loading } = useAppSelector((state) => state.teams);

    const [modalVisible, setModalVisible] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamSeason, setNewTeamSeason] = useState('');
    const [creating, setCreating] = useState(false);

    const loadTeams = useCallback(() => {
        dispatch(fetchAllTeams());
    }, [dispatch]);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) {
            Alert.alert('Error', 'Please enter a team name');
            return;
        }

        setCreating(true);
        try {
            await dispatch(createTeam({
                name: newTeamName.trim(),
                season: newTeamSeason.trim() || undefined,
            })).unwrap();
            setModalVisible(false);
            setNewTeamName('');
            setNewTeamSeason('');
        } catch {
            Alert.alert('Error', 'Failed to create team');
        } finally {
            setCreating(false);
        }
    };

    const handleTeamPress = (team: Team) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/team/${team.id}`);
    };

    const handleFabPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setModalVisible(true);
    };

    const handleCreateSubmit = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await handleCreateTeam();
    };

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    teams.length === 0 && styles.scrollContentEmpty,
                ]}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={loadTeams} />
                }
            >
                {teams.length > 0 ? (
                    <View style={[styles.teamList, isTablet && styles.teamListTablet]}>
                        {teams.map((team) => (
                            <TeamCard
                                key={team.id}
                                team={team}
                                onPress={() => handleTeamPress(team)}
                            />
                        ))}
                    </View>
                ) : !loading ? (
                    <EmptyState
                        icon="account-group"
                        title="No Teams Yet"
                        message="Create your first team to start tracking pitches"
                        actionLabel="Create Team"
                        onAction={handleFabPress}
                    />
                ) : null}
            </ScrollView>

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color={theme.colors.onPrimary}
                onPress={handleFabPress}
                label={isTablet ? 'New Team' : undefined}
            />

            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={() => setModalVisible(false)}
                    contentContainerStyle={[styles.modal, isTablet && styles.modalTablet]}
                >
                    <Text variant="titleLarge" style={styles.modalTitle}>
                        Create Team
                    </Text>
                    <TextInput
                        label="Team Name"
                        value={newTeamName}
                        onChangeText={setNewTeamName}
                        mode="outlined"
                        style={styles.input}
                        autoFocus
                    />
                    <TextInput
                        label="Season (optional)"
                        value={newTeamSeason}
                        onChangeText={setNewTeamSeason}
                        mode="outlined"
                        style={styles.input}
                        placeholder="e.g., Spring 2024"
                    />
                    <View style={styles.modalActions}>
                        <Button onPress={() => setModalVisible(false)}>
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleCreateSubmit}
                            loading={creating}
                            disabled={creating || !newTeamName.trim()}
                        >
                            Create
                        </Button>
                    </View>
                </Modal>
            </Portal>
        </View>
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
    scrollContentEmpty: {
        flexGrow: 1,
    },
    teamList: {
        gap: 12,
    },
    teamListTablet: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    teamCard: {
        backgroundColor: '#ffffff',
    },
    teamCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamInfo: {
        flex: 1,
        marginLeft: 16,
    },
    teamSeason: {
        color: '#6b7280',
        marginTop: 2,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    createButton: {
        marginTop: 8,
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
    },
    modalTablet: {
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
    },
    modalTitle: {
        marginBottom: 16,
    },
    input: {
        marginBottom: 12,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8,
    },
});
