import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { CreateOpposingPitcherParams, OpposingPitcher } from '@pitch-tracker/shared';

import OpposingPitcherContent from './OpposingPitcherContent';

interface Props {
    gameId: string;
    opposingPitchers: OpposingPitcher[];
    currentOpposingPitcher: OpposingPitcher | null;
    onSelect: (pitcher: OpposingPitcher) => void;
    onCreate: (params: CreateOpposingPitcherParams) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    opponentName?: string;
}

/**
 * iPad sidebar panel — the Opposing Pitcher picker rendered inline (no modal),
 * mirroring the web OpposingPitcherPanel in the left rail. Reuses the shared
 * `OpposingPitcherContent`; selection just sets the current pitcher (no dismiss).
 */
const OpposingPitcherPanel: React.FC<Props> = (props) => {
    return (
        <Card style={styles.container}>
            <Card.Content>
                <Text variant="titleSmall" style={styles.title}>
                    Opposing Pitcher
                </Text>
                <OpposingPitcherContent {...props} />
            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {},
    title: {
        fontWeight: '700',
        marginBottom: 4,
    },
});

export default OpposingPitcherPanel;
