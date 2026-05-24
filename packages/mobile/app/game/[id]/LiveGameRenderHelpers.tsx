import React from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';

import { PITCH_CALL_ZONE_COORDS, PITCH_CALL_ZONE_LABELS } from '@pitch-tracker/shared';
import { GameHeader } from '../../../src/components/live';
import { PITCH_TYPE_COLORS, PITCH_TYPE_LABELS } from '../../../src/components/live';
import * as Haptics from '../../../src/utils/haptics';
import { colors } from '../../../src/styles/theme';

import { styles } from './liveGameStyles';
import type { LiveGameController } from './useLiveGameController';
import type { LiveGameActions } from './useLiveGameActions';

/**
 * Small render-helper components extracted from live.tsx as part of UX audit
 * item C continuation 3b. Each takes `ctl` (and sometimes `actions`) and
 * destructures only what it needs. Shared between LiveGameTablet and
 * LiveGamePhone — the tablet/phone layouts inline-compose them.
 */

type CtlProp = { ctl: LiveGameController };
type CtlActionsProp = { ctl: LiveGameController; actions: LiveGameActions };

// ----------------------------------------------------------------
// Pitch type filter chips (read-only viewer / post-game replay)
// ----------------------------------------------------------------

export function PitchTypeFilterBar({ ctl }: CtlProp) {
    const { isReadOnly, allGamePitches, pitchTypeFilter, setPitchTypeFilter, theme } = ctl;
    if (!isReadOnly || allGamePitches.length === 0) return null;
    const types = Array.from(new Set(allGamePitches.map((p) => p.pitch_type || 'other')));
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pitchFilterBar}>
            <Chip
                selected={pitchTypeFilter === 'all'}
                onPress={() => setPitchTypeFilter('all')}
                style={[styles.pitchFilterChip, pitchTypeFilter === 'all' && { backgroundColor: theme.colors.primary }]}
                textStyle={pitchTypeFilter === 'all' ? styles.pitchFilterChipTextActive : styles.pitchFilterChipText}
                compact
            >
                All
            </Chip>
            {types.map((type) => (
                <Chip
                    key={type}
                    selected={pitchTypeFilter === type}
                    onPress={() => setPitchTypeFilter(type)}
                    style={[
                        styles.pitchFilterChip,
                        pitchTypeFilter === type && { backgroundColor: PITCH_TYPE_COLORS[type] ?? colors.gray[500] },
                    ]}
                    textStyle={pitchTypeFilter === type ? styles.pitchFilterChipTextActive : styles.pitchFilterChipText}
                    compact
                >
                    {PITCH_TYPE_LABELS[type] ?? type}
                </Chip>
            ))}
        </ScrollView>
    );
}

// ----------------------------------------------------------------
// Pitch breakdown table (read-only viewer / post-game replay)
// ----------------------------------------------------------------

export function PitchBreakdown({ ctl }: CtlProp) {
    const { isReadOnly, allGamePitches, theme } = ctl;
    if (!isReadOnly || allGamePitches.length === 0) return null;
    const byType: Record<string, { count: number; strikes: number; balls: number }> = {};
    for (const pitch of allGamePitches) {
        const t = pitch.pitch_type || 'other';
        if (!byType[t]) byType[t] = { count: 0, strikes: 0, balls: 0 };
        byType[t].count++;
        if (
            pitch.pitch_result === 'called_strike' ||
            pitch.pitch_result === 'swinging_strike' ||
            pitch.pitch_result === 'foul' ||
            pitch.pitch_result === 'in_play'
        ) {
            byType[t].strikes++;
        } else if (pitch.pitch_result === 'ball' || pitch.pitch_result === 'hit_by_pitch') {
            byType[t].balls++;
        }
    }
    const total = allGamePitches.length;
    const totalStrikes = Object.values(byType).reduce((s, v) => s + v.strikes, 0);
    const totalBalls = Object.values(byType).reduce((s, v) => s + v.balls, 0);
    const entries = Object.entries(byType).sort((a, b) => b[1].count - a[1].count);
    return (
        <View style={[styles.breakdownTable, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.breakdownTitle}>Pitch Breakdown</Text>
            <View style={[styles.breakdownRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.breakdownTypeCell, styles.breakdownHeaderText]}>Type</Text>
                <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>#</Text>
                <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>K</Text>
                <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>B</Text>
                <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>%</Text>
            </View>
            {entries.map(([type, stats]) => (
                <View key={type} style={styles.breakdownRow}>
                    <View style={[styles.breakdownTypeCell, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                        <View style={[styles.typeColorDot, { backgroundColor: PITCH_TYPE_COLORS[type] ?? colors.gray[400] }]} />
                        <Text style={styles.breakdownText}>{PITCH_TYPE_LABELS[type] ?? type}</Text>
                    </View>
                    <Text style={styles.breakdownNumCell}>{stats.count}</Text>
                    <Text style={styles.breakdownNumCell}>{stats.strikes}</Text>
                    <Text style={styles.breakdownNumCell}>{stats.balls}</Text>
                    <Text style={styles.breakdownNumCell}>{Math.round((stats.count / total) * 100)}%</Text>
                </View>
            ))}
            <View style={[styles.breakdownRow, styles.breakdownTotalRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.breakdownTypeCell, styles.breakdownTotalText]}>Total</Text>
                <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>{total}</Text>
                <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>{totalStrikes}</Text>
                <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>{totalBalls}</Text>
                <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>100%</Text>
            </View>
        </View>
    );
}

// ----------------------------------------------------------------
// Zone-tap UX cues (UX-LG-02 / UX-LG-03)
// ----------------------------------------------------------------

export function ZoneTapHint({ ctl }: CtlProp) {
    const { targetZone, pitchLocation } = ctl;
    if (!targetZone) {
        return (
            <Text style={styles.zoneHint}>
                <Text style={styles.zoneHintBold}>Tap target zone</Text>
                {' · 1st tap'}
            </Text>
        );
    }
    if (!pitchLocation) {
        return (
            <Text style={styles.zoneHint}>
                <Text style={styles.zoneHintBold}>Tap actual location</Text>
                {' · 2nd tap (or pin to target below)'}
            </Text>
        );
    }
    return <Text style={[styles.zoneHint, styles.zoneHintReady]}>✓ Target + actual set — tap result to log</Text>;
}

export function ActualEqualsTargetButton({ ctl }: CtlProp) {
    const { targetZone, pitchLocation, setPitchLocation } = ctl;
    if (!targetZone || pitchLocation) return null;
    const zc = PITCH_CALL_ZONE_COORDS[targetZone];
    return (
        <Button
            mode="outlined"
            compact
            icon="target"
            style={styles.actualEqualsTargetButton}
            onPress={() => {
                Haptics.selectionAsync();
                setPitchLocation({ x: zc.x, y: zc.y });
            }}
        >
            Pitch hit target ({PITCH_CALL_ZONE_LABELS[targetZone]})
        </Button>
    );
}

// ----------------------------------------------------------------
// GameHeader wrapper — wires ctl + actions into GameHeader props
// ----------------------------------------------------------------

export function LiveGameHeader({ ctl, actions }: CtlActionsProp) {
    const {
        game,
        activePitcherDisplay,
        activeBatterDisplay,
        balls,
        strikes,
        currentOuts,
        baseRunners,
        pitcherGamePitchCount,
        isScoutingMode,
        gameMode,
        currentPitcher,
        setShowOpposingPitcherModal,
        setPitcherModalVisible,
        setShowPitcherStatsModal,
        setBatterModalVisible,
        setMyBatterModalVisible,
    } = ctl;
    const { handleRunnerPress, handleToggleHomeAway } = actions;
    if (!game) return null;
    return (
        <GameHeader
            game={game}
            currentPitcher={activePitcherDisplay}
            currentBatter={activeBatterDisplay}
            balls={balls}
            strikes={strikes}
            outs={currentOuts}
            runners={baseRunners}
            pitcherGamePitchCount={pitcherGamePitchCount}
            onPitcherPress={
                game.status === 'in_progress'
                    ? isScoutingMode || gameMode === 'opp_pitcher'
                        ? () => setShowOpposingPitcherModal(true)
                        : () => setPitcherModalVisible(true)
                    : undefined
            }
            onPitcherStatsPress={
                !isScoutingMode && gameMode === 'our_pitcher' && currentPitcher ? () => setShowPitcherStatsModal(true) : undefined
            }
            onBatterPress={
                game.status === 'in_progress'
                    ? isScoutingMode || gameMode !== 'opp_pitcher'
                        ? () => setBatterModalVisible(true)
                        : () => setMyBatterModalVisible(true)
                    : undefined
            }
            onRunnerPress={game.status === 'in_progress' ? handleRunnerPress : undefined}
            onSwapPress={handleToggleHomeAway}
        />
    );
}

// ----------------------------------------------------------------
// At-bat plumbing — Start At-Bat button or "select pitcher/batter" prompt
// ----------------------------------------------------------------

export function AtBatControls({ ctl, actions }: CtlActionsProp) {
    const {
        game,
        id,
        router,
        gameMode,
        isScoutingMode,
        scoutingFocus,
        shouldSkipHalf,
        canStartAtBat,
        currentPitcher,
        currentBatter,
        currentOpposingPitcher,
        currentMyBatter,
        myTeamLineup,
        opponentLineup,
    } = ctl;
    const { handleSkipHalf, handleStartAtBat } = actions;
    if (!game || game.status !== 'in_progress') return null;
    if (shouldSkipHalf) {
        const battingTeamName = scoutingFocus === 'home' ? game.scouting_home_team || 'Home' : game.opponent_name || 'Away';
        return (
            <View style={styles.selectPrompt}>
                <Text style={styles.selectPromptText}>{battingTeamName} batting — not charting this half.</Text>
                <Button mode="contained" onPress={handleSkipHalf} style={{ marginTop: 8 }} icon="skip-next">
                    Skip to Next Half
                </Button>
            </View>
        );
    }
    if (canStartAtBat) {
        return (
            <Button
                mode="contained"
                onPress={handleStartAtBat}
                style={styles.startAtBatButton}
                contentStyle={styles.logButtonContent}
                icon="baseball-bat"
            >
                Start At-Bat
            </Button>
        );
    }
    if (gameMode === 'opp_pitcher') {
        if (!currentOpposingPitcher || !currentMyBatter) {
            return (
                <View style={styles.selectPrompt}>
                    <Text style={styles.selectPromptText}>
                        {!currentOpposingPitcher && !currentMyBatter
                            ? 'Select opposing pitcher and your batter to begin'
                            : !currentOpposingPitcher
                              ? 'Select the opposing pitcher to begin'
                              : 'Select your batter to begin'}
                    </Text>
                    {myTeamLineup.length === 0 && !isScoutingMode && game?.charting_mode !== 'our_pitcher' && (
                        <Button
                            mode="outlined"
                            onPress={() => router.push(`/game/${id}/my-lineup?from=live` as any)}
                            style={{ marginTop: 8 }}
                        >
                            Setup My Lineup
                        </Button>
                    )}
                    {opponentLineup.length === 0 && !isScoutingMode && game?.charting_mode !== 'opp_pitcher' && (
                        <Button mode="outlined" onPress={() => router.push(`/game/${id}/lineup` as any)} style={{ marginTop: 8 }}>
                            Setup Opponent Lineup
                        </Button>
                    )}
                </View>
            );
        }
        return null;
    }
    if (!currentPitcher || !currentBatter) {
        return (
            <View style={styles.selectPrompt}>
                <Text style={styles.selectPromptText}>
                    {!currentPitcher && !currentBatter
                        ? 'Select a pitcher and batter to begin'
                        : !currentPitcher
                          ? 'Select a pitcher to begin'
                          : 'Select a batter to begin'}
                </Text>
                {opponentLineup.length === 0 && !isScoutingMode && game?.charting_mode !== 'opp_pitcher' && (
                    <Button mode="outlined" onPress={() => router.push(`/game/${id}/lineup` as any)} style={{ marginTop: 8 }}>
                        Setup Opponent Lineup
                    </Button>
                )}
                {myTeamLineup.length === 0 && !isScoutingMode && game?.charting_mode !== 'our_pitcher' && (
                    <Button
                        mode="outlined"
                        onPress={() => router.push(`/game/${id}/my-lineup?from=live` as any)}
                        style={{ marginTop: 8 }}
                    >
                        Setup My Lineup
                    </Button>
                )}
            </View>
        );
    }
    return null;
}

// ----------------------------------------------------------------
// Runner advancement / out buttons (Coach-mode only, when runners on)
// ----------------------------------------------------------------

export function RunnerOutButton({ ctl }: CtlProp) {
    const { isScoutingMode, game, hasRunnersOnBase, setRunnerEventDefaultTab, setShowRunnerEventModal } = ctl;
    if (isScoutingMode || !game || game.status !== 'in_progress' || !hasRunnersOnBase) return null;
    return (
        <View style={styles.runnerActionRow}>
            <Button
                mode="outlined"
                onPress={() => {
                    setRunnerEventDefaultTab('advance');
                    setShowRunnerEventModal(true);
                }}
                style={styles.runnerOutButton}
                icon="run-fast"
                compact
            >
                Runner Adv
            </Button>
            <Button
                mode="outlined"
                onPress={() => {
                    setRunnerEventDefaultTab('out');
                    setShowRunnerEventModal(true);
                }}
                style={styles.runnerOutButton}
                icon="account-remove"
                compact
            >
                Runner Out
            </Button>
        </View>
    );
}

// ----------------------------------------------------------------
// "My team lineup not set" banner — shown when opp_pitcher mode but
// our team's lineup isn't configured yet.
// ----------------------------------------------------------------

export function LineupBanner({ ctl }: CtlProp) {
    const { game, id, router, isScoutingMode, myTeamLineup } = ctl;
    if (
        !game ||
        game.charting_mode === 'our_pitcher' ||
        isScoutingMode ||
        myTeamLineup.length > 0 ||
        game.status !== 'in_progress'
    ) {
        return null;
    }
    return (
        <View style={styles.lineupBanner}>
            <Text style={styles.lineupBannerText}>My team lineup not set</Text>
            <Button
                mode="contained"
                compact
                onPress={() => router.push(`/game/${id}/my-lineup?from=live` as any)}
                style={styles.lineupBannerBtn}
            >
                Set Lineup
            </Button>
        </View>
    );
}
