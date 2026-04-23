import styled from '@emotion/styled';
import { BaseRunners, RunnerBase, BaserunnerEventType, getSuggestedAdvancement } from '@pitch-tracker/shared';
import React, { useState, useEffect } from 'react';
import { theme } from '../../styles/theme';

type AdvancementEventType = 'stolen_base' | 'wild_pitch' | 'passed_ball' | 'balk';
type OutEventType = 'caught_stealing' | 'pickoff' | 'interference' | 'passed_runner' | 'appeal_out' | 'other';

interface RunnerEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    runners: BaseRunners;
    currentOuts: number;
    defaultTab?: 'advance' | 'out';
    onRecordAdvancement: (
        eventType: AdvancementEventType,
        fromBase: RunnerBase,
        newRunners: BaseRunners,
        runsScored: number,
        runnerToBase?: RunnerBase | 'home'
    ) => void;
    onRecordOut: (eventType: BaserunnerEventType, runnerBase: RunnerBase) => void;
}

const ADVANCEMENT_EVENTS: { type: AdvancementEventType; label: string; short: string }[] = [
    { type: 'stolen_base', label: 'Stolen Base', short: 'SB' },
    { type: 'wild_pitch', label: 'Wild Pitch', short: 'WP' },
    { type: 'passed_ball', label: 'Passed Ball', short: 'PB' },
    { type: 'balk', label: 'Balk', short: 'BLK' },
];

const OUT_EVENTS: { type: OutEventType; label: string }[] = [
    { type: 'caught_stealing', label: 'Caught Stealing' },
    { type: 'pickoff', label: 'Pickoff' },
    { type: 'interference', label: 'Interference' },
    { type: 'appeal_out', label: 'Appeal Out' },
    { type: 'passed_runner', label: 'Passed Runner' },
    { type: 'other', label: 'Other' },
];

const BASE_LABELS: { base: RunnerBase; label: string; next: RunnerBase | 'home' }[] = [
    { base: 'first', label: '1st Base', next: 'second' },
    { base: 'second', label: '2nd Base', next: 'third' },
    { base: 'third', label: '3rd Base', next: 'home' },
];

// ─── Styled components ───────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
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
    width: 90%;
    max-width: 420px;
    max-height: 85vh;
    overflow-y: auto;
`;

const TabBar = styled.div`
    display: flex;
    background: ${theme.colors.gray[100]};
    border-radius: 8px;
    padding: 3px;
    margin-bottom: 20px;
    gap: 3px;
`;

const Tab = styled.button<{ $active?: boolean; $danger?: boolean }>`
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    background: ${(p) => (p.$active ? (p.$danger ? theme.colors.red[500] : theme.colors.green[500]) : 'transparent')};
    color: ${(p) => (p.$active ? 'white' : theme.colors.gray[600])};
    transition: background 0.15s;
`;

const SectionLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: ${theme.colors.gray[500]};
    margin-bottom: 8px;
`;

const Section = styled.div`
    margin-bottom: 16px;
`;

const ChipRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const Chip = styled.button<{ $selected?: boolean; $color?: 'green' | 'red' }>`
    padding: 7px 14px;
    border-radius: 20px;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid
        ${(p) => (p.$selected ? (p.$color === 'red' ? theme.colors.red[400] : theme.colors.green[400]) : theme.colors.gray[300])};
    background: ${(p) => (p.$selected ? (p.$color === 'red' ? theme.colors.red[50] : theme.colors.green[50]) : 'white')};
    color: ${(p) =>
        p.$selected ? (p.$color === 'red' ? theme.colors.red[700] : theme.colors.green[700]) : theme.colors.gray[700]};
    &:hover {
        border-color: ${(p) => (p.$color === 'red' ? theme.colors.red[300] : theme.colors.green[300])};
    }
`;

const DiamondRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    margin-bottom: 12px;
`;

const DiamondArrow = styled.span`
    font-size: 20px;
    color: ${theme.colors.gray[400]};
`;

const DiamondLabel = styled.div`
    font-size: 11px;
    color: ${theme.colors.gray[500]};
    text-align: center;
    margin-bottom: 4px;
    font-weight: 600;
`;

const DiamondGrid = styled.div`
    display: grid;
    grid-template-columns: 28px 28px 28px;
    grid-template-rows: 28px 28px 28px;
    gap: 4px;
`;

const Base = styled.button<{ $occupied?: boolean; $interactive?: boolean }>`
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: 2px solid ${(p) => (p.$occupied ? theme.colors.primary[500] : theme.colors.gray[300])};
    background: ${(p) => (p.$occupied ? theme.colors.primary[500] : 'white')};
    color: ${(p) => (p.$occupied ? 'white' : theme.colors.gray[400])};
    font-size: 11px;
    font-weight: 700;
    cursor: ${(p) => (p.$interactive ? 'pointer' : 'default')};
    display: flex;
    align-items: center;
    justify-content: center;
    transform: rotate(45deg);
    &:hover {
        border-color: ${(p) => (p.$interactive ? theme.colors.primary[400] : undefined)};
    }
`;

const BaseLabel = styled.span`
    transform: rotate(-45deg);
    display: block;
`;

const RunsText = styled.p`
    text-align: center;
    color: ${theme.colors.green[700]};
    font-weight: 600;
    margin: 0 0 12px 0;
    font-size: 14px;
`;

const Warning = styled.p`
    color: ${theme.colors.yellow[700]};
    font-size: 13px;
    margin-bottom: 12px;
`;

const NoRunners = styled.p`
    color: ${theme.colors.gray[500]};
    font-style: italic;
    margin: 0;
    font-size: 13px;
`;

const ButtonRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
`;

const ActionButton = styled.button<{ $variant?: 'green' | 'red' | 'outline' }>`
    padding: 9px 18px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    ${(p) => {
        if (p.$variant === 'green')
            return `background:${theme.colors.green[600]};color:white;border:none;&:hover{background:${theme.colors.green[700]};}&:disabled{background:${theme.colors.gray[300]};cursor:not-allowed;}`;
        if (p.$variant === 'red')
            return `background:${theme.colors.red[500]};color:white;border:none;&:hover{background:${theme.colors.red[600]};}&:disabled{background:${theme.colors.gray[300]};cursor:not-allowed;}`;
        return `background:white;color:${theme.colors.gray[700]};border:1px solid ${theme.colors.gray[300]};&:hover{background:${theme.colors.gray[50]};}`;
    }}
`;

// ─── Mini diamond component ───────────────────────────────────────────────────

const MiniDiamond: React.FC<{
    runners: BaseRunners;
    interactive?: boolean;
    onToggle?: (base: RunnerBase) => void;
    label?: string;
}> = ({ runners, interactive, onToggle, label }) => (
    <div>
        {label && <DiamondLabel>{label}</DiamondLabel>}
        <DiamondGrid>
            <div />
            <Base $occupied={runners.second} $interactive={interactive} onClick={() => interactive && onToggle?.('second')}>
                <BaseLabel>2</BaseLabel>
            </Base>
            <div />
            <Base $occupied={runners.third} $interactive={interactive} onClick={() => interactive && onToggle?.('third')}>
                <BaseLabel>3</BaseLabel>
            </Base>
            <div style={{ width: 28, height: 28 }} />
            <Base $occupied={runners.first} $interactive={interactive} onClick={() => interactive && onToggle?.('first')}>
                <BaseLabel>1</BaseLabel>
            </Base>
            <div />
            <div
                style={{
                    width: 28,
                    height: 28,
                    border: `2px solid ${theme.colors.gray[200]}`,
                    borderRadius: 4,
                    transform: 'rotate(45deg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <span style={{ transform: 'rotate(-45deg)', fontSize: 10, color: theme.colors.gray[300] }}>H</span>
            </div>
            <div />
        </DiamondGrid>
    </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const RunnerEventModal: React.FC<RunnerEventModalProps> = ({
    isOpen,
    onClose,
    runners,
    currentOuts,
    defaultTab = 'advance',
    onRecordAdvancement,
    onRecordOut,
}) => {
    const [tab, setTab] = useState<'advance' | 'out'>(defaultTab);
    const [advEventType, setAdvEventType] = useState<AdvancementEventType | null>(null);
    const [sbFromBase, setSbFromBase] = useState<RunnerBase | null>(null);
    const [afterRunners, setAfterRunners] = useState<BaseRunners>({ first: false, second: false, third: false });
    const [runsScored, setRunsScored] = useState(0);
    const [outEventType, setOutEventType] = useState<OutEventType | null>(null);
    const [outBase, setOutBase] = useState<RunnerBase | null>(null);

    const occupiedBases = BASE_LABELS.filter((b) => runners[b.base]);

    useEffect(() => {
        if (!isOpen) return;
        setTab(defaultTab);
        resetAdvance();
        resetOut();
    }, [isOpen, defaultTab]);

    useEffect(() => {
        if (!advEventType) return;
        if (advEventType === 'stolen_base') {
            setAfterRunners({ ...runners });
            setRunsScored(0);
            setSbFromBase(null);
        } else {
            const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(runners, advEventType);
            setAfterRunners(suggestedRunners);
            setRunsScored(suggestedRuns);
        }
    }, [advEventType, runners]);

    const resetAdvance = () => {
        setAdvEventType(null);
        setSbFromBase(null);
        setAfterRunners({ first: false, second: false, third: false });
        setRunsScored(0);
    };

    const resetOut = () => {
        setOutEventType(null);
        setOutBase(null);
    };

    const handleSbFromBase = (base: RunnerBase) => {
        setSbFromBase(base);
        const entry = BASE_LABELS.find((b) => b.base === base);
        const nextBase = entry?.next;
        const newRunners = { ...runners, [base]: false };
        if (nextBase && nextBase !== 'home') newRunners[nextBase as RunnerBase] = true;
        setAfterRunners(newRunners);
        setRunsScored(nextBase === 'home' ? 1 : 0);
    };

    const handleToggleAfter = (base: RunnerBase) => {
        setAfterRunners((prev) => ({ ...prev, [base]: !prev[base] }));
    };

    const handleConfirmAdvance = () => {
        if (!advEventType) return;
        const fromBase = advEventType === 'stolen_base' ? sbFromBase : (occupiedBases[0]?.base ?? 'first');
        if (!fromBase) return;
        const toBase = BASE_LABELS.find((b) => b.base === fromBase)?.next;
        onRecordAdvancement(
            advEventType,
            fromBase as RunnerBase,
            afterRunners,
            runsScored,
            toBase as RunnerBase | 'home' | undefined
        );
    };

    const handleConfirmOut = () => {
        if (!outEventType || !outBase) return;
        onRecordOut(outEventType, outBase);
    };

    if (!isOpen) return null;

    const canAdvance = advEventType !== null && (advEventType !== 'stolen_base' || sbFromBase !== null);
    const canOut = outEventType !== null && outBase !== null && currentOuts < 3;

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <TabBar>
                    <Tab
                        $active={tab === 'advance'}
                        onClick={() => {
                            setTab('advance');
                            resetAdvance();
                        }}
                    >
                        Advance
                    </Tab>
                    <Tab
                        $active={tab === 'out'}
                        $danger
                        onClick={() => {
                            setTab('out');
                            resetOut();
                        }}
                    >
                        Runner Out
                    </Tab>
                </TabBar>

                {tab === 'advance' && (
                    <>
                        <Section>
                            <SectionLabel>Event</SectionLabel>
                            <ChipRow>
                                {ADVANCEMENT_EVENTS.map((e) => (
                                    <Chip
                                        key={e.type}
                                        $selected={advEventType === e.type}
                                        $color="green"
                                        onClick={() => setAdvEventType(e.type)}
                                    >
                                        {e.short} — {e.label}
                                    </Chip>
                                ))}
                            </ChipRow>
                        </Section>

                        {advEventType === 'stolen_base' && (
                            <Section>
                                <SectionLabel>Runner stealing from</SectionLabel>
                                <ChipRow>
                                    {occupiedBases.map((b) => (
                                        <Chip
                                            key={b.base}
                                            $selected={sbFromBase === b.base}
                                            $color="green"
                                            onClick={() => handleSbFromBase(b.base)}
                                        >
                                            {b.label}
                                        </Chip>
                                    ))}
                                </ChipRow>
                            </Section>
                        )}

                        {advEventType && advEventType !== 'stolen_base' && (
                            <DiamondRow>
                                <MiniDiamond runners={runners} label="Before" />
                                <DiamondArrow>→</DiamondArrow>
                                <MiniDiamond runners={afterRunners} interactive onToggle={handleToggleAfter} label="After" />
                            </DiamondRow>
                        )}

                        {runsScored > 0 && (
                            <RunsText>
                                +{runsScored} run{runsScored > 1 ? 's' : ''} scored
                            </RunsText>
                        )}

                        <ButtonRow>
                            <ActionButton $variant="outline" onClick={onClose}>
                                Cancel
                            </ActionButton>
                            <ActionButton $variant="green" onClick={handleConfirmAdvance} disabled={!canAdvance}>
                                Confirm
                            </ActionButton>
                        </ButtonRow>
                    </>
                )}

                {tab === 'out' && (
                    <>
                        {currentOuts >= 2 && <Warning>Warning: Recording this out will end the inning</Warning>}

                        <Section>
                            <SectionLabel>Runner</SectionLabel>
                            {occupiedBases.length === 0 ? (
                                <NoRunners>No runners on base</NoRunners>
                            ) : (
                                <ChipRow>
                                    {occupiedBases.map((b) => (
                                        <Chip
                                            key={b.base}
                                            $selected={outBase === b.base}
                                            $color="red"
                                            onClick={() => setOutBase(b.base)}
                                        >
                                            {b.label}
                                        </Chip>
                                    ))}
                                </ChipRow>
                            )}
                        </Section>

                        <Section>
                            <SectionLabel>Out type</SectionLabel>
                            <ChipRow>
                                {OUT_EVENTS.map((e) => (
                                    <Chip
                                        key={e.type}
                                        $selected={outEventType === e.type}
                                        $color="red"
                                        onClick={() => setOutEventType(e.type as OutEventType)}
                                    >
                                        {e.label}
                                    </Chip>
                                ))}
                            </ChipRow>
                        </Section>

                        <ButtonRow>
                            <ActionButton $variant="outline" onClick={onClose}>
                                Cancel
                            </ActionButton>
                            <ActionButton $variant="red" onClick={handleConfirmOut} disabled={!canOut}>
                                Record Out
                            </ActionButton>
                        </ButtonRow>
                    </>
                )}
            </Modal>
        </Overlay>
    );
};

export default RunnerEventModal;
