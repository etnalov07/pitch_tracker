import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Surface, ActivityIndicator, Card } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector, fetchInviteByToken, acceptInvite } from '../../src/state';

export default function InviteAcceptScreen() {
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
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Loading invite...</Text>
            </View>
        );
    }

    if (accepted) {
        return (
            <View style={styles.centered}>
                <Surface style={styles.surface} elevation={2}>
                    <Text variant="headlineSmall" style={styles.title}>You're In!</Text>
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
        <ScrollView contentContainerStyle={styles.container}>
            <Surface style={styles.surface} elevation={2}>
                <Text variant="headlineSmall" style={styles.title}>Team Invite</Text>
                <Text variant="bodyMedium" style={styles.subtitle}>
                    You've been invited to join a team
                </Text>

                {error && (
                    <Text style={styles.errorText}>{error}</Text>
                )}

                {currentInvite ? (
                    <>
                        <Card style={styles.infoCard}>
                            <Card.Content>
                                <InfoRow label="Team" value={currentInvite.team_name || 'Team'} />
                                <InfoRow label="Role" value={currentInvite.role} />
                                {currentInvite.player_name && (
                                    <InfoRow label="Player" value={currentInvite.player_name} />
                                )}
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
                    !error && (
                        <Text style={styles.errorText}>
                            This invite is no longer valid or has expired.
                        </Text>
                    )
                )}

                <Button mode="text" onPress={() => router.replace('/')}>
                    Back to Home
                </Button>
            </Surface>
        </ScrollView>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text variant="bodySmall" style={styles.infoLabel}>{label}</Text>
            <Text variant="bodyMedium" style={styles.infoValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f3f4f6',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f3f4f6',
    },
    surface: {
        padding: 24,
        borderRadius: 12,
        backgroundColor: '#ffffff',
    },
    title: {
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        textAlign: 'center',
        color: '#6b7280',
        marginBottom: 20,
    },
    loadingText: {
        marginTop: 12,
        color: '#6b7280',
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
        backgroundColor: '#f9fafb',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    infoLabel: {
        color: '#6b7280',
    },
    infoValue: {
        fontWeight: '600',
        color: '#111827',
    },
    acceptButton: {
        marginBottom: 12,
    },
    button: {
        marginTop: 8,
    },
});
