import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    useAppDispatch,
    useAppSelector,
    fetchTeamById,
    fetchTeamRoster,
    addPlayerToTeam,
    updatePlayer,
    deletePlayer,
} from '../../state';
import { theme } from '../../styles/theme';
import { Player, PlayerPosition, HandednessType, ThrowingHand } from '../../types';
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
    const { team_id } = useParams<{ team_id: string }>();

    const { selectedTeam: team, roster: players = [], loading } = useAppSelector((state) => state.teams);
    const [showAddPlayer, setShowAddPlayer] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const initialFormData = {
        first_name: '',
        last_name: '',
        jersey_number: '',
        primary_position: 'UTIL' as PlayerPosition,
        bats: 'R' as HandednessType,
        throws: 'R' as ThrowingHand,
    };
    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        if (team_id) {
            dispatch(fetchTeamById(team_id));
            dispatch(fetchTeamRoster(team_id));
        }
    }, [dispatch, team_id]);

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
        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            setError('First and last name are required');
            return;
        }

        try {
            setSubmitting(true);
            const playerData = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                jersey_number: formData.jersey_number ? parseInt(formData.jersey_number, 10) : undefined,
                primary_position: formData.primary_position,
                bats: formData.bats,
                throws: formData.throws,
            };

            if (editingPlayer) {
                await dispatch(updatePlayer({ player_id: editingPlayer.id, playerData })).unwrap();
            } else {
                await dispatch(addPlayerToTeam({ team_id: team_id!, playerData })).unwrap();
            }
            resetForm();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save player');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (player: Player) => {
        setEditingPlayer(player);
        setFormData({
            first_name: player.first_name,
            last_name: player.last_name,
            jersey_number: player.jersey_number?.toString() || '',
            primary_position: player.primary_position,
            bats: player.bats,
            throws: player.throws,
        });
        setShowAddPlayer(true);
    };

    const handleDelete = async (player_id: string, playerName: string) => {
        if (!window.confirm(`Are you sure you want to remove "${playerName}" from the roster?`)) {
            return;
        }

        try {
            await dispatch(deletePlayer(player_id)).unwrap();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to remove player');
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
                                    <Label htmlFor="first_name">First Name *</Label>
                                    <Input
                                        type="text"
                                        id="first_name"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        placeholder="John"
                                        autoFocus
                                    />
                                </FormGroup>

                                <FormGroup>
                                    <Label htmlFor="last_name">Last Name *</Label>
                                    <Input
                                        type="text"
                                        id="last_name"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        placeholder="Doe"
                                    />
                                </FormGroup>
                            </FormRow>

                            <FormRow>
                                <FormGroup>
                                    <Label htmlFor="jersey_number">Jersey #</Label>
                                    <Input
                                        type="number"
                                        id="jersey_number"
                                        name="jersey_number"
                                        value={formData.jersey_number}
                                        onChange={handleChange}
                                        placeholder="25"
                                        min="0"
                                        max="99"
                                    />
                                </FormGroup>

                                <FormGroup>
                                    <Label htmlFor="primary_position">Position</Label>
                                    <Select
                                        id="primary_position"
                                        name="primary_position"
                                        value={formData.primary_position}
                                        onChange={handleChange}
                                    >
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
                                    .sort((a, b) => (a.jersey_number || 99) - (b.jersey_number || 99))
                                    .map((player) => (
                                        <tr key={player.id}>
                                            <Td>
                                                <JerseyNumber>{player.jersey_number || '-'}</JerseyNumber>
                                            </Td>
                                            <Td>
                                                <PlayerName>
                                                    {player.first_name} {player.last_name}
                                                </PlayerName>
                                            </Td>
                                            <Td>
                                                <PositionBadge color={getPositionColor(player.primary_position)}>
                                                    {player.primary_position}
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
                                                            handleDelete(player.id, `${player.first_name} ${player.last_name}`)
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
