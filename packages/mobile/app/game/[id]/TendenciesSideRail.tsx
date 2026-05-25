// Tablet-only persistent side rail that renders the Pitcher / Hitter tendencies
// content inline beside the strike zone instead of behind a blocking modal —
// UX-TD-11 / UX-LG-11. Each panel mirrors the modal header (title + subtitle +
// close ✕) so the coach can dismiss without leaving the live game flow.
//
// On phone, the existing modals continue to render (gated in LiveGameModals on
// !isTablet). The buttons in LiveGameTablet's sidebar still toggle the same
// show* flags — they just route to this inline rail instead of the modal stack.

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import type { GamePitcherWithPlayer, MyTeamLineupPlayer, OpponentLineupPlayer } from '@pitch-tracker/shared';

import { HitterTendenciesContent, PitcherTendenciesContent } from '../../../src/components/live';
import { colors } from '../../../src/styles/theme';

interface TendenciesSideRailProps {
    id?: string;
    showPitcher: boolean;
    showHitter: boolean;
    onClosePitcher: () => void;
    onCloseHitter: () => void;
    currentPitcher: GamePitcherWithPlayer | null;
    currentBatter: OpponentLineupPlayer | null;
    currentMyBatter: MyTeamLineupPlayer | null;
    gameMode: string | undefined;
}

const TendenciesSideRail: React.FC<TendenciesSideRailProps> = ({
    id,
    showPitcher,
    showHitter,
    onClosePitcher,
    onCloseHitter,
    currentPitcher,
    currentBatter,
    currentMyBatter,
    gameMode,
}) => {
    const theme = useTheme();
    const pitcherActive = showPitcher && !!currentPitcher;
    const hitterActive = showHitter && !!currentBatter;

    if (!pitcherActive && !hitterActive) return null;

    const pitcherName = currentPitcher?.player
        ? `${currentPitcher.player.first_name} ${currentPitcher.player.last_name}`
        : 'Pitcher';
    const initialBatterHand: 'L' | 'R' =
        gameMode === 'opp_pitcher' ? (currentMyBatter?.player?.bats === 'L' ? 'L' : 'R') : currentBatter?.bats === 'L' ? 'L' : 'R';

    return (
        <View style={[styles.rail, { backgroundColor: theme.colors.surface, borderLeftColor: colors.gray[200] }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {pitcherActive && currentPitcher && (
                    <View style={styles.panel}>
                        <View style={[styles.panelHeader, { borderBottomColor: colors.gray[200] }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.panelTitle}>Pitcher Tendencies</Text>
                                <Text style={[styles.panelSubtitle, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                                    {pitcherName}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={onClosePitcher}
                                style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}
                                accessibilityRole="button"
                                accessibilityLabel="Close Pitcher Tendencies"
                            >
                                <Text style={[styles.closeBtnText, { color: theme.colors.onSurface }]}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.panelBody}>
                            <PitcherTendenciesContent pitcherId={currentPitcher.player_id} initialBatterHand={initialBatterHand} />
                        </View>
                    </View>
                )}

                {hitterActive && currentBatter && (
                    <View style={styles.panel}>
                        <View style={[styles.panelHeader, { borderBottomColor: colors.gray[200] }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.panelTitle}>Hitter Tendencies</Text>
                                <Text style={[styles.panelSubtitle, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                                    {currentBatter.player_name}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={onCloseHitter}
                                style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}
                                accessibilityRole="button"
                                accessibilityLabel="Close Hitter Tendencies"
                            >
                                <Text style={[styles.closeBtnText, { color: theme.colors.onSurface }]}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.panelBody}>
                            <HitterTendenciesContent
                                batterId={currentBatter.id}
                                batterName={currentBatter.player_name}
                                batterType="opponent"
                                gameId={id}
                            />
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    rail: { width: 340, borderLeftWidth: 1 },
    scrollContent: { padding: 0 },
    panel: { borderBottomWidth: 1, borderBottomColor: colors.gray[200] },
    panelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 12,
        borderBottomWidth: 1,
    },
    panelTitle: { fontSize: 14, fontWeight: '700', color: colors.primary[900] },
    panelSubtitle: { fontSize: 12, marginTop: 2 },
    closeBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { fontSize: 12 },
    panelBody: { padding: 12 },
});

export default TendenciesSideRail;
