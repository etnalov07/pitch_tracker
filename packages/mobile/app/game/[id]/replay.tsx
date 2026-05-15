import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, SafeAreaView } from 'react-native';
import { Text, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    AtBat,
    Game,
    GamePitcherWithPlayer,
    OpponentLineupPlayer,
    Pitch,
    ReplayAtBat,
    buildReplaySequence,
} from '@pitch-tracker/shared';
import { gamesApi } from '../../../src/state/games/api/gamesApi';
import StrikeZone, { PITCH_TYPE_LABELS } from '../../../src/components/live/StrikeZone/StrikeZone';
import BatterStrip from '../../../src/components/replay/BatterStrip';
import PitchScrubber from '../../../src/components/replay/PitchScrubber';

const RESULT_LABELS: Record<string, string> = {
    ball: 'Ball',
    called_strike: 'Called Strike',
    swinging_strike: 'Swinging Strike',
    foul: 'Foul',
    in_play: 'In Play',
    hit_by_pitch: 'Hit By Pitch',
};

export default function ReplayScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();

    const [game, setGame] = useState<Game | null>(null);
    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [atBats, setAtBats] = useState<AtBat[]>([]);
    const [opponentLineup, setOpponentLineup] = useState<OpponentLineupPlayer[]>([]);
    const [gamePitchers, setGamePitchers] = useState<GamePitcherWithPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedAtBatIdx, setSelectedAtBatIdx] = useState(0);
    const [pitchIdx, setPitchIdx] = useState(0);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        setLoading(true);
        Promise.all([
            gamesApi.getGameById(id),
            gamesApi.getGamePitches(id),
            gamesApi.getAtBatsByGame(id),
            gamesApi.getOpponentLineup(id).catch(() => [] as OpponentLineupPlayer[]),
            gamesApi.getGamePitchers(id).catch(() => [] as GamePitcherWithPlayer[]),
        ])
            .then(([g, p, ab, ol, gp]) => {
                if (cancelled) return;
                setGame(g);
                setPitches(p);
                setAtBats(ab);
                setOpponentLineup(ol);
                setGamePitchers(gp);
                setError(null);
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load replay');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const sequence: ReplayAtBat[] = useMemo(() => buildReplaySequence(pitches, atBats), [pitches, atBats]);

    // Lookup tables for batter handedness + pitcher throws (used by the StrikeZone silhouette).
    const batsByOppBatterId = useMemo(() => {
        const m = new Map<string, 'R' | 'L' | 'S'>();
        for (const b of opponentLineup) if (b.id && b.bats) m.set(b.id, b.bats as 'R' | 'L' | 'S');
        return m;
    }, [opponentLineup]);
    const throwsByPitcherId = useMemo(() => {
        const m = new Map<string, 'R' | 'L'>();
        for (const gp of gamePitchers) {
            const id = gp.player_id ?? gp.player?.id;
            const throws = gp.player?.throws;
            if (id && (throws === 'R' || throws === 'L')) m.set(id, throws);
        }
        return m;
    }, [gamePitchers]);

    useEffect(() => {
        if (selectedAtBatIdx >= sequence.length) setSelectedAtBatIdx(0);
    }, [sequence.length, selectedAtBatIdx]);

    useEffect(() => {
        setPitchIdx(0);
    }, [selectedAtBatIdx]);

    const currentEntry: ReplayAtBat | undefined = sequence[selectedAtBatIdx];
    const currentPitch: Pitch | undefined = currentEntry?.pitches[pitchIdx];

    const renderHeader = () => (
        <View style={styles.headerRow}>
            <IconButton icon="arrow-left" onPress={() => router.back()} />
            <Text variant="titleLarge" style={styles.title}>
                Replay
            </Text>
            <View style={{ width: 48 }} />
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {renderHeader()}
                <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !game) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {renderHeader()}
                <View style={styles.centered}>
                    <Text variant="bodyLarge">{error ?? 'Game not found'}</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (sequence.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {renderHeader()}
                <View style={styles.centered}>
                    <Text variant="bodyLarge" style={{ textAlign: 'center', paddingHorizontal: 24 }}>
                        No pitches from your pitcher in this game.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const result = currentPitch?.pitch_result;
    const pitchType = currentPitch?.pitch_type;
    const velocity = currentPitch?.velocity;
    const ballsBefore = currentPitch?.balls_before ?? 0;
    const strikesBefore = currentPitch?.strikes_before ?? 0;
    const outs = currentEntry?.atBat.outs_before ?? 0;
    const abResult = currentEntry?.atBat.result?.replace(/_/g, ' ') ?? 'in progress';

    const resultLabel = result ? (RESULT_LABELS[result] ?? result) : '—';
    const typeLabel = pitchType ? (PITCH_TYPE_LABELS[pitchType] ?? pitchType) : '—';
    const veloLabel = typeof velocity === 'number' && velocity > 0 ? `${Math.round(velocity)} mph` : null;

    // Batter side / pitcher throws — fall back to right-handed if unknown so the
    // silhouette still renders. Lookup uses the opponent batter's id and the
    // pitcher's player_id (both stored on the Pitch).
    const batterSide: 'R' | 'L' | 'S' | undefined = currentPitch?.opponent_batter_id
        ? batsByOppBatterId.get(currentPitch.opponent_batter_id)
        : undefined;
    const pitcherThrows: 'R' | 'L' | undefined = currentPitch?.pitcher_id
        ? throwsByPitcherId.get(currentPitch.pitcher_id)
        : undefined;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {renderHeader()}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <BatterStrip atBats={sequence} selectedIdx={selectedAtBatIdx} onSelect={setSelectedAtBatIdx} />

                {currentEntry && (
                    <View style={styles.batterHeader}>
                        <Text variant="titleMedium">
                            {currentEntry.atBat.batting_order ? `#${currentEntry.atBat.batting_order} ` : ''}
                            {currentEntry.batterDisplayName}
                            {batterSide ? ` (${batterSide}HH)` : ''}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            P: {currentEntry.pitcherDisplayName}
                            {pitcherThrows ? ` (${pitcherThrows}HP)` : ''} · AB result: {abResult}
                        </Text>
                    </View>
                )}

                <View style={styles.zoneWrap}>
                    <StrikeZone
                        onLocationSelect={() => undefined}
                        targetZone={currentPitch?.target_zone ?? null}
                        previousPitches={currentPitch ? [currentPitch] : []}
                        disabled
                        colorBy="pitchType"
                        batterSide={batterSide}
                        pitcherThrows={pitcherThrows}
                    />
                </View>
                {currentPitch && (currentPitch.location_x == null || currentPitch.location_y == null) && (
                    <Text variant="bodySmall" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                        (pitch location not recorded)
                    </Text>
                )}

                {currentEntry && currentEntry.pitches.length > 0 && (
                    <PitchScrubber pitchCount={currentEntry.pitches.length} pitchIdx={pitchIdx} onChange={setPitchIdx} />
                )}

                <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="titleSmall">
                        {typeLabel}
                        {veloLabel ? ` · ${veloLabel}` : ''} · {resultLabel}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                        Count before pitch: {ballsBefore}-{strikesBefore} · Outs: {outs}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    title: { fontWeight: '600' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: 32 },
    batterHeader: { paddingHorizontal: 16, paddingVertical: 8 },
    zoneWrap: { paddingHorizontal: 8 },
    infoCard: {
        marginHorizontal: 12,
        marginTop: 8,
        padding: 12,
        borderRadius: 10,
    },
});
