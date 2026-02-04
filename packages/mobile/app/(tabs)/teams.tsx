import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { Text, Card, Button, useTheme, FAB, Portal, Modal, TextInput, IconButton, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useDeviceType } from '../../src/hooks/useDeviceType';
import { useAppSelector, useAppDispatch, fetchAllTeams, createTeam } from '../../src/state';
import { EmptyState } from '../../src/components/common';
import { Team, TeamType, TeamSeason } from '@pitch-tracker/shared';

const TEAM_TYPE_LABELS: Record<string, string> = {
    high_school: 'High School',
    travel: 'Travel',
    club: 'Club',
    college: 'College',
};

const formatTeamMeta = (team: Team): string | null => {
    const parts = [
        team.team_type ? TEAM_TYPE_LABELS[team.team_type] : '',
        team.season && team.year ? `${team.season} ${team.year}` : team.season || (team.year ? `${team.year}` : ''),
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' \u00B7 ') : null;
};

const TeamCard: React.FC<{ team: Team; onPress: () => void }> = ({ team, onPress }) => {
    const theme = useTheme();
    const meta = formatTeamMeta(team);

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
                        {meta && (
                            <Text variant="bodySmall" style={styles.teamSeason}>
                                {meta}
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
    const [newTeamType, setNewTeamType] = useState<TeamType | ''>('');
    const [newTeamSeason, setNewTeamSeason] = useState<TeamSeason | ''>('');
    const [newTeamYear, setNewTeamYear] = useState('');
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
                team_type: newTeamType || undefined,
                season: newTeamSeason || undefined,
                year: newTeamYear ? parseInt(newTeamYear, 10) : undefined,
            })).unwrap();
            setModalVisible(false);
            setNewTeamName('');
            setNewTeamType('');
            setNewTeamSeason('');
            setNewTeamYear('');
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
                    <Text variant="labelMedium" style={styles.pickerLabel}>Team Type</Text>
                    <View style={styles.chipRow}>
                        {(['high_school', 'travel', 'club', 'college'] as TeamType[]).map((type) => (
                            <Button
                                key={type}
                                mode={newTeamType === type ? 'contained' : 'outlined'}
                                compact
                                onPress={() => setNewTeamType(newTeamType === type ? '' : type)}
                                style={styles.chip}
                            >
                                {TEAM_TYPE_LABELS[type]}
                            </Button>
                        ))}
                    </View>
                    <Text variant="labelMedium" style={styles.pickerLabel}>Season</Text>
                    <View style={styles.chipRow}>
                        {(['Spring', 'Summer', 'Fall', 'Winter'] as TeamSeason[]).map((s) => (
                            <Button
                                key={s}
                                mode={newTeamSeason === s ? 'contained' : 'outlined'}
                                compact
                                onPress={() => setNewTeamSeason(newTeamSeason === s ? '' : s)}
                                style={styles.chip}
                            >
                                {s}
                            </Button>
                        ))}
                    </View>
                    <TextInput
                        label="Year"
                        value={newTeamYear}
                        onChangeText={setNewTeamYear}
                        mode="outlined"
                        style={styles.input}
                        keyboardType="number-pad"
                        placeholder={`e.g., ${new Date().getFullYear()}`}
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
    pickerLabel: {
        color: '#6b7280',
        marginBottom: 6,
        marginTop: 4,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    chip: {
        borderRadius: 20,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8,
    },
});
