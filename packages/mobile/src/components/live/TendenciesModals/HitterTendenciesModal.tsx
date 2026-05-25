import React from 'react';

import HitterTendenciesContent from './HitterTendenciesContent';
import TendenciesModalShell from './TendenciesModalShell';

interface HitterTendenciesModalProps {
    visible: boolean;
    onDismiss: () => void;
    batterId: string;
    batterName: string;
    batterType: 'team' | 'opponent';
    gameId?: string;
    jerseyNumber?: number | null;
}

/**
 * Modal wrapper around HitterTendenciesContent. The body / data fetching all
 * lives in the content component so the tablet side-by-side panel
 * (LiveGameTablet) can render the same UI without the modal wrapper — see
 * UX-TD-10 + UX-TD-11.
 */
const HitterTendenciesModal: React.FC<HitterTendenciesModalProps> = ({
    visible,
    onDismiss,
    batterId,
    batterName,
    batterType,
    gameId,
    jerseyNumber,
}) => (
    <TendenciesModalShell visible={visible} onDismiss={onDismiss} title="Hitter Tendencies" subtitle={batterName}>
        {visible && (
            <HitterTendenciesContent
                batterId={batterId}
                batterName={batterName}
                batterType={batterType}
                gameId={gameId}
                jerseyNumber={jerseyNumber}
            />
        )}
    </TendenciesModalShell>
);

export default HitterTendenciesModal;
