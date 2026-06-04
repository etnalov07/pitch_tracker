import { Game, GamePitcherWithPlayer, Pitch } from '@pitch-tracker/shared';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gamesApi } from '../../state/games/api/gamesApi';
import {
    BackButton,
    Empty,
    Hint,
    Page,
    PasteArea,
    PasteRow,
    PitcherTab,
    PitcherTabRow,
    SaveBar,
    SaveButton,
    SmallButton,
    StatusText,
    Subtitle,
    Table,
    Td,
    Th,
    Title,
    TopBar,
    VelocityInput,
} from './styles';

// getGamePitches joins batter/pitcher names onto each row; they aren't on the
// shared Pitch type, so widen locally for the (optional) batter column.
type PitchRow = Pitch & {
    batter_first_name?: string | null;
    batter_last_name?: string | null;
};

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

const MIN_MPH = 20;
const MAX_MPH = 130;

const originalStr = (p: Pitch): string => (p.velocity == null ? '' : String(p.velocity));

const VelocityEntry: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();

    const [game, setGame] = useState<Game | null>(null);
    const [pitchers, setPitchers] = useState<GamePitcherWithPlayer[]>([]);
    const [pitches, setPitches] = useState<PitchRow[]>([]);
    const [selectedPitcherIdx, setSelectedPitcherIdx] = useState(0);
    // pitchId -> in-progress input string. Absent = unchanged from the stored value.
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [pasteText, setPasteText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!gameId) return;
        let cancelled = false;
        setLoading(true);
        Promise.all([gamesApi.getGameById(gameId), gamesApi.getGamePitchers(gameId), gamesApi.getGamePitches(gameId)])
            .then(([g, gp, p]) => {
                if (cancelled) return;
                setGame(g);
                setPitchers(gp);
                setPitches(p as PitchRow[]);
                setError(null);
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load game');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [gameId]);

    const selectedPitcher = pitchers[selectedPitcherIdx] ?? null;

    // Pitches for the selected pitcher, already in throw order (API: created_at ASC).
    const pitcherPitches = useMemo(
        () => (selectedPitcher ? pitches.filter((p) => p.pitcher_id === selectedPitcher.player_id) : []),
        [pitches, selectedPitcher]
    );

    const currentStr = (p: Pitch): string => (drafts[p.id] !== undefined ? drafts[p.id] : originalStr(p));
    const isDirty = (p: Pitch): boolean => drafts[p.id] !== undefined && drafts[p.id] !== originalStr(p);

    // All changed rows across the whole game (one Save persists every pitcher's edits).
    const dirtyPitches = useMemo(
        () => pitches.filter((p) => drafts[p.id] !== undefined && drafts[p.id] !== originalStr(p)),
        [pitches, drafts]
    );

    const enteredCount = pitcherPitches.filter((p) => currentStr(p).trim() !== '').length;

    const setDraft = (pitchId: string, value: string) => {
        setStatus(null);
        setDrafts((prev) => ({ ...prev, [pitchId]: value }));
    };

    const handleFill = () => {
        const tokens = pasteText
            .trim()
            .split(/[\s,]+/)
            .filter(Boolean);
        if (tokens.length === 0) return;
        setStatus(null);
        setDrafts((prev) => {
            const next = { ...prev };
            pitcherPitches.forEach((p, i) => {
                if (i < tokens.length) next[p.id] = tokens[i];
            });
            return next;
        });
    };

    const pitcherName = (gp: GamePitcherWithPlayer, i: number): string =>
        gp.player ? `${gp.player.first_name} ${gp.player.last_name}` : `Pitcher ${i + 1}`;

    const focusNext = (idx: number) => {
        const next = inputsRef.current[idx + 1];
        if (next) next.focus();
    };

    const handleSave = async () => {
        if (!gameId || dirtyPitches.length === 0) return;

        // Validate + build the payload (empty string clears the velocity → null).
        const updates: { pitch_id: string; velocity: number | null }[] = [];
        for (const p of dirtyPitches) {
            const raw = drafts[p.id].trim();
            if (raw === '') {
                updates.push({ pitch_id: p.id, velocity: null });
                continue;
            }
            const num = parseFloat(raw);
            if (Number.isNaN(num) || num < MIN_MPH || num > MAX_MPH) {
                setStatus({ kind: 'error', text: `"${raw}" is not a valid velocity (${MIN_MPH}–${MAX_MPH} mph).` });
                return;
            }
            updates.push({ pitch_id: p.id, velocity: num });
        }

        setSaving(true);
        setStatus(null);
        try {
            const { updated } = await gamesApi.updatePitchVelocities(gameId, updates);
            // Reflect saved values locally so dirty state clears and stats re-read fresh.
            const byId = new Map(updates.map((u) => [u.pitch_id, u.velocity]));
            setPitches((prev) => prev.map((p) => (byId.has(p.id) ? { ...p, velocity: byId.get(p.id) ?? undefined } : p)));
            setDrafts({});
            setStatus({ kind: 'success', text: `Saved ${updated} ${updated === 1 ? 'velocity' : 'velocities'}.` });
        } catch (e) {
            setStatus({ kind: 'error', text: e instanceof Error ? e.message : 'Failed to save velocities.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Page>
            <TopBar>
                <BackButton onClick={() => navigate(`/game/${gameId}`)}>← Back</BackButton>
                <Title>Enter Velocities</Title>
            </TopBar>
            <Subtitle>
                {game ? `${game.home_team_name ?? 'Home'} vs ${game.opponent_name ?? 'Away'}` : 'Loading…'} · pick a pitcher, then
                type a velocity for each pitch in order.
            </Subtitle>

            {loading && <Empty>Loading…</Empty>}
            {!loading && error && <Empty>{error}</Empty>}
            {!loading && !error && pitchers.length === 0 && <Empty>No pitchers recorded for this game.</Empty>}

            {!loading && !error && pitchers.length > 0 && (
                <>
                    <PitcherTabRow>
                        {pitchers.map((gp, i) => (
                            <PitcherTab
                                key={gp.player_id}
                                active={i === selectedPitcherIdx}
                                onClick={() => setSelectedPitcherIdx(i)}
                            >
                                {pitcherName(gp, i)}
                            </PitcherTab>
                        ))}
                    </PitcherTabRow>

                    {pitcherPitches.length === 0 ? (
                        <Empty>No pitches recorded for this pitcher.</Empty>
                    ) : (
                        <>
                            <PasteRow>
                                <PasteArea
                                    placeholder="Optionally paste a list of velocities (e.g. 78 79 77 80) to fill the column in order."
                                    value={pasteText}
                                    onChange={(e) => setPasteText(e.target.value)}
                                />
                                <SmallButton onClick={handleFill} disabled={pasteText.trim() === ''}>
                                    Fill ↓
                                </SmallButton>
                            </PasteRow>
                            <Hint>
                                {enteredCount} of {pitcherPitches.length} pitches have a velocity
                                {selectedPitcher ? ` for ${pitcherName(selectedPitcher, selectedPitcherIdx)}` : ''}.
                            </Hint>

                            <Table>
                                <thead>
                                    <tr>
                                        <Th align="right">#</Th>
                                        <Th>Type</Th>
                                        <Th>Result</Th>
                                        <Th align="center">Count</Th>
                                        <Th align="right">Velocity (mph)</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pitcherPitches.map((p, i) => (
                                        <tr key={p.id}>
                                            <Td align="right">{i + 1}</Td>
                                            <Td>{PITCH_TYPE_LABELS[p.pitch_type] ?? p.pitch_type}</Td>
                                            <Td>{RESULT_LABELS[p.pitch_result] ?? p.pitch_result}</Td>
                                            <Td align="center">
                                                {p.balls_before}-{p.strikes_before}
                                            </Td>
                                            <Td align="right">
                                                <VelocityInput
                                                    ref={(el) => {
                                                        inputsRef.current[i] = el;
                                                    }}
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.1"
                                                    min={MIN_MPH}
                                                    max={MAX_MPH}
                                                    dirty={isDirty(p)}
                                                    value={currentStr(p)}
                                                    onChange={(e) => setDraft(p.id, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            focusNext(i);
                                                        }
                                                    }}
                                                />
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    )}

                    <SaveBar>
                        {status && <StatusText kind={status.kind}>{status.text}</StatusText>}
                        {!status && dirtyPitches.length > 0 && (
                            <StatusText kind="muted">
                                {dirtyPitches.length} unsaved {dirtyPitches.length === 1 ? 'change' : 'changes'}
                            </StatusText>
                        )}
                        <SaveButton onClick={handleSave} disabled={saving || dirtyPitches.length === 0}>
                            {saving ? 'Saving…' : `Save${dirtyPitches.length > 0 ? ` (${dirtyPitches.length})` : ''}`}
                        </SaveButton>
                    </SaveBar>
                </>
            )}
        </Page>
    );
};

export default VelocityEntry;
