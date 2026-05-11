import { BatterBreakdown } from '@pitch-tracker/shared';
import React, { useEffect, useState } from 'react';
import { performanceSummaryService } from '../../../services/performanceSummaryService';
import { BatterBreakdownPanel } from '../../performanceSummary';
import { Body, CloseBtn, Header, LoadingText, Modal, Overlay, Subtitle, Title } from './styles';

interface Props {
    gameId: string;
    pitcherId?: string;
    currentBatterId?: string;
    currentBatterName?: string;
    onClose: () => void;
}

const BatterBreakdownModal: React.FC<Props> = ({ gameId, pitcherId, currentBatterId, currentBatterName, onClose }) => {
    const [breakdown, setBreakdown] = useState<BatterBreakdown[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        performanceSummaryService
            .getBatterBreakdown(gameId)
            .then((data) => {
                if (!cancelled) setBreakdown(data);
            })
            .catch(() => {
                if (!cancelled) setBreakdown([]);
            });
        return () => {
            cancelled = true;
        };
    }, [gameId]);

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <Header>
                    <div>
                        <Title>Batter Breakdown</Title>
                        {currentBatterName && <Subtitle>At bat: {currentBatterName}</Subtitle>}
                    </div>
                    <CloseBtn onClick={onClose} aria-label="Close">
                        ×
                    </CloseBtn>
                </Header>
                <Body>
                    {breakdown === null ? (
                        <LoadingText>Loading batter breakdown…</LoadingText>
                    ) : (
                        <BatterBreakdownPanel
                            sections={[{ title: 'Opponent Lineup', batters: breakdown }]}
                            pitcherId={pitcherId}
                            gameId={gameId}
                            scrollToBatterId={currentBatterId}
                        />
                    )}
                </Body>
            </Modal>
        </Overlay>
    );
};

export default BatterBreakdownModal;
