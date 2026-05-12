import {
    BatterScoutingProfile,
    HandednessType,
    OpponentPitcherProfile,
    OpponentPitcherTendencies,
    OpponentTeamWithRoster,
    ThrowingHand,
} from '@pitch-tracker/shared';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    opponentBatterProfileService,
    opponentPitcherProfileService,
    opponentTeamService,
} from '../../services/opponentTeamService';
import {
    BackButton,
    Container,
    Content,
    EmptyState,
    ErrorText,
    FormActions,
    FormError,
    FormLabel,
    Header,
    HeaderLeft,
    HeaderRight,
    IconButton,
    InlineFormCard,
    LoadingText,
    PrimaryButton,
    RadioGroup,
    RadioLabel,
    RosterActions,
    RosterList,
    RosterMeta,
    RosterName,
    RosterRow,
    SecondaryButton,
    Section,
    SectionTitle,
    SectionTitleRow,
    SectionTitleText,
    SmallAddButton,
    StatBox,
    StatGrid,
    StatLabel,
    StatValue,
    Subtitle,
    TextInput,
    Title,
} from './styles';

function fmt(n: number | null | undefined, suffix = '%'): string {
    if (n == null) return '—';
    return `${n}${suffix}`;
}

function PitcherTendenciesPanel({ pitcher }: { pitcher: OpponentPitcherProfile }) {
    const [tendencies, setTendencies] = useState<OpponentPitcherTendencies | null | 'loading'>('loading');
    const [recalcing, setRecalcing] = useState(false);

    useEffect(() => {
        opponentPitcherProfileService
            .getById(pitcher.id)
            .then(({ tendencies: t }) => setTendencies(t))
            .catch(() => setTendencies(null));
    }, [pitcher.id]);

    const handleRecalc = async () => {
        setRecalcing(true);
        try {
            const updated = await opponentPitcherProfileService.recalculate(pitcher.id);
            setTendencies(updated);
        } finally {
            setRecalcing(false);
        }
    };

    return (
        <Section>
            <SectionTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                    {pitcher.pitcher_name}
                    <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 8, color: '#6b7280' }}>
                        {pitcher.throws}HP · {pitcher.games_pitched}G
                    </span>
                </span>
                <SecondaryButton onClick={handleRecalc} disabled={recalcing} style={{ fontSize: 11, padding: '4px 10px' }}>
                    {recalcing ? 'Updating…' : 'Recalc'}
                </SecondaryButton>
            </SectionTitle>
            {tendencies === 'loading' ? (
                <EmptyState>Loading…</EmptyState>
            ) : !tendencies || tendencies.total_pitches === 0 ? (
                <EmptyState>No pitch data yet. Data accumulates as you chart games vs. this pitcher.</EmptyState>
            ) : (
                <>
                    <StatGrid>
                        <StatBox>
                            <StatValue>{tendencies.total_pitches}</StatValue>
                            <StatLabel>Pitches</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>{fmt(tendencies.strike_percentage)}</StatValue>
                            <StatLabel>Strike%</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>{fmt(tendencies.first_pitch_strike_pct)}</StatValue>
                            <StatLabel>F-Strike%</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>{fmt(tendencies.fastball_pct)}</StatValue>
                            <StatLabel>FB%</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>{fmt(tendencies.breaking_pct)}</StatValue>
                            <StatLabel>Break%</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>{fmt(tendencies.offspeed_pct)}</StatValue>
                            <StatLabel>OS%</StatLabel>
                        </StatBox>
                    </StatGrid>
                    {tendencies.early_count_fastball_pct != null && (
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                            <strong>Early count (0 strikes):</strong> {fmt(tendencies.early_count_fastball_pct)} fastball
                        </div>
                    )}
                    {tendencies.two_strike_offspeed_pct != null && (
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                            <strong>Two-strike:</strong> {fmt(tendencies.two_strike_offspeed_pct)} offspeed
                        </div>
                    )}
                </>
            )}
        </Section>
    );
}

type PitcherFormState = {
    mode: 'add' | 'edit';
    editingId?: string;
    name: string;
    throws: ThrowingHand;
    jersey: string;
};

type BatterFormState = {
    mode: 'add' | 'edit';
    editingId?: string;
    name: string;
    bats: HandednessType;
    jersey: string;
};

const emptyPitcherForm: PitcherFormState = { mode: 'add', name: '', throws: 'R', jersey: '' };
const emptyBatterForm: BatterFormState = { mode: 'add', name: '', bats: 'R', jersey: '' };

function PitcherForm({
    state,
    onChange,
    onSubmit,
    onCancel,
    submitting,
    error,
}: {
    state: PitcherFormState;
    onChange: (next: PitcherFormState) => void;
    onSubmit: () => void;
    onCancel: () => void;
    submitting: boolean;
    error: string;
}) {
    return (
        <InlineFormCard>
            <div>
                <FormLabel>Pitcher name *</FormLabel>
                <TextInput
                    value={state.name}
                    onChange={(e) => onChange({ ...state, name: e.target.value })}
                    placeholder="Jake Garcia"
                    autoFocus
                />
            </div>
            <div>
                <FormLabel>Throws</FormLabel>
                <RadioGroup>
                    <RadioLabel>
                        <input
                            type="radio"
                            name="throws"
                            value="R"
                            checked={state.throws === 'R'}
                            onChange={() => onChange({ ...state, throws: 'R' })}
                        />
                        Right
                    </RadioLabel>
                    <RadioLabel>
                        <input
                            type="radio"
                            name="throws"
                            value="L"
                            checked={state.throws === 'L'}
                            onChange={() => onChange({ ...state, throws: 'L' })}
                        />
                        Left
                    </RadioLabel>
                </RadioGroup>
            </div>
            <div>
                <FormLabel>Jersey #</FormLabel>
                <TextInput
                    value={state.jersey}
                    onChange={(e) => onChange({ ...state, jersey: e.target.value.replace(/[^\d]/g, '') })}
                    placeholder="17"
                    inputMode="numeric"
                />
            </div>
            {error && <FormError>{error}</FormError>}
            <FormActions>
                <SecondaryButton onClick={onCancel} disabled={submitting}>
                    Cancel
                </SecondaryButton>
                <PrimaryButton onClick={onSubmit} disabled={submitting || !state.name.trim()}>
                    {submitting ? 'Saving…' : state.mode === 'add' ? 'Add Pitcher' : 'Save'}
                </PrimaryButton>
            </FormActions>
        </InlineFormCard>
    );
}

function BatterForm({
    state,
    onChange,
    onSubmit,
    onCancel,
    submitting,
    error,
}: {
    state: BatterFormState;
    onChange: (next: BatterFormState) => void;
    onSubmit: () => void;
    onCancel: () => void;
    submitting: boolean;
    error: string;
}) {
    return (
        <InlineFormCard>
            <div>
                <FormLabel>Batter name *</FormLabel>
                <TextInput
                    value={state.name}
                    onChange={(e) => onChange({ ...state, name: e.target.value })}
                    placeholder="Alex Wright"
                    autoFocus
                />
            </div>
            <div>
                <FormLabel>Bats</FormLabel>
                <RadioGroup>
                    {(['R', 'L', 'S'] as HandednessType[]).map((b) => (
                        <RadioLabel key={b}>
                            <input
                                type="radio"
                                name="bats"
                                value={b}
                                checked={state.bats === b}
                                onChange={() => onChange({ ...state, bats: b })}
                            />
                            {b === 'R' ? 'Right' : b === 'L' ? 'Left' : 'Switch'}
                        </RadioLabel>
                    ))}
                </RadioGroup>
            </div>
            <div>
                <FormLabel>Jersey #</FormLabel>
                <TextInput
                    value={state.jersey}
                    onChange={(e) => onChange({ ...state, jersey: e.target.value.replace(/[^\d]/g, '') })}
                    placeholder="4"
                    inputMode="numeric"
                />
            </div>
            {error && <FormError>{error}</FormError>}
            <FormActions>
                <SecondaryButton onClick={onCancel} disabled={submitting}>
                    Cancel
                </SecondaryButton>
                <PrimaryButton onClick={onSubmit} disabled={submitting || !state.name.trim()}>
                    {submitting ? 'Saving…' : state.mode === 'add' ? 'Add Batter' : 'Save'}
                </PrimaryButton>
            </FormActions>
        </InlineFormCard>
    );
}

const OpponentDetail: React.FC = () => {
    const navigate = useNavigate();
    const { team_id: teamId, id } = useParams<{ team_id: string; id: string }>();
    const [opponent, setOpponent] = useState<OpponentTeamWithRoster | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPitcher, setSelectedPitcher] = useState<OpponentPitcherProfile | null>(null);

    const [pitcherForm, setPitcherForm] = useState<PitcherFormState | null>(null);
    const [batterForm, setBatterForm] = useState<BatterFormState | null>(null);
    const [pitcherSubmitting, setPitcherSubmitting] = useState(false);
    const [batterSubmitting, setBatterSubmitting] = useState(false);
    const [pitcherFormError, setPitcherFormError] = useState('');
    const [batterFormError, setBatterFormError] = useState('');

    const load = useCallback(async () => {
        if (!teamId || !id) return;
        setLoading(true);
        try {
            const data = await opponentTeamService.getById(teamId, id);
            setOpponent(data);
        } catch {
            setError('Opponent team not found.');
        } finally {
            setLoading(false);
        }
    }, [teamId, id]);

    useEffect(() => {
        load();
    }, [load]);

    const handlePitcherSubmit = async () => {
        if (!opponent || !pitcherForm) return;
        setPitcherSubmitting(true);
        setPitcherFormError('');
        const jerseyNum = pitcherForm.jersey.trim() === '' ? null : parseInt(pitcherForm.jersey, 10);
        try {
            if (pitcherForm.mode === 'add') {
                const created = await opponentPitcherProfileService.create(opponent.id, {
                    pitcher_name: pitcherForm.name.trim(),
                    throws: pitcherForm.throws,
                    jersey_number: jerseyNum,
                });
                setOpponent({
                    ...opponent,
                    pitchers: [...opponent.pitchers, created].sort((a, b) => a.pitcher_name.localeCompare(b.pitcher_name)),
                });
            } else if (pitcherForm.editingId) {
                const updated = await opponentPitcherProfileService.update(pitcherForm.editingId, {
                    pitcher_name: pitcherForm.name.trim(),
                    throws: pitcherForm.throws,
                    jersey_number: jerseyNum,
                });
                setOpponent({
                    ...opponent,
                    pitchers: opponent.pitchers.map((p) => (p.id === updated.id ? updated : p)),
                });
            }
            setPitcherForm(null);
        } catch (err) {
            const e = err as { response?: { status?: number; data?: { error?: string } } };
            if (e.response?.status === 409) {
                setPitcherFormError(e.response.data?.error || 'A pitcher with this name already exists on this opponent team.');
            } else {
                setPitcherFormError('Failed to save pitcher.');
            }
        } finally {
            setPitcherSubmitting(false);
        }
    };

    const handlePitcherDelete = async (p: OpponentPitcherProfile) => {
        if (!opponent) return;
        if (!window.confirm(`Remove ${p.pitcher_name} from this opponent's roster?`)) return;
        await opponentPitcherProfileService.delete(p.id);
        setOpponent({ ...opponent, pitchers: opponent.pitchers.filter((x) => x.id !== p.id) });
        if (selectedPitcher?.id === p.id) setSelectedPitcher(null);
    };

    const handleBatterSubmit = async () => {
        if (!opponent || !batterForm) return;
        setBatterSubmitting(true);
        setBatterFormError('');
        const jerseyNum = batterForm.jersey.trim() === '' ? null : parseInt(batterForm.jersey, 10);
        try {
            if (batterForm.mode === 'add') {
                const created = await opponentBatterProfileService.create(opponent.id, {
                    player_name: batterForm.name.trim(),
                    bats: batterForm.bats,
                    jersey_number: jerseyNum,
                });
                setOpponent({
                    ...opponent,
                    batters: [...opponent.batters, created].sort((a, b) => a.player_name.localeCompare(b.player_name)),
                });
            } else if (batterForm.editingId) {
                const updated = await opponentBatterProfileService.update(batterForm.editingId, {
                    player_name: batterForm.name.trim(),
                    bats: batterForm.bats,
                    jersey_number: jerseyNum,
                });
                setOpponent({
                    ...opponent,
                    batters: opponent.batters.map((b) => (b.id === updated.id ? updated : b)),
                });
            }
            setBatterForm(null);
        } catch (err) {
            const e = err as { response?: { status?: number; data?: { error?: string } } };
            if (e.response?.status === 409) {
                setBatterFormError(e.response.data?.error || 'A batter with this name already exists on this opponent team.');
            } else {
                setBatterFormError('Failed to save batter.');
            }
        } finally {
            setBatterSubmitting(false);
        }
    };

    const handleBatterDelete = async (b: BatterScoutingProfile) => {
        if (!opponent) return;
        if (!window.confirm(`Remove ${b.player_name} from this opponent's roster?`)) return;
        await opponentBatterProfileService.delete(b.id);
        setOpponent({ ...opponent, batters: opponent.batters.filter((x) => x.id !== b.id) });
    };

    if (loading) return <LoadingText>Loading…</LoadingText>;
    if (error || !opponent) return <ErrorText>{error || 'Not found'}</ErrorText>;

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/teams/${teamId}/opponents`)}>Opponents</BackButton>
                    <div>
                        <Title>{opponent.name}</Title>
                        <Subtitle>
                            {[opponent.city, opponent.level].filter(Boolean).join(' · ')}
                            {opponent.games_played > 0 &&
                                ` · ${opponent.games_played} charted game${opponent.games_played !== 1 ? 's' : ''}`}
                        </Subtitle>
                    </div>
                </HeaderLeft>
                <HeaderRight>
                    <SecondaryButton onClick={() => navigate(`/teams/${teamId}/opponents`)}>Back</SecondaryButton>
                </HeaderRight>
            </Header>

            <Content>
                {/* Pitchers column */}
                <div>
                    <Section style={{ marginBottom: 20 }}>
                        <SectionTitleRow>
                            <SectionTitleText>Pitcher Roster</SectionTitleText>
                            {!pitcherForm && (
                                <SmallAddButton
                                    onClick={() => {
                                        setPitcherFormError('');
                                        setPitcherForm(emptyPitcherForm);
                                    }}
                                >
                                    + Add Pitcher
                                </SmallAddButton>
                            )}
                        </SectionTitleRow>

                        {pitcherForm && (
                            <PitcherForm
                                state={pitcherForm}
                                onChange={setPitcherForm}
                                onSubmit={handlePitcherSubmit}
                                onCancel={() => {
                                    setPitcherForm(null);
                                    setPitcherFormError('');
                                }}
                                submitting={pitcherSubmitting}
                                error={pitcherFormError}
                            />
                        )}

                        {opponent.pitchers.length === 0 ? (
                            <EmptyState>
                                No pitchers yet. Add one above, or chart a game to populate this roster automatically.
                            </EmptyState>
                        ) : (
                            <RosterList>
                                {opponent.pitchers.map((p) => (
                                    <RosterRow key={p.id} onClick={() => setSelectedPitcher(p === selectedPitcher ? null : p)}>
                                        <RosterName>{p.pitcher_name}</RosterName>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <RosterMeta>
                                                {p.throws}HP
                                                {p.jersey_number != null ? ` · #${p.jersey_number}` : ''}
                                                {' · '}
                                                {p.games_pitched}G
                                            </RosterMeta>
                                            <RosterActions onClick={(e) => e.stopPropagation()}>
                                                <IconButton
                                                    title="Edit"
                                                    onClick={() => {
                                                        setPitcherFormError('');
                                                        setPitcherForm({
                                                            mode: 'edit',
                                                            editingId: p.id,
                                                            name: p.pitcher_name,
                                                            throws: p.throws,
                                                            jersey: p.jersey_number != null ? String(p.jersey_number) : '',
                                                        });
                                                    }}
                                                >
                                                    ✎
                                                </IconButton>
                                                <IconButton title="Delete" onClick={() => handlePitcherDelete(p)}>
                                                    ✕
                                                </IconButton>
                                            </RosterActions>
                                        </div>
                                    </RosterRow>
                                ))}
                            </RosterList>
                        )}
                    </Section>

                    {selectedPitcher && <PitcherTendenciesPanel pitcher={selectedPitcher} />}
                </div>

                {/* Batters column */}
                <Section>
                    <SectionTitleRow>
                        <SectionTitleText>Batter Roster</SectionTitleText>
                        {!batterForm && (
                            <SmallAddButton
                                onClick={() => {
                                    setBatterFormError('');
                                    setBatterForm(emptyBatterForm);
                                }}
                            >
                                + Add Batter
                            </SmallAddButton>
                        )}
                    </SectionTitleRow>

                    {batterForm && (
                        <BatterForm
                            state={batterForm}
                            onChange={setBatterForm}
                            onSubmit={handleBatterSubmit}
                            onCancel={() => {
                                setBatterForm(null);
                                setBatterFormError('');
                            }}
                            submitting={batterSubmitting}
                            error={batterFormError}
                        />
                    )}

                    {opponent.batters.length === 0 ? (
                        <EmptyState>
                            No batters yet. Add one above, or chart an opponent lineup to populate this roster automatically.
                        </EmptyState>
                    ) : (
                        <RosterList>
                            {opponent.batters.map((b) => (
                                <RosterRow key={b.id}>
                                    <RosterName>{b.player_name}</RosterName>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <RosterMeta>
                                            {b.bats}HH
                                            {b.jersey_number != null ? ` · #${b.jersey_number}` : ''}
                                        </RosterMeta>
                                        <RosterActions>
                                            <IconButton
                                                title="Edit"
                                                onClick={() => {
                                                    setBatterFormError('');
                                                    setBatterForm({
                                                        mode: 'edit',
                                                        editingId: b.id,
                                                        name: b.player_name,
                                                        bats: b.bats,
                                                        jersey: b.jersey_number != null ? String(b.jersey_number) : '',
                                                    });
                                                }}
                                            >
                                                ✎
                                            </IconButton>
                                            <IconButton title="Delete" onClick={() => handleBatterDelete(b)}>
                                                ✕
                                            </IconButton>
                                        </RosterActions>
                                    </div>
                                </RosterRow>
                            ))}
                        </RosterList>
                    )}
                    {opponent.batters.length > 0 && (
                        <PrimaryButton
                            style={{ marginTop: 16, width: '100%' }}
                            onClick={() => navigate(`/teams/${teamId}/scouting`)}
                        >
                            View Scouting Reports
                        </PrimaryButton>
                    )}
                </Section>
            </Content>
        </Container>
    );
};

export default OpponentDetail;
