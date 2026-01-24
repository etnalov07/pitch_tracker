import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../src/state';
import { useDeviceType } from '../../src/hooks/useDeviceType';

export default function DashboardScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { user } = useAppSelector((state) => state.auth);
    const { isTablet } = useDeviceType();

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text variant="headlineSmall" style={styles.greeting}>
                    Welcome, {user?.first_name || 'Coach'}!
                </Text>

                <View style={[styles.cardGrid, isTablet && styles.cardGridTablet]}>
                    <Card style={[styles.card, isTablet && styles.cardTablet]}>
                        <Card.Title title="Active Games" />
                        <Card.Content>
                            <Text variant="displaySmall" style={{ color: theme.colors.primary }}>
                                0
                            </Text>
                            <Text variant="bodyMedium" style={styles.cardSubtext}>
                                No active games
                            </Text>
                        </Card.Content>
                        <Card.Actions>
                            <Button onPress={() => router.push('/teams')}>
                                Start New Game
                            </Button>
                        </Card.Actions>
                    </Card>

                    <Card style={[styles.card, isTablet && styles.cardTablet]}>
                        <Card.Title title="Recent Games" />
                        <Card.Content>
                            <Text variant="bodyMedium" style={styles.cardSubtext}>
                                No recent games
                            </Text>
                        </Card.Content>
                        <Card.Actions>
                            <Button onPress={() => router.push('/teams')}>
                                View All
                            </Button>
                        </Card.Actions>
                    </Card>

                    <Card style={[styles.card, isTablet && styles.cardTablet]}>
                        <Card.Title title="My Teams" />
                        <Card.Content>
                            <Text variant="displaySmall" style={{ color: theme.colors.primary }}>
                                0
                            </Text>
                            <Text variant="bodyMedium" style={styles.cardSubtext}>
                                No teams yet
                            </Text>
                        </Card.Content>
                        <Card.Actions>
                            <Button onPress={() => router.push('/teams')}>
                                Manage Teams
                            </Button>
                        </Card.Actions>
                    </Card>
                </View>
            </ScrollView>

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color={theme.colors.onPrimary}
                onPress={() => router.push('/teams')}
                label={isTablet ? 'New Game' : undefined}
            />
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
    greeting: {
        marginBottom: 20,
    },
    cardGrid: {
        gap: 16,
    },
    cardGridTablet: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    card: {
        backgroundColor: '#ffffff',
    },
    cardTablet: {
        flex: 1,
        minWidth: 280,
        maxWidth: '48%',
    },
    cardSubtext: {
        color: '#6b7280',
        marginTop: 4,
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
    },
});
