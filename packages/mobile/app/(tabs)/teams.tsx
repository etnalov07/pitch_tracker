import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme, FAB } from 'react-native-paper';
import { useDeviceType } from '../../src/hooks/useDeviceType';

export default function TeamsScreen() {
    const theme = useTheme();
    const { isTablet } = useDeviceType();

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.emptyState}>
                    <Text variant="headlineSmall" style={styles.emptyTitle}>
                        No Teams Yet
                    </Text>
                    <Text variant="bodyMedium" style={styles.emptyText}>
                        Create your first team to start tracking pitches
                    </Text>
                    <Button
                        mode="contained"
                        icon="plus"
                        onPress={() => {/* TODO: Navigate to create team */}}
                        style={styles.createButton}
                    >
                        Create Team
                    </Button>
                </View>
            </ScrollView>

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color={theme.colors.onPrimary}
                onPress={() => {/* TODO: Navigate to create team */}}
                label={isTablet ? 'New Team' : undefined}
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
        flexGrow: 1,
        padding: 16,
        paddingBottom: 80,
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
});
