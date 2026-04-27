import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { opponentTeamService } from '../../services/opponentTeamService';
import { useAppDispatch, useAppSelector, fetchAllTeams, createGame } from '../../state';
import { OpponentTeam } from '../../types';
import {
    Container,
    Header,
    HeaderLeft,
    BackButton,
    Title,
    Content,
    FormCard,
    Form,
    TeamSelectionSection,
    GameDetailsSection,
    SectionTitle,
    SectionSubtitle,
    TeamsRow,
    TeamSelectGroup,
    VsText,
    Label,
    TeamSelect,
    SelectedTeamPreview,
    TeamBadge,
    FormRow,
    FormGroup,
    Input,
    GamePreview,
    PreviewTitle,
    PreviewMatchup,
    PreviewTeam,
    PreviewAt,
    PreviewDetails,
    PreviewBadge,
    ConfirmDetailsList,
    ConfirmDetailRow,
    ConfirmDetailKey,
    ConfirmDetailValue,
    FormActions,
    CancelButton,
    NextButton,
    SubmitButton,
    ErrorMessage,
    WarningCard,
    WarningIcon,
    WarningTitle,
    WarningText,
    CreateTeamButton,
    LoadingText,
    HomeAwayToggle,
    ToggleOption,
    StepperContainer,
    StepItem,
    StepDot,
    StepLabel,
    StepConnector,
    ModeGrid,
    ModeCard,
    ModeCardTitle,
    ModeCardDesc,
} from './styles';

type ChartingMode = 'our_pitcher' | 'opp_pitcher' | 'both' | 'scouting';
type ScoutingFocus = 'both' | 'home' | 'away';

const CHARTING_MODES: { value: ChartingMode; label: string; desc: string }[] = [
    {
        value: 'our_pitcher',
        label: 'Our Pitcher',
        desc: 'Chart every pitch your pitcher throws. Full velocity, location, and result tracking.',
    },
    {
        value: 'both',
        label: 'Both Pitchers',
        desc: 'Track both your pitcher and the opposing pitcher. Maximum coverage.',
    },
    {
        value: 'opp_pitcher',
        label: 'Opp Pitcher',
        desc: 'Chart only the opposing pitcher. Good for scouting while your team bats.',
    },
    {
        value: 'scouting',
        label: '🔍 Scouting',
        desc: 'Neutral scouting mode — neither team is "yours". Chart any game from the stands.',
    },
];

const STEP_LABELS = ['Teams & Mode', 'Game Details', 'Confirm'];

function getStepStatus(stepIndex: number, currentStep: number): 'completed' | 'active' | 'pending' {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'active';
    return 'pending';
}

const GameSetup: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { user } = useAppSelector((state) => state.auth);
    const { teamList: allTeams, loading } = useAppSelector((state) => state.teams);
    const userTeams = allTeams.filter((team) => team.owner_id === user?.id);

    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [opponents, setOpponents] = useState<OpponentTeam[]>([]);
    const [opponentTeamId, setOpponentTeamId] = useState<string>('');

    const [formData, setFormData] = useState({
        home_team_id: '',
        opponent_name: '',
        scouting_home_team: '',
        is_home_game: true,
        lineup_size: 9,
        charting_mode: 'our_pitcher' as ChartingMode,
        scouting_focus: 'both' as ScoutingFocus,
        game_date: new Date().toISOString().split('T')[0],
        game_time: '18:00',
        location: '',
    });

    const isScoutingMode = formData.charting_mode === 'scouting';

    useEffect(() => {
        dispatch(fetchAllTeams());
    }, [dispatch]);

    useEffect(() => {
        if (userTeams.length === 1 && !formData.home_team_id) {
            setFormData((prev) => ({ ...prev, home_team_id: userTeams[0].id }));
        }
    }, [userTeams, formData.home_team_id]);

    useEffect(() => {
        if (!formData.home_team_id) {
            setOpponents([]);
            return;
        }
        opponentTeamService
            .list(formData.home_team_id)
            .then(setOpponents)
            .catch(() => {});
    }, [formData.home_team_id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (e.target.name === 'opponent_name') setOpponentTeamId('');
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSelectKnownOpponent = (opponent: OpponentTeam) => {
        setOpponentTeamId(opponent.id);
        setFormData((prev) => ({ ...prev, opponent_name: opponent.name }));
        setError('');
    };

    // ─── Step validation ───────────────────────────────────────────────────────

    const step0Valid = (): boolean => {
        if (!formData.home_team_id) return false;
        if (isScoutingMode) return !!formData.opponent_name.trim() && !!formData.scouting_home_team.trim();
        return !!formData.opponent_name.trim();
    };

    // ─── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const game_dateTime = new Date(`${formData.game_date}T${formData.game_time}`);
            const newGame = await dispatch(
                createGame({
                    home_team_id: formData.home_team_id,
                    opponent_name: formData.opponent_name.trim() || undefined,
                    scouting_home_team: isScoutingMode ? formData.scouting_home_team.trim() : undefined,
                    is_home_game: formData.is_home_game,
                    lineup_size: formData.lineup_size,
                    charting_mode: formData.charting_mode,
                    scouting_focus: isScoutingMode ? formData.scouting_focus : undefined,
                    game_date: game_dateTime.toISOString(),
                    location: formData.location.trim() || undefined,
                    opponent_team_id: opponentTeamId || undefined,
                } as Parameters<typeof createGame>[0])
            ).unwrap();

            if (!newGame?.id) throw new Error('Failed to create game');

            if (isScoutingMode && formData.scouting_focus === 'both') {
                navigate(`/game/${newGame.id}/scouting-lineup`);
            } else if (isScoutingMode) {
                navigate(`/game/${newGame.id}`);
            } else {
                navigate(`/game/${newGame.id}/my-lineup`);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create game');
        } finally {
            setSubmitting(false);
        }
    };

    const getTeamName = (team_id: string) => {
        const team = userTeams.find((t) => t.id === team_id);
        return team ? `${team.city ? team.city + ' ' : ''}${team.name}` : '';
    };

    const chartingModeLabel = CHARTING_MODES.find((m) => m.value === formData.charting_mode)?.label ?? '';

    const gameDateTime = new Date(`${formData.game_date}T${formData.game_time}`);
    const formattedDateTime = gameDateTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    if (loading)
        return (
            <Container>
                <LoadingText>Loading teams...</LoadingText>
            </Container>
        );

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => (step > 0 ? setStep(step - 1) : navigate('/'))}>← Back</BackButton>
                    <Title>New Game</Title>
                </HeaderLeft>
            </Header>

            <Content>
                {userTeams.length === 0 ? (
                    <WarningCard>
                        <WarningIcon>⚾</WarningIcon>
                        <WarningTitle>No Teams Found</WarningTitle>
                        <WarningText>You need to create a team before you can start a game.</WarningText>
                        <CreateTeamButton onClick={() => navigate('/teams/new')}>Create Team</CreateTeamButton>
                    </WarningCard>
                ) : (
                    <>
                        {/* ── Step Progress Indicator ── */}
                        <StepperContainer>
                            {STEP_LABELS.map((label, i) => (
                                <React.Fragment key={label}>
                                    <StepItem>
                                        <StepDot status={getStepStatus(i, step)}>{i < step ? '✓' : i + 1}</StepDot>
                                        <StepLabel active={i === step}>{label}</StepLabel>
                                    </StepItem>
                                    {i < STEP_LABELS.length - 1 && <StepConnector completed={i < step} />}
                                </React.Fragment>
                            ))}
                        </StepperContainer>

                        <FormCard>
                            {error && <ErrorMessage>{error}</ErrorMessage>}

                            <Form onSubmit={handleSubmit}>
                                {/* ══════════════════════════════════════════════
                                    STEP 0 — Teams & Charting Mode
                                ═══════════════════════════════════════════════ */}
                                {step === 0 && (
                                    <TeamSelectionSection>
                                        <SectionTitle>Who are you playing?</SectionTitle>

                                        {/* Charting mode */}
                                        <Label>Charting Mode</Label>
                                        <ModeGrid>
                                            {CHARTING_MODES.map((mode) => (
                                                <ModeCard
                                                    key={mode.value}
                                                    type="button"
                                                    active={formData.charting_mode === mode.value}
                                                    onClick={() => setFormData((prev) => ({ ...prev, charting_mode: mode.value }))}
                                                >
                                                    <ModeCardTitle active={formData.charting_mode === mode.value}>
                                                        {mode.label}
                                                    </ModeCardTitle>
                                                    <ModeCardDesc>{mode.desc}</ModeCardDesc>
                                                </ModeCard>
                                            ))}
                                        </ModeGrid>

                                        {/* Scouting sub-options */}
                                        {isScoutingMode && (
                                            <>
                                                <Label style={{ marginTop: 20, marginBottom: 4, display: 'block' }}>
                                                    Scout Which Team
                                                </Label>
                                                <HomeAwayToggle>
                                                    {(['both', 'away', 'home'] as ScoutingFocus[]).map((focus) => (
                                                        <ToggleOption
                                                            key={focus}
                                                            type="button"
                                                            active={formData.scouting_focus === focus}
                                                            onClick={() =>
                                                                setFormData((prev) => ({ ...prev, scouting_focus: focus }))
                                                            }
                                                        >
                                                            {focus === 'both'
                                                                ? 'Both Teams'
                                                                : focus === 'away'
                                                                  ? 'Away Pitcher'
                                                                  : 'Home Pitcher'}
                                                        </ToggleOption>
                                                    ))}
                                                </HomeAwayToggle>
                                            </>
                                        )}

                                        {/* Team name inputs */}
                                        <div style={{ marginTop: 20 }}>
                                            {isScoutingMode ? (
                                                <TeamsRow>
                                                    <TeamSelectGroup>
                                                        <Label>Away Team</Label>
                                                        <Input
                                                            type="text"
                                                            name="opponent_name"
                                                            value={formData.opponent_name}
                                                            onChange={handleChange}
                                                            placeholder="Away team name…"
                                                        />
                                                    </TeamSelectGroup>
                                                    <VsText>@</VsText>
                                                    <TeamSelectGroup>
                                                        <Label>Home Team</Label>
                                                        <Input
                                                            type="text"
                                                            name="scouting_home_team"
                                                            value={formData.scouting_home_team}
                                                            onChange={handleChange}
                                                            placeholder="Home team name…"
                                                        />
                                                    </TeamSelectGroup>
                                                </TeamsRow>
                                            ) : (
                                                <TeamsRow>
                                                    <TeamSelectGroup>
                                                        <Label>Opponent</Label>
                                                        <Input
                                                            type="text"
                                                            name="opponent_name"
                                                            value={formData.opponent_name}
                                                            onChange={handleChange}
                                                            placeholder="Enter opponent name…"
                                                            list="known-opponents-list"
                                                        />
                                                        {opponents.length > 0 && (
                                                            <datalist id="known-opponents-list">
                                                                {opponents.map((opp) => (
                                                                    <option key={opp.id} value={opp.name} />
                                                                ))}
                                                            </datalist>
                                                        )}
                                                        {opponents.length > 0 && (
                                                            <div
                                                                style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}
                                                            >
                                                                {opponents.map((opp) => (
                                                                    <button
                                                                        key={opp.id}
                                                                        type="button"
                                                                        onClick={() => handleSelectKnownOpponent(opp)}
                                                                        style={{
                                                                            padding: '3px 10px',
                                                                            borderRadius: 12,
                                                                            border: `1px solid ${opponentTeamId === opp.id ? '#2563eb' : '#ccc'}`,
                                                                            background:
                                                                                opponentTeamId === opp.id ? '#eff6ff' : '#f5f5f5',
                                                                            color: opponentTeamId === opp.id ? '#1d4ed8' : '#444',
                                                                            cursor: 'pointer',
                                                                            fontSize: 12,
                                                                            fontWeight: opponentTeamId === opp.id ? 600 : 400,
                                                                        }}
                                                                    >
                                                                        {opp.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {formData.opponent_name && (
                                                            <SelectedTeamPreview>
                                                                <TeamBadge>{formData.opponent_name}</TeamBadge>
                                                            </SelectedTeamPreview>
                                                        )}
                                                    </TeamSelectGroup>

                                                    <VsText>@</VsText>

                                                    <TeamSelectGroup>
                                                        <Label>Your Team</Label>
                                                        {userTeams.length === 1 ? (
                                                            <>
                                                                <Input type="text" value={getTeamName(userTeams[0].id)} disabled />
                                                                <SelectedTeamPreview>
                                                                    <TeamBadge isHome>{getTeamName(userTeams[0].id)}</TeamBadge>
                                                                </SelectedTeamPreview>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <TeamSelect
                                                                    name="home_team_id"
                                                                    value={formData.home_team_id}
                                                                    onChange={handleChange}
                                                                >
                                                                    <option value="">Select your team…</option>
                                                                    {userTeams.map((team) => (
                                                                        <option key={team.id} value={team.id}>
                                                                            {team.city ? `${team.city} ` : ''}
                                                                            {team.name}
                                                                        </option>
                                                                    ))}
                                                                </TeamSelect>
                                                                {formData.home_team_id && (
                                                                    <SelectedTeamPreview>
                                                                        <TeamBadge isHome>
                                                                            {getTeamName(formData.home_team_id)}
                                                                        </TeamBadge>
                                                                    </SelectedTeamPreview>
                                                                )}
                                                            </>
                                                        )}
                                                    </TeamSelectGroup>
                                                </TeamsRow>
                                            )}
                                        </div>

                                        {/* Your team (scouting mode) */}
                                        {isScoutingMode && (
                                            <FormGroup style={{ marginTop: 16 }}>
                                                <Label>Your Team (for this session)</Label>
                                                {userTeams.length === 1 ? (
                                                    <Input type="text" value={getTeamName(userTeams[0].id)} disabled />
                                                ) : (
                                                    <TeamSelect
                                                        name="home_team_id"
                                                        value={formData.home_team_id}
                                                        onChange={handleChange}
                                                    >
                                                        <option value="">Select your team…</option>
                                                        {userTeams.map((team) => (
                                                            <option key={team.id} value={team.id}>
                                                                {team.city ? `${team.city} ` : ''}
                                                                {team.name}
                                                            </option>
                                                        ))}
                                                    </TeamSelect>
                                                )}
                                            </FormGroup>
                                        )}

                                        {/* Home / Away (non-scouting) */}
                                        {!isScoutingMode && (
                                            <div style={{ marginTop: 16 }}>
                                                <Label style={{ display: 'block', marginBottom: 4 }}>Your team is playing:</Label>
                                                <HomeAwayToggle>
                                                    <ToggleOption
                                                        type="button"
                                                        active={formData.is_home_game}
                                                        onClick={() => setFormData((prev) => ({ ...prev, is_home_game: true }))}
                                                    >
                                                        Home
                                                    </ToggleOption>
                                                    <ToggleOption
                                                        type="button"
                                                        active={!formData.is_home_game}
                                                        onClick={() => setFormData((prev) => ({ ...prev, is_home_game: false }))}
                                                    >
                                                        Away
                                                    </ToggleOption>
                                                </HomeAwayToggle>
                                            </div>
                                        )}
                                    </TeamSelectionSection>
                                )}

                                {/* ══════════════════════════════════════════════
                                    STEP 1 — Game Details
                                ═══════════════════════════════════════════════ */}
                                {step === 1 && (
                                    <GameDetailsSection>
                                        <div>
                                            <SectionTitle>Game Details</SectionTitle>
                                            <SectionSubtitle>When and where is this game?</SectionSubtitle>
                                        </div>

                                        <FormGroup>
                                            <Label htmlFor="lineup_size">Lineup Size</Label>
                                            <TeamSelect
                                                id="lineup_size"
                                                name="lineup_size"
                                                value={formData.lineup_size}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        lineup_size: parseInt(e.target.value, 10),
                                                    }))
                                                }
                                            >
                                                <option value={9}>9 — Standard</option>
                                                <option value={10}>10 — Extra Hitter (EH)</option>
                                                <option value={11}>11</option>
                                                <option value={12}>12</option>
                                            </TeamSelect>
                                        </FormGroup>

                                        <FormRow>
                                            <FormGroup>
                                                <Label htmlFor="game_date">Date</Label>
                                                <Input
                                                    type="date"
                                                    id="game_date"
                                                    name="game_date"
                                                    value={formData.game_date}
                                                    onChange={handleChange}
                                                />
                                            </FormGroup>
                                            <FormGroup>
                                                <Label htmlFor="game_time">Time</Label>
                                                <Input
                                                    type="time"
                                                    id="game_time"
                                                    name="game_time"
                                                    value={formData.game_time}
                                                    onChange={handleChange}
                                                />
                                            </FormGroup>
                                        </FormRow>

                                        <FormGroup>
                                            <Label htmlFor="location">Location (optional)</Label>
                                            <Input
                                                type="text"
                                                id="location"
                                                name="location"
                                                value={formData.location}
                                                onChange={handleChange}
                                                placeholder="e.g., Main Field, Stadium Name"
                                            />
                                        </FormGroup>
                                    </GameDetailsSection>
                                )}

                                {/* ══════════════════════════════════════════════
                                    STEP 2 — Preview & Confirm
                                ═══════════════════════════════════════════════ */}
                                {step === 2 && (
                                    <div>
                                        <SectionTitle>Ready to go?</SectionTitle>
                                        <SectionSubtitle>Review your game details before starting.</SectionSubtitle>

                                        <GamePreview>
                                            <PreviewTitle>Game Preview</PreviewTitle>
                                            <PreviewMatchup>
                                                {isScoutingMode ? (
                                                    <>
                                                        <PreviewTeam>{formData.opponent_name || 'Away Team'}</PreviewTeam>
                                                        <PreviewAt>@</PreviewAt>
                                                        <PreviewTeam>{formData.scouting_home_team || 'Home Team'}</PreviewTeam>
                                                    </>
                                                ) : formData.is_home_game ? (
                                                    <>
                                                        <PreviewTeam>{formData.opponent_name}</PreviewTeam>
                                                        <PreviewAt>@</PreviewAt>
                                                        <PreviewTeam>{getTeamName(formData.home_team_id)}</PreviewTeam>
                                                    </>
                                                ) : (
                                                    <>
                                                        <PreviewTeam>{getTeamName(formData.home_team_id)}</PreviewTeam>
                                                        <PreviewAt>@</PreviewAt>
                                                        <PreviewTeam>{formData.opponent_name}</PreviewTeam>
                                                    </>
                                                )}
                                            </PreviewMatchup>
                                            <PreviewDetails>
                                                {formattedDateTime}
                                                {formData.location && ` · ${formData.location}`}
                                            </PreviewDetails>
                                            <PreviewBadge>{chartingModeLabel}</PreviewBadge>

                                            <ConfirmDetailsList>
                                                <ConfirmDetailRow>
                                                    <ConfirmDetailKey>Lineup size</ConfirmDetailKey>
                                                    <ConfirmDetailValue>{formData.lineup_size} batters</ConfirmDetailValue>
                                                </ConfirmDetailRow>
                                                {!isScoutingMode && (
                                                    <ConfirmDetailRow>
                                                        <ConfirmDetailKey>Your team</ConfirmDetailKey>
                                                        <ConfirmDetailValue>
                                                            {formData.is_home_game ? 'Home' : 'Away'}
                                                        </ConfirmDetailValue>
                                                    </ConfirmDetailRow>
                                                )}
                                                {isScoutingMode && (
                                                    <ConfirmDetailRow>
                                                        <ConfirmDetailKey>Scouting focus</ConfirmDetailKey>
                                                        <ConfirmDetailValue>
                                                            {formData.scouting_focus === 'both'
                                                                ? 'Both teams'
                                                                : formData.scouting_focus === 'away'
                                                                  ? 'Away pitcher'
                                                                  : 'Home pitcher'}
                                                        </ConfirmDetailValue>
                                                    </ConfirmDetailRow>
                                                )}
                                                <ConfirmDetailRow>
                                                    <ConfirmDetailKey>Charting mode</ConfirmDetailKey>
                                                    <ConfirmDetailValue>{chartingModeLabel}</ConfirmDetailValue>
                                                </ConfirmDetailRow>
                                            </ConfirmDetailsList>
                                        </GamePreview>
                                    </div>
                                )}

                                {/* ─── Navigation ─────────────────────────────── */}
                                <FormActions>
                                    {step === 0 ? (
                                        <CancelButton type="button" onClick={() => navigate('/')}>
                                            Cancel
                                        </CancelButton>
                                    ) : (
                                        <CancelButton type="button" onClick={() => setStep(step - 1)}>
                                            ← Back
                                        </CancelButton>
                                    )}

                                    {step < 2 ? (
                                        <NextButton
                                            type="button"
                                            disabled={step === 0 && !step0Valid()}
                                            onClick={() => setStep(step + 1)}
                                        >
                                            Next →
                                        </NextButton>
                                    ) : (
                                        <SubmitButton type="submit" disabled={submitting}>
                                            {submitting ? 'Creating…' : isScoutingMode ? '🔍 Start Scouting' : '⚾ Start Game'}
                                        </SubmitButton>
                                    )}
                                </FormActions>
                            </Form>
                        </FormCard>
                    </>
                )}
            </Content>
        </Container>
    );
};

export default GameSetup;
