import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, fetchAllTeams, createTeam, deleteTeam, clearTeamsError } from '../../state';
import { TeamType, TeamSeason } from '../../types';
import {
    Container,
    Header,
    HeaderLeft,
    HeaderRight,
    BackButton,
    Title,
    CreateButton,
    Content,
    FormCard,
    FormTitle,
    Form,
    FormRow,
    FormGroup,
    Label,
    Input,
    Select,
    FormActions,
    CancelButton,
    SubmitButton,
    ErrorMessage,
    TeamGrid,
    TeamCard,
    TeamCardHeader,
    TeamName,
    TeamAbbr,
    TeamCity,
    TeamMeta,
    TeamActions,
    ViewButton,
    DeleteButton,
    EmptyState,
    EmptyIcon,
    EmptyTitle,
    EmptyText,
    CreateButtonLarge,
    LoadingText,
} from './styles';

const TEAM_TYPE_LABELS: Record<string, string> = {
    high_school: 'High School',
    travel: 'Travel',
    club: 'Club',
    college: 'College',
};

const Teams: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { teamList: teams, loading, error: stateError } = useAppSelector((state) => state.teams);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        abbreviation: '',
        city: '',
        team_type: '' as TeamType | '',
        season: '' as TeamSeason | '',
        year: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');

    const error = localError || stateError;

    useEffect(() => {
        dispatch(fetchAllTeams());
    }, [dispatch]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setLocalError('');
        if (stateError) {
            dispatch(clearTeamsError());
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setLocalError('Team name is required');
            return;
        }

        try {
            setSubmitting(true);
            await dispatch(
                createTeam({
                    name: formData.name.trim(),
                    abbreviation: formData.abbreviation.trim() || undefined,
                    city: formData.city.trim() || undefined,
                    team_type: formData.team_type || undefined,
                    season: formData.season || undefined,
                    year: formData.year ? parseInt(formData.year, 10) : undefined,
                })
            ).unwrap();
            setFormData({ name: '', abbreviation: '', city: '', team_type: '', season: '', year: '' });
            setShowCreateForm(false);
        } catch (err: unknown) {
            setLocalError(err instanceof Error ? err.message : 'Failed to create team');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (team_id: string, teamName: string) => {
        if (!window.confirm(`Are you sure you want to delete "${teamName}"? This cannot be undone.`)) {
            return;
        }

        try {
            await dispatch(deleteTeam(team_id)).unwrap();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to delete team');
        }
    };

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate('/')}>Back</BackButton>
                    <Title>Teams</Title>
                </HeaderLeft>
                <HeaderRight>
                    <CreateButton onClick={() => setShowCreateForm(true)}>+ New Team</CreateButton>
                </HeaderRight>
            </Header>

            <Content>
                {showCreateForm && (
                    <FormCard>
                        <FormTitle>Create New Team</FormTitle>
                        {error && <ErrorMessage>{error}</ErrorMessage>}
                        <Form onSubmit={handleSubmit}>
                            <FormGroup>
                                <Label htmlFor="name">Team Name *</Label>
                                <Input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g., Yankees"
                                    autoFocus
                                />
                            </FormGroup>

                            <FormRow>
                                <FormGroup>
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        type="text"
                                        id="city"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="e.g., New York"
                                    />
                                </FormGroup>

                                <FormGroup>
                                    <Label htmlFor="abbreviation">Abbreviation</Label>
                                    <Input
                                        type="text"
                                        id="abbreviation"
                                        name="abbreviation"
                                        value={formData.abbreviation}
                                        onChange={handleChange}
                                        placeholder="e.g., NYY"
                                        maxLength={5}
                                    />
                                </FormGroup>
                            </FormRow>

                            <FormGroup>
                                <Label htmlFor="team_type">Team Type</Label>
                                <Select id="team_type" name="team_type" value={formData.team_type} onChange={handleChange}>
                                    <option value="">Select type...</option>
                                    <option value="high_school">High School</option>
                                    <option value="travel">Travel</option>
                                    <option value="club">Club</option>
                                    <option value="college">College</option>
                                </Select>
                            </FormGroup>

                            <FormRow>
                                <FormGroup>
                                    <Label htmlFor="season">Season</Label>
                                    <Select id="season" name="season" value={formData.season} onChange={handleChange}>
                                        <option value="">Select season...</option>
                                        <option value="Spring">Spring</option>
                                        <option value="Summer">Summer</option>
                                        <option value="Fall">Fall</option>
                                        <option value="Winter">Winter</option>
                                    </Select>
                                </FormGroup>

                                <FormGroup>
                                    <Label htmlFor="year">Year</Label>
                                    <Input
                                        type="number"
                                        id="year"
                                        name="year"
                                        value={formData.year}
                                        onChange={handleChange}
                                        placeholder={`e.g., ${new Date().getFullYear()}`}
                                        min="2000"
                                        max="2099"
                                    />
                                </FormGroup>
                            </FormRow>

                            <FormActions>
                                <CancelButton
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setFormData({ name: '', abbreviation: '', city: '', team_type: '', season: '', year: '' });
                                        setLocalError('');
                                    }}
                                >
                                    Cancel
                                </CancelButton>
                                <SubmitButton type="submit" disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Create Team'}
                                </SubmitButton>
                            </FormActions>
                        </Form>
                    </FormCard>
                )}

                {loading ? (
                    <LoadingText>Loading teams...</LoadingText>
                ) : teams.length === 0 ? (
                    <EmptyState>
                        <EmptyIcon>&#128101;</EmptyIcon>
                        <EmptyTitle>No Teams Yet</EmptyTitle>
                        <EmptyText>Create your first team to start building your roster!</EmptyText>
                        {!showCreateForm && (
                            <CreateButtonLarge onClick={() => setShowCreateForm(true)}>Create Your First Team</CreateButtonLarge>
                        )}
                    </EmptyState>
                ) : (
                    <TeamGrid>
                        {teams?.map((team) => (
                            <TeamCard key={team.id}>
                                <TeamCardHeader>
                                    <TeamName>{team.name}</TeamName>
                                    {team.abbreviation && <TeamAbbr>{team.abbreviation}</TeamAbbr>}
                                </TeamCardHeader>
                                {team.city && <TeamCity>{team.city}</TeamCity>}
                                {(team.team_type || team.season || team.year) && (
                                    <TeamMeta>
                                        {[
                                            team.team_type ? TEAM_TYPE_LABELS[team.team_type] : '',
                                            team.season && team.year ? `${team.season} ${team.year}` : team.season || (team.year ? `${team.year}` : ''),
                                        ]
                                            .filter(Boolean)
                                            .join(' \u00B7 ')}
                                    </TeamMeta>
                                )}
                                <TeamActions>
                                    <ViewButton onClick={() => navigate(`/teams/${team.id}`)}>Manage Roster</ViewButton>
                                    <DeleteButton onClick={() => handleDelete(team.id, team.name)}>Delete</DeleteButton>
                                </TeamActions>
                            </TeamCard>
                        ))}
                    </TeamGrid>
                )}
            </Content>
        </Container>
    );
};

export default Teams;
