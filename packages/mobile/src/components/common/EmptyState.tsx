import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon, useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

interface EmptyStateProps {
    icon?: string;
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'inbox-outline',
    title,
    message,
    actionLabel,
    onAction,
}) => {
    const theme = useTheme();

    const handleAction = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onAction?.();
    };

    return (
        <View style={styles.container}>
            <Icon source={icon} size={64} color={theme.colors.outline} />
            <Text variant="titleMedium" style={styles.title}>
                {title}
            </Text>
            {message && (
                <Text variant="bodyMedium" style={styles.message}>
                    {message}
                </Text>
            )}
            {actionLabel && onAction && (
                <Button mode="contained" onPress={handleAction} style={styles.button}>
                    {actionLabel}
                </Button>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        minHeight: 300,
    },
    title: {
        marginTop: 16,
        textAlign: 'center',
    },
    message: {
        marginTop: 8,
        color: '#6b7280',
        textAlign: 'center',
        maxWidth: 280,
    },
    button: {
        marginTop: 24,
    },
});

export default EmptyState;
