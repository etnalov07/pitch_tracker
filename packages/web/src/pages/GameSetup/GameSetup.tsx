import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, fetchAllTeams, createGame } from '../../state';
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
    TeamsRow,
    TeamSelectGroup,
    VsText,
    Label,
    TeamSelect,
    SelectedTeamPreview,
    TeamBadge,
    Divider,
    FormRow,
    FormGroup,
    Input,
    GamePreview,
    PreviewTitle,
    PreviewMatchup,
    PreviewTeam,
    PreviewAt,
    PreviewDetails,
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
} from './styles';

const GameSetup: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { user } = useAppSelector((state) => state.auth);
    const { teamList: allTeams, loading } = useAppSelector((state) => state.teams);

    // Filter to only show user's teams
    const userTeams = allTeams.filter((team) => team.owner_id === user?.id);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        home_team_id: '',
        opponent_name: '',
        is_home_game: true,
        game_date: new Date().toISOString().split('T')[0],
        game_time: '18:00',
        location: '',
    });

    useEffect(() => {
        dispatch(fetchAllTeams());
    }, [dispatch]);

    // Auto-select team if user has only one
    useEffect(() => {
        if (userTeams.length === 1 && !formData.home_team_id) {
            setFormData((prev) => ({
                ...prev,
                home_team_id: userTeams[0].id,
            }));
        }
    }, [userTeams, formData.home_team_id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.home_team_id) {
            setError('Please select your team');
            return;
        }
        if (!formData.opponent_name.trim()) {
            setError('Please enter the opponent team name');
            return;
        }

        try {
            setSubmitting(true);
            const game_dateTime = new Date(`${formData.game_date}T${formData.game_time}`);

            const newGame = await dispatch(
                createGame({
                    home_team_id: formData.home_team_id,
                    opponent_name: formData.opponent_name.trim(),
                    is_home_game: formData.is_home_game,
                    game_date: game_dateTime.toISOString(),
                    location: formData.location.trim() || undefined,
                })
            ).unwrap();

            if (!newGame || !newGame.id) {
                throw new Error('Failed to create game');
            }

            // Navigate to opponent lineup setup
            navigate(`/game/${newGame.id}/lineup`);
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

    if (loading) {
        return (
            <Container>
                <LoadingText>Loading teams...</LoadingText>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate('/')}>Back</BackButton>
                    <Title>Create New Game</Title>
                </HeaderLeft>
            </Header>

            <Content>
                {userTeams.length === 0 ? (
                    <WarningCard>
                        <WarningIcon>&#9888;</WarningIcon>
                        <WarningTitle>No Teams Found</WarningTitle>
                        <WarningText>You need to create a team before you can start a game.</WarningText>
                        <CreateTeamButton onClick={() => navigate('/teams/new')}>Create Team</CreateTeamButton>
                    </WarningCard>
                ) : (
                    <FormCard>
                        {error && <ErrorMessage>{error}</ErrorMessage>}

                        <Form onSubmit={handleSubmit}>
                            <TeamSelectionSection>
                                <SectionTitle>Teams</SectionTitle>

                                <TeamsRow>
                                    <TeamSelectGroup>
                                        <Label>Opponent</Label>
                                        <Input
                                            type="text"
                                            name="opponent_name"
                                            value={formData.opponent_name}
                                            onChange={handleChange}
                                            placeholder="Enter opponent team name..."
                                        />
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
                                                    <option value="">Select your team...</option>
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
                            </TeamSelectionSection>

                            <Divider />

                            <GameDetailsSection>
                                <SectionTitle>Game Details</SectionTitle>

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

                            {formData.home_team_id && formData.opponent_name && (
                                <GamePreview>
                                    <PreviewTitle>Game Preview</PreviewTitle>
                                    <PreviewMatchup>
                                        {formData.is_home_game ? (
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
                                        {new Date(`${formData.game_date}T${formData.game_time}`).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                        })}
                                        {formData.location && ` at ${formData.location}`}
                                    </PreviewDetails>
                                </GamePreview>
                            )}

                            <FormActions>
                                <CancelButton type="button" onClick={() => navigate('/')}>
                                    Cancel
                                </CancelButton>
                                <SubmitButton
                                    type="submit"
                                    disabled={submitting || !formData.home_team_id || !formData.opponent_name.trim()}
                                >
                                    {submitting ? 'Creating...' : 'Continue to Lineup'}
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
