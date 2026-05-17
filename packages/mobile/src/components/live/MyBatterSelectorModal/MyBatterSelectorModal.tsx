import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text, Button, Modal, TextInput, IconButton, useTheme } from 'react-native-paper';
import { MyTeamLineupPlayer, Player } from '@pitch-tracker/shared';
import { gamesApi } from '../../../state/games/api/gamesApi';

interface MyBatterSelectorModalProps {
    visible: boolean;
    onDismiss: () => void;
    lineup: MyTeamLineupPlayer[];
    currentBatter: MyTeamLineupPlayer | null;
    onSelectBatter: (batter: MyTeamLineupPlayer) => void;
    teamPlayers: Player[];
    currentInningNumber?: number;
    /** Called after a successful substitution so the caller can refetch the lineup. */
    onSubstituted: () => void;
    isTablet?: boolean;
}

const playerName = (p?: Player | null): string => (p ? `${p.first_name} ${p.last_name}` : 'Unknown');

const MyBatterSelectorModal: React.FC<MyBatterSelectorModalProps> = ({
    visible,
    onDismiss,
    lineup,
    currentBatter,
    onSelectBatter,
    teamPlayers,
    currentInningNumber,
    onSubstituted,
    isTablet,
}) => {
    const theme = useTheme();
    const [subBatter, setSubBatter] = useState<MyTeamLineupPlayer | null>(null);
    const [subPlayerId, setSubPlayerId] = useState<string | null>(null);
    const [subInning, setSubInning] = useState('');
    const [saving, setSaving] = useState(false);

    // Active lineup = one row per slot (starter, or the sub that replaced them).
    const activeBatters = [...lineup].filter((p) => !p.replaced_by_id).sort((a, b) => a.batting_order - b.batting_order);
    const activePlayerIds = new Set(activeBatters.map((b) => b.player_id));
    const benchPlayers = teamPlayers.filter((p) => !activePlayerIds.has(p.id));

    const resetForm = () => {
        setSubBatter(null);
        setSubPlayerId(null);
        setSubInning('');
    };

    const handleShowSubForm = (batter: MyTeamLineupPlayer) => {
        setSubBatter(batter);
        setSubPlayerId(null);
        setSubInning(currentInningNumber ? String(currentInningNumber) : '');
    };

    const handleSubstitute = async () => {
        if (!subBatter || !subPlayerId || !subInning.trim()) return;
        setSaving(true);
        try {
            await gamesApi.substituteMyTeamPlayer(subBatter.id, {
                player_id: subPlayerId,
                inning_entered: parseInt(subInning, 10),
                position: subBatter.position || undefined,
            });
            onSubstituted();
            resetForm();
        } catch (error) {
            console.error('Failed to substitute batter:', error);
            Alert.alert('Error', 'Failed to substitute batter. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDismiss = () => {
        resetForm();
        onDismiss();
    };

    return (
        <Modal
            visible={visible}
            onDismiss={handleDismiss}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }, isTablet && styles.modalTablet]}
        >
            <View style={styles.modalInner}>
                <Text variant="titleLarge" style={styles.modalTitle}>
                    Select Your Batter
                </Text>
                <ScrollView style={styles.playerList} keyboardShouldPersistTaps="handled">
                    {activeBatters.length === 0 && !subBatter ? (
                        <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                            No lineup set up yet.
                        </Text>
                    ) : (
                        activeBatters.map((batter) => (
                            <Pressable
                                key={batter.id}
                                style={[styles.playerOption, currentBatter?.id === batter.id && styles.playerOptionSelected]}
                                onPress={() => onSelectBatter(batter)}
                            >
                                <View style={styles.batterOptionRow}>
                                    <View style={styles.batterOrder}>
                                        <Text style={styles.batterOrderText}>{batter.batting_order}</Text>
                                    </View>
                                    <View style={styles.playerOptionInfo}>
                                        <Text style={[styles.playerOptionName, { color: theme.colors.onSurface }]}>
                                            {playerName(batter.player)}
                                        </Text>
                                        <Text style={[styles.playerOptionDetail, { color: theme.colors.onSurfaceVariant }]}>
                                            {batter.position || batter.player?.primary_position || 'Unknown'}
                                            {!batter.is_starter ? ' · Sub' : ''}
                                        </Text>
                                    </View>
                                    <IconButton
                                        testID={`my-batter-substitute-${batter.batting_order}`}
                                        icon="account-switch"
                                        size={18}
                                        onPress={() => handleShowSubForm(batter)}
                                        style={styles.actionIcon}
                                    />
                                </View>
                            </Pressable>
                        ))
                    )}
                </ScrollView>

                {subBatter && (
                    <View style={[styles.subForm, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                            Substitute Batter
                        </Text>
                        <Text variant="bodySmall" style={[styles.subLabel, { color: theme.colors.onSurfaceVariant }]}>
                            Replacing: {playerName(subBatter.player)} (#{subBatter.batting_order})
                        </Text>
                        <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>
                            Incoming player
                        </Text>
                        <ScrollView style={styles.benchList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                            {benchPlayers.length === 0 ? (
                                <Text variant="bodySmall" style={[styles.emptyBench, { color: theme.colors.onSurfaceVariant }]}>
                                    No bench players available on the roster.
                                </Text>
                            ) : (
                                benchPlayers.map((p) => (
                                    <Pressable
                                        key={p.id}
                                        onPress={() => setSubPlayerId(p.id)}
                                        style={[styles.benchOption, subPlayerId === p.id && styles.benchOptionSelected]}
                                    >
                                        <Text style={{ color: theme.colors.onSurface }}>{playerName(p)}</Text>
                                        {p.primary_position ? (
                                            <Text style={[styles.benchPos, { color: theme.colors.onSurfaceVariant }]}>
                                                {p.primary_position}
                                            </Text>
                                        ) : null}
                                    </Pressable>
                                ))
                            )}
                        </ScrollView>
                        <TextInput
                            testID="my-batter-sub-inning"
                            label="Inning"
                            mode="outlined"
                            value={subInning}
                            onChangeText={(text) => {
                                const n = parseInt(text, 10);
                                if (!text || (n >= 1 && n <= 20)) setSubInning(text);
                            }}
                            keyboardType="number-pad"
                            dense
                            style={styles.inningInput}
                        />
                        <View style={styles.formActions}>
                            <Button mode="text" onPress={resetForm} disabled={saving}>
                                Cancel
                            </Button>
                            <Button
                                testID="my-batter-sub-save"
                                mode="contained"
                                onPress={handleSubstitute}
                                loading={saving}
                                disabled={saving || !subPlayerId || !subInning.trim()}
                            >
                                Save
                            </Button>
                        </View>
                    </View>
                )}

                <Button onPress={handleDismiss} style={styles.modalClose}>
                    Close
                </Button>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: { margin: 20, borderRadius: 12, maxHeight: '90%', minHeight: '50%' },
    modalInner: { padding: 20, flex: 1 },
    modalTablet: { maxWidth: 400, alignSelf: 'center', width: '100%' },
    modalTitle: { marginBottom: 16 },
    modalClose: { marginTop: 8 },
    playerList: { flexGrow: 1, flexShrink: 1 },
    playerOption: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    playerOptionSelected: { backgroundColor: '#eff6ff' },
    playerOptionInfo: { flex: 1, gap: 2 },
    playerOptionName: { fontSize: 16, fontWeight: '600' },
    playerOptionDetail: { fontSize: 13 },
    batterOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    batterOrder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    batterOrderText: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
    actionIcon: { margin: 0, marginLeft: 'auto' },
    emptyText: { textAlign: 'center', padding: 24 },
    subForm: {
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 8,
    },
    subLabel: { fontStyle: 'italic' },
    benchList: { maxHeight: 160 },
    benchOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    benchOptionSelected: { backgroundColor: '#eff6ff' },
    benchPos: { fontSize: 12 },
    emptyBench: { padding: 8 },
    inningInput: { width: 120 },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});

export default MyBatterSelectorModal;
