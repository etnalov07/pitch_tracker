import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, Divider, Button, useTheme, Avatar } from 'react-native-paper';
import { useAppSelector, useAppDispatch, logoutUser } from '../../src/state';
import { useDeviceType } from '../../src/hooks/useDeviceType';

export default function SettingsScreen() {
    const dispatch = useAppDispatch();
    const theme = useTheme();
    const { user } = useAppSelector((state) => state.auth);
    const { isTablet } = useDeviceType();

    const handleLogout = () => {
        dispatch(logoutUser());
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
                    <List.Subheader>App Settings</List.Subheader>
                    <List.Item
                        title="Notifications"
                        left={(props) => <List.Icon {...props} icon="bell" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => {/* TODO */}}
                    />
                    <List.Item
                        title="Sync Status"
                        description="All data synced"
                        left={(props) => <List.Icon {...props} icon="sync" />}
                        right={(props) => <List.Icon {...props} icon="check-circle" color={theme.colors.tertiary} />}
                    />
                </List.Section>

                <Divider style={styles.divider} />

                <List.Section>
                    <List.Subheader>About</List.Subheader>
                    <List.Item
                        title="Version"
                        description="1.0.0"
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
