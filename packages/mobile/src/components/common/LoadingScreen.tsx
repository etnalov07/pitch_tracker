import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

interface LoadingScreenProps {
    message?: string;
    size?: 'small' | 'large';
    fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = 'Loading...',
    size = 'large',
    fullScreen = true,
}) => {
    const theme = useTheme();

    return (
        <View style={[styles.container, fullScreen && styles.fullScreen]}>
            <ActivityIndicator size={size} color={theme.colors.primary} />
            {message && (
                <Text variant="bodyMedium" style={styles.message}>
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
        backgroundColor: '#f3f4f6',
    },
    message: {
        marginTop: 16,
        color: '#6b7280',
        textAlign: 'center',
    },
});

export default LoadingScreen;
