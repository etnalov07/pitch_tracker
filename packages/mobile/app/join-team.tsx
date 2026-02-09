import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface, Card, Chip, Divider } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import {
    useAppDispatch,
    useAppSelector,
    searchTeams,
    createJoinRequest,
    fetchMyJoinRequests,
    clearSearchResults,
} from '../src/state';

export default function JoinTeamScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { searchResults, myJoinRequests, error } = useAppSelector((state) => state.invites);

    const [query, setQuery] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchMyJoinRequests());
        return () => {
            dispatch(clearSearchResults());
        };
    }, [dispatch]);

    const handleSearch = () => {
        if (query.trim().length >= 2) {
            dispatch(searchTeams(query.trim()));
        }
    };

    const handleJoinRequest = async (teamId: string, teamName: string) => {
        const result = await dispatch(createJoinRequest({ team_id: teamId }));
        if (createJoinRequest.fulfilled.match(result)) {
            setSuccessMessage(`Request sent to ${teamName}!`);
            dispatch(fetchMyJoinRequests());
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    };

    const hasPendingRequest = (teamId: string) => {
        return myJoinRequests.some((r) => r.team_id === teamId && r.status === 'pending');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return '#ca8a04';
            case 'approved':
                return '#16a34a';
            case 'denied':
                return '#dc2626';
            default:
                return '#6b7280';
        }
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Find a Team', headerBackTitle: 'Back' }} />
            <ScrollView style={styles.container}>
                {error && <Text style={styles.errorText}>{error}</Text>}
                {successMessage && <Text style={styles.successText}>{successMessage}</Text>}

                <View style={styles.searchRow}>
                    <TextInput
                        mode="outlined"
                        placeholder="Search teams by name..."
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        style={styles.searchInput}
                        dense
                    />
                    <Button mode="contained" onPress={handleSearch} disabled={query.trim().length < 2} compact>
                        Search
                    </Button>
                </View>

                {searchResults.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Search Results
                        </Text>
                        {searchResults.map((team) => (
                            <Card key={team.id} style={styles.resultCard}>
                                <Card.Content style={styles.resultContent}>
                                    <View style={styles.resultInfo}>
                                        <Text variant="titleSmall">{team.name}</Text>
                                        {team.city && (
                                            <Text variant="bodySmall" style={styles.cityText}>
                                                {team.city}
                                            </Text>
                                        )}
                                    </View>
                                    <Button
                                        mode="contained"
                                        compact
                                        onPress={() => handleJoinRequest(team.id, team.name)}
                                        disabled={hasPendingRequest(team.id)}
                                        buttonColor={hasPendingRequest(team.id) ? '#9ca3af' : '#16a34a'}
                                    >
                                        {hasPendingRequest(team.id) ? 'Requested' : 'Join'}
                                    </Button>
                                </Card.Content>
                            </Card>
                        ))}
                    </View>
                )}

                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        My Join Requests
                    </Text>
                    {myJoinRequests.length > 0 ? (
                        myJoinRequests.map((request) => (
                            <Card key={request.id} style={styles.requestCard}>
                                <Card.Content style={styles.requestContent}>
                                    <Text variant="bodyMedium" style={styles.requestTeam}>
                                        {request.team_name || 'Team'}
                                    </Text>
                                    <Chip
                                        compact
                                        textStyle={{ fontSize: 11, color: getStatusColor(request.status) }}
                                        style={[styles.statusChip]}
                                    >
                                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                    </Chip>
                                </Card.Content>
                            </Card>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No join requests yet. Search for a team above.</Text>
                    )}
                </View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        padding: 16,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontWeight: '600',
        marginBottom: 12,
        color: '#1f2937',
    },
    resultCard: {
        marginBottom: 8,
        backgroundColor: '#ffffff',
    },
    resultContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resultInfo: {
        flex: 1,
    },
    cityText: {
        color: '#6b7280',
        marginTop: 2,
    },
    requestCard: {
        marginBottom: 8,
        backgroundColor: '#ffffff',
    },
    requestContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    requestTeam: {
        fontWeight: '500',
    },
    statusChip: {
        backgroundColor: '#f3f4f6',
    },
    emptyText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: 20,
    },
    errorText: {
        color: '#dc2626',
        backgroundColor: '#fef2f2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        textAlign: 'center',
    },
    successText: {
        color: '#16a34a',
        backgroundColor: '#f0fdf4',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        textAlign: 'center',
    },
});
