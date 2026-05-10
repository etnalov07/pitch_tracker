import React from 'react';
import PitcherStats from '../../components/live/PitcherStats';
import {
    DiamondModalOverlay,
    DiamondModal as ModalContainer,
    DiamondModalHeader,
    DiamondModalTitle,
    DiamondModalClose,
} from './styles';

interface PitcherStatsModalProps {
    pitcherId: string;
    gameId: string;
    pitcherName?: string;
    refreshTrigger?: number;
    onClose: () => void;
}

const PitcherStatsModal: React.FC<PitcherStatsModalProps> = ({ pitcherId, gameId, pitcherName, refreshTrigger, onClose }) => {
    return (
        <DiamondModalOverlay onClick={onClose}>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                <DiamondModalHeader>
                    <DiamondModalTitle>{pitcherName ? `${pitcherName} — In-Game Stats` : 'Pitcher Stats'}</DiamondModalTitle>
                    <DiamondModalClose onClick={onClose}>&times;</DiamondModalClose>
                </DiamondModalHeader>
                <PitcherStats pitcherId={pitcherId} gameId={gameId} pitcherName={pitcherName} refreshTrigger={refreshTrigger} />
            </ModalContainer>
        </DiamondModalOverlay>
    );
};

export default PitcherStatsModal;
