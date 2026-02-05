import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Divider, Button, useTheme, Avatar, Switch, ActivityIndicator } from 'react-native-paper';
import Constants from 'expo-constants';
import * as Haptics from '../../src/utils/haptics';
import { useAppSelector, useAppDispatch, logoutUser } from '../../src/state';
import { useDeviceType } from '../../src/hooks/useDeviceType';
// Offline service disabled for iOS 26.2 beta testing
// import { triggerSync } from '../../src/services/offlineService';
// import { clearAllActions } from '../../src/db/offlineQueue';

export default function SettingsScreen() {
    const dispatch = useAppDispatch();
    const theme = useTheme();
    const { user } = useAppSelector((state) => state.auth);
    const { isOnline, isSyncing, pendingCount, lastSyncTime } = useAppSelector((state) => state.offline);
    const { isTablet } = useDeviceType();
    const [syncing, setSyncing] = useState(false);

    const handleLogout = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    dispatch(logoutUser());
                }},
            ]
        );
    };

    const handleManualSync = async () => {
        // Offline sync disabled for iOS 26.2 beta testing
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Info', 'Offline sync is temporarily disabled');
    };

    const handleClearPending = () => {
        // Offline sync disabled for iOS 26.2 beta testing
        Alert.alert('Info', 'Offline sync is temporarily disabled');
    };

    const formatLastSync = () => {
        if (!lastSyncTime) return 'Never';
        const date = new Date(lastSyncTime);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    const getInitials = () => {
        if (!user) return '?';
        const first = user.first_name?.[0] || '';
        const last = user.last_name?.[0] || '';
        return (first + last).toUpperCase() || '?';
    };

    return (
        <ScrollView style={styles.container}>
            <View style={[styles.content, isTablet && styles.contentTablet]}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <Avatar.Text
                        size={80}
                        label={getInitials()}
                        style={{ backgroundColor: theme.colors.primary }}
                    />
                    <Text variant="headlineSmall" style={styles.userName}>
                        {user?.first_name} {user?.last_name}
                    </Text>
                    <Text variant="bodyMedium" style={styles.userEmail}>
                        {user?.email}
                    </Text>
                </View>

                <Divider style={styles.divider} />

                {/* Settings List */}
                <List.Section>
                    <List.Subheader>Account</List.Subheader>
                    <List.Item
                        title="Edit Profile"
                        left={(props) => <List.Icon {...props} icon="account-edit" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => {/* TODO */}}
                    />
                    <List.Item
                        title="Change Password"
                        left={(props) => <List.Icon {...props} icon="lock" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => {/* TODO */}}
                    />
                </List.Section>

                <Divider style={styles.divider} />

                <List.Section>
                    <List.Subheader>Sync & Data</List.Subheader>
                    <List.Item
                        title="Connection Status"
                        description={isOnline ? 'Online' : 'Offline'}
                        left={(props) => (
                            <List.Icon
                                {...props}
                                icon={isOnline ? 'wifi' : 'wifi-off'}
                                color={isOnline ? '#10b981' : '#ef4444'}
                            />
                        )}
                    />
                    <List.Item
                        title="Pending Actions"
                        description={
                            pendingCount > 0
                                ? `${pendingCount} action(s) waiting to sync`
                                : 'All data synced'
                        }
                        left={(props) => (
                            <List.Icon
                                {...props}
                                icon={pendingCount > 0 ? 'cloud-upload' : 'cloud-check'}
                                color={pendingCount > 0 ? '#f59e0b' : '#10b981'}
                            />
                        )}
                        right={() =>
                            isSyncing || syncing ? (
                                <ActivityIndicator size={20} />
                            ) : pendingCount > 0 ? (
                                <Button
                                    compact
                                    mode="text"
                                    onPress={handleManualSync}
                                    disabled={!isOnline}
                                >
                                    Sync
                                </Button>
                            ) : null
                        }
                    />
                    <List.Item
                        title="Last Sync"
                        description={formatLastSync()}
                        left={(props) => <List.Icon {...props} icon="history" />}
                    />
                    {pendingCount > 0 && (
                        <List.Item
                            title="Clear Pending"
                            description="Delete unsynced data"
                            left={(props) => <List.Icon {...props} icon="delete" color="#ef4444" />}
                            onPress={handleClearPending}
                        />
                    )}
                </List.Section>

                <Divider style={styles.divider} />

                <List.Section>
                    <List.Subheader>About</List.Subheader>
                    <List.Item
                        title="Version"
                        description={Constants.expoConfig?.version || '1.0.0'}
                        left={(props) => <List.Icon {...props} icon="information" />}
                    />
                    <List.Item
                        title="Privacy Policy"
                        left={(props) => <List.Icon {...props} icon="shield-account" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => {/* TODO */}}
                    />
                    <List.Item
                        title="Terms of Service"
                        left={(props) => <List.Icon {...props} icon="file-document" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => {/* TODO */}}
                    />
                </List.Section>

                <View style={styles.logoutSection}>
                    <Button
                        mode="outlined"
                        onPress={handleLogout}
                        textColor={theme.colors.error}
                        style={styles.logoutButton}
                    >
                        Sign Out
                    </Button>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    content: {
        flex: 1,
    },
    contentTablet: {
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: '#ffffff',
    },
    userName: {
        marginTop: 16,
        fontWeight: 'bold',
    },
    userEmail: {
        color: '#6b7280',
        marginTop: 4,
    },
    divider: {
        marginVertical: 8,
    },
    logoutSection: {
        padding: 24,
        alignItems: 'center',
    },
    logoutButton: {
        borderColor: '#ef4444',
        minWidth: 200,
    },
});
