import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Text, Button, useTheme, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDeviceType } from '../../../src/hooks/useDeviceType';

export default function LiveGameScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const { isTablet, isLandscape } = useDeviceType();

    // Tablet landscape layout: split view with stats panel
    if (isTablet && isLandscape) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleLarge">Live Game</Text>
                    <View style={{ width: 48 }} />
                </View>

                <View style={styles.tabletContent}>
                    {/* Left Panel - Stats */}
                    <View style={styles.statsPanel}>
                        <Text variant="titleMedium">Pitcher Stats</Text>
                        <Text variant="bodyMedium" style={styles.placeholder}>
                            Stats will appear here
                        </Text>
                    </View>

                    {/* Right Panel - Strike Zone & Controls */}
                    <View style={styles.mainPanel}>
                        <View style={styles.strikeZonePlaceholder}>
                            <Text variant="titleMedium">Strike Zone</Text>
                            <Text variant="bodyMedium" style={styles.placeholder}>
                                Game ID: {id}
                            </Text>
                            <Text variant="bodyMedium" style={styles.placeholder}>
                                Touch-optimized strike zone will be implemented here
                            </Text>
                        </View>

                        <View style={styles.controlsPlaceholder}>
                            <Text variant="titleMedium">Pitch Controls</Text>
                            <Text variant="bodyMedium" style={styles.placeholder}>
                                Pitch type, velocity, result buttons
                            </Text>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Phone/tablet portrait layout: stacked view
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <Text variant="titleLarge">Live Game</Text>
                <View style={{ width: 48 }} />
            </View>

            <View style={styles.phoneContent}>
                <View style={styles.strikeZonePlaceholder}>
                    <Text variant="titleMedium">Strike Zone</Text>
                    <Text variant="bodyMedium" style={styles.placeholder}>
                        Game ID: {id}
                    </Text>
                    <Text variant="bodyMedium" style={styles.placeholder}>
                        Touch-optimized strike zone will be implemented here
                    </Text>
                </View>

                <View style={styles.controlsPlaceholder}>
                    <Text variant="titleMedium">Pitch Controls</Text>
                    <Text variant="bodyMedium" style={styles.placeholder}>
                        Pitch type, velocity, result buttons
                    </Text>
                </View>

                <Button
                    mode="contained"
                    onPress={() => {/* TODO: Log pitch */}}
                    style={styles.logButton}
                >
                    Log Pitch
                </Button>
            </View>
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
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    tabletContent: {
        flex: 1,
        flexDirection: 'row',
    },
    statsPanel: {
        width: 300,
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
        padding: 16,
    },
    mainPanel: {
        flex: 1,
        padding: 16,
    },
    phoneContent: {
        flex: 1,
        padding: 16,
    },
    strikeZonePlaceholder: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        minHeight: 300,
    },
    controlsPlaceholder: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
    },
    placeholder: {
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },
    logButton: {
        marginTop: 8,
    },
});
