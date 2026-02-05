import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useAppSelector } from '../../state';
// Offline service disabled for iOS 26.2 beta testing
// import { triggerSync } from '../../services/offlineService';
import { colors } from '../../styles/theme';

interface SyncStatusBadgeProps {
    compact?: boolean;
}

const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ compact = false }) => {
    const { isOnline, isSyncing, pendingCount, lastSyncTime } = useAppSelector(
        (state) => state.offline
    );

    const handlePress = async () => {
        // Offline sync disabled for iOS 26.2 beta testing
        // if (isOnline && pendingCount > 0 && !isSyncing) {
        //     await triggerSync();
        // }
    };

    const getStatusColor = () => {
        if (!isOnline) return colors.gray[500];
        if (isSyncing) return colors.primary[500];
        if (pendingCount > 0) return colors.yellow[500];
        return colors.green[500];
    };

    const getStatusText = () => {
        if (!isOnline) return 'Offline';
        if (isSyncing) return 'Syncing...';
        if (pendingCount > 0) return `${pendingCount} pending`;
        return 'Synced';
    };

    if (compact) {
        // Just show a colored dot
        return (
            <Pressable onPress={handlePress}>
                <View style={[styles.dot, { backgroundColor: getStatusColor() }]}>
                    {pendingCount > 0 && !isSyncing && (
                        <Text style={styles.dotCount}>{pendingCount}</Text>
                    )}
                    {isSyncing && (
                        <ActivityIndicator size={8} color="#fff" />
                    )}
                </View>
            </Pressable>
        );
    }

    return (
        <Pressable onPress={handlePress} style={styles.container}>
            <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
            <View style={styles.content}>
                <Text style={styles.statusText}>{getStatusText()}</Text>
                {isSyncing && (
                    <ActivityIndicator size={12} style={styles.spinner} />
                )}
            </View>
            {pendingCount > 0 && !isSyncing && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray[100],
        borderRadius: 16,
        paddingVertical: 4,
        paddingHorizontal: 10,
        gap: 6,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        color: colors.gray[700],
        fontWeight: '500',
    },
    spinner: {
        marginLeft: 4,
    },
    badge: {
        backgroundColor: colors.yellow[500],
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#fff',
    },
    dot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotCount: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
});

export default SyncStatusBadge;
