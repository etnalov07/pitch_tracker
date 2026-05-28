import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Platform } from 'react-native';
import { Text, List, Divider, Button, useTheme, Avatar, Switch, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import Constants from 'expo-constants';
import * as Speech from 'expo-speech';
import * as Haptics from '../../src/utils/haptics';
import {
    useAppSelector,
    useAppDispatch,
    logoutUser,
    setPitchCallingEnabled,
    setVelocityEnabled,
    setThemeMode,
    setRadarEnabled,
    setRadarDevice,
    type ThemeMode,
} from '../../src/state';
import { useDeviceType } from '../../src/hooks/useDeviceType';
import { useBluetoothAudio } from '../../src/utils/bluetoothAudio';
import { activateBTAudio } from '../../src/utils/pitchCallAudio';
import { useStalkerRadar } from '../../src/hooks/useStalkerRadar';
import { RadarDevice, RadarStatus } from '../../src/utils/stalkerRadar/stalkerRadarService';
// Offline service disabled for iOS 26.2 beta testing
// import { triggerSync } from '../../src/services/offlineService';
// import { clearAllActions } from '../../src/db/offlineQueue';

const RADAR_STATUS_LABEL: Record<RadarStatus, string> = {
    idle: 'Not connected',
    scanning: 'Scanning…',
    connecting: 'Connecting…',
    connected: 'Connected',
    disconnected: 'Disconnected — reconnecting…',
    error: 'Error — check Bluetooth',
};

export default function SettingsScreen() {
    const dispatch = useAppDispatch();
    const theme = useTheme();
    const { user } = useAppSelector((state) => state.auth);
    const { isOnline, isSyncing, pendingCount, lastSyncTime } = useAppSelector((state) => state.offline);
    const { pitchCallingEnabled, velocityEnabled, themeMode, radarEnabled, radarDeviceId, radarDeviceName } = useAppSelector(
        (state) => state.settings
    );
    const { isTablet } = useDeviceType();
    const [syncing, setSyncing] = useState(false);
    const { connected: btConnected, deviceName: btDeviceName, isChecking: btChecking } = useBluetoothAudio();
    const [testingAudio, setTestingAudio] = useState(false);

    const radar = useStalkerRadar();

    const handleScanForRadar = useCallback(async () => {
        try {
            await radar.scan();
        } catch {
            Alert.alert('Bluetooth', 'Could not scan — check that Bluetooth and permissions are enabled.');
        }
    }, [radar]);

    const handleDiagnoseRadar = useCallback(async () => {
        try {
            await radar.scanAll();
        } catch {
            Alert.alert('Bluetooth', 'Could not scan — check that Bluetooth and permissions are enabled.');
        }
    }, [radar]);

    const handleCaptureRaw = useCallback(async () => {
        try {
            await radar.startRawCapture();
        } catch {
            Alert.alert('Bluetooth', 'Connect to the radar first, then capture packets.');
        }
    }, [radar]);

    const handlePairRadar = useCallback(
        async (device: RadarDevice) => {
            dispatch(setRadarDevice({ id: device.id, name: device.name }));
            try {
                await radar.connect(device.id);
            } catch {
                Alert.alert('Bluetooth', 'Could not connect to the radar.');
            }
        },
        [dispatch, radar]
    );

    const handleForgetRadar = useCallback(() => {
        radar.disconnect().catch(() => {
            /* ignore */
        });
        dispatch(setRadarDevice(null));
    }, [dispatch, radar]);

    const handleTestBTAudio = useCallback(async () => {
        if (testingAudio) return;
        setTestingAudio(true);
        try {
            await activateBTAudio();
            await new Promise<void>((resolve, reject) => {
                Speech.speak('Test. Bluetooth audio check.', {
                    language: 'en-US',
                    rate: 0.9,
                    pitch: 1.0,
                    onDone: resolve,
                    onError: reject,
                });
            });
        } catch {
            Alert.alert('Audio Error', 'Failed to play test audio');
        } finally {
            setTestingAudio(false);
        }
    }, [testingAudio]);

    const handleLogout = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    dispatch(logoutUser());
                },
            },
        ]);
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
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.content, isTablet && styles.contentTablet]}>
                {/* Profile Section */}
                <View style={[styles.profileSection, { backgroundColor: theme.colors.surface }]}>
                    <Avatar.Text size={80} label={getInitials()} style={{ backgroundColor: theme.colors.primary }} />
                    <Text variant="headlineSmall" style={styles.userName}>
                        {user?.first_name} {user?.last_name}
                    </Text>
                    <Text variant="bodyMedium" style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
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
                        onPress={() => {
                            /* TODO */
                        }}
                    />
                    <List.Item
                        title="Change Password"
                        left={(props) => <List.Icon {...props} icon="lock" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => {
                            /* TODO */
                        }}
                    />
                </List.Section>

                <Divider style={styles.divider} />

                <List.Section>
                    <List.Subheader>Appearance</List.Subheader>
                    <View style={styles.appearanceContainer}>
                        <Text variant="bodyMedium" style={[styles.appearanceHelp, { color: theme.colors.onSurfaceVariant }]}>
                            Choose how PitchChart looks. &quot;System&quot; matches your device.
                        </Text>
                        <SegmentedButtons
                            value={themeMode}
                            onValueChange={(v) => {
                                dispatch(setThemeMode(v as ThemeMode));
                            }}
                            buttons={[
                                { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
                                { value: 'dark', label: 'Dark', icon: 'weather-night' },
                                { value: 'system', label: 'System', icon: 'cellphone-cog' },
                            ]}
                        />
                    </View>
                </List.Section>

                <Divider style={styles.divider} />

                <List.Section>
                    <List.Subheader>Game Preferences</List.Subheader>
                    <List.Item
                        title="Pitch Calling"
                        description="Send pitch calls via Bluetooth during games"
                        left={(props) => <List.Icon {...props} icon="bullhorn" />}
                        right={() => (
                            <Switch
                                value={pitchCallingEnabled}
                                onValueChange={(v) => {
                                    dispatch(setPitchCallingEnabled(v));
                                }}
                            />
                        )}
                    />
                    <List.Item
                        title="Velocity Input"
                        description="Show velocity field when logging pitches"
                        left={(props) => <List.Icon {...props} icon="speedometer" />}
                        right={() => (
                            <Switch
                                value={velocityEnabled}
                                onValueChange={(v) => {
                                    dispatch(setVelocityEnabled(v));
                                }}
                            />
                        )}
                    />
                </List.Section>

                <Divider style={styles.divider} />

                <List.Section>
                    <List.Subheader>Bluetooth Earpiece</List.Subheader>
                    <List.Item
                        title="Connection Status"
                        description={
                            btChecking
                                ? 'Checking...'
                                : btConnected
                                  ? `${btDeviceName || 'Earpiece'} — Connected`
                                  : 'No earpiece connected'
                        }
                        left={(props) => (
                            <List.Icon
                                {...props}
                                icon={btConnected ? 'bluetooth-audio' : 'bluetooth-off'}
                                color={btConnected ? '#10b981' : '#ef4444'}
                            />
                        )}
                    />
                    {btConnected && (
                        <List.Item
                            title="Test Audio"
                            description="Play a test message through the earpiece"
                            left={(props) => <List.Icon {...props} icon="volume-high" />}
                            right={() =>
                                testingAudio ? (
                                    <ActivityIndicator size={20} />
                                ) : (
                                    <Button compact mode="text" onPress={handleTestBTAudio}>
                                        Test
                                    </Button>
                                )
                            }
                        />
                    )}
                    {!btConnected && !btChecking && (
                        <List.Item
                            title="Pair Earpiece"
                            description="Open Bluetooth settings to pair a device"
                            left={(props) => <List.Icon {...props} icon="cog-outline" />}
                            right={(props) => <List.Icon {...props} icon="chevron-right" />}
                            onPress={() => Linking.openSettings()}
                        />
                    )}
                    <List.Item
                        title="NFHS Compliance"
                        description="One-way communication only. The catcher's earpiece is receive-only — it cannot transmit audio back to the coach."
                        left={(props) => <List.Icon {...props} icon="shield-check" color="#10b981" />}
                        descriptionNumberOfLines={3}
                    />
                </List.Section>

                <Divider style={styles.divider} />

                <List.Section>
                    <List.Subheader>Radar Gun</List.Subheader>
                    <List.Item
                        title="Stalker Radar"
                        description="Auto-fill pitch velocity from a Bluetooth radar gun"
                        left={(props) => <List.Icon {...props} icon="radar" />}
                        right={() => (
                            <Switch
                                value={radarEnabled}
                                onValueChange={(v) => {
                                    dispatch(setRadarEnabled(v));
                                    // Radar feeds the velocity field — turn that on too.
                                    if (v && !velocityEnabled) dispatch(setVelocityEnabled(true));
                                }}
                            />
                        )}
                    />
                    {radarEnabled && (
                        <>
                            <List.Item
                                title="Connection Status"
                                description={RADAR_STATUS_LABEL[radar.status]}
                                left={(props) => (
                                    <List.Icon
                                        {...props}
                                        icon={radar.status === 'connected' ? 'bluetooth-connect' : 'bluetooth'}
                                        color={
                                            radar.status === 'connected'
                                                ? '#10b981'
                                                : radar.status === 'error'
                                                  ? '#ef4444'
                                                  : undefined
                                        }
                                    />
                                )}
                            />
                            {radarDeviceId && (
                                <List.Item
                                    title={radarDeviceName || 'Paired radar'}
                                    description="Tap to forget this radar"
                                    left={(props) => <List.Icon {...props} icon="radar" />}
                                    right={(props) => <List.Icon {...props} icon="close" />}
                                    onPress={handleForgetRadar}
                                />
                            )}
                            <List.Item
                                title={radar.status === 'scanning' ? 'Scanning…' : 'Scan for Radar'}
                                description="Power on the radar, then scan to pair"
                                left={(props) => <List.Icon {...props} icon="bluetooth-settings" />}
                                right={() =>
                                    radar.status === 'scanning' ? (
                                        <ActivityIndicator size={20} />
                                    ) : (
                                        <Button compact mode="text" onPress={handleScanForRadar}>
                                            Scan
                                        </Button>
                                    )
                                }
                                onPress={radar.status === 'scanning' ? undefined : handleScanForRadar}
                            />
                            {!radarDeviceId && (
                                <List.Item
                                    title="Diagnose (show all Bluetooth devices)"
                                    description="Lists every nearby BLE peripheral and the service UUIDs it advertises"
                                    left={(props) => <List.Icon {...props} icon="bug-outline" />}
                                    right={() =>
                                        radar.status === 'scanning' ? (
                                            <ActivityIndicator size={20} />
                                        ) : (
                                            <Button compact mode="text" onPress={handleDiagnoseRadar}>
                                                Diagnose
                                            </Button>
                                        )
                                    }
                                    onPress={radar.status === 'scanning' ? undefined : handleDiagnoseRadar}
                                />
                            )}
                            {radar.devices.map((device) => (
                                <List.Item
                                    key={device.id}
                                    title={device.name || device.localName || 'Unknown device'}
                                    description={
                                        device.serviceUUIDs && device.serviceUUIDs.length > 0
                                            ? `${device.id}\n${device.serviceUUIDs.join(', ')}`
                                            : device.id
                                    }
                                    descriptionNumberOfLines={3}
                                    left={(props) => <List.Icon {...props} icon="radar" />}
                                    right={(props) => <List.Icon {...props} icon="chevron-right" />}
                                    onPress={() => handlePairRadar(device)}
                                />
                            ))}
                            {radar.status === 'connected' && (
                                <>
                                    <List.Item
                                        title="Capture raw packets"
                                        description="Subscribe to every characteristic and log raw bytes. Tap, then throw pitches."
                                        left={(props) => <List.Icon {...props} icon="text-box-search-outline" />}
                                        right={() => (
                                            <Button compact mode="text" onPress={handleCaptureRaw}>
                                                Capture
                                            </Button>
                                        )}
                                        onPress={handleCaptureRaw}
                                        descriptionNumberOfLines={2}
                                    />
                                    {radar.rawPackets.map((packet, idx) => (
                                        <List.Item
                                            key={`${packet.at}-${idx}`}
                                            title={`"${packet.ascii}"`}
                                            titleStyle={styles.rawMono}
                                            description={`${packet.bytes.length}B  ${packet.hex}\nchar ${packet.charUuid}`}
                                            descriptionStyle={styles.rawMono}
                                            descriptionNumberOfLines={4}
                                            left={(props) => <List.Icon {...props} icon="chevron-right" />}
                                        />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </List.Section>

                <Divider style={styles.divider} />

                <List.Section>
                    <List.Subheader>Sync & Data</List.Subheader>
                    <List.Item
                        title="Connection Status"
                        description={isOnline ? 'Online' : 'Offline'}
                        left={(props) => (
                            <List.Icon {...props} icon={isOnline ? 'wifi' : 'wifi-off'} color={isOnline ? '#10b981' : '#ef4444'} />
                        )}
                    />
                    <List.Item
                        title="Pending Actions"
                        description={pendingCount > 0 ? `${pendingCount} action(s) waiting to sync` : 'All data synced'}
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
                                <Button compact mode="text" onPress={handleManualSync} disabled={!isOnline}>
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
                        onPress={() => {
                            /* TODO */
                        }}
                    />
                    <List.Item
                        title="Terms of Service"
                        left={(props) => <List.Icon {...props} icon="file-document" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => {
                            /* TODO */
                        }}
                    />
                </List.Section>

                <View style={styles.logoutSection}>
                    <Button mode="outlined" onPress={handleLogout} textColor={theme.colors.error} style={styles.logoutButton}>
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
    },
    userName: {
        marginTop: 16,
        fontWeight: 'bold',
    },
    userEmail: {
        marginTop: 4,
    },
    divider: {
        marginVertical: 8,
    },
    rawMono: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
    },
    appearanceContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    appearanceHelp: {
        marginBottom: 12,
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
