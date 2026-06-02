import React, { useState, useEffect } from 'react';
import { useToast } from '../../../hooks/useToast';
import api from '../../../services/api';
import { gamesApi } from '../../../state/games/api/gamesApi';
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
    IneligibleReason,
    CaveatChip,
} from './styles';

type EligibilityState = 'eligible' | 'ineligible' | 'unknown_division' | 'unknown_rules';

interface EligibilityResult {
    eligibility: EligibilityState;
    reasons: string[];
    daily_max: number | null;
    pitches_today: number;
}

type EligibilityMap = Record<string, EligibilityResult>;

interface PitcherSelectorProps {
    gameId: string;
    teamId: string;
    currentInning: number;
    onPitcherSelected: (pitcher: GamePitcherWithPlayer) => void;
    onClose: () => void;
}

const PitcherSelector: React.FC<PitcherSelectorProps> = ({ gameId, teamId, currentInning, onPitcherSelected, onClose }) => {
    const toast = useToast();
    const [roster, setRoster] = useState<Player[]>([]);
    const [gamePitchers, setGamePitchers] = useState<GamePitcherWithPlayer[]>([]);
    const [eligibility, setEligibility] = useState<EligibilityMap>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch the full team roster so position players show up too — emergency-relief
                // scenarios need them. Display sorts pitchers (primary_position === 'P') to the top.
                const players = await gamesApi.getTeamPlayers(teamId);
                setRoster(players || []);

                // Fetch game pitchers (who has pitched in this game)
                const gamePitchersList = await gamesApi.getGamePitchers(gameId);
                setGamePitchers(gamePitchersList || []);

                // Bulk eligibility for every roster player. Server resolves the sanction
                // from the game and applies the corresponding rules engine. Best-effort:
                // if it fails, the selector falls back to permissive (no chips).
                if (players && players.length > 0) {
                    try {
                        const ids = players.map((p) => p.id).join(',');
                        const res = await api.get<{ eligibility: EligibilityMap }>(
                            `/pitch-rules/eligibility/${gameId}/bulk?pitcher_ids=${ids}`
                        );
                        setEligibility(res.data.eligibility ?? {});
                    } catch (e) {
                        console.warn('Eligibility fetch failed; defaulting to permissive', e);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch pitchers:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [gameId, teamId]);

    const handleSelectPitcher = async (player: Player) => {
        // Hard-block: if the engine says ineligible, the card's onClick should
        // have already been disabled. This is a belt-and-suspenders guard.
        if (eligibility[player.id]?.eligibility === 'ineligible') return;
        try {
            // Check if this pitcher is already the current pitcher
            const currentPitcher = gamePitchers.find((p) => !p.inning_exited);
            if (currentPitcher && currentPitcher.player_id === player.id) {
                onPitcherSelected(currentPitcher);
                onClose();
                return;
            }

            // Add or change pitcher
            const newPitcher = await gamesApi.changePitcher(gameId, player.id, currentInning);

            onPitcherSelected(newPitcher);
            onClose();
        } catch (error) {
            console.error('Failed to set pitcher:', error);
            toast.show({ message: 'Failed to set pitcher', type: 'error' });
        }
    };

    const currentPitcher = gamePitchers.find((p) => !p.inning_exited);

    // Players who have pitched in this game so far (per-game, not per-day).
    const usedPitcherIds = new Set(gamePitchers.map((p) => p.player_id));
    const usedPitchers = roster.filter((p) => usedPitcherIds.has(p.id));
    // Sort pitchers (primary_position === 'P') to the top, then alphabetical by last name.
    const availablePitchers = roster
        .filter((p) => !usedPitcherIds.has(p.id))
        .sort((a, b) => {
            const aIsP = a.primary_position === 'P' ? 0 : 1;
            const bIsP = b.primary_position === 'P' ? 0 : 1;
            if (aIsP !== bIsP) return aIsP - bIsP;
            return (a.last_name || '').localeCompare(b.last_name || '');
        });

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
                                    {availablePitchers.map((player) => {
                                        const elig = eligibility[player.id];
                                        const ineligible = elig?.eligibility === 'ineligible';
                                        const caveat =
                                            elig?.eligibility === 'unknown_division' || elig?.eligibility === 'unknown_rules'
                                                ? elig.reasons[0]
                                                : null;
                                        return (
                                            <PitcherCard
                                                key={player.id}
                                                disabled={ineligible}
                                                onClick={ineligible ? undefined : () => handleSelectPitcher(player)}
                                            >
                                                <PitcherInfo>
                                                    <JerseyNumber>{player.jersey_number || '#'}</JerseyNumber>
                                                    <div>
                                                        <PitcherName>
                                                            {player.first_name} {player.last_name}
                                                        </PitcherName>
                                                        <PitcherStats>
                                                            {player.primary_position} • Throws: {player.throws}
                                                        </PitcherStats>
                                                        {ineligible && elig?.reasons[0] && (
                                                            <IneligibleReason>{elig.reasons[0]}</IneligibleReason>
                                                        )}
                                                        {caveat && <CaveatChip>{caveat}</CaveatChip>}
                                                    </div>
                                                </PitcherInfo>
                                            </PitcherCard>
                                        );
                                    })}
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
