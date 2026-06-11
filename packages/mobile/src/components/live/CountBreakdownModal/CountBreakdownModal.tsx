import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Divider, Button, useTheme } from 'react-native-paper';
import { TeamSide } from '@pitch-tracker/shared';

import CountBreakdownContent from './CountBreakdownContent';

interface Props {
    visible: boolean;
    onDismiss: () => void;
    gameId: string;
    pitcherId?: string;
    teamSide?: TeamSide;
    refreshTrigger?: number;
}

const CountBreakdownModal: React.FC<Props> = ({ visible, onDismiss, gameId, pitcherId, teamSide, refreshTrigger }) => {
    const theme = useTheme();

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
            >
                <Text variant="titleMedium" style={styles.title}>
                    Count Breakdown
                </Text>
                <Divider style={styles.divider} />
                <ScrollView>
                    <CountBreakdownContent
                        active={visible}
                        gameId={gameId}
                        pitcherId={pitcherId}
                        teamSide={teamSide}
                        refreshTrigger={refreshTrigger}
                    />
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
        margin: 24,
        borderRadius: 12,
        padding: 20,
        maxHeight: '80%',
    },
    title: {
        fontWeight: '600',
        marginBottom: 8,
    },
    divider: {
        marginBottom: 12,
    },
    closeButton: {
        marginTop: 12,
    },
});

export default CountBreakdownModal;
