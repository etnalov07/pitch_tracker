import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '../../types';
import {
    RosterSection,
    SectionHeader,
    SectionTitle,
    RosterTable as RosterTableStyled,
    Th,
    Td,
    JerseyNumber,
    PlayerName,
    Handedness,
    ActionButtons,
    EditButton,
    ProfileButton,
    RemoveButton,
    EmptyState,
    EmptyText,
    AddButtonSmall,
} from './styles';

interface RosterTableProps {
    teamId: string;
    players: Player[];
    showAddPlayer: boolean;
    onAddPlayer: () => void;
    onEdit: (player: Player) => void;
    onDelete: (playerId: string, playerName: string) => void;
}

const RosterTable: React.FC<RosterTableProps> = ({ teamId, players, showAddPlayer, onAddPlayer, onEdit, onDelete }) => {
    const navigate = useNavigate();

    return (
        <RosterSection>
            <SectionHeader>
                <SectionTitle>Pitchers ({players.length})</SectionTitle>
            </SectionHeader>

            {players.length === 0 ? (
                <EmptyState>
                    <EmptyText>No pitchers on the roster yet.</EmptyText>
                    {!showAddPlayer && <AddButtonSmall onClick={onAddPlayer}>Add Your First Pitcher</AddButtonSmall>}
                </EmptyState>
            ) : (
                <RosterTableStyled>
                    <thead>
                        <tr>
                            <Th>#</Th>
                            <Th>Name</Th>
                            <Th>Type</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((player) => (
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
                                    <Handedness>{player.throws === 'L' ? 'LHP' : 'RHP'}</Handedness>
                                </Td>
                                <Td>
                                    <ActionButtons>
                                        <ProfileButton onClick={() => navigate(`/teams/${teamId}/pitcher/${player.id}`)}>
                                            Profile
                                        </ProfileButton>
                                        <EditButton onClick={() => onEdit(player)}>Edit</EditButton>
                                        <RemoveButton
                                            onClick={() => onDelete(player.id, `${player.first_name} ${player.last_name}`)}
                                        >
                                            Remove
                                        </RemoveButton>
                                    </ActionButtons>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </RosterTableStyled>
            )}
        </RosterSection>
    );
};

export default RosterTable;
