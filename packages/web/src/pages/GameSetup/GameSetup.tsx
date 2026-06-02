import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { opponentTeamService } from '../../services/opponentTeamService';
import { useAppDispatch, useAppSelector, fetchAllTeams, createGame } from '../../state';
import { gamesApi } from '../../state/games/api/gamesApi';
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
    SectionTitle,
    TeamsRow,
    TeamSelectGroup,
    VsText,
    Label,
    TeamSelect,
    SelectedTeamPreview,
    TeamBadge,
    FormGroup,
    Input,
    FormActions,
    CancelButton,
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
    ModeGrid,
    ModeCard,
    ModeCardTitle,
    ModeCardDesc,
    ChipRow,
    Chip,
} from './styles';

type ChartingMode = 'our_pitcher' | 'opp_pitcher' | 'both' | 'scouting' | 'scrimmage';
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
    {
        value: 'scrimmage',
        label: 'Scrimmage',
        desc: 'Intrasquad / practice game — no fixed innings, no score, manual end-half. Charts our pitcher only.',
    },
];

const LINEUP_SIZE_OPTIONS: { value: number; label: string }[] = [
    { value: 9, label: '9' },
    { value: 10, label: '10 (EH)' },
    { value: 11, label: '11' },
    { value: 12, label: '12' },
];

const INNINGS_OPTIONS = [5, 6, 7, 9];

const GameSetup: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { user } = useAppSelector((state) => state.auth);
    const { teamList: allTeams, loading } = useAppSelector((state) => state.teams);
    const userTeams = allTeams.filter((team) => team.owner_id === user?.id);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [opponents, setOpponents] = useState<OpponentTeam[]>([]);
    const [opponentTeamId, setOpponentTeamId] = useState<string>('');
    const [recentLocations, setRecentLocations] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        home_team_id: '',
        opponent_name: '',
        scouting_home_team: '',
        is_home_game: true,
        lineup_size: 9,
        total_innings: 7,
        charting_mode: 'our_pitcher' as ChartingMode,
        scouting_focus: 'both' as ScoutingFocus,
        game_date: new Date().toISOString().split('T')[0],
        game_time: '18:00',
        location: '',
        // Pitch-rules. For travel teams the coach picks 'PG' / 'PBR' / 'NONE'.
        // HS teams get 'HS' automatically by the API; college gets 'NONE'.
        sanction: '' as '' | 'PG' | 'PBR' | 'HS' | 'NONE',
        // Inherited from team on submit if blank; the form shows the team default as a hint.
        age_division: '' as '' | '8U' | '10U' | '12U' | '14U' | '16U' | '18U',
    });

    const isScoutingMode = formData.charting_mode === 'scouting';
    const isScrimmageMode = formData.charting_mode === 'scrimmage';

    // Pitch-rules UI is driven by the home team's team_type:
    //   high_school  → game gets sanction=HS automatically (no dropdown, inline note)
    //   travel/club  → show sanction dropdown (PG / PBR / Other); inherit age_division
    //   college      → no rules UI (sanction stays NONE)
    const homeTeam = userTeams.find((t) => t.id === formData.home_team_id);
    const teamType = homeTeam?.team_type;
    const teamAgeDivision = homeTeam?.age_division ?? null;
    const showSanctionDropdown = teamType === 'travel' || teamType === 'club';
    const showHsNote = teamType === 'high_school';
    const effectiveSanction = formData.sanction || (teamType === 'high_school' ? 'HS' : 'NONE');
    const sanctionUsesAge = effectiveSanction === 'PG' || effectiveSanction === 'PBR';

    useEffect(() => {
        dispatch(fetchAllTeams());
    }, [dispatch]);

    // Auto-select sole team (parity with mobile).
    useEffect(() => {
        if (userTeams.length === 1 && !formData.home_team_id) {
            setFormData((prev) => ({ ...prev, home_team_id: userTeams[0].id }));
        }
    }, [userTeams, formData.home_team_id]);

    // Auto-set innings by team_type (parity with mobile app/game/new.tsx:62-71).
    useEffect(() => {
        if (!formData.home_team_id) return;
        const team = userTeams.find((t) => t.id === formData.home_team_id);
        setFormData((prev) => ({
            ...prev,
            total_innings: team?.team_type === 'college' ? 9 : 7,
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.home_team_id]);

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

    // UX-NG-13: top 5 unique recent locations for this team — tap chip to fill.
    useEffect(() => {
        if (!formData.home_team_id) {
            setRecentLocations([]);
            return;
        }
        gamesApi
            .getGamesByTeam(formData.home_team_id)
            .then((games) => {
                const seen = new Set<string>();
                const out: string[] = [];
                for (const g of games) {
                    const loc = (g.location ?? '').trim();
                    if (!loc || seen.has(loc)) continue;
                    seen.add(loc);
                    out.push(loc);
                    if (out.length >= 5) break;
                }
                setRecentLocations(out);
            })
            .catch(() => setRecentLocations([]));
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

    const isValid = (): boolean => {
        if (!formData.home_team_id) return false;
        if (isScoutingMode) return !!formData.opponent_name.trim() && !!formData.scouting_home_team.trim();
        if (isScrimmageMode) return true;
        return !!formData.opponent_name.trim();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const game_dateTime = new Date(`${formData.game_date}T${formData.game_time}`);
            // Scrimmage defaults: opponent_name -> "Scrimmage" if blank,
            // is_home_game forced true so deriveGameMode -> 'our_pitcher' every inning.
            const resolvedOpponentName = isScrimmageMode
                ? formData.opponent_name.trim() || 'Scrimmage'
                : formData.opponent_name.trim() || undefined;
            const resolvedIsHomeGame = isScrimmageMode ? true : formData.is_home_game;
            const newGame = await dispatch(
                createGame({
                    home_team_id: formData.home_team_id,
                    opponent_name: resolvedOpponentName,
                    scouting_home_team: isScoutingMode ? formData.scouting_home_team.trim() : undefined,
                    is_home_game: resolvedIsHomeGame,
                    lineup_size: formData.lineup_size,
                    total_innings: formData.total_innings,
                    charting_mode: formData.charting_mode,
                    scouting_focus: isScoutingMode ? formData.scouting_focus : undefined,
                    game_date: game_dateTime.toISOString(),
                    location: formData.location.trim() || undefined,
                    opponent_team_id: opponentTeamId || undefined,
                    sanction: formData.sanction || undefined,
                    age_division: formData.age_division || undefined,
                } as Parameters<typeof createGame>[0])
            ).unwrap();

            if (!newGame?.id) throw new Error('Failed to create game');

            if (isScoutingMode && formData.scouting_focus === 'both') {
                navigate(`/game/${newGame.id}/scouting-lineup`);
            } else if (isScoutingMode || isScrimmageMode) {
                // Scrimmage skips my-lineup — coach picks a pitcher from the modal in live.
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
                    <BackButton onClick={() => navigate('/')}>← Back</BackButton>
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
                    <FormCard>
                        {error && <ErrorMessage>{error}</ErrorMessage>}

                        <Form onSubmit={handleSubmit}>
                            <TeamSelectionSection>
                                <SectionTitle>Who are you playing?</SectionTitle>

                                {/* Charting mode — descriptive cards */}
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

                                {/* Scouting focus (conditional) */}
                                {isScoutingMode && (
                                    <>
                                        <Label style={{ marginTop: 20, marginBottom: 4, display: 'block' }}>Scout Which Team</Label>
                                        <HomeAwayToggle>
                                            {(['both', 'away', 'home'] as ScoutingFocus[]).map((focus) => (
                                                <ToggleOption
                                                    key={focus}
                                                    type="button"
                                                    active={formData.scouting_focus === focus}
                                                    onClick={() => setFormData((prev) => ({ ...prev, scouting_focus: focus }))}
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

                                {/* Team names + your-team */}
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
                                                    placeholder={
                                                        isScrimmageMode
                                                            ? 'e.g., Red squad (defaults to "Scrimmage")'
                                                            : 'Enter opponent name…'
                                                    }
                                                />
                                                {opponents.length > 0 && (
                                                    <ChipRow>
                                                        {opponents.map((opp) => (
                                                            <Chip
                                                                key={opp.id}
                                                                type="button"
                                                                active={opponentTeamId === opp.id}
                                                                onClick={() => handleSelectKnownOpponent(opp)}
                                                            >
                                                                {opp.name}
                                                            </Chip>
                                                        ))}
                                                    </ChipRow>
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
                                                                <TeamBadge isHome>{getTeamName(formData.home_team_id)}</TeamBadge>
                                                            </SelectedTeamPreview>
                                                        )}
                                                    </>
                                                )}
                                            </TeamSelectGroup>
                                        </TeamsRow>
                                    )}
                                </div>

                                {/* Your team (scouting mode only — non-scouting has it in the TeamsRow above) */}
                                {isScoutingMode && (
                                    <FormGroup style={{ marginTop: 16 }}>
                                        <Label>Your Team (for this session)</Label>
                                        {userTeams.length === 1 ? (
                                            <Input type="text" value={getTeamName(userTeams[0].id)} disabled />
                                        ) : (
                                            <TeamSelect name="home_team_id" value={formData.home_team_id} onChange={handleChange}>
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

                                {/* Home / Away (non-scouting, non-scrimmage) */}
                                {!isScoutingMode && !isScrimmageMode && (
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

                            {/* Lineup Size — segmented chips (UX-NG-07) */}
                            <FormGroup>
                                <Label>Lineup Size</Label>
                                <ChipRow>
                                    {LINEUP_SIZE_OPTIONS.map((opt) => (
                                        <Chip
                                            key={opt.value}
                                            type="button"
                                            active={formData.lineup_size === opt.value}
                                            onClick={() => setFormData((prev) => ({ ...prev, lineup_size: opt.value }))}
                                        >
                                            {opt.label}
                                        </Chip>
                                    ))}
                                </ChipRow>
                            </FormGroup>

                            {/* Total Innings — hidden in scrimmage (no inning cap, ends via End Game button) */}
                            {!isScrimmageMode && (
                                <FormGroup>
                                    <Label>Innings</Label>
                                    <ChipRow>
                                        {INNINGS_OPTIONS.map((n) => (
                                            <Chip
                                                key={n}
                                                type="button"
                                                active={formData.total_innings === n}
                                                onClick={() => setFormData((prev) => ({ ...prev, total_innings: n }))}
                                            >
                                                {n}
                                            </Chip>
                                        ))}
                                    </ChipRow>
                                </FormGroup>
                            )}

                            {/* Pitch-rules sanction — drives the in-game eligibility engine. */}
                            {showHsNote && (
                                <FormGroup>
                                    <Label>Pitch Rules</Label>
                                    <div style={{ fontSize: 14, color: '#555' }}>
                                        High School game — NFHS 110-pitch limit per pitcher (with batter-finish grace).
                                    </div>
                                </FormGroup>
                            )}
                            {showSanctionDropdown && (
                                <FormGroup>
                                    <Label htmlFor="sanction">Pitch Rules (sanction)</Label>
                                    <TeamSelect id="sanction" name="sanction" value={formData.sanction} onChange={handleChange}>
                                        <option value="">Other / no tournament rules</option>
                                        <option value="PG">Perfect Game (PG)</option>
                                        <option value="PBR">PBR (Prep Baseball Report)</option>
                                    </TeamSelect>
                                </FormGroup>
                            )}
                            {showSanctionDropdown && sanctionUsesAge && (
                                <FormGroup>
                                    <Label htmlFor="age_division">Age Division</Label>
                                    <TeamSelect
                                        id="age_division"
                                        name="age_division"
                                        value={formData.age_division}
                                        onChange={handleChange}
                                    >
                                        <option value="">
                                            {teamAgeDivision ? `Inherit from team (${teamAgeDivision})` : 'Not specified'}
                                        </option>
                                        <option value="8U">8U</option>
                                        <option value="10U">10U</option>
                                        <option value="12U">12U</option>
                                        <option value="14U">14U</option>
                                        <option value="16U">16U</option>
                                        <option value="18U">18U</option>
                                    </TeamSelect>
                                </FormGroup>
                            )}

                            {/* Date + Time */}
                            <FormGroup>
                                <Label htmlFor="game_date">Date & Time</Label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <Input
                                        type="date"
                                        id="game_date"
                                        name="game_date"
                                        value={formData.game_date}
                                        onChange={handleChange}
                                    />
                                    <Input
                                        type="time"
                                        id="game_time"
                                        name="game_time"
                                        value={formData.game_time}
                                        onChange={handleChange}
                                    />
                                </div>
                            </FormGroup>

                            {/* Location */}
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
                                {recentLocations.length > 0 && (
                                    <ChipRow>
                                        {recentLocations.map((loc) => (
                                            <Chip
                                                key={loc}
                                                type="button"
                                                active={formData.location === loc}
                                                onClick={() => setFormData((prev) => ({ ...prev, location: loc }))}
                                            >
                                                {loc}
                                            </Chip>
                                        ))}
                                    </ChipRow>
                                )}
                            </FormGroup>

                            {/* Actions */}
                            <FormActions>
                                <CancelButton type="button" onClick={() => navigate('/')}>
                                    Cancel
                                </CancelButton>
                                <SubmitButton type="submit" disabled={submitting || !isValid()}>
                                    {submitting
                                        ? 'Creating…'
                                        : isScoutingMode
                                          ? '🔍 Start Scouting'
                                          : isScrimmageMode
                                            ? '⚾ Start Scrimmage'
                                            : '⚾ Start Game'}
                                </SubmitButton>
                            </FormActions>
                        </Form>
                    </FormCard>
                )}
            </Content>
        </Container>
    );
};

export default GameSetup;
