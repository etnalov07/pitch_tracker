import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Modal, Portal, Button, useTheme } from 'react-native-paper';
import { Pitch, Player } from '@pitch-tracker/shared';
import { gamesApi } from '../../../state/games/api/gamesApi';
import PitcherStats from '../PitcherStats';

interface Props {
    visible: boolean;
    onDismiss: () => void;
    pitcher?: Player | null;
    pitcherId?: string;
    gameId?: string | null;
}

const PitcherStatsModal: React.FC<Props> = ({ visible, onDismiss, pitcher, pitcherId, gameId }) => {
    const theme = useTheme();
    const router = useRouter();
    const [pitches, setPitches] = useState<Pitch[]>([]);

    // Fetch full-game pitches each time the modal opens so the stats reflect everything
    // logged so far, not just the current at-bat (which was the prior bug).
    useEffect(() => {
        if (!visible || !gameId) return;
        let cancelled = false;
        gamesApi
            .getGamePitches(gameId)
            .then((all) => {
                if (cancelled) return;
                setPitches(pitcherId ? all.filter((p) => p.pitcher_id === pitcherId) : all);
            })
            .catch(() => {
                if (!cancelled) setPitches([]);
            });
        return () => {
            cancelled = true;
        };
    }, [visible, gameId, pitcherId]);

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
            >
                <ScrollView>
                    <PitcherStats pitcher={pitcher} pitches={pitches} gameId={gameId ?? undefined} pitcherId={pitcherId} />
                </ScrollView>
                <View style={styles.actionsRow}>
                    {pitcherId && (
                        <Button
                            mode="contained"
                            icon="chart-line"
                            onPress={() => {
                                onDismiss();
                                router.push(`/pitcher/${pitcherId}/report` as any);
                            }}
                            style={styles.reportButton}
                        >
                            Performance Report
                        </Button>
                    )}
                    <Button onPress={onDismiss} style={styles.closeButton}>
                        Close
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    container: {
        margin: 24,
        borderRadius: 12,
        padding: 16,
        maxHeight: '85%',
    },
    actionsRow: {
        marginTop: 12,
        gap: 8,
    },
    reportButton: {},
    closeButton: {},
});

export default PitcherStatsModal;
