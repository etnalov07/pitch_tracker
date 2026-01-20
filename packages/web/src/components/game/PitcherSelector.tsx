import styled from '@emotion/styled';
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import { Player, GamePitcherWithPlayer } from '../../types';

interface PitcherSelectorProps {
    gameId: string;
    teamId: string;
    currentInning: number;
    onPitcherSelected: (pitcher: GamePitcherWithPlayer) => void;
    onClose: () => void;
}

const Overlay = styled.div({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
});

const Modal = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: theme.shadows.lg,
});

const ModalHeader = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
});

const ModalTitle = styled.h2({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    margin: 0,
});

const CloseButton = styled.button({
    background: 'none',
    border: 'none',
    fontSize: theme.fontSize.xl,
    color: theme.colors.gray[500],
    cursor: 'pointer',

    '&:hover': {
        color: theme.colors.gray[700],
    },
});

const PitcherList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
});

const PitcherCard = styled.button<{ isActive?: boolean }>((props) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    border: `2px solid ${props.isActive ? theme.colors.primary[500] : theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
    background: props.isActive ? theme.colors.primary[50] : 'white',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',

    '&:hover': {
        borderColor: theme.colors.primary[400],
        background: theme.colors.primary[50],
    },
}));

const PitcherInfo = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

const JerseyNumber = styled.div({
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: theme.colors.primary[100],
    color: theme.colors.primary[700],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.lg,
});

const PitcherName = styled.div({
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[900],
});

const PitcherStats = styled.div({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
});

const ActiveBadge = styled.span({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.green[700],
    backgroundColor: theme.colors.green[100],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.full,
});

const SectionTitle = styled.h3({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
});

const EmptyMessage = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[500],
    padding: theme.spacing.lg,
});

const PitcherSelector: React.FC<PitcherSelectorProps> = ({ gameId, teamId, currentInning, onPitcherSelected, onClose }) => {
    const [roster, setRoster] = useState<Player[]>([]);
    const [gamePitchers, setGamePitchers] = useState<GamePitcherWithPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch team roster (pitchers)
                const rosterResponse = await api.get<{ players: Player[] }>(`/players/team/${teamId}`);
                setRoster(rosterResponse.data.players || []);

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

    // Filter roster to show pitchers (P position) first, then others
    const sortedRoster = [...roster].sort((a, b) => {
        if (a.primary_position === 'P' && b.primary_position !== 'P') return -1;
        if (a.primary_position !== 'P' && b.primary_position === 'P') return 1;
        return 0;
    });

    // Players who have already pitched today
    const usedPitcherIds = new Set(gamePitchers.map((p) => p.player_id));
    const usedPitchers = sortedRoster.filter((p) => usedPitcherIds.has(p.id));
    const availablePitchers = sortedRoster.filter((p) => !usedPitcherIds.has(p.id));

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
                    <EmptyMessage>No players on roster. Add players to your team first.</EmptyMessage>
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
