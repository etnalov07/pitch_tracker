import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Button, Modal, Divider, useTheme } from 'react-native-paper';
import { Player, GamePitcherWithPlayer } from '@pitch-tracker/shared';
import api from '../../../services/api';

type EligibilityState = 'eligible' | 'ineligible' | 'unknown_division' | 'unknown_rules';

interface EligibilityResult {
    eligibility: EligibilityState;
    reasons: string[];
}

type EligibilityMap = Record<string, EligibilityResult>;

interface PitcherSelectorModalProps {
    visible: boolean;
    onDismiss: () => void;
    gameId: string;
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
    gameId,
    gamePitchers,
    currentPitcher,
    teamPlayers,
    onSelectExistingPitcher,
    onSelectNewPitcher,
    isTablet,
}) => {
    const theme = useTheme();
    const [eligibility, setEligibility] = useState<EligibilityMap>({});

    // Fetch bulk eligibility when the modal opens. Best-effort: a failure
    // falls back to permissive (no chips). The server resolves the sanction
    // from the game and applies the matching rules engine.
    useEffect(() => {
        if (!visible || !gameId || teamPlayers.length === 0) return;
        let cancelled = false;
        const ids = teamPlayers.map((p) => p.id).join(',');
        api.get<{ eligibility: EligibilityMap }>(`/pitch-rules/eligibility/${gameId}/bulk?pitcher_ids=${ids}`)
            .then((res) => {
                if (!cancelled) setEligibility(res.data.eligibility ?? {});
            })
            .catch(() => {
                if (!cancelled) setEligibility({});
            });
        return () => {
            cancelled = true;
        };
    }, [visible, gameId, teamPlayers]);

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
                    // Sort pitchers (primary_position === 'P') to the top, then alphabetical.
                    // Position players still appear (emergency-relief case) but below the regular pitchers.
                    [...teamPlayers]
                        .sort((a, b) => {
                            const aIsP = a.primary_position === 'P' ? 0 : 1;
                            const bIsP = b.primary_position === 'P' ? 0 : 1;
                            if (aIsP !== bIsP) return aIsP - bIsP;
                            return (a.last_name || '').localeCompare(b.last_name || '');
                        })
                        .map((player) => {
                            const alreadyInGame = gamePitchers.some((gp) => gp.player_id === player.id && !gp.inning_exited);
                            const elig = eligibility[player.id];
                            const ineligible = elig?.eligibility === 'ineligible';
                            const caveat =
                                elig?.eligibility === 'unknown_division' || elig?.eligibility === 'unknown_rules'
                                    ? elig.reasons[0]
                                    : null;
                            const blocked = alreadyInGame || ineligible;
                            return (
                                <Pressable
                                    key={player.id}
                                    style={[styles.playerOption, blocked && styles.playerOptionDisabled]}
                                    onPress={() => !blocked && onSelectNewPitcher(player)}
                                    disabled={blocked}
                                >
                                    <View style={styles.playerOptionInfo}>
                                        <Text
                                            style={[
                                                styles.playerOptionName,
                                                { color: blocked ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
                                            ]}
                                        >
                                            {player.first_name} {player.last_name}
                                        </Text>
                                        <Text style={[styles.playerOptionDetail, { color: theme.colors.onSurfaceVariant }]}>
                                            #{player.jersey_number} · {player.primary_position}
                                            {player.throws ? ` · ${player.throws === 'R' ? 'RHP' : 'LHP'}` : ''}
                                            {alreadyInGame ? ' · Already Active' : ''}
                                        </Text>
                                        {ineligible && elig?.reasons[0] && (
                                            <Text style={styles.ineligibleReason}>{elig.reasons[0]}</Text>
                                        )}
                                        {caveat && <Text style={styles.caveatChip}>{caveat}</Text>}
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
    ineligibleReason: { fontSize: 12, color: '#b91c1c', marginTop: 4 },
    caveatChip: {
        fontSize: 12,
        color: '#92400e',
        backgroundColor: '#fef3c7',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 999,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
});

export default PitcherSelectorModal;
