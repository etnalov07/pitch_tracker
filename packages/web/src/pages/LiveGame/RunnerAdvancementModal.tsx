import styled from '@emotion/styled';
import { BaseRunners, formatFielderSequence, getSuggestedAdvancement, RunnerBase } from '@pitch-tracker/shared';
import React, { useState, useEffect } from 'react';
import BaseRunnerDisplay from '../../components/live/BaseRunnerDisplay';
import { theme } from '../../styles/theme';
import FielderSequencePicker from './components/FielderSequencePicker';

export type ThrowoutTargetBase = 'second' | 'third' | 'home';

export interface Throwout {
    fromBase: RunnerBase;
    toBase: ThrowoutTargetBase;
    fielderSeq: number[];
}

interface RunnerAdvancementModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentRunners: BaseRunners;
    hitResult: string;
    onConfirm: (newRunners: BaseRunners, runsScored: number, throwouts: Throwout[]) => void;
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
    overflow-y: auto;
    padding: 16px;
`;

const Modal = styled.div`
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 480px;
    width: 100%;
`;

const Title = styled.h2`
    margin: 0 0 16px 0;
    font-size: 20px;
    color: ${theme.colors.gray[900]};
    text-align: center;
`;

const HitChip = styled.div`
    display: block;
    padding: 6px 16px;
    background: ${theme.colors.primary[50]};
    color: ${theme.colors.primary[700]};
    border-radius: 20px;
    font-weight: 600;
    margin: 0 auto 20px;
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

const Chip = styled.button<{ $selected: boolean; $color?: 'green' | 'red' }>`
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid
        ${(props) => {
            if (!props.$selected) return theme.colors.gray[300];
            return props.$color === 'red' ? theme.colors.red[500] : theme.colors.green[500];
        }};
    background: ${(props) => {
        if (!props.$selected) return 'white';
        return props.$color === 'red' ? theme.colors.red[50] : theme.colors.green[50];
    }};
    color: ${(props) => {
        if (!props.$selected) return theme.colors.gray[700];
        return props.$color === 'red' ? theme.colors.red[700] : theme.colors.green[700];
    }};
    cursor: pointer;
    font-size: 14px;

    &:hover {
        border-color: ${(props) => (props.$color === 'red' ? theme.colors.red[400] : theme.colors.green[400])};
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
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

const ThrowoutSection = styled.div`
    margin-bottom: 20px;
    padding: 12px;
    background: ${theme.colors.gray[50]};
    border-radius: 8px;
`;

const ThrowoutList = styled.ul`
    list-style: none;
    padding: 0;
    margin: 0 0 12px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const ThrowoutRow = styled.li`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    background: white;
    border-radius: 6px;
    font-size: 13px;
    color: ${theme.colors.gray[800]};
`;

const RemoveThrowoutButton = styled.button`
    border: none;
    background: transparent;
    color: ${theme.colors.red[600]};
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 0 6px;

    &:hover {
        color: ${theme.colors.red[800]};
    }
`;

const AddThrowoutForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 8px;
    border-top: 1px dashed ${theme.colors.gray[300]};
`;

const FormRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
`;

const FormLabel = styled.span`
    font-size: 12px;
    color: ${theme.colors.gray[600]};
    font-weight: 600;
    min-width: 56px;
    text-align: right;
`;

const SmallButton = styled.button<{ $variant?: 'primary' | 'outline' }>`
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
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
                &:disabled { opacity: 0.5; cursor: not-allowed; background: ${theme.colors.primary[300]}; }
            `}
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

const FROM_BASE_LABEL: Record<RunnerBase, string> = { first: '1st', second: '2nd', third: '3rd' };
const TO_BASE_LABEL: Record<ThrowoutTargetBase, string> = { second: '2nd', third: '3rd', home: 'home' };

// Valid forward bases for a runner thrown out trying to advance from a given base.
const VALID_TARGETS: Record<RunnerBase, ThrowoutTargetBase[]> = {
    first: ['second', 'third', 'home'],
    second: ['third', 'home'],
    third: ['home'],
};

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
    const [throwouts, setThrowouts] = useState<Throwout[]>([]);
    const [showAddThrowout, setShowAddThrowout] = useState(false);
    const [draftFromBase, setDraftFromBase] = useState<RunnerBase | null>(null);
    const [draftToBase, setDraftToBase] = useState<ThrowoutTargetBase | null>(null);
    const [draftFielderSeq, setDraftFielderSeq] = useState<number[]>([]);

    useEffect(() => {
        if (isOpen) {
            const suggestion = getSuggestedAdvancement(currentRunners, hitResult);
            setNewRunners(suggestion.suggestedRunners);
            setRunsScored(suggestion.suggestedRuns);
            setThrowouts([]);
            setShowAddThrowout(false);
            setDraftFromBase(null);
            setDraftToBase(null);
            setDraftFielderSeq([]);
        }
    }, [isOpen, currentRunners, hitResult]);

    if (!isOpen) return null;

    const toggleBase = (base: RunnerBase) => {
        setNewRunners((prev) => ({ ...prev, [base]: !prev[base] }));
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
            case 'sacrifice_bunt':
                return 'Sacrifice Bunt';
            case 'fielders_choice':
                return "Fielder's Choice";
            case 'strikeout_dropped':
                return 'Dropped 3rd Strike';
            default:
                return result;
        }
    };

    const handleConfirm = () => {
        onConfirm(newRunners, runsScored, throwouts);
        onClose();
    };

    const runnersOnBefore = (currentRunners.first ? 1 : 0) + (currentRunners.second ? 1 : 0) + (currentRunners.third ? 1 : 0);

    // A runner can only be thrown out once per play, so disable from-bases already in the list.
    const usedFromBases = new Set(throwouts.map((t) => t.fromBase));
    const availableFromBases: RunnerBase[] = (['first', 'second', 'third'] as RunnerBase[]).filter(
        (b) => currentRunners[b] && !usedFromBases.has(b)
    );

    const validTargets = draftFromBase ? VALID_TARGETS[draftFromBase] : [];
    const canAddThrowout = draftFromBase != null && draftToBase != null && draftFielderSeq.length > 0;

    const resetDraft = () => {
        setDraftFromBase(null);
        setDraftToBase(null);
        setDraftFielderSeq([]);
    };

    const handleAddThrowout = () => {
        if (!canAddThrowout) return;
        setThrowouts((prev) => [...prev, { fromBase: draftFromBase!, toBase: draftToBase!, fielderSeq: draftFielderSeq }]);
        resetDraft();
        setShowAddThrowout(false);
    };

    const handleRemoveThrowout = (index: number) => {
        setThrowouts((prev) => prev.filter((_, i) => i !== index));
    };

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

                {(runnersOnBefore > 0 || throwouts.length > 0) && (
                    <ThrowoutSection>
                        <SectionTitle>Runners thrown out advancing</SectionTitle>
                        {throwouts.length > 0 && (
                            <ThrowoutList>
                                {throwouts.map((t, idx) => (
                                    <ThrowoutRow key={idx}>
                                        <span>
                                            {FROM_BASE_LABEL[t.fromBase]} → out at {TO_BASE_LABEL[t.toBase]} (
                                            {formatFielderSequence(t.fielderSeq)})
                                        </span>
                                        <RemoveThrowoutButton
                                            type="button"
                                            onClick={() => handleRemoveThrowout(idx)}
                                            aria-label="Remove throwout"
                                        >
                                            ×
                                        </RemoveThrowoutButton>
                                    </ThrowoutRow>
                                ))}
                            </ThrowoutList>
                        )}

                        {!showAddThrowout && availableFromBases.length > 0 && (
                            <SmallButton type="button" $variant="outline" onClick={() => setShowAddThrowout(true)}>
                                + Add throwout
                            </SmallButton>
                        )}

                        {showAddThrowout && (
                            <AddThrowoutForm>
                                <FormRow>
                                    <FormLabel>From:</FormLabel>
                                    {availableFromBases.map((b) => (
                                        <Chip
                                            key={b}
                                            $selected={draftFromBase === b}
                                            $color="red"
                                            onClick={() => {
                                                setDraftFromBase(b);
                                                setDraftToBase(null);
                                            }}
                                        >
                                            {FROM_BASE_LABEL[b]}
                                        </Chip>
                                    ))}
                                </FormRow>
                                {draftFromBase && (
                                    <FormRow>
                                        <FormLabel>Out at:</FormLabel>
                                        {validTargets.map((b) => (
                                            <Chip
                                                key={b}
                                                $selected={draftToBase === b}
                                                $color="red"
                                                onClick={() => setDraftToBase(b)}
                                            >
                                                {TO_BASE_LABEL[b]}
                                            </Chip>
                                        ))}
                                    </FormRow>
                                )}
                                {draftFromBase && draftToBase && (
                                    <FormRow>
                                        <FormLabel>Fielders:</FormLabel>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <FielderSequencePicker value={draftFielderSeq} onChange={setDraftFielderSeq} />
                                        </div>
                                    </FormRow>
                                )}
                                <FormRow>
                                    <SmallButton
                                        type="button"
                                        $variant="outline"
                                        onClick={() => {
                                            resetDraft();
                                            setShowAddThrowout(false);
                                        }}
                                    >
                                        Cancel
                                    </SmallButton>
                                    <SmallButton type="button" onClick={handleAddThrowout} disabled={!canAddThrowout}>
                                        Add
                                    </SmallButton>
                                </FormRow>
                            </AddThrowoutForm>
                        )}
                    </ThrowoutSection>
                )}

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
