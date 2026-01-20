import styled from '@emotion/styled';
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import { OpponentLineupPlayer } from '../../types';

interface BatterSelectorProps {
    gameId: string;
    currentBattingOrder?: number;
    onBatterSelected: (batter: OpponentLineupPlayer) => void;
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

const BatterList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
});

const BatterCard = styled.button<{ isNext?: boolean; isSubbed?: boolean }>((props) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    border: `2px solid ${props.isNext ? theme.colors.primary[500] : theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
    background: props.isSubbed ? theme.colors.gray[100] : props.isNext ? theme.colors.primary[50] : 'white',
    cursor: props.isSubbed ? 'default' : 'pointer',
    textAlign: 'left',
    width: '100%',
    opacity: props.isSubbed ? 0.6 : 1,

    '&:hover': {
        borderColor: props.isSubbed ? theme.colors.gray[200] : theme.colors.primary[400],
        background: props.isSubbed ? theme.colors.gray[100] : theme.colors.primary[50],
    },
}));

const BatterInfo = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

const BattingOrderBadge = styled.div({
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: theme.colors.primary[100],
    color: theme.colors.primary[700],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.base,
});

const BatterName = styled.div({
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[900],
});

const BatterStats = styled.div({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
});

const NextUpBadge = styled.span({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary[700],
    backgroundColor: theme.colors.primary[100],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.full,
});

const EmptyMessage = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[500],
    padding: theme.spacing.lg,
});

const AddBatterButton = styled.button({
    width: '100%',
    padding: theme.spacing.md,
    border: `2px dashed ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    background: 'white',
    color: theme.colors.gray[600],
    cursor: 'pointer',
    marginTop: theme.spacing.md,

    '&:hover': {
        borderColor: theme.colors.primary[400],
        color: theme.colors.primary[600],
    },
});

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
