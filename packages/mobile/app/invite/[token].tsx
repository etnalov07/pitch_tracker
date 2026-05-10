import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Surface, ActivityIndicator, Card, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector, fetchInviteByToken, acceptInvite } from '../../src/state';

export default function InviteAcceptScreen() {
    const theme = useTheme();
    const { token } = useLocalSearchParams<{ token: string }>();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    const { currentInvite, loading, error } = useAppSelector((state) => state.invites);
    const [accepted, setAccepted] = useState(false);

    useEffect(() => {
        if (token) {
            dispatch(fetchInviteByToken(token));
        }
    }, [token, dispatch]);

    const handleAccept = async () => {
        if (!token) return;

        if (!isAuthenticated) {
            router.replace('/login');
            return;
        }

        const result = await dispatch(acceptInvite(token));
        if (acceptInvite.fulfilled.match(result)) {
            setAccepted(true);
        }
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" />
                <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading invite...</Text>
            </View>
        );
    }

    if (accepted) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <Surface style={styles.surface} elevation={2}>
                    <Text variant="headlineSmall" style={styles.title}>
                        You're In!
                    </Text>
                    <Text variant="bodyMedium" style={styles.successText}>
                        You have successfully joined the team.
                    </Text>
                    <Button mode="contained" onPress={() => router.replace('/')} style={styles.button}>
                        Go to Dashboard
                    </Button>
                </Surface>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Surface style={styles.surface} elevation={2}>
                <Text variant="headlineSmall" style={styles.title}>
                    Team Invite
                </Text>
                <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                    You've been invited to join a team
                </Text>

                {error && <Text style={styles.errorText}>{error}</Text>}

                {currentInvite ? (
                    <>
                        <Card style={styles.infoCard}>
                            <Card.Content>
                                <InfoRow label="Team" value={currentInvite.team_name || 'Team'} />
                                <InfoRow label="Role" value={currentInvite.role} />
                                {currentInvite.player_name && <InfoRow label="Player" value={currentInvite.player_name} />}
                                <InfoRow label="Invited by" value={currentInvite.inviter_name || 'Coach'} />
                            </Card.Content>
                        </Card>

                        <Button
                            mode="contained"
                            onPress={handleAccept}
                            loading={loading}
                            disabled={loading}
                            style={styles.acceptButton}
                            buttonColor="#16a34a"
                        >
                            {isAuthenticated ? 'Accept Invite' : 'Sign In to Accept'}
                        </Button>
                    </>
                ) : (
                    !error && <Text style={styles.errorText}>This invite is no longer valid or has expired.</Text>
                )}

                <Button mode="text" onPress={() => router.replace('/')}>
                    Back to Home
                </Button>
            </Surface>
        </ScrollView>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    const theme = useTheme();
    return (
        <View style={styles.infoRow}>
            <Text variant="bodySmall" style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                {label}
            </Text>
            <Text variant="bodyMedium" style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    surface: {
        padding: 24,
        borderRadius: 12,
    },
    title: {
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 20,
    },
    loadingText: {
        marginTop: 12,
    },
    errorText: {
        color: '#dc2626',
        backgroundColor: '#fef2f2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        textAlign: 'center',
    },
    successText: {
        color: '#16a34a',
        backgroundColor: '#f0fdf4',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        textAlign: 'center',
    },
    infoCard: {
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    infoLabel: {},
    infoValue: {
        fontWeight: '600',
    },
    acceptButton: {
        marginBottom: 12,
    },
    button: {
        marginTop: 8,
    },
});
