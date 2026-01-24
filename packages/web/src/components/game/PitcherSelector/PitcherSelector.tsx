import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Player, GamePitcherWithPlayer } from '../../../types';
import {
    Overlay,
    Modal,
    ModalHeader,
    ModalTitle,
    CloseButton,
    PitcherList,
    PitcherCard,
    PitcherInfo,
    JerseyNumber,
    PitcherName,
    PitcherStats,
    ActiveBadge,
    SectionTitle,
    EmptyMessage,
} from './styles';

interface PitcherSelectorProps {
    gameId: string;
    teamId: string;
    currentInning: number;
    onPitcherSelected: (pitcher: GamePitcherWithPlayer) => void;
    onClose: () => void;
}

const PitcherSelector: React.FC<PitcherSelectorProps> = ({ gameId, teamId, currentInning, onPitcherSelected, onClose }) => {
    const [roster, setRoster] = useState<Player[]>([]);
    const [gamePitchers, setGamePitchers] = useState<GamePitcherWithPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch team pitchers only (position = 'P')
                const rosterResponse = await api.get<{ pitchers: Player[] }>(`/players/pitchers/team/${teamId}`);
                setRoster(rosterResponse.data.pitchers || []);

                // Fetch game pitchers (who has pitched in this game)
                const pitchersResponse = await api.get<{ pitchers: GamePitcherWithPlayer[] }>(`/game-pitchers/game/${gameId}`);
                setGamePitchers(pitchersResponse.data.pitchers || []);
            } catch (error) {
                console.error('Failed to fetch pitchers:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [gameId, teamId]);

    const handleSelectPitcher = async (player: Player) => {
        try {
            // Check if this pitcher is already the current pitcher
            const currentPitcher = gamePitchers.find((p) => !p.inning_exited);
            if (currentPitcher && currentPitcher.player_id === player.id) {
                onPitcherSelected(currentPitcher);
                onClose();
                return;
            }

            // Add or change pitcher
            const response = await api.post<{ pitcher: GamePitcherWithPlayer }>(`/game-pitchers/game/${gameId}/change`, {
                player_id: player.id,
                inning_entered: currentInning,
            });

            onPitcherSelected(response.data.pitcher);
            onClose();
        } catch (error) {
            console.error('Failed to set pitcher:', error);
            alert('Failed to set pitcher');
        }
    };

    const currentPitcher = gamePitchers.find((p) => !p.inning_exited);

    // Players who have already pitched today
    const usedPitcherIds = new Set(gamePitchers.map((p) => p.player_id));
    const usedPitchers = roster.filter((p) => usedPitcherIds.has(p.id));
    const availablePitchers = roster.filter((p) => !usedPitcherIds.has(p.id));

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>Select Pitcher</ModalTitle>
                    <CloseButton onClick={onClose}>&times;</CloseButton>
                </ModalHeader>

                {loading ? (
                    <EmptyMessage>Loading pitchers...</EmptyMessage>
                ) : roster.length === 0 ? (
                    <EmptyMessage>No pitchers on roster. Add players with position 'P' to your team.</EmptyMessage>
                ) : (
                    <>
                        {usedPitchers.length > 0 && (
                            <>
                                <SectionTitle>In Game</SectionTitle>
                                <PitcherList>
                                    {usedPitchers.map((player) => {
                                        const gamePitcher = gamePitchers.find((gp) => gp.player_id === player.id);
                                        const isActive = currentPitcher?.player_id === player.id;
                                        return (
                                            <PitcherCard
                                                key={player.id}
                                                isActive={isActive}
                                                onClick={() => handleSelectPitcher(player)}
                                            >
                                                <PitcherInfo>
                                                    <JerseyNumber>{player.jersey_number || '#'}</JerseyNumber>
                                                    <div>
                                                        <PitcherName>
                                                            {player.first_name} {player.last_name}
                                                        </PitcherName>
                                                        <PitcherStats>
                                                            {gamePitcher && `Entered: Inning ${gamePitcher.inning_entered}`}
                                                            {gamePitcher?.inning_exited &&
                                                                ` • Exited: Inning ${gamePitcher.inning_exited}`}
                                                        </PitcherStats>
                                                    </div>
                                                </PitcherInfo>
                                                {isActive && <ActiveBadge>Active</ActiveBadge>}
                                            </PitcherCard>
                                        );
                                    })}
                                </PitcherList>
                            </>
                        )}

                        {availablePitchers.length > 0 && (
                            <>
                                <SectionTitle>Available</SectionTitle>
                                <PitcherList>
                                    {availablePitchers.map((player) => (
                                        <PitcherCard key={player.id} onClick={() => handleSelectPitcher(player)}>
                                            <PitcherInfo>
                                                <JerseyNumber>{player.jersey_number || '#'}</JerseyNumber>
                                                <div>
                                                    <PitcherName>
                                                        {player.first_name} {player.last_name}
                                                    </PitcherName>
                                                    <PitcherStats>
                                                        {player.primary_position} • Throws: {player.throws}
                                                    </PitcherStats>
                                                </div>
                                            </PitcherInfo>
                                        </PitcherCard>
                                    ))}
                                </PitcherList>
                            </>
                        )}
                    </>
                )}
            </Modal>
        </Overlay>
    );
};

export default PitcherSelector;
