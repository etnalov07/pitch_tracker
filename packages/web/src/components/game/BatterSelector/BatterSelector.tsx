import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { gamesApi } from '../../../state/games/api/gamesApi';
import { OpponentLineupPlayer, OpponentRosterPlayer } from '../../../types';
import {
    Overlay,
    Modal,
    ModalHeader,
    ModalTitle,
    CloseButton,
    BatterList,
    BatterCard,
    BatterCardActions,
    BatterInfo,
    BattingOrderBadge,
    BatterName,
    BatterStats,
    NextUpBadge,
    SubActionButton,
    SubFormCard,
    SubFormHeader,
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
    /** Current inning, used to default the inning_entered for substitutions. */
    currentInning?: number;
    onBatterSelected: (batter: OpponentLineupPlayer) => void;
    /** Fires after a substitution lands so the parent can refetch its own
     *  opponent lineup state. Optional — modal works without it. */
    onLineupChanged?: () => void;
    onClose: () => void;
    teamSide?: 'home' | 'away';
}

const BatterSelector: React.FC<BatterSelectorProps> = ({
    gameId,
    currentBattingOrder = 1,
    currentInning = 1,
    onBatterSelected,
    onLineupChanged,
    onClose,
    teamSide,
}) => {
    const [lineup, setLineup] = useState<OpponentLineupPlayer[]>([]);
    const [knownPlayers, setKnownPlayers] = useState<OpponentRosterPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newBattingOrder, setNewBattingOrder] = useState('');
    const [newPosition, setNewPosition] = useState('');
    const [newBats, setNewBats] = useState<'R' | 'L' | 'S'>('R');
    const [saving, setSaving] = useState(false);
    // Inline substitution state — keyed by the original lineup row's id
    const [subbingId, setSubbingId] = useState<string | null>(null);
    const [subName, setSubName] = useState('');
    const [subPosition, setSubPosition] = useState('');
    const [subBats, setSubBats] = useState<'R' | 'L' | 'S'>('R');
    const [subInning, setSubInning] = useState<string>(String(currentInning));

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [lineupRes, roster] = await Promise.all([
                    api.get<{ lineup: OpponentLineupPlayer[] }>(`/opponent-lineup/game/${gameId}`),
                    gamesApi.getOpponentRoster(gameId).catch(() => ({ pitchers: [], batters: [], players: [] })),
                ]);
                const all = lineupRes.data.lineup || [];
                setLineup(teamSide ? all.filter((p) => p.team_side === teamSide) : all);
                setKnownPlayers(roster.players ?? []);
            } catch (error) {
                console.error('Failed to fetch lineup:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [gameId, teamSide]);

    useEffect(() => {
        setSubInning(String(currentInning));
    }, [currentInning]);

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

    const handleStartSub = (batter: OpponentLineupPlayer) => {
        setSubbingId(batter.id);
        setSubName('');
        setSubPosition(batter.position ?? '');
        setSubBats((batter.bats as 'R' | 'L' | 'S') || 'R');
        setSubInning(String(currentInning));
    };

    const handleCancelSub = () => {
        setSubbingId(null);
        setSubName('');
        setSubPosition('');
        setSubBats('R');
    };

    const handleSubNameChange = (value: string) => {
        setSubName(value);
        const known = knownPlayers.find((p) => p.name === value);
        if (known?.bats) setSubBats(known.bats as 'R' | 'L' | 'S');
    };

    const handleSaveSub = async (originalId: string) => {
        if (!subName.trim()) return;
        const inningNum = parseInt(subInning, 10);
        if (Number.isNaN(inningNum) || inningNum < 1) return;
        setSaving(true);
        try {
            const newPlayer = await gamesApi.substituteOpponentPlayer(originalId, {
                player_name: subName.trim(),
                inning_entered: inningNum,
                position: subPosition.trim() || undefined,
                bats: subBats,
            });
            // Update local lineup: mark original as replaced and append the sub.
            setLineup((prev) => [
                ...prev.map((p) => (p.id === originalId ? { ...p, replaced_by_id: newPlayer.id } : p)),
                newPlayer,
            ]);
            handleCancelSub();
            // Notify the parent so any cached lineup state outside this modal can refresh.
            onLineupChanged?.();
            // Auto-select the sub if they're stepping in for the current batting slot.
            if (newPlayer.batting_order === currentBattingOrder) {
                onBatterSelected(newPlayer);
                onClose();
            }
        } catch (error) {
            console.error('Failed to substitute batter:', error);
            alert('Failed to substitute batter. Please try again.');
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

                {knownPlayers.length > 0 && (
                    <datalist id="batter-selector-known-players">
                        {knownPlayers.map((p) => (
                            <option key={p.normalized_name} value={p.name} />
                        ))}
                    </datalist>
                )}

                {loading ? (
                    <EmptyMessage>Loading lineup...</EmptyMessage>
                ) : activeLineup.length === 0 && !showAddForm ? (
                    <EmptyMessage>No lineup entered. Go back to add opponent lineup.</EmptyMessage>
                ) : (
                    <BatterList>
                        {activeLineup.map((batter) => {
                            const isNext = batter.batting_order === nextBatterOrder;
                            const isSubbing = subbingId === batter.id;
                            return (
                                <React.Fragment key={batter.id}>
                                    <BatterCard
                                        isNext={isNext}
                                        onClick={() => !isSubbing && handleSelectBatter(batter)}
                                        role="button"
                                        tabIndex={0}
                                    >
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
                                        <BatterCardActions>
                                            {isNext && <NextUpBadge>Next Up</NextUpBadge>}
                                            <SubActionButton
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isSubbing) handleCancelSub();
                                                    else handleStartSub(batter);
                                                }}
                                                disabled={saving && !isSubbing}
                                            >
                                                {isSubbing ? 'Cancel' : 'Sub'}
                                            </SubActionButton>
                                        </BatterCardActions>
                                    </BatterCard>
                                    {isSubbing && (
                                        <SubFormCard onClick={(e) => e.stopPropagation()}>
                                            <SubFormHeader>
                                                Substitute for {batter.player_name} (#{batter.batting_order})
                                            </SubFormHeader>
                                            <FormRow>
                                                <FormLabel>Name</FormLabel>
                                                <FormInput
                                                    type="text"
                                                    placeholder="Pinch hitter / sub name"
                                                    value={subName}
                                                    onChange={(e) => handleSubNameChange(e.target.value)}
                                                    list={knownPlayers.length > 0 ? 'batter-selector-known-players' : undefined}
                                                    autoFocus
                                                />
                                            </FormRow>
                                            <FormRow>
                                                <FormLabel>Inning</FormLabel>
                                                <FormInput
                                                    type="number"
                                                    min={1}
                                                    value={subInning}
                                                    onChange={(e) => setSubInning(e.target.value)}
                                                />
                                            </FormRow>
                                            <FormRow>
                                                <FormLabel>Position</FormLabel>
                                                <FormInput
                                                    type="text"
                                                    placeholder="e.g. PH, RF"
                                                    value={subPosition}
                                                    onChange={(e) => setSubPosition(e.target.value)}
                                                />
                                            </FormRow>
                                            <FormRow>
                                                <FormLabel>Bats</FormLabel>
                                                <FormSelect
                                                    value={subBats}
                                                    onChange={(e) => setSubBats(e.target.value as 'R' | 'L' | 'S')}
                                                >
                                                    <option value="R">Right</option>
                                                    <option value="L">Left</option>
                                                    <option value="S">Switch</option>
                                                </FormSelect>
                                            </FormRow>
                                            <FormActions>
                                                <CancelButton type="button" onClick={handleCancelSub} disabled={saving}>
                                                    Cancel
                                                </CancelButton>
                                                <SaveButton
                                                    type="button"
                                                    onClick={() => handleSaveSub(batter.id)}
                                                    disabled={saving || !subName.trim()}
                                                >
                                                    {saving ? 'Saving...' : 'Confirm Sub'}
                                                </SaveButton>
                                            </FormActions>
                                        </SubFormCard>
                                    )}
                                </React.Fragment>
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
                                list={knownPlayers.length > 0 ? 'batter-selector-known-players' : undefined}
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
