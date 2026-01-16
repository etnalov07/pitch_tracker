import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, fetchAllTeams, createTeam, deleteTeam, clearTeamsError } from '../../state';
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

const Teams: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { teamList: teams, loading, error: stateError } = useAppSelector((state) => state.teams);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        abbreviation: '',
        city: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');

    const error = localError || stateError;

    useEffect(() => {
        dispatch(fetchAllTeams());
    }, [dispatch]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                })
            ).unwrap();
            setFormData({ name: '', abbreviation: '', city: '' });
            setShowCreateForm(false);
        } catch (err: any) {
            setLocalError(err || 'Failed to create team');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (teamId: string, teamName: string) => {
        if (!window.confirm(`Are you sure you want to delete "${teamName}"? This cannot be undone.`)) {
            return;
        }

        try {
            await dispatch(deleteTeam(teamId)).unwrap();
        } catch (err: any) {
            alert(err || 'Failed to delete team');
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

                            <FormActions>
                                <CancelButton
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setFormData({ name: '', abbreviation: '', city: '' });
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
