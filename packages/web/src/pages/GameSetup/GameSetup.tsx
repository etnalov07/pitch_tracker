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
} from './styles';

const GameSetup: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { teamList: teams, loading } = useAppSelector((state) => state.teams);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        home_team_id: '',
        away_team_id: '',
        game_date: new Date().toISOString().split('T')[0],
        game_time: '18:00',
        location: '',
    });

    useEffect(() => {
        dispatch(fetchAllTeams());
    }, [dispatch]);

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
            setError('Please select a home team');
            return;
        }
        if (!formData.away_team_id) {
            setError('Please select an away team');
            return;
        }
        if (formData.home_team_id === formData.away_team_id) {
            setError('Home and away teams must be different');
            return;
        }

        try {
            setSubmitting(true);
            const game_dateTime = new Date(`${formData.game_date}T${formData.game_time}`);

            const newGame = await dispatch(
                createGame({
                    home_team_id: formData.home_team_id,
                    away_team_id: formData.away_team_id,
                    game_date: game_dateTime.toISOString(),
                    location: formData.location.trim() || undefined,
                })
            ).unwrap();

            navigate(`/game/${newGame.id}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create game');
        } finally {
            setSubmitting(false);
        }
    };

    const getTeamName = (team_id: string) => {
        const team = teams.find((t) => t.id === team_id);
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
                {teams.length < 2 ? (
                    <WarningCard>
                        <WarningIcon>&#9888;</WarningIcon>
                        <WarningTitle>Not Enough Teams</WarningTitle>
                        <WarningText>
                            You need at least 2 teams to create a game. You currently have {teams.length} team
                            {teams.length !== 1 ? 's' : ''}.
                        </WarningText>
                        <CreateTeamButton onClick={() => navigate('/teams')}>Manage Teams</CreateTeamButton>
                    </WarningCard>
                ) : (
                    <FormCard>
                        {error && <ErrorMessage>{error}</ErrorMessage>}

                        <Form onSubmit={handleSubmit}>
                            <TeamSelectionSection>
                                <SectionTitle>Select Teams</SectionTitle>

                                <TeamsRow>
                                    <TeamSelectGroup>
                                        <Label>Away Team</Label>
                                        <TeamSelect name="away_team_id" value={formData.away_team_id} onChange={handleChange}>
                                            <option value="">Select away team...</option>
                                            {teams
                                                .filter((t) => t.id !== formData.home_team_id)
                                                .map((team) => (
                                                    <option key={team.id} value={team.id}>
                                                        {team.city ? `${team.city} ` : ''}
                                                        {team.name}
                                                    </option>
                                                ))}
                                        </TeamSelect>
                                        {formData.away_team_id && (
                                            <SelectedTeamPreview>
                                                <TeamBadge>{getTeamName(formData.away_team_id)}</TeamBadge>
                                            </SelectedTeamPreview>
                                        )}
                                    </TeamSelectGroup>

                                    <VsText>@</VsText>

                                    <TeamSelectGroup>
                                        <Label>Home Team</Label>
                                        <TeamSelect name="home_team_id" value={formData.home_team_id} onChange={handleChange}>
                                            <option value="">Select home team...</option>
                                            {teams
                                                .filter((t) => t.id !== formData.away_team_id)
                                                .map((team) => (
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
                                    </TeamSelectGroup>
                                </TeamsRow>
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

                            {formData.home_team_id && formData.away_team_id && (
                                <GamePreview>
                                    <PreviewTitle>Game Preview</PreviewTitle>
                                    <PreviewMatchup>
                                        <PreviewTeam>{getTeamName(formData.away_team_id)}</PreviewTeam>
                                        <PreviewAt>@</PreviewAt>
                                        <PreviewTeam>{getTeamName(formData.home_team_id)}</PreviewTeam>
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
                                    disabled={submitting || !formData.home_team_id || !formData.away_team_id}
                                >
                                    {submitting ? 'Creating...' : 'Create Game'}
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
