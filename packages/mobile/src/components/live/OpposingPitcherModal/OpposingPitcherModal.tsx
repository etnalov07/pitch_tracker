import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, Divider, useTheme } from 'react-native-paper';
import { CreateOpposingPitcherParams, OpposingPitcher } from '@pitch-tracker/shared';

import OpposingPitcherContent from './OpposingPitcherContent';

interface Props {
    visible: boolean;
    onDismiss: () => void;
    gameId: string;
    opposingPitchers: OpposingPitcher[];
    currentOpposingPitcher: OpposingPitcher | null;
    onSelect: (pitcher: OpposingPitcher) => void;
    onCreate: (params: CreateOpposingPitcherParams) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    opponentName?: string;
}

const OpposingPitcherModal: React.FC<Props> = ({
    visible,
    onDismiss,
    gameId,
    opposingPitchers,
    currentOpposingPitcher,
    onSelect,
    onCreate,
    onDelete,
    opponentName,
}) => {
    const theme = useTheme();

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
            >
                <Text variant="titleMedium" style={styles.title}>
                    Opposing Pitcher
                </Text>
                <Divider style={styles.divider} />

                <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                    <OpposingPitcherContent
                        gameId={gameId}
                        opposingPitchers={opposingPitchers}
                        currentOpposingPitcher={currentOpposingPitcher}
                        onSelect={(p) => {
                            onSelect(p);
                            onDismiss();
                        }}
                        onCreate={onCreate}
                        onDelete={onDelete}
                        opponentName={opponentName}
                    />
                </ScrollView>

                <Button onPress={onDismiss} style={styles.closeButton}>
                    Done
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
        marginBottom: 8,
        fontWeight: '600',
    },
    divider: {
        marginBottom: 12,
    },
    list: {
        maxHeight: 320,
    },
    closeButton: {
        marginTop: 8,
    },
});

export default OpposingPitcherModal;
