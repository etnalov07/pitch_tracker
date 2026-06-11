import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { TeamSide } from '@pitch-tracker/shared';

import CountBreakdownContent from './CountBreakdownContent';

interface Props {
    gameId: string;
    pitcherId?: string;
    teamSide?: TeamSide;
    refreshTrigger?: number;
}

/**
 * iPad sidebar panel — Count Breakdown rendered inline (no modal), mirroring the
 * web CountBreakdownPanel in the left rail. Reuses the shared content; always
 * active so it fetches on mount and whenever `refreshTrigger` changes.
 */
const CountBreakdownPanel: React.FC<Props> = ({ gameId, pitcherId, teamSide, refreshTrigger }) => {
    return (
        <Card style={styles.container}>
            <Card.Content>
                <Text variant="titleSmall" style={styles.title}>
                    Count Breakdown
                </Text>
                <CountBreakdownContent gameId={gameId} pitcherId={pitcherId} teamSide={teamSide} refreshTrigger={refreshTrigger} />
            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {},
    title: {
        fontWeight: '700',
        marginBottom: 8,
    },
});

export default CountBreakdownPanel;
