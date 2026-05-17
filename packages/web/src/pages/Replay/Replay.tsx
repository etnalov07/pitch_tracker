import {
    AtBat,
    Game,
    GamePitcherWithPlayer,
    OpponentLineupPlayer,
    Pitch,
    ReplayAtBat,
    ReplayLookups,
    buildReplaySequence,
} from '@pitch-tracker/shared';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gamesApi } from '../../state/games/api/gamesApi';
import MiniStrikeZone from './MiniStrikeZone';
import {
    BackButton,
    BatterChip,
    BatterHeader,
    BatterMeta,
    BatterName,
    Body,
    Counter,
    Empty,
    InfoCard,
    InfoCol,
    Page,
    PitchMeta,
    PitchSummary,
    ScrubberRow,
    Slider,
    StepButton,
    StripWrap,
    Title,
    TopBar,
    ZoneCard,
} from './styles';

const PITCH_TYPE_LABELS: Record<string, string> = {
    fastball: 'Fastball',
    '4-seam': 'Fastball',
    '2-seam': '2-Seam',
    cutter: 'Cutter',
    sinker: 'Sinker',
    slider: 'Slider',
    curveball: 'Curveball',
    changeup: 'Changeup',
    splitter: 'Splitter',
    knuckleball: 'Knuckleball',
    other: 'Other',
};

const RESULT_LABELS: Record<string, string> = {
    ball: 'Ball',
    called_strike: 'Called Strike',
    swinging_strike: 'Swinging Strike',
    foul: 'Foul',
    in_play: 'In Play',
    hit_by_pitch: 'Hit By Pitch',
};

const Replay: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();

    const [, setGame] = useState<Game | null>(null);
    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [atBats, setAtBats] = useState<AtBat[]>([]);
    const [opponentLineup, setOpponentLineup] = useState<OpponentLineupPlayer[]>([]);
    const [gamePitchers, setGamePitchers] = useState<GamePitcherWithPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedAtBatIdx, setSelectedAtBatIdx] = useState(0);
    const [pitchIdx, setPitchIdx] = useState(0);

    useEffect(() => {
        if (!gameId) return;
        let cancelled = false;
        setLoading(true);
        Promise.all([
            gamesApi.getGameById(gameId),
            gamesApi.getGamePitches(gameId),
            gamesApi.getAtBatsByGame(gameId),
            gamesApi.getOpponentLineup(gameId).catch(() => [] as OpponentLineupPlayer[]),
            gamesApi.getGamePitchers(gameId).catch(() => [] as GamePitcherWithPlayer[]),
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
    }, [gameId]);

    // Lookup tables: opp-batter / pitcher names (so the API join misses don't
    // reduce opp batters to "Batter") and handedness for the silhouette.
    const lookups: ReplayLookups = useMemo(() => {
        const batterNameByOpponentId = new Map<string, string>();
        for (const b of opponentLineup) if (b.id && b.player_name) batterNameByOpponentId.set(b.id, b.player_name);
        const pitcherNameByPlayerId = new Map<string, string>();
        for (const gp of gamePitchers) {
            const id = gp.player_id ?? gp.player?.id;
            if (id && gp.player) {
                const first = gp.player.first_name?.[0];
                const last = gp.player.last_name;
                const name = first && last ? `${first}. ${last}` : last || first || '';
                if (name) pitcherNameByPlayerId.set(id, name);
            }
        }
        return { batterNameByOpponentId, pitcherNameByPlayerId };
    }, [opponentLineup, gamePitchers]);

    const sequence: ReplayAtBat[] = useMemo(() => buildReplaySequence(pitches, atBats, lookups), [pitches, atBats, lookups]);

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

    const batterSide: 'R' | 'L' | 'S' | undefined = currentPitch?.opponent_batter_id
        ? batsByOppBatterId.get(currentPitch.opponent_batter_id)
        : undefined;
    const pitcherThrows: 'R' | 'L' | undefined = currentPitch?.pitcher_id
        ? throwsByPitcherId.get(currentPitch.pitcher_id)
        : undefined;

    return (
        <Page>
            <TopBar>
                <BackButton onClick={() => navigate(-1)}>← Back</BackButton>
                <Title>Replay</Title>
            </TopBar>

            {loading && <Empty>Loading…</Empty>}
            {!loading && error && <Empty>{error}</Empty>}
            {!loading && !error && sequence.length === 0 && <Empty>No pitches from your pitcher in this game.</Empty>}

            {!loading && !error && sequence.length > 0 && (
                <>
                    <StripWrap>
                        {sequence.map((entry, idx) => {
                            const order = entry.atBat.batting_order ? `#${entry.atBat.batting_order} ` : '';
                            const result = entry.atBat.result ? ` (${entry.atBat.result.replace(/_/g, ' ')})` : '';
                            return (
                                <BatterChip
                                    key={entry.atBat.id}
                                    selected={idx === selectedAtBatIdx}
                                    onClick={() => setSelectedAtBatIdx(idx)}
                                >
                                    {order}
                                    {entry.batterDisplayName}
                                    {result}
                                </BatterChip>
                            );
                        })}
                    </StripWrap>

                    <Body>
                        <ZoneCard>
                            <MiniStrikeZone
                                targetZone={currentPitch?.target_zone ?? null}
                                actualX={currentPitch?.location_x}
                                actualY={currentPitch?.location_y}
                                pitchType={currentPitch?.pitch_type}
                                batterSide={batterSide}
                                pitcherThrows={pitcherThrows}
                            />
                            {currentPitch && (currentPitch.location_x == null || currentPitch.location_y == null) && (
                                <PitchMeta style={{ marginTop: 8, textAlign: 'center', width: '100%' }}>
                                    (pitch location not recorded)
                                </PitchMeta>
                            )}
                        </ZoneCard>

                        <InfoCol>
                            {currentEntry && (
                                <BatterHeader>
                                    <BatterName>
                                        {currentEntry.atBat.batting_order ? `#${currentEntry.atBat.batting_order} ` : ''}
                                        {currentEntry.batterDisplayName}
                                        {batterSide ? ` (${batterSide}HH)` : ''}
                                    </BatterName>
                                    <BatterMeta>
                                        P: {currentEntry.pitcherDisplayName}
                                        {pitcherThrows ? ` (${pitcherThrows}HP)` : ''} · AB result:{' '}
                                        {currentEntry.atBat.result?.replace(/_/g, ' ') ?? 'in progress'}
                                    </BatterMeta>
                                </BatterHeader>
                            )}

                            {currentEntry && currentEntry.pitches.length > 0 && (
                                <ScrubberRow>
                                    <StepButton onClick={() => setPitchIdx(Math.max(0, pitchIdx - 1))} disabled={pitchIdx <= 0}>
                                        ◀
                                    </StepButton>
                                    <Slider
                                        type="range"
                                        min={0}
                                        max={Math.max(0, currentEntry.pitches.length - 1)}
                                        value={pitchIdx}
                                        onChange={(e) => setPitchIdx(parseInt(e.target.value, 10))}
                                        disabled={currentEntry.pitches.length <= 1}
                                    />
                                    <StepButton
                                        onClick={() => setPitchIdx(Math.min(currentEntry.pitches.length - 1, pitchIdx + 1))}
                                        disabled={pitchIdx >= currentEntry.pitches.length - 1}
                                    >
                                        ▶
                                    </StepButton>
                                    <Counter>
                                        {pitchIdx + 1} / {currentEntry.pitches.length}
                                    </Counter>
                                </ScrubberRow>
                            )}

                            {currentPitch && (
                                <InfoCard>
                                    <PitchSummary>
                                        {PITCH_TYPE_LABELS[currentPitch.pitch_type] ?? currentPitch.pitch_type}
                                        {typeof currentPitch.velocity === 'number' && currentPitch.velocity > 0
                                            ? ` · ${Math.round(currentPitch.velocity)} mph`
                                            : ''}
                                        {' · '}
                                        {RESULT_LABELS[currentPitch.pitch_result] ?? currentPitch.pitch_result}
                                    </PitchSummary>
                                    <PitchMeta>
                                        Count before pitch: {currentPitch.balls_before}-{currentPitch.strikes_before} · Outs:{' '}
                                        {currentEntry?.atBat.outs_before ?? 0}
                                    </PitchMeta>
                                </InfoCard>
                            )}
                        </InfoCol>
                    </Body>
                </>
            )}
        </Page>
    );
};

export default Replay;
