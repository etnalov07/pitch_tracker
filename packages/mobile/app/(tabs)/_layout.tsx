import React from 'react';
import { View, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Text, useTheme } from 'react-native-paper';
import { useAppSelector } from '../../src/state';

function TabBarIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
    return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

const ROLE_PRIORITY: Record<string, number> = { owner: 0, coach: 1, assistant: 2, player: 3 };

function RoleBadge() {
    const teams = useAppSelector((state) => state.teams.teams) || [];
    const primaryRole = teams.reduce<string | null>((best, team) => {
        const role = (team as any).user_role as string | undefined;
        if (!role) return best;
        if (!best) return role;
        return (ROLE_PRIORITY[role] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? role : best;
    }, null);

    if (!primaryRole) return null;
    const label = primaryRole === 'owner' ? 'Coach' : primaryRole;

    return (
        <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{label} Mode</Text>
        </View>
    );
}

export default function TabLayout() {
    const theme = useTheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.outlineVariant,
                },
                headerStyle: {
                    backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary,
                headerRight: () => <RoleBadge />,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
                }}
            />
            <Tabs.Screen
                name="teams"
                options={{
                    title: 'Teams',
                    tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    roleBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginRight: 12,
    },
    roleBadgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
});
