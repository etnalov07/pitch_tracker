import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme, Icon } from 'react-native-paper';
import * as Haptics from '../../utils/haptics';

interface ErrorScreenProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    onGoBack?: () => void;
    fullScreen?: boolean;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({
    title = 'Something went wrong',
    message = 'An error occurred. Please try again.',
    onRetry,
    onGoBack,
    fullScreen = true,
}) => {
    const theme = useTheme();

    const handleRetry = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onRetry?.();
    };

    const handleGoBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onGoBack?.();
    };

    return (
        <View
            style={[styles.container, fullScreen && styles.fullScreen, fullScreen && { backgroundColor: theme.colors.background }]}
        >
            <Icon source="alert-circle-outline" size={64} color={theme.colors.error} />
            <Text variant="titleLarge" style={styles.title}>
                {title}
            </Text>
            <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
                {message}
            </Text>
            <View style={styles.actions}>
                {onRetry && (
                    <Button mode="contained" onPress={handleRetry} style={styles.button}>
                        Try Again
                    </Button>
                )}
                {onGoBack && (
                    <Button mode="outlined" onPress={handleGoBack} style={styles.button}>
                        Go Back
                    </Button>
                )}
            </View>
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
    title: {
        marginTop: 16,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    message: {
        marginTop: 8,
        textAlign: 'center',
        maxWidth: 300,
    },
    actions: {
        marginTop: 24,
        gap: 12,
    },
    button: {
        minWidth: 150,
    },
});

export default ErrorScreen;
