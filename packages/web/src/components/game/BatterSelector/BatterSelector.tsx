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
    AddBatterForm,
    FormRow,
    FormLabel,
    FormInput,
    FormSelect,
    FormActions,
    SaveButton,
    CancelButton,
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
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newBattingOrder, setNewBattingOrder] = useState('');
    const [newPosition, setNewPosition] = useState('');
    const [newBats, setNewBats] = useState<'R' | 'L' | 'S'>('R');
    const [saving, setSaving] = useState(false);

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

    // Derive lineup size from the max batting order present (minimum 9)
    const lineupSize = Math.max(9, ...Array.from(lineupByOrder.keys()));

    // Get active player for each batting order (not subbed out)
    const activeLineup: OpponentLineupPlayer[] = [];
    for (let i = 1; i <= lineupSize; i++) {
        const players = lineupByOrder.get(i) || [];
        const activePlayer = players.find((p) => !p.replaced_by_id);
        if (activePlayer) {
            activeLineup.push(activePlayer);
        }
    }

    // Determine next batter based on batting order
    const nextBatterOrder = ((currentBattingOrder - 1) % lineupSize) + 1;

    // Find next available batting order slot
    const usedOrders = new Set(activeLineup.map((b) => b.batting_order));
    const getNextAvailableOrder = (): string => {
        for (let i = 1; i <= lineupSize; i++) {
            if (!usedOrders.has(i)) return String(i);
        }
        return '1';
    };

    const handleShowAddForm = () => {
        setNewBattingOrder(getNextAvailableOrder());
        setShowAddForm(true);
    };

    const handleCancelAdd = () => {
        setShowAddForm(false);
        setNewName('');
        setNewBattingOrder('');
        setNewPosition('');
        setNewBats('R');
    };

    const handleSaveNewBatter = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            const response = await api.post<{ player: OpponentLineupPlayer }>(`/opponent-lineup/game/${gameId}`, {
                player_name: newName.trim(),
                batting_order: parseInt(newBattingOrder, 10),
                position: newPosition.trim() || null,
                bats: newBats,
                is_starter: false,
                inning_entered: null,
            });
            setLineup((prev) => [...prev, response.data.player]);
            handleCancelAdd();
        } catch (error) {
            console.error('Failed to add batter:', error);
            alert('Failed to add batter. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>Select Batter</ModalTitle>
                    <CloseButton onClick={onClose}>&times;</CloseButton>
                </ModalHeader>

                {loading ? (
                    <EmptyMessage>Loading lineup...</EmptyMessage>
                ) : activeLineup.length === 0 && !showAddForm ? (
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

                {showAddForm ? (
                    <AddBatterForm>
                        <FormRow>
                            <FormLabel>Name</FormLabel>
                            <FormInput
                                type="text"
                                placeholder="Player name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                autoFocus
                            />
                        </FormRow>
                        <FormRow>
                            <FormLabel>Order</FormLabel>
                            <FormSelect value={newBattingOrder} onChange={(e) => setNewBattingOrder(e.target.value)}>
                                {Array.from({ length: lineupSize }, (_, i) => i + 1).map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </FormSelect>
                        </FormRow>
                        <FormRow>
                            <FormLabel>Position</FormLabel>
                            <FormInput
                                type="text"
                                placeholder="e.g. SS, CF"
                                value={newPosition}
                                onChange={(e) => setNewPosition(e.target.value)}
                            />
                        </FormRow>
                        <FormRow>
                            <FormLabel>Bats</FormLabel>
                            <FormSelect value={newBats} onChange={(e) => setNewBats(e.target.value as 'R' | 'L' | 'S')}>
                                <option value="R">Right</option>
                                <option value="L">Left</option>
                                <option value="S">Switch</option>
                            </FormSelect>
                        </FormRow>
                        <FormActions>
                            <CancelButton type="button" onClick={handleCancelAdd} disabled={saving}>
                                Cancel
                            </CancelButton>
                            <SaveButton type="button" onClick={handleSaveNewBatter} disabled={saving || !newName.trim()}>
                                {saving ? 'Saving...' : 'Save'}
                            </SaveButton>
                        </FormActions>
                    </AddBatterForm>
                ) : (
                    <AddBatterButton onClick={handleShowAddForm}>+ Add Batter</AddBatterButton>
                )}
            </Modal>
        </Overlay>
    );
};

export default BatterSelector;
