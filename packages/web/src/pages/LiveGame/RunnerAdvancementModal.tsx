import styled from '@emotion/styled';
import { BaseRunners, getSuggestedAdvancement } from '@pitch-tracker/shared';
import React, { useState, useEffect } from 'react';
import BaseRunnerDisplay from '../../components/live/BaseRunnerDisplay';
import { theme } from '../../styles/theme';

interface RunnerAdvancementModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentRunners: BaseRunners;
    hitResult: string;
    onConfirm: (newRunners: BaseRunners, runsScored: number) => void;
}

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
    max-width: 450px;
    width: 90%;
`;

const Title = styled.h2`
    margin: 0 0 16px 0;
    font-size: 20px;
    color: ${theme.colors.gray[900]};
    text-align: center;
`;

const HitChip = styled.div`
    display: inline-block;
    padding: 6px 16px;
    background: ${theme.colors.primary[50]};
    color: ${theme.colors.primary[700]};
    border-radius: 20px;
    font-weight: 600;
    margin: 0 auto 20px;
    display: block;
    text-align: center;
    width: fit-content;
`;

const Section = styled.div`
    margin-bottom: 20px;
    text-align: center;
`;

const SectionTitle = styled.h3`
    font-size: 14px;
    font-weight: 600;
    color: ${theme.colors.gray[600]};
    margin: 0 0 12px 0;
`;

const DiamondContainer = styled.div`
    display: flex;
    justify-content: center;
    margin-bottom: 12px;
`;

const BaseToggles = styled.div`
    display: flex;
    justify-content: center;
    gap: 8px;
`;

const Chip = styled.button<{ $selected: boolean }>`
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid ${(props) => (props.$selected ? theme.colors.green[500] : theme.colors.gray[300])};
    background: ${(props) => (props.$selected ? theme.colors.green[50] : 'white')};
    color: ${(props) => (props.$selected ? theme.colors.green[700] : theme.colors.gray[700])};
    cursor: pointer;
    font-size: 14px;

    &:hover {
        border-color: ${theme.colors.green[400]};
    }
`;

const RunsSection = styled.div`
    text-align: center;
    margin-bottom: 20px;
`;

const RunsControl = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
`;

const RunsButton = styled.button`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid ${theme.colors.gray[300]};
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;

    &:hover {
        background: ${theme.colors.gray[50]};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const RunsCount = styled.span`
    font-size: 32px;
    font-weight: bold;
    min-width: 40px;
    text-align: center;
`;

const ButtonRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'outline' }>`
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;

    ${(props) =>
        props.$variant === 'outline'
            ? `
                background: white;
                color: ${theme.colors.gray[700]};
                border: 1px solid ${theme.colors.gray[300]};
                &:hover { background: ${theme.colors.gray[50]}; }
            `
            : `
                background: ${theme.colors.primary[500]};
                color: white;
                border: none;
                &:hover { background: ${theme.colors.primary[600]}; }
            `}
`;

const RunnerAdvancementModal: React.FC<RunnerAdvancementModalProps> = ({
    isOpen,
    onClose,
    currentRunners,
    hitResult,
    onConfirm,
}) => {
    const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(currentRunners, hitResult);
    const [newRunners, setNewRunners] = useState<BaseRunners>(suggestedRunners);
    const [runsScored, setRunsScored] = useState(suggestedRuns);

    useEffect(() => {
        if (isOpen) {
            const suggestion = getSuggestedAdvancement(currentRunners, hitResult);
            setNewRunners(suggestion.suggestedRunners);
            setRunsScored(suggestion.suggestedRuns);
        }
    }, [isOpen, currentRunners, hitResult]);

    if (!isOpen) return null;

    const toggleBase = (base: 'first' | 'second' | 'third') => {
        setNewRunners((prev) => ({
            ...prev,
            [base]: !prev[base],
        }));
    };

    const getHitLabel = (result: string): string => {
        switch (result) {
            case 'single':
                return 'Single';
            case 'double':
                return 'Double';
            case 'triple':
                return 'Triple';
            case 'home_run':
                return 'Home Run';
            case 'walk':
                return 'Walk';
            case 'hit_by_pitch':
                return 'Hit By Pitch';
            case 'sacrifice_fly':
                return 'Sacrifice Fly';
            case 'fielders_choice':
                return "Fielder's Choice";
            default:
                return result;
        }
    };

    const handleConfirm = () => {
        onConfirm(newRunners, runsScored);
        onClose();
    };

    const runnersOnBefore = (currentRunners.first ? 1 : 0) + (currentRunners.second ? 1 : 0) + (currentRunners.third ? 1 : 0);

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <Title>Runner Advancement</Title>
                <HitChip>{getHitLabel(hitResult)}</HitChip>

                <Section>
                    <SectionTitle>Before ({runnersOnBefore} on base)</SectionTitle>
                    <DiamondContainer>
                        <BaseRunnerDisplay runners={currentRunners} size={80} />
                    </DiamondContainer>
                </Section>

                <Section>
                    <SectionTitle>After (click bases to adjust)</SectionTitle>
                    <DiamondContainer>
                        <BaseRunnerDisplay runners={newRunners} size={100} onBaseClick={toggleBase} />
                    </DiamondContainer>
                    <BaseToggles>
                        <Chip $selected={newRunners.first} onClick={() => toggleBase('first')}>
                            1st
                        </Chip>
                        <Chip $selected={newRunners.second} onClick={() => toggleBase('second')}>
                            2nd
                        </Chip>
                        <Chip $selected={newRunners.third} onClick={() => toggleBase('third')}>
                            3rd
                        </Chip>
                    </BaseToggles>
                </Section>

                <RunsSection>
                    <SectionTitle>Runs Scored</SectionTitle>
                    <RunsControl>
                        <RunsButton onClick={() => setRunsScored((r) => Math.max(0, r - 1))} disabled={runsScored === 0}>
                            -
                        </RunsButton>
                        <RunsCount>{runsScored}</RunsCount>
                        <RunsButton onClick={() => setRunsScored((r) => r + 1)}>+</RunsButton>
                    </RunsControl>
                </RunsSection>

                <ButtonRow>
                    <Button $variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm}>Confirm</Button>
                </ButtonRow>
            </Modal>
        </Overlay>
    );
};

export default RunnerAdvancementModal;
