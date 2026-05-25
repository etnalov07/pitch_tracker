// Thin shim for backwards-compat with callers that mount a single
// "RunnerEventModal" and pass defaultTab='advance' | 'out'.
//
// The actual flows live in RunnerAdvanceModal and RunnerOutModal — split as
// part of UX audit item E (UX-IP-07). This file just routes to the right one.
// Future caller-side cleanup: replace `<RunnerEventModal defaultTab=... />`
// with a direct `<RunnerAdvanceModal />` or `<RunnerOutModal />` mount, and
// delete this shim. Kept now so the split doesn't ripple into the live-screen
// modal stack (LiveGameModals.tsx) in the same commit.

import React from 'react';

import { BaseRunners, BaserunnerEventType, RunnerBase } from '@pitch-tracker/shared';

import RunnerAdvanceModal, { type AdvancementEventType } from './RunnerAdvanceModal';
import RunnerOutModal from './RunnerOutModal';

interface RunnerEventModalProps {
    visible: boolean;
    onDismiss: () => void;
    runners: BaseRunners;
    currentOuts: number;
    onRecordAdvancement: (
        eventType: AdvancementEventType,
        fromBase: RunnerBase,
        newRunners: BaseRunners,
        runsScored: number,
        runnerToBase?: RunnerBase | 'home'
    ) => void;
    onRecordOut: (eventType: BaserunnerEventType, runnerBase: RunnerBase) => void;
    defaultTab?: 'advance' | 'out';
}

const RunnerEventModal: React.FC<RunnerEventModalProps> = ({
    visible,
    onDismiss,
    runners,
    currentOuts,
    onRecordAdvancement,
    onRecordOut,
    defaultTab = 'advance',
}) => {
    if (defaultTab === 'out') {
        return (
            <RunnerOutModal
                visible={visible}
                onDismiss={onDismiss}
                runners={runners}
                currentOuts={currentOuts}
                onRecord={onRecordOut}
            />
        );
    }
    return <RunnerAdvanceModal visible={visible} onDismiss={onDismiss} runners={runners} onRecord={onRecordAdvancement} />;
};

export default RunnerEventModal;
