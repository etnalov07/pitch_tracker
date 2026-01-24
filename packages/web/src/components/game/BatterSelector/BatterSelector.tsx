import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { OpponentLineupPlayer } from '../../../types';
import {
    Overlay,
    Modal,
    ModalHeader,
    ModalTitle,
    CloseButton,
    BatterList,
    BatterCard,
    BatterInfo,
    BattingOrderBadge,
    BatterName,
    BatterStats,
    NextUpBadge,
    EmptyMessage,
    AddBatterButton,
} from './styles';

interface BatterSelectorProps {
    gameId: string;
    currentBattingOrder?: number;
    onBatterSelected: (batter: OpponentLineupPlayer) => void;
    onClose: () => void;
}

const BatterSelector: React.FC<BatterSelectorProps> = ({ gameId, currentBattingOrder = 1, onBatterSelected, onClose }) => {
    const [lineup, setLineup] = useState<OpponentLineupPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLineup = async () => {
            try {
                const response = await api.get<{ lineup: OpponentLineupPlayer[] }>(`/opponent-lineup/game/${gameId}`);
                setLineup(response.data.lineup || []);
            } catch (error) {
                console.error('Failed to fetch lineup:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLineup();
    }, [gameId]);

    const handleSelectBatter = (batter: OpponentLineupPlayer) => {
        if (batter.replaced_by_id) return; // Can't select subbed-out players
        onBatterSelected(batter);
        onClose();
    };

    // Group by batting order, showing active player for each spot
    const lineupByOrder = new Map<number, OpponentLineupPlayer[]>();
    lineup.forEach((player) => {
        const existing = lineupByOrder.get(player.batting_order) || [];
        existing.push(player);
        lineupByOrder.set(player.batting_order, existing);
    });

    // Get active player for each batting order (not subbed out)
    const activeLineup: OpponentLineupPlayer[] = [];
    for (let i = 1; i <= 9; i++) {
        const players = lineupByOrder.get(i) || [];
        const activePlayer = players.find((p) => !p.replaced_by_id);
        if (activePlayer) {
            activeLineup.push(activePlayer);
        }
    }

    // Determine next batter based on batting order
    const nextBatterOrder = ((currentBattingOrder - 1) % 9) + 1;

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>Select Batter</ModalTitle>
                    <CloseButton onClick={onClose}>&times;</CloseButton>
                </ModalHeader>

                {loading ? (
                    <EmptyMessage>Loading lineup...</EmptyMessage>
                ) : activeLineup.length === 0 ? (
                    <EmptyMessage>No lineup entered. Go back to add opponent lineup.</EmptyMessage>
                ) : (
                    <BatterList>
                        {activeLineup.map((batter) => {
                            const isNext = batter.batting_order === nextBatterOrder;
                            return (
                                <BatterCard key={batter.id} isNext={isNext} onClick={() => handleSelectBatter(batter)}>
                                    <BatterInfo>
                                        <BattingOrderBadge>{batter.batting_order}</BattingOrderBadge>
                                        <div>
                                            <BatterName>{batter.player_name}</BatterName>
                                            <BatterStats>
                                                {batter.position && `${batter.position} • `}
                                                Bats: {batter.bats}
                                                {!batter.is_starter && ` • Sub (Inn ${batter.inning_entered})`}
                                            </BatterStats>
                                        </div>
                                    </BatterInfo>
                                    {isNext && <NextUpBadge>Next Up</NextUpBadge>}
                                </BatterCard>
                            );
                        })}
                    </BatterList>
                )}

                <AddBatterButton onClick={() => alert('Add batter feature coming soon')}>+ Add Batter</AddBatterButton>
            </Modal>
        </Overlay>
    );
};

export default BatterSelector;
