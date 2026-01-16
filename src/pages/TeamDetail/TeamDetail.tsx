import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { theme } from '../../styles/theme';
import {
    useAppDispatch,
    useAppSelector,
    fetchTeamById,
    fetchTeamRoster,
    addPlayerToTeam,
    updatePlayer,
    deletePlayer,
} from '../../state';
import { Player, PlayerPosition, HandednessType } from '../../types';
import {
    Container,
    Header,
    HeaderLeft,
    HeaderRight,
    BackButton,
    TeamInfo,
    Title,
    Subtitle,
    AddButton,
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
    RosterSection,
    SectionHeader,
    SectionTitle,
    RosterTable,
    Th,
    Td,
    JerseyNumber,
    PlayerName,
    PositionBadge,
    Handedness,
    ActionButtons,
    EditButton,
    RemoveButton,
    EmptyState,
    EmptyText,
    AddButtonSmall,
    LoadingText,
    ErrorText,
    BackLink,
} from './styles';

const POSITIONS: PlayerPosition[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UTIL'];
const HANDEDNESS: HandednessType[] = ['R', 'L', 'S'];

const TeamDetail: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { teamId } = useParams<{ teamId: string }>();

    const { selectedTeam: team, roster: players, loading } = useAppSelector((state) => state.teams);

    const [showAddPlayer, setShowAddPlayer] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const initialFormData = {
        firstName: '',
        lastName: '',
        jerseyNumber: '',
        position: 'UTIL' as PlayerPosition,
        bats: 'R' as HandednessType,
        throws: 'R' as HandednessType,
    };
    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        if (teamId) {
            dispatch(fetchTeamById(teamId));
            dispatch(fetchTeamRoster(teamId));
        }
    }, [dispatch, teamId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const resetForm = () => {
        setFormData(initialFormData);
        setShowAddPlayer(false);
        setEditingPlayer(null);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            setError('First and last name are required');
            return;
        }

        try {
            setSubmitting(true);
            const playerData = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                jerseyNumber: formData.jerseyNumber ? parseInt(formData.jerseyNumber) : undefined,
                position: formData.position,
                bats: formData.bats,
                throws: formData.throws,
            };

            if (editingPlayer) {
                await dispatch(updatePlayer({ playerId: editingPlayer.id, playerData })).unwrap();
            } else {
                await dispatch(addPlayerToTeam({ teamId: teamId!, playerData })).unwrap();
            }
            resetForm();
        } catch (err: any) {
            setError(err || 'Failed to save player');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (player: Player) => {
        setEditingPlayer(player);
        setFormData({
            firstName: player.firstName,
            lastName: player.lastName,
            jerseyNumber: player.jerseyNumber?.toString() || '',
            position: player.position,
            bats: player.bats,
            throws: player.throws,
        });
        setShowAddPlayer(true);
    };

    const handleDelete = async (playerId: string, playerName: string) => {
        if (!window.confirm(`Are you sure you want to remove "${playerName}" from the roster?`)) {
            return;
        }

        try {
            await dispatch(deletePlayer(playerId)).unwrap();
        } catch (err: any) {
            alert(err || 'Failed to remove player');
        }
    };

    const getPositionColor = (position: PlayerPosition) => {
        const colors: Record<string, string> = {
            P: theme.colors.red[500],
            C: theme.colors.primary[500],
            '1B': theme.colors.green[500],
            '2B': theme.colors.green[600],
            '3B': theme.colors.green[700],
            SS: theme.colors.yellow[600],
            LF: theme.colors.primary[400],
            CF: theme.colors.primary[500],
            RF: theme.colors.primary[600],
            DH: theme.colors.gray[500],
            UTIL: theme.colors.gray[400],
        };
        return colors[position] || theme.colors.gray[500];
    };

    if (loading) {
        return (
            <Container>
                <LoadingText>Loading team...</LoadingText>
            </Container>
        );
    }

    if (!team) {
        return (
            <Container>
                <ErrorText>Team not found</ErrorText>
                <BackLink onClick={() => navigate('/teams')}>Back to Teams</BackLink>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate('/teams')}>Back to Teams</BackButton>
                    <TeamInfo>
                        <Title>{team.name}</Title>
                        {team.city && <Subtitle>{team.city}</Subtitle>}
                    </TeamInfo>
                </HeaderLeft>
                <HeaderRight>
                    {!showAddPlayer && <AddButton onClick={() => setShowAddPlayer(true)}>+ Add Player</AddButton>}
                </HeaderRight>
            </Header>

            <Content>
                {showAddPlayer && (
                    <FormCard>
                        <FormTitle>{editingPlayer ? 'Edit Player' : 'Add New Player'}</FormTitle>
                        {error && <ErrorMessage>{error}</ErrorMessage>}
                        <Form onSubmit={handleSubmit}>
                            <FormRow>
                                <FormGroup>
                                    <Label htmlFor="firstName">First Name *</Label>
                                    <Input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        placeholder="John"
                                        autoFocus
                                    />
                                </FormGroup>

                                <FormGroup>
                                    <Label htmlFor="lastName">Last Name *</Label>
                                    <Input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        placeholder="Doe"
                                    />
                                </FormGroup>
                            </FormRow>

                            <FormRow>
                                <FormGroup>
                                    <Label htmlFor="jerseyNumber">Jersey #</Label>
                                    <Input
                                        type="number"
                                        id="jerseyNumber"
                                        name="jerseyNumber"
                                        value={formData.jerseyNumber}
                                        onChange={handleChange}
                                        placeholder="25"
                                        min="0"
                                        max="99"
                                    />
                                </FormGroup>

                                <FormGroup>
                                    <Label htmlFor="position">Position</Label>
                                    <Select id="position" name="position" value={formData.position} onChange={handleChange}>
                                        {POSITIONS.map((pos) => (
                                            <option key={pos} value={pos}>
                                                {pos}
                                            </option>
                                        ))}
                                    </Select>
                                </FormGroup>
                            </FormRow>

                            <FormRow>
                                <FormGroup>
                                    <Label htmlFor="bats">Bats</Label>
                                    <Select id="bats" name="bats" value={formData.bats} onChange={handleChange}>
                                        {HANDEDNESS.map((h) => (
                                            <option key={h} value={h}>
                                                {h === 'R' ? 'Right' : h === 'L' ? 'Left' : 'Switch'}
                                            </option>
                                        ))}
                                    </Select>
                                </FormGroup>

                                <FormGroup>
                                    <Label htmlFor="throws">Throws</Label>
                                    <Select id="throws" name="throws" value={formData.throws} onChange={handleChange}>
                                        {HANDEDNESS.filter((h) => h !== 'S').map((h) => (
                                            <option key={h} value={h}>
                                                {h === 'R' ? 'Right' : 'Left'}
                                            </option>
                                        ))}
                                    </Select>
                                </FormGroup>
                            </FormRow>

                            <FormActions>
                                <CancelButton type="button" onClick={resetForm}>
                                    Cancel
                                </CancelButton>
                                <SubmitButton type="submit" disabled={submitting}>
                                    {submitting ? 'Saving...' : editingPlayer ? 'Update Player' : 'Add Player'}
                                </SubmitButton>
                            </FormActions>
                        </Form>
                    </FormCard>
                )}

                <RosterSection>
                    <SectionHeader>
                        <SectionTitle>Roster ({players.length} players)</SectionTitle>
                    </SectionHeader>

                    {players.length === 0 ? (
                        <EmptyState>
                            <EmptyText>No players on the roster yet.</EmptyText>
                            {!showAddPlayer && (
                                <AddButtonSmall onClick={() => setShowAddPlayer(true)}>Add Your First Player</AddButtonSmall>
                            )}
                        </EmptyState>
                    ) : (
                        <RosterTable>
                            <thead>
                                <tr>
                                    <Th>#</Th>
                                    <Th>Name</Th>
                                    <Th>Pos</Th>
                                    <Th>B/T</Th>
                                    <Th>Actions</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {players
                                    .sort((a, b) => (a.jerseyNumber || 99) - (b.jerseyNumber || 99))
                                    .map((player) => (
                                        <tr key={player.id}>
                                            <Td>
                                                <JerseyNumber>{player.jerseyNumber || '-'}</JerseyNumber>
                                            </Td>
                                            <Td>
                                                <PlayerName>
                                                    {player.firstName} {player.lastName}
                                                </PlayerName>
                                            </Td>
                                            <Td>
                                                <PositionBadge color={getPositionColor(player.position)}>
                                                    {player.position}
                                                </PositionBadge>
                                            </Td>
                                            <Td>
                                                <Handedness>
                                                    {player.bats}/{player.throws}
                                                </Handedness>
                                            </Td>
                                            <Td>
                                                <ActionButtons>
                                                    <EditButton onClick={() => handleEdit(player)}>Edit</EditButton>
                                                    <RemoveButton
                                                        onClick={() =>
                                                            handleDelete(player.id, `${player.firstName} ${player.lastName}`)
                                                        }
                                                    >
                                                        Remove
                                                    </RemoveButton>
                                                </ActionButtons>
                                            </Td>
                                        </tr>
                                    ))}
                            </tbody>
                        </RosterTable>
                    )}
                </RosterSection>
            </Content>
        </Container>
    );
};

export default TeamDetail;
