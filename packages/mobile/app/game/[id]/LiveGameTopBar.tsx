import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Game } from '@pitch-tracker/shared';

import { SyncStatusBadge } from '../../../src/components/common';
import scoutingReportsApi from '../../../src/state/scouting/api/scoutingReportsApi';

interface LiveGameTopBarProps {
    /** The current game — needed for the scouting nav target + end-game button visibility. */
    game: Game;
    id?: string;
    onEndGame: () => void;
    /** When provided, renders an extra batter-breakdown button between scouting and end-game.
     * Tablet layout passes this; phone omits it for thumb-zone density. */
    onBatterBreakdown?: () => void;
}

/**
 * Header bar at the top of the Live Game screen — back button, title, sync
 * status, and right-side actions (scouting report, optional batter breakdown,
 * end game). Identical on tablet vs phone except for the breakdown button,
 * gated by the optional `onBatterBreakdown` prop.
 *
 * Extracted from `live.tsx` as part of UX audit item C continuation 2.
 */
const LiveGameTopBar: React.FC<LiveGameTopBarProps> = ({ game, id, onEndGame, onBatterBreakdown }) => {
    const router = useRouter();
    return (
        <View style={styles.header}>
            <IconButton icon="arrow-left" onPress={() => router.back()} />
            <View style={styles.headerCenter}>
                <Text variant="titleLarge">Live Game</Text>
                <SyncStatusBadge compact />
            </View>
            <View style={styles.headerRight}>
                {game.home_team_id && (
                    <IconButton
                        icon="clipboard-text"
                        onPress={async () => {
                            try {
                                const existing = await scoutingReportsApi.getByGameId(id!);
                                if (existing) {
                                    router.push(`/team/${game.home_team_id}/scouting/${existing.id}` as any);
                                } else {
                                    router.push(`/team/${game.home_team_id}/scouting` as any);
                                }
                            } catch {
                                router.push(`/team/${game.home_team_id}/scouting` as any);
                            }
                        }}
                    />
                )}
                {onBatterBreakdown && (
                    <IconButton icon="account-search" onPress={onBatterBreakdown} accessibilityLabel="Batter breakdown" />
                )}
                {game.status === 'in_progress' ? (
                    <IconButton icon="flag-checkered" onPress={onEndGame} />
                ) : (
                    <View style={{ width: 48 }} />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.25)',
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
});

export default LiveGameTopBar;
