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
        homeTeamId: '',
        awayTeamId: '',
        gameDate: new Date().toISOString().split('T')[0],
        gameTime: '18:00',
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

        if (!formData.homeTeamId) {
            setError('Please select a home team');
            return;
        }
        if (!formData.awayTeamId) {
            setError('Please select an away team');
            return;
        }
        if (formData.homeTeamId === formData.awayTeamId) {
            setError('Home and away teams must be different');
            return;
        }

        try {
            setSubmitting(true);
            const gameDateTime = new Date(`${formData.gameDate}T${formData.gameTime}`);

            const newGame = await dispatch(
                createGame({
                    homeTeamId: formData.homeTeamId,
                    awayTeamId: formData.awayTeamId,
                    gameDate: gameDateTime.toISOString(),
                    location: formData.location.trim() || undefined,
                })
            ).unwrap();

            navigate(`/game/${newGame.id}`);
        } catch (err: any) {
            setError(err || 'Failed to create game');
        } finally {
            setSubmitting(false);
        }
    };

    const getTeamName = (teamId: string) => {
        const team = teams.find((t) => t.id === teamId);
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
                                        <TeamSelect name="awayTeamId" value={formData.awayTeamId} onChange={handleChange}>
                                            <option value="">Select away team...</option>
                                            {teams
                                                .filter((t) => t.id !== formData.homeTeamId)
                                                .map((team) => (
                                                    <option key={team.id} value={team.id}>
                                                        {team.city ? `${team.city} ` : ''}
                                                        {team.name}
                                                    </option>
                                                ))}
                                        </TeamSelect>
                                        {formData.awayTeamId && (
                                            <SelectedTeamPreview>
                                                <TeamBadge>{getTeamName(formData.awayTeamId)}</TeamBadge>
                                            </SelectedTeamPreview>
                                        )}
                                    </TeamSelectGroup>

                                    <VsText>@</VsText>

                                    <TeamSelectGroup>
                                        <Label>Home Team</Label>
                                        <TeamSelect name="homeTeamId" value={formData.homeTeamId} onChange={handleChange}>
                                            <option value="">Select home team...</option>
                                            {teams
                                                .filter((t) => t.id !== formData.awayTeamId)
                                                .map((team) => (
                                                    <option key={team.id} value={team.id}>
                                                        {team.city ? `${team.city} ` : ''}
                                                        {team.name}
                                                    </option>
                                                ))}
                                        </TeamSelect>
                                        {formData.homeTeamId && (
                                            <SelectedTeamPreview>
                                                <TeamBadge isHome>{getTeamName(formData.homeTeamId)}</TeamBadge>
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
                                        <Label htmlFor="gameDate">Date</Label>
                                        <Input
                                            type="date"
                                            id="gameDate"
                                            name="gameDate"
                                            value={formData.gameDate}
                                            onChange={handleChange}
                                        />
                                    </FormGroup>

                                    <FormGroup>
                                        <Label htmlFor="gameTime">Time</Label>
                                        <Input
                                            type="time"
                                            id="gameTime"
                                            name="gameTime"
                                            value={formData.gameTime}
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

                            {formData.homeTeamId && formData.awayTeamId && (
                                <GamePreview>
                                    <PreviewTitle>Game Preview</PreviewTitle>
                                    <PreviewMatchup>
                                        <PreviewTeam>{getTeamName(formData.awayTeamId)}</PreviewTeam>
                                        <PreviewAt>@</PreviewAt>
                                        <PreviewTeam>{getTeamName(formData.homeTeamId)}</PreviewTeam>
                                    </PreviewMatchup>
                                    <PreviewDetails>
                                        {new Date(`${formData.gameDate}T${formData.gameTime}`).toLocaleDateString('en-US', {
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
                                <SubmitButton type="submit" disabled={submitting || !formData.homeTeamId || !formData.awayTeamId}>
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
