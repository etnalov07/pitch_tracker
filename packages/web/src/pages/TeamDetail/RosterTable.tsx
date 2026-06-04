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
    ReportButton,
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
    // True when the user has org_view access (not on the team but in its org).
    // Hides Add/Edit/Remove and the empty-state Add Player CTA.
    readOnly?: boolean;
}

const RosterTable: React.FC<RosterTableProps> = ({
    teamId,
    players,
    showAddPlayer,
    onAddPlayer,
    onEdit,
    onDelete,
    readOnly = false,
}) => {
    const navigate = useNavigate();

    return (
        <RosterSection>
            <SectionHeader>
                <SectionTitle>Roster ({players.length})</SectionTitle>
            </SectionHeader>

            {players.length === 0 ? (
                <EmptyState>
                    <EmptyText>No players on the roster yet.</EmptyText>
                    {!showAddPlayer && !readOnly && <AddButtonSmall onClick={onAddPlayer}>Add Your First Player</AddButtonSmall>}
                </EmptyState>
            ) : (
                <RosterTableStyled>
                    <thead>
                        <tr>
                            <Th>#</Th>
                            <Th>Name</Th>
                            <Th>Pos</Th>
                            <Th>Bats</Th>
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
                                        {(player.primary_position === 'P' || player.secondary_position === 'P') && (
                                            <Handedness style={{ marginLeft: 6 }}>
                                                {player.throws === 'L' ? 'LHP' : 'RHP'}
                                            </Handedness>
                                        )}
                                    </PlayerName>
                                </Td>
                                <Td>
                                    {player.primary_position || '—'}
                                    {player.secondary_position ? ` / ${player.secondary_position}` : ''}
                                </Td>
                                <Td>{player.bats || '—'}</Td>
                                <Td>
                                    <ActionButtons>
                                        {/* Available for every player, not just those listed at P: coaches put
                                            position players on the mound, and the pitcher profile is where you
                                            set up their pitch types before they've ever thrown one in the app. */}
                                        <ProfileButton onClick={() => navigate(`/teams/${teamId}/pitcher/${player.id}`)}>
                                            Profile
                                        </ProfileButton>
                                        {/* Gated on has_pitches (populated by getPlayersByTeam) so the button only
                                            appears for players who actually have pitch data — a roster pitcher
                                            who's never thrown one in the system wouldn't have a useful report. */}
                                        {player.has_pitches && (
                                            <ReportButton onClick={() => navigate(`/teams/${teamId}/pitcher/${player.id}/report`)}>
                                                Report
                                            </ReportButton>
                                        )}
                                        {!readOnly && (
                                            <>
                                                <EditButton onClick={() => onEdit(player)}>Edit</EditButton>
                                                <RemoveButton
                                                    onClick={() => onDelete(player.id, `${player.first_name} ${player.last_name}`)}
                                                >
                                                    Remove
                                                </RemoveButton>
                                            </>
                                        )}
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
