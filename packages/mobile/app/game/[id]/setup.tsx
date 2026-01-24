import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';

export default function GameSetupScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall">Game Setup</Text>
            <Text variant="bodyMedium" style={styles.placeholder}>
                Game ID: {id}
            </Text>
            <Text variant="bodyMedium" style={styles.placeholder}>
                Setup screen coming soon...
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f3f4f6',
    },
    placeholder: {
        color: '#6b7280',
        marginTop: 8,
    },
});
