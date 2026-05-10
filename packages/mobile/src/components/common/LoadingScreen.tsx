import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

interface LoadingScreenProps {
    message?: string;
    size?: 'small' | 'large';
    fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...', size = 'large', fullScreen = true }) => {
    const theme = useTheme();

    return (
        <View
            style={[styles.container, fullScreen && styles.fullScreen, fullScreen && { backgroundColor: theme.colors.background }]}
        >
            <ActivityIndicator size={size} color={theme.colors.primary} />
            {message && (
                <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
                    {message}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    fullScreen: {
        flex: 1,
    },
    message: {
        marginTop: 16,
        textAlign: 'center',
    },
});

export default LoadingScreen;
