import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Button, Modal, Divider, useTheme } from 'react-native-paper';
import { Player, GamePitcherWithPlayer } from '@pitch-tracker/shared';

interface PitcherSelectorModalProps {
    visible: boolean;
    onDismiss: () => void;
    gamePitchers: GamePitcherWithPlayer[];
    currentPitcher: GamePitcherWithPlayer | null;
    teamPlayers: Player[];
    onSelectExistingPitcher: (pitcher: GamePitcherWithPlayer) => void;
    onSelectNewPitcher: (player: Player) => void;
    isTablet?: boolean;
}

const PitcherSelectorModal: React.FC<PitcherSelectorModalProps> = ({
    visible,
    onDismiss,
    gamePitchers,
    currentPitcher,
    teamPlayers,
    onSelectExistingPitcher,
    onSelectNewPitcher,
    isTablet,
}) => {
    const theme = useTheme();
    return (
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }, isTablet && styles.modalTablet]}
        >
            <Text variant="titleLarge" style={styles.modalTitle}>
                Select Pitcher
            </Text>

            {gamePitchers.length > 0 && (
                <>
                    <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                        In-Game Pitchers
                    </Text>
                    {gamePitchers
                        .filter((gp) => !gp.inning_exited)
                        .map((gp) => (
                            <Pressable
                                key={gp.id}
                                style={[styles.playerOption, currentPitcher?.id === gp.id && styles.playerOptionSelected]}
                                onPress={() => onSelectExistingPitcher(gp)}
                            >
                                <View style={styles.playerOptionInfo}>
                                    <Text style={[styles.playerOptionName, { color: theme.colors.onSurface }]}>
                                        {gp.player.first_name} {gp.player.last_name}
                                    </Text>
                                    <Text style={[styles.playerOptionDetail, { color: theme.colors.onSurfaceVariant }]}>
                                        #{gp.player.jersey_number} · Active
                                    </Text>
                                </View>
                            </Pressable>
                        ))}
                    <Divider style={styles.sectionDivider} />
                </>
            )}

            <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                Available Pitchers
            </Text>
            <ScrollView style={styles.playerList} keyboardShouldPersistTaps="handled">
                {teamPlayers.length === 0 ? (
                    <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                        No players found. Add players to your team first.
                    </Text>
                ) : (
                    teamPlayers.map((player) => {
                        const alreadyInGame = gamePitchers.some((gp) => gp.player_id === player.id && !gp.inning_exited);
                        return (
                            <Pressable
                                key={player.id}
                                style={[styles.playerOption, alreadyInGame && styles.playerOptionDisabled]}
                                onPress={() => !alreadyInGame && onSelectNewPitcher(player)}
                                disabled={alreadyInGame}
                            >
                                <View style={styles.playerOptionInfo}>
                                    <Text
                                        style={[
                                            styles.playerOptionName,
                                            { color: alreadyInGame ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
                                        ]}
                                    >
                                        {player.first_name} {player.last_name}
                                    </Text>
                                    <Text style={[styles.playerOptionDetail, { color: theme.colors.onSurfaceVariant }]}>
                                        #{player.jersey_number} · {player.primary_position}
                                        {player.throws ? ` · ${player.throws === 'R' ? 'RHP' : 'LHP'}` : ''}
                                        {alreadyInGame ? ' · Already Active' : ''}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })
                )}
            </ScrollView>
            <Button onPress={onDismiss} style={styles.modalClose}>
                Cancel
            </Button>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: { margin: 20, padding: 20, borderRadius: 12, maxHeight: '90%', minHeight: '50%' },
    modalTablet: { maxWidth: 400, alignSelf: 'center', width: '100%' },
    modalTitle: { marginBottom: 16 },
    modalClose: { marginTop: 8 },
    sectionLabel: { marginBottom: 8, marginTop: 4 },
    sectionDivider: { marginVertical: 12 },
    playerList: { flexGrow: 1, flexShrink: 1 },
    playerOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    playerOptionSelected: { backgroundColor: '#eff6ff' },
    playerOptionDisabled: { opacity: 0.5 },
    playerOptionInfo: { gap: 2 },
    playerOptionName: { fontSize: 16, fontWeight: '600' },
    playerOptionDetail: { fontSize: 13 },
    disabledText: {},
    emptyText: { textAlign: 'center', padding: 24 },
});

export default PitcherSelectorModal;
