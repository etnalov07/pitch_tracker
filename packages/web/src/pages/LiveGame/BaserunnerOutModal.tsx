import React, { useState } from 'react';
import styled from '@emotion/styled';
import { BaseRunners, RunnerBase, BaserunnerEventType } from '@pitch-tracker/shared';
import { theme } from '../../styles/theme';

interface BaserunnerOutModalProps {
    isOpen: boolean;
    onClose: () => void;
    runners: BaseRunners;
    currentOuts: number;
    onRecordOut: (eventType: BaserunnerEventType, runnerBase: RunnerBase) => void;
}

const EVENT_TYPES: { type: BaserunnerEventType; label: string }[] = [
    { type: 'caught_stealing', label: 'Caught Stealing' },
    { type: 'pickoff', label: 'Pickoff' },
    { type: 'interference', label: 'Interference' },
    { type: 'passed_runner', label: 'Passed Runner' },
    { type: 'appeal_out', label: 'Appeal Out' },
    { type: 'other', label: 'Other' },
];

const BASE_LABELS: { base: RunnerBase; label: string }[] = [
    { base: 'first', label: '1st Base' },
    { base: 'second', label: '2nd Base' },
    { base: 'third', label: '3rd Base' },
];

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const Modal = styled.div`
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
`;

const Title = styled.h2`
    margin: 0 0 16px 0;
    font-size: 20px;
    color: ${theme.colors.gray[900]};
`;

const Warning = styled.p`
    color: ${theme.colors.yellow[600]};
    font-size: 14px;
    margin-bottom: 16px;
`;

const Section = styled.div`
    margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
    font-size: 14px;
    font-weight: 600;
    color: ${theme.colors.gray[600]};
    margin: 0 0 8px 0;
`;

const ChipRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const Chip = styled.button<{ $selected: boolean }>`
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid ${(props) => (props.$selected ? theme.colors.primary[500] : theme.colors.gray[300])};
    background: ${(props) => (props.$selected ? theme.colors.primary[50] : 'white')};
    color: ${(props) => (props.$selected ? theme.colors.primary[700] : theme.colors.gray[700])};
    cursor: pointer;
    font-size: 14px;

    &:hover {
        border-color: ${theme.colors.primary[400]};
    }
`;

const NoRunnersText = styled.p`
    color: ${theme.colors.gray[500]};
    font-style: italic;
    margin: 0;
`;

const ButtonRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'outline' | 'danger' }>`
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;

    ${(props) => {
        switch (props.$variant) {
            case 'danger':
                return `
                    background: ${theme.colors.red[500]};
                    color: white;
                    border: none;
                    &:hover { background: ${theme.colors.red[600]}; }
                    &:disabled { background: ${theme.colors.gray[300]}; cursor: not-allowed; }
                `;
            case 'outline':
                return `
                    background: white;
                    color: ${theme.colors.gray[700]};
                    border: 1px solid ${theme.colors.gray[300]};
                    &:hover { background: ${theme.colors.gray[50]}; }
                `;
            default:
                return `
                    background: ${theme.colors.primary[500]};
                    color: white;
                    border: none;
                    &:hover { background: ${theme.colors.primary[600]}; }
                `;
        }
    }}
`;

const BaserunnerOutModal: React.FC<BaserunnerOutModalProps> = ({
    isOpen,
    onClose,
    runners,
    currentOuts,
    onRecordOut,
}) => {
    const [selectedBase, setSelectedBase] = useState<RunnerBase | null>(null);
    const [selectedEventType, setSelectedEventType] = useState<BaserunnerEventType | null>(null);

    if (!isOpen) return null;

    const occupiedBases = BASE_LABELS.filter((b) => runners[b.base]);

    const handleConfirm = () => {
        if (selectedBase && selectedEventType) {
            onRecordOut(selectedEventType, selectedBase);
            setSelectedBase(null);
            setSelectedEventType(null);
            onClose();
        }
    };

    const handleClose = () => {
        setSelectedBase(null);
        setSelectedEventType(null);
        onClose();
    };

    const canConfirm = selectedBase && selectedEventType && currentOuts < 3;

    return (
        <Overlay onClick={handleClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <Title>Record Baserunner Out</Title>

                {currentOuts >= 2 && <Warning>Warning: Recording this out will end the inning</Warning>}

                <Section>
                    <SectionTitle>1. Select Runner</SectionTitle>
                    {occupiedBases.length === 0 ? (
                        <NoRunnersText>No runners on base</NoRunnersText>
                    ) : (
                        <ChipRow>
                            {occupiedBases.map((b) => (
                                <Chip
                                    key={b.base}
                                    $selected={selectedBase === b.base}
                                    onClick={() => setSelectedBase(b.base)}
                                >
                                    {b.label}
                                </Chip>
                            ))}
                        </ChipRow>
                    )}
                </Section>

                <Section>
                    <SectionTitle>2. Select Out Type</SectionTitle>
                    <ChipRow>
                        {EVENT_TYPES.map((event) => (
                            <Chip
                                key={event.type}
                                $selected={selectedEventType === event.type}
                                onClick={() => setSelectedEventType(event.type)}
                            >
                                {event.label}
                            </Chip>
                        ))}
                    </ChipRow>
                </Section>

                <ButtonRow>
                    <Button $variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button $variant="danger" onClick={handleConfirm} disabled={!canConfirm}>
                        Record Out
                    </Button>
                </ButtonRow>
            </Modal>
        </Overlay>
    );
};

export default BaserunnerOutModal;
