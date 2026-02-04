import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, PlayerPosition } from '../../types';
import { theme } from '../../styles/theme';
import {
    RosterSection,
    SectionHeader,
    SectionTitle,
    RosterTable as RosterTableStyled,
    Th,
    Td,
    JerseyNumber,
    PlayerName,
    PositionBadge,
    Handedness,
    ActionButtons,
    EditButton,
    ProfileButton,
    RemoveButton,
    EmptyState,
    EmptyText,
    AddButtonSmall,
} from './styles';

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

interface RosterTableProps {
    teamId: string;
    players: Player[];
    showAddPlayer: boolean;
    onAddPlayer: () => void;
    onEdit: (player: Player) => void;
    onDelete: (playerId: string, playerName: string) => void;
}

const RosterTable: React.FC<RosterTableProps> = ({
    teamId, players, showAddPlayer,
    onAddPlayer, onEdit, onDelete,
}) => {
    const navigate = useNavigate();

    return (
        <RosterSection>
            <SectionHeader>
                <SectionTitle>Roster ({players.length} players)</SectionTitle>
            </SectionHeader>

            {players.length === 0 ? (
                <EmptyState>
                    <EmptyText>No players on the roster yet.</EmptyText>
                    {!showAddPlayer && (
                        <AddButtonSmall onClick={onAddPlayer}>Add Your First Player</AddButtonSmall>
                    )}
                </EmptyState>
            ) : (
                <RosterTableStyled>
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
                                        {player.primary_position === 'P' && (
                                            <ProfileButton
                                                onClick={() => navigate(`/teams/${teamId}/pitcher/${player.id}`)}
                                            >
                                                Profile
                                            </ProfileButton>
                                        )}
                                        <EditButton onClick={() => onEdit(player)}>Edit</EditButton>
                                        <RemoveButton
                                            onClick={() =>
                                                onDelete(player.id, `${player.first_name} ${player.last_name}`)
                                            }
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
