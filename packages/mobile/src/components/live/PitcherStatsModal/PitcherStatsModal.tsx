import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Modal, Portal, Button } from 'react-native-paper';
import { Pitch, Player } from '@pitch-tracker/shared';
import PitcherStats from '../PitcherStats';

interface Props {
    visible: boolean;
    onDismiss: () => void;
    pitcher?: Player | null;
    pitcherId?: string;
    pitches: Pitch[];
}

const PitcherStatsModal: React.FC<Props> = ({ visible, onDismiss, pitcher, pitcherId, pitches }) => {
    const filteredPitches = useMemo(() => {
        if (!pitcherId) return [];
        return pitches.filter((p) => p.pitcher_id === pitcherId);
    }, [pitches, pitcherId]);

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
                <ScrollView>
                    <PitcherStats pitcher={pitcher} pitches={filteredPitches} />
                </ScrollView>
                <Button onPress={onDismiss} style={styles.closeButton}>
                    Close
                </Button>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        margin: 24,
        borderRadius: 12,
        padding: 16,
        maxHeight: '85%',
    },
    closeButton: {
        marginTop: 12,
    },
});

export default PitcherStatsModal;
