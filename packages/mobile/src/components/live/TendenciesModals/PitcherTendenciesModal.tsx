import React from 'react';

import PitcherTendenciesContent from './PitcherTendenciesContent';
import TendenciesModalShell from './TendenciesModalShell';

interface PitcherTendenciesModalProps {
    visible: boolean;
    onDismiss: () => void;
    pitcherId: string;
    pitcherName: string;
    initialBatterHand: 'L' | 'R';
}

/**
 * Modal wrapper around PitcherTendenciesContent. The body / data fetching /
 * handedness toggle all live in the content component so the tablet
 * side-by-side panel (LiveGameTablet) can render the same UI without the
 * modal wrapper — see UX-TD-10 + UX-TD-11.
 */
const PitcherTendenciesModal: React.FC<PitcherTendenciesModalProps> = ({
    visible,
    onDismiss,
    pitcherId,
    pitcherName,
    initialBatterHand,
}) => (
    <TendenciesModalShell visible={visible} onDismiss={onDismiss} title="Pitcher Tendencies" subtitle={pitcherName}>
        {visible && <PitcherTendenciesContent pitcherId={pitcherId} initialBatterHand={initialBatterHand} />}
    </TendenciesModalShell>
);

export default PitcherTendenciesModal;
